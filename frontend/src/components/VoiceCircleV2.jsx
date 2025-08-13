import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import usePersonality from '../hooks/usePersonality'
import useSocketIO from '../hooks/useSocketIO'
import useAutoVoice from '../hooks/useAutoVoice'
import { PERSONALITIES, VOICE_CATEGORIES } from '../data/personalities'

export default function VoiceCircleV2({ wsUrl = 'http://localhost:8001', autoMode = false }) {
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
  const { isConnected, emit } = useSocketIO(wsUrl, useMemo(() => ({
    autoConnect: true,
    onConnect: () => {
      console.log('[VoiceCircleV2] Connected')
      setTranscript('')
      setResponse('')
    },
    onDisconnect: () => {
      console.log('[VoiceCircleV2] Disconnected')
      // Avoid UI stuck in processing when transport drops mid-turn
      setIsProcessing(false)
      // Consider assistant not speaking on disconnect
      setAssistantSpeaking(false)
    },
    onError: (err) => console.error('[VoiceCircleV2] Error:', err),
    onMessage: (data) => {
      console.log('[VoiceCircleV2] Received:', data)

      // Handle explicit TTS end events
      if (data?.type === 'tts_end') {
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

      // Handle LLM response (tolerant keys)
      const llmText = data?.response || (data?.text && (data?.type === 'response' || data?.type === 'result' || data?.type === 'result_llm') ? data.text : undefined)
      if (llmText) {
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
  }), []))

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
      console.log('[V2 Auto] Speech detected')
      // If assistant is speaking, interrupt TTS immediately for responsiveness
      if (ttsAudioRef.current) {
        try { ttsAudioRef.current.pause() } catch {}
        ttsAudioRef.current.src = ''
        ttsAudioRef.current = null
        isSpeakingRef.current = false
        setAssistantSpeaking(false)
      }
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
      
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 24000
      })

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
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

  return (
    <div className="vcv2" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      color: '#e2e8f0',
      // Expose personality color to CSS via variable
      ['--persona']: personalityData?.color || '#60a5fa'
    }}>
      {/* Header */}
      <div className="fixed-header" style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${personalityData?.color || '#60a5fa'}20, ${personalityData?.color || '#60a5fa'}10)`,
          border: `1px solid ${personalityData?.color || '#60a5fa'}40`,
          borderRadius: '12px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '1.5em' }}>{personalityData?.emoji || '🤖'}</span>
          <div>
            <div style={{ fontWeight: 600 }}>{personalityData?.name || 'Asistente'}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.85em' }}>
              {personalityData?.description || 'Asistente de voz'}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowPersonalities(!showPersonalities)}
          style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            padding: '12px 20px',
            color: '#60a5fa',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          🎭 Personalidades
        </button>
      </div>

      {/* Health strip */}
      <div className="health-strip" style={{ marginBottom: '20px' }}>
        <span className="pill" style={{
          background: micPermission ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          border: micPermission ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
          color: micPermission ? '#34d399' : '#f87171'
        }}>
          🎙️ Mic: {micPermission ? 'OK' : 'Sin permiso'}
        </span>
        <span className="pill" style={{
          background: online ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          border: online ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
          color: online ? '#34d399' : '#f87171'
        }}>
          🌐 Red: {online ? 'OK' : 'Offline'}
        </span>
        <span className="pill" style={{
          background: isConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          border: isConnected ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
          color: isConnected ? '#34d399' : '#f87171'
        }}>
          🖥️ Servidor: {isConnected ? 'OK' : 'Desconectado'}
        </span>
        <button onClick={playBeep} style={{
          background: 'rgba(59, 130, 246, 0.2)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: '#60a5fa',
          padding: '6px 10px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.85em'
        }}>
          🔊 Probar audio
        </button>
      </div>

      {/* Main Circle */}
      <div 
        onClick={!autoMode || !isAutoActive ? handleStartListening : undefined}
        className={`voice-circle${isListening ? ' listening' : ''}${isProcessing ? ' processing' : ''}`}
        style={{
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${getCircleColor()}40, ${getCircleColor()}20)`,
          border: `3px solid ${getCircleColor()}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isConnected ? 'pointer' : 'not-allowed',
          transition: 'all 0.3s ease',
          boxShadow: `0 0 ${isListening ? '30px' : '15px'} ${getCircleColor()}60`,
          marginBottom: '40px'
        }}
      >
        <div style={{ fontSize: '3em', marginBottom: '10px' }}>
          {personalityData?.emoji || '🤖'}
        </div>
        <div style={{ textAlign: 'center', fontSize: '1.1em', fontWeight: 500 }}>
          {getStatusText()}
        </div>
      </div>

      {/* Transcript & Response */}
      <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        {transcript && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '12px',
            padding: '15px',
            marginBottom: '15px',
            border: '1px solid rgba(75, 85, 99, 0.3)'
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.9em', marginBottom: '5px' }}>
              Tú dijiste:
            </div>
            <div style={{ fontSize: '1.1em' }}>"{transcript}"</div>
          </div>
        )}

        {response && (
          <div style={{
            background: `linear-gradient(135deg, ${getCircleColor()}10, rgba(0,0,0,0.3))`,
            borderRadius: '12px',
            padding: '15px',
            border: `1px solid ${getCircleColor()}30`
          }}>
            <div style={{ color: getCircleColor(), fontSize: '0.9em', marginBottom: '5px' }}>
              {personalityData?.name || 'Asistente'}:
            </div>
            <div style={{ fontSize: '1.1em' }}>"{response}"</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        display: 'flex',
        gap: '15px'
      }}>
        {autoMode && (
          <button
            onClick={() => setIsAutoActive(!isAutoActive)}
            style={{
              background: isAutoActive ? 'rgba(168, 85, 247, 0.2)' : 'rgba(107, 114, 128, 0.2)',
              border: isAutoActive ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(107, 114, 128, 0.3)',
              color: isAutoActive ? '#c084fc' : '#9ca3af',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            {isAutoActive ? '🎯 Auto Activo' : '🎯 Activar Auto'}
          </button>
        )}
        <button
          onClick={handleStartListening}
          disabled={!isConnected || isListening || (autoMode && isAutoActive)}
          style={{
            background: isConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(107, 114, 128, 0.2)',
            border: isConnected ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(107, 114, 128, 0.3)',
            color: isConnected ? '#4ade80' : '#9ca3af',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: isConnected && !isListening && !(autoMode && isAutoActive) ? 'pointer' : 'not-allowed',
            fontWeight: 500,
            opacity: isListening || (autoMode && isAutoActive) ? 0.6 : 1
          }}
        >
          {isListening ? '🎤 Escuchando...' : '🎤 Hablar'}
        </button>

        <button
          onClick={() => window.history.back()}
          style={{
            background: 'rgba(107, 114, 128, 0.2)',
            border: '1px solid rgba(107, 114, 128, 0.3)',
            color: '#9ca3af',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          ← Volver
        </button>
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
}
