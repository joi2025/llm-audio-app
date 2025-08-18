package com.joi2025.llmaudioapp.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject
import com.joi2025.llmaudioapp.data.model.*
import com.joi2025.llmaudioapp.data.repository.MetricsRepository
import com.joi2025.llmaudioapp.data.repository.WebSocketRepository
import kotlin.math.*

/**
 * AdminProViewModel - Manages admin panel state and real-time metrics
 * Collects and processes metrics for p50/p95 calculations and log management
 */
@HiltViewModel
class AdminProViewModel @Inject constructor(
    private val metricsRepository: MetricsRepository,
    private val webSocketRepository: WebSocketRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminUIState())
    val uiState: StateFlow<AdminUIState> = _uiState.asStateFlow()

    private val _metrics = MutableStateFlow<Map<MetricType, MetricData>>(emptyMap())
    val metrics: StateFlow<Map<MetricType, MetricData>> = _metrics.asStateFlow()

    private val _logs = MutableStateFlow<List<LogEntry>>(emptyList())
    val logs: StateFlow<List<LogEntry>> = _logs.asStateFlow()

    val connectionState = webSocketRepository.connectionState

    init {
        observeMetrics()
        observeLogs()
        observeWebSocketEvents()
    }

    private fun observeMetrics() {
        viewModelScope.launch {
            metricsRepository.metrics.collect { metricsMap ->
                _metrics.value = metricsMap
            }
        }
    }

    private fun observeLogs() {
        viewModelScope.launch {
            metricsRepository.logs.collect { logsList ->
                _logs.value = logsList
            }
        }
    }

    private fun observeWebSocketEvents() {
        viewModelScope.launch {
            webSocketRepository.messages.collect { message ->
                handleWebSocketMessage(message)
            }
        }

        viewModelScope.launch {
            webSocketRepository.connectionState.collect { state ->
                updateUIState { it.copy(isConnected = state == ConnectionState.CONNECTED) }
            }
        }
    }

    private fun handleWebSocketMessage(message: com.joi2025.llmaudioapp.viewmodel.WebSocketMessage) {
        when (message.type) {
            "llm_first_token" -> {
                metricsRepository.incrementCounter(MetricType.LLM_FIRST_TOKEN)
                metricsRepository.addLog("debug", "llm", "First token received")
            }
            "llm_token" -> {
                metricsRepository.incrementCounter(MetricType.LLM_TOKENS)
            }
            "audio_chunk" -> {
                metricsRepository.incrementCounter(MetricType.AUDIO_CHUNKS)
            }
            "tts_cancelled" -> {
                metricsRepository.incrementCounter(MetricType.TTS_CANCELLED)
                metricsRepository.incrementCounter(MetricType.INTERRUPTIONS)
                metricsRepository.addLog("debug", "tts", "TTS cancelled (interruption)")
            }
            "final_transcript" -> {
                metricsRepository.incrementCounter(MetricType.FINAL_TRANSCRIPTS)
                val transcript = (message.data as? Map<*, *>)?.get("text")?.toString() ?: ""
                metricsRepository.addLog("debug", "stt", "Transcript: $transcript")
            }
            "connected" -> {
                metricsRepository.incrementCounter(MetricType.RECONNECTIONS)
                metricsRepository.addLog("info", "websocket", "Connected to backend")
            }
            "error" -> {
                metricsRepository.incrementCounter(MetricType.ERRORS)
                val errorMsg = message.data?.toString() ?: "Unknown error"
                metricsRepository.addLog("error", "websocket", "Connection error: $errorMsg")
                updateUIState { it.copy(hasErrors = true, errorMessage = errorMsg) }
            }
        }
    }

    fun clearLogs() {
        metricsRepository.clearLogs()
    }

    fun clearMetrics() {
        metricsRepository.clearMetrics()
    }

    fun exportLogs(): String {
        val logEntries = _logs.value
        return logEntries.joinToString("\n") { log ->
            "${log.timestamp},${log.level},${log.source},\"${log.message}\""
        }
    }

    private fun updateUIState(update: (AdminUIState) -> AdminUIState) {
        _uiState.value = update(_uiState.value)
    }
}
