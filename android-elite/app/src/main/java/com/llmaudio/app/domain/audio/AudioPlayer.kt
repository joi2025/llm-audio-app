package com.llmaudio.app.domain.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.InputStream
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AudioPlayer @Inject constructor() {
    
    private var audioTrack: AudioTrack? = null
    private val sampleRate = 24000 // OpenAI TTS default
    
    suspend fun playStream(inputStream: InputStream) = withContext(Dispatchers.IO) {
        try {
            stop() // Stop any existing playback
            
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANT)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build()
            
            val audioFormat = AudioFormat.Builder()
                .setSampleRate(sampleRate)
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build()
            
            val bufferSize = AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            )
            
            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(audioAttributes)
                .setAudioFormat(audioFormat)
                .setBufferSizeInBytes(bufferSize * 2)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()
            
            audioTrack?.play()
            
            val buffer = ByteArray(bufferSize)
            var bytesRead: Int
            
            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                audioTrack?.write(buffer, 0, bytesRead)
            }
            
            audioTrack?.stop()
            audioTrack?.release()
            audioTrack = null
            
        } catch (e: Exception) {
            e.printStackTrace()
            stop()
        } finally {
            inputStream.close()
        }
    }
    
    fun stop() {
        audioTrack?.apply {
            if (playState == AudioTrack.PLAYSTATE_PLAYING) {
                stop()
                flush()
            }
            release()
        }
        audioTrack = null
    }
}
