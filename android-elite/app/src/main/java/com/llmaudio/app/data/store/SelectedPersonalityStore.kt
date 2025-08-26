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

// Define DataStore instance at the top level
private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "selected_personality_settings")

@Singleton
class SelectedPersonalityStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private object PreferencesKeys {
        val SELECTED_PERSONALITY_ID = stringPreferencesKey("selected_personality_id")
    }

    val selectedPersonalityIdFlow: Flow<String?> = context.dataStore.data
        .map { preferences ->
            preferences[PreferencesKeys.SELECTED_PERSONALITY_ID]
        }

    suspend fun saveSelectedPersonalityId(id: String) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.SELECTED_PERSONALITY_ID] = id
        }
    }

    suspend fun clearSelectedPersonalityId() {
        context.dataStore.edit { preferences ->
            preferences.remove(PreferencesKeys.SELECTED_PERSONALITY_ID)
        }
    }
}
