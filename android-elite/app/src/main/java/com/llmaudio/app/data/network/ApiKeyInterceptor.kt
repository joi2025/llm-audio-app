package com.llmaudio.app.data.network

import android.util.Log
import com.llmaudio.app.data.store.ApiKeyStore
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeoutOrNull
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "ApiKeyInterceptor"

@Singleton
class ApiKeyInterceptor @Inject constructor(
    private val store: ApiKeyStore
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()

        // If header already present, don't add another one
        val existing = original.header("Authorization")
        if (existing != null) {
            Log.d(TAG, "Authorization header already present (len=${existing.length})")
            return chain.proceed(original)
        }

        val key = runBlocking {
            withTimeoutOrNull(100) { store.getOnce() }
        }.orEmpty()

        if (key.isBlank()) {
            Log.w(TAG, "API key missing; proceeding without Authorization header")
            return chain.proceed(original)
        }

        val authed = original.newBuilder()
            .header("Authorization", "Bearer $key")
            .build()
        Log.d(TAG, "Authorization header attached (len=${key.length})")
        return chain.proceed(authed)
    }
}
