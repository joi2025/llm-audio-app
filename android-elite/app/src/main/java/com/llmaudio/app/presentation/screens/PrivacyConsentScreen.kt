/**
 * PrivacyConsentScreen - Pantalla de Consentimiento de Privacidad
 * 
 * Implementa un flujo robusto de consentimiento que cumple con regulaciones de privacidad.
 * Explica claramente qué datos se recolectan, cómo se usan y dónde se almacenan.
 * Requiere consentimiento explícito antes de solicitar permisos de micrófono.
 */
package com.llmaudio.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrivacyConsentScreen(
    onConsentGiven: () -> Unit,
    onConsentDenied: () -> Unit
) {
    var hasReadPolicy by remember { mutableStateOf(false) }
    var acceptsDataCollection by remember { mutableStateOf(false) }
    var acceptsProcessing by remember { mutableStateOf(false) }
    
    val canProceed = hasReadPolicy && acceptsDataCollection && acceptsProcessing
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF0F172A),
                        Color(0xFF1E293B),
                        Color(0xFF334155)
                    )
                )
            )
            .padding(24.dp)
    ) {
        // Header
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp),
            colors = CardDefaults.cardColors(
                containerColor = Color(0xFF1E293B).copy(alpha = 0.8f)
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Default.Security,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = Color(0xFF3B82F6)
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                Text(
                    text = "Política de Privacidad",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    textAlign = TextAlign.Center
                )
                
                Text(
                    text = "Tu privacidad es nuestra prioridad",
                    fontSize = 14.sp,
                    color = Color(0xFF94A3B8),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
        
        // Scrollable Content
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
        ) {
            // Data Collection Section
            PrivacySection(
                icon = Icons.Default.Mic,
                title = "Datos que Recolectamos",
                color = Color(0xFF10B981)
            ) {
                PrivacyItem(
                    "Audio de Voz",
                    "Grabamos tu voz únicamente cuando presionas el botón de grabación para convertirla en texto."
                )
                PrivacyItem(
                    "Historial de Conversaciones",
                    "Almacenamos localmente el historial de tus conversaciones para mejorar tu experiencia."
                )
                PrivacyItem(
                    "Métricas de Rendimiento",
                    "Recolectamos métricas anónimas de latencia y uso para optimizar la aplicación."
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Data Usage Section
            PrivacySection(
                icon = Icons.Default.Cloud,
                title = "Cómo Usamos tus Datos",
                color = Color(0xFF3B82F6)
            ) {
                PrivacyItem(
                    "Transcripción de Voz",
                    "Tu audio se envía a OpenAI Whisper para convertirlo en texto. El audio no se almacena en sus servidores."
                )
                PrivacyItem(
                    "Generación de Respuestas",
                    "El texto transcrito se envía a modelos de IA (GPT-4) para generar respuestas inteligentes."
                )
                PrivacyItem(
                    "Síntesis de Voz",
                    "Las respuestas se convierten en audio usando tecnología TTS para una experiencia natural."
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Data Storage Section
            PrivacySection(
                icon = Icons.Default.Storage,
                title = "Dónde se Almacenan",
                color = Color(0xFFF59E0B)
            ) {
                PrivacyItem(
                    "Almacenamiento Local",
                    "Todo tu historial y configuraciones se guardan localmente en tu dispositivo usando encriptación."
                )
                PrivacyItem(
                    "Procesamiento Temporal",
                    "Los datos se procesan temporalmente en servidores seguros y se eliminan inmediatamente después."
                )
                PrivacyItem(
                    "Sin Almacenamiento Permanente",
                    "No almacenamos permanentemente tu voz o conversaciones en servidores externos."
                )
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Consent Checkboxes
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFF1E293B).copy(alpha = 0.6f)
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        text = "Consentimiento Requerido",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                    
                    ConsentCheckbox(
                        checked = hasReadPolicy,
                        onCheckedChange = { hasReadPolicy = it },
                        text = "He leído y entiendo esta política de privacidad"
                    )
                    
                    ConsentCheckbox(
                        checked = acceptsDataCollection,
                        onCheckedChange = { acceptsDataCollection = it },
                        text = "Acepto que mi voz sea procesada para transcripción y respuestas de IA"
                    )
                    
                    ConsentCheckbox(
                        checked = acceptsProcessing,
                        onCheckedChange = { acceptsProcessing = it },
                        text = "Entiendo que los datos se procesan temporalmente en servidores externos seguros"
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Action Buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = onConsentDenied,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = Color(0xFFEF4444)
                )
            ) {
                Text("Rechazar")
            }
            
            Button(
                onClick = onConsentGiven,
                enabled = canProceed,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (canProceed) Color(0xFF10B981) else Color(0xFF374151),
                    contentColor = Color.White
                )
            ) {
                Text("Aceptar y Continuar")
            }
        }
    }
}

@Composable
private fun PrivacySection(
    icon: ImageVector,
    title: String,
    color: Color,
    content: @Composable () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.1f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 12.dp)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(24.dp)
                )
                
                Spacer(modifier = Modifier.width(8.dp))
                
                Text(
                    text = title,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
            
            content()
        }
    }
}

@Composable
private fun PrivacyItem(
    title: String,
    description: String
) {
    Column(
        modifier = Modifier.padding(vertical = 4.dp)
    ) {
        Text(
            text = "• $title",
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = Color.White
        )
        Text(
            text = description,
            fontSize = 12.sp,
            color = Color(0xFF94A3B8),
            modifier = Modifier.padding(start = 12.dp, top = 2.dp)
        )
    }
}

@Composable
private fun ConsentCheckbox(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    text: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Checkbox(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = CheckboxDefaults.colors(
                checkedColor = Color(0xFF10B981),
                uncheckedColor = Color(0xFF6B7280)
            )
        )
        
        Spacer(modifier = Modifier.width(8.dp))
        
        Text(
            text = text,
            fontSize = 13.sp,
            color = Color.White,
            modifier = Modifier.weight(1f)
        )
    }
}
