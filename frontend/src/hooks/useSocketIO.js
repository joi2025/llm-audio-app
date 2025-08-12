import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

export default function useSocketIO(url = 'http://localhost:8001', options = {}) {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)
  const listenersRef = useRef(new Map())
  const { autoConnect = true, onConnect, onDisconnect, onError, onMessage } = options
  // Keep latest callbacks to avoid stale closures without reconnecting the socket
  const onConnectRef = useRef(onConnect)
  const onDisconnectRef = useRef(onDisconnect)
  const onErrorRef = useRef(onError)
  const onMessageRef = useRef(onMessage)

  useEffect(() => { onConnectRef.current = onConnect }, [onConnect])
  useEffect(() => { onDisconnectRef.current = onDisconnect }, [onDisconnect])
  useEffect(() => { onErrorRef.current = onError }, [onError])
  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])

  useEffect(() => {
    console.debug('[SocketIO] 🔌 Connecting to:', url)
    
    const socket = io(url, {
      // Force Engine.IO to start and stay on polling to avoid WS frame errors when
      // the backend is not serving real WebSocket upgrades (e.g., default Flask dev server)
      path: '/socket.io',
      transports: ['polling'],
      upgrade: false,
      autoConnect
    })
    
    socketRef.current = socket

    socket.on('connect', () => {
      const transport = socket.io?.engine?.transport?.name
      console.debug('[SocketIO] ✅ Connected via', transport || 'unknown')
      setConnected(true)
      if (onConnectRef.current) onConnectRef.current()
    })

    socket.on('disconnect', (reason) => {
      console.debug('[SocketIO] ❌ Disconnected:', reason)
      setConnected(false)
      if (onDisconnectRef.current) onDisconnectRef.current(reason)
    })

    socket.on('connect_error', (error) => {
      console.error('[SocketIO] 🚫 Connection error:', error)
      setConnected(false)
      if (onErrorRef.current) onErrorRef.current(error)
    })

    // Handle all incoming messages
    const messageTypes = ['hello', 'pong', 'result_stt', 'result_llm', 'audio', 'tts_end', 'error']
    
    messageTypes.forEach(type => {
      socket.on(type, (data) => {
        console.debug(`[SocketIO] 📨 Received ${type}:`, data)
        
        // Call registered listeners
        const listeners = listenersRef.current.get(type) || []
        listeners.forEach(listener => {
          try {
            listener(data)
          } catch (error) {
            console.error(`[SocketIO] Error in ${type} listener:`, error)
          }
        })
        
        // Call global onMessage callback if provided
        if (onMessageRef.current) {
          try {
            const payload = (data && typeof data === 'object' && !Array.isArray(data))
              ? { type, ...data }
              : { type, data }
            onMessageRef.current(payload)
          } catch (error) {
            console.error(`[SocketIO] Error in onMessage callback:`, error)
          }
        }
      })
    })

    // Catch-all for any other custom events the backend may emit
    socket.onAny((event, data) => {
      if (messageTypes.includes(event)) return
      console.debug(`[SocketIO] 📨 (any) Received ${event}:`, data)
      const listeners = listenersRef.current.get(event) || []
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error(`[SocketIO] Error in ${event} listener:`, error)
        }
      })
      if (onMessageRef.current) {
        try {
          const payload = (data && typeof data === 'object' && !Array.isArray(data)) 
            ? { type: event, ...data } 
            : { type: event, data }
          onMessageRef.current(payload)
        } catch (error) {
          console.error(`[SocketIO] Error in onMessage(any) callback:`, error)
        }
      }
    })

    return () => {
      console.debug('[SocketIO] 🔌 Cleaning up connection')
      socket.disconnect()
    }
  }, [url, autoConnect])

  const sendMessage = (type, data = {}) => {
    if (socketRef.current && connected) {
      console.debug(`[SocketIO] 📤 Sending ${type}:`, data)
      socketRef.current.emit(type, data)
      return true
    } else {
      console.warn(`[SocketIO] ⚠️ Cannot send ${type} - not connected`)
      return false
    }
  }

  const addListener = (type, callback) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, [])
    }
    listenersRef.current.get(type).push(callback)
    
    // Return cleanup function
    return () => {
      const listeners = listenersRef.current.get(type) || []
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  const removeAllListeners = (type) => {
    if (type) {
      listenersRef.current.delete(type)
    } else {
      listenersRef.current.clear()
    }
  }

  const connect = () => {
    if (socketRef.current) {
      socketRef.current.connect()
    }
  }

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
    }
  }

  const emit = (event, data) => {
    return sendMessage(event, data)
  }

  return {
    isConnected: connected,
    connected,
    connect,
    disconnect,
    emit,
    sendMessage,
    addListener,
    removeAllListeners,
    socket: socketRef.current
  }
}
