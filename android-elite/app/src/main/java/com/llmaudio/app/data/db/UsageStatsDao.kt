package com.llmaudio.app.data.db

import androidx.room.*
import kotlinx.coroutines.flow.Flow
import java.time.LocalDateTime

@Dao
interface UsageStatsDao {
    
    @Query("SELECT * FROM usage_stats ORDER BY timestamp DESC")
    fun getAllUsageStats(): Flow<List<UsageStatsEntity>>
    
    @Query("SELECT * FROM usage_stats WHERE timestamp >= :startDate ORDER BY timestamp DESC")
    fun getUsageStatsAfter(startDate: LocalDateTime): Flow<List<UsageStatsEntity>>
    
    @Query("SELECT SUM(estimatedCost) FROM usage_stats WHERE timestamp >= :startDate")
    suspend fun getTotalCostAfter(startDate: LocalDateTime): Double?
    
    @Query("SELECT SUM(tokensIn + tokensOut) FROM usage_stats WHERE timestamp >= :startDate")
    suspend fun getTotalTokensAfter(startDate: LocalDateTime): Int?
    
    @Query("SELECT AVG(latencyFirstTokenMs) FROM usage_stats WHERE latencyFirstTokenMs IS NOT NULL AND timestamp >= :startDate")
    suspend fun getAverageFirstTokenLatency(startDate: LocalDateTime): Double?
    
    @Query("SELECT * FROM usage_stats WHERE timestamp >= :startDate AND timestamp <= :endDate ORDER BY timestamp DESC")
    suspend fun getUsageStatsBetween(startDate: LocalDateTime, endDate: LocalDateTime): List<UsageStatsEntity>
    
    @Insert
    suspend fun insertUsageStats(usageStats: UsageStatsEntity): Long
    
    @Query("DELETE FROM usage_stats WHERE timestamp < :cutoffDate")
    suspend fun deleteOldUsageStats(cutoffDate: LocalDateTime): Int
    
    @Query("SELECT COUNT(*) FROM usage_stats")
    suspend fun getUsageStatsCount(): Int
}
