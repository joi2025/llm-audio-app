import React, { useState, useEffect, useRef, useCallback } from 'react'
import useSocketIO from '../hooks/useSocketIO'

export default function VoiceCircleV2Auto({ wsUrl = 'http://localhost:8001' }) {
  const [isActive, setIsActive] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')
  
  const micStreamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  
  // Socket.IO connection
  const { isConnected, emit } = useSocketIO(wsUrl, {
    autoConnect: true,
    onConnect: () => {
      console.log('[V2Auto] Connected to backend')
      setError('')
    },
    onDisconnect: () => {
      console.log('[V2Auto] Disconnected from backend')
      setError('Conexión perdida')
    },
    onMessage: (data) => {
      console.log('[V2Auto] Message received:', data)
      
      if (data.transcript) {
        setTranscript(data.transcript)
      }
      
      if (data.response) {
        setResponse(data.response)
        setIsProcessing(false)
      }
      
      if (data.audio) {
        playAudioResponse(data.audio)
      }
    }
  })

  // Initialize microphone
  const initMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true 
      })
      micStreamRef.current = stream
      console.log('[V2Auto] Microphone initialized')
      return true
    } catch (err) {
      console.error('[V2Auto] Microphone error:', err)
      setError('No se pudo acceder al micrófono')
      return false
    }
  }

  // Start recording
  const startRecording = () => {
    if (!micStreamRef.current || !isConnected) {
      console.error('[V2Auto] Cannot start recording')
      return
    }
    
    setIsListening(true)
    setTranscript('')
    setResponse('')
    audioChunksRef.current = []
    
    try {
      mediaRecorderRef.current = new MediaRecorder(micStreamRef.current)
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        sendAudioToBackend(audioBlob)
      }
      
      mediaRecorderRef.current.start()
      console.log('[V2Auto] Recording started')
    } catch (err) {
      console.error('[V2Auto] Recording error:', err)
      setError('Error al grabar audio')
      setIsListening(false)
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsListening(false)
      setIsProcessing(true)
      console.log('[V2Auto] Recording stopped')
    }
  }

  // Send audio to backend
  const sendAudioToBackend = (blob) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1]
      emit('audio_end', { audio: base64 })
      console.log('[V2Auto] Audio sent to backend')
    }
    reader.readAsDataURL(blob)
  }

  // Play audio response
  const playAudioResponse = async (audioBase64) => {
    try {
      setIsSpeaking(true)
      const audioData = atob(audioBase64)
      const arrayBuffer = new ArrayBuffer(audioData.length)
      const view = new Uint8Array(arrayBuffer)
      
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i)
      }
      
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)
      
      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }
      
      await audio.play()
      console.log('[V2Auto] Playing audio response')
    } catch (err) {
      console.error('[V2Auto] Audio playback error:', err)
      setIsSpeaking(false)
    }
  }

  // Toggle active mode
  const toggleActive = async () => {
    if (!isActive) {
      const success = await initMicrophone()
      if (success) {
        setIsActive(true)
      }
    } else {
      setIsActive(false)
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop())
        micStreamRef.current = null
      }
    }
  }

  // Handle manual recording toggle
  const toggleRecording = () => {
    if (!isActive) {
      alert('Primero activa el asistente')
      return
    }
    
    if (isListening) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Simple UI
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        fontSize: '14px',
        opacity: 0.7
      }}>
        <span style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isConnected ? '#10b981' : '#ef4444',
          marginRight: '8px'
        }}></span>
        {isConnected ? 'Conectado' : 'Desconectado'}
      </div>

      {/* Main Circle */}
      <div 
        onClick={toggleRecording}
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: isListening ? '#10b981' : 
                     isProcessing ? '#fbbf24' : 
                     isSpeaking ? '#a855f7' : 
                     isActive ? '#3b82f6' : '#6b7280',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: isListening ? '0 0 40px rgba(16, 185, 129, 0.5)' :
                     isProcessing ? '0 0 40px rgba(251, 191, 36, 0.5)' :
                     isSpeaking ? '0 0 40px rgba(168, 85, 247, 0.5)' :
                     isActive ? '0 0 20px rgba(59, 130, 246, 0.3)' :
                     '0 0 10px rgba(107, 114, 128, 0.2)',
          transform: isListening || isSpeaking ? 'scale(1.1)' : 'scale(1)'
        }}
      >
        <div style={{
          color: 'white',
          fontSize: '40px'
        }}>
          {isListening ? '🎤' : 
           isProcessing ? '⚡' : 
           isSpeaking ? '🔊' : 
           isActive ? '✨' : '🔘'}
        </div>
      </div>

      {/* Status Text */}
      <div style={{
        marginTop: '30px',
        fontSize: '16px',
        opacity: 0.9
      }}>
        {error ? (
          <span style={{ color: '#ef4444' }}>❌ {error}</span>
        ) : isListening ? (
          'Escuchando...'
        ) : isProcessing ? (
          'Procesando...'
        ) : isSpeaking ? (
          'Hablando...'
        ) : isActive ? (
          'Click para hablar'
        ) : (
          'Inactivo'
        )}
      </div>

      {/* Transcript */}
      {transcript && (
        <div style={{
          marginTop: '20px',
          padding: '10px 20px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '5px' }}>Tú dijiste:</div>
          <div>{transcript}</div>
        </div>
      )}

      {/* Response */}
      {response && (
        <div style={{
          marginTop: '20px',
          padding: '10px 20px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '5px' }}>Asistente:</div>
          <div>{response}</div>
        </div>
      )}

      {/* Control Buttons */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        display: 'flex',
        gap: '10px'
      }}>
        <button
          onClick={toggleActive}
          style={{
            padding: '10px 20px',
            background: isActive ? '#10b981' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {isActive ? 'Desactivar' : 'Activar'}
        </button>
        
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '10px 20px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Volver
        </button>
      </div>
    </div>
  )
}
