package com.llmaudio.app.model

data class LogEntry(
    val timestamp: Long = System.currentTimeMillis(),
    val message: String
)
