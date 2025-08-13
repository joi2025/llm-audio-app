import React, { useCallback, useEffect, useRef, useState } from 'react'
import VoiceAvatar from '../components/VoiceAvatar'
import useSocketIO from '../hooks/useSocketIO'
import usePersonality from '../hooks/usePersonality'
import useAutoVoice from '../hooks/useAutoVoice'
import { PERSONALITIES, VOICE_CATEGORIES } from '../data/personalities'

/**
 * VoiceCircle v2 - Versión mejorada con detección automática de voz
 * - Sin botones: detección automática por silencios
 * - Interrupciones naturales durante respuesta del asistente
 * - Optimizado para español con baja latencia
 * - Sistema de personalidades integrado
 * - Interfaz moderna y eficiente
 */
export default function VoiceCircleV2({ wsUrl }) {
  const [showPersonalities, setShowPersonalities] = useState(false)
  const [lastTranscription, setLastTranscription] = useState('')
  const [conversationHistory, setConversationHistory] = useState([])
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false)
  const audioRef = useRef(null)
  
  // 🎭 Sistema de personalidades
  const { personalityData, applyPersonality, getGreeting } = usePersonality()
  
  // 🔌 Conexión SocketIO
  const { connected, sendMessage } = useSocketIO(wsUrl, {
    onMessage: useCallback((event, data) => {
      console.log(`[v2] 📨 ${event}:`, data)
      
      switch (event) {
        case 'result_stt':
          setLastTranscription(data.transcription)
          setConversationHistory(prev => [...prev, { 
            role: 'user', 
            content: data.transcription, 
            timestamp: Date.now() 
          }])
          autoVoice.resetProcessing()
          break
          
        case 'result_llm':
          setConversationHistory(prev => [...prev, { 
            role: 'assistant', 
            content: data.transcription, 
            timestamp: Date.now() 
          }])
          break
          
        case 'audio':
          handleAudioPlayback(data.data)
          break
          
        case 'tts_end':
          setIsAssistantSpeaking(false)
          console.log('[v2] 🔊 TTS finalizado, listo para nueva entrada')
          break
          
        case 'error':
          console.error('[v2] ❌ Error:', data)
          autoVoice.resetProcessing()
          setIsAssistantSpeaking(false)
          break
      }
    }, [])
  })

  // 🎤 Sistema de voz automático
  const autoVoice = useAutoVoice({
    onAudioCapture: useCallback((audioB64) => {
      console.log('[v2] 📤 Enviando audio automáticamente...')
      sendMessage('audio_chunk', { data: audioB64 })
      sendMessage('audio_end', { prefer_short_answer: true })
    }, [sendMessage]),
    
    onSilenceDetected: useCallback(() => {
      console.log('[v2] 🤫 Silencio detectado, procesando...')
    }, []),
    
    onSpeechStart: useCallback(() => {
      console.log('[v2] 🎤 Inicio de habla detectado')
      // Interrumpir audio del asistente si está hablando
      if (isAssistantSpeaking && audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        setIsAssistantSpeaking(false)
        console.log('[v2] ✋ Audio del asistente interrumpido')
      }
    }, [isAssistantSpeaking]),
    
    isAssistantSpeaking,
    enabled: connected
  })

  // 🔊 Manejo de reproducción de audio
  const handleAudioPlayback = useCallback((audioB64) => {
    try {
      const audioBytes = Uint8Array.from(atob(audioB64), c => c.charCodeAt(0))
      const blob = new Blob([audioBytes], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      
      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.play()
        setIsAssistantSpeaking(true)
        console.log('[v2] 🔊 Reproduciendo respuesta del asistente')
      }
    } catch (error) {
      console.error('[v2] ❌ Error reproduciendo audio:', error)
      setIsAssistantSpeaking(false)
    }
  }, [])

  // 🎯 Estado visual del círculo
  const getCircleState = useCallback(() => {
    if (autoVoice.isProcessing) return 'processing'
    if (autoVoice.isListening) return 'listening'
    if (isAssistantSpeaking) return 'speaking'
    return 'idle'
  }, [autoVoice.isProcessing, autoVoice.isListening, isAssistantSpeaking])

  // 🎨 Colores dinámicos basados en personalidad
  const getPersonalityColor = useCallback(() => {
    return personalityData?.color || '#60a5fa'
  }, [personalityData])

  // 🔄 Saludo inicial cuando se conecta
  useEffect(() => {
    if (connected && personalityData && conversationHistory.length === 0) {
      const greeting = getGreeting()
      setConversationHistory([{ 
        role: 'assistant', 
        content: greeting, 
        timestamp: Date.now() 
      }])
    }
  }, [connected, personalityData, conversationHistory.length, getGreeting])

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      minHeight: '100vh', 
      padding: '20px',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
    }}>
      {/* 🎭 Header de personalidad activa */}
      {personalityData && (
        <div style={{
          background: `linear-gradient(135deg, ${personalityData.color}20, ${personalityData.color}10)`,
          border: `1px solid ${personalityData.color}40`,
          borderRadius: '16px',
          padding: '16px 24px',
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          color: '#e2e8f0',
          backdropFilter: 'blur(10px)',
          boxShadow: `0 8px 32px ${personalityData.color}20`
        }}>
          <span style={{ fontSize: '2em' }}>{personalityData.emoji}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.3em', marginBottom: '4px' }}>
              {personalityData.name}
            </div>
            <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
              {personalityData.description}
            </div>
            <div style={{ fontSize: '0.8em', marginTop: '6px', color: personalityData.color }}>
              🎤 {personalityData.voice} • 🧠 Detección automática • 🌐 {connected ? 'Conectado' : 'Desconectado'}
            </div>
          </div>
        </div>
      )}

      {/* 🎤 Círculo de voz principal */}
      <div style={{ position: 'relative', marginBottom: '30px' }}>
        <VoiceAvatar 
          state={getCircleState()}
          level={autoVoice.audioLevel}
          onTap={autoVoice.autoMode ? undefined : autoVoice.manualStart} // Solo manual si auto está desactivado
          color={getPersonalityColor()}
        />
        
        {/* 🎭 Botón selector de personalidades */}
        <button
          onClick={() => setShowPersonalities(!showPersonalities)}
          style={{
            position: 'absolute',
            top: '-12px',
            right: '-12px',
            background: `linear-gradient(135deg, ${getPersonalityColor()}90, ${getPersonalityColor()}70)`,
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            color: 'white',
            fontSize: '1.4em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            transition: 'all 0.3s ease',
            transform: showPersonalities ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          🎭
        </button>

        {/* ⚙️ Botón de configuración de auto-voz */}
        <button
          onClick={autoVoice.toggleAutoMode}
          style={{
            position: 'absolute',
            top: '-12px',
            left: '-12px',
            background: autoVoice.autoMode 
              ? 'linear-gradient(135deg, #10b981, #059669)' 
              : 'linear-gradient(135deg, #6b7280, #4b5563)',
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            color: 'white',
            fontSize: '1.2em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            transition: 'all 0.3s ease'
          }}
          title={autoVoice.autoMode ? 'Modo Automático Activado' : 'Modo Manual Activado'}
        >
          {autoVoice.autoMode ? '🤖' : '👆'}
        </button>
      </div>

      {/* 📊 Indicadores de estado */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        marginBottom: '20px',
        fontSize: '0.9em',
        color: '#94a3b8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: connected ? '#10b981' : '#ef4444' 
          }} />
          {connected ? 'Conectado' : 'Desconectado'}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: autoVoice.autoMode ? '#10b981' : '#f59e0b' 
          }} />
          {autoVoice.autoMode ? 'Auto' : 'Manual'}
        </div>
        
        {autoVoice.audioLevel > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            🎤 Nivel: {Math.round(autoVoice.audioLevel * 100)}%
          </div>
        )}
      </div>

      {/* 💬 Última transcripción */}
      {lastTranscription && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#e2e8f0',
          fontSize: '0.9em',
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <strong>Dijiste:</strong> "{lastTranscription}"
        </div>
      )}

      {/* 🎭 Selector rápido de personalidades */}
      {showPersonalities && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '30px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 25px 50px rgba(0,0,0,0.7)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h3 style={{ color: '#e2e8f0', margin: 0, fontSize: '1.4em' }}>
              🎭 Elige tu Personalidad
            </h3>
            <button
              onClick={() => setShowPersonalities(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1.8em',
                cursor: 'pointer',
                padding: '5px'
              }}
            >
              ✕
            </button>
          </div>
          
          {Object.entries(VOICE_CATEGORIES).map(([categoryKey, category]) => (
            <div key={categoryKey} style={{ marginBottom: '30px' }}>
              <h4 style={{ 
                color: category.color, 
                margin: '0 0 15px 0', 
                fontSize: '1.2em',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span>{category.emoji}</span>
                <span>{category.name}</span>
              </h4>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '15px' 
              }}>
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
                        background: personalityData?.key === key 
                          ? `linear-gradient(135deg, ${personality.color}40, ${personality.color}20)` 
                          : 'rgba(255,255,255,0.05)',
                        border: `2px solid ${personalityData?.key === key ? personality.color : 'transparent'}`,
                        borderRadius: '16px',
                        padding: '20px',
                        color: '#e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textAlign: 'left',
                        transform: personalityData?.key === key ? 'scale(1.02)' : 'scale(1)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '1.8em' }}>{personality.emoji}</span>
                        <span style={{ fontWeight: 700, fontSize: '1.1em' }}>{personality.name}</span>
                      </div>
                      <div style={{ fontSize: '0.9em', opacity: 0.8, marginBottom: '10px' }}>
                        {personality.description}
                      </div>
                      <div style={{ fontSize: '0.8em', color: personality.color }}>
                        🎤 {personality.voice} • Optimizada para español
                      </div>
                    </button>
                  ))
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔊 Audio player oculto */}
      <audio 
        ref={audioRef} 
        hidden 
        onEnded={() => {
          console.log('[v2] 🔊 Audio terminado')
          setIsAssistantSpeaking(false)
        }}
        onError={(e) => {
          console.error('[v2] ❌ Error de audio:', e)
          setIsAssistantSpeaking(false)
        }}
      />

      {/* 💡 Ayuda contextual */}
      <div style={{ 
        position: 'fixed', 
        bottom: '20px', 
        left: '50%', 
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.7)',
        color: '#94a3b8',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '0.8em',
        textAlign: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        {autoVoice.autoMode ? (
          autoVoice.voiceState === 'idle' ? 
            '🎤 Habla naturalmente - Detección automática activada' :
          autoVoice.voiceState === 'listening' ?
            '👂 Escuchando... Pausa para enviar' :
          autoVoice.voiceState === 'processing' ?
            '🧠 Procesando tu mensaje...' :
            '🔊 Respuesta del asistente - Habla para interrumpir'
        ) : (
          '👆 Modo manual - Toca el círculo para hablar'
        )}
      </div>
    </div>
  )
}
