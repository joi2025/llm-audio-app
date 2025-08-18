package com.llmaudio.app.presentation.viewmodel

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.gson.Gson
import com.llmaudio.app.data.api.*
import com.llmaudio.app.domain.audio.AudioPlayer
import com.llmaudio.app.domain.audio.VoiceActivityDetector
import com.llmaudio.app.domain.model.Personalities
import com.llmaudio.app.domain.model.Personality
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.ResponseBody
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import java.io.BufferedReader
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.ConcurrentLinkedQueue
import javax.inject.Inject
import kotlin.math.abs

@HiltViewModel
class VoicePipelineViewModel @Inject constructor(
    private val openAiService: OpenAiService,
    private val audioPlayer: AudioPlayer,
    private val sharedPreferences: android.content.SharedPreferences
) : ViewModel() {

    // UI States
    sealed class VoiceState {
        object Idle : VoiceState()
        object Listening : VoiceState()
        object Processing : VoiceState()
        object Speaking : VoiceState()
    }

    private val _voiceState = MutableStateFlow<VoiceState>(VoiceState.Idle)
    val voiceState: StateFlow<VoiceState> = _voiceState.asStateFlow()

    private val _currentPersonality = MutableStateFlow(Personalities.getDefault())
    val currentPersonality: StateFlow<Personality> = _currentPersonality.asStateFlow()

    private val _audioLevel = MutableStateFlow(0f)
    val audioLevel: StateFlow<Float> = _audioLevel.asStateFlow()

    private val _transcription = MutableStateFlow("")
    val transcription: StateFlow<String> = _transcription.asStateFlow()

    private val _assistantResponse = MutableStateFlow("")
    val assistantResponse: StateFlow<String> = _assistantResponse.asStateFlow()

    // Audio Recording
    private var audioRecord: AudioRecord? = null
    private var recordingJob: Job? = null
    private val audioBuffers = ConcurrentLinkedQueue<ByteArray>()
    
    // VAD (Voice Activity Detection)
    private val vad = VoiceActivityDetector(
        silenceThreshold = 0.01f,
        silenceDuration = 1500L,
        speechThreshold = 0.02f
    )

    // Streaming & Pipeline
    private var ttsJobs = mutableListOf<Job>()
    private var currentLLMCall: Call<ResponseBody>? = null
    private var currentTTSCall: Call<ResponseBody>? = null
    
    // API Configuration
    private val apiKey: String
        get() = sharedPreferences.getString("api_key", "") ?: ""
    
    private val authHeader: String
        get() = "Bearer $apiKey"

    // Conversation History
    private val conversationHistory = mutableListOf<Message>()

    init {
        // Initialize with system prompt from default personality
        resetConversation()
    }

    fun startListening() {
        if (_voiceState.value == VoiceState.Listening) return
        
        // Cancel any ongoing TTS
        interruptSpeaking()
        
        _voiceState.value = VoiceState.Listening
        _transcription.value = ""
        audioBuffers.clear()
        
        recordingJob = viewModelScope.launch {
            startRecording()
        }
    }

    private suspend fun startRecording() = withContext(Dispatchers.IO) {
        val sampleRate = 16000
        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val audioFormat = AudioFormat.ENCODING_PCM_16BIT
        val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
        
        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            channelConfig,
            audioFormat,
            bufferSize
        ).apply {
            startRecording()
        }
        
        val buffer = ByteArray(bufferSize)
        vad.reset()
        
        while (isActive && _voiceState.value == VoiceState.Listening) {
            val readBytes = audioRecord?.read(buffer, 0, bufferSize) ?: 0
            if (readBytes > 0) {
                val chunk = buffer.copyOf(readBytes)
                audioBuffers.add(chunk)
                
                // Calculate audio level for UI
                val level = calculateAudioLevel(chunk)
                _audioLevel.emit(level)
                
                // VAD processing
                if (vad.processSamples(chunk)) {
                    // Silence detected - end recording
                    stopListening()
                    processAudio()
                    break
                }
            }
        }
    }

    private fun calculateAudioLevel(buffer: ByteArray): Float {
        var sum = 0f
        for (i in buffer.indices step 2) {
            if (i + 1 < buffer.size) {
                val sample = (buffer[i].toInt() or (buffer[i + 1].toInt() shl 8)).toShort()
                sum += abs(sample.toFloat())
            }
        }
        return (sum / (buffer.size / 2)) / 32768f
    }

    fun stopListening() {
        recordingJob?.cancel()
        audioRecord?.apply {
            stop()
            release()
        }
        audioRecord = null
        _audioLevel.value = 0f
    }

    private suspend fun processAudio() {
        _voiceState.value = VoiceState.Processing
        
        // Combine audio buffers
        val audioData = audioBuffers.fold(ByteArray(0)) { acc, chunk -> acc + chunk }
        audioBuffers.clear()
        
        if (audioData.isEmpty() || apiKey.isEmpty()) {
            _voiceState.value = VoiceState.Idle
            return
        }
        
        try {
            // Save audio to temp file
            val audioFile = File.createTempFile("audio_", ".wav", viewModelScope.coroutineContext[Job]?.let { null })
            FileOutputStream(audioFile).use { it.write(createWavHeader(audioData) + audioData) }
            
            // STT - Transcribe audio
            val filePart = MultipartBody.Part.createFormData(
                "file",
                audioFile.name,
                audioFile.asRequestBody("audio/wav".toMediaType())
            )
            
            val transcriptionResponse = openAiService.transcribeAudio(authHeader, filePart)
            _transcription.value = transcriptionResponse.text
            
            // Add to conversation
            conversationHistory.add(Message("user", transcriptionResponse.text))
            
            // Start LLM streaming
            streamLLMResponse()
            
            audioFile.delete()
            
        } catch (e: Exception) {
            e.printStackTrace()
            _voiceState.value = VoiceState.Idle
        }
    }

    private fun streamLLMResponse() {
        val request = ChatCompletionRequest(
            messages = listOf(
                Message("system", _currentPersonality.value.systemPrompt)
            ) + conversationHistory,
            stream = true
        )
        
        currentLLMCall = openAiService.streamChatCompletion(authHeader, request)
        
        currentLLMCall?.enqueue(object : Callback<ResponseBody> {
            override fun onResponse(call: Call<ResponseBody>, response: Response<ResponseBody>) {
                if (!response.isSuccessful) {
                    _voiceState.value = VoiceState.Idle
                    return
                }
                
                viewModelScope.launch {
                    processLLMStream(response.body())
                }
            }
            
            override fun onFailure(call: Call<ResponseBody>, t: Throwable) {
                _voiceState.value = VoiceState.Idle
            }
        })
    }

    private suspend fun processLLMStream(body: ResponseBody?) = withContext(Dispatchers.IO) {
        body?.let { responseBody ->
            val reader = BufferedReader(responseBody.charStream())
            val fullResponse = StringBuilder()
            val sentenceBuffer = StringBuilder()
            
            reader.useLines { lines ->
                lines.forEach { line ->
                    if (line.startsWith("data: ")) {
                        val data = line.substring(6)
                        if (data == "[DONE]") return@forEach
                        
                        try {
                            val chunk = parseSSEChunk(data)
                            chunk?.let { token ->
                                fullResponse.append(token)
                                sentenceBuffer.append(token)
                                
                                // Check for sentence completion
                                if (token.contains('.') || token.contains('!') || token.contains('?')) {
                                    val sentence = sentenceBuffer.toString()
                                    sentenceBuffer.clear()
                                    
                                    // Launch TTS for this sentence
                                    launchTTS(sentence)
                                }
                                
                                _assistantResponse.emit(fullResponse.toString())
                            }
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                }
            }
            
            // Process any remaining text
            if (sentenceBuffer.isNotEmpty()) {
                launchTTS(sentenceBuffer.toString())
            }
            
            // Add to conversation history
            conversationHistory.add(Message("assistant", fullResponse.toString()))
        }
    }

    private fun parseSSEChunk(data: String): String? {
        return try {
            val json = Gson().fromJson(data, Map::class.java)
            val choices = json["choices"] as? List<*>
            val delta = (choices?.firstOrNull() as? Map<*, *>)?.get("delta") as? Map<*, *>
            delta?.get("content") as? String
        } catch (e: Exception) {
            null
        }
    }

    private fun launchTTS(text: String) {
        if (text.isBlank()) return
        
        val ttsJob = viewModelScope.launch {
            generateAndPlayTTS(text)
        }
        ttsJobs.add(ttsJob)
    }

    private suspend fun generateAndPlayTTS(text: String) = withContext(Dispatchers.IO) {
        try {
            val request = TTSRequest(
                input = text,
                voice = _currentPersonality.value.voice
            )
            
            val call = openAiService.generateSpeech(authHeader, request)
            currentTTSCall = call
            
            val response = call.execute()
            if (response.isSuccessful) {
                response.body()?.let { body ->
                    _voiceState.emit(VoiceState.Speaking)
                    audioPlayer.playStream(body.byteStream())
                }
            }
        } catch (e: Exception) {
            if (e !is CancellationException) {
                e.printStackTrace()
            }
        }
    }

    fun interruptSpeaking() {
        // Cancel all TTS jobs
        ttsJobs.forEach { it.cancel() }
        ttsJobs.clear()
        
        // Cancel ongoing calls
        currentLLMCall?.cancel()
        currentTTSCall?.cancel()
        
        // Stop audio playback
        audioPlayer.stop()
        
        if (_voiceState.value == VoiceState.Speaking) {
            _voiceState.value = VoiceState.Idle
        }
    }

    fun changePersonality(personality: Personality) {
        _currentPersonality.value = personality
        resetConversation()
    }

    private fun resetConversation() {
        conversationHistory.clear()
        conversationHistory.add(
            Message("system", _currentPersonality.value.systemPrompt)
        )
    }

    private fun createWavHeader(audioData: ByteArray): ByteArray {
        val sampleRate = 16000
        val channels = 1
        val bitsPerSample = 16
        val byteRate = sampleRate * channels * bitsPerSample / 8
        val blockAlign = channels * bitsPerSample / 8
        val dataSize = audioData.size
        val fileSize = dataSize + 36
        
        return byteArrayOf(
            'R'.code.toByte(), 'I'.code.toByte(), 'F'.code.toByte(), 'F'.code.toByte(),
            (fileSize and 0xff).toByte(), ((fileSize shr 8) and 0xff).toByte(),
            ((fileSize shr 16) and 0xff).toByte(), ((fileSize shr 24) and 0xff).toByte(),
            'W'.code.toByte(), 'A'.code.toByte(), 'V'.code.toByte(), 'E'.code.toByte(),
            'f'.code.toByte(), 'm'.code.toByte(), 't'.code.toByte(), ' '.code.toByte(),
            16, 0, 0, 0, // Subchunk1Size
            1, 0, // AudioFormat (PCM)
            channels.toByte(), 0,
            (sampleRate and 0xff).toByte(), ((sampleRate shr 8) and 0xff).toByte(),
            ((sampleRate shr 16) and 0xff).toByte(), ((sampleRate shr 24) and 0xff).toByte(),
            (byteRate and 0xff).toByte(), ((byteRate shr 8) and 0xff).toByte(),
            ((byteRate shr 16) and 0xff).toByte(), ((byteRate shr 24) and 0xff).toByte(),
            blockAlign.toByte(), 0,
            bitsPerSample.toByte(), 0,
            'd'.code.toByte(), 'a'.code.toByte(), 't'.code.toByte(), 'a'.code.toByte(),
            (dataSize and 0xff).toByte(), ((dataSize shr 8) and 0xff).toByte(),
            ((dataSize shr 16) and 0xff).toByte(), ((dataSize shr 24) and 0xff).toByte()
        )
    }

    override fun onCleared() {
        super.onCleared()
        stopListening()
        interruptSpeaking()
    }
}
