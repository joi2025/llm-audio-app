package com.llmaudio.app.data.store

import android.content.Context
import android.util.Log
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "ApiKeyStore"

// Define DataStore at top-level (only once per app)
private val Context.dataStore by preferencesDataStore(name = "settings")

@Singleton
class ApiKeyStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private object Keys {
        val API_KEY: Preferences.Key<String> = stringPreferencesKey("api_key")
    }

    val apiKeyFlow: Flow<String> = context.dataStore.data
        .map { prefs -> prefs[Keys.API_KEY] ?: "" }
        .distinctUntilChanged()

    suspend fun setApiKey(value: String) {
        Log.d(TAG, "Saving API key (len=${value.length})")
        context.dataStore.edit { prefs ->
            prefs[Keys.API_KEY] = value
        }
        val roundtrip = getOnce()
        Log.d(TAG, "Roundtrip key len=${roundtrip.length}")
    }

    suspend fun getOnce(): String {
        return apiKeyFlow.first()
    }

    suspend fun clear() {
        context.dataStore.edit { prefs ->
            prefs.remove(Keys.API_KEY)
        }
        Log.d(TAG, "API key cleared")
    }
}
