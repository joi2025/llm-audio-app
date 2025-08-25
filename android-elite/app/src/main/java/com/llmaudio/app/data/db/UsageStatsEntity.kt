package com.llmaudio.app.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.time.LocalDateTime

@Entity(tableName = "usage_stats")
data class UsageStatsEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val timestamp: LocalDateTime,
    val tokensIn: Int,
    val tokensOut: Int,
    val ttsCharacters: Int,
    val estimatedCost: Double, // USD
    val model: String,
    val voice: String,
    val personality: String,
    val sessionDurationMs: Long,
    val latencyFirstTokenMs: Long?,
    val latencyTotalMs: Long?
)
