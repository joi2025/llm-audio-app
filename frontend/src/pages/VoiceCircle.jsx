import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
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
        el.onended = () => setUiState('idle')
        el.play().catch(()=>{})
      }
      setUiState('speaking')
    } catch {}
  }, [])

  const { handleWSMessageFactory, interruptTTSFactory } = useAgentVoice({ setUiState, onAudio })

  const [handleWSMessage, setHandleWSMessage] = useState(() => () => {})
  const [interruptTTS, setInterruptTTS] = useState(() => () => {})

  const { sendJson, state: wsState } = useWebSocket(wsUrl, {
    autoConnect: true,
    keepAliveSec: 25,
    onMessage: (raw) => handleWSMessage(raw),
  })

  // Tie factories (need sendJson available)
  useEffect(() => {
    setHandleWSMessage(() => handleWSMessageFactory({ sendJson }))
    setInterruptTTS(() => interruptTTSFactory({ sendJson, audioEl: audioRef.current }))
  }, [handleWSMessageFactory, interruptTTSFactory, sendJson])

  const { startListening, stopListening, listening } = useMicVAD({
    onChunk: (base64) => sendJson({ type: 'audio_chunk', data: base64, meta: { mode: 'v2-voice' } }),
    onSilenceEnd: () => {
      sendJson({ type: 'audio_end', meta: { mode: 'v2-voice', prefer_short_answer: true } })
      setUiState('processing')
    },
    onLevel: setLevel,
  })

  useEffect(() => {
    setUiState(listening ? 'listening' : (uiState === 'listening' ? 'idle' : uiState))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening])

  const onTap = () => {
    if (uiState === 'speaking') {
      interruptTTS()
      startListening()
      setUiState('listening')
      return
    }
    if (uiState === 'listening') {
      stopListening(true) // force send
      return
    }
    // idle / processing -> start listening
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
