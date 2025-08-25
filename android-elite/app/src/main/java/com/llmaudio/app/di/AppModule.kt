package com.llmaudio.app.di

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.llmaudio.app.network.OpenAiService
import com.llmaudio.app.data.network.ApiKeyInterceptor
import com.llmaudio.app.data.store.ApiKeyStore
import com.llmaudio.app.domain.model.AudioPlayer
import com.llmaudio.app.data.db.AppDatabase
import com.llmaudio.app.data.db.MessageDao
import com.llmaudio.app.data.db.UsageStatsDao
import com.llmaudio.app.data.repository.MessageRepository
import com.llmaudio.app.data.repository.ConsentRepository
import com.llmaudio.app.data.repository.UsageRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton
import androidx.room.Room

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideApiKeyInterceptor(store: ApiKeyStore): ApiKeyInterceptor = ApiKeyInterceptor(store)

    // Room database providers
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "llmaudio.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    @Singleton
    fun provideContext(@ApplicationContext context: Context): Context = context

    @Provides
    @Singleton
    fun provideMessageDao(db: AppDatabase): MessageDao = db.messageDao()

    @Provides
    @Singleton
    fun provideMessageRepository(dao: MessageDao): MessageRepository = MessageRepository(dao)

    @Provides
    @Singleton
    fun provideUsageStatsDao(db: AppDatabase): UsageStatsDao = db.usageStatsDao()

    @Provides
    @Singleton
    fun provideUsageRepository(dao: UsageStatsDao): UsageRepository = UsageRepository(dao)

    @Provides
    @Singleton
    fun provideConsentRepository(encryptedPrefs: SharedPreferences): ConsentRepository = ConsentRepository(encryptedPrefs)

    @Provides
    @Singleton
    fun provideOkHttpClient(
        apiKeyInterceptor: ApiKeyInterceptor,
        context: Context
    ): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
            redactHeader("Authorization")
        }

        return OkHttpClient.Builder()
            .addInterceptor(apiKeyInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()
    }
    
    @Provides
    @Singleton
    fun provideOpenAiService(client: OkHttpClient): OpenAiService {
        return Retrofit.Builder()
            .baseUrl("https://api.openai.com/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(OpenAiService::class.java)
    }
    
    @Provides
    @Singleton
    fun provideAudioPlayer(@ApplicationContext context: Context): AudioPlayer {
        return AudioPlayer(context)
    }

    @Provides
    @Singleton
    fun provideMasterKey(@ApplicationContext context: Context): MasterKey {
        return MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
    }

    @Provides
    @Singleton
    fun provideEncryptedSharedPreferences(
        @ApplicationContext context: Context,
        masterKey: MasterKey
    ): SharedPreferences {
        return EncryptedSharedPreferences.create(
            context,
            "llmaudio_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }
}
