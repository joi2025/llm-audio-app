package com.llmaudio.app.presentation.viewmodel

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.SystemClock
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.gson.Gson
import com.llmaudio.app.data.model.*
import com.llmaudio.app.data.repository.MessageRepository
import com.llmaudio.app.data.repository.MetricsRepository
import com.llmaudio.app.data.store.ApiKeyStore
import com.llmaudio.app.domain.model.AudioPlayer
import com.llmaudio.app.domain.model.Personality
import com.llmaudio.app.domain.model.VoiceState
import com.llmaudio.app.network.OpenAiService
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.ResponseBody
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import java.io.*
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean
import javax.inject.Inject

@HiltViewModel
class VoicePipelineViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val openAiService: OpenAiService,
    private val audioPlayer: AudioPlayer,
    private val messageRepository: MessageRepository,
    private val metricsRepository: MetricsRepository,
    private val apiKeyStore: ApiKeyStore
) : ViewModel() {

    companion object {
        private const val TAG = "VoicePipelineViewModel"
        private const val SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        private const val BUFFER_SIZE_MULTIPLIER = 4
        private const val SILENCE_THRESHOLD = 500
        private const val SILENCE_DURATION_MS = 2000L
        private const val MIN_RECORDING_DURATION_MS = 1000L
        private const val MAX_RECORDING_DURATION_MS = 30000L
        private val SENTENCE_ENDINGS = setOf('.', '!', '?', '。', '！', '？')
        private val SENTENCE_SEPARATORS = setOf(',', ';', ':', '，', '；', '：')
        private const val MIN_SENTENCE_LENGTH = 10
        private val ABBREVIATIONS = setOf("Dr", "Mr", "Mrs", "Ms", "Prof", "Inc", "Ltd", "etc", "vs", "e.g", "i.e")
    }

    private val gson = Gson()
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val stateMutex = Mutex()
    private val isRecording = AtomicBoolean(false)
    private val audioBuffers = ConcurrentLinkedQueue<ByteArray>()
    private val conversationHistory = mutableListOf<Message>()
    private val ttsJobs = mutableListOf<Job>()

    private var audioRecord: AudioRecord? = null
    private var recordingJob: Job? = null
    private var currentLLMCall: Call<ResponseBody>? = null
    private var currentTTSCall: Call<ResponseBody>? = null
    private var currentTtsCharacters = 0
    private var recordingStartTime = 0L

    // UI State Flows
    private val _voiceState = MutableStateFlow<VoiceState>(VoiceState.Idle)
    val voiceState: StateFlow<VoiceState> = _voiceState.asStateFlow()

    private val _transcription = MutableStateFlow("")
    val transcription: StateFlow<String> = _transcription.asStateFlow()

    private val _assistantResponse = MutableStateFlow("")
    val assistantResponse: StateFlow<String> = _assistantResponse.asStateFlow()

    private val _currentPersonality = MutableStateFlow(Personality.DEFAULT)
    val currentPersonality: StateFlow<Personality> = _currentPersonality.asStateFlow()

    private val _audioLevel = MutableStateFlow(0f)
    val audioLevel: StateFlow<Float> = _audioLevel.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    init {
        resetConversation()
    }

    fun startListening() {
        viewModelScope.launch {
            stateMutex.withLock {
                if (_voiceState.value == VoiceState.Listening) {
                    Log.w(TAG, "Already listening, ignoring request")
                    return@withLock
                }
                
                if (!hasRecordAudioPermission()) {
                    _voiceState.value = VoiceState.Error("Permiso de micrófono requerido")
                    _errorMessage.value = "Se necesita permiso para acceder al micrófono"
                    return@withLock
                }
                
                interruptSpeaking()
                
                _voiceState.value = VoiceState.Listening
                _transcription.value = ""
                _errorMessage.value = null
                audioBuffers.clear()
                
                recordingJob = viewModelScope.launch {
                    try {
                        startRecording()
                    } catch (e: Exception) {
                        Log.e(TAG, "Error starting recording", e)
                        handleRecordingError(e)
                    }
                }
            }
        }
    }

    fun stopListening() {
        viewModelScope.launch {
            stateMutex.withLock {
                if (_voiceState.value != VoiceState.Listening) {
                    Log.w(TAG, "Not listening, ignoring stop request")
                    return@withLock
                }
                
                recordingJob?.cancel()
                recordingJob = null
                
                stopRecording()
                
                if (audioBuffers.isNotEmpty()) {
                    processAudio()
                } else {
                    _voiceState.value = VoiceState.Idle
                    _errorMessage.value = "No se detectó audio para procesar"
                }
            }
        }
    }

    private suspend fun startRecording() {
        val bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT) * BUFFER_SIZE_MULTIPLIER
        
        val audioSources = listOf(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            MediaRecorder.AudioSource.MIC,
            MediaRecorder.AudioSource.DEFAULT
        )
        
        for (source in audioSources) {
            try {
                audioRecord = AudioRecord(source, SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT, bufferSize)
                
                if (audioRecord?.state == AudioRecord.STATE_INITIALIZED) {
                    Log.d(TAG, "AudioRecord initialized with source: ${getAudioSourceName(source)}")
                    break
                } else {
                    audioRecord?.release()
                    audioRecord = null
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to initialize AudioRecord with source $source", e)
                audioRecord?.release()
                audioRecord = null
            }
        }
        
        audioRecord?.let { record ->
            record.startRecording()
            isRecording.set(true)
            recordingStartTime = SystemClock.elapsedRealtime()
            
            val buffer = ShortArray(bufferSize / 2)
            var silenceStartTime = 0L
            var lastSoundTime = SystemClock.elapsedRealtime()
            
            while (isRecording.get() && !currentCoroutineContext().isActive.not()) {
                val readResult = record.read(buffer, 0, buffer.size)
                
                if (readResult > 0) {
                    val byteBuffer = ByteArray(readResult * 2)
                    for (i in 0 until readResult) {
                        val sample = buffer[i]
                        byteBuffer[i * 2] = (sample.toInt() and 0xFF).toByte()
                        byteBuffer[i * 2 + 1] = ((sample.toInt() shr 8) and 0xFF).toByte()
                    }
                    
                    audioBuffers.offer(byteBuffer)
                    
                    val audioLevel = calculateAudioLevel(buffer, readResult)
                    _audioLevel.value = audioLevel
                    
                    val currentTime = SystemClock.elapsedRealtime()
                    val recordingDuration = currentTime - recordingStartTime
                    
                    if (audioLevel > SILENCE_THRESHOLD) {
                        lastSoundTime = currentTime
                        silenceStartTime = 0L
                    } else if (silenceStartTime == 0L) {
                        silenceStartTime = currentTime
                    }
                    
                    val silenceDuration = if (silenceStartTime > 0) currentTime - silenceStartTime else 0
                    
                    if (recordingDuration > MIN_RECORDING_DURATION_MS && 
                        silenceDuration > SILENCE_DURATION_MS) {
                        Log.d(TAG, "Auto-stopping recording due to silence")
                        break
                    }
                    
                    if (recordingDuration > MAX_RECORDING_DURATION_MS) {
                        Log.d(TAG, "Auto-stopping recording due to max duration")
                        break
                    }
                }
                
                delay(10)
            }
        } ?: throw IllegalStateException("Failed to initialize AudioRecord")
    }

    private fun stopRecording() {
        isRecording.set(false)
        audioRecord?.apply {
            try {
                if (recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                    stop()
                }
                release()
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping AudioRecord", e)
            }
        }
        audioRecord = null
        _audioLevel.value = 0f
    }

    private suspend fun processAudio() {
        try {
            stateMutex.withLock {
                _voiceState.value = VoiceState.Processing
                _errorMessage.value = null
            }
            
            val baos = ByteArrayOutputStream()
            while (true) {
                val chunk = audioBuffers.poll() ?: break
                baos.write(chunk)
            }
            val audioData = baos.toByteArray()
            audioBuffers.clear()
            
            val key = currentApiKey()
            if (audioData.isEmpty()) {
                _voiceState.value = VoiceState.Idle
                _errorMessage.value = "No se detectó audio para procesar"
                return
            }
            
            if (key.isEmpty()) {
                _voiceState.value = VoiceState.Error("API key requerida")
                _errorMessage.value = "Se requiere configurar la API key de OpenAI"
                return
            }
            
            val wavData = createWavHeader(audioData) + audioData
            val tempFile = File.createTempFile("llm_audio_", ".wav")
            tempFile.writeBytes(wavData)
            
            val requestFile = tempFile.asRequestBody("audio/wav".toMediaTypeOrNull())
            val body = MultipartBody.Part.createFormData("file", tempFile.name, requestFile)
            val model = MultipartBody.Part.createFormData("model", "whisper-1")
            
            val response = openAiService.transcribeAudio(authHeader(), body, model).execute()
            tempFile.delete()
            
            if (response.isSuccessful) {
                val transcriptionResponse = response.body()
                val transcribedText = transcriptionResponse?.text?.trim() ?: ""
                
                if (transcribedText.isNotEmpty()) {
                    _transcription.value = transcribedText
                    
                    conversationHistory.add(Message("user", transcribedText))
                    messageRepository.saveMessage("user", transcribedText)
                    
                    streamLLMResponse()
                } else {
                    _voiceState.value = VoiceState.Idle
                    _errorMessage.value = "No se pudo transcribir el audio"
                }
            } else {
                handleProcessingError("Error en transcripción: ${response.code()}", Exception("STT HTTP ${response.code()}"))
            }
        } catch (e: Exception) {
            handleProcessingError("Error inesperado al procesar audio: ${e.message}", e)
        }
    }

    private fun streamLLMResponse() {
        val messages = listOf(
            Message("system", _currentPersonality.value.systemPrompt),
            Message("user", _transcription.value)
        )
        
        val request = ChatCompletionRequest(
            messages = messages,
            model = "gpt-4-turbo",
            stream = true,
            maxTokens = 150,
            temperature = 0.7
        )
        
        currentLLMCall = openAiService.streamChatCompletion(authHeader(), request)
        currentLLMCall?.enqueue(object : Callback<ResponseBody> {
            override fun onResponse(call: Call<ResponseBody>, response: Response<ResponseBody>) {
                if (response.isSuccessful) {
                    processStreamingResponse(response.body())
                } else {
                    handleProcessingError("Error del LLM: ${response.code()}", Exception("LLM HTTP ${response.code()}"))
                }
            }
            
            override fun onFailure(call: Call<ResponseBody>, t: Throwable) {
                if (!call.isCanceled) {
                    handleProcessingError("Error de conexión con LLM", t)
                }
            }
        })
    }

    private fun processStreamingResponse(responseBody: ResponseBody?) {
        responseBody?.let { body ->
            try {
                val fullResponse = StringBuilder()
                var sentenceCount = 0
                var currentSentence = StringBuilder()
                
                body.source().use { source ->
                    while (!source.exhausted()) {
                        val line = source.readUtf8Line() ?: break
                        
                        if (line.startsWith("data: ") && line != "data: [DONE]") {
                            val jsonData = line.substring(6)
                            val token = parseSSEChunk(jsonData)
                            
                            token?.let { tokenText ->
                                fullResponse.append(tokenText)
                                currentSentence.append(tokenText)
                                
                                _assistantResponse.value = fullResponse.toString()
                                
                                if (isSentenceComplete(currentSentence.toString(), tokenText)) {
                                    sentenceCount++
                                    val sentence = currentSentence.toString().trim()
                                    Log.d(TAG, "Sentence completed: '$sentence'")
                                    
                                    launchPredictiveTTS(sentence, sentenceCount)
                                    currentSentence.clear()
                                }
                            }
                        }
                    }
                }
                
                if (currentSentence.isNotEmpty()) {
                    val remainingText = currentSentence.toString().trim()
                    if (remainingText.isNotEmpty()) {
                        sentenceCount++
                        Log.d(TAG, "Processing remaining text as sentence #$sentenceCount: '$remainingText'")
                        launchPredictiveTTS(remainingText, sentenceCount)
                    }
                }
                
                val finalResponse = fullResponse.toString()
                if (finalResponse.isNotEmpty()) {
                    conversationHistory.add(Message("assistant", finalResponse))
                    messageRepository.saveMessage("assistant", finalResponse)
                    Log.d(TAG, "Assistant response saved to history")
                } else {
                    Log.w(TAG, "Empty response from LLM")
                    handleProcessingError("Respuesta vacía del asistente", Exception("Empty LLM response"))
                }
                
            } catch (e: IOException) {
                Log.e(TAG, "IO error reading LLM stream", e)
                handleProcessingError("Error leyendo respuesta del asistente", e)
            } catch (e: Exception) {
                Log.e(TAG, "Unexpected error processing LLM stream", e)
                handleProcessingError("Error procesando respuesta del asistente", e)
            }
        } ?: run {
            Log.e(TAG, "Null response body from LLM")
            handleProcessingError("Respuesta vacía del servidor", Exception("Null response body"))
        }
    }

    private fun parseSSEChunk(data: String): String? {
        return try {
            val json = gson.fromJson(data, Map::class.java)
            val choices = json["choices"] as? List<*>
            val delta = (choices?.firstOrNull() as? Map<*, *>)?.get("delta") as? Map<*, *>
            delta?.get("content") as? String
        } catch (e: Exception) {
            null
        }
    }

    private fun launchPredictiveTTS(sentence: String, sequenceId: Int) {
        if (sentence.isBlank()) return
        
        currentTtsCharacters += sentence.length
        
        val ttsJob = viewModelScope.launch {
            try {
                val timerKey = "tts_sentence_$sequenceId"
                metricsRepository.startTimer(timerKey)
                
                val voice = _currentPersonality.value.voice
                val request = TTSRequest(
                    input = sentence,
                    voice = voice
                )
                
                Log.d(TAG, "Generating predictive TTS for sentence #$sequenceId (${sentence.length} chars)")
                val call = openAiService.generateSpeech(authHeader(), request)
                
                val response = call.execute()
                if (response.isSuccessful) {
                    response.body()?.let { body ->
                        val ttsLatency = SystemClock.elapsedRealtime() - recordingStartTime
                        Log.d(TAG, "TTS generated for sentence #$sequenceId in ${ttsLatency}ms")
                        
                        val streamId = audioPlayer.enqueueStream(
                            inputStream = body.byteStream(),
                            text = sentence.take(50) + if (sentence.length > 50) "..." else "",
                            priority = sequenceId
                        )
                        
                        Log.d(TAG, "Audio stream #$streamId enqueued for sentence #$sequenceId")
                    }
                } else {
                    Log.e(TAG, "TTS API error for sentence #$sequenceId - Code: ${response.code()}")
                }
            } catch (e: CancellationException) {
                Log.d(TAG, "Predictive TTS cancelled for sentence #$sequenceId")
            } catch (e: Exception) {
                Log.e(TAG, "Error in predictive TTS for sentence #$sequenceId", e)
            }
        }
        ttsJobs.add(ttsJob)
    }

    private suspend fun generateAndPlayTTS(text: String) = withContext(Dispatchers.IO) {
        try {
            val request = TTSRequest(
                input = text,
                voice = _currentPersonality.value.voice
            )
            
            Log.d(TAG, "Calling TTS with API key len=${currentApiKey().length}")
            val call = openAiService.generateSpeech(authHeader(), request)
            currentTTSCall = call
            
            val response = call.execute()
            if (response.isSuccessful) {
                response.body()?.let { body ->
                    stateMutex.withLock {
                        _voiceState.emit(VoiceState.Speaking)
                    }
                    audioPlayer.playStream(body.byteStream())
                    
                    stateMutex.withLock {
                        if (_voiceState.value == VoiceState.Speaking) {
                            _voiceState.emit(VoiceState.Idle)
                        }
                    }
                }
            } else {
                Log.e(TAG, "TTS API error - Code: ${response.code()}, Message: ${response.message()}")
                handleProcessingError("Error generando audio: ${response.code()}", Exception("TTS HTTP ${response.code()}"))
            }
        } catch (e: CancellationException) {
            Log.d(TAG, "TTS generation cancelled")
        } catch (e: Exception) {
            Log.e(TAG, "Error in TTS generation", e)
            handleProcessingError("Error generando audio", e)
        }
    }

    fun interruptSpeaking() {
        viewModelScope.launch {
            stateMutex.withLock {
                ttsJobs.forEach { it.cancel() }
                ttsJobs.clear()
                
                currentLLMCall?.cancel()
                currentTTSCall?.cancel()
                
                audioPlayer.stop()
                
                if (_voiceState.value == VoiceState.Speaking) {
                    _voiceState.value = VoiceState.Idle
                }
            }
        }
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
        
        fun Int.toLittleEndianBytes(): ByteArray = byteArrayOf(
            (this and 0xff).toByte(),
            ((this shr 8) and 0xff).toByte(),
            ((this shr 16) and 0xff).toByte(),
            ((this shr 24) and 0xff).toByte()
        )
        
        fun Short.toLittleEndianBytes(): ByteArray = byteArrayOf(
            (this.toInt() and 0xff).toByte(),
            ((this.toInt() shr 8) and 0xff).toByte()
        )
        
        return byteArrayOf(
            'R'.code.toByte(), 'I'.code.toByte(), 'F'.code.toByte(), 'F'.code.toByte()
        ) + fileSize.toLittleEndianBytes() + byteArrayOf(
            'W'.code.toByte(), 'A'.code.toByte(), 'V'.code.toByte(), 'E'.code.toByte(),
            'f'.code.toByte(), 'm'.code.toByte(), 't'.code.toByte(), ' '.code.toByte()
        ) + 16.toLittleEndianBytes() +
        1.toShort().toLittleEndianBytes() +
        channels.toShort().toLittleEndianBytes() +
        sampleRate.toLittleEndianBytes() +
        byteRate.toLittleEndianBytes() +
        blockAlign.toShort().toLittleEndianBytes() +
        bitsPerSample.toShort().toLittleEndianBytes() +
        byteArrayOf(
            'd'.code.toByte(), 'a'.code.toByte(), 't'.code.toByte(), 'a'.code.toByte()
        ) + dataSize.toLittleEndianBytes()
    }

    private fun isSentenceComplete(currentText: String, lastToken: String): Boolean {
        val hasEnding = lastToken.any { it in SENTENCE_ENDINGS }
        val hasSeparator = lastToken.any { it in SENTENCE_SEPARATORS }
        
        if (!hasEnding && !hasSeparator) return false
        
        val trimmedText = currentText.trim()
        
        if (trimmedText.length < MIN_SENTENCE_LENGTH) return false
        
        if (hasEnding && isLikelyAbbreviation(trimmedText)) return false
        
        if (hasEnding && trimmedText.matches(Regex(".*\\d+\\.\\d*$"))) return false
        
        return true
    }

    private fun isLikelyAbbreviation(text: String): Boolean {
        val words = text.split("\\s+".toRegex())
        val lastWord = words.lastOrNull()?.removeSuffix(".") ?: return false
        return ABBREVIATIONS.contains(lastWord)
    }

    private fun calculateAudioLevel(buffer: ShortArray, length: Int): Float {
        var sum = 0L
        for (i in 0 until length) {
            sum += (buffer[i] * buffer[i]).toLong()
        }
        val rms = kotlin.math.sqrt(sum.toDouble() / length)
        return (rms / Short.MAX_VALUE * 100).toFloat()
    }

    private fun hasRecordAudioPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun currentApiKey(): String {
        return apiKeyStore.apiKey.value
    }

    private fun authHeader(): String = "Bearer ${currentApiKey()}"

    private fun handleRecordingError(error: Throwable) {
        Log.e(TAG, "Recording error", error)
        _voiceState.value = VoiceState.Error("Error de grabación")
        _errorMessage.value = "Error al acceder al micrófono: ${error.message}"
    }

    private fun handleProcessingError(message: String, error: Throwable) {
        Log.e(TAG, message, error)
        _voiceState.value = VoiceState.Error(message)
        _errorMessage.value = message
    }

    private fun getAudioSourceName(source: Int): String = when (source) {
        MediaRecorder.AudioSource.MIC -> "MIC"
        MediaRecorder.AudioSource.VOICE_RECOGNITION -> "VOICE_RECOGNITION"
        MediaRecorder.AudioSource.DEFAULT -> "DEFAULT"
        MediaRecorder.AudioSource.VOICE_COMMUNICATION -> "VOICE_COMMUNICATION"
        MediaRecorder.AudioSource.CAMCORDER -> "CAMCORDER"
        else -> "UNKNOWN($source)"
    }

    override fun onCleared() {
        super.onCleared()
        try {
            stopListening()
            interruptSpeaking()
            
            currentTTSCall?.cancel()
            ttsJobs.forEach { it.cancel() }
            
            audioRecord?.stop()
            audioRecord?.release()
            
            Log.d(TAG, "ViewModel cleared and resources released")
        } catch (e: Exception) {
            Log.e(TAG, "Error during ViewModel cleanup", e)
        }
    }
}
