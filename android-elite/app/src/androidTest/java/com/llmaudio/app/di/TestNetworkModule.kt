package com.llmaudio.app.di

import com.llmaudio.app.data.api.OpenAiService
import dagger.Module
import dagger.Provides
import dagger.hilt.components.SingletonComponent
import dagger.hilt.testing.TestInstallIn
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

/**
 * Test module that replaces NetworkModule for E2E testing.
 * Redirects all API calls to MockWebServer for hermetic testing.
 */
@Module
@TestInstallIn(
    components = [SingletonComponent::class],
    replaces = [AppModule::class] // Replace the network parts of AppModule
)
object TestNetworkModule {

    @Provides
    @Singleton
    fun provideTestOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor { chain ->
                // Redirect all requests to MockWebServer running on localhost
                val originalRequest = chain.request()
                val testRequest = originalRequest.newBuilder()
                    .url("http://localhost:8080${originalRequest.url.encodedPath}")
                    .build()
                chain.proceed(testRequest)
            }
            .addInterceptor(
                HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BODY
                }
            )
            .build()
    }

    @Provides
    @Singleton
    fun provideTestRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl("http://localhost:8080/") // MockWebServer URL
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideTestOpenAiService(retrofit: Retrofit): OpenAiService {
        return retrofit.create(OpenAiService::class.java)
    }
}
