import React, { useState, useEffect } from 'react'
import './AdminPanel.css'

/**
 * AdminServerConfig - Panel administrativo para configuración de servidor
 * Permite cambiar entre servidor local y túnel ngrok dinámicamente
 */
export default function AdminServerConfig({ onServerChange, currentServer }) {
  const [serverConfig, setServerConfig] = useState({
    mode: 'local', // 'local' | 'ngrok' | 'custom'
    localUrl: 'http://10.2.0.2:8001',
    ngrokUrl: 'https://9c11d44a64e8.ngrok-free.app',
    customUrl: '',
    wsProtocol: 'ws', // 'ws' | 'wss'
  })

  const [ngrokStatus, setNgrokStatus] = useState('unknown')
  const [connectionTest, setConnectionTest] = useState(null)

  useEffect(() => {
    // Detectar configuración actual
    if (currentServer) {
      if (currentServer.includes('ngrok')) {
        setServerConfig(prev => ({ ...prev, mode: 'ngrok', ngrokUrl: currentServer }))
      } else if (currentServer.includes('localhost') || currentServer.includes('10.2.0.2')) {
        setServerConfig(prev => ({ ...prev, mode: 'local' }))
      } else {
        setServerConfig(prev => ({ ...prev, mode: 'custom', customUrl: currentServer }))
      }
    }
  }, [currentServer])

  const checkNgrokStatus = async () => {
    try {
      const response = await fetch('http://localhost:4040/api/tunnels')
      if (response.ok) {
        const data = await response.json()
        if (data.tunnels && data.tunnels.length > 0) {
          const tunnel = data.tunnels[0]
          setNgrokStatus('active')
          setServerConfig(prev => ({ 
            ...prev, 
            ngrokUrl: tunnel.public_url,
            wsProtocol: tunnel.public_url.startsWith('https') ? 'wss' : 'ws'
          }))
        } else {
          setNgrokStatus('no_tunnels')
        }
      } else {
        setNgrokStatus('offline')
      }
    } catch (error) {
      setNgrokStatus('offline')
    }
  }

  const testConnection = async (url) => {
    setConnectionTest('testing')
    try {
      const testUrl = url.replace('wss://', 'https://').replace('ws://', 'http://')
      const response = await fetch(testUrl, { 
        method: 'GET',
        timeout: 5000 
      })
      setConnectionTest(response.ok ? 'success' : 'failed')
    } catch (error) {
      setConnectionTest('failed')
    }
    setTimeout(() => setConnectionTest(null), 3000)
  }

  const handleServerChange = () => {
    let newUrl = ''
    let wsUrl = ''

    switch (serverConfig.mode) {
      case 'local':
        newUrl = serverConfig.localUrl
        wsUrl = serverConfig.localUrl.replace('http://', 'ws://')
        break
      case 'ngrok':
        newUrl = serverConfig.ngrokUrl
        wsUrl = serverConfig.ngrokUrl.replace('https://', 'wss://').replace('http://', 'ws://')
        break
      case 'custom':
        newUrl = serverConfig.customUrl
        wsUrl = serverConfig.customUrl.replace('https://', 'wss://').replace('http://', 'ws://')
        break
    }

    if (onServerChange) {
      onServerChange({
        httpUrl: newUrl,
        wsUrl: wsUrl,
        mode: serverConfig.mode
      })
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#4CAF50'
      case 'offline': return '#f44336'
      case 'no_tunnels': return '#ff9800'
      default: return '#9e9e9e'
    }
  }

  const getConnectionTestColor = (test) => {
    switch (test) {
      case 'testing': return '#2196F3'
      case 'success': return '#4CAF50'
      case 'failed': return '#f44336'
      default: return '#9e9e9e'
    }
  }

  return (
    <div className="admin-section">
      <h3>🌐 Configuración de Servidor</h3>
      
      {/* Estado Ngrok */}
      <div className="server-status">
        <div className="status-item">
          <span>Estado Ngrok:</span>
          <span 
            className="status-indicator"
            style={{ color: getStatusColor(ngrokStatus) }}
          >
            ● {ngrokStatus === 'active' ? 'Activo' : 
               ngrokStatus === 'offline' ? 'Desconectado' : 
               ngrokStatus === 'no_tunnels' ? 'Sin túneles' : 'Desconocido'}
          </span>
          <button onClick={checkNgrokStatus} className="btn-small">
            🔄 Verificar
          </button>
        </div>
      </div>

      {/* Selector de Modo */}
      <div className="server-mode-selector">
        <h4>Modo de Servidor:</h4>
        
        <label className="radio-option">
          <input
            type="radio"
            name="serverMode"
            value="local"
            checked={serverConfig.mode === 'local'}
            onChange={(e) => setServerConfig(prev => ({ ...prev, mode: e.target.value }))}
          />
          <span>🏠 Local (Red LAN)</span>
        </label>

        <label className="radio-option">
          <input
            type="radio"
            name="serverMode"
            value="ngrok"
            checked={serverConfig.mode === 'ngrok'}
            onChange={(e) => setServerConfig(prev => ({ ...prev, mode: e.target.value }))}
          />
          <span>🌍 Ngrok (Internet)</span>
        </label>

        <label className="radio-option">
          <input
            type="radio"
            name="serverMode"
            value="custom"
            checked={serverConfig.mode === 'custom'}
            onChange={(e) => setServerConfig(prev => ({ ...prev, mode: e.target.value }))}
          />
          <span>⚙️ Personalizado</span>
        </label>
      </div>

      {/* Configuración por Modo */}
      <div className="server-config-details">
        {serverConfig.mode === 'local' && (
          <div className="config-section">
            <label>URL Local:</label>
            <input
              type="text"
              value={serverConfig.localUrl}
              onChange={(e) => setServerConfig(prev => ({ ...prev, localUrl: e.target.value }))}
              placeholder="http://10.2.0.2:8001"
            />
          </div>
        )}

        {serverConfig.mode === 'ngrok' && (
          <div className="config-section">
            <label>URL Ngrok:</label>
            <input
              type="text"
              value={serverConfig.ngrokUrl}
              onChange={(e) => setServerConfig(prev => ({ ...prev, ngrokUrl: e.target.value }))}
              placeholder="https://xxxxx.ngrok-free.app"
            />
            <small>💡 Se detecta automáticamente si ngrok está corriendo</small>
          </div>
        )}

        {serverConfig.mode === 'custom' && (
          <div className="config-section">
            <label>URL Personalizada:</label>
            <input
              type="text"
              value={serverConfig.customUrl}
              onChange={(e) => setServerConfig(prev => ({ ...prev, customUrl: e.target.value }))}
              placeholder="https://mi-servidor.com:8001"
            />
          </div>
        )}
      </div>

      {/* URLs Resultantes */}
      <div className="url-preview">
        <h4>URLs Configuradas:</h4>
        <div className="url-item">
          <strong>HTTP:</strong> 
          <code>
            {serverConfig.mode === 'local' ? serverConfig.localUrl :
             serverConfig.mode === 'ngrok' ? serverConfig.ngrokUrl :
             serverConfig.customUrl}
          </code>
        </div>
        <div className="url-item">
          <strong>WebSocket:</strong> 
          <code>
            {serverConfig.mode === 'local' ? serverConfig.localUrl.replace('http://', 'ws://') :
             serverConfig.mode === 'ngrok' ? serverConfig.ngrokUrl.replace('https://', 'wss://') :
             serverConfig.customUrl.replace('https://', 'wss://').replace('http://', 'ws://')}
          </code>
        </div>
      </div>

      {/* Test de Conexión */}
      <div className="connection-test">
        <button 
          onClick={() => testConnection(
            serverConfig.mode === 'local' ? serverConfig.localUrl :
            serverConfig.mode === 'ngrok' ? serverConfig.ngrokUrl :
            serverConfig.customUrl
          )}
          className="btn-test"
          disabled={connectionTest === 'testing'}
        >
          {connectionTest === 'testing' ? '🔄 Probando...' : '🧪 Probar Conexión'}
        </button>
        
        {connectionTest && connectionTest !== 'testing' && (
          <span 
            className="test-result"
            style={{ color: getConnectionTestColor(connectionTest) }}
          >
            {connectionTest === 'success' ? '✅ Conexión exitosa' : '❌ Conexión fallida'}
          </span>
        )}
      </div>

      {/* Aplicar Cambios */}
      <div className="apply-config">
        <button onClick={handleServerChange} className="btn-primary">
          🚀 Aplicar Configuración
        </button>
      </div>

      {/* Información Adicional */}
      <div className="server-info">
        <h4>ℹ️ Información:</h4>
        <ul>
          <li><strong>Local:</strong> Solo funciona en la misma red WiFi</li>
          <li><strong>Ngrok:</strong> Acceso desde cualquier lugar con internet</li>
          <li><strong>Personalizado:</strong> Tu propio servidor o dominio</li>
        </ul>
      </div>
    </div>
  )
}
