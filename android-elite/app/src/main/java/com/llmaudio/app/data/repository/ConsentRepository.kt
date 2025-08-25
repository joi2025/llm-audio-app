package com.llmaudio.app.data.repository

import android.content.SharedPreferences
import android.util.Log
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import java.time.LocalDateTime
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "ConsentRepository"
private const val API_KEY_PREF = "api_key"
private const val VOICE_CONSENT_PREF = "voice_consent"
private const val DATA_CONSENT_PREF = "data_consent"
private const val MODERATION_CONSENT_PREF = "moderation_consent"
private const val CONSENT_TIMESTAMP_PREF = "consent_timestamp"
private const val FIRST_LAUNCH_PREF = "first_launch"

@Singleton
class ConsentRepository @Inject constructor(
    private val encryptedPrefs: SharedPreferences
) {
    
    private val _consentFlow = MutableStateFlow(isConsentGranted())
    val consentFlow: Flow<Boolean> = _consentFlow.distinctUntilChanged()
    
    private val _apiKeyFlow = MutableStateFlow(getApiKey())
    val apiKeyFlow: Flow<String> = _apiKeyFlow.distinctUntilChanged()
    
    /**
     * Check if this is the first app launch
     */
    fun isFirstLaunch(): Boolean {
        return !encryptedPrefs.getBoolean(FIRST_LAUNCH_PREF, false)
    }
    
    /**
     * Check if all required consents are granted
     */
    fun isConsentGranted(): Boolean {
        return encryptedPrefs.getBoolean(VOICE_CONSENT_PREF, false) &&
               encryptedPrefs.getBoolean(DATA_CONSENT_PREF, false) &&
               encryptedPrefs.getBoolean(MODERATION_CONSENT_PREF, false) &&
               getApiKey().isNotBlank()
    }
    
    /**
     * Get stored API key
     */
    fun getApiKey(): String {
        return encryptedPrefs.getString(API_KEY_PREF, "") ?: ""
    }
    
    /**
     * Save all consent preferences and API key
     */
    suspend fun saveConsent(
        apiKey: String,
        voiceConsent: Boolean,
        dataConsent: Boolean,
        moderationConsent: Boolean
    ) {
        Log.d(TAG, "Saving consent preferences and encrypted API key")
        
        encryptedPrefs.edit()
            .putString(API_KEY_PREF, apiKey)
            .putBoolean(VOICE_CONSENT_PREF, voiceConsent)
            .putBoolean(DATA_CONSENT_PREF, dataConsent)
            .putBoolean(MODERATION_CONSENT_PREF, moderationConsent)
            .putString(CONSENT_TIMESTAMP_PREF, LocalDateTime.now().toString())
            .putBoolean(FIRST_LAUNCH_PREF, true)
            .apply()
        
        // Update flows
        _apiKeyFlow.value = apiKey
        _consentFlow.value = isConsentGranted()
        
        Log.d(TAG, "Consent and API key saved successfully")
    }
    
    /**
     * Update API key only
     */
    suspend fun updateApiKey(apiKey: String) {
        Log.d(TAG, "Updating encrypted API key (len=${apiKey.length})")
        
        encryptedPrefs.edit()
            .putString(API_KEY_PREF, apiKey)
            .apply()
        
        _apiKeyFlow.value = apiKey
        _consentFlow.value = isConsentGranted()
    }
    
    /**
     * Revoke all consents and clear data
     */
    suspend fun revokeConsent() {
        Log.d(TAG, "Revoking all consents and clearing encrypted data")
        
        encryptedPrefs.edit()
            .remove(API_KEY_PREF)
            .putBoolean(VOICE_CONSENT_PREF, false)
            .putBoolean(DATA_CONSENT_PREF, false)
            .putBoolean(MODERATION_CONSENT_PREF, false)
            .remove(CONSENT_TIMESTAMP_PREF)
            .apply()
        
        _apiKeyFlow.value = ""
        _consentFlow.value = false
        
        Log.d(TAG, "Consent revoked and data cleared")
    }
    
    /**
     * Get consent timestamp
     */
    fun getConsentTimestamp(): String? {
        return encryptedPrefs.getString(CONSENT_TIMESTAMP_PREF, null)
    }
    
    /**
     * Check individual consent status
     */
    fun getConsentStatus(): ConsentStatus {
        return ConsentStatus(
            voiceConsent = encryptedPrefs.getBoolean(VOICE_CONSENT_PREF, false),
            dataConsent = encryptedPrefs.getBoolean(DATA_CONSENT_PREF, false),
            moderationConsent = encryptedPrefs.getBoolean(MODERATION_CONSENT_PREF, false),
            hasApiKey = getApiKey().isNotBlank(),
            timestamp = getConsentTimestamp()
        )
    }
}

data class ConsentStatus(
    val voiceConsent: Boolean,
    val dataConsent: Boolean,
    val moderationConsent: Boolean,
    val hasApiKey: Boolean,
    val timestamp: String?
) {
    val isComplete: Boolean = voiceConsent && dataConsent && moderationConsent && hasApiKey
}
