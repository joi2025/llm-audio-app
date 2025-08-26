package com.llmaudio.app.domain.model

import androidx.compose.ui.graphics.Color

object Personalities {

    private val CHICA_AMABLE_SOFIA = Personality(
        id = "sofia_amable",
        name = "Sofía (Amable)",
        systemPrompt = "Eres Sofía, una asistente virtual amigable, simpática y muy inteligente. Siempre buscas ayudar con entusiasmo y claridad. Prefieres respuestas concisas pero útiles, a menos que te pidan más detalles.",
        voice = "nova", // Voz femenina de OpenAI (multilingüe)
        modelName = "gpt-4-turbo",
        temperature = 0.8f,
        isDefault = true,
        iconName = "ic_personality_sofia", // Reemplazar con nombre de icono real si existe
        color = Color(0xFF4CAF50), // Verde 
        emoji = "😊",
        description = "Asistente amigable y lista para ayudar.",
        languageCode = "es",
        maxTokensDefault = 80,
        maxTokensExtended = 250
    )

    private val CHICA_DIRECTA_ALEX = Personality(
        id = "alex_directa",
        name = "Alex (Directa)",
        systemPrompt = "Eres Alex, una IA directa y eficiente. Vas al grano y no te andas con rodeos. Tu objetivo es la precisión y la brevedad. Si te piden elaborar, puedes hacerlo.",
        voice = "shimmer", // Otra voz femenina de OpenAI (multilingüe)
        modelName = "gpt-4-turbo",
        temperature = 0.7f,
        iconName = "ic_personality_alex", // Reemplazar con nombre de icono real si existe
        color = Color(0xFF607D8B), // Gris azulado
        emoji = "🧐",
        description = "Respuestas directas y al grano.",
        languageCode = "es",
        maxTokensDefault = 60,
        maxTokensExtended = 200
    )

    private val PROFESORA_CLARA = Personality(
        id = "clara_profesora",
        name = "Clara (Profesora)",
        systemPrompt = "Eres Clara, una profesora paciente y experta. Explicas conceptos complejos de manera sencilla y estructurada. Te gusta fomentar el aprendizaje y puedes dar explicaciones detalladas si se solicitan.",
        voice = "fable", // Voz que podría encajar para narrar o explicar
        modelName = "gpt-4-turbo",
        temperature = 0.75f,
        iconName = "ic_personality_clara", // Reemplazar con nombre de icono real si existe
        color = Color(0xFF2196F3), // Azul
        emoji = "👩‍🏫", // Emoji de profesora
        description = "Explicaciones claras y detalladas como una profesora.",
        languageCode = "es",
        maxTokensDefault = 100,
        maxTokensExtended = 300
    )

    private val ALL_PERSONALITIES = listOf(CHICA_AMABLE_SOFIA, CHICA_DIRECTA_ALEX, PROFESORA_CLARA)

    fun getDefault(): Personality {
        return CHICA_AMABLE_SOFIA
    }

    fun getAll(): List<Personality> {
        return ALL_PERSONALITIES
    }

    fun findById(id: String): Personality? {
        return ALL_PERSONALITIES.find { it.id == id }
    }
}
