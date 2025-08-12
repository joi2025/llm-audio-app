import React, { useState, useEffect } from 'react'
import usePersonality from '../hooks/usePersonality'
import useSocketIO from '../hooks/useSocketIO'
import { PERSONALITIES, VOICE_CATEGORIES } from '../data/personalities'

export default function VoiceCircleV2({ wsUrl = 'http://localhost:8001' }) {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [showPersonalities, setShowPersonalities] = useState(false)
  
  const { personalityData, currentPersonality, applyPersonality } = usePersonality()
  
  // Socket.IO connection
  const { isConnected, emit } = useSocketIO(wsUrl, {
    autoConnect: true,
    onConnect: () => console.log('[VoiceCircleV2] Connected'),
    onDisconnect: () => console.log('[VoiceCircleV2] Disconnected'),
    onError: (err) => console.error('[VoiceCircleV2] Error:', err)
  })

  const getStatusText = () => {
    if (!isConnected) return 'Conectando...'
    if (isProcessing) return 'Procesando...'
    if (isListening) return 'Escuchando...'
    return 'Toca para hablar'
  }

  const getCircleColor = () => {
    if (isProcessing) return '#fbbf24'
    if (isListening) return '#10b981'
    return personalityData?.color || '#60a5fa'
  }

  const handleStartListening = () => {
    if (!isConnected) return
    
    setIsListening(true)
    setTranscript('')
    setResponse('')
    
    // Simulate voice interaction
    setTimeout(() => {
      setIsListening(false)
      setIsProcessing(true)
      setTranscript('Hola, ¿cómo estás?')
      
      setTimeout(() => {
        setIsProcessing(false)
        setResponse(`¡Hola! Soy ${personalityData?.name || 'tu asistente'}. ¡Estoy muy bien, gracias por preguntar!`)
      }, 2000)
    }, 3000)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      color: '#e2e8f0'
    }}>
      {/* Header */}
      <div style={{
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

      {/* Main Circle */}
      <div 
        onClick={handleStartListening}
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
          transform: isListening ? 'scale(1.1)' : 'scale(1)',
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
        <button
          onClick={handleStartListening}
          disabled={!isConnected || isListening}
          style={{
            background: isConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(107, 114, 128, 0.2)',
            border: isConnected ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(107, 114, 128, 0.3)',
            color: isConnected ? '#4ade80' : '#9ca3af',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: isConnected && !isListening ? 'pointer' : 'not-allowed',
            fontWeight: 500,
            opacity: isListening ? 0.6 : 1
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
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
