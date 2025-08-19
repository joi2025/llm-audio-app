import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * useWebSocketNative - WebSocket puro sin Socket.IO
 * Reemplaza Socket.IO problemático con WebSocket nativo robusto
 * 
 * Mejoras críticas:
 * - Conectividad estable sin overhead Socket.IO
 * - Auto-reconnect inteligente con backoff exponencial
 * - Manejo robusto de errores y desconexiones
 * - Compatible con backend Flask-SocketIO mediante protocolo manual
 */
export default function useWebSocketNative(url = 'ws://192.168.29.31:8001', options = {}) {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)
  
  const wsRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const backoffRef = useRef(1000) // Start at 1s
  const maxBackoffRef = useRef(30000) // Max 30s
  const reconnectAttemptsRef = useRef(0)
  const listenersRef = useRef(new Map())
  
  const { 
    autoConnect = true, 
    onConnect, 
    onDisconnect, 
    onError, 
    onMessage,
    maxReconnectAttempts = 10,
    reconnectInterval = 1000
  } = options

  // Keep latest callbacks to avoid stale closures
  const onConnectRef = useRef(onConnect)
  const onDisconnectRef = useRef(onDisconnect)
  const onErrorRef = useRef(onError)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onConnectRef.current = onConnect
    onDisconnectRef.current = onDisconnect
    onErrorRef.current = onError
    onMessageRef.current = onMessage
  }, [onConnect, onDisconnect, onError, onMessage])

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('Max reconnect attempts reached')
      setError('Max reconnect attempts reached')
      return
    }

    clearReconnectTimer()
    
    const delay = Math.min(backoffRef.current, maxBackoffRef.current)
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`)
    
    reconnectTimerRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++
      backoffRef.current = Math.min(backoffRef.current * 2, maxBackoffRef.current)
      connect()
    }, delay)
  }, [maxReconnectAttempts])

  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data)
      
      // Emular protocolo Socket.IO para compatibilidad
      if (Array.isArray(data) && data.length >= 2) {
        const [eventName, payload] = data
        
        // Llamar listener específico si existe
        const listener = listenersRef.current.get(eventName)
        if (listener) {
          listener(payload)
        }
        
        // Llamar callback general onMessage
        if (onMessageRef.current) {
          onMessageRef.current(eventName, payload)
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
      if (onErrorRef.current) {
        onErrorRef.current(error)
      }
    }
  }, [])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return // Already connected
    }

    if (connecting) {
      return // Already connecting
    }

    setConnecting(true)
    setError(null)

    try {
      // Convertir URL a esquema WebSocket correcto evitando mixed-content
      let wsUrl = url
      if (url.startsWith('ws://') || url.startsWith('wss://')) {
        // ya es ws/wss
      } else if (url.startsWith('https://')) {
        wsUrl = url.replace('https://', 'wss://')
      } else if (url.startsWith('http://')) {
        wsUrl = url.replace('http://', 'ws://')
      } else {
        // Si no hay esquema y la app corre en https, forzar wss
        const secureContext = (typeof window !== 'undefined' && window.location?.protocol === 'https:')
        wsUrl = `${secureContext ? 'wss' : 'ws'}://${url}`
      }
      
      // Protección extra: si el contexto es https y quedó ws://, elevar a wss://
      if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && wsUrl.startsWith('ws://')) {
        wsUrl = wsUrl.replace('ws://', 'wss://')
      }
      
      console.log('Connecting to WebSocket:', wsUrl)
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log('WebSocket connected')
        setConnected(true)
        setConnecting(false)
        setError(null)
        
        // Reset reconnect state on successful connection
        reconnectAttemptsRef.current = 0
        backoffRef.current = 1000
        clearReconnectTimer()
        
        if (onConnectRef.current) {
          onConnectRef.current()
        }
      }

      wsRef.current.onmessage = handleMessage

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setConnected(false)
        setConnecting(false)
        
        if (onDisconnectRef.current) {
          onDisconnectRef.current(event.reason)
        }

        // Auto-reconnect unless it was a clean close
        if (event.code !== 1000 && autoConnect) {
          scheduleReconnect()
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setError('Connection error')
        setConnecting(false)
        
        if (onErrorRef.current) {
          onErrorRef.current(error)
        }
      }

    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setError(error.message)
      setConnecting(false)
      
      if (autoConnect) {
        scheduleReconnect()
      }
    }
  }, [url, connecting, autoConnect, handleMessage, scheduleReconnect])

  const disconnect = useCallback(() => {
    clearReconnectTimer()
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }
    
    setConnected(false)
    setConnecting(false)
    setError(null)
  }, [clearReconnectTimer])

  const emit = useCallback((eventName, data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        // Emular formato Socket.IO: [eventName, data]
        const message = JSON.stringify([eventName, data])
        wsRef.current.send(message)
        return true
      } catch (error) {
        console.error('Error sending WebSocket message:', error)
        return false
      }
    }
    return false
  }, [])

  const sendMessage = useCallback((message) => {
    return emit('message', message)
  }, [emit])

  const addListener = useCallback((eventName, callback) => {
    listenersRef.current.set(eventName, callback)
    
    return () => {
      listenersRef.current.delete(eventName)
    }
  }, [])

  const removeAllListeners = useCallback(() => {
    listenersRef.current.clear()
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      clearReconnectTimer()
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount')
      }
    }
  }, [autoConnect, connect, clearReconnectTimer])

  return {
    isConnected: connected,
    isConnecting: connecting,
    error,
    connect,
    disconnect,
    emit,
    sendMessage,
    addListener,
    removeAllListeners,
    socket: wsRef.current
  }
}
