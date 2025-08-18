package com.joi2025.llmaudioapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.joi2025.llmaudioapp.viewmodel.MainViewModel

/**
 * MainScreen - Pantalla principal con UI minimal del asistente
 * Avatar de voz centrado con indicadores de estado
 */
@Composable
fun MainScreen(
    viewModel: MainViewModel
) {
    val uiState by viewModel.uiState.collectAsState()
    val connectionState by viewModel.connectionState.collectAsState()
    val audioState by viewModel.audioState.collectAsState()
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF0D1117),
                        Color(0xFF161B22)
                    )
                )
            )
    ) {
        // Avatar de voz centrado
        Column(
            modifier = Modifier.align(Alignment.Center),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Avatar circular animado
            VoiceAvatar(
                isListening = audioState.isRecording,
                isProcessing = uiState.isProcessing,
                isSpeaking = audioState.isPlaying,
                audioLevel = audioState.audioLevel
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Estado del asistente
            Text(
                text = getStatusText(uiState, audioState),
                color = Color.White.copy(alpha = 0.8f),
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium
            )
        }
        
        // Indicador de conexión (solo si hay problemas)
        if (!connectionState.isConnected) {
            Card(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color.Red.copy(alpha = 0.9f)
                )
            ) {
                Text(
                    text = "Desconectado - Reconectando...",
                    modifier = Modifier.padding(12.dp),
                    color = Color.White,
                    fontSize = 14.sp
                )
            }
        }
        
        // Botón Admin (discreto)
        AdminButton(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(16.dp),
            onClick = { viewModel.toggleAdminMode() }
        )
    }
}

@Composable
fun VoiceAvatar(
    isListening: Boolean,
    isProcessing: Boolean,
    isSpeaking: Boolean,
    audioLevel: Float
) {
    val animatedSize by animateDpAsState(
        targetValue = when {
            isSpeaking -> (120 + audioLevel * 40).dp
            isListening -> (100 + audioLevel * 20).dp
            isProcessing -> 110.dp
            else -> 100.dp
        }
    )
    
    val color = when {
        isSpeaking -> Color(0xFF00D4AA)
        isListening -> Color(0xFF0066FF)
        isProcessing -> Color(0xFFFF6B35)
        else -> Color(0xFF6B7280)
    }
    
    Box(
        modifier = Modifier
            .size(animatedSize)
            .clip(CircleShape)
            .background(
                Brush.radialGradient(
                    colors = listOf(
                        color.copy(alpha = 0.8f),
                        color.copy(alpha = 0.3f),
                        Color.Transparent
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        // Círculo interno
        Box(
            modifier = Modifier
                .size(60.dp)
                .clip(CircleShape)
                .background(color)
        )
    }
}

@Composable
fun AdminButton(
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    IconButton(
        onClick = onClick,
        modifier = modifier
    ) {
        Text(
            text = "⚙️",
            fontSize = 20.sp
        )
    }
}

private fun getStatusText(uiState: Any, audioState: Any): String {
    // Simplificado para el template inicial
    return "Listo para conversar"
}
