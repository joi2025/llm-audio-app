import { useEffect, useRef, useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * useCapacitorWebSocket - Hook para usar WebSocket nativo en Capacitor
 * Utiliza el plugin nativo WebSocketPlugin cuando está disponible
 * Fallback a WebSocket JavaScript en web
 */
export default function useCapacitorWebSocket(url = 'wss://9c11d44a64e8.ngrok-free.app', options = {}) {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)
  
  const pluginRef = useRef(null)
  const listenersRef = useRef(new Map())
  const reconnectTimerRef = useRef(null)
  const backoffRef = useRef(1000)
  
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

  // Inicializar plugin nativo
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Usar plugin nativo en Android/iOS
      import('@capacitor/core').then(({ registerPlugin }) => {
        try {
          pluginRef.current = registerPlugin('WebSocketNative')
          console.log('WebSocket Native Plugin registered')
        } catch (e) {
          console.warn('WebSocket Native Plugin not available:', e)
        }
      })
    }
  }, [])

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const scheduleReconnect = useCallback(() => {
    clearReconnectTimer()
    
    const delay = Math.min(backoffRef.current, 30000)
    console.log(`Scheduling reconnect in ${delay}ms`)
    
    reconnectTimerRef.current = setTimeout(() => {
      backoffRef.current = Math.min(backoffRef.current * 2, 30000)
      connect()
    }, delay)
  }, [])

  const handleNativeMessage = useCallback((data) => {
    try {
      const { type, data: messageData } = data
      
      // Llamar listener específico
      const listener = listenersRef.current.get(type)
      if (listener) {
        listener(JSON.parse(messageData))
      }
      
      // Llamar callback general
      if (onMessageRef.current) {
        onMessageRef.current(type, JSON.parse(messageData))
      }
    } catch (error) {
      console.error('Error handling native message:', error)
    }
  }, [])

  const connect = useCallback(async () => {
    if (connecting) return
    
    setConnecting(true)
    setError(null)

    try {
      if (Capacitor.isNativePlatform() && pluginRef.current) {
        // Usar plugin nativo
        console.log('Connecting with native WebSocket plugin')
        
        // Registrar listeners nativos
        await pluginRef.current.addListener('websocket_connected', () => {
          setConnected(true)
          setConnecting(false)
          backoffRef.current = 1000
          clearReconnectTimer()
          
          if (onConnectRef.current) {
            onConnectRef.current()
          }
        })
        
        await pluginRef.current.addListener('websocket_message', handleNativeMessage)
        
        await pluginRef.current.addListener('websocket_disconnected', (data) => {
          setConnected(false)
          setConnecting(false)
          
          if (onDisconnectRef.current) {
            onDisconnectRef.current(data.reason)
          }
          
          if (autoConnect && data.code !== 1000) {
            scheduleReconnect()
          }
        })
        
        await pluginRef.current.addListener('websocket_error', (data) => {
          setError(data.error)
          setConnecting(false)
          
          if (onErrorRef.current) {
            onErrorRef.current(new Error(data.error))
          }
          
          if (autoConnect) {
            scheduleReconnect()
          }
        })
        
        // Conectar
        await pluginRef.current.connect({ url })
        
      } else {
        // Fallback a WebSocket JavaScript
        console.log('Using JavaScript WebSocket fallback')
        // TODO: Implementar fallback WebSocket JavaScript
        throw new Error('JavaScript WebSocket fallback not implemented yet')
      }
    } catch (error) {
      console.error('Connection failed:', error)
      setError(error.message)
      setConnecting(false)
      
      if (autoConnect) {
        scheduleReconnect()
      }
    }
  }, [url, connecting, autoConnect, handleNativeMessage, scheduleReconnect])

  const disconnect = useCallback(async () => {
    clearReconnectTimer()
    
    if (Capacitor.isNativePlatform() && pluginRef.current) {
      try {
        await pluginRef.current.disconnect()
      } catch (e) {
        console.warn('Error disconnecting native WebSocket:', e)
      }
    }
    
    setConnected(false)
    setConnecting(false)
    setError(null)
  }, [clearReconnectTimer])

  const emit = useCallback(async (eventName, data) => {
    if (!connected) {
      console.warn('Cannot emit, not connected')
      return false
    }

    try {
      if (Capacitor.isNativePlatform() && pluginRef.current) {
        const result = await pluginRef.current.send({
          event: eventName,
          data: data
        })
        return result.status === 'sent'
      } else {
        // TODO: Implementar emit para WebSocket JavaScript
        return false
      }
    } catch (error) {
      console.error('Error emitting message:', error)
      return false
    }
  }, [connected])

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
      disconnect()
    }
  }, [autoConnect, connect, disconnect, clearReconnectTimer])

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
    isNative: Capacitor.isNativePlatform()
  }
}
