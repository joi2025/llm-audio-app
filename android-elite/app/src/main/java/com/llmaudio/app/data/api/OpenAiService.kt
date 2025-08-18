package com.llmaudio.app.data.api

import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Call
import retrofit2.http.*

interface OpenAiService {
    
    // Speech-to-Text (STT)
    @Multipart
    @POST("v1/audio/transcriptions")
    suspend fun transcribeAudio(
        @Header("Authorization") authorization: String,
        @Part file: MultipartBody.Part,
        @Part("model") model: RequestBody = RequestBody.create(null, "whisper-1"),
        @Part("language") language: RequestBody = RequestBody.create(null, "es")
    ): TranscriptionResponse
    
    // Chat Completions with Streaming
    @Streaming
    @POST("v1/chat/completions")
    fun streamChatCompletion(
        @Header("Authorization") authorization: String,
        @Body request: ChatCompletionRequest
    ): Call<ResponseBody>
    
    // Text-to-Speech (TTS)
    @Streaming
    @POST("v1/audio/speech")
    fun generateSpeech(
        @Header("Authorization") authorization: String,
        @Body request: TTSRequest
    ): Call<ResponseBody>
}

// Data Models
data class TranscriptionResponse(
    val text: String
)

data class ChatCompletionRequest(
    val model: String = "gpt-4-turbo-preview",
    val messages: List<Message>,
    val temperature: Double = 0.7,
    val max_tokens: Int = 500,
    val stream: Boolean = true
)

data class Message(
    val role: String,
    val content: String
)

data class TTSRequest(
    val model: String = "tts-1",
    val input: String,
    val voice: String = "nova",
    val response_format: String = "mp3",
    val speed: Double = 1.0
)
