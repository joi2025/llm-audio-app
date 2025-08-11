import React, { useEffect, useRef } from 'react'

export default function AudioPlayer({ src, onStop }) {
  const audioRef = useRef(null)

  useEffect(() => {
    const el = audioRef.current
    if (!el || !src) return
    // re-load and play new audio
    el.load()
    const play = async () => {
      try { await el.play() } catch {}
    }
    play()
  }, [src])

  return (
    <div className="audio">
      <strong>Respuesta de audio</strong>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <audio ref={audioRef} controls src={src || undefined} style={{ width: '100%' }} />
        <button onClick={() => {
          const el = audioRef.current
          if (el) { try { el.pause() } catch {} }
          onStop && onStop()
        }} disabled={!src}>Parar</button>
      </div>
      {!src && <div style={{ color: '#94a3b8', fontSize: 12 }}>No hay audio disponible</div>}
    </div>
  )
}
