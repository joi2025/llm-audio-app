package com.joi2025.llmaudioapp.data.model

/**
 * MetricType - Enum for different types of metrics tracked
 */
enum class MetricType(val displayName: String) {
    // Latency metrics (milliseconds)
    WS_CONNECT_MS("WS Connect"),
    FIRST_TOKEN_MS("First Token"),
    TTS_START_MS("TTS Start"),
    ROUNDTRIP_MS("Roundtrip"),
    
    // Event counters
    AUDIO_CHUNKS("Audio Chunks"),
    TTS_CANCELLED("TTS Cancelled"),
    LLM_FIRST_TOKEN("LLM First Token"),
    LLM_TOKENS("LLM Tokens"),
    FINAL_TRANSCRIPTS("Final Transcripts"),
    INTERRUPTIONS("Interruptions"),
    RECONNECTIONS("Reconnections"),
    ERRORS("Errors")
}

/**
 * MetricData - Container for metric samples and calculated statistics
 */
data class MetricData(
    val samples: List<Long> = emptyList(),
    val p50: Long = 0,
    val p95: Long = 0,
    val max: Long = 0,
    val last: Long = 0,
    val count: Int = 0
)

/**
 * LogEntry - Structure for log entries with filtering support
 */
data class LogEntry(
    val id: String,
    val timestamp: String,
    val level: String, // debug, info, warn, error
    val source: String, // websocket, audio, llm, stt, tts
    val message: String,
    val data: Any? = null
)

/**
 * AdminUIState - UI state for admin panel
 */
data class AdminUIState(
    val isConnected: Boolean = false,
    val micPermissionGranted: Boolean = false,
    val hasErrors: Boolean = false,
    val errorMessage: String? = null,
    val isLoading: Boolean = false
)
