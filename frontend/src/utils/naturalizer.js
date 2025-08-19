// Simple naturalizer: anticipates long replies and offers summary option phrases in Spanish.
// This runs on the client as a UI aid; backend still produces the actual TTS text.

export function estimateReadTimeSec(text) {
  const wpm = 160 // conversational Spanish ~150-170 wpm
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length
  return Math.ceil((words / wpm) * 60)
}

export function naturalize(text) {
  if (!text) return ''
  const t = text.trim()
  const secs = estimateReadTimeSec(t)
  if (secs > 90) {
    // >1.5 min: suggest anticipation phrase
    return `Te explico: esto puede llevar cerca de ${Math.round(secs/60)} minutos. Si prefieres, te hago un resumen primero. ${t}`
  }
  if (secs > 45) {
    return `Es un poco largo; si quieres te hago un resumen breve. ${t}`
  }
  return t
}
