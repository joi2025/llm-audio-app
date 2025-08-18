package com.joi2025.llmaudioapp.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.joi2025.llmaudioapp.data.model.MetricData
import kotlin.math.*

/**
 * MetricCard - Displays latency metrics with p50/p95/max values
 */
@Composable
fun MetricCard(
    title: String,
    data: MetricData?,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1E293B)
        )
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
            
            if (data != null && data.samples.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    MetricValue(
                        label = "p50",
                        value = formatLatency(data.p50),
                        color = Color(0xFF10B981)
                    )
                    MetricValue(
                        label = "p95",
                        value = formatLatency(data.p95),
                        color = Color(0xFFF59E0B)
                    )
                    MetricValue(
                        label = "max",
                        value = formatLatency(data.max),
                        color = Color(0xFFEF4444)
                    )
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Última: ${formatLatency(data.last)}",
                        color = Color.Gray,
                        fontSize = 12.sp
                    )
                    Text(
                        text = "Muestras: ${data.samples.size}",
                        color = Color.Gray,
                        fontSize = 12.sp
                    )
                }
            } else {
                Text(
                    text = "Sin datos",
                    color = Color.Gray,
                    fontSize = 14.sp
                )
            }
        }
    }
}

@Composable
private fun MetricValue(
    label: String,
    value: String,
    color: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = label,
            color = Color.Gray,
            fontSize = 12.sp
        )
        Text(
            text = value,
            color = color,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp
        )
    }
}

/**
 * LatencyChart - Real-time line chart for latency visualization
 */
@Composable
fun LatencyChart(
    data: List<Long>,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1E293B)
        )
    ) {
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            if (data.isEmpty()) {
                drawEmptyChart()
                return@Canvas
            }
            
            val maxValue = data.maxOrNull()?.toFloat() ?: 1f
            val minValue = data.minOrNull()?.toFloat() ?: 0f
            val range = maxValue - minValue
            
            if (range == 0f) {
                drawFlatLine(size.height / 2f)
                return@Canvas
            }
            
            val stepX = size.width / (data.size - 1).coerceAtLeast(1)
            val points = data.mapIndexed { index, value ->
                val x = index * stepX
                val normalizedValue = (value - minValue) / range
                val y = size.height - (normalizedValue * size.height * 0.8f) - size.height * 0.1f
                Offset(x, y)
            }
            
            // Draw grid lines
            drawGrid()
            
            // Draw line chart
            drawLatencyLine(points)
            
            // Draw points
            points.forEach { point ->
                drawCircle(
                    color = Color(0xFF3B82F6),
                    radius = 3.dp.toPx(),
                    center = point
                )
            }
        }
    }
}

private fun DrawScope.drawEmptyChart() {
    drawRect(
        color = Color.Gray.copy(alpha = 0.3f),
        size = size
    )
    // Could add "No data" text here if needed
}

private fun DrawScope.drawFlatLine(y: Float) {
    drawLine(
        color = Color(0xFF3B82F6),
        start = Offset(0f, y),
        end = Offset(size.width, y),
        strokeWidth = 2.dp.toPx()
    )
}

private fun DrawScope.drawGrid() {
    val gridColor = Color.Gray.copy(alpha = 0.2f)
    val strokeWidth = 1.dp.toPx()
    
    // Horizontal grid lines
    for (i in 1..4) {
        val y = size.height * i / 5f
        drawLine(
            color = gridColor,
            start = Offset(0f, y),
            end = Offset(size.width, y),
            strokeWidth = strokeWidth
        )
    }
    
    // Vertical grid lines
    for (i in 1..4) {
        val x = size.width * i / 5f
        drawLine(
            color = gridColor,
            start = Offset(x, 0f),
            end = Offset(x, size.height),
            strokeWidth = strokeWidth
        )
    }
}

private fun DrawScope.drawLatencyLine(points: List<Offset>) {
    if (points.size < 2) return
    
    val path = Path().apply {
        moveTo(points.first().x, points.first().y)
        for (i in 1 until points.size) {
            lineTo(points[i].x, points[i].y)
        }
    }
    
    drawPath(
        path = path,
        color = Color(0xFF3B82F6),
        style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2.dp.toPx())
    )
}

/**
 * LogFilterBar - Filter controls for log entries
 */
@Composable
fun LogFilterBar(
    filterText: String,
    onFilterTextChange: (String) -> Unit,
    selectedLevel: String,
    onLevelChange: (String) -> Unit,
    onClearLogs: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        OutlinedTextField(
            value = filterText,
            onValueChange = onFilterTextChange,
            placeholder = { Text("Filtrar logs...", color = Color.Gray) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedBorderColor = Color(0xFF3B82F6),
                unfocusedBorderColor = Color.Gray
            ),
            modifier = Modifier.weight(1f)
        )
        
        var expanded by remember { mutableStateOf(false) }
        
        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { expanded = !expanded }
        ) {
            OutlinedTextField(
                value = selectedLevel.replaceFirstChar { it.uppercase() },
                onValueChange = {},
                readOnly = true,
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedBorderColor = Color(0xFF3B82F6),
                    unfocusedBorderColor = Color.Gray
                ),
                modifier = Modifier
                    .menuAnchor()
                    .width(100.dp)
            )
            
            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                listOf("all", "debug", "info", "warn", "error").forEach { level ->
                    DropdownMenuItem(
                        text = { Text(level.replaceFirstChar { it.uppercase() }) },
                        onClick = {
                            onLevelChange(level)
                            expanded = false
                        }
                    )
                }
            }
        }
        
        Button(
            onClick = onClearLogs,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFFEF4444)
            )
        ) {
            Text("Limpiar")
        }
    }
}

private fun formatLatency(ms: Long): String {
    return when {
        ms < 1000 -> "${ms}ms"
        ms < 60000 -> "${(ms / 1000.0).format(1)}s"
        else -> "${(ms / 60000.0).format(1)}m"
    }
}

private fun Double.format(decimals: Int): String {
    return "%.${decimals}f".format(this)
}
