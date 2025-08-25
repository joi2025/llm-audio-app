package com.llmaudio.app.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject
import com.llmaudio.app.data.repository.ConsentRepository

data class ConsentUiState(
    val apiKey: String = "",
    val apiKeyError: String? = null,
    val voiceConsentGranted: Boolean = false,
    val dataConsentGranted: Boolean = false,
    val moderationConsentGranted: Boolean = false,
    val isLoading: Boolean = false,
    val consentComplete: Boolean = false
) {
    val canProceed: Boolean = apiKey.isNotBlank() && 
                             voiceConsentGranted && 
                             dataConsentGranted && 
                             moderationConsentGranted &&
                             apiKeyError == null
}

@HiltViewModel
class ConsentViewModel @Inject constructor(
    private val consentRepository: ConsentRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(ConsentUiState())
    val uiState: StateFlow<ConsentUiState> = _uiState.asStateFlow()
    
    fun updateApiKey(apiKey: String) {
        val error = when {
            apiKey.isBlank() -> "La clave API es requerida"
            !apiKey.startsWith("sk-") -> "La clave API debe comenzar con 'sk-'"
            apiKey.length < 20 -> "La clave API parece ser muy corta"
            else -> null
        }
        
        _uiState.value = _uiState.value.copy(
            apiKey = apiKey,
            apiKeyError = error
        )
    }
    
    fun updateVoiceConsent(granted: Boolean) {
        _uiState.value = _uiState.value.copy(voiceConsentGranted = granted)
    }
    
    fun updateDataConsent(granted: Boolean) {
        _uiState.value = _uiState.value.copy(dataConsentGranted = granted)
    }
    
    fun updateModerationConsent(granted: Boolean) {
        _uiState.value = _uiState.value.copy(moderationConsentGranted = granted)
    }
    
    fun saveConsent() {
        val currentState = _uiState.value
        if (!currentState.canProceed) return
        
        viewModelScope.launch {
            _uiState.value = currentState.copy(isLoading = true)
            
            try {
                consentRepository.saveConsent(
                    apiKey = currentState.apiKey,
                    voiceConsent = currentState.voiceConsentGranted,
                    dataConsent = currentState.dataConsentGranted,
                    moderationConsent = currentState.moderationConsentGranted
                )
                
                _uiState.value = currentState.copy(
                    isLoading = false,
                    consentComplete = true
                )
            } catch (e: Exception) {
                _uiState.value = currentState.copy(
                    isLoading = false,
                    apiKeyError = "Error guardando configuración: ${e.message}"
                )
            }
        }
    }
}
