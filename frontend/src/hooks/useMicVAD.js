import { useCallback, useEffect, useRef, useState } from 'react'

// 🚀 OPTIMIZED Voice Activity Detection - Gemini/GPT/Grok level performance
// Ultra-responsive audio capture with intelligent silence detection
// Optimized for Core i5 8GB systems using OpenAI API
export default function useMicVAD({ 
  onChunk, 
  onFinal, 
  onSilenceEnd, 
  onLevel, 
  rmsThreshold = 0.015,    // More sensitive for better detection
  minVoiceMs = 200,        // Faster voice detection
  maxSilenceMs = 600,      // Quicker silence cutoff
  chunkMs = 250,           // Smaller chunks for responsiveness
  streaming = true 
} = {}) {
  const [listening, setListening] = useState(false)

  const mediaStreamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const bufferedBlobsRef = useRef([])
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const speakingAccumRef = useRef(0)
  const rafRef = useRef(null)

  const cleanupAudio = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    try { mediaRecorderRef.current?.stop() } catch {}
    mediaRecorderRef.current = null
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
    try { audioCtxRef.current?.close() } catch {}
    audioCtxRef.current = null
    analyserRef.current = null
  }, [])

  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

  const tick = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return
    
    // 🎯 OPTIMIZED audio analysis - faster processing
    const buf = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(buf)  // Use frequency data for better voice detection
    
    // Enhanced RMS calculation with frequency weighting
    let sum = 0
    let voiceFreqSum = 0
    const voiceStart = Math.floor(buf.length * 0.1)  // Focus on voice frequencies
    const voiceEnd = Math.floor(buf.length * 0.6)
    
    for (let i = 0; i < buf.length; i++) {
      const v = buf[i] / 255
      sum += v * v
      if (i >= voiceStart && i <= voiceEnd) {
        voiceFreqSum += v * v  // Weight voice frequencies more
      }
    }
    
    const rms = Math.sqrt(sum / buf.length)
    const voiceRms = Math.sqrt(voiceFreqSum / (voiceEnd - voiceStart))
    const enhancedRms = (rms * 0.3) + (voiceRms * 0.7)  // Combine for better detection
    
    onLevel && onLevel(Math.min(1, enhancedRms * 3))

    const isVoice = enhancedRms > rmsThreshold
    const now = performance.now()
    
    if (isVoice) {
      speakingAccumRef.current = speakingAccumRef.current || now
      if (silenceTimerRef.current) { 
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null 
      }
    } else {
      // Only reset speaking if we've had enough voice time
      if (speakingAccumRef.current && (now - speakingAccumRef.current) > minVoiceMs) {
        speakingAccumRef.current = 0
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            console.debug('[useMicVAD] 🎤 Auto-stopping on silence')
            stopListening(true)
            onSilenceEnd && onSilenceEnd()
          }, maxSilenceMs)
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [maxSilenceMs, minVoiceMs, onLevel, onSilenceEnd, rmsThreshold])

  const startListening = useCallback(async () => {
    if (listening) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      // WebAudio for VAD
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      analyserRef.current = analyser

      // MediaRecorder for chunks
      // 🎙️ OPTIMIZED MediaRecorder - Ultra-low latency
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm'
        : 'audio/mp4'
        
      console.debug('[useMicVAD] 🎵 Using MIME type:', mimeType)
      
      const mr = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 32000  // Lower bitrate for smaller payloads
      })
      
      mediaRecorderRef.current = mr
      
      mr.ondataavailable = async (ev) => {
        if (ev.data.size > 0) {
          // Avoid verbose logging each 250ms; keep UI smooth
          if (streaming) {
            const b64 = await blobToBase64(ev.data)
            onChunk && onChunk(b64)
          } else {
            bufferedBlobsRef.current.push(ev.data)
          }
        }
      }
      mr.onstop = async () => {
        console.debug('[useMicVAD] 🛑 Recording stopped, streaming=', streaming, 'buffered chunks=', bufferedBlobsRef.current.length)
        
        if (!streaming) {
          try {
            if (bufferedBlobsRef.current.length > 0) {
              // 🚀 OPTIMIZED blob creation with correct MIME type
              const finalMimeType = bufferedBlobsRef.current[0].type || mimeType
              const blob = new Blob(bufferedBlobsRef.current, { type: finalMimeType })
              
              console.debug('[useMicVAD] 📤 Creating final blob:', blob.size, 'bytes, type:', finalMimeType)
              
              const b64 = await blobToBase64(blob)
              console.debug('[useMicVAD] ✅ Calling onFinal with b64 length=', b64?.length)
              onFinal && onFinal(b64)
            } else {
              console.warn('[useMicVAD] ⚠️ No audio data captured')
            }
          } catch (e) {
            console.error('[useMicVAD] ❌ Error processing final audio:', e)
          } finally {
            bufferedBlobsRef.current = []
          }
        }
        
        // 🧹 Optimized cleanup timing
        setTimeout(() => {
          cleanupAudio()
          setListening(false)
          console.debug('[useMicVAD] 🏁 Cleanup complete')
        }, 100)  // Slightly longer to ensure all processing completes
      }
      if (streaming) {
        mr.start(chunkMs)
      } else {
        mr.start() // no timeslice, emit single chunk on stop
      }

      setListening(true)
      rafRef.current = requestAnimationFrame(tick)
    } catch (e) {
      // ignore
    }
  }, [chunkMs, listening, tick, onChunk])

  const stopListening = useCallback((forceSend = false) => {
    if (!listening) {
      console.debug('[useMicVAD] ⚠️ Already stopped')
      return
    }
    
    const recorderState = mediaRecorderRef.current?.state
    console.debug('[useMicVAD] 🛑 Stopping recording, forceSend=', forceSend, 'state=', recorderState)
    
    try {
      if (mediaRecorderRef.current && recorderState === 'recording') {
        // 🎯 OPTIMIZED stop - ensures data is captured
        mediaRecorderRef.current.stop()
        console.debug('[useMicVAD] ✅ MediaRecorder.stop() called - will trigger onstop')
      } else if (recorderState === 'inactive') {
        console.debug('[useMicVAD] 📝 Recorder already inactive, cleaning up')
        cleanupAudio()
        setListening(false)
      } else {
        console.warn('[useMicVAD] ⚠️ Unexpected recorder state:', recorderState)
        cleanupAudio()
        setListening(false)
      }
    } catch (e) {
      console.error('[useMicVAD] ❌ Error stopping recorder:', e)
      cleanupAudio()
      setListening(false)
    }
  }, [cleanupAudio, listening])

  useEffect(() => () => cleanupAudio(), [cleanupAudio])

  return { listening, startListening, stopListening }
}
