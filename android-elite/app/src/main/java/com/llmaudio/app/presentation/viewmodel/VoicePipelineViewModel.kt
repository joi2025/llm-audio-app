package com.llmaudio.app.presentation.viewmodel

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.SystemClock
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.gson.Gson
import com.llmaudio.app.data.api.OpenAiService
import com.llmaudio.app.data.model.ChatCompletionRequest
import com.llmaudio.app.data.model.Message // Ensure this is the correct Message model
import com.llmaudio.app.data.model.TTSRequest
// import com.llmaudio.app.data.model.TranscriptionResponse // Not directly used, OpenAiService handles it
import com.llmaudio.app.data.repository.MessageRepository
import com.llmaudio.app.data.repository.MetricsRepository // Assuming this is used or will be
import com.llmaudio.app.data.store.ApiKeyStore
import com.llmaudio.app.data.store.SelectedPersonalityStore
import com.llmaudio.app.domain.audio.AudioPlayer
import com.llmaudio.app.domain.model.Personalities // Import Personalities
import com.llmaudio.app.domain.model.Personality
import com.llmaudio.app.domain.model.VoiceState
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.ResponseBody
import retrofit2.HttpException
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.IOException

import javax.inject.Inject

enum class ApiKeyValidationState { IDLE, CHECKING, VALID, INVALID }

@HiltViewModel
class VoicePipelineViewModel @Inject constructor(
    private val openAiService: OpenAiService,
    private val audioPlayer: AudioPlayer,
    private val messageRepository: MessageRepository,
    private val metricsRepository: MetricsRepository,
    private val apiKeyStore: ApiKeyStore,
    private val selectedPersonalityStore: SelectedPersonalityStore,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val TAG = "VoicePipelineVM"

    private val _voiceState = MutableStateFlow<VoiceState>(VoiceState.Idle)
    val voiceState: StateFlow<VoiceState> = _voiceState.asStateFlow()

    private val _transcription = MutableStateFlow("")
    val transcription: StateFlow<String> = _transcription.asStateFlow()

    private val _assistantResponse = MutableStateFlow("")
    val assistantResponse: StateFlow<String> = _assistantResponse.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _audioLevel = MutableStateFlow(0f)
    val audioLevel: StateFlow<Float> = _audioLevel.asStateFlow()

    private val _currentPersonality = MutableStateFlow(Personalities.getDefault())
    val currentPersonality: StateFlow<Personality> = _currentPersonality.asStateFlow()

    val apiKeyFlow: StateFlow<String> = apiKeyStore.apiKeyFlow.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        ""
    )

    private val _apiKeyValidity = MutableStateFlow<ApiKeyValidationState>(ApiKeyValidationState.IDLE)
    val apiKeyValidity: StateFlow<ApiKeyValidationState> = _apiKeyValidity.asStateFlow()

    private var audioRecord: AudioRecord? = null
    private var recordingThread: Job? = null
    private val audioBuffer = ByteArrayOutputStream()
    private val audioBufferMutex = Mutex()
    private val stateMutex = Mutex()

    private val gson = Gson()

    private var conversationHistory = mutableListOf<com.llmaudio.app.data.model.Message>()
    private var currentLLMJob: Job? = null
    private val ttsJobs = mutableListOf<Job>()

    private val SAMPLE_RATE = 16000
    private val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
    private val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    private var bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)

    private val SENTENCE_ENDINGS = charArrayOf('.', '!', '?')
    private val MIN_SENTENCE_LENGTH = 7
    private val ABBREVIATIONS =
        setOf("Mr", "Mrs", "Ms", "Dr", "St", "Ave", "Blvd", "etc", "Gen", "Fig", "e.g", "i.e")

    private var recordingStartTime: Long = 0L

    private val EXTENDED_RESPONSE_KEYWORDS = listOf(
        "cuéntame más", "explícame más", "dime más",
        "explica detalladamente", "profundiza", "elabora sobre esto", "dame más detalles"
    )

    init {
        viewModelScope.launch {
            selectedPersonalityStore.selectedPersonalityIdFlow.collect { personalityId ->
                val newPersonality = if (personalityId != null) {
                    Personalities.getAll().find { it.id == personalityId }
                        ?: Personalities.getDefault()
                } else {
                    Personalities.getDefault()
                }
                _currentPersonality.value = newPersonality
                resetConversation()
            }
        }
        audioPlayer.setPlaybackListener(object : AudioPlayer.PlaybackListener {
            override fun onStart(text: String) {
                viewModelScope.launch {
                    stateMutex.withLock {
                        if (_voiceState.value !is VoiceState.Error) {
                            _voiceState.value = VoiceState.Speaking
                        }
                    }
                }
                Log.d(TAG, "AudioPlayer started speaking: '$text'")
            }

            override fun onStop() {
                viewModelScope.launch {
                    stateMutex.withLock {
                        if (_voiceState.value == VoiceState.Speaking) {
                            _voiceState.value = VoiceState.Idle
                        }
                    }
                }
                Log.d(TAG, "AudioPlayer stopped speaking.")
            }

            override fun onError(error: String) {
                Log.e(TAG, "AudioPlayer Error: $error")
                viewModelScope.launch(Dispatchers.Main) {
                    handleProcessingError(
                        "Error de AudioPlayer: $error",
                        Exception("AudioPlayer: $error")
                    )
                }
            }
        })
        if (bufferSize <= 0) bufferSize = SAMPLE_RATE * 2 * 1 * (16 / 8) // Basic fallback
    }

    fun saveApiKey(apiKey: String) {
        viewModelScope.launch {
            apiKeyStore.setApiKey(apiKey.trim())
        }
    }

    fun checkOpenAIKeyValidity(apiKeyToTest: String) {
        if (apiKeyToTest.isBlank()) {
            _apiKeyValidity.value = ApiKeyValidationState.INVALID
            return
        }
        _apiKeyValidity.value = ApiKeyValidationState.CHECKING
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val response = openAiService.listModels("Bearer $apiKeyToTest")
                if (response.isSuccessful) {
                    _apiKeyValidity.value = ApiKeyValidationState.VALID
                    Log.i(TAG, "API Key is valid.")
                } else {
                    _apiKeyValidity.value = ApiKeyValidationState.INVALID
                    Log.w(TAG, "API Key is invalid: ${response.code()} - ${response.errorBody()?.string()}")
                }
            } catch (e: Exception) {
                _apiKeyValidity.value = ApiKeyValidationState.INVALID
                Log.e(TAG, "Error checking API Key validity", e)
            }
        }
    }

    fun resetApiKeyValidationState() {
        _apiKeyValidity.value = ApiKeyValidationState.IDLE
    }


    fun changePersonality(personality: Personality) {
        viewModelScope.launch {
            selectedPersonalityStore.saveSelectedPersonalityId(personality.id)
        }
    }

    fun startListening() {
        if (!hasRecordAudioPermission()) {
            _errorMessage.value = "Se requiere permiso para grabar audio."
            _voiceState.value = VoiceState.Error("Permiso de audio denegado")
            return
        }
        if (currentApiKey().isBlank()) {
            _errorMessage.value = "Se requiere configurar la API key de OpenAI"
            _voiceState.value = VoiceState.Error("API Key no configurada")
            return
        }

        viewModelScope.launch {
            stateMutex.withLock {
                if (_voiceState.value is VoiceState.Listening || _voiceState.value is VoiceState.Processing) {
                    Log.d(TAG, "Already listening or processing, ignoring startListening call.")
                    return@launch
                }
                Log.d(TAG, "Starting to listen...")
                _voiceState.value = VoiceState.Listening
            }
            _errorMessage.value = null
            _transcription.value = ""
            _assistantResponse.value = ""
            audioBufferMutex.withLock { audioBuffer.reset() }

            try { 
                val currentBufferSize =
                    AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
                if (currentBufferSize == AudioRecord.ERROR_BAD_VALUE || currentBufferSize <= 0) {
                    throw IllegalStateException("AudioRecord.getMinBufferSize returned an error or invalid size: $currentBufferSize")
                }
                bufferSize = currentBufferSize

                audioRecord = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    SAMPLE_RATE,
                    CHANNEL_CONFIG,
                    AUDIO_FORMAT,
                    bufferSize * 2 
                )
                audioRecord?.startRecording()
                if (audioRecord?.recordingState != AudioRecord.RECORDSTATE_RECORDING) {
                    throw IllegalStateException("AudioRecord failed to start recording. State: ${audioRecord?.recordingState}")
                }
                recordingStartTime = SystemClock.elapsedRealtime()
                Log.d(TAG, "AudioRecord started successfully.")

                recordingThread = launch(Dispatchers.IO) {
                    val readBuffer = ByteArray(bufferSize)
                    while (isActive && _voiceState.value == VoiceState.Listening) {
                        val bytesRead = audioRecord?.read(readBuffer, 0, readBuffer.size) ?: 0
                        if (bytesRead > 0) {
                            audioBufferMutex.withLock {
                                audioBuffer.write(readBuffer, 0, bytesRead)
                            }
                        } else if (bytesRead < 0) {
                            Log.e(TAG, "AudioRecord read error: $bytesRead")
                            break 
                        }
                    }
                    _audioLevel.value = 0f 
                    Log.d(TAG, "Recording thread finished.")
                }
            } catch (e: SecurityException) { 
                Log.e(TAG, "SecurityException during recording setup", e)
                handleRecordingError(e)
            } catch (e: IllegalStateException) { 
                Log.e(TAG, "IllegalStateException during recording setup", e)
                handleRecordingError(e)
            } catch (e: Exception) { 
                Log.e(TAG, "Generic Exception during recording setup", e)
                handleRecordingError(e)
            }
        } 
    }

    fun stopListening() {
        viewModelScope.launch {
            Log.d(TAG, "Attempting to stop listening. Current state: ${_voiceState.value}")
            val previousState = _voiceState.value
            stateMutex.withLock {
                if (_voiceState.value != VoiceState.Listening) {
                    Log.d(TAG, "Not in Listening state, no action taken for stopListening.")
                    return@launch
                }
                _voiceState.value = VoiceState.Processing
            }
            _audioLevel.value = 0f 
            Log.d(TAG, "Transitioned to Processing state.")

            recordingThread?.cancelAndJoin()
            Log.d(TAG, "Recording thread joined.")

            try {
                audioRecord?.stop()
                Log.d(TAG, "AudioRecord stopped.")
            } catch (e: IllegalStateException) {
                Log.e(TAG, "IllegalStateException while stopping AudioRecord", e)
            } finally {
                audioRecord?.release()
                audioRecord = null
                Log.d(TAG, "AudioRecord released.")
            }

            val audioData = audioBufferMutex.withLock { audioBuffer.toByteArray() }
            if (audioData.isEmpty()) {
                if (previousState == VoiceState.Listening) { 
                    Log.w(TAG, "Audio data is empty after recording.")
                    _voiceState.value = VoiceState.Idle
                    _errorMessage.value = "No se grabó audio."
                }
                return@launch
            }
            Log.d(TAG, "Stopped listening. Audio data size: ${audioData.size} bytes. Processing...")
            processAudio(audioData)
        }
    }

    private suspend fun processAudio(audioData: ByteArray) {
        Log.d(TAG, "Processing audio data...")
        try {
            if (currentApiKey().isBlank()) {
                handleProcessingError(
                    "API Key no configurada",
                    IllegalStateException("API Key not set")
                )
                return
            }

            val header = createWavHeader(audioData)
            val wavFileContent = header + audioData
            val tempFile = File.createTempFile("llm_audio_stt_", ".wav", context.cacheDir)
            tempFile.writeBytes(wavFileContent)
            Log.d(TAG, "WAV file for STT: ${tempFile.absolutePath}, size: ${tempFile.length()}")

            val requestFile = tempFile.asRequestBody("audio/wav".toMediaTypeOrNull())
            val filePart = MultipartBody.Part.createFormData("file", tempFile.name, requestFile)
            val modelPart = "whisper-1".toRequestBody("text/plain".toMediaTypeOrNull())
            val languagePart =
                _currentPersonality.value.languageCode.toRequestBody("text/plain".toMediaTypeOrNull()) // Use language from personality

            val sttStartTime = System.currentTimeMillis()
            val response =
                openAiService.transcribeAudio(authHeader(), filePart, modelPart, languagePart)
            
            tempFile.delete() 

            if (response.isSuccessful) {
                val transcriptionResponse =
                    response.body() 
                val transcribedText = transcriptionResponse?.text?.trim() ?: ""
                _transcription.value = transcribedText // Update transcription stateflow
                Log.i(TAG, "Transcription successful: '$transcribedText'")

                val minWordCount = 1 
                val wordCount = transcribedText.split(Regex("\\s+")).filter { it.isNotBlank() }.size

                if (transcribedText.isNotBlank() && wordCount >= minWordCount) {
                    conversationHistory.add(
                        com.llmaudio.app.data.model.Message(
                            "user",
                            transcribedText
                        )
                    )
                    messageRepository.saveMessage(
                        "user",
                        transcribedText
                    ) 
                    streamLLMResponse(transcribedText) // Pass transcribedText here
                } else {
                    if (transcribedText.isBlank()) {
                        Log.w(TAG, "Transcription was empty.")
                        _errorMessage.value = "No se pudo transcribir el audio (respuesta vacía)."
                    } else {
                        Log.w(TAG, "Transcription too short or meaningless: '$transcribedText'. Ignoring.")
                        _errorMessage.value = "No se entendió el audio, intente de nuevo."
                    }
                    _voiceState.value = VoiceState.Idle
                }
            } else {
                val errorBody = response.errorBody()?.string() ?: "Error desconocido en STT"
                Log.e(TAG, "Error en transcripción STT: ${response.code()} - $errorBody")
                handleProcessingError(
                    "Error en transcripción: ${response.code()}",
                    HttpException(response)
                )
            }
        } catch (e: IOException) { 
            Log.e(TAG, "IOException during audio processing", e)
            handleProcessingError("Error de archivo al procesar audio: ${e.message}", e)
        } catch (e: Exception) { 
            Log.e(TAG, "Error inesperado al procesar audio", e)
            handleProcessingError("Error al procesar audio: ${e.message}", e)
        }
    }

    private fun streamLLMResponse(transcribedText: String) { // Added transcribedText parameter
        Log.d(TAG, "Streaming LLM response for text: '$transcribedText'")
        val messagesForLLM = mutableListOf(
            com.llmaudio.app.data.model.Message("system", _currentPersonality.value.systemPrompt)
        )
        messagesForLLM.addAll(conversationHistory.takeLast(10)) // Ensure conversationHistory is up-to-date

        val personality = _currentPersonality.value
        val wantsExtendedResponse = EXTENDED_RESPONSE_KEYWORDS.any { keyword ->
            transcribedText.contains(keyword, ignoreCase = true)
        }

        val currentMaxTokens = if (wantsExtendedResponse) {
            Log.d(TAG, "User requested extended response, using maxTokensExtended: ${personality.maxTokensExtended}")
            personality.maxTokensExtended
        } else {
            Log.d(TAG, "Using default maxTokensDefault: ${personality.maxTokensDefault}")
            personality.maxTokensDefault
        }

        val request = ChatCompletionRequest(
            messages = messagesForLLM,
            model = personality.modelName,
            stream = true,
            // max_tokens = currentMaxTokens, // Ensure @SerializedName("max_tokens") is used in ChatCompletionRequest
            temperature = personality.temperature.toDouble()
        )

        currentLLMJob?.cancel() 
        currentLLMJob =
            viewModelScope.launch(Dispatchers.IO) { 
                try {
                    Log.i(TAG, "Calling streamChatCompletion with ${messagesForLLM.size} messages. max_tokens: $currentMaxTokens")
                    val llmStartTime = System.currentTimeMillis()
                    val response = openAiService.streamChatCompletion(authHeader(), request)
                    
                    if (response.isSuccessful) {
                        response.body()?.let {
                            Log.d(
                                TAG,
                                "Got successful response from streamChatCompletion, processing stream..."
                            )
                            processStreamingResponse(it, this) 
                        } ?: run {
                            Log.e(TAG, "Null response body from LLM stream despite success")
                            withContext(Dispatchers.Main) {
                                handleProcessingError(
                                    "Respuesta vacía del servidor LLM",
                                    Exception("Null response body from LLM")
                                )
                            }
                        }
                    } else {
                        val errorBody =
                            response.errorBody()?.string() ?: "Error desconocido con LLM"
                        Log.e(TAG, "Error en streamChatCompletion: ${response.code()} - $errorBody")
                        withContext(Dispatchers.Main) {
                            handleProcessingError(
                                "Error de conexión con LLM: ${response.code()}",
                                HttpException(response)
                            )
                        }
                    }
                } catch (e: CancellationException) {
                    Log.i(TAG, "LLM Stream job cancelled.")
                } catch (e: Exception) {
                    Log.e(TAG, "Error in streamChatCompletion call or stream processing", e)
                    withContext(Dispatchers.Main) { 
                        handleProcessingError("Error de conexión con LLM: ${e.message}", e)
                    }
                }
            }
    }

    private suspend fun processStreamingResponse(
        responseBody: ResponseBody,
        scope: CoroutineScope
    ) {
        withContext(Dispatchers.Main) { _assistantResponse.value = "" }

        responseBody.source().use { source ->
            val fullResponse = StringBuilder()
            var sentenceCount = 0
            var currentSentence = StringBuilder()

            while (scope.isActive && !source.exhausted()) { 
                val line = source.readUtf8Line() ?: break 
                if (line.isBlank()) continue

                if (line.startsWith("data: ") && !line.contentEquals("data: [DONE]")) {
                    val jsonData = line.substring(6)
                    val token = parseSSEChunk(jsonData)

                    token?.let {
                        fullResponse.append(it)
                        currentSentence.append(it)

                        withContext(Dispatchers.Main) { 
                            _assistantResponse.value = fullResponse.toString()
                        }

                        if (isSentenceComplete(currentSentence.toString(), it)) {
                            sentenceCount++
                            val sentenceToSpeak = currentSentence.toString().trim()
                            Log.i(TAG, "Sentence #$sentenceCount for TTS: '$sentenceToSpeak'")
                            if (sentenceToSpeak.isNotBlank()) {
                                launchPredictiveTTS(sentenceToSpeak, sentenceCount)
                            }
                            currentSentence.clear()
                        }
                    }
                } else if (line.contentEquals("data: [DONE]")) {
                    Log.i(TAG, "LLM Stream finished [DONE]")
                    break
                }
            }

            if (currentSentence.isNotEmpty()) {
                val remainingText = currentSentence.toString().trim()
                if (remainingText.isNotBlank()) {
                    sentenceCount++
                    Log.i(
                        TAG,
                        "Processing remaining text as sentence #$sentenceCount for TTS: '$remainingText'"
                    )
                    launchPredictiveTTS(remainingText, sentenceCount)
                }
            }

            val finalResponseText = fullResponse.toString().trim()
            withContext(Dispatchers.Main) { 
                if (finalResponseText.isNotEmpty()) {
                    Log.i(TAG, "Final assistant response: '$finalResponseText'")
                    conversationHistory.add(
                        com.llmaudio.app.data.model.Message(
                            "assistant",
                            finalResponseText
                        )
                    )
                    messageRepository.saveMessage(
                        "assistant",
                        finalResponseText
                    ) 
                    if (sentenceCount == 0 && _voiceState.value != VoiceState.Idle && _voiceState.value !is VoiceState.Error) {
                        stateMutex.withLock { 
                            if (_voiceState.value !is VoiceState.Error) _voiceState.value =
                                VoiceState.Idle
                        }
                    }
                } else {
                    Log.w(TAG, "Empty response from LLM after streaming.")
                    if (_voiceState.value != VoiceState.Idle && _voiceState.value !is VoiceState.Error) {
                        stateMutex.withLock {
                            if (_voiceState.value !is VoiceState.Error) _voiceState.value =
                                VoiceState.Idle
                        }
                        _errorMessage.value = "Asistente no generó respuesta."
                    }
                }
            }
        } 
    }

    private fun parseSSEChunk(data: String): String? {
        return try {
            if (data.contains("\"error\":")) { 
                Log.e(TAG, "SSE Error Chunk: $data")
                return null 
            }
            val json = gson.fromJson(data, Map::class.java) 
            val choices = json["choices"] as? List<*>
            val delta = (choices?.firstOrNull() as? Map<*, *>)?.get("delta") as? Map<*, *>
            delta?.get("content") as? String
        } catch (e: Exception) { 
            Log.e(TAG, "Error parsing SSE chunk: $data", e)
            null
        }
    }

    private fun launchPredictiveTTS(sentence: String, sequenceId: Int) {
        if (sentence.isBlank() || currentApiKey().isBlank()) {
            Log.w(TAG, "Skipping TTS for blank sentence or missing API key. Sentence: '$sentence'")
            return
        }

        val ttsJob = viewModelScope.launch(Dispatchers.IO) { 
            try {
                val personality = _currentPersonality.value
                val request = TTSRequest(
                    input = sentence,
                    voice = personality.voice,
                    model = "tts-1-hd", 
                    responseFormat = "mp3"
                    // language = personality.languageCode // Pass language to TTS request if API supports
                )

                Log.i(TAG, "Generating TTS for sentence #$sequenceId ('${sentence.take(30)}...') using voice ${personality.voice} and lang ${personality.languageCode}")
                val ttsStartTime = System.currentTimeMillis()
                val response = openAiService.generateSpeech(authHeader(), request)
                
                if (response.isSuccessful) {
                    response.body()?.let {
                        audioPlayer.enqueueStream(
                            inputStream = it.byteStream(),
                            text = sentence.take(50) + if (sentence.length > 50) "..." else "", 
                            priority = sequenceId
                        )
                        Log.d(TAG, "Audio stream enqueued for sentence #$sequenceId")
                    } ?: run {
                        Log.e(
                            TAG,
                            "Null response body from TTS despite success for sentence #$sequenceId"
                        )
                    }
                } else {
                    val errorBody = response.errorBody()?.string() ?: "Error desconocido en TTS"
                    Log.e(
                        TAG,
                        "Error generating TTS for sentence #$sequenceId: ${response.code()} - $errorBody"
                    )
                }

            } catch (e: CancellationException) {
                Log.i(TAG, "Predictive TTS cancelled for sentence #$sequenceId")
            } catch (e: Exception) {
                Log.e(
                    TAG,
                    "Error in predictive TTS for sentence #$sequenceId: '${sentence.take(30)}...'",
                    e
                )
            }
        }
        ttsJobs.add(ttsJob)
        ttsJob.invokeOnCompletion { ttsJobs.remove(ttsJob) } 
    }

    fun interruptSpeaking() {
        viewModelScope.launch { 
            Log.i(TAG, "Interrupting speaking and active processes by user.")
            stateMutex.withLock { 
                ttsJobs.forEach { if (it.isActive) it.cancel("Interrupted by user from interruptSpeaking") }
                ttsJobs.clear() 
                currentLLMJob?.cancel("Interrupted by user from interruptSpeaking")
                currentLLMJob = null 
                audioPlayer.stop() 

                if (_voiceState.value == VoiceState.Processing || _voiceState.value == VoiceState.Speaking) {
                    _voiceState.value = VoiceState.Idle
                }
                _assistantResponse.value = ""
                _transcription.value = "" 
            }
        }
    }

    private fun resetConversation() {
        conversationHistory.clear()
        Log.d(TAG, "Conversation history reset.")
    }

    private fun createWavHeader(audioData: ByteArray): ByteArray {
        val sampleRate = SAMPLE_RATE
        val channels = 1 
        val bitsPerSample = 16 
        val byteRate = sampleRate * channels * bitsPerSample / 8
        val blockAlign = (channels * bitsPerSample / 8).toShort()
        val dataSize = audioData.size
        val headerSize = 44 
        val fileSize = dataSize + headerSize - 8 

        fun Int.toByteArray(size: Int, littleEndian: Boolean = true): ByteArray {
            val bytes = ByteArray(size)
            for (i in 0 until size) {
                bytes[if (littleEndian) i else size - 1 - i] =
                    ((this shr (i * 8)) and 0xFF).toByte()
            }
            return bytes
        }

        fun Short.toByteArray(littleEndian: Boolean = true): ByteArray =
            this.toInt().toByteArray(2, littleEndian)

        return ByteArrayOutputStream().use { baos ->
            baos.write("RIFF".toByteArray(Charsets.US_ASCII))
            baos.write(fileSize.toByteArray(4)) 
            baos.write("WAVE".toByteArray(Charsets.US_ASCII))
            baos.write("fmt ".toByteArray(Charsets.US_ASCII)) 
            baos.write(16.toByteArray(4))      
            baos.write(1.toShort().toByteArray()) 
            baos.write(channels.toShort().toByteArray()) 
            baos.write(sampleRate.toByteArray(4)) 
            baos.write(byteRate.toByteArray(4))   
            baos.write(blockAlign.toByteArray())  
            baos.write(bitsPerSample.toShort().toByteArray()) 
            baos.write("data".toByteArray(Charsets.US_ASCII)) 
            baos.write(dataSize.toByteArray(4)) 
            baos.toByteArray()
        }
    }

    private fun isSentenceComplete(currentText: String, lastToken: String): Boolean {
        val trimmedText = currentText.trim()
        val hasEndingPunctuation = lastToken.any { it in SENTENCE_ENDINGS }
        if (!hasEndingPunctuation) return false

        if (trimmedText.length < MIN_SENTENCE_LENGTH) return false

        val lastWordPeriod = trimmedText.substringAfterLast(" ").trimEnd(*SENTENCE_ENDINGS)
        if (ABBREVIATIONS.any { it.equals(lastWordPeriod, ignoreCase = true) }) {
            if (lastWordPeriod.equals(
                    "St",
                    ignoreCase = true
                ) && lastToken.contains(".")) return false
            if (lastToken.trim() == "." && ABBREVIATIONS.any {
                    it.equals(
                        trimmedText.substringBeforeLast(".")
                            .substringAfterLast(" ").trim(), ignoreCase = true
                    )
                }) return false
        }

        if (lastToken.matches(Regex("\\d")) && trimmedText.matches(Regex(".*\\d+\\.\\d*$"))) return false 
        if (lastToken == "." && trimmedText.matches(Regex(".*\\d+$"))) return false 

        return true 
    }


    private fun hasRecordAudioPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun currentApiKey(): String = apiKeyFlow.value
    private fun authHeader(): String = "Bearer ${currentApiKey()}"

    private fun handleRecordingError(error: Throwable) {
        Log.e(TAG, "Recording error: ${error.message}", error)
        viewModelScope.launch(Dispatchers.Main.immediate) { 
            _voiceState.value = VoiceState.Error("Error de grabación")
            _errorMessage.value =
                "Error al acceder al micrófono: ${error.localizedMessage ?: "desconocido"}"
            audioRecord?.release()
            audioRecord = null
            recordingThread?.cancel() 
        }
    }

    private fun handleProcessingError(message: String, error: Throwable) {
        Log.e(TAG, "Processing error: $message", error)
        viewModelScope.launch(Dispatchers.Main.immediate) { 
            val displayMessage =
                message.take(100) + if (error.message != null && !message.contains(error.message!!)) " (${
                    error.message!!.take(50)
                })" else ""
            _voiceState.value = VoiceState.Error(
                displayMessage.replace("Exception: ", "").replace("java.io.IOException: ", "")
            )
            _errorMessage.value = displayMessage

            ttsJobs.forEach { if (it.isActive) it.cancel("Processing error occurred") }
            ttsJobs.clear()
            currentLLMJob?.cancel("Processing error occurred")
            audioPlayer.stop() 
        }
    }

    override fun onCleared() {
        super.onCleared()
        Log.d(TAG, "ViewModel cleared and resources released")
        audioRecord?.release() 
        audioRecord = null
        recordingThread?.cancel() 
        ttsJobs.forEach { it.cancel("ViewModel cleared") } 
        currentLLMJob?.cancel("ViewModel cleared") 
    }
}
