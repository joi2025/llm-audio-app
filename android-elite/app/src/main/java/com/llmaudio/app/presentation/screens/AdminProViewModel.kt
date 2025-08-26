package com.llmaudio.app.presentation.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.llmaudio.app.data.model.LogEntry // Changed import
import com.llmaudio.app.data.repository.MetricsRepository
import com.llmaudio.app.model.MetricItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map // Added import for map operator
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

// Definición de ConnectionState
enum class ConnectionState {
    DISCONNECTED, CONNECTING, CONNECTED, ERROR
}

@HiltViewModel
class AdminProViewModel @Inject constructor(
    private val metricsRepository: MetricsRepository
) : ViewModel() {

    // El connectionState ahora reflejará un estado local/simulado.
    // Para una app real, aquí se podría verificar la conectividad a internet
    // o la validez/existencia de la API Key de OpenAI.
    // Por ahora, lo dejamos como CONECTADO si la app está en un estado funcional básico.
    private val _connectionState = MutableStateFlow(ConnectionState.CONNECTED) // Usando la alternativa local
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()


    val metrics: StateFlow<List<MetricItem>> = metricsRepository.metrics
        .map { metricsMap -> // Transform the map to a list
            metricsMap.map { (type, data) -> MetricItem(type, data) }
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val logs: StateFlow<List<LogEntry>> = metricsRepository.logs
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun clearMetrics() {
        metricsRepository.clearMetrics()
    }

    fun clearLogs() {
        metricsRepository.clearLogs()
    }
}

// Nota: Asumí que podrías añadir un Flow<ConnectionState> en MetricsRepository
// que refleje la conectividad y validez de la API Key. Si no, puedes usar:
// import kotlinx.coroutines.flow.MutableStateFlow
// import kotlinx.coroutines.flow.asStateFlow
// private val _connectionState = MutableStateFlow(ConnectionState.CONNECTED)
// val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()
// Y luego en el init o una función específica, verificar la conectividad/API key.
