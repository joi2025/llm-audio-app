package com.joi2025.llmaudioapp.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import dagger.hilt.android.AndroidEntryPoint
import com.joi2025.llmaudioapp.ui.screens.MainScreen
import com.joi2025.llmaudioapp.ui.theme.LLMAudioAppTheme
import com.joi2025.llmaudioapp.viewmodel.MainViewModel

/**
 * MainActivity - Entry point de la app nativa
 * Maneja permisos y configura Jetpack Compose
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            // Permiso concedido
        } else {
            // Permiso denegado - mostrar mensaje
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Mantener pantalla encendida para asistente de voz
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        
        // Verificar permisos de audio
        checkAudioPermission()
        
        setContent {
            LLMAudioAppTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val viewModel: MainViewModel = viewModel()
                    MainScreen(viewModel = viewModel)
                }
            }
        }
    }
    
    private fun checkAudioPermission() {
        when {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED -> {
                // Permiso ya concedido
            }
            else -> {
                // Solicitar permiso
                requestPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            }
        }
    }
    
    override fun onResume() {
        super.onResume()
        // Gestión de audio focus cuando la app vuelve al primer plano
    }
    
    override fun onPause() {
        super.onPause()
        // Liberar audio focus cuando la app pasa a segundo plano
    }
}
