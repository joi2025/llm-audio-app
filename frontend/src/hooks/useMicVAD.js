import { useCallback, useEffect, useRef, useState } from 'react'

// Simple mic + VAD using WebAudio RMS threshold and MediaRecorder for chunks
// onChunk(b64) -> called for each recorded blob as base64
// onSilenceEnd() -> called when silence sustained and recording stops
// onLevel(v:0..1) -> UI meter
export default function useMicVAD({ onChunk, onFinal, onSilenceEnd, onLevel, rmsThreshold = 0.02, minVoiceMs = 250, maxSilenceMs = 750, chunkMs = 300, streaming = true } = {}) {
  const [listening, setListening] = useState(false)

  const mediaStreamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const bufferedBlobsRef = useRef([])
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const speakingAccumRef = useRef(0)
  const rafRef = useRef(null)

  const cleanupAudio = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    try { mediaRecorderRef.current?.stop() } catch {}
    mediaRecorderRef.current = null
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
    try { audioCtxRef.current?.close() } catch {}
    audioCtxRef.current = null
    analyserRef.current = null
  }, [])

  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

  const tick = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return
    const buf = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(buf)
    // compute RMS 0..1
    let sum = 0
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / buf.length)
    onLevel && onLevel(Math.min(1, rms * 4))

    const isVoice = rms > rmsThreshold
    const now = performance.now()
    if (isVoice) {
      speakingAccumRef.current = speakingAccumRef.current || now
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    } else {
      speakingAccumRef.current = 0
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          // end recording on sustained silence
          stopListening(true)
          onSilenceEnd && onSilenceEnd()
        }, maxSilenceMs)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [maxSilenceMs, onLevel, onSilenceEnd, rmsThreshold])

  const startListening = useCallback(async () => {
    if (listening) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      // WebAudio for VAD
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      analyserRef.current = analyser

      // MediaRecorder for chunks
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mr
      mr.ondataavailable = async (ev) => {
        if (ev.data && ev.data.size > 0) {
          if (streaming) {
            const b64 = await blobToBase64(ev.data)
            onChunk && onChunk(b64)
          } else {
            bufferedBlobsRef.current.push(ev.data)
          }
        }
      }
      mr.onstop = async () => {
        console.debug('[useMicVAD] mr.onstop triggered, streaming=', streaming, 'buffered chunks=', bufferedBlobsRef.current.length)
        if (!streaming) {
          try {
            if (bufferedBlobsRef.current.length) {
              const blob = new Blob(bufferedBlobsRef.current, { type: 'audio/webm;codecs=opus' })
              const b64 = await blobToBase64(blob)
              console.debug('[useMicVAD] calling onFinal with b64 length=', b64?.length)
              onFinal && onFinal(b64)
            } else {
              console.warn('[useMicVAD] no buffered chunks to process')
            }
          } catch (e) {
            console.error('[useMicVAD] error in onstop:', e)
          }
          bufferedBlobsRef.current = []
        }
        // Cleanup after processing the final chunk
        setTimeout(() => {
          cleanupAudio()
          setListening(false)
        }, 50)
      }
      if (streaming) {
        mr.start(chunkMs)
      } else {
        mr.start() // no timeslice, emit single chunk on stop
      }

      setListening(true)
      rafRef.current = requestAnimationFrame(tick)
    } catch (e) {
      // ignore
    }
  }, [chunkMs, listening, tick, onChunk])

  const stopListening = useCallback((forceSend = false) => {
    if (!listening) return
    console.debug('[useMicVAD] stopListening forceSend=', forceSend, 'state=', mediaRecorderRef.current?.state)
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        // Stop recording - this will trigger mr.onstop which calls onFinal
        mediaRecorderRef.current.stop()
        console.debug('[useMicVAD] MediaRecorder.stop() called')
      } else {
        // No recording active, cleanup immediately
        cleanupAudio()
        setListening(false)
      }
    } catch (e) {
      console.warn('[useMicVAD] Error stopping recorder:', e)
      cleanupAudio()
      setListening(false)
    }
  }, [cleanupAudio, listening])

  useEffect(() => () => cleanupAudio(), [cleanupAudio])

  return { listening, startListening, stopListening }
}
