package com.llmaudio.app.data.repository

import kotlinx.coroutines.flow.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton
import com.llmaudio.app.data.model.*
import kotlin.math.*

/**
 * MetricsRepository - Native metrics collection and processing for android-elite
 * Migrated from android-native with enhanced Hilt DI integration
 * Handles real-time p50/p95 calculations and circular log buffer
 */
@Singleton
class MetricsRepository @Inject constructor() {
    
    private val scope = CoroutineScope(Dispatchers.IO)
    
    private val _metrics = MutableStateFlow<Map<MetricType, MetricData>>(
        MetricType.values().associateWith { MetricData() }
    )
    val metrics: StateFlow<Map<MetricType, MetricData>> = _metrics.asStateFlow()
    
    private val _logs = MutableStateFlow<List<LogEntry>>(emptyList())
    val logs: StateFlow<List<LogEntry>> = _logs.asStateFlow()
    
    private val maxSamples = 100
    private val maxLogs = 500
    
    fun addLatency(type: MetricType, value: Long) {
        scope.launch {
            val currentMetrics = _metrics.value.toMutableMap()
            val currentData = currentMetrics[type] ?: MetricData()
            
            val newSamples = (currentData.samples + value).takeLast(maxSamples)
            val newStats = calculatePercentiles(newSamples)
            
            currentMetrics[type] = currentData.copy(
                samples = newSamples,
                p50 = newStats.p50.toDouble(),
                p95 = newStats.p95.toDouble(),
                max = newStats.max.toDouble(),
                average = newSamples.average(),
                last = value.toDouble(),
                count = currentData.count + 1
            )
            
            _metrics.value = currentMetrics
        }
    }
    
    fun incrementCounter(type: MetricType) {
        scope.launch {
            val currentMetrics = _metrics.value.toMutableMap()
            val currentData = currentMetrics[type] ?: MetricData()
            
            currentMetrics[type] = currentData.copy(
                count = currentData.count + 1
            )
            
            _metrics.value = currentMetrics
        }
    }
    
    fun addLog(level: String, source: String, message: String, data: Any? = null) {
        scope.launch {
            val newLog = LogEntry(
                id = System.currentTimeMillis().toString() + kotlin.random.Random.nextInt(1000),
                timestamp = java.time.Instant.now().toString(),
                level = level,
                source = source,
                message = message,
                data = data
            )
            
            val currentLogs = _logs.value
            _logs.value = (listOf(newLog) + currentLogs).take(maxLogs)
        }
    }
    
    private fun calculatePercentiles(samples: List<Long>): PercentileStats {
        if (samples.isEmpty()) return PercentileStats(0, 0, 0)
        
        val sorted = samples.sorted()
        val p50 = sorted[min((sorted.size * 0.5).toInt(), sorted.size - 1)]
        val p95 = sorted[min((sorted.size * 0.95).toInt(), sorted.size - 1)]
        val max = sorted.last()
        
        return PercentileStats(p50, p95, max)
    }
    
    fun clearLogs() {
        scope.launch {
            _logs.value = emptyList()
        }
    }
    
    fun clearMetrics() {
        scope.launch {
            _metrics.value = MetricType.values().associateWith { MetricData() }
        }
    }
    
    // Timer management for latency tracking
    private val timers = mutableMapOf<String, Long>()
    
    fun startTimer(key: String) {
        timers[key] = System.currentTimeMillis()
    }
    
    fun endTimer(key: String, metricType: MetricType): Long {
        val startTime = timers.remove(key) ?: return 0
        val duration = System.currentTimeMillis() - startTime
        addLatency(metricType, duration)
        return duration
    }
    
    // Simulate real-time metrics for demo purposes
    fun simulateMetrics() {
        scope.launch {
            // Simulate some latency data
            addLatency(MetricType.WS_CONNECT_MS, (50..200).random().toLong())
            addLatency(MetricType.FIRST_TOKEN_MS, (300..800).random().toLong())
            addLatency(MetricType.TTS_START_MS, (100..300).random().toLong())
            addLatency(MetricType.ROUNDTRIP_MS, (500..1500).random().toLong())
            
            // Simulate some counters
            incrementCounter(MetricType.AUDIO_CHUNKS)
            incrementCounter(MetricType.LLM_TOKENS)
            incrementCounter(MetricType.FINAL_TRANSCRIPTS)
            
            // Add some logs
            val logLevels = listOf("info", "warn", "error")
            val sources = listOf("WebSocket", "AudioPipeline", "TTS", "LLM")
            val messages = listOf(
                "Connection established successfully",
                "Audio chunk processed",
                "TTS synthesis completed",
                "Token received from LLM",
                "Warning: High latency detected",
                "Error: Connection timeout"
            )
            
            addLog(
                level = logLevels.random(),
                source = sources.random(),
                message = messages.random()
            )
        }
    }
}

data class PercentileStats(
    val p50: Long,
    val p95: Long,
    val max: Long
)
