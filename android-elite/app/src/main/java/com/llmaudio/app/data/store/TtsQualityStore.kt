package com.llmaudio.app.data.store

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

// Define the DataStore instance at the top level
private val Context.ttsQualityDataStore: DataStore<Preferences> by preferencesDataStore(name = "tts_quality_prefs")

object TtsQualityKeys {
    val TTS_MODEL = stringPreferencesKey("tts_model")
}

@Singleton
class TtsQualityStore @Inject constructor(@ApplicationContext private val context: Context) {

    val selectedTtsModelFlow: Flow<String> = context.ttsQualityDataStore.data
        .map { preferences ->
            preferences[TtsQualityKeys.TTS_MODEL] ?: "tts-1" // Default to "tts-1" (Standard)
        }

    suspend fun setSelectedTtsModel(model: String) {
        context.ttsQualityDataStore.edit { preferences ->
            preferences[TtsQualityKeys.TTS_MODEL] = model
        }
    }

    companion object {
        const val TTS_STANDARD = "tts-1"
        const val TTS_HD = "tts-1-hd"
    }
}
