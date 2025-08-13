/**
 * VoiceCircleV2 - Única Fuente de Verdad para Interfaz de Voz
 * Componente principal unificado para interacción de voz con detección automática.
 * Arquitectura consolidada que integra VAD, WebSocket, personalidades y TTS.
 * 
 * Características principales:
 * - Detección automática de voz (VAD) con useAutoVoice
 * - Integración completa con sistema de personalidades
 * - Pipeline de audio optimizado para latencia mínima
 * - Estados visuales dinámicos del avatar
 * - Manejo robusto de errores y reconexión
 * 
 * @param {string} wsUrl - URL del WebSocket backend
 * @param {boolean} autoMode - Activar modo automático por defecto
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
// import usePersonality from '../hooks/usePersonality'
// import useSocketIO from '../hooks/useSocketIO'
// import useAutoVoice from '../hooks/useAutoVoice'
// import VoiceAvatar from './VoiceAvatar'
// import { PERSONALITIES, VOICE_CATEGORIES } from '../data/personalities'

export default function VoiceCircleV2({ wsUrl = 'http://localhost:8001', autoMode = false }) {
  // MODO DEBUG: Renderizar interfaz mínima para identificar error
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h1 style={{ fontSize: '2.5em', marginBottom: '20px', color: '#4ade80' }}>
          🚀 LLM Audio App - Sistema Hiper-Realista
        </h1>
        <div style={{ fontSize: '1.2em', marginBottom: '30px', color: '#94a3b8' }}>
          Modo Debug Activo - Identificando Error Crítico
        </div>
        <div style={{ 
          background: 'rgba(34, 197, 94, 0.1)', 
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{ color: '#4ade80', fontWeight: 600, marginBottom: '10px' }}>
            ✅ Fases Completadas Exitosamente:
          </div>
          <div style={{ color: '#e2e8f0', lineHeight: '1.6' }}>
            • Fase 1: Fundación Arquitectónica<br/>
            • Fase 2: UI Minimalista + Avatar Dinámico<br/>
            • Fase 3: Pipeline Latencia Cero<br/>
            • Fase 4: Dashboard God Mode
          </div>
        </div>
        <div style={{ color: '#f59e0b', fontSize: '1.1em' }}>
          🔧 Resolviendo error de importaciones...
        </div>
      </div>
    </div>
  )

  // CÓDIGO ORIGINAL COMENTADO TEMPORALMENTE
  /*
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [showPersonalities, setShowPersonalities] = useState(false)
  const [micPermission, setMicPermission] = useState(false)
  const [error, setError] = useState('')
  const [isAutoActive, setIsAutoActive] = useState(autoMode)
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [assistantSpeaking, setAssistantSpeaking] = useState(false)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const audioChunkCountRef = useRef(0)
  const streamRef = useRef(null)
  const isSpeakingRef = useRef(false)
  const ttsAudioRef = useRef(null)
  const autoEndSentRef = useRef(false)
  const autoStopTimerRef = useRef(null)

  // Audio test beep (speakers check)
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
      osc.onended = () => ctx.close()
    } catch (e) {
      console.warn('[VoiceCircleV2] Audio test error:', e)
    }
  }, [])

  
  
  const { personalityData, currentPersonality, applyPersonality } = usePersonality()
  
  // Stabilize emit via ref to avoid re-creating handlers
  const emitRef = useRef(null)

  // Debounced transcript updates (200ms) with last-value guard — define EARLY to avoid TDZ in onMessage
  const lastTranscriptRef = useRef('')
  const debouncedTimerRef = useRef(null)
  const debouncedSetTranscript = useCallback((text) => {
    if (text === lastTranscriptRef.current) return
    if (debouncedTimerRef.current) clearTimeout(debouncedTimerRef.current)
    debouncedTimerRef.current = setTimeout(() => {
      lastTranscriptRef.current = text
      setTranscript(text)
    }, 200)
  }, [])

  // Ref to access autoVoice methods inside early socket callbacks without TDZ
  const autoVoiceRef = useRef(null)

  // Move Socket.IO setup BEFORE callbacks that depend on isConnected to avoid TDZ
  const { isConnected, emit } = useSocketIO(wsUrl, {
    onConnect: () => {
      setError('')
      console.log('[VoiceCircleV2] Connected to backend')
    },
    onDisconnect: () => {
      console.log('[VoiceCircleV2] Disconnected from backend')
      // Consider assistant not speaking on disconnect
      setAssistantSpeaking(false)
    },
    onError: (err) => console.error('[VoiceCircleV2] Error:', err),
    onMessage: (data) => {
      console.log('[VoiceCircleV2] Received:', data)

      // STREAMING LLM - Primer token (LATENCIA MÍNIMA)
      if (data?.type === 'llm_first_token') {
        console.log('⚡ [VoiceCircleV2] PRIMER TOKEN recibido - latencia mínima alcanzada')
        setIsProcessing(false) // Cambiar inmediatamente a speaking
        setAssistantSpeaking(true)
        return
      }

      // STREAMING LLM - Tokens individuales
      if (data?.type === 'llm_token') {
        // Actualizar respuesta en tiempo real sin re-render excesivo
        if (data.accumulated) {
          setResponse(data.accumulated)
        }
        return
      }

      // STREAMING TTS - Chunks de audio
      if (data?.type === 'audio_chunk') {
        console.log(`🔊 [VoiceCircleV2] Audio chunk ${data.chunk_id} recibido`)
        try {
          const audioB64 = data.audio
          if (audioB64) {
            isSpeakingRef.current = true
            setAssistantSpeaking(true)
            
            // Reproducir chunk inmediatamente
            const audioData = atob(audioB64)
            const arrayBuffer = new ArrayBuffer(audioData.length)
            const view = new Uint8Array(arrayBuffer)
            for (let i = 0; i < audioData.length; i++) {
              view[i] = audioData.charCodeAt(i)
            }
            
            const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
            const audioUrl = URL.createObjectURL(blob)
            
            // Crear y reproducir audio inmediatamente
            const audio = new Audio(audioUrl)
            audio.play().catch(e => console.warn('Audio play error:', e))
            
            // Limpiar URL después de reproducción
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl)
              // Si es el chunk final, marcar fin de speaking
              if (data.final) {
                isSpeakingRef.current = false
                setAssistantSpeaking(false)
                if (autoMode && isAutoActive) {
                  try { autoVoiceRef.current?.resetProcessing?.() } catch {}
                }
              }
            }
          }
        } catch (e) {
          console.error('[VoiceCircleV2] Error processing audio chunk:', e)
        }
        return
      }

      // Handle explicit TTS end events
      if (data?.type === 'tts_end') {
        console.log('🏁 [VoiceCircleV2] TTS finalizado completamente')
        isSpeakingRef.current = false
        setAssistantSpeaking(false)
        if (autoMode && isAutoActive) {
          try { autoVoiceRef.current?.resetProcessing?.() } catch {}
        }
        return
      }

      // Handle STT result (tolerant keys)
      const sttText = data?.transcript || data?.transcription || undefined
      if (sttText) {
        // Debounce transcript updates to avoid re-render per chunk
        debouncedSetTranscript(sttText)
        setIsListening(false)
        setIsProcessing(true)
      }

      // Handle LLM response completa (fallback para modo no-streaming)
      const llmText = data?.response || (data?.text && (data?.type === 'response' || data?.type === 'result' || data?.type === 'result_llm') ? data.text : undefined)
      if (llmText && !data?.type?.includes('token')) {
        setResponse(llmText)
        setIsProcessing(false)
        // If there's no TTS or it's already done, re-arm auto voice immediately
        if (autoMode && isAutoActive && !assistantSpeaking) {
          try { autoVoiceRef.current?.resetProcessing?.() } catch {}
        }
      }

      // Handle TTS audio (tolerant keys)
      const audioB64 = data?.audio || data?.audio_b64 || data?.data
      if (audioB64) {
        try {
          isSpeakingRef.current = true
          setAssistantSpeaking(true)
          const audioData = atob(audioB64)
          const arrayBuffer = new ArrayBuffer(audioData.length)
          const view = new Uint8Array(arrayBuffer)

          for (let i = 0; i < audioData.length; i++) {
            view[i] = audioData.charCodeAt(i)
          }

          const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
          const audioUrl = URL.createObjectURL(blob)
          const audio = new Audio(audioUrl)
          ttsAudioRef.current = audio

          audio.onended = () => {
            URL.revokeObjectURL(audioUrl)
            isSpeakingRef.current = false
            setAssistantSpeaking(false)
            if (autoMode && isAutoActive) {
              try { autoVoiceRef.current?.resetProcessing?.() } catch {}
            }
            ttsAudioRef.current = null
          }

          const playPromise = audio.play()
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise.then(() => {
              console.log('[VoiceCircleV2] Playing TTS audio')
            }).catch(err => {
              console.warn('[VoiceCircleV2] Autoplay blocked or play error:', err)
              // Consider TTS ended to keep conversation flowing
              URL.revokeObjectURL(audioUrl)
              isSpeakingRef.current = false
              setAssistantSpeaking(false)
              if (autoMode && isAutoActive) {
                try { autoVoiceRef.current?.resetProcessing?.() } catch {}
              }
              ttsAudioRef.current = null
            })
          } else {
            console.log('[VoiceCircleV2] Playing TTS audio')
          }
        } catch (error) {
          console.error('[VoiceCircleV2] Audio decode error:', error)
        }
      }
    }
  })

  const onAutoAudioChunk = useCallback((chunkB64) => {
    if (!isConnected) return
    emitRef.current && emitRef.current('audio_chunk', { data: chunkB64, audio: chunkB64 })
  }, [isConnected])

  const onAutoAudioCapture = useCallback((finalB64) => {
      console.log('[V2 Auto] Audio captured automatically (final)')
      setTranscript('Procesando...')
      if (!isConnected) {
        setError('No hay conexión con el servidor')
        return
      }
      // Fallback: si aún no enviamos audio_end en silencio, hacerlo aquí
      if (!autoEndSentRef.current) {
        setTimeout(() => {
          emitRef.current && emitRef.current('audio_end', { 
            audio: finalB64,
            personality: currentPersonality,
            prefer_short_answer: true,
            timestamp: Date.now()
          })
        }, 50)
        autoEndSentRef.current = true
      }
  }, [isConnected, currentPersonality])

  const onAutoSpeechStart = useCallback(() => {
      console.log('[VoiceCircleV2] Speech started - INTERRUPCIÓN INMEDIATA ACTIVADA')
      
      // CRÍTICO: Enviar señal stop_tts al backend inmediatamente
      emit('stop_tts', { 
        timestamp: Date.now(),
        reason: 'user_interruption'
      })
      
      // Interrupt current TTS immediately
      if (ttsAudioRef.current) {
        try { 
          ttsAudioRef.current.pause()
          ttsAudioRef.current.currentTime = 0
        } catch {}
        ttsAudioRef.current.src = ''
        ttsAudioRef.current = null
      }
      
      // Parar todos los audios en reproducción
      try {
        const audioElements = document.querySelectorAll('audio')
        audioElements.forEach(audio => {
          audio.pause()
          audio.currentTime = 0
        })
      } catch {}
      
      // Reset estados inmediatamente
      isSpeakingRef.current = false
      setAssistantSpeaking(false)
      setIsProcessing(false)
      autoEndSentRef.current = false
      setIsListening(true)
      setTranscript('')
      setResponse('')
  }, [])

  const onAutoSilenceDetected = useCallback(() => {
      console.log('[V2 Auto] Silence detected, sending audio')
      setIsListening(false)
      setIsProcessing(true)
      if (!isConnected) return
      // Emit only if hubo voz real en este turno para evitar STT vacío
      const hadSpeech = !!autoVoiceRef.current?.hadSpeechThisTurn
      if (!hadSpeech) {
        console.warn('[VoiceCircleV2] Skip audio_end (no speech this turn)')
        setIsProcessing(false)
        return
      }
      if (!autoEndSentRef.current) {
        setTimeout(() => {
          emitRef.current && emitRef.current('audio_end', {
            personality: currentPersonality,
            prefer_short_answer: true,
            timestamp: Date.now()
          })
        }, 50)
        autoEndSentRef.current = true
      }
  }, [isConnected, currentPersonality])

  // Auto voice detection when in auto mode (options object memoized)
  const autoVoice = useAutoVoice(useMemo(() => ({
    enabled: autoMode && isAutoActive,
    isAssistantSpeaking: assistantSpeaking,
    onAudioChunk: onAutoAudioChunk,
    onAudioCapture: onAutoAudioCapture,
    onSpeechStart: onAutoSpeechStart,
    onSilenceDetected: onAutoSilenceDetected
  }), [autoMode, isAutoActive, assistantSpeaking, onAutoAudioChunk, onAutoAudioCapture, onAutoSpeechStart, onAutoSilenceDetected]))

  // Update ref after autoVoice is constructed
  useEffect(() => { autoVoiceRef.current = autoVoice }, [autoVoice])

  // Watchdog: si isProcessing tarda demasiado, rearmar estados
  useEffect(() => {
    if (!isProcessing) return
    const t = setTimeout(() => {
      console.warn('[VoiceCircleV2] Processing watchdog timeout, resetting state')
      setIsProcessing(false)
      if (autoMode && isAutoActive) {
        try { autoVoice.resetProcessing() } catch {}
      }
    }, 12000)
    return () => clearTimeout(t)
  }, [isProcessing, autoMode, isAutoActive, autoVoice])


  // Keep the latest emit function in a ref (after useSocketIO is ready)
  useEffect(() => {
    emitRef.current = emit
  }, [emit])

  // Auto-clear transient errors to avoid overlays lingering
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(''), 3000)
    return () => clearTimeout(t)
  }, [error])

  // Close personalities modal with ESC key
  useEffect(() => {
    if (!showPersonalities) return
    const onKey = (e) => { if (e.key === 'Escape') setShowPersonalities(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showPersonalities])

  const getStatusText = useCallback(() => {
    if (error) return error
    if (!micPermission) return 'Permitir micrófono'
    if (!isConnected) return 'Conectando...'
    if (autoMode && isAutoActive) {
      if (isProcessing) return 'Procesando...'
      if (isListening) return 'Auto: escuchando...'
      return 'Auto: habla cuando quieras'
    }
    if (isProcessing) return 'Procesando...'
    if (isListening) return 'Escuchando... (toca para parar)'
    return 'Toca para hablar'
  }, [error, micPermission, isConnected, autoMode, isAutoActive, isProcessing, isListening])

  const getCircleColor = useCallback(() => {
    if (isProcessing) return '#fbbf24'
    if (isListening) return '#10b981'
    return personalityData?.color || '#60a5fa'
  }, [isProcessing, isListening, personalityData?.color])

  // Initialize microphone
  useEffect(() => {
    const initMicrophone = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          } 
        })
        streamRef.current = stream
        setMicPermission(true)
        setError('')
        console.log('[VoiceCircleV2] Microphone access granted')
      } catch (err) {
        console.error('[VoiceCircleV2] Microphone access denied:', err)
        setError('Micrófono no disponible. Permite el acceso al micrófono.')
        setMicPermission(false)
      }
    }

    initMicrophone()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current)
        autoStopTimerRef.current = null
      }
    }
  }, [])

  // Online/offline status tracking
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const startRecording = async () => {
    if (!streamRef.current || !isConnected) return

    try {
      setIsListening(true)
      setTranscript('')
      setResponse('')
      setError('')
      
      audioChunksRef.current = []
      audioChunkCountRef.current = 0
      
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 24000
      })

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunkCountRef.current += 1
          audioChunksRef.current.push(event.data)
          // Stream chunk immediately to backend to reduce latency
          try {
            const reader = new FileReader()
            reader.onloadend = () => {
              const base64Chunk = reader.result.split(',')[1]
              emit('audio_chunk', { data: base64Chunk, audio: base64Chunk })
            }
            reader.readAsDataURL(event.data)
          } catch (e) {
            console.warn('[VoiceCircleV2] chunk encode error', e)
          }
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        // Evitar STT vacío si no hubo chunks
        if (audioChunkCountRef.current === 0) {
          console.warn('[VoiceCircleV2] Skip audio_end (0 chunks)')
          setIsProcessing(false)
          return
        }
        // Give a moment for last chunk to flush over polling
        setTimeout(() => {
          emit('audio_end', {
            personality: currentPersonality,
            prefer_short_answer: true,
            timestamp: Date.now()
          })
        }, 50)
      }

      // Request frequent chunks for lower latency streaming
      mediaRecorderRef.current.start(200)
      console.log('[VoiceCircleV2] Recording started')

      // Auto-stop after 10 seconds
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current)
      }
      autoStopTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording()
        }
      }, 10000)

    } catch (error) {
      console.error('[VoiceCircleV2] Recording error:', error)
      setError('Error al iniciar grabación')
      setIsListening(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current)
        autoStopTimerRef.current = null
      }
      mediaRecorderRef.current.stop()
      setIsListening(false)
      setIsProcessing(true)
      console.log('[VoiceCircleV2] Recording stopped')
    }
  }

  const sendAudioToBackend = async (audioBlob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64Audio = reader.result.split(',')[1]
        
        // Enviar como v1: audio_chunk con { data }, luego audio_end
        // Añadimos 'audio' como alias en ambos eventos para máxima compatibilidad
        emit('audio_chunk', { data: base64Audio, audio: base64Audio })
        // Pequeña espera para garantizar orden en transporte polling
        setTimeout(() => {
          emit('audio_end', {
            audio: base64Audio, // fallback para backends que esperan el audio en audio_end
            personality: currentPersonality,
            prefer_short_answer: true,
            timestamp: Date.now()
          })
        }, 50)
        
        console.log('[VoiceCircleV2] Audio sent to backend (chunk+end)')
      }
      reader.readAsDataURL(audioBlob)
    } catch (error) {
      console.error('[VoiceCircleV2] Error sending audio:', error)
      setError('Error al procesar audio')
      setIsProcessing(false)
    }
  }

  const handleStartListening = () => {
    if (!micPermission) {
      setError('Permite el acceso al micrófono para usar la función de voz')
      return
    }
    
    if (!isConnected) {
      setError('No hay conexión con el servidor')
      return
    }

    // Interrupt current TTS if user manually starts a new turn
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause() } catch {}
      ttsAudioRef.current.src = ''
      ttsAudioRef.current = null
      isSpeakingRef.current = false
      setAssistantSpeaking(false)
    }

    if (isListening) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // Funciones auxiliares para la interfaz minimalista
  const getAvatarState = () => {
    if (isListening) return 'listening'
    if (isProcessing) return 'processing'
    if (assistantSpeaking) return 'speaking'
    return 'idle'
  }

  const getMinimalStatusText = () => {
    if (isListening) return 'Escuchando tu voz...'
    if (isProcessing) return 'Procesando tu mensaje...'
    if (assistantSpeaking) return 'Respondiendo...'
    if (!isConnected) return 'Conectando al servidor...'
    if (!micPermission) return 'Necesita acceso al micrófono'
    return personalityData?.description || 'Toca para conversar'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#ffffff',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Fondo dinámico con partículas sutiles */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `radial-gradient(circle at 50% 50%, ${personalityData?.color || '#3b82f6'}05, transparent 70%)`,
        pointerEvents: 'none'
      }} />

      {/* Error minimalista */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '30px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '16px 24px',
          color: '#fca5a5',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          fontSize: '0.9em',
          fontWeight: 500
        }}>
          {error}
        </div>
      )}

      {/* Botón flotante de personalidades - minimalista */}
      <button
        onClick={() => setShowPersonalities(!showPersonalities)}
        style={{
          position: 'absolute',
          top: '30px',
          right: '30px',
          background: `linear-gradient(135deg, ${personalityData?.color || '#3b82f6'}20, ${personalityData?.color || '#3b82f6'}10)`,
          border: `1px solid ${personalityData?.color || '#3b82f6'}40`,
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '1.5em',
          color: personalityData?.color || '#3b82f6',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: `0 4px 20px ${personalityData?.color || '#3b82f6'}20`,
          zIndex: 10
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)'
          e.target.style.boxShadow = `0 6px 30px ${personalityData?.color || '#3b82f6'}40`
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)'
          e.target.style.boxShadow = `0 4px 20px ${personalityData?.color || '#3b82f6'}20`
        }}
      >
        {personalityData?.emoji || '🎭'}
      </button>

      {/* Indicadores de estado minimalistas - solo si hay problemas */}
      {(!micPermission || !online || !isConnected) && (
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '30px',
          display: 'flex',
          gap: '8px',
          zIndex: 10
        }}>
          {!micPermission && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '20px',
              padding: '6px 12px',
              color: '#f87171',
              fontSize: '0.8em',
              backdropFilter: 'blur(10px)'
            }}>
              🎙️ Sin micrófono
            </div>
          )}
          {!online && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '20px',
              padding: '6px 12px',
              color: '#f87171',
              fontSize: '0.8em',
              backdropFilter: 'blur(10px)'
            }}>
              🌐 Sin conexión
            </div>
          )}
          {!isConnected && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '20px',
              padding: '6px 12px',
              color: '#f87171',
              fontSize: '0.8em',
              backdropFilter: 'blur(10px)'
            }}>
              🖥️ Servidor offline
            </div>
          )}
        </div>
      )}

      {/* Avatar Dinámico Central - Única Interfaz */}
      <VoiceAvatar
        state={getAvatarState()}
        level={audioLevel}
        personalityColor={personalityData?.color || '#3b82f6'}
        onTap={!autoMode || !isAutoActive ? handleStartListening : undefined}
      />
      
      {/* Nombre de personalidad sutil */}
      <div style={{
        marginTop: '20px',
        textAlign: 'center',
        opacity: 0.7
      }}>
        <div style={{
          fontSize: '1.2em',
          fontWeight: 600,
          color: personalityData?.color || '#3b82f6',
          marginBottom: '4px'
        }}>
          {personalityData?.name || 'Asistente IA'}
        </div>
        <div style={{
          fontSize: '0.9em',
          color: '#94a3b8',
          maxWidth: '300px'
        }}>
          {getMinimalStatusText()}
        </div>
      </div>

      {/* Personality Selector Modal */}
      {showPersonalities && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowPersonalities(false) }}>
          <div className="modal-card">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: '#e2e8f0', margin: 0 }}>🎭 Seleccionar Personalidad</h3>
              <button
                onClick={() => setShowPersonalities(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: '1.5em',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
              {Object.entries(VOICE_CATEGORIES).map(([categoryKey, category]) => (
                <div key={categoryKey}>
                  <h4 style={{
                    color: '#e2e8f0',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>{category.emoji}</span>
                    {category.name}
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '10px'
                  }}>
                    {category.personalities.map(personalityKey => {
                      const personality = PERSONALITIES[personalityKey]
                      const isActive = currentPersonality === personalityKey
                      
                      return (
                        <button
                          key={personalityKey}
                          onClick={() => {
                            applyPersonality(personalityKey)
                            setShowPersonalities(false)
                          }}
                          style={{
                            background: isActive 
                              ? `linear-gradient(135deg, ${personality.color}30, ${personality.color}20)`
                              : 'rgba(0,0,0,0.3)',
                            border: isActive 
                              ? `2px solid ${personality.color}` 
                              : '1px solid rgba(75, 85, 99, 0.3)',
                            borderRadius: '8px',
                            padding: '12px',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px'
                          }}>
                            <span style={{ fontSize: '1.2em' }}>{personality.emoji}</span>
                            <span style={{
                              color: isActive ? personality.color : '#e2e8f0',
                              fontWeight: isActive ? 600 : 500,
                              fontSize: '0.9em'
                            }}>
                              {personality.name}
                            </span>
                          </div>
                          <div style={{
                            color: '#94a3b8',
                            fontSize: '0.8em',
                            lineHeight: '1.3'
                          }}>
                            {personality.description}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
  */
}
