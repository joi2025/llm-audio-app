package com.llmaudio.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.llmaudio.app.data.model.*
import com.llmaudio.app.presentation.viewmodel.AdminProViewModel

/**
 * AdminProScreen - Elite implementation of advanced admin panel
 * Migrated from android-native to android-elite architecture
 * Real-time metrics, logs, and system monitoring with native performance
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminProScreen(
    modifier: Modifier = Modifier,
    onBackClick: () -> Unit,
    viewModel: AdminProViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val metrics by viewModel.metrics.collectAsState()
    val logs by viewModel.logs.collectAsState()
    val connectionState by viewModel.connectionState.collectAsState()
    
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Salud", "Latencia", "Pipeline", "Logs", "Dispositivo")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
    ) {
        // Top Bar
        TopAppBar(
            title = { 
                Text(
                    "Admin Pro", 
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                ) 
            },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Text("←", color = Color.White, fontSize = 20.sp)
                }
            },
            actions = {
                // Connection status indicator
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(end = 16.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(
                                when (connectionState) {
                                    ConnectionState.CONNECTED -> Color(0xFF10B981)
                                    ConnectionState.CONNECTING, ConnectionState.RECONNECTING -> Color(0xFFF59E0B)
                                    else -> Color(0xFFEF4444)
                                }
                            )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = when (connectionState) {
                            ConnectionState.CONNECTED -> "Conectado"
                            ConnectionState.CONNECTING -> "Conectando"
                            ConnectionState.RECONNECTING -> "Reconectando"
                            else -> "Desconectado"
                        },
                        color = Color.White,
                        fontSize = 12.sp
                    )
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = Color(0xFF1E293B)
            )
        )
        
        // Tab Row
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = Color(0xFF1E293B),
            contentColor = Color.White
        ) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = { Text(title) }
                )
            }
        }
        
        // Tab Content
        when (selectedTab) {
            0 -> HealthTab(connectionState, metrics, uiState, viewModel)
            1 -> LatencyTab(metrics)
            2 -> PipelineTab(metrics)
            3 -> LogsTab(logs, viewModel)
            4 -> DeviceTab()
        }
    }
}

@Composable
private fun HealthTab(
    connectionState: ConnectionState,
    metrics: Map<MetricType, MetricData>,
    uiState: AdminUIState,
    viewModel: AdminProViewModel
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                HealthCard(
                    title = "WebSocket",
                    status = when (connectionState) {
                        ConnectionState.CONNECTED -> "Conectado"
                        ConnectionState.CONNECTING -> "Conectando"
                        ConnectionState.RECONNECTING -> "Reconectando"
                        else -> "Desconectado"
                    },
                    isHealthy = connectionState == ConnectionState.CONNECTED,
                    onClick = {
                        if (connectionState == ConnectionState.CONNECTED) {
                            viewModel.disconnectWebSocket()
                        } else {
                            viewModel.connectWebSocket()
                        }
                    },
                    modifier = Modifier.weight(1f)
                )
                
                HealthCard(
                    title = "Audio",
                    status = if (uiState.micPermissionGranted) "Permisos OK" else "Sin permisos",
                    isHealthy = uiState.micPermissionGranted,
                    onClick = { /* Handle permission request */ },
                    modifier = Modifier.weight(1f)
                )
            }
        }
        
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                HealthCard(
                    title = "Errores",
                    status = "${metrics[MetricType.ERRORS]?.count ?: 0}",
                    isHealthy = (metrics[MetricType.ERRORS]?.count ?: 0) == 0,
                    onClick = { /* Show error details */ },
                    modifier = Modifier.weight(1f)
                )
                
                HealthCard(
                    title = "Reconexiones",
                    status = "${metrics[MetricType.RECONNECTIONS]?.count ?: 0}",
                    isHealthy = (metrics[MetricType.RECONNECTIONS]?.count ?: 0) < 3,
                    onClick = { /* Show reconnection history */ },
                    modifier = Modifier.weight(1f)
                )
            }
        }
        
        item {
            // Performance Summary Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        "Resumen de Performance",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    val firstTokenLatency = metrics[MetricType.FIRST_TOKEN_MS]
                    val roundtripLatency = metrics[MetricType.ROUNDTRIP_MS]
                    
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("Primer Token (P50)", color = Color.Gray, fontSize = 12.sp)
                            Text(
                                "${firstTokenLatency?.p50?.toInt() ?: 0}ms",
                                color = Color.White,
                                fontWeight = FontWeight.Medium
                            )
                        }
                        Column {
                            Text("Roundtrip (P95)", color = Color.Gray, fontSize = 12.sp)
                            Text(
                                "${roundtripLatency?.p95?.toInt() ?: 0}ms",
                                color = Color.White,
                                fontWeight = FontWeight.Medium
                            )
                        }
                        Column {
                            Text("Interrupciones", color = Color.Gray, fontSize = 12.sp)
                            Text(
                                "${metrics[MetricType.INTERRUPTIONS]?.count ?: 0}",
                                color = Color.White,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LatencyTab(metrics: Map<MetricType, MetricData>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(
            listOf(
                MetricType.WS_CONNECT_MS,
                MetricType.FIRST_TOKEN_MS,
                MetricType.TTS_START_MS,
                MetricType.ROUNDTRIP_MS
            )
        ) { metricType ->
            val data = metrics[metricType]
            MetricCard(
                title = metricType.displayName,
                data = data,
                modifier = Modifier.fillMaxWidth()
            )
        }
        
        item {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                "Gráfica de Latencia (últimos 50 samples)",
                color = Color.White,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(8.dp))
            
            // Simple latency chart placeholder
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
            ) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "Gráfica de latencia\n(Implementación pendiente)",
                        color = Color.Gray,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                }
            }
        }
    }
}

@Composable
private fun PipelineTab(metrics: Map<MetricType, MetricData>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                "Contadores de Eventos",
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
        }
        
        items(
            listOf(
                MetricType.AUDIO_CHUNKS,
                MetricType.TTS_CANCELLED,
                MetricType.LLM_FIRST_TOKEN,
                MetricType.LLM_TOKENS,
                MetricType.FINAL_TRANSCRIPTS,
                MetricType.INTERRUPTIONS
            ).chunked(2)
        ) { rowMetrics ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                rowMetrics.forEach { metricType ->
                    EventCountCard(
                        title = metricType.displayName,
                        count = metrics[metricType]?.count ?: 0,
                        modifier = Modifier.weight(1f)
                    )
                }
                if (rowMetrics.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun LogsTab(
    logs: List<LogEntry>,
    viewModel: AdminProViewModel
) {
    var filterText by remember { mutableStateOf("") }
    var selectedLevel by remember { mutableStateOf("all") }
    
    Column(modifier = Modifier.fillMaxSize()) {
        // Filter controls
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = filterText,
                    onValueChange = { filterText = it },
                    label = { Text("Filtrar") },
                    modifier = Modifier.weight(1f),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    )
                )
                
                Button(
                    onClick = { viewModel.clearLogs() },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) {
                    Text("Limpiar")
                }
            }
        }
        
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            val filteredLogs = logs.filter { log ->
                val matchesFilter = filterText.isEmpty() || 
                    log.message.contains(filterText, ignoreCase = true) ||
                    log.source.contains(filterText, ignoreCase = true)
                val matchesLevel = selectedLevel == "all" || log.level == selectedLevel
                matchesFilter && matchesLevel
            }
            
            items(filteredLogs) { log ->
                LogEntryCard(log = log)
            }
            
            if (filteredLogs.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "No hay logs que mostrar",
                            color = Color.Gray
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DeviceTab() {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            DeviceInfoCard(
                title = "Sistema",
                info = mapOf(
                    "Android" to "${android.os.Build.VERSION.RELEASE} (API ${android.os.Build.VERSION.SDK_INT})",
                    "Dispositivo" to "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}",
                    "Arquitectura" to android.os.Build.SUPPORTED_ABIS.firstOrNull() ?: "Unknown"
                )
            )
        }
        
        item {
            DeviceInfoCard(
                title = "Memoria",
                info = mapOf(
                    "RAM Total" to "${Runtime.getRuntime().totalMemory() / 1024 / 1024} MB",
                    "RAM Libre" to "${Runtime.getRuntime().freeMemory() / 1024 / 1024} MB",
                    "RAM Usada" to "${(Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()) / 1024 / 1024} MB"
                )
            )
        }
        
        item {
            DeviceInfoCard(
                title = "Aplicación",
                info = mapOf(
                    "Versión" to "1.0.0 Elite",
                    "Build" to "Debug",
                    "Arquitectura" to "Elite MVVM + Hilt"
                )
            )
        }
    }
}

// Helper Composables
@Composable
private fun HealthCard(
    title: String,
    status: String,
    isHealthy: Boolean,
    onClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        onClick = onClick
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = title,
                color = Color.White,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = status,
                color = if (isHealthy) Color(0xFF10B981) else Color(0xFFEF4444),
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun MetricCard(
    title: String,
    data: MetricData?,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(title, color = Color.White, fontWeight = FontWeight.Medium)
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("P50", color = Color.Gray, fontSize = 12.sp)
                    Text("${data?.p50?.toInt() ?: 0}ms", color = Color.White)
                }
                Column {
                    Text("P95", color = Color.Gray, fontSize = 12.sp)
                    Text("${data?.p95?.toInt() ?: 0}ms", color = Color.White)
                }
                Column {
                    Text("Avg", color = Color.Gray, fontSize = 12.sp)
                    Text("${data?.average?.toInt() ?: 0}ms", color = Color.White)
                }
            }
        }
    }
}

@Composable
private fun EventCountCard(
    title: String,
    count: Int,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = count.toString(),
                color = Color(0xFF3B82F6),
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = title,
                color = Color.Gray,
                fontSize = 12.sp
            )
        }
    }
}

@Composable
private fun LogEntryCard(log: LogEntry) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A))
    ) {
        Row(
            modifier = Modifier.padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = log.timestamp.substring(11, 19), // HH:mm:ss
                color = Color.Gray,
                fontSize = 10.sp,
                modifier = Modifier.width(60.dp)
            )
            
            Text(
                text = log.level.uppercase(),
                color = when (log.level) {
                    "error" -> Color(0xFFEF4444)
                    "warn" -> Color(0xFFF59E0B)
                    "info" -> Color(0xFF3B82F6)
                    else -> Color.Gray
                },
                fontSize = 10.sp,
                modifier = Modifier.width(50.dp)
            )
            
            Text(
                text = log.source,
                color = Color(0xFF10B981),
                fontSize = 10.sp,
                modifier = Modifier.width(80.dp)
            )
            
            Text(
                text = log.message,
                color = Color.White,
                fontSize = 12.sp,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun DeviceInfoCard(
    title: String,
    info: Map<String, String>
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = title,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp
            )
            Spacer(modifier = Modifier.height(12.dp))
            
            info.forEach { (key, value) ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = key,
                        color = Color.Gray,
                        fontSize = 14.sp
                    )
                    Text(
                        text = value,
                        color = Color.White,
                        fontSize = 14.sp
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
            }
        }
    }
}
