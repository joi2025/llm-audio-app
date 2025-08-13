import { useState, useEffect, useRef, useCallback } from 'react'
import useMicVAD from './useMicVAD'

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
  
  // Referencias para control de estado
  const silenceTimeoutRef = useRef(null)
  const speechDetectedRef = useRef(false)
  const lastActivityRef = useRef(Date.now())
  const processingTimerRef = useRef(null)
  
  // Configuración optimizada para español y eficiencia
  const vadConfig = {
    // Sensibilidad optimizada para español
    silenceThreshold: 0.008,     // Más sensible a pausas suaves
    speechThreshold: 0.012,      // Umbral afinado para inicio de habla en español
    
    // Tiempos optimizados para conversación natural
    minSpeechDuration: 240,      // Arranque de habla más rápido
    maxSilenceDuration: 900,     // Cierre más ágil al detectar pausas
    interruptionDelay: 600,      // Interrupción más rápida del TTS
    
    // Optimización de recursos
    sampleRate: 16000,           // Calidad suficiente para STT
    bufferSize: 2048,            // Buffer optimizado
  }

  // Hook de VAD con configuración optimizada
  const {
    startListening,
    stopListening,
    listening
  } = useMicVAD({
    onChunk: useCallback((b64) => {
      // Stream partial audio to backend for ultra-low latency
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

    // useMicVAD ya hace stop al detectar silencio y luego llama a onSilenceEnd
    onSilenceEnd: useCallback(() => {
      // No dependas del flag de listening, puede que se haya flippeado por el MediaRecorder
      if (speechDetectedRef.current) {
        console.log('🤫 [AutoVoice] Silencio detectado, enviando audio...')
        onSilenceDetected?.()
      }
    }, [onSilenceDetected]),

    onLevel: useCallback((level) => {
      setAudioLevel(level || 0)
    }, []),

    // Mapeo de umbrales a la API de useMicVAD (rmsThreshold optimizado a 0.01)
    rmsThreshold: 0.01, // umbral base para considerar voz en español
    minVoiceMs: vadConfig.minSpeechDuration,
    maxSilenceMs: vadConfig.maxSilenceDuration,
    chunkMs: 200,
    streaming: true // stream de chunks + fin en silencio
  })

  // Detección automática de inicio de habla
  useEffect(() => {
    if (!enabled || !autoMode) return

    const detectSpeechStart = () => {
      // Solo iniciar si no estamos ya grabando y el asistente no está hablando
      if (!listening && !isAssistantSpeaking && !isProcessing) {
        if (audioLevel > vadConfig.speechThreshold) {
          console.log('🎤 [AutoVoice] Habla detectada automáticamente, iniciando grabación...')
          speechDetectedRef.current = true
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

  return {
    // Estados
    isListening,
    isProcessing,
    audioLevel,
    autoMode,
    voiceState: getVoiceState(),
    
    // Controles
    manualStart,
    manualStop,
    toggleAutoMode,
    resetProcessing,
    
    // Configuración
    vadConfig,
    
    // Métricas para optimización
    lastActivity: lastActivityRef.current,
    speechDetected: speechDetectedRef.current
  }
}
