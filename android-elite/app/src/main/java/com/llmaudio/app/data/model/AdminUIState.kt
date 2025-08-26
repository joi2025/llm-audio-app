package com.llmaudio.app.data.model

data class AdminUIState(
    // Campos existentes
    val loading: Boolean = false,
    val consents: List<String> = emptyList(),
    val metrics: List<String> = emptyList(),
    val usages: List<String> = emptyList(),

    // Campos añadidos del AdminProViewModel (basados en la definición anterior en AdminModels.kt)
    val micPermissionGranted: Boolean = false,
    val isRecording: Boolean = false,
    val lastError: String? = null
)
