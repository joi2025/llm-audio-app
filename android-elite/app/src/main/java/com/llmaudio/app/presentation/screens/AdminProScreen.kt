package com.llmaudio.app.presentation.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.text.KeyboardOptions 
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material.icons.rounded.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.material3.ExperimentalMaterial3Api 
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.llmaudio.app.domain.model.VoiceState
import com.llmaudio.app.presentation.viewmodel.AdminProViewModel
import com.llmaudio.app.presentation.viewmodel.ApiKeyValidationState // Import the enum
import com.llmaudio.app.presentation.viewmodel.VoicePipelineViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*


@Composable
fun FullScreenLoading() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.5f)),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator()
    }
}

@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class) 
@Composable
fun AdminProScreen(
    adminProViewModel: AdminProViewModel = hiltViewModel(),
    voicePipelineViewModel: VoicePipelineViewModel = hiltViewModel(),
    onBack: () -> Unit 
) {
    val uiState by adminProViewModel.uiState.collectAsState()
    val openAIApiKey by voicePipelineViewModel.currentRawApiKey.collectAsState()
    val voiceState by voicePipelineViewModel.voiceState.collectAsState()
    val voiceErrorMessage by voicePipelineViewModel.errorMessage.collectAsState()

    val tabs = listOf(
        "Consentimientos",
        "Métricas",
        "Uso",
        "Diagnóstico",
        "Personalidades",
        "Configuración"
    )
    val pagerState = rememberPagerState(pageCount = { tabs.size })
    val coroutineScope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Admin Pro", style = MaterialTheme.typography.headlineSmall) },
                navigationIcon = { 
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary
                ),
                actions = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        // Icono de estado de API Key global (basado en si está guardada o no)
                        val apiKeyStatusIcon = if (openAIApiKey.isNotBlank()) Icons.Default.CheckCircle else Icons.Default.Warning
                        val apiKeyStatusTint = if (openAIApiKey.isNotBlank()) Color.Green else Color.Red
                        Icon(
                            imageVector = apiKeyStatusIcon,
                            contentDescription = "OpenAI API Status",
                            tint = apiKeyStatusTint,
                            modifier = Modifier.size(18.dp).padding(end = 4.dp)
                        )
                        Text(
                            text = if (openAIApiKey.isNotBlank()) "API OK" else "API Desc.",
                            color = MaterialTheme.colorScheme.onPrimary, // Usar color del TopAppBar
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            ScrollableTabRow(
                selectedTabIndex = pagerState.currentPage,
                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                contentColor = MaterialTheme.colorScheme.onSurfaceVariant
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = pagerState.currentPage == index,
                        onClick = {
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(index)
                            }
                        },
                        text = { Text(title) }
                    )
                }
            }

            HorizontalPager(
                state = pagerState,
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
            ) { page ->
                when (page) {
                    0 -> ConsentHistoryTab(uiState.consents)
                    1 -> MetricsHistoryTab(uiState.metrics)
                    2 -> UsageHistoryTab(uiState.usages)
                    3 -> DiagnosticTab()
                    4 -> PersonalitiesTab()
                    5 -> ConfigTab(voicePipelineViewModel, openAIApiKey, voiceState, voiceErrorMessage)
                    else -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Contenido para ${tabs[page]}")
                    }
                }
            }
        }
        AnimatedVisibility(
            visible = uiState.loading, 
            enter = fadeIn(animationSpec = tween(300)),
            exit = fadeOut(animationSpec = tween(300))
        ) {
            FullScreenLoading() 
        }
    }
}

@Composable
fun ConfigTab(
    voicePipelineViewModel: VoicePipelineViewModel,
    openAIApiKey: String, // Esta es la clave guardada actualmente
    voiceState: VoiceState,
    voiceErrorMessage: String?
) {
    var apiKeyInput by remember { mutableStateOf(openAIApiKey) }
    var passwordVisibility by remember { mutableStateOf(false) }
    val apiKeyValidationStatus by voicePipelineViewModel.apiKeyValidity.collectAsState()

    // Actualiza el campo de entrada si la clave guardada cambia (ej. desde otra fuente)
    LaunchedEffect(openAIApiKey) {
        apiKeyInput = openAIApiKey
    }
    
    // Resetea el estado de validación si el input cambia
    LaunchedEffect(apiKeyInput) {
        if (apiKeyValidationStatus != ApiKeyValidationState.IDLE) {
             voicePipelineViewModel.resetApiKeyValidationState()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Configuración de la Aplicación",
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        OutlinedTextField(
            value = apiKeyInput,
            onValueChange = { apiKeyInput = it },
            label = { Text("API Key de OpenAI") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            visualTransformation = if (passwordVisibility) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                keyboardType = androidx.compose.ui.text.input.KeyboardType.Password
            ),
            trailingIcon = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    when (apiKeyValidationStatus) {
                        ApiKeyValidationState.CHECKING -> {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp).padding(end = 4.dp),
                                strokeWidth = 2.dp
                            )
                        }
                        ApiKeyValidationState.VALID -> {
                            Icon(
                                imageVector = Icons.Filled.CheckCircle,
                                contentDescription = "API Key Válida",
                                tint = Color.Green,
                                modifier = Modifier.padding(end = 4.dp)
                            )
                        }
                        ApiKeyValidationState.INVALID -> {
                            Icon(
                                imageVector = Icons.Filled.Error,
                                contentDescription = "API Key Inválida",
                                tint = Color.Red,
                                modifier = Modifier.padding(end = 4.dp)
                            )
                        }
                        ApiKeyValidationState.IDLE -> { /* No mostrar nada o un icono neutral */ }
                    }
                    val image = if (passwordVisibility)
                        Icons.Rounded.Visibility
                    else Icons.Rounded.VisibilityOff
                    val description = if (passwordVisibility) "Hide password" else "Show password"
                    IconButton(onClick = { passwordVisibility = !passwordVisibility }) {
                        Icon(imageVector = image, description)
                    }
                }
            }
        )

        Button(
            onClick = {
                voicePipelineViewModel.saveApiKey(apiKeyInput.trim())
                voicePipelineViewModel.checkOpenAIKeyValidity(apiKeyInput.trim())
            },
            enabled = apiKeyValidationStatus != ApiKeyValidationState.CHECKING, // Deshabilitar mientras verifica
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Guardar y Validar API Key")
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Card de estado general de la API (basado en la clave guardada)
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Estado de API Key (Guardada):",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                val isSavedKeyValid = openAIApiKey.isNotBlank() // Asumimos válida si no está en blanco para este display
                Text(
                    text = if (isSavedKeyValid) "Configurada: ${obfuscateApiKey(openAIApiKey)}" else "No configurada",
                    color = if (isSavedKeyValid) Color.Green else Color.Red
                )
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Estado del Pipeline de Voz:",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Estado: ${voiceState.javaClass.simpleName}", 
                    color = when (voiceState) {
                        is VoiceState.Idle -> Color.Gray
                        is VoiceState.Listening -> Color.Blue
                        is VoiceState.Processing -> Color.Magenta
                        is VoiceState.Speaking -> Color.Cyan
                        is VoiceState.Error -> Color.Red
                    }
                )
                voiceErrorMessage?.let { errorMsg ->
                    Text(
                        text = "Error: $errorMsg",
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }
        }
    }
}

fun obfuscateApiKey(apiKey: String): String {
    if (apiKey.length < 10) return "****" 
    val prefix = apiKey.substring(0, 3)
    val suffix = apiKey.substring(apiKey.length - 4)
    return "$prefix*********************$suffix"
}


@Composable
fun DiagnosticTab() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("Aquí se mostrará información de diagnóstico en tiempo real (pings, latencias, etc.).")
    }
}

@Composable
fun PersonalitiesTab() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("Aquí se gestionarán las personalidades (crear, editar, seleccionar).")
    }
}


@Composable
fun ConsentHistoryTab(consentHistory: List<String>) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        if (consentHistory.isEmpty()) {
            item {
                Box(
                    modifier = Modifier.fillParentMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No hay historial de consentimientos.", style = MaterialTheme.typography.bodyLarge)
                }
            }
        } else {
            items(consentHistory) { consent ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = consent, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}

@Composable
fun MetricsHistoryTab(metricsHistory: List<String>) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        if (metricsHistory.isEmpty()) {
            item {
                Box(
                    modifier = Modifier.fillParentMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No hay historial de métricas.", style = MaterialTheme.typography.bodyLarge)
                }
            }
        } else {
            items(metricsHistory) { metric ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = metric, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}

@Composable
fun UsageHistoryTab(usageHistory: List<String>) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        if (usageHistory.isEmpty()) {
            item {
                Box(
                    modifier = Modifier.fillParentMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No hay historial de uso.", style = MaterialTheme.typography.bodyLarge)
                }
            }
        } else {
            items(usageHistory) { usage ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = usage, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}
