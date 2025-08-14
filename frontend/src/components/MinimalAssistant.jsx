import React from 'react'
import VoiceCircleV2 from './VoiceCircleV2_Final'

/**
 * MinimalAssistant
 * Ultra-minimal UI that boots directly into auto-voice mode using the existing
 * VoiceCircleV2 component. No extra buttons, only a small status header.
 */
export default function MinimalAssistant({ wsUrl }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong>Assistant</strong>
        <span style={{ color: '#94a3b8' }}>| minimal</span>
      </header>
      <main style={{ flex: 1, display: 'flex' }}>
        <VoiceCircleV2 wsUrl={wsUrl} autoMode={true} />
      </main>
    </div>
  )
}
