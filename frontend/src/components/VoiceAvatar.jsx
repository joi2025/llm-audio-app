import React from 'react'

// estados: 'idle' | 'listening' | 'processing' | 'speaking'
// level: 0..1 (intensidad para animación)
export default function VoiceAvatar({ state = 'idle', level = 0, onTap }) {
  const size = 220
  const base = 6
  const pulse = Math.max(0.05, level)
  const color = '#1e90ff' // azul

  const borderGlow = {
    boxShadow: `0 0 ${10 + pulse * 30}px ${color}`,
    borderColor: color,
  }

  const waves = [1, 1.15, 1.3].map((mult, i) => {
    const opacity = state === 'listening' ? 0.15 + i * 0.12 : state === 'speaking' ? 0.12 + i * 0.1 : 0.08
    const scale = 1 + pulse * (0.3 + i * 0.15)
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: '50%',
          border: `2px solid ${color}`,
          opacity,
          transform: `scale(${scale})`,
          transition: 'transform 0.12s linear, opacity 0.2s ease',
        }}
      />
    )
  })

  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: 16 }}>
      <div
        onClick={onTap}
        role="button"
        aria-label="avatar-voz"
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'radial-gradient( circle at 40% 40%, #0b1e3a, #071427 )',
          border: `${base}px solid #153056`,
          cursor: 'pointer',
          userSelect: 'none',
          ...(state !== 'idle' ? borderGlow : {}),
        }}
      >
        {waves}
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          color: '#e5f1ff', fontWeight: 600
        }}>
          {state === 'listening' && 'Escuchando… (toca para enviar)'}
          {state === 'speaking' && 'Hablando… (toca para interrumpir)'}
          {state === 'processing' && 'Pensando…'}
          {state === 'idle' && 'Toca para hablar'}
        </div>
      </div>
    </div>
  )
}
