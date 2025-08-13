import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

/**
 * useSocketIO
 * Thin client around socket.io-client that exposes a React-friendly API.
 *
 * Params:
 *  - url: backend Socket.IO base (e.g., `${VITE_BACKEND_URL}`)
 *  - options: { autoConnect?, onConnect?, onDisconnect?, onError?, onMessage? }
 *
 * Returns helpers and state:
 *  { isConnected, connect, disconnect, emit, sendMessage, addListener,
 *    removeAllListeners, socket }
 *
 * Notes:
 *  - Uses polling transport by default to match Flask-SocketIO dev setups.
 *  - Maintains latest callbacks in refs to avoid stale closures.
 */
export default function useSocketIO(url = 'http://localhost:8001', options = {}) {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)
  const listenersRef = useRef(new Map())
  const reconnectTimerRef = useRef(null)
  const backoffRef = useRef(500) // start at 0.5s
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
      autoConnect,
      reconnection: false // we manage backoff manually for fine control
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
      // Manual exponential backoff reconnect
      if (navigator.onLine) scheduleReconnect()
    })

    socket.on('connect_error', (error) => {
      console.error('[SocketIO] 🚫 Connection error:', error)
      setConnected(false)
      if (onErrorRef.current) onErrorRef.current(error)
      if (navigator.onLine) scheduleReconnect()
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
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null }
      socket.disconnect()
    }
  }, [url, autoConnect])

  // Online/offline awareness
  useEffect(() => {
    const handleOnline = () => {
      console.debug('[SocketIO] 🌐 Online detected, attempting reconnect')
      if (!connected) scheduleReconnect(true)
    }
    const handleOffline = () => {
      console.debug('[SocketIO] 📴 Offline detected, clearing reconnect timers')
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null }
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [connected])

  const scheduleReconnect = (reset = false) => {
    if (!socketRef.current) return
    if (!navigator.onLine) return
    if (reconnectTimerRef.current) return
    if (reset) backoffRef.current = 500
    const delay = Math.min(backoffRef.current, 5000)
    console.debug('[SocketIO] ⏳ Reconnect in', delay, 'ms')
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null
      try {
        socketRef.current?.connect()
      } catch {}
      // increase backoff for next time
      backoffRef.current = Math.min(backoffRef.current * 2, 5000)
    }, delay)
  }

  // Heartbeat every 10s to keep connection healthy and measure RTT
  useEffect(() => {
    if (!socketRef.current) return
    let interval
    const onPong = (data) => {
      console.debug('[SocketIO] 🏓 pong', data)
    }
    socketRef.current.on?.('pong', onPong)
    if (connected) {
      interval = setInterval(() => {
        try {
          socketRef.current?.emit?.('ping', { ts: Date.now() })
        } catch {}
      }, 10000)
    }
    return () => {
      if (interval) clearInterval(interval)
      socketRef.current?.off?.('pong', onPong)
    }
  }, [connected])

  const sendMessage = (type, data = {}) => {
    return emitWithRetry(type, data, 3)
  }

  const emitWithRetry = (type, data = {}, retries = 3) => {
    const attempt = (left) => {
      if (!(socketRef.current && connected)) {
        if (left <= 0) {
          console.warn(`[SocketIO] ❌ Failed to send ${type} after retries (offline or disconnected)`) 
          return false
        }
        console.debug(`[SocketIO] ⏱️ Queue retry for ${type}, left=`, left)
        setTimeout(() => attempt(left - 1), 300)
        return
      }
      try {
        console.debug(`[SocketIO] 📤 Sending ${type}:`, data)
        socketRef.current.emit(type, data)
        return true
      } catch (e) {
        if (left <= 0) {
          console.error(`[SocketIO] ❌ Emit failed for ${type} after retries:`, e)
          return false
        }
        setTimeout(() => attempt(left - 1), 300)
      }
    }
    return attempt(retries)
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
