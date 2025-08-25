package com.llmaudio.app.presentation

import android.Manifest
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.llmaudio.app.data.store.PrivacyConsentStore
import com.llmaudio.app.presentation.components.PrivacyConsentDialog
import com.llmaudio.app.presentation.screens.MainScreen
import com.llmaudio.app.presentation.screens.HistoryScreen
import com.llmaudio.app.presentation.screens.AdminProScreen
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
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MainActivityViewModel @Inject constructor(
    private val privacyConsentStore: PrivacyConsentStore
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(MainActivityUiState.Loading)
    val uiState: StateFlow<MainActivityUiState> = _uiState.asStateFlow()
    
    init {
        viewModelScope.launch {
            privacyConsentStore.hasAcceptedPrivacyConsent.collect { hasConsent ->
                _uiState.value = if (hasConsent) {
                    MainActivityUiState.ConsentAccepted
                } else {
                    MainActivityUiState.ConsentRequired
                }
            }
        }
    }
    
    fun acceptPrivacyConsent() {
        viewModelScope.launch {
            privacyConsentStore.acceptPrivacyConsent()
        }
    }
    
    fun declinePrivacyConsent() {
        viewModelScope.launch {
            _uiState.value = MainActivityUiState.ConsentDeclined
        }
    }
}

sealed class MainActivityUiState {
    object Loading : MainActivityUiState()
    object ConsentRequired : MainActivityUiState()
    object ConsentAccepted : MainActivityUiState()
    object ConsentDeclined : MainActivityUiState()
}

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (!isGranted) {
            // Usuario rechazó el permiso después de aceptar consentimiento
            finish()
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        setContent {
            val viewModel: MainActivityViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            
            when (uiState) {
                MainActivityUiState.Loading -> {
                    // Mostrar splash screen o loading
                    LLMAudioTheme {
                        Surface(
                            modifier = Modifier.fillMaxSize(),
                            color = MaterialTheme.colorScheme.background
                        ) {
                            // Loading content
                        }
                    }
                }
                
                MainActivityUiState.ConsentRequired -> {
                    LLMAudioTheme {
                        PrivacyConsentDialog(
                            onAccept = {
                                viewModel.acceptPrivacyConsent()
                                // Solicitar permiso de micrófono después de aceptar
                                requestPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                            },
                            onDecline = {
                                viewModel.declinePrivacyConsent()
                            }
                        )
                    }
                }
                
                MainActivityUiState.ConsentDeclined -> {
                    // Usuario rechazó el consentimiento, cerrar app
                    LaunchedEffect(Unit) {
                        finish()
                    }
                }
                
                MainActivityUiState.ConsentAccepted -> {
                    // Mostrar la aplicación principal
                    MainAppContent()
                }
            }
        }
    }
    
    @Composable
    private fun MainAppContent() {
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
                AppNavigation()
            }
        } else {
            AppNavigation()
        }
    }
    
    @Composable
    private fun AppNavigation() {
        LLMAudioTheme {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = MaterialTheme.colorScheme.background
            ) {
                val navController = rememberNavController()
                NavHost(navController = navController, startDestination = "main") {
                    composable("main") {
                        MainScreen(
                            onNavigateToHistory = { navController.navigate("history") },
                            onNavigateToAdmin = { navController.navigate("admin") }
                        )
                    }
                    composable("history") {
                        HistoryScreen(
                            onBack = { navController.popBackStack() }
                        )
                    }
                    composable("admin") {
                        AdminProScreen(
                            onBackClick = { navController.popBackStack() }
                        )
                    }
                }
            }
        }
    }
}
