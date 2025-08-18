package com.joi2025.llmaudioapp.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject
import com.joi2025.llmaudioapp.data.model.*
import com.joi2025.llmaudioapp.data.repository.AudioRepository
import com.joi2025.llmaudioapp.data.repository.WebSocketRepository

/**
 * MainViewModel - Manages UI state and business logic
 * Coordinates between audio recording, WebSocket communication, and UI updates
 */
@HiltViewModel
class MainViewModel @Inject constructor(
    private val audioRepository: AudioRepository,
    private val webSocketRepository: WebSocketRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(UIState())
    val uiState: StateFlow<UIState> = _uiState.asStateFlow()

    private val _currentState = MutableStateFlow(AppState.IDLE)
    val currentState: StateFlow<AppState> = _currentState.asStateFlow()

    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()

    private val _audioLevel = MutableStateFlow(0f)
    val audioLevel: StateFlow<Float> = _audioLevel.asStateFlow()
    
    private val _isAdminMode = MutableStateFlow(false)
    val isAdminMode: StateFlow<Boolean> = _isAdminMode.asStateFlow()

    init {
        initializeApp()
        observeWebSocketEvents()
        observeAudioEvents()
    }

    private fun initializeApp() {
        viewModelScope.launch {
            // Initialize WebSocket connection
            webSocketRepository.connect()
            
            // Initialize audio system
            audioRepository.initialize()
            
            // Start auto voice detection
            startAutoVoiceDetection()
        }
    }

    private fun observeWebSocketEvents() {
        viewModelScope.launch {
            webSocketRepository.connectionState.collect { connectionState ->
                _isConnected.value = connectionState == ConnectionState.CONNECTED
                updateUIState { it.copy(connectionState = connectionState) }
            }
        }

        viewModelScope.launch {
            webSocketRepository.messages.collect { message ->
                handleWebSocketMessage(message)
            }
        }
    }

    private fun observeAudioEvents() {
        viewModelScope.launch {
            audioRepository.audioLevel.collect { level ->
                _audioLevel.value = level
            }
        }

        viewModelScope.launch {
            audioRepository.isRecording.collect { isRecording ->
                if (isRecording) {
                    _currentState.value = AppState.LISTENING
                } else if (_currentState.value == AppState.LISTENING) {
                    _currentState.value = AppState.PROCESSING
                }
            }
        }
    }

    private fun handleWebSocketMessage(message: WebSocketMessage) {
        when (message.type) {
            "llm_first_token" -> {
                _currentState.value = AppState.SPEAKING
            }
            "audio_chunk" -> {
                // Play TTS audio chunk
                audioRepository.playAudioChunk(message.data as ByteArray)
            }
            "tts_cancelled" -> {
                audioRepository.stopPlayback()
                _currentState.value = AppState.IDLE
            }
            "final_transcript" -> {
                // Transcript received, now waiting for LLM response
                _currentState.value = AppState.PROCESSING
            }
            "error" -> {
                updateUIState { 
                    it.copy(
                        hasErrors = true, 
                        errorMessage = message.data as? String
                    ) 
                }
            }
        }
    }

    private fun startAutoVoiceDetection() {
        viewModelScope.launch {
            audioRepository.startVoiceActivityDetection { audioData ->
                // Send audio to backend when voice detected
                webSocketRepository.sendAudio(audioData)
            }
        }
    }

    fun reconnect() {
        viewModelScope.launch {
            webSocketRepository.reconnect()
        }
    }

    fun toggleAdminMode() {
        _isAdminMode.value = !_isAdminMode.value
    }

    fun stopCurrentAction() {
        viewModelScope.launch {
            when (_currentState.value) {
                AppState.LISTENING -> audioRepository.stopRecording()
                AppState.SPEAKING -> {
                    audioRepository.stopPlayback()
                    webSocketRepository.sendMessage("stop_tts", emptyMap())
                }
                else -> {}
            }
            _currentState.value = AppState.IDLE
        }
    }

    private fun updateUIState(update: (UIState) -> UIState) {
        _uiState.value = update(_uiState.value)
    }

    override fun onCleared() {
        super.onCleared()
        viewModelScope.launch {
            audioRepository.cleanup()
            webSocketRepository.disconnect()
        }
    }
}

/**
 * WebSocketMessage - Data class for WebSocket messages
 */
data class WebSocketMessage(
    val type: String,
    val data: Any? = null
)
