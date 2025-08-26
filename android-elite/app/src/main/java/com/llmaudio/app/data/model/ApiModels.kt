package com.llmaudio.app.data.model

import com.google.gson.annotations.SerializedName

/**
 * Data models for API communication
 */

data class Message(
    val role: String,
    val content: String
)

data class ChatCompletionRequest(
    val messages: List<Message>,
    val model: String = "gpt-4-turbo",
    val stream: Boolean = false,
    @SerializedName("max_tokens")
    val maxTokens: Int? = null,
    val temperature: Double = 0.7
)

data class ChatCompletionResponse(
    val id: String,
    val choices: List<Choice>,
    val usage: Usage? = null
)

data class Choice(
    val index: Int,
    val message: Message? = null,
    val delta: Delta? = null,
    @SerializedName("finish_reason")
    val finishReason: String? = null
)

data class Delta(
    val role: String? = null,
    val content: String? = null
)

data class Usage(
    @SerializedName("prompt_tokens")
    val promptTokens: Int,
    @SerializedName("completion_tokens")
    val completionTokens: Int,
    @SerializedName("total_tokens")
    val totalTokens: Int
)

data class TTSRequest(
    val input: String,
    val voice: String = "alloy",
    val model: String = "tts-1",
    @SerializedName("response_format")
    val responseFormat: String = "mp3"
)

data class TranscriptionResponse(
    val text: String
)

data class ModerationRequest(
    val input: String
)

data class ModerationResponse(
    val id: String,
    val model: String,
    val results: List<ModerationResult>
)

data class ModerationResult(
    val flagged: Boolean,
    val categories: Map<String, Boolean>,
    @SerializedName("category_scores")
    val categoryScores: Map<String, Double>
)

// Added for API Key validation via listModels
data class OpenAiModelsResponse(
    val `object`: String,
    val data: List<OpenAiModel>
)

data class OpenAiModel(
    val id: String,
    val `object`: String,
    val created: Long,
    @SerializedName("owned_by")
    val ownedBy: String
)
