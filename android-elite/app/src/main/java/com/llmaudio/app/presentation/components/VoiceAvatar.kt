package com.llmaudio.app.presentation.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.dp
import com.llmaudio.app.presentation.viewmodel.VoicePipelineViewModel
import kotlin.math.*

@Composable
fun VoiceAvatar(
    voiceState: VoicePipelineViewModel.VoiceState,
    audioLevel: Float,
    personality: com.llmaudio.app.domain.model.Personality,
    modifier: Modifier = Modifier
) {
    // Animation values
    val infiniteTransition = rememberInfiniteTransition(label = "avatar")
    
    // Idle animation - gentle pulsing
    val idlePulse by infiniteTransition.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "idlePulse"
    )
    
    // Listening animation - responsive waves
    val listeningWave by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "listeningWave"
    )
    
    // Processing animation - rapid rotation
    val processingRotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "processingRotation"
    )
    
    // Speaking animation - energetic pulses
    val speakingPulse by infiniteTransition.animateFloat(
        initialValue = 0.9f,
        targetValue = 1.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(300, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "speakingPulse"
    )
    
    Box(
        modifier = modifier.size(200.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            when (voiceState) {
                is VoicePipelineViewModel.VoiceState.Idle -> {
                    drawIdleState(
                        color = personality.color,
                        scale = idlePulse
                    )
                }
                is VoicePipelineViewModel.VoiceState.Listening -> {
                    drawListeningState(
                        color = personality.color,
                        waveAngle = listeningWave,
                        audioLevel = audioLevel
                    )
                }
                is VoicePipelineViewModel.VoiceState.Processing -> {
                    drawProcessingState(
                        color = personality.color,
                        rotation = processingRotation
                    )
                }
                is VoicePipelineViewModel.VoiceState.Speaking -> {
                    drawSpeakingState(
                        color = personality.color,
                        scale = speakingPulse,
                        audioLevel = audioLevel
                    )
                }
            }
        }
    }
}

private fun DrawScope.drawIdleState(color: Color, scale: Float) {
    val center = Offset(size.width / 2, size.height / 2)
    val radius = size.minDimension / 3 * scale
    
    // Outer glow
    drawCircle(
        color = color.copy(alpha = 0.1f),
        radius = radius * 1.5f,
        center = center
    )
    
    // Middle ring
    drawCircle(
        color = color.copy(alpha = 0.3f),
        radius = radius * 1.2f,
        center = center
    )
    
    // Core circle
    drawCircle(
        color = color,
        radius = radius,
        center = center
    )
}

private fun DrawScope.drawListeningState(
    color: Color,
    waveAngle: Float,
    audioLevel: Float
) {
    val center = Offset(size.width / 2, size.height / 2)
    val baseRadius = size.minDimension / 3
    
    // Draw sound waves
    for (i in 0..2) {
        val waveRadius = baseRadius * (1 + i * 0.3f + audioLevel * 0.5f)
        val alpha = 0.5f - i * 0.15f
        
        rotate(waveAngle + i * 30f, center) {
            drawArc(
                color = color.copy(alpha = alpha),
                startAngle = -45f,
                sweepAngle = 90f,
                useCenter = false,
                topLeft = Offset(center.x - waveRadius, center.y - waveRadius),
                size = androidx.compose.ui.geometry.Size(waveRadius * 2, waveRadius * 2),
                style = androidx.compose.ui.graphics.drawscope.Stroke(width = 4.dp.toPx())
            )
            
            drawArc(
                color = color.copy(alpha = alpha),
                startAngle = 135f,
                sweepAngle = 90f,
                useCenter = false,
                topLeft = Offset(center.x - waveRadius, center.y - waveRadius),
                size = androidx.compose.ui.geometry.Size(waveRadius * 2, waveRadius * 2),
                style = androidx.compose.ui.graphics.drawscope.Stroke(width = 4.dp.toPx())
            )
        }
    }
    
    // Core circle that responds to audio
    val coreRadius = baseRadius * (1 + audioLevel * 0.3f)
    drawCircle(
        color = color,
        radius = coreRadius,
        center = center
    )
}

private fun DrawScope.drawProcessingState(color: Color, rotation: Float) {
    val center = Offset(size.width / 2, size.height / 2)
    val radius = size.minDimension / 3
    
    // Rotating dots
    val dotCount = 8
    val dotRadius = radius * 0.1f
    
    for (i in 0 until dotCount) {
        val angle = (360f / dotCount * i + rotation) * PI / 180
        val dotX = center.x + cos(angle).toFloat() * radius
        val dotY = center.y + sin(angle).toFloat() * radius
        
        drawCircle(
            color = color.copy(alpha = 0.3f + 0.7f * ((i + rotation / 45) % dotCount) / dotCount),
            radius = dotRadius,
            center = Offset(dotX, dotY)
        )
    }
    
    // Central processing indicator
    rotate(rotation * 2, center) {
        drawRect(
            color = color,
            topLeft = Offset(center.x - radius * 0.3f, center.y - radius * 0.05f),
            size = androidx.compose.ui.geometry.Size(radius * 0.6f, radius * 0.1f)
        )
        drawRect(
            color = color,
            topLeft = Offset(center.x - radius * 0.05f, center.y - radius * 0.3f),
            size = androidx.compose.ui.geometry.Size(radius * 0.1f, radius * 0.6f)
        )
    }
}

private fun DrawScope.drawSpeakingState(
    color: Color,
    scale: Float,
    audioLevel: Float
) {
    val center = Offset(size.width / 2, size.height / 2)
    val baseRadius = size.minDimension / 3
    
    // Dynamic rings based on audio
    val ringCount = 3
    for (i in 0 until ringCount) {
        val ringScale = scale + i * 0.1f * (1 + audioLevel)
        val ringRadius = baseRadius * ringScale
        val alpha = (1f - i * 0.3f) * (0.5f + audioLevel * 0.5f)
        
        drawCircle(
            color = color.copy(alpha = alpha),
            radius = ringRadius,
            center = center,
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = (3 - i).dp.toPx())
        )
    }
    
    // Energetic core
    val coreRadius = baseRadius * scale * (0.8f + audioLevel * 0.4f)
    drawCircle(
        color = color,
        radius = coreRadius,
        center = center
    )
    
    // Inner glow
    drawCircle(
        color = Color.White.copy(alpha = 0.3f + audioLevel * 0.2f),
        radius = coreRadius * 0.5f,
        center = center
    )
}
