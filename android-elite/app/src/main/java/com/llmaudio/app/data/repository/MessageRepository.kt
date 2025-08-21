package com.llmaudio.app.data.repository

import com.llmaudio.app.data.db.MessageDao
import com.llmaudio.app.data.db.MessageEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MessageRepository @Inject constructor(
    private val dao: MessageDao
) {
    fun getMessages(): Flow<List<MessageEntity>> = dao.getAllAsc()

    suspend fun saveMessage(role: String, content: String) {
        if (content.isBlank()) return
        val entity = MessageEntity(
            timestamp = System.currentTimeMillis(),
            role = role,
            content = content
        )
        dao.insert(entity)
    }

    suspend fun clearMessages() {
        dao.clearAll()
    }
}
