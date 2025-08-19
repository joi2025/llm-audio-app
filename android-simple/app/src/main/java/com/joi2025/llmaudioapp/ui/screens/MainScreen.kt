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
import androidx.compose.ui.unit.dp
import com.joi2025.llmaudioapp.viewmodel.MainViewModel
import com.joi2025.llmaudioapp.ui.components.VoiceAvatar
import com.joi2025.llmaudioapp.ui.components.AdminButton
import com.joi2025.llmaudioapp.data.model.AppState
import com.joi2025.llmaudioapp.ui.screens.AdminProScreen

/**
 * MainScreen - Minimal Assistant UI
 * Clean, distraction-free interface with voice avatar and minimal controls
 */
@Composable
fun MainScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val isConnected by viewModel.isConnected.collectAsState()
    val audioLevel by viewModel.audioLevel.collectAsState()
    val currentState by viewModel.currentState.collectAsState()
    val isAdminMode by viewModel.isAdminMode.collectAsState()

    if (isAdminMode) {
        AdminProScreen(
            onBackClick = { viewModel.toggleAdminMode() }
        )
    } else {
        MainAssistantScreen(
            viewModel = viewModel,
            uiState = uiState,
            isConnected = isConnected,
            audioLevel = audioLevel,
            currentState = currentState,
            modifier = modifier
        )
    }
}

@Composable
private fun MainAssistantScreen(
    viewModel: MainViewModel,
    uiState: com.joi2025.llmaudioapp.data.model.UIState,
    isConnected: Boolean,
    audioLevel: Float,
    currentState: AppState,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF0F172A),
                        Color(0xFF1E293B)
                    )
                )
            )
    ) {
        // Main content - Voice Avatar centered
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Voice Avatar - main interaction element
            VoiceAvatar(
                state = currentState,
                audioLevel = audioLevel,
                isConnected = isConnected,
                modifier = Modifier.size(200.dp)
            )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Minimal status text
            Text(
                text = getStatusText(currentState, isConnected),
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.7f)
            )
            
            // Connection retry button (only shown when disconnected)
            if (!isConnected) {
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = { viewModel.reconnect() },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF3B82F6)
                    )
                ) {
                    Text("Reconectar")
                }
            }
        }
        
        // Admin button (top-right corner, subtle)
        AdminButton(
            onClick = { viewModel.toggleAdminMode() },
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(16.dp)
        )
        
        // Tap to interrupt (invisible overlay when speaking)
        if (currentState == AppState.SPEAKING) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clickable { viewModel.stopCurrentAction() }
            )
        }
        
        // Health indicators (bottom, only shown when there are issues)
        if (!isConnected || uiState.hasErrors) {
            Row(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                HealthIndicator(
                    label = "Mic",
                    isHealthy = uiState.audioState.hasPermission,
                    modifier = Modifier
                        .background(
                            Color.Black.copy(alpha = 0.3f),
                            CircleShape
                        )
                        .padding(8.dp)
                )
                
                HealthIndicator(
                    label = "Net",
                    isHealthy = isConnected,
                    modifier = Modifier
                        .background(
                            Color.Black.copy(alpha = 0.3f),
                            CircleShape
                        )
                        .padding(8.dp)
                )
            }
        }
    }
}

@Composable
private fun HealthIndicator(
    label: String,
    isHealthy: Boolean,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(
                    if (isHealthy) Color(0xFF10B981) else Color(0xFFEF4444)
                )
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = Color.White.copy(alpha = 0.8f)
        )
    }
}

private fun getStatusText(state: AppState, isConnected: Boolean): String {
    return when {
        !isConnected -> "Conectando..."
        state == AppState.LISTENING -> "Escuchando..."
        state == AppState.PROCESSING -> "Procesando..."
        state == AppState.SPEAKING -> "Hablando..."
        else -> "Listo para conversar"
    }
}
