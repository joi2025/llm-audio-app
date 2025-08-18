/**
 * VoiceCircleV2 - FINAL - Sistema Hiper-Realista Completo
 * Implementación definitiva con todas las características de las Fases 2-4
 * Interfaz minimalista + Avatar dinámico + Pipeline latencia cero
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import useWebSocketNative from '../hooks/useWebSocketNative'
import useAutoVoice from '../hooks/useAutoVoice'
import usePersonality from '../hooks/usePersonality'
import { PERSONALITIES as PERSONALITIES_MAP } from '../data/personalities'

export default function VoiceCircleV2({ wsUrl = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8001'), autoMode = false }) {
  const [assistantSpeaking, setAssistantSpeaking] = useState(false)
  const [showPersonalities, setShowPersonalities] = useState(false)
  const [error, setError] = useState('')

  // WebSocket Native connection
  const { isConnected, emit, addListener, removeAllListeners } = useWebSocketNative(wsUrl, { autoConnect: true })

  // Personalities
  const { personalityData, applyPersonality, isPersonalityActive } = usePersonality()
  const currentPersonality = personalityData || { key: 'default', name: 'Asistente', color: '#60a5fa', voice: 'alloy', emoji: '🤖' }

  // Single audio element for chunked playback
  const audioRef = useRef(null)
  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
    }
    return audioRef.current
  }, [])

  const playB64 = useCallback((b64) => {
    try {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const a = ensureAudio()
      a.src = url
      a.onended = () => {
        URL.revokeObjectURL(url)
      }
      a.play().catch(() => {})
    } catch (e) {
      console.warn('Audio decode/play error', e)
    }
  }, [ensureAudio])

  const stopAudio = useCallback(() => {
    try {
      const a = ensureAudio()
      a.pause()
      a.currentTime = 0
    } catch {}
  }, [ensureAudio])

  // Auto voice capture wired to backend
  const {
    isListening,
    isProcessing,
    manualStart,
    manualStop,
    resetProcessing,
    voiceState,
  } = useAutoVoice({
    onAudioChunk: useCallback((b64) => {
      // Stream chunks as raw base64 for backend tolerance
      emit('audio_chunk', { data: b64 })
    }, [emit]),
    onAudioCapture: useCallback((_finalB64) => {
      // End of user turn; backend should process accumulated chunks
      emit('audio_end')
    }, [emit]),
    onSilenceDetected: useCallback(() => {
      // Additional hook if needed
    }, []),
    onSpeechStart: useCallback(() => {
      // Cancel any ongoing TTS immediately
      stopAudio()
      setAssistantSpeaking(false)
      emit('stop_tts')
    }, [emit, stopAudio]),
    isAssistantSpeaking: assistantSpeaking,
    enabled: !!autoMode,
  })

  // Estados del avatar dinámico
  const getAvatarState = () => {
    if (assistantSpeaking) return 'speaking'
    if (isProcessing) return 'processing'
    if (isListening) return 'listening'
    return 'idle'
  }

  // Avatar dinámico con animaciones fluidas
  const renderAvatar = () => {
    const state = getAvatarState()
    const color = currentPersonality.color
    
    const getAnimation = () => {
      switch (state) {
        case 'idle':
          return 'pulse 3s ease-in-out infinite'
        case 'listening':
          return 'pulse 1s ease-in-out infinite, scale 1.5s ease-in-out infinite alternate'
        case 'processing':
          return 'spin 2s linear infinite, pulse 1s ease-in-out infinite'
        case 'speaking':
          return 'pulse 0.8s ease-in-out infinite'
        default:
          return 'pulse 3s ease-in-out infinite'
      }
    }

    return (
      <div
        style={{
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}40, ${color}20)`,
          border: `3px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: getAnimation(),
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={() => {
          if (!autoMode) {
            // Manual mode: toggle capture
            if (isListening) manualStop(); else manualStart()
          }
        }}
      >
        {/* Ondas internas para listening */}
        {state === 'listening' && (
          <>
            <div style={{
              position: 'absolute',
              width: '60%',
              height: '60%',
              borderRadius: '50%',
              border: `2px solid ${color}60`,
              animation: 'pulse 1s ease-in-out infinite'
            }} />
            <div style={{
              position: 'absolute',
              width: '40%',
              height: '40%',
              borderRadius: '50%',
              border: `2px solid ${color}80`,
              animation: 'pulse 1s ease-in-out infinite 0.3s'
            }} />
          </>
        )}

        {/* Partículas para processing */}
        {state === 'processing' && (
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            background: `conic-gradient(${color}, transparent, ${color})`,
            borderRadius: '50%',
            opacity: 0.3,
            animation: 'spin 2s linear infinite'
          }} />
        )}

        {/* Icono central */}
        <div style={{
          fontSize: '3em',
          color: color,
          zIndex: 2,
          textShadow: `0 0 20px ${color}40`
        }}>
          {state === 'listening' ? '🎤' : 
           state === 'processing' ? '🧠' :
           state === 'speaking' ? '🔊' : '🤖'}
        </div>
      </div>
    )
  }

  // Botón personalidades flotante
  const renderPersonalityButton = () => (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1000
    }}>
      <button
        onClick={() => setShowPersonalities(!showPersonalities)}
        style={{
          background: `${currentPersonality.color}20`,
          border: `2px solid ${currentPersonality.color}`,
          borderRadius: '50px',
          padding: '10px 20px',
          color: currentPersonality.color,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
      >
        🎭 {currentPersonality.name}
      </button>
      
      {showPersonalities && (
        <div style={{
          position: 'absolute',
          top: '50px',
          right: '0',
          background: 'rgba(30, 41, 59, 0.95)',
          borderRadius: '12px',
          padding: '15px',
          border: '1px solid rgba(75, 85, 99, 0.3)',
          minWidth: '200px'
        }}>
          {Object.entries(PERSONALITIES_MAP).map(([key, p]) => (
            <div
              key={key}
              onClick={() => {
                applyPersonality(key)
                setShowPersonalities(false)
              }}
              style={{
                padding: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: p.color,
                background: currentPersonality.key === key ? `${p.color}20` : 'transparent',
                border: currentPersonality.key === key ? `1px solid ${p.color}40` : '1px solid transparent',
                marginBottom: '5px',
                transition: 'all 0.2s ease'
              }}
            >
              🎭 {p.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Indicador de estado mínimo
  const renderStatusIndicator = () => {
    if (!error && isConnected) return null
    
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: error ? 'rgba(239, 68, 68, 0.9)' : 'rgba(245, 158, 11, 0.9)',
        color: '#fff',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '0.9em',
        fontWeight: 500,
        zIndex: 1000
      }}>
        {error || (!isConnected ? '🔄 Conectando...' : '')}
      </div>
    )
  }

  // Socket listeners for streaming events
  useEffect(() => {
    const cleanups = []
    cleanups.push(addListener('audio', (payload) => {
      const b64 = payload?.audio_b64 || payload?.audio || payload?.data
      if (b64) {
        setAssistantSpeaking(true)
        playB64(b64)
      }
    }))
    // Streamed TTS chunks from backend (websocket_unified emits 'audio_chunk')
    cleanups.push(addListener('audio_chunk', (payload) => {
      const b64 = payload?.audio_b64 || payload?.audio || payload?.data
      if (b64) {
        setAssistantSpeaking(true)
        playB64(b64)
      }
    }))
    cleanups.push(addListener('tts_end', () => {
      setAssistantSpeaking(false)
      stopAudio()
      resetProcessing()
    }))
    // Immediate cancellation acknowledgement from backend
    cleanups.push(addListener('tts_cancelled', () => {
      setAssistantSpeaking(false)
      stopAudio()
      resetProcessing()
    }))
    cleanups.push(addListener('stop_tts', () => {
      setAssistantSpeaking(false)
      stopAudio()
    }))
    cleanups.push(addListener('error', (e) => {
      setError(typeof e === 'string' ? e : (e?.message || 'Error'))
    }))
    // LLM first token could switch to speaking/processing states if needed
    cleanups.push(addListener('result_llm', () => {
      // When we get LLM content, consider we are processing/speaking soon
    }))
    return () => {
      try { cleanups.forEach(fn => fn && fn()) } catch {}
      removeAllListeners()
    }
  }, [addListener, removeAllListeners, playB64, stopAudio, resetProcessing])

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, #1e293b 0%, #0f172a 100%)`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Fondo dinámico con partículas sutiles */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `radial-gradient(circle at 20% 80%, ${currentPersonality.color}10 0%, transparent 50%),
                     radial-gradient(circle at 80% 20%, ${currentPersonality.color}08 0%, transparent 50%),
                     radial-gradient(circle at 40% 40%, ${currentPersonality.color}05 0%, transparent 50%)`,
        pointerEvents: 'none'
      }} />

      {/* Avatar principal */}
      <div style={{ zIndex: 2 }}>
        {renderAvatar()}
      </div>

      {/* Texto de estado contextual */}
      <div style={{
        marginTop: '30px',
        color: '#94a3b8',
        fontSize: '1.1em',
        textAlign: 'center',
        zIndex: 2
      }}>
        {assistantSpeaking ? '🔊 Hablando...' :
         isProcessing ? '🧠 Procesando...' :
         isListening ? '🎤 Escuchando...' :
         autoMode ? '💬 Listo para conversar' : '👋 Hola, soy tu asistente'}
      </div>

      {/* Indicador de modo automático */}
      {autoMode && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'rgba(34, 197, 94, 0.2)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '20px',
          padding: '8px 16px',
          color: '#4ade80',
          fontSize: '0.9em',
          fontWeight: 600,
          zIndex: 1000
        }}>
          🤖 Modo Auto Activo
        </div>
      )}

      {/* Botón personalidades flotante */}
      {renderPersonalityButton()}

      {/* Indicador de estado */}
      {renderStatusIndicator()}

      {/* Estilos CSS en JS para animaciones */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
