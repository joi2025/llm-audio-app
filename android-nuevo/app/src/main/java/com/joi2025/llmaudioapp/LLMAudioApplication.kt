package com.joi2025.llmaudioapp

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * Application class para LLM Audio App
 * Configuración de Hilt para dependency injection
 */
@HiltAndroidApp
class LLMAudioApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Inicialización de la aplicación
        if (BuildConfig.DEBUG_LOGS) {
            android.util.Log.d("LLMAudioApp", "Aplicación iniciada - Modo Debug")
        }
    }
}
