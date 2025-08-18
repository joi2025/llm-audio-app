package com.joi2025.llmaudioapp

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * Application class for LLM Audio App
 * Initializes Hilt dependency injection and global app state
 */
@HiltAndroidApp
class LLMAudioApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize any global configurations here
        // Logging, crash reporting, etc.
    }
}
