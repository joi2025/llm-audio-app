package com.llmaudio.app.domain.audio

import kotlinx.coroutines.flow.StateFlow
import java.io.InputStream

interface AudioPlayer {
    val queueSize: StateFlow<Int> // Publicly exposes the queue size

    fun setPlaybackListener(listener: PlaybackListener?)
    fun enqueueStream(inputStream: InputStream, text: String, priority: Int = 0)
    fun playNext() // This was missing in your description but present in VoicePipelineViewModel's logic (audioPlayer.playNext())
    fun stop()

    interface PlaybackListener {
        fun onStart(text: String) // Called when playback of an item starts
        fun onStop()      // Called when playback of an item stops or queue is empty
        fun onError(error: String)
    }
}