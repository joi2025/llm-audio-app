import React, { useEffect, useMemo, useRef } from 'react'

const MessageRow = React.memo(function MessageRow({ m, idx }) {
  return (
    <div className={`msg ${m.role}`}>
      <div className="bubble">
        <strong style={{ textTransform: 'capitalize' }}>{m.role}</strong>
        <div>{m.text}</div>
      </div>
    </div>
  )
})

function ConversationHistory({ messages }) {
  const ref = useRef(null)

  // Windowed rendering: show only the last N messages to keep DOM light
  const WINDOW = 200
  const windowed = useMemo(() => {
    if (!messages || messages.length <= WINDOW) return messages || []
    return messages.slice(messages.length - WINDOW)
  }, [messages])

  // Auto-scroll when new messages arrive
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [windowed])

  return (
    <div className="history" ref={ref}>
      {(!windowed || windowed.length === 0) && (
        <div style={{ color: '#94a3b8' }}>Sin mensajes. Empieza a hablar o escribe un mensaje.</div>
      )}
      {windowed.map((m, idx) => (
        <MessageRow key={idx} m={m} idx={idx} />
      ))}
    </div>
  )
}

export default React.memo(ConversationHistory, (prev, next) => {
  // Avoid re-render if length and last item text/role are unchanged
  const pm = prev.messages, nm = next.messages
  if (pm === nm) return true
  const pl = pm?.length || 0, nl = nm?.length || 0
  if (pl !== nl) return false
  if (!pl) return true
  const a = pm[pl - 1], b = nm[nl - 1]
  return a?.text === b?.text && a?.role === b?.role
})
