package com.llmaudio.app.domain.model

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.util.Log
import kotlinx.coroutines.*
import java.io.InputStream
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AudioPlayer @Inject constructor(
    private val context: Context
) {
    companion object {
        private const val TAG = "AudioPlayer"
        private const val SAMPLE_RATE = 24000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_OUT_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }

    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val isPlaying = AtomicBoolean(false)
    private val streamCounter = AtomicInteger(0)
    private val audioQueue = ConcurrentLinkedQueue<AudioStream>()
    private var currentAudioTrack: AudioTrack? = null
    private var playbackJob: Job? = null

    data class AudioStream(
        val id: Int,
        val inputStream: InputStream,
        val text: String,
        val priority: Int = 0
    )

    fun enqueueStream(inputStream: InputStream, text: String, priority: Int = 0): Int {
        val streamId = streamCounter.incrementAndGet()
        val audioStream = AudioStream(streamId, inputStream, text, priority)
        audioQueue.offer(audioStream)
        
        Log.d(TAG, "Enqueued audio stream #$streamId: '$text' (priority: $priority)")
        
        if (!isPlaying.get()) {
            startPlayback()
        }
        
        return streamId
    }

    fun playStream(inputStream: InputStream) {
        val streamId = enqueueStream(inputStream, "Direct playback")
        // Block until this specific stream is played (for compatibility)
    }

    private fun startPlayback() {
        if (isPlaying.compareAndSet(false, true)) {
            playbackJob = CoroutineScope(Dispatchers.IO).launch {
                try {
                    while (isPlaying.get()) {
                        val audioStream = audioQueue.poll()
                        if (audioStream != null) {
                            playAudioStream(audioStream)
                        } else {
                            delay(50) // Wait for more streams
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error in playback loop", e)
                } finally {
                    isPlaying.set(false)
                }
            }
        }
    }

    private suspend fun playAudioStream(audioStream: AudioStream) = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Playing audio stream #${audioStream.id}")
            
            val bufferSize = AudioTrack.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
            
            val audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AUDIO_FORMAT)
                        .setSampleRate(SAMPLE_RATE)
                        .setChannelMask(CHANNEL_CONFIG)
                        .build()
                )
                .setBufferSizeInBytes(bufferSize)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()

            currentAudioTrack = audioTrack
            audioTrack.play()

            val buffer = ByteArray(4096)
            var bytesRead: Int

            while (audioStream.inputStream.read(buffer).also { bytesRead = it } != -1 && isPlaying.get()) {
                if (bytesRead > 0) {
                    audioTrack.write(buffer, 0, bytesRead)
                }
            }

            audioTrack.stop()
            audioTrack.release()
            audioStream.inputStream.close()
            
            Log.d(TAG, "Finished playing audio stream #${audioStream.id}")

        } catch (e: Exception) {
            Log.e(TAG, "Error playing audio stream #${audioStream.id}", e)
        } finally {
            currentAudioTrack = null
        }
    }

    fun stop() {
        Log.d(TAG, "Stopping audio playback")
        isPlaying.set(false)
        playbackJob?.cancel()
        currentAudioTrack?.apply {
            stop()
            release()
        }
        currentAudioTrack = null
        audioQueue.clear()
    }

    fun pause() {
        currentAudioTrack?.pause()
    }

    fun resume() {
        currentAudioTrack?.play()
    }
}
