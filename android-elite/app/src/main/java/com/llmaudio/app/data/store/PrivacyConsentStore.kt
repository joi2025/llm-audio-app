package com.llmaudio.app.data.store

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.privacyDataStore: DataStore<Preferences> by preferencesDataStore(name = "privacy_preferences")

@Singleton
class PrivacyConsentStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val dataStore = context.privacyDataStore
    
    companion object {
        private val PRIVACY_CONSENT_KEY = booleanPreferencesKey("privacy_consent_accepted")
        private val MICROPHONE_PERMISSION_EXPLAINED_KEY = booleanPreferencesKey("microphone_permission_explained")
    }
    
    /**
     * Flow que indica si el usuario ha aceptado el consentimiento de privacidad
     */
    val hasAcceptedPrivacyConsent: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[PRIVACY_CONSENT_KEY] ?: false
    }
    
    /**
     * Flow que indica si ya se explicó el permiso de micrófono
     */
    val hasMicrophonePermissionBeenExplained: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[MICROPHONE_PERMISSION_EXPLAINED_KEY] ?: false
    }
    
    /**
     * Guarda que el usuario aceptó el consentimiento de privacidad
     */
    suspend fun acceptPrivacyConsent() {
        dataStore.edit { preferences ->
            preferences[PRIVACY_CONSENT_KEY] = true
        }
    }
    
    /**
     * Marca que se explicó el permiso de micrófono
     */
    suspend fun markMicrophonePermissionExplained() {
        dataStore.edit { preferences ->
            preferences[MICROPHONE_PERMISSION_EXPLAINED_KEY] = true
        }
    }
    
    /**
     * Resetea todas las preferencias de privacidad (para testing o reset completo)
     */
    suspend fun resetPrivacyPreferences() {
        dataStore.edit { preferences ->
            preferences.clear()
        }
    }
}
