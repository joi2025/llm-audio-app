package com.llmaudio.app.data.model

/**
 * Data models for AdminPro functionality
 * Migrated from android-native to android-elite architecture
 */

enum class ConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    RECONNECTING,
    ERROR
}

enum class MetricType(val displayName: String) {
    WS_CONNECT_MS("Conexión WS"),
    FIRST_TOKEN_MS("Primer Token"),
    TTS_START_MS("Inicio TTS"),
    ROUNDTRIP_MS("Roundtrip Total"),
    AUDIO_CHUNKS("Audio Chunks"),
    TTS_CANCELLED("TTS Cancelado"),
    LLM_FIRST_TOKEN("LLM First Token"),
    LLM_TOKENS("LLM Tokens"),
    FINAL_TRANSCRIPTS("Transcripciones"),
    INTERRUPTIONS("Interrupciones"),
    ERRORS("Errores"),
    RECONNECTIONS("Reconexiones")
}

data class MetricData(
    val count: Int = 0,
    val samples: List<Long> = emptyList(),
    val p50: Double = 0.0,
    val p95: Double = 0.0,
    val max: Double = 0.0,
    val average: Double = 0.0,
    val last: Double = 0.0
)

data class LogEntry(
    val id: String,
    val timestamp: String,
    val level: String,
    val source: String,
    val message: String,
    val data: Any? = null
)

// AdminUIState data class fue eliminada de aquí para evitar redeclaración.
// Su definición ahora reside en AdminUIState.kt

data class WebSocketMessage(
    val event: String,
    val data: Any? = null
)
