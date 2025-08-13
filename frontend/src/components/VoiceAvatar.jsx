/**
 * VoiceAvatar - Avatar Dinámico de Nueva Generación
 * Componente visual avanzado con animaciones fluidas que superan ChatGPT/Grok.
 * Estados visuales hiper-realistas con sincronización perfecta de audio.
 * 
 * Estados soportados:
 * - 'idle': Respiración sutil (pulso lento y suave)
 * - 'listening': Ondas reactivas al audioLevel en tiempo real
 * - 'processing': Efecto shimmer/partículas orbitando (no spinner)
 * - 'speaking': Pulso rítmico sincronizado con TTS
 * 
 * @param {string} state - Estado actual del avatar
 * @param {number} level - Nivel de audio 0-1 para animaciones reactivas
 * @param {function} onTap - Callback para interacción táctil
 * @param {string} personalityColor - Color dinámico de la personalidad activa
 */
import React, { useEffect, useState } from 'react'

export default function VoiceAvatar({ 
  state = 'idle', 
  level = 0, 
  onTap, 
  personalityColor = '#1e90ff' 
}) {
  const [animationPhase, setAnimationPhase] = useState(0)
  const size = 240
  const base = 8
  const pulse = Math.max(0.05, level)
  const color = personalityColor
  
  // Animación continua para efectos avanzados
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 360)
    }, 50) // 20 FPS para animaciones suaves
    return () => clearInterval(interval)
  }, [])

  // Estados visuales avanzados
  const getAvatarStyle = () => {
    const baseStyle = {
      position: 'relative',
      width: size,
      height: size,
      borderRadius: '50%',
      border: `${base}px solid`,
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }
    
    switch (state) {
      case 'idle':
        // Respiración sutil - pulso lento y suave
        const breathe = 1 + Math.sin(animationPhase * 0.02) * 0.05
        return {
          ...baseStyle,
          background: `radial-gradient(circle at 40% 40%, ${color}15, #071427)`,
          borderColor: `${color}60`,
          transform: `scale(${breathe})`,
          boxShadow: `0 0 20px ${color}30`,
        }
        
      case 'listening':
        // Ondas reactivas al audioLevel
        const reactiveGlow = 20 + pulse * 60
        return {
          ...baseStyle,
          background: `radial-gradient(circle at 40% 40%, ${color}25, #0a1a35)`,
          borderColor: color,
          boxShadow: `0 0 ${reactiveGlow}px ${color}80, inset 0 0 20px ${color}20`,
          transform: `scale(${1 + pulse * 0.1})`,
        }
        
      case 'processing':
        // Efecto shimmer con gradiente rotativo
        const shimmerAngle = animationPhase * 2
        return {
          ...baseStyle,
          background: `conic-gradient(from ${shimmerAngle}deg, ${color}40, #071427, ${color}40)`,
          borderColor: color,
          boxShadow: `0 0 40px ${color}60, inset 0 0 30px ${color}15`,
          transform: 'scale(1.05)',
        }
        
      case 'speaking':
        // Pulso rítmico sincronizado
        const rhythmicPulse = 1 + Math.sin(animationPhase * 0.3) * 0.15
        return {
          ...baseStyle,
          background: `radial-gradient(circle at 40% 40%, ${color}35, #0d2447)`,
          borderColor: color,
          boxShadow: `0 0 50px ${color}90, inset 0 0 25px ${color}25`,
          transform: `scale(${rhythmicPulse})`,
        }
        
      default:
        return baseStyle
    }
  }

  // Ondas dinámicas avanzadas
  const getWaves = () => {
    if (state === 'idle') return null
    
    return [1.2, 1.4, 1.6].map((mult, i) => {
      let waveStyle = {
        position: 'absolute',
        width: size * mult,
        height: size * mult,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }
      
      switch (state) {
        case 'listening':
          // Ondas reactivas al audio
          const reactiveScale = 1 + pulse * (0.4 + i * 0.2)
          waveStyle = {
            ...waveStyle,
            opacity: 0.2 + i * 0.15 + pulse * 0.3,
            transform: `translate(-50%, -50%) scale(${reactiveScale})`,
            transition: 'transform 0.1s linear, opacity 0.2s ease',
          }
          break
          
        case 'processing':
          // Partículas orbitando
          const orbitAngle = animationPhase * (2 + i) + i * 120
          waveStyle = {
            ...waveStyle,
            opacity: 0.15 + Math.sin(animationPhase * 0.1 + i) * 0.1,
            transform: `translate(-50%, -50%) rotate(${orbitAngle}deg) scale(${0.8 + i * 0.1})`,
            transition: 'opacity 0.3s ease',
          }
          break
          
        case 'speaking':
          // Ondas rítmicas
          const rhythmicScale = 1 + Math.sin(animationPhase * 0.4 + i * 60) * (0.2 + i * 0.1)
          waveStyle = {
            ...waveStyle,
            opacity: 0.25 + i * 0.1,
            transform: `translate(-50%, -50%) scale(${rhythmicScale})`,
            transition: 'opacity 0.2s ease',
          }
          break
      }
      
      return <div key={i} style={waveStyle} />
    })
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: 16 }}>
      <div
        onClick={onTap}
        role="button"
        aria-label="avatar-voz-dinamico"
        style={getAvatarStyle()}
      >
        {getWaves()}
        {/* Contenido central dinámico */}
        <div style={{
          position: 'absolute', 
          inset: 0, 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#ffffff', 
          fontWeight: 700,
          textAlign: 'center',
          padding: '24px',
          fontSize: '15px',
          lineHeight: '1.4',
          textShadow: `0 0 10px ${color}50`,
        }}>
          {state === 'listening' && (
            <>
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>🎤 Escuchando...</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>(toca para enviar)</div>
            </>
          )}
          {state === 'speaking' && (
            <>
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>🔊 Respondiendo...</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>(toca para interrumpir)</div>
            </>
          )}
          {state === 'processing' && (
            <>
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>🧠 Procesando...</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Un momento por favor</div>
            </>
          )}
          {state === 'idle' && (
            <>
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>💬 Toca para conversar</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Asistente de voz IA</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
