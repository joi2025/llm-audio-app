import React, { useEffect, useState } from 'react'
import { AdminAPI } from '../services/api'
import { PERSONALITIES, VOICE_CATEGORIES, OPENAI_VOICES } from '../data/personalities'
import usePersonality from '../hooks/usePersonality'

export default function AdminPanel() {
  const [status, setStatus] = useState(null)
  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState(false)
  const [convos, setConvos] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('status')
  const [apiKeyStatus, setApiKeyStatus] = useState('unknown')
  
  const { personalityData, applyPersonality } = usePersonality()

  const loadAll = async () => {
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
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const onChange = (k, v) => setSettings((p) => ({ ...p, [k]: v }))

  const save = async () => {
    setSaving(true)
    try { 
      await AdminAPI.setSettings(settings)
      await loadAll()
      alert('✅ Configuración guardada correctamente')
    } catch (error) {
      alert('❌ Error al guardar: ' + error.message)
    } finally { 
      setSaving(false) 
    }
  }

  const clearConvos = async () => {
    if (confirm('¿Estás seguro de eliminar todas las conversaciones?')) {
      try {
        await AdminAPI.clearConversations()
        setConvos([])
        alert('✅ Conversaciones eliminadas')
      } catch (error) {
        alert('❌ Error al eliminar conversaciones')
      }
    }
  }

  const testApiKey = async () => {
    setApiKeyStatus('testing')
    try {
      const result = await AdminAPI.testApiKey()
      setApiKeyStatus(result.valid ? 'valid' : 'invalid')
      alert(result.valid ? '✅ API Key válida' : '❌ API Key inválida')
    } catch (error) {
      setApiKeyStatus('error')
      alert('❌ Error al probar API Key')
    }
  }

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
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header con tabs */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#e2e8f0', marginBottom: '20px' }}>🛠️ Panel de Administración</h2>
        <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #374151' }}>
          {[
            { key: 'status', label: '📊 Estado', icon: '📊' },
            { key: 'personalities', label: '🎭 Personalidades', icon: '🎭' },
            { key: 'config', label: '⚙️ Configuración', icon: '⚙️' },
            { key: 'conversations', label: '💬 Conversaciones', icon: '💬' },
            { key: 'logs', label: '📋 Logs', icon: '📋' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: activeTab === tab.key ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: 'none',
                color: activeTab === tab.key ? '#60a5fa' : '#94a3b8',
                padding: '12px 20px',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                borderBottom: activeTab === tab.key ? '2px solid #60a5fa' : '2px solid transparent',
                transition: 'all 0.3s ease'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Estado del Servidor */}
      {activeTab === 'status' && (
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#e2e8f0', margin: 0 }}>📊 Estado del Servidor</h3>
            <button 
              onClick={loadAll}
              style={{
                background: 'rgba(34, 197, 94, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#4ade80',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🔄 Refrescar
            </button>
          </div>
          
          {/* Estado de la API Key */}
          <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '1.1em', fontWeight: 600, color: '#e2e8f0' }}>🔑 Estado OpenAI API</span>
              <span style={{ 
                color: apiKeyStatus === 'valid' ? '#4ade80' : apiKeyStatus === 'missing' ? '#f87171' : '#fbbf24',
                fontWeight: 600
              }}>
                {apiKeyStatus === 'valid' ? '✅ Configurada' : 
                 apiKeyStatus === 'missing' ? '❌ No configurada' : 
                 apiKeyStatus === 'testing' ? '🔄 Probando...' : '⚠️ Desconocido'}
              </span>
            </div>
            <button 
              onClick={testApiKey}
              disabled={apiKeyStatus === 'testing'}
              style={{
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60a5fa',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: apiKeyStatus === 'testing' ? 'not-allowed' : 'pointer',
                opacity: apiKeyStatus === 'testing' ? 0.6 : 1
              }}
            >
              🧪 Probar API Key
            </button>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '2em' }}>{personalityData.emoji}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.2em', color: '#e2e8f0' }}>
                    {personalityData.name}
                  </div>
                  <div style={{ fontSize: '0.9em', opacity: 0.8, color: '#94a3b8' }}>
                    {personalityData.description}
                  </div>
                  <div style={{ fontSize: '0.8em', marginTop: '4px', color: personalityData.color }}>
                    🎤 {personalityData.voice} • 🧠 {settings.chat_model || 'gpt-4o-mini'}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Selector de Personalidades por Categoría */}
          {Object.entries(VOICE_CATEGORIES).map(([categoryKey, category]) => (
            <div key={categoryKey} style={{ marginBottom: '30px' }}>
              <h4 style={{ color: category.color, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{category.emoji}</span>
                <span>{category.name}</span>
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {Object.entries(PERSONALITIES)
                  .filter(([_, p]) => p.category === categoryKey)
                  .map(([key, personality]) => (
                    <button
                      key={key}
                      onClick={() => applyPersonality(key)}
                      style={{
                        background: personalityData?.key === key ? `${personality.color}30` : 'rgba(255,255,255,0.05)',
                        border: `2px solid ${personalityData?.key === key ? personality.color : 'transparent'}`,
                        borderRadius: '12px',
                        padding: '15px',
                        color: '#e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.5em' }}>{personality.emoji}</span>
                        <span style={{ fontWeight: 600, fontSize: '1.1em' }}>{personality.name}</span>
                      </div>
                      <div style={{ fontSize: '0.9em', opacity: 0.8, marginBottom: '8px' }}>
                        {personality.description}
                      </div>
                      <div style={{ fontSize: '0.8em', color: personality.color }}>
                        🎤 {OPENAI_VOICES[personality.voice]?.name}
                      </div>
                    </button>
                  ))
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Configuración Técnica */}
      {activeTab === 'config' && (
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#e2e8f0', margin: 0 }}>⚙️ Configuración Técnica</h3>
            <button 
              onClick={save}
              disabled={saving}
              style={{
                background: saving ? 'rgba(156, 163, 175, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                border: `1px solid ${saving ? 'rgba(156, 163, 175, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                color: saving ? '#9ca3af' : '#4ade80',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              {saving ? '💾 Guardando...' : '💾 Guardar Configuración'}
            </button>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Modelo de Chat */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: 600 }}>
                🧠 Modelo de Chat
              </label>
              <select 
                value={settings.chat_model || 'gpt-4o-mini'} 
                onChange={(e) => onChange('chat_model', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#e2e8f0'
                }}
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Rápido, Económico)</option>
                <option value="gpt-4o">GPT-4o (Equilibrado)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo (Potente)</option>
              </select>
            </div>

            {/* Voz TTS */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: 600 }}>
                🎤 Voz OpenAI (Optimizada para Español)
              </label>
              <select 
                value={settings.voice_name || 'nova'} 
                onChange={(e) => onChange('voice_name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#e2e8f0'
                }}
              >
                {Object.entries(OPENAI_VOICES).map(([key, voice]) => (
                  <option key={key} value={key}>
                    {voice.name} - {voice.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Tokens */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: 600 }}>
                  📝 Max Tokens Salida
                </label>
                <input 
                  type="number" 
                  value={settings.max_tokens_out || '150'} 
                  onChange={(e) => onChange('max_tokens_out', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#e2e8f0'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: 600 }}>
                  🎯 Temperatura (0-1)
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  min="0"
                  max="1"
                  value={settings.temperature || '0.7'} 
                  onChange={(e) => onChange('temperature', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#e2e8f0'
                  }}
                />
              </div>
            </div>

            {/* System Prompt */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: 600 }}>
                🎯 Prompt del Sistema (Personalizado)
              </label>
              <textarea 
                value={settings.system_prompt || ''} 
                onChange={(e) => onChange('system_prompt', e.target.value)}
                placeholder="Escribe un prompt personalizado o usa las personalidades predefinidas..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#e2e8f0',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Conversaciones */}
      {activeTab === 'conversations' && (
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#e2e8f0', margin: 0 }}>💬 Conversaciones ({convos.length})</h3>
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
              🗑️ Limpiar Todo
            </button>
          </div>
          
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {convos.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                <div style={{ fontSize: '3em', marginBottom: '10px' }}>💬</div>
                <div>No hay conversaciones registradas</div>
              </div>
            ) : (
              convos.map((conv, i) => (
                <div key={i} style={{ 
                  background: 'rgba(0,0,0,0.2)', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  marginBottom: '10px',
                  borderLeft: `4px solid ${conv.role === 'user' ? '#60a5fa' : '#4ade80'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ 
                      color: conv.role === 'user' ? '#60a5fa' : '#4ade80',
                      fontWeight: 600
                    }}>
                      {conv.role === 'user' ? '👤 Usuario' : '🤖 Asistente'}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.8em' }}>
                      {new Date(conv.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ color: '#e2e8f0' }}>{conv.content}</div>
                  {conv.tokens_in && (
                    <div style={{ fontSize: '0.8em', color: '#94a3b8', marginTop: '8px' }}>
                      📊 Tokens: {conv.tokens_in} → {conv.tokens_out} | 💰 ${conv.cost?.toFixed(4)}
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
            <h3 style={{ color: '#e2e8f0', margin: 0 }}>📋 Logs del Sistema ({logs.length})</h3>
            <button 
              onClick={loadAll}
              style={{
                background: 'rgba(34, 197, 94, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#4ade80',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🔄 Actualizar
            </button>
          </div>
          
          <div style={{ 
            background: 'rgba(0,0,0,0.3)', 
            padding: '15px', 
            borderRadius: '8px', 
            fontFamily: 'monospace', 
            fontSize: '0.85em',
            maxHeight: '500px',
            overflowY: 'auto'
          }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                <div style={{ fontSize: '3em', marginBottom: '10px' }}>📋</div>
                <div>No hay logs disponibles</div>
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{ 
                  color: log.includes('ERROR') ? '#f87171' : 
                        log.includes('WARN') ? '#fbbf24' : 
                        log.includes('INFO') ? '#60a5fa' : '#94a3b8',
                  marginBottom: '4px'
                }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
