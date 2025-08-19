package com.joi2025.llmaudioapp.data.repository

import android.content.Context
import android.media.*
import android.media.audiofx.NoiseSuppressor
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.*

/**
 * AudioRepository - Native Android audio handling
 * Replaces Web Audio API with MediaRecorder and AudioTrack for better performance
 */
@Singleton
class AudioRepository @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val scope = CoroutineScope(Dispatchers.IO)
    
    private var mediaRecorder: MediaRecorder? = null
    private var audioTrack: AudioTrack? = null
    private var noiseSuppressor: NoiseSuppressor? = null
    
    private val _audioLevel = MutableStateFlow(0f)
    val audioLevel: StateFlow<Float> = _audioLevel.asStateFlow()
    
    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()
    
    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()
    
    // Audio configuration
    private val sampleRate = 16000
    private val channelConfig = AudioFormat.CHANNEL_IN_MONO
    private val audioFormat = AudioFormat.ENCODING_PCM_16BIT
    private val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
    
    // VAD (Voice Activity Detection) parameters
    private val vadThreshold = 0.02f
    private val silenceThreshold = 1000L // ms
    private var lastVoiceDetected = 0L
    private var isVadActive = false
    
    fun initialize() {
        setupAudioTrack()
    }
    
    private fun setupAudioTrack() {
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
            
        val audioFormat = AudioFormat.Builder()
            .setSampleRate(sampleRate)
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
            .build()
            
        val bufferSizeOut = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        
        audioTrack = AudioTrack(
            audioAttributes,
            audioFormat,
            bufferSizeOut,
            AudioTrack.MODE_STREAM,
            AudioManager.AUDIO_SESSION_ID_GENERATE
        )
    }
    
    fun startVoiceActivityDetection(onVoiceDetected: (ByteArray) -> Unit) {
        if (_isRecording.value) return
        
        scope.launch {
            try {
                val audioRecord = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    sampleRate,
                    channelConfig,
                    audioFormat,
                    bufferSize * 2
                )
                
                // Enable noise suppression if available
                if (NoiseSuppressor.isAvailable()) {
                    noiseSuppressor = NoiseSuppressor.create(audioRecord.audioSessionId)
                    noiseSuppressor?.enabled = true
                }
                
                audioRecord.startRecording()
                _isRecording.value = true
                
                val audioBuffer = ShortArray(bufferSize)
                val audioStream = ByteArrayOutputStream()
                
                while (_isRecording.value) {
                    val bytesRead = audioRecord.read(audioBuffer, 0, bufferSize)
                    
                    if (bytesRead > 0) {
                        // Calculate audio level for visualization
                        val level = calculateAudioLevel(audioBuffer, bytesRead)
                        _audioLevel.value = level
                        
                        // Voice Activity Detection
                        val currentTime = System.currentTimeMillis()
                        
                        if (level > vadThreshold) {
                            lastVoiceDetected = currentTime
                            if (!isVadActive) {
                                isVadActive = true
                                audioStream.reset() // Start fresh recording
                                Log.d("AudioRepository", "Voice activity started")
                            }
                        }
                        
                        // If we're in VAD mode, collect audio
                        if (isVadActive) {
                            // Convert shorts to bytes
                            val byteBuffer = ByteArray(bytesRead * 2)
                            for (i in 0 until bytesRead) {
                                val sample = audioBuffer[i]
                                byteBuffer[i * 2] = (sample.toInt() and 0xFF).toByte()
                                byteBuffer[i * 2 + 1] = ((sample.toInt() shr 8) and 0xFF).toByte()
                            }
                            audioStream.write(byteBuffer)
                        }
                        
                        // Check for end of speech
                        if (isVadActive && currentTime - lastVoiceDetected > silenceThreshold) {
                            isVadActive = false
                            val audioData = audioStream.toByteArray()
                            if (audioData.isNotEmpty()) {
                                Log.d("AudioRepository", "Voice activity ended, sending ${audioData.size} bytes")
                                onVoiceDetected(audioData)
                            }
                            audioStream.reset()
                        }
                    }
                }
                
                audioRecord.stop()
                audioRecord.release()
                noiseSuppressor?.release()
                noiseSuppressor = null
                
            } catch (e: Exception) {
                Log.e("AudioRepository", "Recording error: ${e.message}")
                _isRecording.value = false
            }
        }
    }
    
    private fun calculateAudioLevel(buffer: ShortArray, length: Int): Float {
        var sum = 0.0
        for (i in 0 until length) {
            sum += (buffer[i] * buffer[i]).toDouble()
        }
        val rms = sqrt(sum / length)
        return min(rms / 32767.0, 1.0).toFloat()
    }
    
    fun stopRecording() {
        _isRecording.value = false
        _audioLevel.value = 0f
        isVadActive = false
    }
    
    fun playAudioChunk(audioData: ByteArray) {
        scope.launch {
            try {
                if (audioTrack?.state != AudioTrack.STATE_INITIALIZED) {
                    setupAudioTrack()
                }
                
                if (audioTrack?.playState != AudioTrack.PLAYSTATE_PLAYING) {
                    audioTrack?.play()
                    _isPlaying.value = true
                }
                
                // Convert base64 to PCM if needed, or play directly if already PCM
                val pcmData = if (isBase64(audioData)) {
                    android.util.Base64.decode(audioData, android.util.Base64.DEFAULT)
                } else {
                    audioData
                }
                
                // Convert to 16-bit PCM if needed
                val finalPcmData = if (pcmData.size % 2 != 0) {
                    // Pad with zero if odd number of bytes
                    pcmData + byteArrayOf(0)
                } else {
                    pcmData
                }
                
                audioTrack?.write(pcmData, 0, pcmData.size)
                
            } catch (e: Exception) {
                Log.e("AudioRepository", "Playback error: ${e.message}")
            }
        }
    }
    
    private fun isBase64(data: ByteArray): Boolean {
        return try {
            val str = String(data, Charsets.UTF_8)
            str.matches(Regex("^[A-Za-z0-9+/]*={0,2}$")) && str.length % 4 == 0
        } catch (e: Exception) {
            false
        }
    }
    
    fun stopPlayback() {
        scope.launch {
            try {
                audioTrack?.pause()
                audioTrack?.flush()
                _isPlaying.value = false
            } catch (e: Exception) {
                Log.e("AudioRepository", "Stop playback error: ${e.message}")
            }
        }
    }
    
    fun cleanup() {
        stopRecording()
        stopPlayback()
        audioTrack?.release()
        audioTrack = null
    }
}
