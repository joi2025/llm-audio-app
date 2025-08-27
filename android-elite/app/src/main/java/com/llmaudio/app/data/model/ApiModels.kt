package com.llmaudio.app.data.model

import com.google.gson.annotations.SerializedName

// Models for OpenAI API Usage Statistics
// Main response structure from a hypothetical /v1/usage endpoint
data class OpenAiUsageResponse(
    @SerializedName("object") val objectType: String? = null,
    @SerializedName("data") val data: List<UsageDataEntry>? = null,
    // This field might exist if the API returns a total for the queried period directly
    @SerializedName("total_usage_usd_cents") val totalUsageUsdCents: Long? = null,
    // Daily costs breakdown might be more complex if this is for billing page replication
    @SerializedName("daily_costs") val dailyCosts: List<DailyCostEntry>? = null
)

// Represents a single entry of usage data, often per model or operation
data class UsageDataEntry(
    @SerializedName("aggregation_timestamp") val aggregationTimestamp: Long? = null, // Unix timestamp for the start of the aggregation period
    @SerializedName("n_requests") val numRequests: Long? = null,
    @SerializedName("operation") val operation: String? = null, // e.g., "completions", "embeddings", "moderations"
    @SerializedName("snapshot_id") val snapshotId: String? = null, // Specific model version, e.g., "gpt-3.5-turbo-0613"
    @SerializedName("model_id") val modelId: String? = null, // More general model ID, e.g., "gpt-4"
    
    // Token counts for LLMs
    @SerializedName("n_context_tokens_total") val contextTokensTotal: Long? = null, // Input tokens
    @SerializedName("n_generated_tokens_total") val generatedTokensTotal: Long? = null, // Output tokens
    
    // Character counts for TTS
    @SerializedName("n_characters_total") val charactersTotal: Long? = null, // For TTS models
    
    // Audio duration for STT (Whisper) - typically billed per minute/second
    @SerializedName("n_audio_seconds_total") val audioSecondsTotal: Long? = null, // For STT models like Whisper
    
    // If the API directly provides cost for this entry (less common for raw usage data)
    @SerializedName("cost") val cost: Double? = null, // Cost in a specific currency (e.g., USD)
    @SerializedName("currency") val currency: String? = null
)

// If the API provides daily cost summaries (more typical for billing dashboards)
data class DailyCostEntry(
    @SerializedName("timestamp") val timestamp: Long? = null, // Unix timestamp for the day
    @SerializedName("line_items") val lineItems: List<CostLineItem>? = null
)

data class CostLineItem(
    @SerializedName("name") val name: String? = null, // e.g., "GPT-4", "Whisper", "TTS"
    @SerializedName("cost") val cost: Double? = null // Cost in USD for that item on that day
)

// You might also need a data class to hold the calculated/displayed usage
data class CalculatedUsageCost(
    val modelName: String,
    val detail: String, // e.g., "Input Tokens: 1000, Output Tokens: 500" or "Characters: 2000"
    val estimatedCost: Double // in USD
)

data class TotalCalculatedUsage(
    val details: List<CalculatedUsageCost>,
    val totalEstimatedCost: Double // in USD
)
