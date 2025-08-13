import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { AdminAPI } from '../services/api'
import { PERSONALITIES, VOICE_CATEGORIES, OPENAI_VOICES } from '../data/personalities'
import usePersonality from '../hooks/usePersonality'
import '../styles/personalities.css'

export default function AdminPanel() {
  const [status, setStatus] = useState(null)
  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState(false)
  const [convos, setConvos] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('status')
  const [apiKeyStatus, setApiKeyStatus] = useState('unknown')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  
  const { personalityData, applyPersonality } = usePersonality()

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [st, s, c, l] = await Promise.all([
        AdminAPI.status().catch(() => ({ error: 'No se pudo conectar al servidor' })),
        AdminAPI.getSettings().catch(() => ({})),
        AdminAPI.conversations(100).catch(() => []),
        AdminAPI.logs(200).catch(() => []),
      ])
      setStatus(st)
      setSettings(s || {})
      setConvos(c || [])
      setLogs(l || [])
      
      // Verificar API Key
      if (st && !st.error) {
        setApiKeyStatus(st.openai_configured ? 'valid' : 'missing')
      }
      
      // Cargar API key actual si existe
      if (s && s.openai_api_key && s.openai_api_key !== 'sk-your-api-key-here') {
        setApiKeyInput(s.openai_api_key)
      }
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [])

  const onChange = useCallback((k, v) => setSettings((p) => ({ ...p, [k]: v })), [])

  const save = useCallback(async () => {
    setSaving(true)
    try { 
      console.debug('[AdminPanel] Saving settings', settings)
      await AdminAPI.setSettings(settings)
      await loadAll()
      alert('✅ Configuración guardada correctamente')
    } catch (error) {
      alert('❌ Error al guardar: ' + error.message)
    } finally { 
      setSaving(false) 
    }
  }, [settings, loadAll])

  const clearConvos = useCallback(async () => {
    if (confirm('¿Estás seguro de eliminar todas las conversaciones?')) {
      try {
        await AdminAPI.clearConversations()
        setConvos([])
        alert('✅ Conversaciones eliminadas')
      } catch (error) {
        alert('❌ Error al eliminar conversaciones')
      }
    }
  }, [])

  const testApiKey = useCallback(async (keyToTest = null) => {
    setApiKeyStatus('testing')
    try {
      console.debug('[AdminPanel] Testing API key')
      const result = await AdminAPI.testApiKey(keyToTest)
      setApiKeyStatus(result.valid ? 'valid' : 'invalid')
      alert(result.valid ? '✅ API Key válida' : `❌ API Key inválida: ${result.error}`)
      return result.valid
    } catch (error) {
      setApiKeyStatus('error')
      alert('❌ Error al probar API Key: ' + error.message)
      return false
    }
  }, [])

  const saveApiKey = useCallback(async () => {
    if (!apiKeyInput.trim()) {
      alert('❌ Por favor ingresa una API Key')
      return
    }
    
    if (!apiKeyInput.startsWith('sk-')) {
      alert('❌ La API Key debe comenzar con "sk-"')
      return
    }
    
    setSaving(true)
    try {
      // Primero probar la key
      const isValid = await testApiKey(apiKeyInput)
      
      if (isValid) {
        // Si es válida, guardarla
        const newSettings = { ...settings, openai_api_key: apiKeyInput }
        await AdminAPI.setSettings(newSettings)
        setSettings(newSettings)
        setShowApiKeyInput(false)
        await loadAll()
        alert('✅ API Key guardada y configurada correctamente')
      }
    } catch (error) {
      alert('❌ Error al guardar API Key: ' + error.message)
    } finally {
      setSaving(false)
    }
  }, [apiKeyInput, settings, testApiKey, loadAll])

  // Window the heavy lists to avoid huge DOM and expensive re-render
  const windowedConvos = useMemo(() => {
    if (!convos) return []
    const N = 200
    return convos.length > N ? convos.slice(convos.length - N) : convos
  }, [convos])
  const windowedLogs = useMemo(() => {
    if (!logs) return []
    const N = 300
    return logs.length > N ? logs.slice(logs.length - N) : logs
  }, [logs])

  // Eliminado TabButton redundante (no usado) en favor de clases CSS .tabs/.tab-btn

  const ConvoRow = React.memo(function ConvoRow({ c }) {
    return (
      <div style={{ 
        background: 'rgba(0,0,0,0.2)', 
        borderRadius: '8px', 
        padding: '12px', 
        marginBottom: '10px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
          <span style={{ 
            background: c.role === 'user' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)',
            color: c.role === 'user' ? '#4ade80' : '#60a5fa',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.8em',
            fontWeight: 600
          }}>
            {c.role === 'user' ? '👤 Usuario' : '🤖 Asistente'}
          </span>
          <span style={{ color: '#94a3b8', fontSize: '0.8em' }}>
            {new Date(c.created_at).toLocaleString()}
          </span>
        </div>
        <div style={{ color: '#e2e8f0', lineHeight: '1.4' }}>
          {c.text}
        </div>
        {c.tokens_in && (
          <div style={{ color: '#6b7280', fontSize: '0.8em', marginTop: '5px' }}>
            Tokens: {c.tokens_in} entrada, {c.tokens_out} salida
          </div>
        )}
      </div>
    )
  })

  const LogRow = React.memo(function LogRow({ l }) {
    return (
      <div style={{ 
        marginBottom: '8px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(75, 85, 99, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            color: l.level === 'ERROR' ? '#f87171' : l.level === 'WARNING' ? '#fbbf24' : '#4ade80',
            fontWeight: 600
          }}>
            [{l.level}]
          </span>
          <span style={{ color: '#94a3b8', fontSize: '0.8em' }}>
            {new Date(l.created_at).toLocaleString()}
          </span>
        </div>
        <div style={{ color: '#e2e8f0', marginTop: '4px' }}>
          {l.message}
        </div>
      </div>
    )
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '2em', marginBottom: '10px' }}>⚙️</div>
          <div>Cargando panel de administración...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', ['--persona']: personalityData?.color || '#60a5fa' }}>
      {/* Header con tabs */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#e2e8f0', marginBottom: '20px' }}>🛠️ Panel de Administración</h2>
        
        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: '20px' }}>
          {[
            { id: 'status', label: '📊 Estado', icon: '📊' },
            { id: 'personalities', label: '🎭 Personalidades', icon: '🎭' },
            { id: 'config', label: '⚙️ Configuración', icon: '⚙️' },
            { id: 'conversations', label: '💬 Conversaciones', icon: '💬' },
            { id: 'logs', label: '📋 Logs', icon: '📋' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Estado */}
      {activeTab === 'status' && (
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ color: '#e2e8f0', marginBottom: '20px' }}>📊 Estado del Sistema</h3>
          
          {/* Estado de la API Key */}
          <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <span style={{ fontSize: '1.1em', fontWeight: 600, color: '#e2e8f0' }}>🔑 OpenAI API Key</span>
              <span style={{ 
                color: apiKeyStatus === 'valid' ? '#4ade80' : apiKeyStatus === 'missing' ? '#f87171' : '#fbbf24',
                fontWeight: 600
              }}>
                {apiKeyStatus === 'valid' ? '✅ Configurada' : 
                 apiKeyStatus === 'missing' ? '❌ No configurada' : 
                 apiKeyStatus === 'testing' ? '🔄 Probando...' : '⚠️ Desconocido'}
              </span>
            </div>
            
            {/* Configuración de API Key */}
            {!showApiKeyInput ? (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setShowApiKeyInput(true)}
                  style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: '#4ade80',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  🔧 Configurar API Key
                </button>
                <button 
                  onClick={() => testApiKey()}
                  disabled={apiKeyStatus === 'testing'}
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#60a5fa',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: apiKeyStatus === 'testing' ? 'not-allowed' : 'pointer',
                    opacity: apiKeyStatus === 'testing' ? 0.6 : 1,
                    fontWeight: 500
                  }}
                >
                  🧪 Probar API Key
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '10px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      borderRadius: '6px',
                      color: '#e2e8f0',
                      fontSize: '14px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={saveApiKey}
                    disabled={saving || !apiKeyInput.trim()}
                    style={{
                      background: 'rgba(34, 197, 94, 0.2)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      color: '#4ade80',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: (saving || !apiKeyInput.trim()) ? 'not-allowed' : 'pointer',
                      opacity: (saving || !apiKeyInput.trim()) ? 0.6 : 1,
                      fontWeight: 500
                    }}
                  >
                    {saving ? '💾 Guardando...' : '💾 Guardar'}
                  </button>
                  <button 
                    onClick={() => {
                      setShowApiKeyInput(false)
                      setApiKeyInput(settings.openai_api_key || '')
                    }}
                    style={{
                      background: 'rgba(107, 114, 128, 0.2)',
                      border: '1px solid rgba(107, 114, 128, 0.3)',
                      color: '#9ca3af',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    ❌ Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Información del servidor */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.9em' }}>
            <pre style={{ whiteSpace: 'pre-wrap', color: '#94a3b8', margin: 0 }}>
              {status?.error ? `❌ Error: ${status.error}` : JSON.stringify(status, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Tab: Personalidades */}
      {activeTab === 'personalities' && (
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ color: '#e2e8f0', marginBottom: '20px' }}>🎭 Personalidades Avanzadas</h3>
          
          {/* Personalidad Actual */}
          {personalityData && (
            <div style={{ 
              background: `linear-gradient(135deg, ${personalityData.color}20, ${personalityData.color}10)`,
              border: `1px solid ${personalityData.color}40`,
              borderRadius: '12px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.5em' }}>{personalityData.emoji}</span>
                <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '1.1em' }}>
                  Personalidad Activa: {personalityData.name}
                </span>
              </div>
              <p style={{ color: '#94a3b8', margin: 0 }}>{personalityData.description}</p>
            </div>
          )}
          
          {/* Selector de Personalidades */}
          <div style={{ display: 'grid', gap: '15px' }}>
            {Object.entries(VOICE_CATEGORIES).map(([categoryKey, category]) => (
              <div key={categoryKey} style={{ 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: '8px', 
                padding: '15px' 
              }}>
                <h4 style={{ 
                  color: '#e2e8f0', 
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>{category.emoji}</span>
                  {category.name}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {category.personalities.map(personalityKey => {
                    const personality = PERSONALITIES[personalityKey]
                    const isActive = settings.personality === personalityKey
                    
                    return (
                      <button
                        key={personalityKey}
                        onClick={() => {
                          onChange('personality', personalityKey)
                          applyPersonality(personalityKey)
                        }}
                        style={{
                          background: isActive 
                            ? `linear-gradient(135deg, ${personality.color}30, ${personality.color}20)`
                            : 'rgba(0,0,0,0.3)',
                          border: isActive 
                            ? `2px solid ${personality.color}` 
                            : '1px solid rgba(75, 85, 99, 0.3)',
                          borderRadius: '8px',
                          padding: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '1.2em' }}>{personality.emoji}</span>
                          <span style={{ 
                            color: isActive ? personality.color : '#e2e8f0', 
                            fontWeight: isActive ? 600 : 500,
                            fontSize: '0.9em'
                          }}>
                            {personality.name}
                          </span>
                        </div>
                        <div style={{ 
                          color: '#94a3b8', 
                          fontSize: '0.8em',
                          lineHeight: '1.3'
                        }}>
                          {personality.description}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Configuración */}
      {activeTab === 'config' && (
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ color: '#e2e8f0', marginBottom: '20px' }}>⚙️ Configuración Técnica</h3>
          
          <div style={{ display: 'grid', gap: '15px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '15px' }}>
              <label style={{ color: '#e2e8f0', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
                🎤 Voz OpenAI
              </label>
              <select 
                value={settings.voice_name || 'nova'} 
                onChange={(e) => onChange('voice_name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(75, 85, 99, 0.5)',
                  borderRadius: '6px',
                  color: '#e2e8f0'
                }}
              >
                {Object.entries(OPENAI_VOICES).map(([key, voice]) => (
                  <option key={key} value={key}>
                    {voice.name} ({voice.gender}) - {voice.description}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '15px' }}>
              <label style={{ color: '#e2e8f0', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
                🧠 Modelo LLM
              </label>
              <select 
                value={settings.chat_model || 'gpt-4o-mini'} 
                onChange={(e) => onChange('chat_model', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(75, 85, 99, 0.5)',
                  borderRadius: '6px',
                  color: '#e2e8f0'
                }}
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Rápido)</option>
                <option value="gpt-4o">GPT-4o (Equilibrado)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo (Potente)</option>
              </select>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '15px' }}>
              <label style={{ color: '#e2e8f0', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
                🌡️ Temperatura (Creatividad)
              </label>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature || 0.6}
                onChange={(e) => onChange('temperature', parseFloat(e.target.value))}
                style={{ width: '100%', marginBottom: '5px' }}
              />
              <div style={{ color: '#94a3b8', fontSize: '0.9em' }}>
                Valor: {settings.temperature || 0.6} (0 = Conservador, 1 = Creativo)
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '15px' }}>
              <label style={{ color: '#e2e8f0', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
                📝 Máximo Tokens
              </label>
              <input 
                type="number"
                value={settings.max_tokens || 120}
                onChange={(e) => onChange('max_tokens', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(75, 85, 99, 0.5)',
                  borderRadius: '6px',
                  color: '#e2e8f0'
                }}
              />
            </div>

            <button 
              onClick={save} 
              disabled={saving}
              style={{
                background: 'rgba(34, 197, 94, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#4ade80',
                padding: '12px 20px',
                borderRadius: '8px',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                fontWeight: 600,
                fontSize: '1em'
              }}
            >
              {saving ? '💾 Guardando...' : '💾 Guardar Configuración'}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Conversaciones */}
      {activeTab === 'conversations' && (
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#e2e8f0', margin: 0 }}>💬 Conversaciones</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={async () => setConvos(await AdminAPI.conversations(100))}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#60a5fa',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                🔄 Refrescar
              </button>
              <button 
                onClick={clearConvos}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                🗑️ Limpiar
              </button>
            </div>
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {convos.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                No hay conversaciones registradas
              </div>
            ) : (
              convos.map(c => (
                <div key={c.id} style={{ 
                  background: 'rgba(0,0,0,0.2)', 
                  borderRadius: '8px', 
                  padding: '12px', 
                  marginBottom: '10px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <span style={{ 
                      background: c.role === 'user' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                      color: c.role === 'user' ? '#4ade80' : '#60a5fa',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8em',
                      fontWeight: 600
                    }}>
                      {c.role === 'user' ? '👤 Usuario' : '🤖 Asistente'}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.8em' }}>
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ color: '#e2e8f0', lineHeight: '1.4' }}>
                    {c.text}
                  </div>
                  {c.tokens_in && (
                    <div style={{ color: '#6b7280', fontSize: '0.8em', marginTop: '5px' }}>
                      Tokens: {c.tokens_in} entrada, {c.tokens_out} salida
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Logs */}
      {activeTab === 'logs' && (
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#e2e8f0', margin: 0 }}>📋 Logs del Sistema</h3>
            <button 
              onClick={async () => setLogs(await AdminAPI.logs(200))}
              style={{
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60a5fa',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🔄 Refrescar
            </button>
          </div>
          
          <div style={{ 
            maxHeight: '400px', 
            overflowY: 'auto',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            padding: '15px',
            fontFamily: 'monospace',
            fontSize: '0.9em'
          }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                No hay logs disponibles
              </div>
            ) : (
              logs.map(l => (
                <div key={l.id} style={{ 
                  marginBottom: '8px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid rgba(75, 85, 99, 0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      color: l.level === 'ERROR' ? '#f87171' : l.level === 'WARNING' ? '#fbbf24' : '#4ade80',
                      fontWeight: 600
                    }}>
                      [{l.level}]
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.8em' }}>
                      {new Date(l.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ color: '#e2e8f0', marginTop: '4px' }}>
                    {l.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
