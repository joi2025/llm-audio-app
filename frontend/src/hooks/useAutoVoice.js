import { useState, useEffect, useRef, useCallback } from 'react'
import useMicVAD from './useMicVAD'

/**
 * Hook avanzado para detección automática de voz sin botones
 * - Detección automática de inicio de habla
 * - Pausa automática por silencio
 * - Interrupción durante respuesta del asistente
 * - Optimizado para baja latencia y poco gasto de API
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
  
  // Configuración optimizada para español y eficiencia
  const vadConfig = {
    // Sensibilidad optimizada para español
    silenceThreshold: 0.01,      // Más sensible para detectar pausas naturales
    speechThreshold: 0.02,       // Umbral para detectar inicio de habla
    
    // Tiempos optimizados para conversación natural
    minSpeechDuration: 300,      // Mínimo 300ms de habla para activar
    maxSilenceDuration: 1200,    // Máximo 1.2s de silencio antes de enviar
    interruptionDelay: 800,      // Delay para interrumpir al asistente
    
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
      onAudioCapture?.(audioB64)
    }, [onAudioCapture]),

    // useMicVAD ya hace stop al detectar silencio y luego llama a onSilenceEnd
    onSilenceEnd: useCallback(() => {
      if (speechDetectedRef.current && isListening) {
        console.log('🤫 [AutoVoice] Silencio detectado, enviando audio...')
        onSilenceDetected?.()
      }
    }, [isListening, onSilenceDetected]),

    onLevel: useCallback((level) => {
      setAudioLevel(level || 0)
    }, []),

    // Mapeo de umbrales a la API de useMicVAD
    rmsThreshold: vadConfig.speechThreshold, // umbral para considerar voz
    minVoiceMs: vadConfig.minSpeechDuration,
    maxSilenceMs: vadConfig.maxSilenceDuration,
    chunkMs: 250,
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
            setIsListening(true)
            startListening()
            onSpeechStart?.()
          }
        }, vadConfig.interruptionDelay)
      }
    }

    const interval = setInterval(handleInterruption, 150) // Menos frecuente para interrupciones
    return () => clearInterval(interval)
  }, [enabled, autoMode, isAssistantSpeaking, audioLevel, startListening, onSpeechStart])

  // Limpieza de timeouts
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
    }
  }, [])

  // Reset de estado cuando termina el procesamiento
  const resetProcessing = useCallback(() => {
    setIsProcessing(false)
    speechDetectedRef.current = false
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
