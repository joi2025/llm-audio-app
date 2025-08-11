import React from 'react'

export default function LogsPanel({ logs }) {
  return (
    <div className="logs">
      <strong>Logs</strong>
      <div style={{ marginTop: 8 }}>
        {logs.length === 0 && (
          <div style={{ color: '#94a3b8' }}>Sin logs todavía</div>
        )}
        {logs.map((l, i) => (
          <div key={i} style={{ whiteSpace: 'pre-wrap' }}>{l}</div>
        ))}
      </div>
    </div>
  )
}
