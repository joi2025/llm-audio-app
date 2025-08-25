import { useState, useEffect, useRef, useCallback } from 'react'
import useMicVAD from './useMicVAD'

/**
 * Audio chunk queue for seamless playback with sequence ordering
 */
class AudioChunkQueue {
  constructor() {
    this.chunks = new Map() // sequence_id -> audio_data
    this.expectedSequence = 1
    this.isPlaying = false
    this.currentAudio = null
  }

  enqueue(sequenceId, audioData) {
    console.log(`🎵 [AudioQueue] Enqueuing chunk #${sequenceId}`)
    this.chunks.set(sequenceId, audioData)
    this.processQueue()
  }

  async processQueue() {
    if (this.isPlaying) return

    // Play chunks in sequence order
    while (this.chunks.has(this.expectedSequence)) {
      const audioData = this.chunks.get(this.expectedSequence)
      this.chunks.delete(this.expectedSequence)
      
      console.log(`🔊 [AudioQueue] Playing chunk #${this.expectedSequence}`)
      await this.playChunk(audioData)
      
      this.expectedSequence++
    }
  }

  async playChunk(audioData) {
    return new Promise((resolve) => {
      this.isPlaying = true
      
      try {
        // Convert base64 to blob
        const audioBlob = new Blob([
          Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
        ], { type: 'audio/mpeg' })
        
        const audioUrl = URL.createObjectURL(audioBlob)
        this.currentAudio = new Audio(audioUrl)
        
        this.currentAudio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          this.currentAudio = null
          this.isPlaying = false
          resolve()
        }
        
        this.currentAudio.onerror = (e) => {
          console.error('🚫 [AudioQueue] Playback error:', e)
          URL.revokeObjectURL(audioUrl)
          this.currentAudio = null
          this.isPlaying = false
          resolve()
        }
        
        this.currentAudio.play().catch(e => {
          console.error('🚫 [AudioQueue] Play failed:', e)
          this.isPlaying = false
          resolve()
        })
        
      } catch (e) {
        console.error('🚫 [AudioQueue] Chunk processing error:', e)
        this.isPlaying = false
        resolve()
      }
    })
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }
    this.isPlaying = false
    this.chunks.clear()
    this.expectedSequence = 1
  }

  clear() {
    this.stop()
  }
}

/**
 * useAutoVoice
 * High-level auto voice capture for conversational UX without a record button.
 *
 * Params:
 *  - onAudioCapture(b64): called once final audio is ready to send
 *  - onAudioChunk(b64): streaming chunks (when streaming=true in VAD)
 *  - onSilenceDetected(): invoked when silence boundary closes a turn
 *  - onSpeechStart(): invoked when a new user speech turn starts
 *  - isAssistantSpeaking: if true, we avoid starting capture except on interruption
 *  - enabled: global enable switch
 *
 * Returns state and controls to integrate with UI:
 *  { isListening, isProcessing, audioLevel, autoMode, voiceState,
 *    manualStart, manualStop, toggleAutoMode, resetProcessing,
 *    vadConfig, lastActivity, speechDetected }
 */
export default function useAutoVoice({ 
  onAudioCapture,
  onAudioChunk, 
  onSilenceDetected, 
  onSpeechStart,
  isAssistantSpeaking = false,
  enabled = true 
}) {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [autoMode, setAutoMode] = useState(true)
  const [audioLevel, setAudioLevel] = useState(0)
  
  // Audio chunk queue for seamless playback
  const audioQueueRef = useRef(new AudioChunkQueue())
  
  // Referencias para control de estado
  const silenceTimeoutRef = useRef(null)
  const speechDetectedRef = useRef(false)
  const lastActivityRef = useRef(Date.now())
  const processingTimerRef = useRef(null)
  const cooldownUntilRef = useRef(0)
  const hadSpeechThisTurnRef = useRef(false)
  
  // Configuración VAD AGRESIVA para LATENCIA CERO - Optimizada para español
  const vadConfig = {
    // Detección ULTRA-AGRESIVA para latencia mínima
    speechThreshold: 0.4,        // Umbral MÁS bajo para detectar habla instantáneamente
    silenceThreshold: 0.2,       // Umbral de silencio MÁS sensible
    
    // Tiempos OPTIMIZADOS para conversación fluida en español
    minSpeechDuration: 150,      // Mínimo 150ms - más rápido que ChatGPT
    maxSilenceDuration: 600,     // Cierre MÁS ágil - pausas naturales españolas
    interruptionDelay: 300,      // Interrupción INMEDIATA del TTS (300ms)
    
    // Optimización de recursos para tiempo real
    sampleRate: 16000,           // Calidad suficiente para STT
    bufferSize: 1024,            // Buffer MÁS pequeño para menor latencia
    streaming: true,             // Stream de chunks + cierre en silencio
  }

  // Hook de VAD con configuración optimizada
  const {
    startListening,
    stopListening,
    listening
  } = useMicVAD({
    onChunk: useCallback((b64) => {
      // Stream partial audio to backend for ultra-low latency
      hadSpeechThisTurnRef.current = true
      onAudioChunk?.(b64)
    }, [onAudioChunk]),
    onFinal: useCallback((audioB64) => {
      console.log('🎤 [AutoVoice] Audio capturado automáticamente:', audioB64.length, 'chars')
      setIsListening(false)
      setIsProcessing(true)
      // Watchdog para evitar quedarse en processing si backend tarda o falla
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current)
      processingTimerRef.current = setTimeout(() => {
        console.warn('⏱️ [AutoVoice] Watchdog processing timeout, auto-reset')
        setIsProcessing(false)
        speechDetectedRef.current = false
      }, 10000)
      onAudioCapture?.(audioB64)
    }, [onAudioCapture]),

    // Detección de silencio OPTIMIZADA para flujo natural
    onSilenceEnd: useCallback(() => {
      if (speechDetectedRef.current) {
        console.log('🤫 [AutoVoice] Silencio detectado - ENVIANDO AUDIO INMEDIATAMENTE')
        // Notificar al consumidor y disparar cierre de turno (audio_end)
        onSilenceDetected?.()
        onAudioCapture?.(null)
        // Cooldown MÁS corto para conversación más fluida
        cooldownUntilRef.current = Date.now() + 400 // Reducido de 700ms a 400ms
        // Marcar fin de turno
        speechDetectedRef.current = false
        hadSpeechThisTurnRef.current = false
      }
    }, [onSilenceDetected, onAudioCapture]),

    onLevel: useCallback((level) => {
      setAudioLevel(level || 0)
    }, []),

    // Mapeo de umbrales AGRESIVOS a la API de useMicVAD
    rmsThreshold: 0.01, // umbral base para considerar voz en español (threshold dinámico ajusta encima de ambiente)
    minVoiceMs: vadConfig.minSpeechDuration,
    maxSilenceMs: vadConfig.maxSilenceDuration,
    chunkMs: 200,
    streaming: true // stream de chunks + cierre en silencio
  })

  // Detección automática de inicio de habla
  useEffect(() => {
    if (!enabled || !autoMode) return

    const detectSpeechStart = () => {
      // Solo iniciar si no estamos ya grabando y el asistente no está hablando
      if (!listening && !isAssistantSpeaking && !isProcessing) {
        // Evitar reinicio inmediato tras silencio
        if (Date.now() < cooldownUntilRef.current) return
        if (audioLevel > vadConfig.speechThreshold) {
          console.log('🎤 [AutoVoice] Habla detectada automáticamente, iniciando grabación...')
          speechDetectedRef.current = true
          hadSpeechThisTurnRef.current = false
          setIsListening(true)
          startListening()
          onSpeechStart?.()
          lastActivityRef.current = Date.now()
        }
      }
    }

    // Polling optimizado para detección de habla
    const interval = setInterval(detectSpeechStart, 100) // Cada 100ms
    return () => clearInterval(interval)
  }, [enabled, autoMode, listening, isAssistantSpeaking, isProcessing, audioLevel, startListening, onSpeechStart])

  // Helper: pause any TTS audio elements currently playing
  const pauseAllAudio = useCallback(() => {
    try {
      const audios = document.querySelectorAll('audio')
      audios.forEach(a => {
        if (!a.paused && !a.ended) {
          a.pause()
        }
      })
    } catch {}
  }, [])

  // Manejo de interrupciones durante respuesta del asistente
  useEffect(() => {
    if (!enabled || !autoMode || !isAssistantSpeaking) return

    const handleInterruption = () => {
      if (audioLevel > vadConfig.speechThreshold * 1.5) { // Umbral más alto para interrupciones
        console.log('✋ [AutoVoice] Interrupción detectada durante respuesta del asistente')
        // Dar un pequeño delay para evitar falsos positivos
        setTimeout(() => {
          if (audioLevel > vadConfig.speechThreshold * 1.5) {
            console.log('🛑 [AutoVoice] Confirmando interrupción, iniciando nueva grabación...')
            // Pause any ongoing TTS playback to avoid overlap
            pauseAllAudio()
            setIsListening(true)
            startListening()
            onSpeechStart?.()
          }
        }, vadConfig.interruptionDelay)
      }
    }

    const interval = setInterval(handleInterruption, 150) // Menos frecuente para interrupciones
    return () => clearInterval(interval)
  }, [enabled, autoMode, isAssistantSpeaking, audioLevel, startListening, onSpeechStart, pauseAllAudio])

  // Limpieza de timeouts (handled internally by useMicVAD); keep no-op cleanup here
  useEffect(() => () => {}, [])
  
  // Cleanup processing watchdog on unmount
  useEffect(() => () => {
    if (processingTimerRef.current) clearTimeout(processingTimerRef.current)
  }, [])

  // Reset de estado cuando termina el procesamiento
  const resetProcessing = useCallback(() => {
    setIsProcessing(false)
    speechDetectedRef.current = false
    if (processingTimerRef.current) { clearTimeout(processingTimerRef.current); processingTimerRef.current = null }
  }, [])

  // Control manual para casos especiales
  const manualStart = useCallback(() => {
    if (!listening && !isProcessing) {
      console.log('👆 [AutoVoice] Inicio manual de grabación')
      speechDetectedRef.current = true
      setIsListening(true)
      startListening()
      onSpeechStart?.()
    }
  }, [listening, isProcessing, startListening, onSpeechStart])

  const manualStop = useCallback(() => {
    if (listening) {
      console.log('✋ [AutoVoice] Parada manual de grabación')
      stopListening(true)
    }
  }, [listening, stopListening])

  const toggleAutoMode = useCallback(() => {
    setAutoMode(prev => {
      const newMode = !prev
      console.log(`🔄 [AutoVoice] Modo automático: ${newMode ? 'ACTIVADO' : 'DESACTIVADO'}`)
      return newMode
    })
  }, [])

  // Estado actual del sistema
  const getVoiceState = useCallback(() => {
    if (isProcessing) return 'processing'
    if (isListening) return 'listening'
    if (isAssistantSpeaking) return 'speaking'
    return 'idle'
  }, [isProcessing, isListening, isAssistantSpeaking])

  // Función para manejar chunks de audio con sequence_id
  const handleAudioChunk = useCallback((sequenceId, audioData) => {
    console.log(`🎵 [useAutoVoice] Received audio chunk #${sequenceId}`)
    audioQueueRef.current.enqueue(sequenceId, audioData)
  }, [])

  // Función para detener y limpiar la cola de audio
  const stopAudioPlayback = useCallback(() => {
    console.log('🛑 [useAutoVoice] Stopping audio playback')
    audioQueueRef.current.stop()
  }, [])

  // Limpiar cola al desmontar
  useEffect(() => {
    return () => {
      audioQueueRef.current.clear()
    }
  }, [])

  return {
    isListening: listening,
    isProcessing,
    audioLevel,
    autoMode,
    voiceState: getVoiceState(),
    manualStart,
    manualStop,
    toggleAutoMode,
    resetProcessing,
    vadConfig,
    lastActivity: lastActivityRef.current,
    speechDetected: speechDetectedRef.current,
    hadSpeechThisTurn: hadSpeechThisTurnRef.current,
    // Nuevas funciones para streaming de audio
    handleAudioChunk,
    stopAudioPlayback,
    audioQueue: audioQueueRef.current
  }
}
