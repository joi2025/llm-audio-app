package com.llmaudio.app.data.repository

import com.llmaudio.app.data.db.UsageStatsDao
import com.llmaudio.app.data.db.UsageStatsEntity
import kotlinx.coroutines.flow.Flow
import java.time.LocalDateTime
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for tracking OpenAI API usage and costs on-device
 */
@Singleton
class UsageRepository @Inject constructor(
    private val usageStatsDao: UsageStatsDao
) {
    
    companion object {
        // OpenAI pricing per 1K tokens (as of 2024)
        private const val GPT_4_TURBO_INPUT_COST = 0.01 // $0.01 per 1K tokens
        private const val GPT_4_TURBO_OUTPUT_COST = 0.03 // $0.03 per 1K tokens
        private const val TTS_COST_PER_1K_CHARS = 0.015 // $0.015 per 1K characters
        
        // Models
        private const val DEFAULT_MODEL = "gpt-4-turbo"
    }
    
    /**
     * Calculate estimated cost for a conversation turn
     */
    fun calculateEstimatedCost(
        tokensIn: Int,
        tokensOut: Int,
        ttsCharacters: Int,
        model: String = DEFAULT_MODEL
    ): Double {
        val inputCost = (tokensIn / 1000.0) * GPT_4_TURBO_INPUT_COST
        val outputCost = (tokensOut / 1000.0) * GPT_4_TURBO_OUTPUT_COST
        val ttsCost = (ttsCharacters / 1000.0) * TTS_COST_PER_1K_CHARS
        
        return inputCost + outputCost + ttsCost
    }
    
    /**
     * Record usage statistics for a conversation turn
     */
    suspend fun recordUsage(
        tokensIn: Int,
        tokensOut: Int,
        ttsCharacters: Int,
        model: String = DEFAULT_MODEL,
        voice: String,
        personality: String,
        sessionDurationMs: Long,
        latencyFirstTokenMs: Long? = null,
        latencyTotalMs: Long? = null
    ): Long {
        val estimatedCost = calculateEstimatedCost(tokensIn, tokensOut, ttsCharacters, model)
        
        val usageStats = UsageStatsEntity(
            timestamp = LocalDateTime.now(),
            tokensIn = tokensIn,
            tokensOut = tokensOut,
            ttsCharacters = ttsCharacters,
            estimatedCost = estimatedCost,
            model = model,
            voice = voice,
            personality = personality,
            sessionDurationMs = sessionDurationMs,
            latencyFirstTokenMs = latencyFirstTokenMs,
            latencyTotalMs = latencyTotalMs
        )
        
        return usageStatsDao.insertUsageStats(usageStats)
    }
    
    /**
     * Get all usage statistics
     */
    fun getAllUsageStats(): Flow<List<UsageStatsEntity>> {
        return usageStatsDao.getAllUsageStats()
    }
    
    /**
     * Get usage statistics for the last N days
     */
    fun getUsageStatsForLastDays(days: Int): Flow<List<UsageStatsEntity>> {
        val startDate = LocalDateTime.now().minusDays(days.toLong())
        return usageStatsDao.getUsageStatsAfter(startDate)
    }
    
    /**
     * Get total cost for the last N days
     */
    suspend fun getTotalCostForLastDays(days: Int): Double {
        val startDate = LocalDateTime.now().minusDays(days.toLong())
        return usageStatsDao.getTotalCostAfter(startDate) ?: 0.0
    }
    
    /**
     * Get total tokens for the last N days
     */
    suspend fun getTotalTokensForLastDays(days: Int): Int {
        val startDate = LocalDateTime.now().minusDays(days.toLong())
        return usageStatsDao.getTotalTokensAfter(startDate) ?: 0
    }
    
    /**
     * Get average first token latency for the last N days
     */
    suspend fun getAverageFirstTokenLatency(days: Int): Double {
        val startDate = LocalDateTime.now().minusDays(days.toLong())
        return usageStatsDao.getAverageFirstTokenLatency(startDate) ?: 0.0
    }
    
    /**
     * Get usage statistics between two dates
     */
    suspend fun getUsageStatsBetween(startDate: LocalDateTime, endDate: LocalDateTime): List<UsageStatsEntity> {
        return usageStatsDao.getUsageStatsBetween(startDate, endDate)
    }
    
    /**
     * Clean up old usage statistics (older than N days)
     */
    suspend fun cleanupOldUsageStats(daysToKeep: Int = 90): Int {
        val cutoffDate = LocalDateTime.now().minusDays(daysToKeep.toLong())
        return usageStatsDao.deleteOldUsageStats(cutoffDate)
    }
    
    /**
     * Get usage statistics count
     */
    suspend fun getUsageStatsCount(): Int {
        return usageStatsDao.getUsageStatsCount()
    }
    
    /**
     * Get daily usage summary for the last N days
     */
    suspend fun getDailyUsageSummary(days: Int): Map<String, DailyUsageSummary> {
        val startDate = LocalDateTime.now().minusDays(days.toLong())
        val endDate = LocalDateTime.now()
        val usageStats = getUsageStatsBetween(startDate, endDate)
        
        return usageStats.groupBy { it.timestamp.toLocalDate().toString() }
            .mapValues { (_, dayStats) ->
                DailyUsageSummary(
                    date = dayStats.first().timestamp.toLocalDate().toString(),
                    totalCost = dayStats.sumOf { it.estimatedCost },
                    totalTokens = dayStats.sumOf { it.tokensIn + it.tokensOut },
                    totalTtsCharacters = dayStats.sumOf { it.ttsCharacters },
                    conversationCount = dayStats.size,
                    averageLatency = dayStats.mapNotNull { it.latencyFirstTokenMs }.average().takeIf { !it.isNaN() } ?: 0.0
                )
            }
    }
}

/**
 * Daily usage summary data class
 */
data class DailyUsageSummary(
    val date: String,
    val totalCost: Double,
    val totalTokens: Int,
    val totalTtsCharacters: Int,
    val conversationCount: Int,
    val averageLatency: Double
)
