package com.llmaudio.app.data.api

import com.google.gson.annotations.SerializedName

data class ModerationRequest(
    val input: String,
    val model: String = "text-moderation-latest"
)

data class ModerationResponse(
    val id: String,
    val model: String,
    val results: List<ModerationResult>
)

data class ModerationResult(
    val flagged: Boolean,
    val categories: ModerationCategories,
    @SerializedName("category_scores")
    val categoryScores: ModerationCategoryScores
)

data class ModerationCategories(
    val sexual: Boolean,
    @SerializedName("sexual/minors")
    val sexualMinors: Boolean,
    val hate: Boolean,
    @SerializedName("hate/threatening")
    val hateThreatening: Boolean,
    val harassment: Boolean,
    @SerializedName("harassment/threatening")
    val harassmentThreatening: Boolean,
    @SerializedName("self-harm")
    val selfHarm: Boolean,
    @SerializedName("self-harm/intent")
    val selfHarmIntent: Boolean,
    @SerializedName("self-harm/instructions")
    val selfHarmInstructions: Boolean,
    val violence: Boolean,
    @SerializedName("violence/graphic")
    val violenceGraphic: Boolean
)

data class ModerationCategoryScores(
    val sexual: Double,
    @SerializedName("sexual/minors")
    val sexualMinors: Double,
    val hate: Double,
    @SerializedName("hate/threatening")
    val hateThreatening: Double,
    val harassment: Double,
    @SerializedName("harassment/threatening")
    val harassmentThreatening: Double,
    @SerializedName("self-harm")
    val selfHarm: Double,
    @SerializedName("self-harm/intent")
    val selfHarmIntent: Double,
    @SerializedName("self-harm/instructions")
    val selfHarmInstructions: Double,
    val violence: Double,
    @SerializedName("violence/graphic")
    val violenceGraphic: Double
)

/**
 * Moderation incident for local logging
 */
data class ModerationIncident(
    val timestamp: Long = System.currentTimeMillis(),
    val text: String,
    val type: ModerationIncidentType,
    val flaggedCategories: List<String>,
    val maxScore: Double,
    val blocked: Boolean
)

enum class ModerationIncidentType {
    INPUT_USER,
    OUTPUT_LLM
}
