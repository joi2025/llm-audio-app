/**
 * PrivacyRepository - Gestión Segura de Consentimiento de Privacidad
 * 
 * Maneja el almacenamiento encriptado del consentimiento del usuario y preferencias de privacidad.
 * Utiliza EncryptedSharedPreferences para proteger datos sensibles.
 */
package com.llmaudio.app.data.repository

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PrivacyRepository @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val PREFS_NAME = "privacy_consent_prefs"
        private const val KEY_CONSENT_GIVEN = "consent_given"
        private const val KEY_CONSENT_TIMESTAMP = "consent_timestamp"
        private const val KEY_PRIVACY_VERSION = "privacy_version"
        private const val KEY_DATA_COLLECTION_CONSENT = "data_collection_consent"
        private const val KEY_PROCESSING_CONSENT = "processing_consent"
        private const val KEY_MICROPHONE_PERMISSION_REQUESTED = "microphone_permission_requested"
        
        private const val CURRENT_PRIVACY_VERSION = "1.0.0"
    }
    
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val encryptedPrefs = EncryptedSharedPreferences.create(
        context,
        PREFS_NAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    private val _consentState = MutableStateFlow(getConsentState())
    val consentState: Flow<ConsentState> = _consentState.asStateFlow()
    
    data class ConsentState(
        val hasGivenConsent: Boolean = false,
        val consentTimestamp: Long = 0L,
        val privacyVersion: String = "",
        val dataCollectionConsent: Boolean = false,
        val processingConsent: Boolean = false,
        val microphonePermissionRequested: Boolean = false,
        val needsConsentUpdate: Boolean = false
    )
    
    /**
     * Verifica si el usuario ha dado su consentimiento válido
     */
    fun hasValidConsent(): Boolean {
        val state = getConsentState()
        return state.hasGivenConsent && 
               state.dataCollectionConsent && 
               state.processingConsent &&
               state.privacyVersion == CURRENT_PRIVACY_VERSION
    }
    
    /**
     * Verifica si se necesita mostrar la pantalla de consentimiento
     */
    fun needsConsentScreen(): Boolean {
        return !hasValidConsent()
    }
    
    /**
     * Guarda el consentimiento del usuario de forma segura
     */
    fun saveConsent(
        dataCollectionConsent: Boolean,
        processingConsent: Boolean
    ) {
        val timestamp = System.currentTimeMillis()
        
        encryptedPrefs.edit().apply {
            putBoolean(KEY_CONSENT_GIVEN, true)
            putLong(KEY_CONSENT_TIMESTAMP, timestamp)
            putString(KEY_PRIVACY_VERSION, CURRENT_PRIVACY_VERSION)
            putBoolean(KEY_DATA_COLLECTION_CONSENT, dataCollectionConsent)
            putBoolean(KEY_PROCESSING_CONSENT, processingConsent)
            apply()
        }
        
        _consentState.value = getConsentState()
    }
    
    /**
     * Revoca el consentimiento del usuario
     */
    fun revokeConsent() {
        encryptedPrefs.edit().apply {
            putBoolean(KEY_CONSENT_GIVEN, false)
            putBoolean(KEY_DATA_COLLECTION_CONSENT, false)
            putBoolean(KEY_PROCESSING_CONSENT, false)
            apply()
        }
        
        _consentState.value = getConsentState()
    }
    
    /**
     * Marca que se ha solicitado el permiso de micrófono
     */
    fun markMicrophonePermissionRequested() {
        encryptedPrefs.edit().apply {
            putBoolean(KEY_MICROPHONE_PERMISSION_REQUESTED, true)
            apply()
        }
        
        _consentState.value = getConsentState()
    }
    
    /**
     * Verifica si se puede solicitar el permiso de micrófono
     */
    fun canRequestMicrophonePermission(): Boolean {
        return hasValidConsent()
    }
    
    /**
     * Obtiene el estado actual del consentimiento
     */
    private fun getConsentState(): ConsentState {
        val hasConsent = encryptedPrefs.getBoolean(KEY_CONSENT_GIVEN, false)
        val timestamp = encryptedPrefs.getLong(KEY_CONSENT_TIMESTAMP, 0L)
        val version = encryptedPrefs.getString(KEY_PRIVACY_VERSION, "") ?: ""
        val dataConsent = encryptedPrefs.getBoolean(KEY_DATA_COLLECTION_CONSENT, false)
        val processingConsent = encryptedPrefs.getBoolean(KEY_PROCESSING_CONSENT, false)
        val micRequested = encryptedPrefs.getBoolean(KEY_MICROPHONE_PERMISSION_REQUESTED, false)
        
        val needsUpdate = hasConsent && version != CURRENT_PRIVACY_VERSION
        
        return ConsentState(
            hasGivenConsent = hasConsent,
            consentTimestamp = timestamp,
            privacyVersion = version,
            dataCollectionConsent = dataConsent,
            processingConsent = processingConsent,
            microphonePermissionRequested = micRequested,
            needsConsentUpdate = needsUpdate
        )
    }
    
    /**
     * Obtiene información de auditoría del consentimiento
     */
    fun getConsentAuditInfo(): Map<String, Any> {
        val state = getConsentState()
        return mapOf(
            "consent_given" to state.hasGivenConsent,
            "consent_timestamp" to state.consentTimestamp,
            "privacy_version" to state.privacyVersion,
            "data_collection_consent" to state.dataCollectionConsent,
            "processing_consent" to state.processingConsent,
            "microphone_requested" to state.microphonePermissionRequested,
            "consent_date" to if (state.consentTimestamp > 0) {
                java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault())
                    .format(java.util.Date(state.consentTimestamp))
            } else "Never"
        )
    }
    
    /**
     * Limpia todos los datos de consentimiento (para testing o reset completo)
     */
    fun clearAllConsentData() {
        encryptedPrefs.edit().clear().apply()
        _consentState.value = getConsentState()
    }
}
