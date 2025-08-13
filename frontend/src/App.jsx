import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import useSocketIO from './hooks/useSocketIO'
import AudioRecorder from './components/AudioRecorder'
import AudioPlayer from './components/AudioPlayer'
import ConversationHistory from './components/ConversationHistory'
import LogsPanel from './components/LogsPanel'
const AdminPanel = React.lazy(() => import('./components/AdminPanel'))
import VoiceCircle from './pages/VoiceCircle'
import VoiceCircleV2 from './components/VoiceCircleV2'
import { useConversation, useConversationActions } from './contexts/ConversationContext'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

export default function App() {
  const [mode, setMode] = useState('user') // 'user' | 'admin' | 'v2' | 'v2-auto'
  const [connected, setConnected] = useState(false)
  const [logs, setLogs] = useState([])
  const [audioUrl, setAudioUrl] = useState(null)
  const [pendingText, setPendingText] = useState('')
  const messages = useConversation(s => s.messages)
  const { appendUser, appendAssistant, clear } = useConversationActions()

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
      appendUser(transcript)
    } else if (transcript && (payload?.from === 'assistant' || payload?.type === 'response' || payload?.type === 'result' || payload?.type === 'result_llm')) {
      appendAssistant(transcript)
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
  }, [addLog, appendUser, appendAssistant])

  const { connect, disconnect, emit, isConnected } = useSocketIO(BACKEND_URL, {
    autoConnect: true,
    onConnect: () => { setConnected(true); addLog('Socket.IO: connected') },
    onDisconnect: () => { setConnected(false); addLog('Socket.IO: disconnected') },
    onError: (e) => addLog(`Socket.IO error: ${e?.message || e}`),
    onMessage,
  })

  // Simple wrapper used by AudioRecorder callbacks
  const sendJson = useCallback((payload) => {
    try {
      if (!payload || !payload.type) return
      // emit(event, data)
      emit(payload.type, payload.data ?? payload)
    } catch (e) {
      addLog(`sendJson error: ${e?.message || e}`)
    }
  }, [emit, addLog])

  // Avoid two concurrent sockets: when using v2 or v2-auto screens, disconnect the global one
  useEffect(() => {
    if (mode === 'v2' || mode === 'v2-auto') {
      disconnect()
    }
  }, [mode, disconnect])

  useEffect(() => {
    if (mode !== 'v2' && mode !== 'v2-auto' && !isConnected) {
      connect()
    }
  }, [mode, isConnected, connect])

  const handleSendText = () => {
    const text = pendingText.trim()
    if (!text) return
    appendUser(text)
    emit('user_text', { text })
    setPendingText('')
  }

  const clearAll = () => {
    clear()
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
          <button onClick={() => setMode('v2')} disabled={mode==='v2'}>v2 Voz</button>
          <button onClick={() => setMode('v2-auto')} disabled={mode==='v2-auto'} style={{
            background: mode === 'v2-auto' ? 'linear-gradient(135deg, #10b981, #059669)' : '',
            color: mode === 'v2-auto' ? 'white' : '',
            fontWeight: mode === 'v2-auto' ? 'bold' : 'normal'
          }}>🤖 v2 Auto</button>
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
      ) : mode === 'admin' ? (
        <Suspense fallback={<div style={{ padding: 20, color: '#94a3b8' }}>Cargando Admin...</div>}>
          <AdminPanel />
        </Suspense>
      ) : mode === 'v2-auto' ? (
        <VoiceCircleV2 wsUrl={BACKEND_URL} autoMode={true} />
      ) : mode === 'v2' ? (
        <VoiceCircleV2 wsUrl={BACKEND_URL} />
      ) : (
        <VoiceCircle wsUrl={BACKEND_URL} />
      )}

      <footer>
        <small>Backend: {BACKEND_URL}</small>
      </footer>
    </div>
  )
}
