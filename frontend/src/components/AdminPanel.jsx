import React, { useEffect, useState } from 'react'
import { AdminAPI } from '../services/api'

export default function AdminPanel() {
  const [status, setStatus] = useState(null)
  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState(false)
  const [convos, setConvos] = useState([])
  const [logs, setLogs] = useState([])

  const loadAll = async () => {
    const [st, s, c, l] = await Promise.all([
      AdminAPI.status().catch(() => null),
      AdminAPI.getSettings().catch(() => ({})),
      AdminAPI.conversations(100).catch(() => []),
      AdminAPI.logs(200).catch(() => []),
    ])
    setStatus(st)
    setSettings(s || {})
    setConvos(c || [])
    setLogs(l || [])
  }

  useEffect(() => { loadAll() }, [])

  const onChange = (k, v) => setSettings((p) => ({ ...p, [k]: v }))

  const save = async () => {
    setSaving(true)
    try { await AdminAPI.setSettings(settings); await loadAll() } finally { setSaving(false) }
  }

  const clearConvos = async () => {
    await AdminAPI.clearConversations();
    setConvos([])
  }

  return (
    <div className="admin-grid">
      <div className="card">
        <h3>Estado del servidor</h3>
        <button onClick={loadAll}>Refrescar</button>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(status, null, 2)}</pre>
      </div>

      <div className="card">
        <h3>Configuración</h3>
        <div className="form-row">
          <label>Calidad (tier)</label>
          <select value={settings.tier || 'medium'} onChange={(e)=>onChange('tier', e.target.value)}>
            <option value="low">Baja</option>
            <option value="medium_low">Media baja</option>
            <option value="medium">Media</option>
            <option value="medium_high">Media alta</option>
            <option value="high">Alta</option>
          </select>
        </div>
        <div className="form-row">
          <label>Voz</label>
          <input value={settings.voice_name || 'alloy'} onChange={(e)=>onChange('voice_name', e.target.value)} />
        </div>
        <div className="form-row">
          <label>Género</label>
          <select value={settings.voice_gender || 'female'} onChange={(e)=>onChange('voice_gender', e.target.value)}>
            <option value="female">Femenina</option>
            <option value="male">Masculina</option>
          </select>
        </div>
        <div className="form-row">
          <label>Estilo</label>
          <select value={settings.voice_style || 'friendly'} onChange={(e)=>onChange('voice_style', e.target.value)}>
            <option value="friendly">Amable</option>
            <option value="teacher">Profesor</option>
            <option value="sexy">Sexy</option>
            <option value="buddy">Compañero</option>
          </select>
        </div>
        <div className="form-row">
          <label>Ánimo</label>
          <input value={settings.voice_mood || 'warm'} onChange={(e)=>onChange('voice_mood', e.target.value)} />
        </div>
        <div className="form-row">
          <label>Max tokens entrada</label>
          <input type="number" value={settings.max_tokens_in || '2048'} onChange={(e)=>onChange('max_tokens_in', e.target.value)} />
        </div>
        <div className="form-row">
          <label>Max tokens salida</label>
          <input type="number" value={settings.max_tokens_out || '512'} onChange={(e)=>onChange('max_tokens_out', e.target.value)} />
        </div>
        <button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>

      <div className="card">
        <h3>Conversaciones</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={async()=>setConvos(await AdminAPI.conversations(100))}>Refrescar</button>
          <button onClick={clearConvos}>Limpiar</button>
        </div>
        <ul className="list">
          {convos.map(c => (
            <li key={c.id}>
              <b>{c.role}</b> — {c.text}
              <div className="meta">{c.created_at} · in:{c.tokens_in} out:{c.tokens_out} · ${'{'}c.cost{'}'}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Logs</h3>
        <button onClick={async()=>setLogs(await AdminAPI.logs(200))}>Refrescar</button>
        <ul className="list">
          {logs.map(l => (
            <li key={l.id}>
              <b>[{l.level}]</b> {l.message}
              <div className="meta">{l.created_at}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
