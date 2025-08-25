package com.llmaudio.app.domain.model

/**
 * Voice pipeline states for UI representation
 */
sealed class VoiceState {
    object Idle : VoiceState()
    object Listening : VoiceState()
    object Processing : VoiceState()
    object Speaking : VoiceState()
    data class Error(val message: String) : VoiceState()
}
