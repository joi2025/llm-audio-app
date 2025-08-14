import React, { useMemo } from 'react'

/**
 * AdminPro (scaffold)
 * Advanced admin panel with tabs to host real-time metrics, logs, and health.
 * TODO: Wire metrics from hooks/useSocketIO.js and backend /health if available.
 */
export default function AdminPro({ wsUrl }) {
  const sections = useMemo(() => ([
    { id: 'health', title: 'Salud' },
    { id: 'latency', title: 'Latencia' },
    { id: 'pipeline', title: 'Pipeline' },
    { id: 'logs', title: 'Logs' },
    { id: 'device', title: 'Dispositivo' },
  ]), [])

  return (
    <div style={{ padding: 16 }}>
      <h2>Admin Pro</h2>
      <p style={{ color: '#94a3b8' }}>Scaffold listo. Integraremos métricas reales (p50/p95), eventos y logs.</p>
      <ul style={{ display: 'flex', gap: 12, listStyle: 'none', padding: 0 }}>
        {sections.map(s => (
          <li key={s.id} style={{ padding: '6px 10px', background: '#0f172a', borderRadius: 8 }}>{s.title}</li>
        ))}
      </ul>
      <div style={{ marginTop: 16, color: '#cbd5e1' }}>
        <div>
          <strong>WS URL:</strong> {wsUrl}
        </div>
        <div>
          <strong>Estado:</strong> pendiente de integrar hooks y listeners
        </div>
      </div>
    </div>
  )
}
