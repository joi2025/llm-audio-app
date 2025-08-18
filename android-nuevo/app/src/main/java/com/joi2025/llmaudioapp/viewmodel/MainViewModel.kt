package com.joi2025.llmaudioapp.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * MainViewModel - MVVM pattern para gestión de estado
 * Maneja audio, websocket y UI state
 */
@HiltViewModel
class MainViewModel @Inject constructor() : ViewModel() {
    
    // UI State
    private val _uiState = MutableStateFlow(UIState())
    val uiState: StateFlow<UIState> = _uiState.asStateFlow()
    
    // Connection State
    private val _connectionState = MutableStateFlow(ConnectionState())
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()
    
    // Audio State
    private val _audioState = MutableStateFlow(AudioState())
    val audioState: StateFlow<AudioState> = _audioState.asStateFlow()
    
    init {
        // Inicializar conexión al backend
        initializeConnection()
    }
    
    private fun initializeConnection() {
        viewModelScope.launch {
            try {
                // TODO: Implementar WebSocketRepository
                _connectionState.value = _connectionState.value.copy(
                    isConnected = true,
                    isConnecting = false
                )
            } catch (e: Exception) {
                _connectionState.value = _connectionState.value.copy(
                    isConnected = false,
                    isConnecting = false,
                    error = e.message
                )
            }
        }
    }
    
    fun toggleAdminMode() {
        _uiState.value = _uiState.value.copy(
            isAdminMode = !_uiState.value.isAdminMode
        )
    }
    
    fun startListening() {
        _audioState.value = _audioState.value.copy(isRecording = true)
        // TODO: Implementar AudioRepository
    }
    
    fun stopListening() {
        _audioState.value = _audioState.value.copy(isRecording = false)
        // TODO: Implementar AudioRepository
    }
    
    override fun onCleared() {
        super.onCleared()
        // Cleanup resources
    }
}

// Data classes para estados
data class UIState(
    val isAdminMode: Boolean = false,
    val isProcessing: Boolean = false,
    val currentMessage: String = ""
)

data class ConnectionState(
    val isConnected: Boolean = false,
    val isConnecting: Boolean = true,
    val error: String? = null
)

data class AudioState(
    val isRecording: Boolean = false,
    val isPlaying: Boolean = false,
    val audioLevel: Float = 0.0f
)
