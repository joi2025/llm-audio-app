package com.llmaudio.app.network

import com.llmaudio.app.data.model.*
import okhttp3.MultipartBody
import okhttp3.ResponseBody
import retrofit2.Call
import retrofit2.Response
import retrofit2.http.*

interface OpenAiService {
    
    @POST("v1/chat/completions")
    suspend fun chatCompletion(
        @Header("Authorization") authorization: String,
        @Body request: ChatCompletionRequest
    ): Response<ChatCompletionResponse>
    
    @POST("v1/chat/completions")
    @Streaming
    fun streamChatCompletion(
        @Header("Authorization") authorization: String,
        @Body request: ChatCompletionRequest
    ): Call<ResponseBody>
    
    @Multipart
    @POST("v1/audio/speech")
    fun generateSpeech(
        @Header("Authorization") authorization: String,
        @Body request: TTSRequest
    ): Call<ResponseBody>
    
    @Multipart
    @POST("v1/audio/transcriptions")
    suspend fun transcribeAudio(
        @Header("Authorization") authorization: String,
        @Part file: MultipartBody.Part,
        @Part model: MultipartBody.Part
    ): Response<TranscriptionResponse>
    
    @POST("v1/moderations")
    suspend fun moderateContent(
        @Header("Authorization") authorization: String,
        @Body request: ModerationRequest
    ): Response<ModerationResponse>
}
