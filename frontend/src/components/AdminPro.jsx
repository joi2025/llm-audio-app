import React, { useMemo, useState, useEffect } from 'react'
import useSocketIO from '../hooks/useSocketIO'
import useMetrics from '../hooks/useMetrics'
import AdminServerConfig from './AdminServerConfig'

/**
 * AdminPro
 * Advanced admin panel with real-time metrics, logs, and health monitoring.
 * Displays p50/p95/max latencies, event counters, and filterable logs.
 */
export default function AdminPro({ wsUrl, onServerChange }) {
  const [activeTab, setActiveTab] = useState('server')
  const [logFilter, setLogFilter] = useState('')
  const [logLevel, setLogLevel] = useState('all')
  const [currentServerUrl, setCurrentServerUrl] = useState(wsUrl)
  
  const { metrics, addLatency, incrementEvent, addLog, startTimer, endTimer, clearMetrics } = useMetrics()
  
  const { isConnected, connect, disconnect } = useSocketIO(wsUrl, {
    autoConnect: true,
    onConnect: () => {
      addLog('info', 'websocket', 'Connected to backend')
      incrementEvent('reconnections')
    },
    onDisconnect: (reason) => {
      addLog('warn', 'websocket', `Disconnected: ${reason}`)
    },
    onError: (error) => {
      addLog('error', 'websocket', `Connection error: ${error?.message || error}`)
      incrementEvent('errors')
    },
    onMessage: (payload) => {
      // Track streaming events for metrics
      if (payload?.type === 'llm_first_token') {
        incrementEvent('llm_first_token')
        addLog('debug', 'llm', 'First token received')
      } else if (payload?.type === 'llm_token') {
        incrementEvent('llm_token')
      } else if (payload?.type === 'audio_chunk') {
        incrementEvent('audio_chunk')
      } else if (payload?.type === 'tts_cancelled') {
        incrementEvent('tts_cancelled')
        incrementEvent('interruptions')
        addLog('debug', 'tts', 'TTS cancelled (interruption)')
      } else if (payload?.type === 'final_transcript') {
        incrementEvent('final_transcript')
        addLog('debug', 'stt', `Transcript: ${payload?.text || payload?.transcript || ''}`)
      }
    }
  })

  const sections = useMemo(() => ([
    { id: 'server', title: '🌐 Servidor' },
    { id: 'health', title: 'Salud' },
    { id: 'latency', title: 'Latencia' },
    { id: 'pipeline', title: 'Pipeline' },
    { id: 'logs', title: 'Logs' },
    { id: 'device', title: 'Dispositivo' },
  ]), [])

  const filteredLogs = useMemo(() => {
    return metrics.logs.filter(log => {
      const matchesFilter = !logFilter || 
        log.message.toLowerCase().includes(logFilter.toLowerCase()) ||
        log.source.toLowerCase().includes(logFilter.toLowerCase())
      const matchesLevel = logLevel === 'all' || log.level === logLevel
      return matchesFilter && matchesLevel
    })
  }, [metrics.logs, logFilter, logLevel])

  const formatLatency = (ms) => ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(1)}s`
  
  const getHealthStatus = () => {
    if (!isConnected) return { status: 'error', text: 'Desconectado' }
    if (metrics.events.errors > 0) return { status: 'warn', text: 'Con errores' }
    return { status: 'ok', text: 'Operativo' }
  }

  const renderHealthTab = () => {
    const health = getHealthStatus()
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{ padding: 12, background: '#1e293b', borderRadius: 8 }}>
            <h4>WebSocket</h4>
            <div style={{ color: health.status === 'ok' ? '#10b981' : health.status === 'warn' ? '#f59e0b' : '#ef4444' }}>
              {health.text}
            </div>
            <small>{wsUrl}</small>
          </div>
          <div style={{ padding: 12, background: '#1e293b', borderRadius: 8 }}>
            <h4>Backend</h4>
            <div style={{ color: '#94a3b8' }}>Pendiente /health</div>
          </div>
          <div style={{ padding: 12, background: '#1e293b', borderRadius: 8 }}>
            <h4>Audio</h4>
            <div style={{ color: '#94a3b8' }}>Permisos OK</div>
          </div>
          <div style={{ padding: 12, background: '#1e293b', borderRadius: 8 }}>
            <h4>Errores</h4>
            <div style={{ color: metrics.events.errors > 0 ? '#ef4444' : '#10b981' }}>
              {metrics.events.errors}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderLatencyTab = () => (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
        {Object.entries(metrics.latency).map(([key, data]) => (
          <div key={key} style={{ padding: 12, background: '#1e293b', borderRadius: 8 }}>
            <h4 style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: '0.9em' }}>
              <div>
                <div style={{ color: '#94a3b8' }}>p50</div>
                <div>{formatLatency(data.p50)}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8' }}>p95</div>
                <div>{formatLatency(data.p95)}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8' }}>max</div>
                <div>{formatLatency(data.max)}</div>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: '0.8em', color: '#64748b' }}>
              Última: {formatLatency(data.last)} | Muestras: {data.samples.length}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderPipelineTab = () => (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
        {Object.entries(metrics.events).map(([key, count]) => (
          <div key={key} style={{ padding: 12, background: '#1e293b', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#3b82f6' }}>{count}</div>
            <div style={{ fontSize: '0.8em', color: '#94a3b8', textTransform: 'capitalize' }}>
              {key.replace('_', ' ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderLogsTab = () => (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Filtrar logs..."
          value={logFilter}
          onChange={(e) => setLogFilter(e.target.value)}
          style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #374151', borderRadius: 4, color: 'white', flex: 1 }}
        />
        <select
          value={logLevel}
          onChange={(e) => setLogLevel(e.target.value)}
          style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #374151', borderRadius: 4, color: 'white' }}
        >
          <option value="all">Todos</option>
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
        <button
          onClick={clearMetrics}
          style={{ padding: '6px 12px', background: '#dc2626', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer' }}
        >
          Limpiar
        </button>
      </div>
      <div style={{ maxHeight: 400, overflowY: 'auto', background: '#0f172a', borderRadius: 4, padding: 8 }}>
        {filteredLogs.map(log => (
          <div key={log.id} style={{ padding: '4px 0', borderBottom: '1px solid #1e293b', fontSize: '0.85em' }}>
            <span style={{ color: '#64748b' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span style={{ 
              color: log.level === 'error' ? '#ef4444' : log.level === 'warn' ? '#f59e0b' : log.level === 'info' ? '#3b82f6' : '#94a3b8',
              marginLeft: 8,
              textTransform: 'uppercase',
              fontSize: '0.7em'
            }}>
              [{log.level}]
            </span>
            <span style={{ color: '#10b981', marginLeft: 8 }}>{log.source}</span>
            <span style={{ marginLeft: 8 }}>{log.message}</span>
          </div>
        ))}
        {filteredLogs.length === 0 && (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>No hay logs que mostrar</div>
        )}
      </div>
    </div>
  )

  const renderDeviceTab = () => (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div style={{ padding: 12, background: '#1e293b', borderRadius: 8 }}>
          <h4>User Agent</h4>
          <div style={{ fontSize: '0.8em', color: '#94a3b8', wordBreak: 'break-all' }}>
            {navigator.userAgent}
          </div>
        </div>
        <div style={{ padding: 12, background: '#1e293b', borderRadius: 8 }}>
          <h4>Conexión</h4>
          <div>Online: {navigator.onLine ? 'Sí' : 'No'}</div>
          <div>Tipo: {navigator.connection?.effectiveType || 'Desconocido'}</div>
        </div>
        <div style={{ padding: 12, background: '#1e293b', borderRadius: 8 }}>
          <h4>Permisos</h4>
          <div style={{ color: '#94a3b8' }}>Micrófono: Pendiente verificar</div>
        </div>
      </div>
    </div>
  )

  const handleServerChange = (serverConfig) => {
    setCurrentServerUrl(serverConfig.wsUrl)
    if (onServerChange) {
      onServerChange(serverConfig)
    }
    addLog('info', 'admin', `Servidor cambiado a: ${serverConfig.mode} - ${serverConfig.httpUrl}`)
  }

  const renderServerTab = () => (
    <div style={{ padding: 16 }}>
      <AdminServerConfig 
        onServerChange={handleServerChange}
        currentServer={currentServerUrl}
      />
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'server': return renderServerTab()
      case 'health': return renderHealthTab()
      case 'latency': return renderLatencyTab()
      case 'pipeline': return renderPipelineTab()
      case 'logs': return renderLogsTab()
      case 'device': return renderDeviceTab()
      default: return renderServerTab()
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #1e293b' }}>
        <h2 style={{ margin: 0 }}>Admin Pro</h2>
        <p style={{ color: '#94a3b8', margin: '4px 0 0 0' }}>Métricas en tiempo real y monitoreo del sistema</p>
      </div>
      
      <div style={{ display: 'flex', borderBottom: '1px solid #1e293b' }}>
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveTab(section.id)}
            style={{
              padding: '12px 20px',
              background: activeTab === section.id ? '#1e293b' : 'transparent',
              border: 'none',
              color: activeTab === section.id ? 'white' : '#94a3b8',
              cursor: 'pointer',
              borderBottom: activeTab === section.id ? '2px solid #3b82f6' : 'none'
            }}
          >
            {section.title}
          </button>
        ))}
      </div>
      
      {renderTabContent()}
    </div>
  )
}
