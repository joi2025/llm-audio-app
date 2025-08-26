package com.llmaudio.app.data.api

import com.llmaudio.app.data.model.ChatCompletionRequest
import com.llmaudio.app.data.model.ModerationRequest
import com.llmaudio.app.data.model.ModerationResponse
import com.llmaudio.app.data.model.OpenAiModelsResponse // Added import for listModels
import com.llmaudio.app.data.model.TTSRequest
import com.llmaudio.app.data.model.TranscriptionResponse
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET // Added import for GET
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Streaming

interface OpenAiService {

    // Speech-to-Text (STT)
    @Multipart
    @POST("v1/audio/transcriptions")
    suspend fun transcribeAudio(
        @Header("Authorization") authorization: String,
        @Part file: MultipartBody.Part,
        @Part("model") model: RequestBody, // Model is passed from ViewModel
        @Part("language") language: RequestBody // Language is passed from ViewModel
    ): Response<TranscriptionResponse>

    // Chat Completions with Streaming
    @Streaming
    @POST("v1/chat/completions")
    suspend fun streamChatCompletion(
        @Header("Authorization") authorization: String,
        @Body request: ChatCompletionRequest
    ): Response<ResponseBody>

    // Text-to-Speech (TTS)
    @Streaming
    @POST("v1/audio/speech")
    suspend fun generateSpeech(
        @Header("Authorization") authorization: String,
        @Body request: TTSRequest
    ): Response<ResponseBody>

    // Moderations
    @POST("v1/moderations")
    suspend fun moderateContent(
        @Header("Authorization") authorization: String,
        @Body request: ModerationRequest
    ): Response<ModerationResponse>

    // List Models (for API Key validation)
    @GET("v1/models")
    suspend fun listModels(
        @Header("Authorization") authorization: String
    ): Response<OpenAiModelsResponse>
}
