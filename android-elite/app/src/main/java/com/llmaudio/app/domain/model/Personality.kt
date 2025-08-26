package com.llmaudio.app.domain.model

import androidx.compose.ui.graphics.Color

data class Personality(
    val id: String,
    val name: String,
    val systemPrompt: String,
    val voice: String, // ID de la voz para TTS (ej. "nova", "shimmer" para OpenAI)
    val modelName: String = "gpt-4-turbo",
    val temperature: Float = 0.7f,
    val isDefault: Boolean = false,
    val iconName: String? = null,
    val color: Color,
    val emoji: String,
    val description: String,
    val languageCode: String = "es-ES", // Para TTS si es necesario
    val maxTokensDefault: Int = 200,    // Límite por defecto para respuestas
    val maxTokensExtended: Int = 800    // Límite para respuestas detalladas
)
