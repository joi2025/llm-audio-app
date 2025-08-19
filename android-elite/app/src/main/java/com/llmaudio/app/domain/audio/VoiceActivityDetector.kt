package com.llmaudio.app.domain.audio

import kotlin.math.abs
import kotlin.math.sqrt

class VoiceActivityDetector(
    private val silenceThreshold: Float = 0.01f,
    private val silenceDuration: Long = 1500L,
    private val speechThreshold: Float = 0.02f,
    private val sampleRate: Int = 16000
) {
    private var lastSpeechTime = System.currentTimeMillis()
    private var isSpeaking = false
    private val energyBuffer = mutableListOf<Float>()
    private val bufferSize = 10
    
    fun processSamples(audioData: ByteArray): Boolean {
        val energy = calculateRMS(audioData)
        energyBuffer.add(energy)
        
        if (energyBuffer.size > bufferSize) {
            energyBuffer.removeAt(0)
        }
        
        val avgEnergy = if (energyBuffer.isNotEmpty()) {
            energyBuffer.average().toFloat()
        } else {
            0f
        }
        
        val currentTime = System.currentTimeMillis()
        
        // Detect speech
        if (avgEnergy > speechThreshold) {
            lastSpeechTime = currentTime
            if (!isSpeaking) {
                isSpeaking = true
            }
        }
        
        // Check for silence after speech
        if (isSpeaking && avgEnergy < silenceThreshold) {
            if (currentTime - lastSpeechTime > silenceDuration) {
                // Silence detected after speech
                reset()
                return true
            }
        }
        
        return false
    }
    
    private fun calculateRMS(audioData: ByteArray): Float {
        var sum = 0.0
        val samples = audioData.size / 2
        
        for (i in 0 until audioData.size step 2) {
            if (i + 1 < audioData.size) {
                val sample = (audioData[i].toInt() or (audioData[i + 1].toInt() shl 8)).toShort()
                sum += sample * sample
            }
        }
        
        return sqrt(sum / samples).toFloat() / 32768f
    }
    
    fun reset() {
        lastSpeechTime = System.currentTimeMillis()
        isSpeaking = false
        energyBuffer.clear()
    }
}
