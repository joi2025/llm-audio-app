import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import useCapacitorWebSocket from './hooks/useCapacitorWebSocket'
import AudioRecorder from './components/AudioRecorder'
import AudioPlayer from './components/AudioPlayer'
import ConversationHistory from './components/ConversationHistory'
import LogsPanel from './components/LogsPanel'
const AdminPanel = React.lazy(() => import('./components/AdminPanel'))
import VoiceCircle from './pages/VoiceCircle'
import VoiceCircleV2 from './components/VoiceCircleV2'
import MinimalAssistant from './components/MinimalAssistant'
const AdminPro = React.lazy(() => import('./components/AdminPro'))
import { useConversation, useConversationActions } from './contexts/ConversationContext'
import './mobile-optimized.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://9c11d44a64e8.ngrok-free.app'

export default function App() {
  const [mode, setMode] = useState('minimal') // 'minimal' | 'user' | 'admin' | 'v2' | 'v2-auto'
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

  const [currentBackendUrl, setCurrentBackendUrl] = useState(BACKEND_URL)
  const wsUrl = useMemo(() =>
    (currentBackendUrl || '').replace('https://', 'wss://').replace('http://', 'ws://')
  , [currentBackendUrl])

  const { connect, disconnect, emit, isConnected } = useCapacitorWebSocket(wsUrl, {
    autoConnect: true,
    onConnect: () => { setConnected(true); addLog('Capacitor WebSocket: connected') },
    onDisconnect: () => { setConnected(false); addLog('Capacitor WebSocket: disconnected') },
    onError: (e) => addLog(`Capacitor WebSocket error: ${e?.message || e}`),
    onMessage,
  })

  const handleServerChange = (serverConfig) => {
    setCurrentBackendUrl(serverConfig.httpUrl)
    addLog(`Servidor cambiado a: ${serverConfig.mode} - ${serverConfig.httpUrl}`)
    // Reconectar con nueva URL
    disconnect()
    setTimeout(() => connect(), 1000)
  }

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
        <h1>🎙️ LLM Audio App</h1>
        <div className="status">
          <span className={connected ? 'dot green' : 'dot red'} />
          {connected ? 'Conectado' : 'Desconectado'}
        </div>
      </header>

      {/* Mobile-First Navigation */}
      <div className="mobile-nav">
          <div className="nav-section">
            <h3>Controles</h3>
            <div className="mobile-controls">
              <div className="control-group">
                <button 
                  className={`mobile-button ${connected ? 'danger' : 'primary'}`}
                  onClick={connected ? disconnect : connect}
                >
                  {connected ? '🔌 Desconectar' : '🔗 Conectar'}
                </button>
                <button className="mobile-button" onClick={clearAll}>
                  🗑️ Limpiar
                </button>
              </div>
            </div>
          </div>
          
          <div className="nav-section">
            <h3>Modos de Interfaz</h3>
            <div className="nav-buttons">
              <button 
                className={`nav-button ${mode === 'minimal' ? 'active' : ''}`}
                onClick={() => setMode('minimal')}
              >
                ✨ Minimal
              </button>
              <button 
                className={`nav-button ${mode === 'user' ? 'active' : ''}`}
                onClick={() => setMode('user')}
              >
                👤 Usuario
              </button>
              <button 
                className={`nav-button ${mode === 'v2' ? 'active' : ''}`}
                onClick={() => setMode('v2')}
              >
                🎤 v2 Voz
              </button>
              <button 
                className={`nav-button ${mode === 'v2-auto' ? 'active' : ''}`}
                onClick={() => setMode('v2-auto')}
              >
                🤖 v2 Auto
              </button>
            </div>
          </div>
          
          <div className="nav-section">
            <h3>Administración</h3>
            <div className="nav-buttons">
              <button 
                className={`nav-button ${mode === 'admin' ? 'active' : ''}`}
                onClick={() => setMode('admin')}
              >
                ⚙️ Admin
              </button>
              <button 
                className={`nav-button ${mode === 'admin-pro' ? 'active' : ''}`}
                onClick={() => setMode('admin-pro')}
              >
                🌐 Admin Pro
              </button>
            </div>
          </div>
        </div>

      <div className="mobile-content">
        {mode === 'minimal' ? (
          <div className="content-section animate-fade-in">
            <div className="section-header">
              <h2 className="section-title">✨ Asistente Minimal</h2>
              <span className="section-badge">Activo</span>
            </div>
            <MinimalAssistant wsUrl={wsUrl} />
          </div>
        ) : mode === 'user' ? (
          <>
            <div className="content-section">
              <div className="section-header">
                <h2 className="section-title">💬 Conversación</h2>
                <span className="section-badge">Usuario</span>
              </div>
              <div className="mobile-form">
                <div className="form-group">
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Escribe tu mensaje..."
                    value={pendingText}
                    onChange={(e) => setPendingText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                  />
                  <button className="mobile-button primary full-width" onClick={handleSendText}>
                    📤 Enviar Mensaje
                  </button>
                </div>
              </div>
              <ConversationHistory />
            </div>
            <div className="content-section">
              <div className="section-header">
                <h2 className="section-title">🎙️ Audio & Logs</h2>
              </div>
              <AudioRecorder onSend={sendJson} />
              <AudioPlayer src={audioUrl} onStop={stopAudio} />
              <LogsPanel logs={logs} />
            </div>
          </>
        ) : mode === 'admin' ? (
          <div className="content-section animate-fade-in">
            <div className="section-header">
              <h2 className="section-title">⚙️ Panel Admin</h2>
              <span className="section-badge">Admin</span>
            </div>
            <Suspense fallback={<div className="text-center text-small">Cargando Admin...</div>}>
              <AdminPanel />
            </Suspense>
          </div>
        ) : mode === 'v2-auto' ? (
          <div className="content-section animate-fade-in">
            <div className="section-header">
              <h2 className="section-title">🤖 Voz Automática</h2>
              <span className="section-badge">Auto</span>
            </div>
            <VoiceCircleV2 wsUrl={wsUrl} autoMode={true} />
          </div>
        ) : mode === 'v2' ? (
          <div className="content-section animate-fade-in">
            <div className="section-header">
              <h2 className="section-title">🎤 Control de Voz</h2>
              <span className="section-badge">Manual</span>
            </div>
            <VoiceCircleV2 wsUrl={wsUrl} />
          </div>
        ) : mode === 'admin-pro' ? (
          <div className="content-section animate-fade-in">
            <div className="section-header">
              <h2 className="section-title">🌐 Admin Pro</h2>
              <span className="section-badge">Servidor</span>
            </div>
            <Suspense fallback={<div className="text-center text-small">Cargando Admin Pro...</div>}> 
              <AdminPro wsUrl={currentBackendUrl} onServerChange={handleServerChange} />
            </Suspense>
          </div>
        ) : (
          <div className="content-section animate-fade-in">
            <div className="section-header">
              <h2 className="section-title">🎙️ Círculo de Voz</h2>
              <span className="section-badge">Básico</span>
            </div>
            <VoiceCircle wsUrl={wsUrl} />
          </div>
        )}
      </div>

      <footer>
        <small>Backend: {currentBackendUrl}</small>
      </footer>
    </div>
  )
}
