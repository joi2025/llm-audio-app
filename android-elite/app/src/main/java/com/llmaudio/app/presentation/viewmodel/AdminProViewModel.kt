package com.llmaudio.app.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.llmaudio.app.data.model.AdminUIState
import com.llmaudio.app.data.model.ConnectionState
import com.llmaudio.app.data.model.LogEntry
import com.llmaudio.app.data.model.MetricData
import com.llmaudio.app.data.model.MetricType
import com.llmaudio.app.data.model.WebSocketMessage
import com.llmaudio.app.data.repository.MetricsRepository
import com.llmaudio.app.data.repository.WebSocketRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject 

/**
 * AdminProViewModel - MVVM ViewModel for AdminPro functionality
 * Adapted from android-native to android-elite architecture with Hilt DI
 */
@HiltViewModel
class AdminProViewModel @Inject constructor(
    private val webSocketRepository: WebSocketRepository,
    private val metricsRepository: MetricsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminUIState())
    val uiState: StateFlow<AdminUIState> = _uiState.asStateFlow()

    val metrics: StateFlow<Map<MetricType, MetricData>> = metricsRepository.metrics
    val logs: StateFlow<List<LogEntry>> = metricsRepository.logs
    val connectionState: StateFlow<ConnectionState> = webSocketRepository.connectionState

    private val dateFormatter = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.getDefault())

    init {
        observeWebSocketMessages()
        startPeriodicUpdates()
    }

    private fun observeWebSocketMessages() {
        viewModelScope.launch {
            webSocketRepository.messages.collect { message ->
                handleWebSocketMessage(message)
            }
        }
    }

    private fun handleWebSocketMessage(message: WebSocketMessage) {
        when (message.event) {
            "connected" -> {
                metricsRepository.addLog("info", "WebSocket", "Conectado al backend")
            }
            "error" -> {
                metricsRepository.addLog("error", "WebSocket", message.data?.toString() ?: "Error desconocido")
                metricsRepository.incrementCounter(MetricType.ERRORS)
            }
            "llm_first_token" -> {
                metricsRepository.addLog("info", "LLM", "Primer token recibido")
                metricsRepository.incrementCounter(MetricType.LLM_FIRST_TOKEN)
                // Extract latency if available
                (message.data as? Map<*, *>)?.get("latency_ms")?.let { latency ->
                    metricsRepository.addLatency(MetricType.FIRST_TOKEN_MS, (latency as? Number)?.toLong() ?: 0L)
                }
            }
            "llm_token" -> {
                metricsRepository.incrementCounter(MetricType.LLM_TOKENS)
            }
            "audio_chunk" -> {
                metricsRepository.incrementCounter(MetricType.AUDIO_CHUNKS)
            }
            "tts_cancelled" -> {
                metricsRepository.addLog("info", "TTS", "TTS cancelado por interrupción")
                metricsRepository.incrementCounter(MetricType.TTS_CANCELLED)
            }
            "final_transcript" -> {
                metricsRepository.addLog("info", "STT", "Transcripción final recibida")
                metricsRepository.incrementCounter(MetricType.FINAL_TRANSCRIPTS)
            }
            "interruption" -> {
                metricsRepository.addLog("warn", "VAD", "Interrupción detectada")
                metricsRepository.incrementCounter(MetricType.INTERRUPTIONS)
            }
        }
    }

    private fun startPeriodicUpdates() {
        viewModelScope.launch {
            while (true) {
                delay(5000) // Update every 5 seconds
                
                // Simulate some metrics for demo purposes
                if (connectionState.value == ConnectionState.CONNECTED) {
                    metricsRepository.simulateMetrics()
                }
            }
        }
    }

    fun clearLogs() {
        metricsRepository.clearLogs()
        metricsRepository.addLog("info", "Admin", "Logs limpiados")
    }

    fun updateMicPermission(granted: Boolean) {
        _uiState.value = _uiState.value.copy(micPermissionGranted = granted)
        metricsRepository.addLog("info", "Permissions", if (granted) "Permisos de micrófono concedidos" else "Permisos de micrófono denegados")
    }

    fun connectWebSocket() {
        webSocketRepository.connect()
        metricsRepository.addLog("info", "WebSocket", "Iniciando conexión...")
    }

    fun disconnectWebSocket() {
        webSocketRepository.disconnect()
        metricsRepository.addLog("info", "WebSocket", "Desconectando...")
    }
}
