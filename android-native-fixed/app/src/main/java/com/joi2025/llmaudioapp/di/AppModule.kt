package com.joi2025.llmaudioapp.di

import android.content.Context
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import com.joi2025.llmaudioapp.data.repository.AudioRepository
import com.joi2025.llmaudioapp.data.repository.WebSocketRepository
import com.joi2025.llmaudioapp.data.repository.MetricsRepository
import javax.inject.Singleton

/**
 * AppModule - Hilt dependency injection module
 * Provides singleton instances of repositories and services
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideWebSocketRepository(): WebSocketRepository {
        return WebSocketRepository()
    }

    @Provides
    @Singleton
    fun provideAudioRepository(
        @ApplicationContext context: Context
    ): AudioRepository {
        return AudioRepository(context)
    }
    
    @Provides
    @Singleton
    fun provideMetricsRepository(): MetricsRepository {
        return MetricsRepository()
    }
}
