import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * useWebSocketNativeBackend - Adaptador específico para backend Flask-SocketIO
 * Maneja la comunicación WebSocket con el backend existente
 * Convierte mensajes WebSocket a formato compatible con Socket.IO
 */
export default function useWebSocketNativeBackend(url = 'ws://192.168.29.31:8001/socket.io/', options = {}) {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)
  
  const wsRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const backoffRef = useRef(1000)
  const maxBackoffRef = useRef(30000)
  const reconnectAttemptsRef = useRef(0)
  const listenersRef = useRef(new Map())
  
  const { 
    autoConnect = true, 
    onConnect, 
    onDisconnect, 
    onError, 
    onMessage,
    maxReconnectAttempts = 10
  } = options

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
    console.log(`WebSocket Native: Scheduling reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`)
    
    reconnectTimerRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++
      backoffRef.current = Math.min(backoffRef.current * 2, maxBackoffRef.current)
      connect()
    }, delay)
  }, [maxReconnectAttempts])

  const handleMessage = useCallback((event) => {
    try {
      let data = event.data
      
      // Si es string, intentar parsear como JSON
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data)
        } catch {
          // Si no es JSON válido, tratarlo como mensaje de texto
          if (onMessageRef.current) {
            onMessageRef.current('message', data)
          }
          return
        }
      }
      
      // Manejar diferentes formatos de mensaje del backend
      if (data && typeof data === 'object') {
        // Formato directo del backend
        if (data.type) {
          const listener = listenersRef.current.get(data.type)
          if (listener) {
            listener(data)
          }
          
          if (onMessageRef.current) {
            onMessageRef.current(data.type, data)
          }
        }
        // Formato Socket.IO emulado [eventName, payload]
        else if (Array.isArray(data) && data.length >= 2) {
          const [eventName, payload] = data
          
          const listener = listenersRef.current.get(eventName)
          if (listener) {
            listener(payload)
          }
          
          if (onMessageRef.current) {
            onMessageRef.current(eventName, payload)
          }
        }
        // Mensaje genérico
        else {
          if (onMessageRef.current) {
            onMessageRef.current('message', data)
          }
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
      return
    }

    if (connecting) {
      return
    }

    setConnecting(true)
    setError(null)

    try {
      // Convertir URL HTTP a WebSocket
      let wsUrl = url
      if (url.startsWith('http://')) {
        wsUrl = url.replace('http://', 'ws://')
      } else if (url.startsWith('https://')) {
        wsUrl = url.replace('https://', 'wss://')
      }
      
      // Para Flask-SocketIO, usar endpoint directo sin /socket.io/
      if (wsUrl.includes('/socket.io/')) {
        wsUrl = wsUrl.replace('/socket.io/', '/')
      }
      
      console.log('WebSocket Native: Connecting to:', wsUrl)
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log('WebSocket Native: Connected successfully')
        setConnected(true)
        setConnecting(false)
        setError(null)
        
        reconnectAttemptsRef.current = 0
        backoffRef.current = 1000
        clearReconnectTimer()
        
        if (onConnectRef.current) {
          onConnectRef.current()
        }
      }

      wsRef.current.onmessage = handleMessage

      wsRef.current.onclose = (event) => {
        console.log('WebSocket Native: Disconnected:', event.code, event.reason)
        setConnected(false)
        setConnecting(false)
        
        if (onDisconnectRef.current) {
          onDisconnectRef.current(event.reason)
        }

        // Auto-reconnect unless clean close
        if (event.code !== 1000 && autoConnect) {
          scheduleReconnect()
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket Native: Error:', error)
        setError('Connection error')
        setConnecting(false)
        
        if (onErrorRef.current) {
          onErrorRef.current(error)
        }
      }

    } catch (error) {
      console.error('WebSocket Native: Failed to create connection:', error)
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
        // Enviar en formato que el backend Flask-SocketIO entienda
        const message = {
          type: eventName,
          data: data,
          timestamp: Date.now()
        }
        
        wsRef.current.send(JSON.stringify(message))
        console.log('WebSocket Native: Sent:', eventName, data)
        return true
      } catch (error) {
        console.error('WebSocket Native: Error sending message:', error)
        return false
      }
    }
    console.warn('WebSocket Native: Cannot send, not connected')
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
