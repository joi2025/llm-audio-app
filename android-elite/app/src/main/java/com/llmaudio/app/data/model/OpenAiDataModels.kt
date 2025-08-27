package com.llmaudio.app.data.model

data class Message(
    val role: String, // "system", "user", "assistant"
    val content: String
)

data class ChatCompletionRequest(
    val model: String,
    val messages: List<Message>,
    val stream: Boolean? = null, // Optional for controlling streaming behavior
    val temperature: Double? = null,
    val max_tokens: Int? = null // Added based on typical usage
)

data class ChatCompletionResponse(
    val id: String,
    val `object`: String,
    val created: Long,
    val model: String,
    val choices: List<Choice>,
    val usage: Usage? = null
)

data class Choice(
    val index: Int,
    val message: Message,
    val finish_reason: String? = null // Can be null in streaming chunks
)

data class Usage(
    val prompt_tokens: Int,
    val completion_tokens: Int,
    val total_tokens: Int
)

data class TTSRequest(
    val model: String, // e.g., "tts-1", "tts-1-hd"
    val input: String,
    val voice: String, // e.g., "alloy", "echo", "fable", "onyx", "nova", "shimmer"
    val response_format: String? = "mp3", // Added, default to mp3
    val speed: Float? = null // Added common optional param
)

data class TranscriptionResponse(
    val text: String
    // Optional: language, duration, segments, etc.
)

data class ModerationRequest(
    val input: String,
    val model: String? = "text-moderation-latest" // Default to latest model
)

data class ModerationResponse(
    val id: String,
    val model: String,
    val results: List<ModerationResult>
)

data class ModerationResult(
    val flagged: Boolean,
    val categories: Map<String, Boolean>,
    val category_scores: Map<String, Double>
)

data class OpenAiModelsResponse(
    val `object`: String, // typically "list"
    val data: List<ModelData>
)

data class ModelData(
    val id: String,
    val `object`: String, // typically "model"
    val created: Long,
    val owned_by: String
    // other fields like "permission", "root", "parent" can be added if needed
)
