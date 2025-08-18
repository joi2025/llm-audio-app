package com.joi2025.llmaudioapp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/**
 * AdminButton - Subtle admin access button
 * Only visible when needed, doesn't interfere with minimal UI
 */
@Composable
fun AdminButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(Color.Black.copy(alpha = 0.3f))
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "⚙",
            color = Color.White.copy(alpha = 0.7f),
            style = MaterialTheme.typography.bodyMedium
        )
    }
}
