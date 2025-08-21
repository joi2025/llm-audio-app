package com.llmaudio.app.presentation

import android.Manifest
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.llmaudio.app.presentation.screens.MainScreen
import com.llmaudio.app.presentation.screens.HistoryScreen
import com.llmaudio.app.presentation.theme.LLMAudioTheme
import dagger.hilt.android.AndroidEntryPoint
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import android.os.Build
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.platform.LocalTextToolbar
import androidx.compose.ui.platform.TextToolbar
import androidx.compose.ui.platform.TextToolbarStatus

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        // Permission result handled
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Request microphone permission
        requestPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        
        setContent {
            val isMiui = remember {
                val manufacturer = (Build.MANUFACTURER ?: "").lowercase()
                val brand = (Build.BRAND ?: "").lowercase()
                manufacturer.contains("xiaomi") ||
                        brand.contains("xiaomi") || brand.contains("redmi") || brand.contains("poco")
            }
            if (isMiui) {
                val noToolbar = remember {
                    object : TextToolbar {
                        override val status: TextToolbarStatus
                            get() = TextToolbarStatus.Hidden

                        override fun showMenu(
                            rect: Rect,
                            onCopyRequested: (() -> Unit)?,
                            onPasteRequested: (() -> Unit)?,
                            onCutRequested: (() -> Unit)?,
                            onSelectAllRequested: (() -> Unit)?
                        ) {
                            // no-op: prevent MIUI selection toolbar crash
                        }

                        override fun hide() {
                            // no-op
                        }
                    }
                }
                CompositionLocalProvider(LocalTextToolbar provides noToolbar) {
                    LLMAudioTheme {
                        Surface(
                            modifier = Modifier.fillMaxSize(),
                            color = MaterialTheme.colorScheme.background
                        ) {
                            val navController = rememberNavController()
                            NavHost(navController = navController, startDestination = "main") {
                                composable("main") {
                                    MainScreen(
                                        onNavigateToHistory = { navController.navigate("history") }
                                    )
                                }
                                composable("history") {
                                    HistoryScreen(
                                        onBack = { navController.popBackStack() }
                                    )
                                }
                            }
                        }
                    }
                }
            } else {
                LLMAudioTheme {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background
                    ) {
                        val navController = rememberNavController()
                        NavHost(navController = navController, startDestination = "main") {
                            composable("main") {
                                MainScreen(
                                    onNavigateToHistory = { navController.navigate("history") }
                                )
                            }
                            composable("history") {
                                HistoryScreen(
                                    onBack = { navController.popBackStack() }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
