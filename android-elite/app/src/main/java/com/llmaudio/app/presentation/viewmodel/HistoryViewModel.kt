package com.llmaudio.app.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.llmaudio.app.data.db.MessageEntity
import com.llmaudio.app.data.repository.MessageRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val repository: MessageRepository
) : ViewModel() {

    val messages: StateFlow<List<MessageEntity>> =
        repository.getMessages()
            .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    fun clearHistory() {
        viewModelScope.launch {
            repository.clearMessages()
        }
    }
}
