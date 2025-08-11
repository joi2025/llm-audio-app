import { useCallback, useEffect, useRef, useState } from 'react'

export default function useWebSocket(url, opts = {}) {
  const {
    autoConnect = true,
    retry = { maxAttempts: Infinity, backoffBaseMs: 800, backoffMaxMs: 8000 },
    keepAliveSec = 30,
    onOpen,
    onClose,
    onError,
    onMessage,
  } = opts

  const wsRef = useRef(null)
  const [state, setState] = useState('idle') // idle | connecting | open | closed
  const attemptsRef = useRef(0)
  const kaTimerRef = useRef(null)
  const reconnectTimerRef = useRef(null)

  const cleanup = useCallback(() => {
    if (kaTimerRef.current) { clearInterval(kaTimerRef.current); kaTimerRef.current = null }
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null }
  }, [])

  const scheduleReconnect = useCallback(() => {
    if (attemptsRef.current >= retry.maxAttempts) return
    const delay = Math.min(retry.backoffBaseMs * Math.pow(2, attemptsRef.current), retry.backoffMaxMs)
    reconnectTimerRef.current = setTimeout(() => {
      attemptsRef.current += 1
      connect()
    }, delay)
  }, [retry])

  const connect = useCallback(() => {
    cleanup()
    setState('connecting')
    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        attemptsRef.current = 0
        setState('open')
        if (typeof onOpen === 'function') onOpen()
        if (keepAliveSec > 0) {
          kaTimerRef.current = setInterval(() => {
            try { ws.send(JSON.stringify({ type: 'ping', t: Date.now() })) } catch {}
          }, keepAliveSec * 1000)
        }
      }

      ws.onmessage = (ev) => {
        if (typeof onMessage === 'function') onMessage(ev.data)
      }

      ws.onerror = (ev) => {
        if (typeof onError === 'function') onError(ev)
      }

      ws.onclose = () => {
        setState('closed')
        if (typeof onClose === 'function') onClose()
        scheduleReconnect()
      }
    } catch (e) {
      setState('closed')
      if (typeof onError === 'function') onError(e)
      scheduleReconnect()
    }
  }, [url, onOpen, onClose, onError, onMessage, keepAliveSec, cleanup, scheduleReconnect])

  const disconnect = useCallback(() => {
    cleanup()
    try { wsRef.current?.close() } catch {}
    setState('closed')
  }, [cleanup])

  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(data)
      return true
    }
    return false
  }, [])

  const sendJson = useCallback((obj) => send(JSON.stringify(obj)), [send])

  useEffect(() => {
    if (autoConnect) connect()
    return () => {
      cleanup()
      try { wsRef.current?.close() } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  return { state, connect, disconnect, send, sendJson }
}
