package com.joi2025.llmaudioapp.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.center
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.dp
import com.joi2025.llmaudioapp.data.model.AppState
import kotlin.math.*

/**
 * VoiceAvatar - Native implementation of the voice interaction avatar
 * Replicates VoiceCircleV2_Final.jsx behavior with smooth animations
 */
@Composable
fun VoiceAvatar(
    state: AppState,
    audioLevel: Float,
    isConnected: Boolean,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "avatar_animation")
    
    // Rotation animation for processing state
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation"
    )
    
    // Breathing animation for idle state
    val breathingScale by infiniteTransition.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "breathing"
    )
    
    // Pulse animation for speaking state
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    Box(modifier = modifier) {
        Canvas(
            modifier = Modifier.size(200.dp)
        ) {
            val center = size.center
            val radius = size.minDimension / 2f * 0.8f
            
            when (state) {
                AppState.IDLE -> drawIdleState(center, radius, breathingScale, isConnected)
                AppState.LISTENING -> drawListeningState(center, radius, audioLevel)
                AppState.PROCESSING -> drawProcessingState(center, radius, rotation)
                AppState.SPEAKING -> drawSpeakingState(center, radius, pulseScale)
            }
        }
    }
}

private fun DrawScope.drawIdleState(
    center: androidx.compose.ui.geometry.Offset,
    radius: Float,
    breathingScale: Float,
    isConnected: Boolean
) {
    val adjustedRadius = radius * breathingScale
    val color = if (isConnected) Color(0xFF3B82F6) else Color(0xFF6B7280)
    
    // Outer glow
    drawCircle(
        color = color.copy(alpha = 0.2f),
        radius = adjustedRadius * 1.2f,
        center = center
    )
    
    // Main circle
    drawCircle(
        color = color.copy(alpha = 0.8f),
        radius = adjustedRadius,
        center = center
    )
    
    // Inner highlight
    drawCircle(
        color = Color.White.copy(alpha = 0.3f),
        radius = adjustedRadius * 0.3f,
        center = center
    )
}

private fun DrawScope.drawListeningState(
    center: androidx.compose.ui.geometry.Offset,
    radius: Float,
    audioLevel: Float
) {
    val baseColor = Color(0xFF10B981)
    val waveRadius = radius * (0.8f + audioLevel * 0.4f)
    
    // Multiple concentric waves based on audio level
    for (i in 0..2) {
        val waveAlpha = (0.6f - i * 0.2f) * (0.5f + audioLevel * 0.5f)
        val currentRadius = waveRadius * (1f + i * 0.2f)
        
        drawCircle(
            color = baseColor.copy(alpha = waveAlpha),
            radius = currentRadius,
            center = center
        )
    }
    
    // Core circle
    drawCircle(
        color = baseColor,
        radius = radius * 0.6f,
        center = center
    )
}

private fun DrawScope.drawProcessingState(
    center: androidx.compose.ui.geometry.Offset,
    radius: Float,
    rotation: Float
) {
    val color = Color(0xFFF59E0B)
    
    rotate(rotation, center) {
        // Rotating shimmer effect
        val shimmerBrush = Brush.sweepGradient(
            colors = listOf(
                color.copy(alpha = 0.1f),
                color.copy(alpha = 0.8f),
                color.copy(alpha = 0.1f)
            ),
            center = center
        )
        
        drawCircle(
            brush = shimmerBrush,
            radius = radius,
            center = center
        )
    }
    
    // Static inner circle
    drawCircle(
        color = color.copy(alpha = 0.6f),
        radius = radius * 0.5f,
        center = center
    )
}

private fun DrawScope.drawSpeakingState(
    center: androidx.compose.ui.geometry.Offset,
    radius: Float,
    pulseScale: Float
) {
    val color = Color(0xFFEF4444)
    val adjustedRadius = radius * pulseScale
    
    // Pulsing outer ring
    drawCircle(
        color = color.copy(alpha = 0.3f),
        radius = adjustedRadius * 1.3f,
        center = center
    )
    
    // Main pulsing circle
    drawCircle(
        color = color.copy(alpha = 0.8f),
        radius = adjustedRadius,
        center = center
    )
    
    // Rhythmic inner circles (simulating TTS rhythm)
    for (i in 0..1) {
        val innerRadius = adjustedRadius * (0.3f + i * 0.2f) * pulseScale
        drawCircle(
            color = Color.White.copy(alpha = 0.4f - i * 0.1f),
            radius = innerRadius,
            center = center
        )
    }
}
