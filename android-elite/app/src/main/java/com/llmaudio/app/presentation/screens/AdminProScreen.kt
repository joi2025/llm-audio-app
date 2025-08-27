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
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.llmaudio.app.domain.model.VoiceState
import com.llmaudio.app.presentation.viewmodel.AdminProViewModel
import com.llmaudio.app.presentation.viewmodel.ApiKeyValidationState
import com.llmaudio.app.presentation.viewmodel.VoicePipelineViewModel
import kotlinx.coroutines.launch
// import java.text.SimpleDateFormat // No longer used directly here
// import java.util.* // No longer used directly here


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
    val uiState by adminProViewModel.uiState.collectAsState() // For loading indicator, and future states for new tabs
    val rawApiKeyFromVoicePipeline by voicePipelineViewModel.currentRawApiKey.collectAsState()
    val voiceStateFromVoicePipeline by voicePipelineViewModel.voiceState.collectAsState()
    val voiceErrorMessageFromVoicePipeline by voicePipelineViewModel.errorMessage.collectAsState()
    val apiKeyValidationStatusFromVoicePipeline by voicePipelineViewModel.apiKeyValidity.collectAsState()

    // Define new tab structure
    val tabs = listOf(
        "Gasto API",
        "Voces",
        "Configuración API"
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
                        val apiKeyStatusIcon = when (apiKeyValidationStatusFromVoicePipeline) {
                            ApiKeyValidationState.VALID -> Icons.Default.CheckCircle
                            ApiKeyValidationState.INVALID -> Icons.Default.Error
                            ApiKeyValidationState.CHECKING -> Icons.Default.SyncProblem // Or a CircularProgressIndicator
                            else -> Icons.Default.Warning // IDLE or not explicitly set
                        }
                        val apiKeyStatusTint = when (apiKeyValidationStatusFromVoicePipeline) {
                            ApiKeyValidationState.VALID -> Color.Green
                            ApiKeyValidationState.INVALID -> Color.Red
                            ApiKeyValidationState.CHECKING -> MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f)
                            else -> Color.Yellow
                        }
                        Icon(
                            imageVector = apiKeyStatusIcon,
                            contentDescription = "OpenAI API Key Status",
                            tint = apiKeyStatusTint,
                            modifier = Modifier.size(18.dp).padding(end = 4.dp)
                        )
                        Text(
                            text = when (apiKeyValidationStatusFromVoicePipeline) {
                                ApiKeyValidationState.VALID -> "API OK"
                                ApiKeyValidationState.INVALID -> "API Inválida"
                                ApiKeyValidationState.CHECKING -> "Verificando..."
                                else -> if (rawApiKeyFromVoicePipeline.isNotBlank()) "API Pendiente" else "API Desc."
                            },
                            color = MaterialTheme.colorScheme.onPrimary,
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
                    0 -> ApiUsageTab(adminProViewModel)
                    1 -> VoicesTab(adminProViewModel, voicePipelineViewModel) // Pass VoicePipelineViewModel if TTS quality change needs immediate effect
                    2 -> ConfigTab(
                        voicePipelineViewModel = voicePipelineViewModel,
                        openAIApiKey = rawApiKeyFromVoicePipeline,
                        voiceState = voiceStateFromVoicePipeline,
                        voiceErrorMessage = voiceErrorMessageFromVoicePipeline,
                        apiKeyValidationState = apiKeyValidationStatusFromVoicePipeline // Pass validation state
                    )
                    else -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Contenido para ${tabs[page]} no implementado.") // Should not happen
                    }
                }
            }
        }
        AnimatedVisibility(
            visible = uiState.loading, // Assuming AdminProViewModel has a 'loading' state for API calls
            enter = fadeIn(animationSpec = tween(300)),
            exit = fadeOut(animationSpec = tween(300))
        ) {
            FullScreenLoading()
        }
    }
}

@Composable
fun ApiUsageTab(adminProViewModel: AdminProViewModel) {
    // Collect state from AdminProViewModel
    val usageData by adminProViewModel.apiUsageData.collectAsState() // Example state
    val errorMessage by adminProViewModel.apiUsageError.collectAsState() // Example error state

    LaunchedEffect(Unit) {
        adminProViewModel.fetchApiUsage()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Gasto y Uso de API (OpenAI)", style = MaterialTheme.typography.headlineMedium)
        if (errorMessage != null) {
            Text("Error: $errorMessage", color = MaterialTheme.colorScheme.error)
        }
        // TODO: Implement actual display of usage data (total, by model)
        // For now, a placeholder:
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Datos de Uso:", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                Text(usageData ?: "Cargando...")
            }
        }
        Button(onClick = { adminProViewModel.fetchApiUsage() }) {
            Text("Refrescar Datos de Uso")
        }
        Text("Nota: El desglose de costes exacto en USD requiere aplicar manualmente las tarifas de cada modelo a los tokens usados. Esta pestaña mostrará el uso de tokens según la API de OpenAI.", style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun VoicesTab(adminProViewModel: AdminProViewModel, voicePipelineViewModel: VoicePipelineViewModel) {
    // Collect state from AdminProViewModel for TTS quality selection
    val ttsQualityOptions = adminProViewModel.ttsQualityOptions
    val selectedTtsQuality by adminProViewModel.selectedTtsQuality.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Configuración de Voces (TTS)", style = MaterialTheme.typography.headlineMedium)

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp).selectableGroup()) {
                Text("Calidad de Voz TTS de OpenAI:", style = MaterialTheme.typography.titleMedium)
                ttsQualityOptions.forEach { (qualityValue, qualityLabel) ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .height(56.dp)
                            .selectable(
                                selected = (selectedTtsQuality == qualityValue),
                                onClick = {
                                    adminProViewModel.updateSelectedTtsQuality(qualityValue)
                                    // Optionally, trigger an immediate effect or test if needed
                                    // voicePipelineViewModel.testTtsWithQuality(qualityValue)
                                },
                                role = Role.RadioButton
                            )
                            .padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = (selectedTtsQuality == qualityValue),
                            onClick = null // null recommended for row().selectable()
                        )
                        Text(
                            text = qualityLabel,
                            style = MaterialTheme.typography.bodyLarge,
                            modifier = Modifier.padding(start = 16.dp)
                        )
                    }
                }
                 Text(
                    "Actual: ${selectedTtsQuality}",
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "Integraciones Externas (TTS):",
            style = MaterialTheme.typography.titleMedium
        )
        Text(
            "Próximamente: Opciones para integrar servicios como Amazon Polly o ElevenLabs.",
            style = MaterialTheme.typography.bodyMedium
        )
        Text(
            "Fallback: Si la calidad HD o una voz externa falla, la app usará TTS Standard de OpenAI.",
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(top = 8.dp)
        )
    }
}

@Composable
fun ConfigTab(
    voicePipelineViewModel: VoicePipelineViewModel,
    openAIApiKey: String,
    voiceState: VoiceState,
    voiceErrorMessage: String?,
    apiKeyValidationState: ApiKeyValidationState // Added to use the propagated state
) {
    var apiKeyInput by remember(openAIApiKey) { mutableStateOf(openAIApiKey) } // Use remember with key
    var passwordVisibility by remember { mutableStateOf(false) }
    // val apiKeyValidationStatus by voicePipelineViewModel.apiKeyValidity.collectAsState() // Already passed as parameter

    // Resetea el estado de validación si el input cambia y no es igual a la clave guardada
    // O si la clave guardada cambia y el input no se ha actualizado aún
    LaunchedEffect(apiKeyInput, openAIApiKey) {
        if (apiKeyInput != openAIApiKey && apiKeyValidationState != ApiKeyValidationState.IDLE) {
            voicePipelineViewModel.resetApiKeyValidationState()
        }
    }
    // Actualiza el input si la clave guardada cambia (e.g., validada y actualizada desde otra fuente)
    // Esto es sutil, pero si la clave guardada cambia (openAIApiKey), el 'remember' de apiKeyInput se reinicia.
    // LaunchedEffect(openAIApiKey) { // This is now handled by remember(openAIApiKey)
    // apiKeyInput = openAIApiKey
    // }


    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Configuración de API OpenAI",
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
                    when (apiKeyValidationState) {
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
                    val description = if (passwordVisibility) "Ocultar clave" else "Mostrar clave"
                    IconButton(onClick = { passwordVisibility = !passwordVisibility }) {
                        Icon(imageVector = image, description)
                    }
                }
            },
            isError = apiKeyValidationState == ApiKeyValidationState.INVALID && apiKeyInput.isNotEmpty()
        )
        if (apiKeyValidationState == ApiKeyValidationState.INVALID && apiKeyInput.isNotEmpty()) {
             voicePipelineViewModel.errorMessage.collectAsState().value?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }
        }


        Button(
            onClick = {
                val keyToValidate = apiKeyInput.trim()
                voicePipelineViewModel.saveApiKey(keyToValidate) // This will trigger collection in ViewModel and re-validation
                // voicePipelineViewModel.checkOpenAIKeyValidity(keyToValidate) // This is now called reactively
            },
            enabled = apiKeyValidationState != ApiKeyValidationState.CHECKING && apiKeyInput.trim() != openAIApiKey,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (apiKeyValidationState == ApiKeyValidationState.CHECKING) "Validando..." else "Guardar y Validar API Key")
        }

        Spacer(modifier = Modifier.height(16.dp))

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
                val (text, color) = when {
                    openAIApiKey.isBlank() -> "No configurada" to Color.Red
                    apiKeyValidationState == ApiKeyValidationState.VALID -> "Configurada y Válida: ${obfuscateApiKey(openAIApiKey)}" to Color.Green
                    apiKeyValidationState == ApiKeyValidationState.INVALID -> "Configurada pero Inválida" to Color.Red
                    apiKeyValidationState == ApiKeyValidationState.CHECKING -> "Verificando..." to MaterialTheme.colorScheme.onSurfaceVariant
                    else -> "Configurada (estado desconocido): ${obfuscateApiKey(openAIApiKey)}" to Color.Yellow // IDLE
                }
                Text(text = text, color = color)
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
                        else -> MaterialTheme.colorScheme.onSurface // Should not happen for sealed class
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


// Las siguientes pestañas se mantienen en el archivo para no romper nada,
// pero ya no se usan en el HorizontalPager de AdminProScreen.
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
