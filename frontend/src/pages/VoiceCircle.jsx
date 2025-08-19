import React, { useCallback, useEffect, useRef, useState } from 'react'
import VoiceAvatar from '../components/VoiceAvatar'
import useMicVAD from '../hooks/useMicVAD'
import useSocketIO from '../hooks/useSocketIO'
import usePersonality from '../hooks/usePersonality'
import { PERSONALITIES, VOICE_CATEGORIES } from '../data/personalities'

export default function VoiceCircle({ wsUrl }) {
  const [uiState, setUiState] = useState('idle') // idle | listening | processing | speaking
  const [showPersonalities, setShowPersonalities] = useState(false)
  const [level, setLevel] = useState(0)
  const audioRef = useRef(null)

  // 🎭 Personality system
  const { personalityData, applyPersonality, getGreeting } = usePersonality()

  const onAudio = useCallback((b64, mime='audio/mpeg') => {
    try {
      const b = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const blob = new Blob([b], { type: mime })
      const url = URL.createObjectURL(blob)
      const el = audioRef.current
      if (el) {
        el.pause()
        el.src && URL.revokeObjectURL(el.src)
        el.src = url
        el.onended = () => {
          console.debug('[v2] audio playback ended, ready for next interaction')
          setUiState('idle')
        }
        el.play().catch(()=>{})
      }
      setUiState('speaking')
    } catch {}
  }, [])

  // use refs for handlers to avoid re-renders and hook-order mismatches
  const handleWSMessageRef = useRef(() => {})
  const interruptTTSRef = useRef(() => {})

  // SocketIO connection
  const { connected, sendMessage, addListener } = useSocketIO(wsUrl)

  useEffect(() => {
    // Set up SocketIO listeners
    const cleanupFunctions = []
    
    cleanupFunctions.push(addListener('result_stt', (data) => {
      console.debug('[v2] 📝 STT result:', data.transcription)
    }))
    
    cleanupFunctions.push(addListener('result_llm', (data) => {
      console.debug('[v2] 🤖 LLM result:', data.transcription)
      setUiState('speaking')
    }))
    
    cleanupFunctions.push(addListener('audio', (data) => {
      console.debug('[v2] 🔊 Audio received')
      if (audioRef.current && data.audio) {
        const audioBlob = new Blob([Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))], { type: 'audio/mpeg' })
        const audioUrl = URL.createObjectURL(audioBlob)
        audioRef.current.src = audioUrl
        audioRef.current.play().catch(e => console.error('Audio play error:', e))
      }
    }))
    
    cleanupFunctions.push(addListener('tts_end', () => {
      console.debug('[v2] ✅ TTS finished')
      setUiState('idle')
    }))
    
    cleanupFunctions.push(addListener('error', (data) => {
      console.error('[v2] ❌ Error:', data)
      setUiState('idle')
    }))
    
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [addListener])

  // 🚀 OPTIMIZED Voice capture - SocketIO compatible
  const { startListening, stopListening, listening } = useMicVAD({
    streaming: false,
    rmsThreshold: 0.015,
    maxSilenceMs: 600,
    minVoiceMs: 200,
    onFinal: (base64) => {
      console.debug('[v2] 🎤 Audio captured:', base64?.length, 'chars')
      
      if (connected) {
        // Send audio chunk first
        sendMessage('audio_chunk', { data: base64 })
        // Then signal end of audio
        sendMessage('audio_end', { prefer_short_answer: true })
        setUiState('processing')
      } else {
        console.error('[v2] ❌ Not connected to server')
        setUiState('idle')
      }
    },
    onSilenceEnd: () => {
      console.debug('[v2] 🤫 Silence detected')
    },
    onLevel: (level) => {
      // Visual feedback for voice level
    }
  })

  useEffect(() => {
    setUiState(listening ? 'listening' : (uiState === 'listening' ? 'idle' : uiState))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening])

  const handleTap = useCallback(() => {
    console.debug('[v2] 👆 Tap detected, current state:', uiState, 'listening:', listening)
    
    if (uiState === 'speaking') {
      console.debug('[v2] 🛑 Interrupting audio playback')
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      setUiState('idle')
    } else if (listening) {
      console.debug('[v2] ✋ Manual stop during listening')
      stopListening(true)
    } else if (uiState === 'idle' && connected) {
      console.debug('[v2] 🎤 Starting voice capture')
      setUiState('listening')
      startListening()
    } else if (!connected) {
      console.warn('[v2] ⚠️ Not connected to server')
    } else if (uiState === 'processing') {
      console.debug('[v2] ⏸️ Processing in progress, ignoring tap')
    }
  }, [uiState, listening, startListening, stopListening, connected])

  const getStateText = () => {
    switch (uiState) {
      case 'listening': return listening ? 'Escuchando… 🎤' : 'Preparando…'
      case 'processing': return 'Procesando… 🧠'
      case 'speaking': return 'Respondiendo… 🔊'
      default: return 'Toca para conversar 💬'
    }
  }
  
  const getStateColor = () => {
    switch (uiState) {
      case 'listening': return '#00ff88'  // Green for active listening
      case 'processing': return '#ffaa00'  // Orange for processing
      case 'speaking': return '#0088ff'   // Blue for speaking
      default: return '#ffffff'          // White for idle
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '70vh', padding: '20px' }}>
      {/* 🎭 Personality Header */}
      {personalityData && (
        <div style={{
          background: `linear-gradient(135deg, ${personalityData.color}20, ${personalityData.color}10)`,
          border: `1px solid ${personalityData.color}40`,
          borderRadius: '12px',
          padding: '12px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#e2e8f0'
        }}>
          <span style={{ fontSize: '1.5em' }}>{personalityData.emoji}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1.1em' }}>{personalityData.name}</div>
            <div style={{ fontSize: '0.8em', opacity: 0.8 }}>{personalityData.description}</div>
          </div>
        </div>
      )}
      
      {/* Voice Avatar */}
      <div style={{ position: 'relative' }}>
        <VoiceAvatar 
          state={uiState}
          level={0.1}
          onTap={handleTap}
        />
        
        {/* Personality Selector Button */}
        <button
          onClick={() => setShowPersonalities(!showPersonalities)}
          style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            background: 'rgba(59, 130, 246, 0.9)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            color: 'white',
            fontSize: '1.2em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          🎭
        </button>
      </div>
      
      {/* Quick Personality Selector */}
      {showPersonalities && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(26, 26, 46, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '16px',
          padding: '20px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#e2e8f0', margin: 0 }}>🎭 Elige tu Personalidad</h3>
            <button
              onClick={() => setShowPersonalities(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1.5em',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
          
          {Object.entries(VOICE_CATEGORIES).map(([categoryKey, category]) => (
            <div key={categoryKey} style={{ marginBottom: '24px' }}>
              <h4 style={{ color: category.color, margin: '0 0 12px 0', fontSize: '1.1em' }}>
                {category.emoji} {category.name}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {Object.entries(PERSONALITIES)
                  .filter(([_, p]) => p.category === categoryKey)
                  .map(([key, personality]) => (
                    <button
                      key={key}
                      onClick={() => {
                        applyPersonality(key)
                        setShowPersonalities(false)
                      }}
                      style={{
                        background: personalityData?.key === key ? `${personality.color}30` : 'rgba(255,255,255,0.05)',
                        border: `2px solid ${personalityData?.key === key ? personality.color : 'transparent'}`,
                        borderRadius: '12px',
                        padding: '12px',
                        color: '#e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '1.2em' }}>{personality.emoji}</span>
                        <span style={{ fontWeight: 600 }}>{personality.name}</span>
                      </div>
                      <div style={{ fontSize: '0.8em', opacity: 0.8 }}>{personality.description}</div>
                    </button>
                  ))
                }
              </div>
            </div>
          ))}
        </div>
      )}
      
      <audio 
        ref={audioRef} 
        hidden 
        onEnded={() => {
          console.debug('[v2] 🔚 Audio playback ended')
          setUiState('idle')
        }}
      />
      
      <div style={{ marginTop: 12, color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>
        <div>Estado: {connected ? '🟢 Conectado' : '🔴 Desconectado'}</div>
        {personalityData && (
          <div style={{ marginTop: 4, fontSize: 10, opacity: 0.7 }}>
            🎤 {personalityData.voice} • 🎭 {personalityData.name}
          </div>
        )}
      </div>
    </div>
  )
}
