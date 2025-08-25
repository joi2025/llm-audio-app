package com.llmaudio.app.data.store

import android.content.SharedPreferences
import android.util.Log
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "ApiKeyStore"
private const val API_KEY_PREF = "api_key"

@Singleton
class ApiKeyStore @Inject constructor(
    private val encryptedPrefs: SharedPreferences
) {
    private val _apiKeyFlow = MutableStateFlow(getCurrentApiKey())
    
    val apiKeyFlow: Flow<String> = _apiKeyFlow.distinctUntilChanged()

    private fun getCurrentApiKey(): String {
        return encryptedPrefs.getString(API_KEY_PREF, "") ?: ""
    }

    suspend fun setApiKey(value: String) {
        Log.d(TAG, "Saving encrypted API key (len=${value.length})")
        
        // Store in encrypted preferences
        encryptedPrefs.edit()
            .putString(API_KEY_PREF, value)
            .apply()
        
        // Update flow
        _apiKeyFlow.value = value
        
        // Verify storage
        val roundtrip = getOnce()
        Log.d(TAG, "Encrypted roundtrip key len=${roundtrip.length}")
    }

    suspend fun getOnce(): String {
        return apiKeyFlow.first()
    }

    suspend fun clear() {
        Log.d(TAG, "Clearing encrypted API key")
        
        // Remove from encrypted preferences
        encryptedPrefs.edit()
            .remove(API_KEY_PREF)
            .apply()
        
        // Update flow
        _apiKeyFlow.value = ""
        
        Log.d(TAG, "Encrypted API key cleared")
    }
}
