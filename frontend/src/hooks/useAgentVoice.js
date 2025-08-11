import { useCallback, useRef } from 'react'
import { naturalize } from '../utils/naturalizer'

// Factory-based hook to integrate WS messages and audio playback control
// Params: { setUiState, onAudio }
// Returns factories that need sendJson bound after ws is ready
export default function useAgentVoice({ setUiState, onAudio }) {
  const speakFallbackRef = useRef(null)
  const handleWSMessageFactory = useCallback(({ sendJson }) => {
    return (raw) => {
      let payload = raw
      try { if (typeof raw === 'string') payload = JSON.parse(raw) } catch {}
      try { console.debug('[v2] ws <-', typeof payload === 'string' ? payload : payload?.type) } catch {}

      // audio chunks from backend
      const audioB64 = payload?.audio_b64 || payload?.audio || payload?.data
      if (payload?.type === 'audio' && audioB64) {
        if (speakFallbackRef.current) { clearTimeout(speakFallbackRef.current); speakFallbackRef.current = null }
        onAudio(audioB64, payload?.mime || 'audio/mpeg')
        return
      }

      // textual responses
      const text = payload?.transcription || payload?.transcript || payload?.text
      if (text && (payload?.from === 'assistant' || payload?.type === 'response' || payload?.type === 'result' || payload?.type === 'result_llm')) {
        // Optionally send instruction to backend to keep replies succinct based on Admin settings
        // Here we just naturalize locally to set the UI cue; real TTS uses backend text
        const refined = naturalize(text)
        // Could emit a UI event/log if needed
        setUiState('speaking')
        // fallback to idle if no audio arrives shortly
        if (speakFallbackRef.current) clearTimeout(speakFallbackRef.current)
        speakFallbackRef.current = setTimeout(() => {
          console.warn('[v2] no TTS audio received, returning to idle')
          setUiState('idle')
          speakFallbackRef.current = null
        }, 3000)
        return
      }

      // end / idle notifications
      if (payload?.type === 'done' || payload?.type === 'end' || payload?.type === 'tts_end') {
        if (speakFallbackRef.current) { clearTimeout(speakFallbackRef.current); speakFallbackRef.current = null }
        console.debug('[v2] received end signal, returning to idle for next interaction')
        setUiState('idle')
        return
      }

      // error / notice
      if (payload?.type === 'error') {
        console.error('[v2] backend error:', payload?.stage || '', payload?.message || payload)
        setUiState('idle')
        return
      }
      if (payload?.type === 'notice') {
        console.warn('[v2] backend notice:', payload?.message)
        return
      }
    }
  }, [onAudio, setUiState])

  const interruptTTSFactory = useCallback(({ sendJson, audioEl }) => {
    return () => {
      try { if (audioEl) { audioEl.pause(); if (audioEl.src) { URL.revokeObjectURL(audioEl.src); audioEl.src = '' } } } catch {}
      try { sendJson && sendJson({ type: 'stop_tts', meta: { reason: 'user_interrupt' } }) } catch {}
      setUiState('idle')
    }
  }, [setUiState])

  return { handleWSMessageFactory, interruptTTSFactory }
}
