package com.llmaudio.app.presentation.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.platform.LocalTextToolbar
import androidx.compose.ui.platform.TextToolbar
import androidx.compose.ui.platform.TextToolbarStatus
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import android.os.Build
import com.llmaudio.app.domain.model.Personalities
import com.llmaudio.app.domain.model.Personality
import com.llmaudio.app.presentation.components.VoiceAvatar
import com.llmaudio.app.presentation.viewmodel.VoicePipelineViewModel
import com.llmaudio.app.domain.model.VoiceState
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    onNavigateToHistory: () -> Unit = {},
    onNavigateToAdmin: () -> Unit = {},
    viewModel: VoicePipelineViewModel = hiltViewModel()
) {
    val voiceState by viewModel.voiceState.collectAsState()
    val currentPersonality by viewModel.currentPersonality.collectAsState()
    val audioLevel by viewModel.audioLevel.collectAsState()
    val transcription by viewModel.transcription.collectAsState()
    val assistantResponse by viewModel.assistantResponse.collectAsState()
    
    var showSettings by remember { mutableStateOf(false) }
    var showPersonalitySelector by remember { mutableStateOf(false) }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.radialGradient(
                    colors = listOf(
                        currentPersonality.color.copy(alpha = 0.1f),
                        Color.Black
                    ),
                    radius = 800f
                )
            )
    ) {
        // History button
        IconButton(
            onClick = onNavigateToHistory,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(16.dp)
        ) {
            Icon(
                Icons.Filled.History,
                contentDescription = "Historial",
                tint = Color.White.copy(alpha = 0.7f)
            )
        }
        // Admin button
        IconButton(
            onClick = onNavigateToAdmin,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 16.dp, end = 16.dp)
        ) {
            Icon(
                Icons.Default.AdminPanelSettings,
                contentDescription = "Admin Panel",
                tint = Color.White.copy(alpha = 0.7f)
            )
        }
        
        // Settings button
        IconButton(
            onClick = { showSettings = true },
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 60.dp, end = 16.dp)
        ) {
            Icon(
                Icons.Default.Settings,
                contentDescription = "Settings",
                tint = Color.White.copy(alpha = 0.7f)
            )
        }
        
        // Main content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Personality indicator
            Card(
                modifier = Modifier
                    .clickable { showPersonalitySelector = !showPersonalitySelector }
                    .padding(bottom = 32.dp),
                colors = CardDefaults.cardColors(
                    containerColor = currentPersonality.color.copy(alpha = 0.2f)
                ),
                shape = RoundedCornerShape(24.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = currentPersonality.emoji,
                        fontSize = 24.sp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = currentPersonality.name,
                        color = Color.White,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
            
            // Voice Avatar - Main Interactive Element
            Box(
                modifier = Modifier
                    .size(250.dp)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) {
                        when (voiceState) {
                            is VoiceState.Idle -> {
                                viewModel.startListening()
                            }
                            is VoiceState.Listening -> {
                                viewModel.stopListening()
                            }
                            is VoiceState.Speaking -> {
                                viewModel.interruptSpeaking()
                            }
                            else -> {}
                        }
                    }
            ) {
                VoiceAvatar(
                    voiceState = voiceState,
                    audioLevel = audioLevel,
                    personality = currentPersonality,
                    modifier = Modifier.fillMaxSize()
                )
            }
            
            // State indicator
            Spacer(modifier = Modifier.height(32.dp))
            AnimatedVisibility(
                visible = true,
                enter = fadeIn(),
                exit = fadeOut()
            ) {
                Text(
                    text = when (voiceState) {
                        is VoiceState.Idle -> "Toca para hablar"
                        is VoiceState.Listening -> "Escuchando..."
                        is VoiceState.Processing -> "Procesando..."
                        is VoiceState.Speaking -> "Hablando..."
                        is VoiceState.Error -> (voiceState as VoiceState.Error).message
                    },
                    color = when (voiceState) {
                        is VoiceState.Error -> Color.Red.copy(alpha = 0.8f)
                        else -> Color.White.copy(alpha = 0.7f)
                    },
                    fontSize = 16.sp
                )
            }
            
            // Transcription display
            AnimatedVisibility(
                visible = transcription.isNotEmpty(),
                enter = slideInVertically() + fadeIn(),
                exit = slideOutVertically() + fadeOut()
            ) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 24.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color.White.copy(alpha = 0.1f)
                    )
                ) {
                    Text(
                        text = transcription,
                        color = Color.White.copy(alpha = 0.9f),
                        modifier = Modifier.padding(16.dp),
                        textAlign = TextAlign.Center
                    )
                }
            }
            
            // Assistant response display
            AnimatedVisibility(
                visible = assistantResponse.isNotEmpty(),
                enter = slideInVertically() + fadeIn(),
                exit = slideOutVertically() + fadeOut()
            ) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = currentPersonality.color.copy(alpha = 0.15f)
                    )
                ) {
                    Text(
                        text = assistantResponse,
                        color = Color.White,
                        modifier = Modifier.padding(16.dp),
                        textAlign = TextAlign.Start
                    )
                }
            }
        }
        
        // Personality selector
        AnimatedVisibility(
            visible = showPersonalitySelector,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            PersonalitySelector(
                currentPersonality = currentPersonality,
                onPersonalitySelected = { personality ->
                    viewModel.changePersonality(personality)
                    showPersonalitySelector = false
                }
            )
        }
        
        // Settings dialog
        if (showSettings) {
            SettingsDialog(
                onDismiss = { showSettings = false }
            )
        }
    }
}

@Composable
fun PersonalitySelector(
    currentPersonality: Personality,
    onPersonalitySelected: (Personality) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.Black.copy(alpha = 0.9f)
        ),
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                "Selecciona una personalidad",
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp)
            )
            
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(Personalities.all.filter { it.id != "default" }) { personality ->
                    PersonalityCard(
                        personality = personality,
                        isSelected = personality.id == currentPersonality.id,
                        onClick = { onPersonalitySelected(personality) }
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PersonalityCard(
    personality: Personality,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier
            .width(120.dp)
            .height(140.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) 
                personality.color.copy(alpha = 0.3f)
            else 
                Color.White.copy(alpha = 0.1f)
        ),
        border = if (isSelected) CardDefaults.outlinedCardBorder() else null
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = personality.emoji,
                fontSize = 32.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = personality.name,
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = personality.description,
                color = Color.White.copy(alpha = 0.7f),
                fontSize = 10.sp,
                textAlign = TextAlign.Center,
                maxLines = 2
            )
        }
    }
}

@Composable
fun SettingsDialog(
    onDismiss: () -> Unit,
    viewModel: VoicePipelineViewModel = hiltViewModel()
) {
    val savedKey by viewModel.apiKeyFlow.collectAsState(initial = "")
    var apiKey by remember { mutableStateOf("") }
    LaunchedEffect(savedKey) { if (apiKey.isEmpty()) apiKey = savedKey }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Configuración") },
        text = {
            MiuiSafeTextToolbar {
                Column {
                    Text("OpenAI API Key")
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = apiKey,
                        onValueChange = { apiKey = it },
                        placeholder = { Text("sk-...") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        visualTransformation = PasswordVisualTransformation()
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    // Save API key via ViewModel -> DataStore
                    viewModel.saveApiKey(apiKey.trim())
                    android.util.Log.d("ApiKey", "UI saved key len=${apiKey.trim().length}")
                    onDismiss()
                }
            ) {
                Text("Guardar")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar")
            }
        }
    )
}

@Composable
private fun MiuiSafeTextToolbar(content: @Composable () -> Unit) {
    val isMiui = remember {
        val manufacturer = (Build.MANUFACTURER ?: "").lowercase()
        val brand = (Build.BRAND ?: "").lowercase()
        manufacturer.contains("xiaomi") ||
                brand.contains("xiaomi") || brand.contains("redmi") || brand.contains("poco")
    }
    if (isMiui) {
        val noToolbar = remember {
            object : TextToolbar {
                override val status: TextToolbarStatus
                    get() = TextToolbarStatus.Hidden

                override fun showMenu(
                    rect: Rect,
                    onCopyRequested: (() -> Unit)?,
                    onPasteRequested: (() -> Unit)?,
                    onCutRequested: (() -> Unit)?,
                    onSelectAllRequested: (() -> Unit)?
                ) {
                    // no-op: prevent MIUI selection toolbar crash
                }

                override fun hide() {
                    // no-op
                }
            }
        }
        CompositionLocalProvider(LocalTextToolbar provides noToolbar) {
            content()
        }
    } else {
        content()
    }
}
