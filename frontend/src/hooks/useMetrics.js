import { useCallback, useRef, useState } from 'react'

/**
 * useMetrics
 * Collects real-time metrics for latency, events, and logs.
 * Provides p50/p95/max calculations and circular log buffer.
 */
export default function useMetrics() {
  const [metrics, setMetrics] = useState({
    latency: {
      ws_connect: { samples: [], p50: 0, p95: 0, max: 0, last: 0 },
      first_token: { samples: [], p50: 0, p95: 0, max: 0, last: 0 },
      tts_start: { samples: [], p50: 0, p95: 0, max: 0, last: 0 },
      roundtrip: { samples: [], p50: 0, p95: 0, max: 0, last: 0 }
    },
    events: {
      audio_chunk: 0,
      tts_cancelled: 0,
      llm_first_token: 0,
      llm_token: 0,
      final_transcript: 0,
      interruptions: 0,
      reconnections: 0,
      errors: 0
    },
    logs: []
  })

  const timersRef = useRef(new Map())
  const MAX_SAMPLES = 100
  const MAX_LOGS = 500

  const calculatePercentiles = useCallback((samples) => {
    if (samples.length === 0) return { p50: 0, p95: 0, max: 0 }
    const sorted = [...samples].sort((a, b) => a - b)
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0
    const max = sorted[sorted.length - 1] || 0
    return { p50, p95, max }
  }, [])

  const addLatency = useCallback((type, value) => {
    setMetrics(prev => {
      const samples = [...prev.latency[type].samples, value].slice(-MAX_SAMPLES)
      const stats = calculatePercentiles(samples)
      return {
        ...prev,
        latency: {
          ...prev.latency,
          [type]: { samples, ...stats, last: value }
        }
      }
    })
  }, [calculatePercentiles])

  const incrementEvent = useCallback((type) => {
    setMetrics(prev => ({
      ...prev,
      events: {
        ...prev.events,
        [type]: (prev.events[type] || 0) + 1
      }
    }))
  }, [])

  const addLog = useCallback((level, source, message, data = null) => {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      data
    }
    setMetrics(prev => ({
      ...prev,
      logs: [entry, ...prev.logs].slice(0, MAX_LOGS)
    }))
  }, [])

  const startTimer = useCallback((key) => {
    timersRef.current.set(key, Date.now())
  }, [])

  const endTimer = useCallback((key, latencyType) => {
    const start = timersRef.current.get(key)
    if (start) {
      const duration = Date.now() - start
      timersRef.current.delete(key)
      addLatency(latencyType, duration)
      return duration
    }
    return 0
  }, [addLatency])

  const clearMetrics = useCallback(() => {
    setMetrics({
      latency: {
        ws_connect: { samples: [], p50: 0, p95: 0, max: 0, last: 0 },
        first_token: { samples: [], p50: 0, p95: 0, max: 0, last: 0 },
        tts_start: { samples: [], p50: 0, p95: 0, max: 0, last: 0 },
        roundtrip: { samples: [], p50: 0, p95: 0, max: 0, last: 0 }
      },
      events: {
        audio_chunk: 0,
        tts_cancelled: 0,
        llm_first_token: 0,
        llm_token: 0,
        final_transcript: 0,
        interruptions: 0,
        reconnections: 0,
        errors: 0
      },
      logs: []
    })
    timersRef.current.clear()
  }, [])

  return {
    metrics,
    addLatency,
    incrementEvent,
    addLog,
    startTimer,
    endTimer,
    clearMetrics
  }
}
