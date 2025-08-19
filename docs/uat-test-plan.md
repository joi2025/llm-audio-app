# User Acceptance Testing (UAT) Plan
## LLM Audio App - Voice Assistant Experience

## Objective
Validate that the voice assistant provides a fluent, natural, and error-free conversational experience with measurable performance metrics.

## Test Environment
- **Browser**: Chrome/Edge with DevTools open
- **Network Tab**: Monitor WebSocket messages
- **Console**: Track timing events
- **Audio**: Moderate ambient noise acceptable

## Key Performance Indicators (KPIs)

### Primary Metrics
| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **TTFT** (Time to First Token) | < 500ms | Time from `audio_end` to `llm_first_token` |
| **TTFA** (Time to First Audio) | < 800ms | Time from `audio_end` to first `audio_chunk` received |
| **Interruption Latency** | < 400ms | Time from new `audio_chunk` to `stop_tts` event |
| **E2E Latency** | < 3s | Total time from speech end to audio playback start |
| **Recognition Accuracy** | > 95% | Correct transcription rate |

## Test Scenarios

### 1. Simple Question
**Test ID**: UAT-001  
**Scenario**: "Hola, ¿qué tiempo hace hoy?"  
**Steps**:
1. Click microphone or wait for auto-activation
2. Speak the phrase clearly
3. Stop speaking and wait

**Expected Results**:
- STT transcribes correctly within 1s
- LLM responds contextually
- TTS audio plays smoothly
- Measure TTFT and TTFA

---

### 2. Interruption Test
**Test ID**: UAT-002  
**Scenario**: Interrupt while assistant is speaking  
**Steps**:
1. Ask "Cuéntame sobre la historia de España"
2. While assistant responds, say "Espera, mejor háblame del clima"

**Expected Results**:
- TTS stops within 400ms
- New request processes correctly
- No audio overlap or glitches

---

### 3. Rapid Follow-up
**Test ID**: UAT-003  
**Scenario**: Quick consecutive questions  
**Steps**:
1. Ask "¿Cuánto es 2 más 2?"
2. Immediately after response: "¿Y multiplicado por 5?"

**Expected Results**:
- Context maintained
- Second response references first
- No timeout errors

---

### 4. Ambient Noise Test
**Test ID**: UAT-004  
**Scenario**: Moderate background noise  
**Steps**:
1. Play background music/TV at moderate volume
2. Ask "¿Cómo estás hoy?"

**Expected Results**:
- VAD still detects speech
- STT accuracy > 90%
- Response generated normally

---

### 5. Personality Switch
**Test ID**: UAT-005  
**Scenario**: Change assistant personality  
**Steps**:
1. Select "Profesional" personality
2. Ask "Explícame qué es machine learning"
3. Switch to "Casual"
4. Ask the same question

**Expected Results**:
- Tone changes appropriately
- Voice characteristics differ
- Response style matches personality

---

### 6. Long Input Test
**Test ID**: UAT-006  
**Scenario**: Extended speech input  
**Steps**:
1. Speak for 15-20 seconds continuously
2. "Quiero que me ayudes a planificar un viaje a Barcelona..."

**Expected Results**:
- All audio chunks processed
- Complete transcription
- Coherent response to full input

---

### 7. Silence Handling
**Test ID**: UAT-007  
**Scenario**: Start speaking then pause  
**Steps**:
1. Say "Dime..." 
2. Pause for 3 seconds
3. Continue "...cuál es la capital de Francia"

**Expected Results**:
- System waits for completion
- Doesn't timeout prematurely
- Processes complete phrase

---

### 8. Multi-language Test
**Test ID**: UAT-008  
**Scenario**: Mixed language input  
**Steps**:
1. Say "Hello, cómo estás today?"

**Expected Results**:
- STT handles code-switching
- Response acknowledges both languages
- No processing errors

---

### 9. Error Recovery
**Test ID**: UAT-009  
**Scenario**: Network interruption  
**Steps**:
1. Start conversation
2. Briefly disconnect network (1-2s)
3. Reconnect and continue

**Expected Results**:
- WebSocket reconnects
- Session state preserved
- Conversation continues

---

### 10. Volume Variation
**Test ID**: UAT-010  
**Scenario**: Vary speaking volume  
**Steps**:
1. Speak very softly: "hola"
2. Speak normally: "¿cómo estás?"
3. Speak loudly: "¡ADIÓS!"

**Expected Results**:
- All volumes detected
- AGC handles variations
- Consistent STT accuracy

## Testing Procedure

### Setup
1. Open application in browser
2. Navigate to MinimalAssistant mode
3. Open DevTools (F12)
4. Go to Network tab, filter by WS
5. Clear console

### Measurement Steps
1. **Mark Start Time**: Note timestamp when speaking ends
2. **Monitor Events**: Watch for WebSocket messages:
   - `audio_end` - User finished speaking
   - `result_stt` - Transcription received
   - `llm_first_token` - LLM starts responding
   - `audio_chunk` - TTS audio received
   - `tts_end` - TTS completed
3. **Calculate Metrics**: Use timestamps to compute KPIs
4. **Log Results**: Record in test sheet

### Performance Monitoring Script
```javascript
// Paste in browser console for automated timing
let metrics = {
  audioEndTime: 0,
  firstTokenTime: 0,
  firstAudioTime: 0,
  ttsEndTime: 0
};

// Override WebSocket to intercept messages
const originalSend = WebSocket.prototype.send;
WebSocket.prototype.send = function(data) {
  const parsed = JSON.parse(data);
  if (parsed[0] === 'audio_end') {
    metrics.audioEndTime = Date.now();
    console.log('🎤 Audio ended');
  }
  return originalSend.call(this, data);
};

// Monitor incoming messages
const originalOnMessage = WebSocket.prototype.onmessage;
Object.defineProperty(WebSocket.prototype, 'onmessage', {
  set: function(handler) {
    this._onmessage = function(event) {
      const parsed = JSON.parse(event.data);
      const [eventType, data] = parsed;
      
      switch(eventType) {
        case 'llm_first_token':
          metrics.firstTokenTime = Date.now();
          console.log(`⚡ TTFT: ${metrics.firstTokenTime - metrics.audioEndTime}ms`);
          break;
        case 'audio_chunk':
          if (!metrics.firstAudioTime) {
            metrics.firstAudioTime = Date.now();
            console.log(`🔊 TTFA: ${metrics.firstAudioTime - metrics.audioEndTime}ms`);
          }
          break;
        case 'tts_end':
          metrics.ttsEndTime = Date.now();
          console.log(`✅ Total: ${metrics.ttsEndTime - metrics.audioEndTime}ms`);
          // Reset for next interaction
          metrics = {audioEndTime: 0, firstTokenTime: 0, firstAudioTime: 0, ttsEndTime: 0};
          break;
      }
      
      return handler.call(this, event);
    };
  }
});
```

## Success Criteria
- All test scenarios pass
- KPIs meet or exceed targets in 80% of tests
- No critical errors in console
- Smooth audio playback without glitches
- Natural conversation flow maintained

## Issue Reporting Template
```markdown
**Test ID**: UAT-XXX
**Date/Time**: 
**Tester**: 
**Scenario**: 
**Expected Result**: 
**Actual Result**: 
**KPI Measurements**:
- TTFT: XXXms
- TTFA: XXXms
- Other: 
**Screenshots/Logs**: 
**Severity**: Critical/High/Medium/Low
```
