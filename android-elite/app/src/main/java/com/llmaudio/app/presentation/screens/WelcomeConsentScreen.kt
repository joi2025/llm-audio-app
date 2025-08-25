package com.llmaudio.app.presentation.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.llmaudio.app.presentation.viewmodel.ConsentViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WelcomeConsentScreen(
    onConsentGranted: () -> Unit,
    viewModel: ConsentViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(32.dp))
        
        // App Icon and Title
        Icon(
            imageVector = Icons.Default.RecordVoiceOver,
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = MaterialTheme.colorScheme.primary
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "Bienvenido a LLM Audio App",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        
        Text(
            text = "Tu asistente de voz con IA",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // Privacy Information Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant
            )
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Security,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "Información de Privacidad",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                PrivacyInfoItem(
                    icon = Icons.Default.Mic,
                    title = "Grabación de Voz",
                    description = "Tu voz se envía a OpenAI para transcripción y procesamiento. No se almacena en sus servidores después del procesamiento."
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                PrivacyInfoItem(
                    icon = Icons.Default.Storage,
                    title = "Almacenamiento Local",
                    description = "El historial de conversaciones se guarda cifrado en tu dispositivo. Nunca se comparte con terceros."
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                PrivacyInfoItem(
                    icon = Icons.Default.Key,
                    title = "Clave API Segura",
                    description = "Tu clave de OpenAI se almacena cifrada usando EncryptedSharedPreferences de Android."
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                PrivacyInfoItem(
                    icon = Icons.Default.Shield,
                    title = "Moderación de Contenido",
                    description = "Todo el contenido se filtra usando la API de Moderación de OpenAI para garantizar un uso seguro."
                )
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // API Key Input
        OutlinedTextField(
            value = uiState.apiKey,
            onValueChange = viewModel::updateApiKey,
            label = { Text("Clave API de OpenAI") },
            placeholder = { Text("sk-...") },
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.Key,
                    contentDescription = null
                )
            },
            isError = uiState.apiKeyError != null,
            supportingText = uiState.apiKeyError?.let { error ->
                { Text(error, color = MaterialTheme.colorScheme.error) }
            }
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Consent Checkboxes
        ConsentCheckbox(
            checked = uiState.voiceConsentGranted,
            onCheckedChange = viewModel::updateVoiceConsent,
            text = "Acepto que mi voz sea procesada por OpenAI para generar respuestas del asistente"
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        ConsentCheckbox(
            checked = uiState.dataConsentGranted,
            onCheckedChange = viewModel::updateDataConsent,
            text = "Acepto que el historial de conversaciones se almacene localmente en mi dispositivo"
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        ConsentCheckbox(
            checked = uiState.moderationConsentGranted,
            onCheckedChange = viewModel::updateModerationConsent,
            text = "Entiendo que el contenido será moderado por seguridad y que los incidentes se registrarán localmente"
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // Continue Button
        Button(
            onClick = {
                viewModel.saveConsent()
                if (uiState.consentComplete) {
                    onConsentGranted()
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            enabled = uiState.canProceed && !uiState.isLoading
        ) {
            if (uiState.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                Text(
                    text = "Comenzar a Usar la App",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "Al continuar, aceptas los términos de privacidad descritos arriba",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun PrivacyInfoItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    description: String
) {
    Row(
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = MaterialTheme.colorScheme.primary
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column(
            modifier = Modifier.weight(1f)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ConsentCheckbox(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    text: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top
    ) {
        Checkbox(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f)
        )
    }
}
