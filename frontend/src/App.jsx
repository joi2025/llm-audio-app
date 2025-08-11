import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useWebSocket from './hooks/useWebSocket'
import AudioRecorder from './components/AudioRecorder'
import AudioPlayer from './components/AudioPlayer'
import ConversationHistory from './components/ConversationHistory'
import LogsPanel from './components/LogsPanel'
import AdminPanel from './components/AdminPanel'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8001/ws/assistant'

export default function App() {
  const [mode, setMode] = useState('user') // 'user' | 'admin'
  const [connected, setConnected] = useState(false)
  const [logs, setLogs] = useState([])
  const [messages, setMessages] = useState([])
  const [audioUrl, setAudioUrl] = useState(null)
  const [pendingText, setPendingText] = useState('')

  const addLog = useCallback((entry) => {
    setLogs((l) => [...l, `[${new Date().toLocaleTimeString()}] ${entry}`])
  }, [])

  const onMessage = useCallback((dataRaw) => {
    let payload = dataRaw
    try {
      if (typeof dataRaw === 'string') payload = JSON.parse(dataRaw)
    } catch {}

    if (payload?.type) {
      addLog(`recv type=${payload.type}`)
    }

    // Tolerante a distintos formatos del backend
    // 1) Texto de usuario o asistente
    const transcript = payload?.transcription || payload?.transcript || payload?.text
    if (transcript && payload?.from === 'user') {
      setMessages((m) => [...m, { role: 'user', text: transcript }])
    } else if (transcript && (payload?.from === 'assistant' || payload?.type === 'response' || payload?.type === 'result' || payload?.type === 'result_llm')) {
      setMessages((m) => [...m, { role: 'assistant', text: transcript }])
    }

    // 2) Audio base64
    const audioB64 = payload?.audio_b64 || payload?.audio || payload?.data
    if (payload?.type === 'audio' && audioB64) {
      try {
        const b = Uint8Array.from(atob(audioB64), (c) => c.charCodeAt(0))
        const blob = new Blob([b], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        setAudioUrl((old) => { if (old) URL.revokeObjectURL(old); return url })
      } catch (e) {
        addLog(`error decoding audio: ${e?.message || e}`)
      }
    }

    // 3) Mensaje genérico
    if (!transcript && !audioB64 && typeof payload === 'object') {
      addLog(`recv json: ${JSON.stringify(payload)}`)
    } else if (typeof payload === 'string') {
      addLog(`recv text: ${payload}`)
    }
  }, [addLog])

  const { connect, disconnect, sendJson, state } = useWebSocket(WS_URL, {
    autoConnect: true,
    retry: { maxAttempts: Infinity, backoffBaseMs: 800, backoffMaxMs: 8000 },
    onOpen: () => { setConnected(true); addLog('WebSocket: open') },
    onClose: () => { setConnected(false); addLog('WebSocket: close') },
    onError: (e) => addLog(`WebSocket error: ${e?.message || e}`),
    onMessage,
    keepAliveSec: 25,
  })

  const handleSendText = () => {
    const text = pendingText.trim()
    if (!text) return
    setMessages((m) => [...m, { role: 'user', text }])
    sendJson({ type: 'user_text', text })
    setPendingText('')
  }

  const clearAll = () => {
    setMessages([])
    setLogs([])
    setAudioUrl((old) => { if (old) URL.revokeObjectURL(old); return null })
  }

  const stopAudio = () => {
    setAudioUrl((old) => { if (old) URL.revokeObjectURL(old); return null })
  }

  return (
    <div className="container">
      <header>
        <h1>LLM Audio App</h1>
        <div className="status">
          <span className={connected ? 'dot green' : 'dot red'} />
          {connected ? 'Conectado' : 'Desconectado'}
        </div>
      </header>

      <section className="controls" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={connected ? disconnect : connect}>
          {connected ? 'Desconectar' : 'Conectar'}
        </button>
        <button onClick={clearAll}>Limpiar</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setMode('user')} disabled={mode==='user'}>Usuario</button>
          <button onClick={() => setMode('admin')} disabled={mode==='admin'}>Admin</button>
        </div>
      </section>

      {mode === 'user' ? (
        <>
          <section className="recorder">
            <AudioRecorder
              disabled={!connected}
              onChunk={(base64) => sendJson({ type: 'audio_chunk', data: base64 })}
              onStop={() => sendJson({ type: 'audio_end' })}
              addLog={addLog}
            />
          </section>

          <section className="composer">
            <input
              type="text"
              placeholder="Escribe y envía al asistente"
              value={pendingText}
              onChange={(e) => setPendingText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            />
            <button onClick={handleSendText} disabled={!connected}>Enviar</button>
          </section>

          <section className="content">
            <div className="left">
              <ConversationHistory messages={messages} />
            </div>
            <div className="right">
              <AudioPlayer src={audioUrl} onStop={stopAudio} />
              <LogsPanel logs={logs} />
            </div>
          </section>
        </>
      ) : (
        <AdminPanel />
      )}

      <footer>
        <small>WS: {WS_URL}</small>
      </footer>
    </div>
  )
}
