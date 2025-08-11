import React, { useEffect, useRef, useState, useCallback } from 'react'
import useWebSocket from '../hooks/useWebSocket'
import VoiceAvatar from '../components/VoiceAvatar'
import useMicVAD from '../hooks/useMicVAD'
import useAgentVoice from '../hooks/useAgentVoice'

export default function VoiceCircle({ wsUrl }) {
  const [uiState, setUiState] = useState('idle') // idle | listening | processing | speaking
  const [level, setLevel] = useState(0)
  const audioRef = useRef(null)

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

  const { handleWSMessageFactory, interruptTTSFactory } = useAgentVoice({ setUiState, onAudio })

  // use refs for handlers to avoid re-renders and hook-order mismatches
  const handleWSMessageRef = useRef(() => {})
  const interruptTTSRef = useRef(() => {})

  const { sendJson, state: wsState } = useWebSocket(wsUrl, {
    autoConnect: true,
    keepAliveSec: 25,
    onMessage: (raw) => handleWSMessageRef.current(raw),
  })

  // Tie factories (need sendJson available)
  useEffect(() => {
    handleWSMessageRef.current = handleWSMessageFactory({ sendJson })
    interruptTTSRef.current = interruptTTSFactory({ sendJson, audioEl: audioRef.current })
  }, [handleWSMessageFactory, interruptTTSFactory, sendJson])

  const { startListening, stopListening, listening } = useMicVAD({
    streaming: false,
    onFinal: (base64) => {
      console.debug('[v2] final blob size(b64)=', base64?.length)
      sendJson({ type: 'audio_chunk', data: base64, mime: 'audio/webm;codecs=opus', size_b64: base64?.length, meta: { mode: 'v2-voice' } })
      sendJson({ type: 'audio_end', meta: { mode: 'v2-voice', prefer_short_answer: true } })
    },
    onSilenceEnd: () => {
      console.debug('[v2] silencio sostenido -> processing')
      setUiState('processing')
    },
    onLevel: setLevel,
    rmsThreshold: 0.01,
    maxSilenceMs: 900,
    chunkMs: 400,
  })

  useEffect(() => {
    setUiState(listening ? 'listening' : (uiState === 'listening' ? 'idle' : uiState))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening])

  const onTap = () => {
    if (uiState === 'speaking') {
      console.debug('[v2] tap while speaking -> interrupt TTS + listen')
      interruptTTSRef.current()
      startListening()
      setUiState('listening')
      return
    }
    if (uiState === 'listening') {
      console.debug('[v2] tap durante escucha -> stop')
      stopListening(true) // onFinal enviará chunk + audio_end
      setUiState('processing')
      return
    }
    // idle / processing -> start listening
    console.debug('[v2] tap -> start listening')
    startListening()
    setUiState('listening')
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
      <VoiceAvatar state={uiState} level={level} onTap={onTap} />
      <audio ref={audioRef} hidden />
      <div style={{ marginTop: 12, color: '#94a3b8', fontSize: 12 }}>Estado WS: {wsState}</div>
    </div>
  )
}
