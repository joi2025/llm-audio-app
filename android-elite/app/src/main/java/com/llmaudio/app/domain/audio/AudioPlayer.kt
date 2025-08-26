package com.llmaudio.app.domain.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.MediaPlayer
import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.ConcurrentLinkedQueue
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Audio stream item for sequential playback
 */
data class AudioStream(
    val id: Int,
    val inputStream: InputStream,
    val text: String = "",
    val priority: Int = 0
)

/**
 * Thread-safe AudioPlayer with concurrent streaming support
 * Handles MP3 and PCM audio streams with proper resource management
 */
@Singleton
class AudioPlayer @Inject constructor(
    private val context: Context
) {
    interface PlaybackListener {
        fun onStart(text: String)
        fun onStop()
        fun onError(error: String)
    }

    private var playbackListener: PlaybackListener? = null

    fun setPlaybackListener(listener: PlaybackListener) {
        this.playbackListener = listener
    }

    companion object {
        private const val TAG = "AudioPlayer"
        private const val TTS_SAMPLE_RATE = 24000
        private const val MAX_QUEUE_SIZE = 10
        private const val BUFFER_SIZE = 8192
    }

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()
    
    private val _currentlyPlaying = MutableStateFlow<String?>(null)
    val currentlyPlaying: StateFlow<String?> = _currentlyPlaying.asStateFlow()
    
    private val _queueSize = MutableStateFlow(0)
    val queueSize: StateFlow<Int> = _queueSize.asStateFlow()
    
    private val audioQueue = ConcurrentLinkedQueue<AudioStream>()
    private val streamIdCounter = AtomicInteger(0)
    private val isPlayingInternal = AtomicBoolean(false)
    private val playbackMutex = Mutex()
    
    private var playbackJob: Job? = null
    private var currentMediaPlayer: MediaPlayer? = null
    private var currentAudioTrack: AudioTrack? = null
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    
    suspend fun enqueueStream(inputStream: InputStream, text: String = "", priority: Int = 0): Int {
        val streamId = streamIdCounter.incrementAndGet()
        val audioStream = AudioStream(streamId, inputStream, text, priority)
        
        playbackMutex.withLock {
            if (audioQueue.size >= MAX_QUEUE_SIZE) {
                Log.w(TAG, "Audio queue full, dropping oldest stream")
                audioQueue.poll()?.inputStream?.close()
            }
            
            audioQueue.offer(audioStream)
            _queueSize.value = audioQueue.size
            
            Log.d(TAG, "Enqueued audio stream $streamId: '$text' (queue size: ${audioQueue.size})")
            
            if (!isPlayingInternal.get()) {
                startQueuePlayback()
            }
        }
        
        return streamId
    }
    
    private fun startQueuePlayback() {
        if (playbackJob?.isActive == true) {
            return
        }
        
        playbackJob = CoroutineScope(Dispatchers.IO).launch {
            isPlayingInternal.set(true)
            _isPlaying.value = true
            Log.d(TAG, "Starting queue playback")
            
            try {
                while (isPlayingInternal.get()) {
                    val audioStream = audioQueue.poll()
                    if (audioStream == null) {
                        delay(50)
                        continue
                    }
                    
                    _queueSize.value = audioQueue.size
                    _currentlyPlaying.value = audioStream.text
                    playbackListener?.onStart(audioStream.text)
                    
                    try {
                        playStreamInternal(audioStream)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error playing stream ${audioStream.id}: ${e.message}", e)
                        playbackListener?.onError("Error playing stream ${audioStream.id}: ${e.message}")
                    } finally {
                        try {
                            audioStream.inputStream.close()
                        } catch (e: Exception) {
                            Log.w(TAG, "Error closing stream ${audioStream.id}", e)
                        }
                        _currentlyPlaying.value = null // Clear after attempting to play
                        if(audioQueue.isEmpty() && isPlayingInternal.get()) {
                           // If queue is empty and we are supposed to be playing, signal stop
                           // This is more of a stream completion than a full stop
                           playbackListener?.onStop() 
                        }
                    }
                }
            } finally {
                isPlayingInternal.set(false)
                _isPlaying.value = false
                _currentlyPlaying.value = null
                _queueSize.value = 0
                playbackListener?.onStop() // Signal a definitive stop
                Log.d(TAG, "Queue playback stopped")
            }
        }
    }
    
    private suspend fun playStreamInternal(audioStream: AudioStream) = withContext(Dispatchers.IO) {
        Log.d(TAG, "Playing stream ${audioStream.id}: '${audioStream.text}'")
        
        val tempFile = File.createTempFile("tts_${audioStream.id}_", ".mp3", context.cacheDir)
        
        try {
            FileOutputStream(tempFile).use { fileOut ->
                val buffer = ByteArray(BUFFER_SIZE)
                var bytesRead: Int
                var totalBytes = 0
                
                while (audioStream.inputStream.read(buffer).also { bytesRead = it } != -1) {
                    fileOut.write(buffer, 0, bytesRead)
                    totalBytes += bytesRead
                }
                
                Log.d(TAG, "Stream ${audioStream.id} written to temp file: $totalBytes bytes")
            }
            
            val completionChannel = Channel<Unit>(1)
            
            currentMediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANT)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                
                setDataSource(tempFile.absolutePath)
                
                setOnCompletionListener { mp ->
                    Log.d(TAG, "Stream ${audioStream.id} playback completed")
                    mp.release()
                    currentMediaPlayer = null
                    completionChannel.trySend(Unit)
                }
                
                setOnErrorListener { mp, what, extra ->
                    Log.e(TAG, "MediaPlayer error for stream ${audioStream.id}: what=$what, extra=$extra")
                    playbackListener?.onError("MediaPlayer error for stream ${audioStream.id}: what=$what, extra=$extra")
                    mp.release()
                    currentMediaPlayer = null
                    completionChannel.trySend(Unit)
                    true
                }
                
                prepare()
                start()
                
                Log.d(TAG, "Stream ${audioStream.id} playback started - duration: ${duration}ms")
            }
            
            completionChannel.receive()
            
        } finally {
            try {
                if (tempFile.exists()) {
                    tempFile.delete()
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to delete temp file for stream ${audioStream.id}", e)
            }
        }
    }
    
    suspend fun playPCMStream(inputStream: InputStream, sampleRate: Int = TTS_SAMPLE_RATE) = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Starting PCM audio playback...")
            stop() 
            
            playbackListener?.onStart("PCM Stream") // Generic text for PCM
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANT)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build()
            
            val audioFormat = AudioFormat.Builder()
                .setSampleRate(sampleRate)
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build()
            
            val bufferSize = AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            )
            
            if (bufferSize == AudioTrack.ERROR || bufferSize == AudioTrack.ERROR_BAD_VALUE) {
                playbackListener?.onError("Invalid buffer size for AudioTrack: $bufferSize")
                throw IllegalStateException("Invalid buffer size for AudioTrack: $bufferSize")
            }
            
            currentAudioTrack = AudioTrack.Builder()
                .setAudioAttributes(audioAttributes)
                .setAudioFormat(audioFormat)
                .setBufferSizeInBytes(bufferSize * 2)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()
            
            if (currentAudioTrack?.state != AudioTrack.STATE_INITIALIZED) {
                playbackListener?.onError("AudioTrack not initialized properly")
                throw IllegalStateException("AudioTrack not initialized properly")
            }
            
            currentAudioTrack?.play()
            Log.d(TAG, "AudioTrack started")
            
            val buffer = ByteArray(bufferSize)
            var bytesRead: Int
            var totalBytesWritten = 0
            
            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                val bytesWritten = currentAudioTrack?.write(buffer, 0, bytesRead) ?: 0
                totalBytesWritten += bytesWritten
                
                if (bytesWritten < 0) {
                    Log.w(TAG, "AudioTrack write error: $bytesWritten")
                    playbackListener?.onError("AudioTrack write error: $bytesWritten")
                    break
                }
            }
            
            Log.d(TAG, "PCM playback completed - total bytes: $totalBytesWritten")
            
            currentAudioTrack?.stop()
            currentAudioTrack?.release()
            currentAudioTrack = null
            playbackListener?.onStop()
            
        } catch (e: Exception) {
            Log.e(TAG, "Error during PCM audio playback", e)
            playbackListener?.onError("Error during PCM audio playback: ${e.message}")
            stop() // Ensure full stop on error
            throw e
        } finally {
            try {
                inputStream.close()
            } catch (e: Exception) {
                Log.w(TAG, "Error closing PCM input stream", e)
            }
        }
    }
    
    suspend fun playStream(inputStream: InputStream) {
        enqueueStream(inputStream)
    }
    
    suspend fun stop() {
        playbackMutex.withLock {
            val wasPlaying = isPlayingInternal.getAndSet(false)
            playbackJob?.cancelAndJoin() // Ensure coroutine is fully stopped
            playbackJob = null
            
            currentMediaPlayer?.let { mp ->
                try {
                    if (mp.isPlaying) mp.stop()
                    mp.release()
                } catch (e: Exception) {
                    Log.w(TAG, "Error stopping MediaPlayer", e)
                }
                currentMediaPlayer = null
            }
            
            currentAudioTrack?.let { track ->
                try {
                    if (track.playState == AudioTrack.PLAYSTATE_PLAYING) {
                        track.stop()
                        track.flush()
                    }
                    if (track.state == AudioTrack.STATE_INITIALIZED) {
                        track.release()
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Error stopping AudioTrack", e)
                }
                currentAudioTrack = null
            }
            
            while (audioQueue.isNotEmpty()) {
                val stream = audioQueue.poll()
                try {
                    stream?.inputStream?.close()
                } catch (e: Exception) {
                    Log.w(TAG, "Error closing queued stream ${stream?.id}", e)
                }
            }
            
            _isPlaying.value = false
            _currentlyPlaying.value = null
            _queueSize.value = 0
            if(wasPlaying) playbackListener?.onStop() // Call onStop only if it was playing
            Log.d(TAG, "Audio playback stopped and queue cleared")
        }
    }
    
    suspend fun clearQueue() {
        playbackMutex.withLock {
            try {
                while (audioQueue.isNotEmpty()) {
                    val stream = audioQueue.poll()
                    try {
                        stream?.inputStream?.close()
                    } catch (e: Exception) {
                        Log.w(TAG, "Error closing queued stream ${stream?.id}", e)
                    }
                }
                _queueSize.value = 0
                Log.d(TAG, "Audio queue cleared")
            } catch (e: Exception) {
                Log.e(TAG, "Error clearing audio queue", e)
                playbackListener?.onError("Error clearing audio queue: ${e.message}")
            }
        }
    }
    
    fun getQueueStatus(): Pair<Int, String?> {
        return Pair(audioQueue.size, _currentlyPlaying.value)
    }
}
