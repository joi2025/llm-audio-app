package com.llmaudio.app.data.model

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
    val finishReason: String? = null
)

data class Delta(
    val role: String? = null,
    val content: String? = null
)

data class Usage(
    val promptTokens: Int,
    val completionTokens: Int,
    val totalTokens: Int
)

data class TTSRequest(
    val input: String,
    val voice: String = "alloy",
    val model: String = "tts-1",
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
    val categoryScores: Map<String, Double>
)
