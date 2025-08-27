package com.llmaudio.app.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.llmaudio.app.data.api.OpenAiService
import com.llmaudio.app.data.model.AdminUIState
import com.llmaudio.app.data.model.ConnectionState
import com.llmaudio.app.data.model.LogEntry
import com.llmaudio.app.data.model.MetricData
import com.llmaudio.app.data.model.MetricType
import com.llmaudio.app.data.model.WebSocketMessage
import com.llmaudio.app.data.repository.MetricsRepository
import com.llmaudio.app.data.repository.WebSocketRepository
import com.llmaudio.app.data.store.TtsQualityStore
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
    private val metricsRepository: MetricsRepository,
    private val openAiService: OpenAiService, // Added
    private val ttsQualityStore: TtsQualityStore // Added
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminUIState())
    val uiState: StateFlow<AdminUIState> = _uiState.asStateFlow()

    val metrics: StateFlow<Map<MetricType, MetricData>> = metricsRepository.metrics
    val logs: StateFlow<List<LogEntry>> = metricsRepository.logs
    val connectionState: StateFlow<ConnectionState> = webSocketRepository.connectionState

    // For ApiUsageTab
    private val _apiUsageData = MutableStateFlow<String?>(null)
    val apiUsageData: StateFlow<String?> = _apiUsageData.asStateFlow()

    private val _apiUsageError = MutableStateFlow<String?>(null)
    val apiUsageError: StateFlow<String?> = _apiUsageError.asStateFlow()

    // For VoicesTab
    val ttsQualityOptions: Map<String, String> = mapOf(
        "tts-1" to "TTS Standard",
        "tts-1-hd" to "TTS HD"
    )
    private val _selectedTtsQuality = MutableStateFlow("tts-1") // Default to standard
    val selectedTtsQuality: StateFlow<String> = _selectedTtsQuality.asStateFlow()


    private val dateFormatter = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.getDefault())

    init {
        observeWebSocketMessages()
        startPeriodicUpdates()
        loadInitialTtsQuality() // Added
    }

    private fun loadInitialTtsQuality() {
        viewModelScope.launch {
            // Ensure ttsQualityStore is initialized before collecting
            // This might require ttsQualityStore.selectedTtsModelFlow to be a non-suspending function
            // or to handle its initialization state if it can be null initially.
            // For now, assuming it returns a Flow that emits even if DataStore is not ready.
            ttsQualityStore.selectedTtsModelFlow.collect { quality ->
                _selectedTtsQuality.value = quality ?: "tts-1" // Default if null
            }
        }
    }

    fun fetchApiUsage() {
        viewModelScope.launch {
            _apiUsageData.value = "Cargando datos de uso..."
            _apiUsageError.value = null
            try {
                // Placeholder: Simulate API call
                // In a real implementation, you would call openAiService.getUsage()
                // and process the response.
                // This would also require proper API key handling for the getUsage call.
                delay(1500) // Simulate network delay
                // val usageResponse = openAiService.getUsageInfo("YOUR_API_KEY_HERE_OR_FROM_STORE", "2023-01-01") // Example call
                // _apiUsageData.value = formatUsageData(usageResponse) // Placeholder for formatting
                _apiUsageData.value = "Uso Total: 12345 tokens. Modelo A: 5000 tokens, Modelo B: 7345 tokens."
                // _apiUsageError.value = "Error simulado al obtener datos de uso." // Uncomment to test error case
            } catch (e: Exception) {
                // If the fetch fails, try to keep previous data if available, or set to a default message.
                if (_apiUsageData.value == "Cargando datos de uso...") { // only update if still loading
                    _apiUsageData.value = "No se pudieron cargar los datos de uso."
                }
                _apiUsageError.value = "Error al obtener datos de uso: ${e.message}"
                metricsRepository.addLog("error", "API_Usage", "Fallo al obtener datos de uso: ${e.message}")
            }
        }
    }

    fun updateSelectedTtsQuality(quality: String) {
        viewModelScope.launch {
            ttsQualityStore.setSelectedTtsModel(quality)
            // _selectedTtsQuality.value will be updated by the collector in loadInitialTtsQuality
            metricsRepository.addLog("info", "TTS_Quality", "Calidad TTS seleccionada: $quality")
        }
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
