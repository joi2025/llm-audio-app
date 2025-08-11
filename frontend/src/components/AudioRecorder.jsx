import React, { useEffect, useRef, useState } from 'react'

export default function AudioRecorder({ disabled, onChunk, onStop, addLog }) {
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => {
    return () => {
      try { mediaRecorderRef.current?.stop() } catch {}
      try { streamRef.current?.getTracks()?.forEach(t => t.stop()) } catch {}
    }
  }, [])

  const start = async () => {
    if (disabled || recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mr
      chunksRef.current = []

      mr.onstart = () => {
        setRecording(true)
        addLog?.('grabación iniciada')
      }

      mr.ondataavailable = async (ev) => {
        if (!ev.data || ev.data.size === 0) return
        try {
          const file = new File([ev.data], 'chunk.webm', { type: ev.data.type || 'audio/webm' })
          const b64 = await blobToBase64(file)
          // b64 viene como 'data:audio/webm;base64,xxxxx', recortamos el prefijo
          const pure = b64.split(',')[1]
          onChunk?.(pure)
        } catch (e) {
          addLog?.(`error procesando chunk: ${e?.message || e}`)
        }
      }

      mr.onstop = () => {
        setRecording(false)
        addLog?.('grabación detenida')
        onStop?.()
        try { stream.getTracks()?.forEach(t => t.stop()) } catch {}
      }

      // Emisión por intervalos pequeños para baja latencia
      const timesliceMs = 400
      mr.start(timesliceMs)
    } catch (e) {
      addLog?.(`no se pudo iniciar micrófono: ${e?.message || e}`)
    }
  }

  const stop = () => {
    try { mediaRecorderRef.current?.stop() } catch {}
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={start} disabled={disabled || recording}>Grabar</button>
        <button onClick={stop} disabled={!recording}>Detener</button>
      </div>
      <small style={{ color: '#94a3b8' }}>{recording ? 'Grabando...' : 'Inactivo'}</small>
    </div>
  )
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
