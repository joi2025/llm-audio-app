package com.joi2025.llmaudioapp.data.model

/**
 * AppState - Represents the current state of the voice assistant
 * Maps directly to the states from VoiceCircleV2_Final.jsx
 */
enum class AppState {
    IDLE,       // Waiting for user input, breathing animation
    LISTENING,  // Recording audio, reactive waves
    PROCESSING, // LLM processing, shimmer rotation
    SPEAKING    // TTS playback, rhythmic pulse
}

/**
 * ConnectionState - WebSocket connection status
 */
enum class ConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    RECONNECTING,
    ERROR
}

/**
 * AudioState - Audio system status
 */
data class AudioState(
    val isRecording: Boolean = false,
    val isPlaying: Boolean = false,
    val audioLevel: Float = 0f,
    val hasPermission: Boolean = false
)

/**
 * UIState - Overall UI state container
 */
data class UIState(
    val appState: AppState = AppState.IDLE,
    val connectionState: ConnectionState = ConnectionState.DISCONNECTED,
    val audioState: AudioState = AudioState(),
    val isAdminMode: Boolean = false,
    val micPermissionGranted: Boolean = false,
    val hasErrors: Boolean = false,
    val errorMessage: String? = null
)
