package com.llmaudio.app.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import com.llmaudio.app.data.repository.WebSocketRepository
import com.llmaudio.app.data.repository.MetricsRepository
import javax.inject.Singleton

/**
 * Hilt module for providing repository dependencies
 * Migrated from android-native with enhanced DI support
 */
@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    @Provides
    @Singleton
    fun provideWebSocketRepository(): WebSocketRepository {
        return WebSocketRepository()
    }

    @Provides
    @Singleton
    fun provideMetricsRepository(): MetricsRepository {
        return MetricsRepository()
    }
}
