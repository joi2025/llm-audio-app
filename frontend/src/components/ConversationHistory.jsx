import React, { useEffect, useRef } from 'react'

export default function ConversationHistory({ messages }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  return (
    <div className="history" ref={ref}>
      {messages.length === 0 && (
        <div style={{ color: '#94a3b8' }}>Sin mensajes. Empieza a hablar o escribe un mensaje.</div>
      )}
      {messages.map((m, idx) => (
        <div key={idx} className={`msg ${m.role}`}>
          <div className="bubble">
            <strong style={{ textTransform: 'capitalize' }}>{m.role}</strong>
            <div>{m.text}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
