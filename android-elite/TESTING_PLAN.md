# Plan de Testing - LLM Audio App Android Nativo

## 🎯 Objetivos de Testing

Validar la funcionalidad completa, rendimiento y estabilidad de la aplicación Android nativa con arquitectura MVVM, Jetpack Compose y comunicación directa con OpenAI APIs.

## 📊 KPIs Críticos

### Latencia
- **First Token**: < 500ms
- **VAD Response**: < 100ms  
- **TTS Start**: < 300ms
- **UI Response**: < 16ms (60 FPS)

### Estabilidad
- **Crash Rate**: < 0.1%
- **ANR Rate**: < 0.05%
- **Memory Leaks**: 0
- **Network Failures Handled**: 100%

### Rendimiento
- **CPU Usage**: < 20% promedio
- **Memory**: < 60MB
- **Battery Drain**: < 3%/hr
- **Cold Start**: < 600ms

## 🧪 Niveles de Testing

### 1. Unit Tests

#### VoiceActivityDetector
```kotlin
@Test
fun testSilenceDetection() {
    val vad = VoiceActivityDetector(silenceDuration = 1500L)
    val silentBuffer = ByteArray(32000) // 2 segundos de silencio
    assertTrue(vad.processSamples(silentBuffer))
}

@Test
fun testSpeechDetection() {
    val vad = VoiceActivityDetector()
    val speechBuffer = generateSpeechBuffer()
    assertFalse(vad.processSamples(speechBuffer))
}

@Test
fun testAdaptiveThreshold() {
    val vad = VoiceActivityDetector()
    // Test con diferentes niveles de ruido ambiente
    val noisyEnvironment = generateNoisyBuffer()
    vad.processSamples(noisyEnvironment)
    // Verificar ajuste de umbral
}
```

#### VoicePipelineViewModel
```kotlin
@Test
fun testStateTransitions() = runTest {
    val viewModel = VoicePipelineViewModel(mockService, mockPlayer, mockPrefs)
    
    // Idle -> Listening
    viewModel.startListening()
    assertEquals(VoiceState.Listening, viewModel.voiceState.value)
    
    // Listening -> Processing
    viewModel.stopListening()
    advanceUntilIdle()
    assertEquals(VoiceState.Processing, viewModel.voiceState.value)
}

@Test
fun testInterruption() = runTest {
    val viewModel = VoicePipelineViewModel(mockService, mockPlayer, mockPrefs)
    viewModel.interruptSpeaking()
    verify(mockPlayer).stop()
    assertEquals(VoiceState.Idle, viewModel.voiceState.value)
}
```

#### Personality Management
```kotlin
@Test
fun testPersonalitySwitch() {
    val comedian = Personalities.getById("comedian")
    assertEquals("😂", comedian.emoji)
    assertEquals("nova", comedian.voice)
}

@Test
fun testSystemPromptApplication() {
    val viewModel = VoicePipelineViewModel(mockService, mockPlayer, mockPrefs)
    viewModel.changePersonality(Personalities.getById("scientist"))
    // Verificar que el prompt se aplica en la conversación
}
```

### 2. Integration Tests

#### Audio Pipeline
```kotlin
@MediumTest
@RunWith(AndroidJUnit4::class)
class AudioPipelineTest {
    
    @Test
    fun testFullAudioCycle() {
        // Record -> STT -> LLM -> TTS -> Play
        val pipeline = createTestPipeline()
        pipeline.startRecording()
        Thread.sleep(2000)
        pipeline.stopRecording()
        
        // Verificar transcripción
        assertNotNull(pipeline.lastTranscription)
        
        // Verificar respuesta LLM
        assertNotNull(pipeline.lastResponse)
        
        // Verificar reproducción TTS
        assertTrue(pipeline.audioPlayed)
    }
}
```

#### Network Layer
```kotlin
@Test
fun testOpenAiServiceIntegration() = runTest {
    val service = createTestService()
    
    // Test STT
    val audioFile = createTestAudioFile()
    val transcription = service.transcribeAudio(authHeader, audioFile)
    assertNotNull(transcription.text)
    
    // Test Streaming LLM
    val request = ChatCompletionRequest(messages = testMessages)
    val response = service.streamChatCompletion(authHeader, request)
    assertTrue(response.isSuccessful)
    
    // Test TTS
    val ttsRequest = TTSRequest(input = "Test")
    val audio = service.generateSpeech(authHeader, ttsRequest)
    assertNotNull(audio)
}
```

### 3. UI Tests (Compose)

#### Main Screen
```kotlin
@Test
fun testVoiceAvatarInteraction() {
    composeTestRule.setContent { MainScreen() }
    
    // Test avatar click starts listening
    composeTestRule.onNodeWithTag("VoiceAvatar").performClick()
    composeTestRule.onNodeWithText("Escuchando...").assertIsDisplayed()
    
    // Test avatar animates
    composeTestRule.onNodeWithTag("VoiceAvatar").assertExists()
}

@Test
fun testPersonalitySelector() {
    composeTestRule.setContent { MainScreen() }
    
    // Open selector
    composeTestRule.onNodeWithTag("PersonalityChip").performClick()
    
    // Select comedian
    composeTestRule.onNodeWithText("Comediante").performClick()
    
    // Verify selection
    composeTestRule.onNodeWithText("😂").assertIsDisplayed()
}

@Test
fun testSettingsDialog() {
    composeTestRule.setContent { MainScreen() }
    
    // Open settings
    composeTestRule.onNodeWithContentDescription("Settings").performClick()
    
    // Enter API key
    composeTestRule.onNodeWithTag("ApiKeyInput").performTextInput("sk-test123")
    
    // Save
    composeTestRule.onNodeWithText("Guardar").performClick()
    
    // Verify saved (mock verification)
    verify(mockPrefs).putString("api_key", "sk-test123")
}
```

### 4. Performance Tests

#### Memory Profiling
```kotlin
@Test
fun testMemoryLeaks() {
    // Usar LeakCanary en debug builds
    val scenario = launchActivity<MainActivity>()
    
    repeat(10) {
        // Ciclo de start/stop listening
        onView(withId(R.id.voice_avatar)).perform(click())
        Thread.sleep(1000)
        onView(withId(R.id.voice_avatar)).perform(click())
    }
    
    scenario.close()
    // Verificar que no hay leaks con LeakCanary
}
```

#### Latency Measurements
```kotlin
@Test
fun measureFirstTokenLatency() {
    val startTime = System.currentTimeMillis()
    
    // Trigger pipeline
    viewModel.processAudio(testAudioData)
    
    // Wait for first token
    viewModel.assistantResponse.first { it.isNotEmpty() }
    
    val latency = System.currentTimeMillis() - startTime
    assertTrue("First token latency: $latency ms", latency < 500)
}
```

### 5. End-to-End Tests

#### User Journeys
```kotlin
@LargeTest
class UserJourneyTest {
    
    @Test
    fun testCompleteConversation() {
        // 1. Abrir app
        launchActivity<MainActivity>()
        
        // 2. Seleccionar personalidad
        onView(withText("😂")).perform(click())
        
        // 3. Iniciar grabación
        onView(withId(R.id.voice_avatar)).perform(click())
        
        // 4. Simular habla
        simulateSpeech(2000)
        
        // 5. Verificar transcripción
        onView(withId(R.id.transcription))
            .check(matches(not(withText(""))))
        
        // 6. Verificar respuesta
        onView(withId(R.id.assistant_response))
            .check(matches(isDisplayed()))
        
        // 7. Verificar audio playing
        verify(mockAudioPlayer).playStream(any())
    }
    
    @Test
    fun testInterruptionFlow() {
        // Start conversation
        triggerConversation()
        
        // Wait for speaking state
        onView(withText("Hablando...")).check(matches(isDisplayed()))
        
        // Interrupt
        onView(withId(R.id.voice_avatar)).perform(click())
        
        // Verify immediate stop
        onView(withText("Toca para hablar")).check(matches(isDisplayed()))
    }
}
```

## 🔍 Casos de Prueba Específicos

### Audio
- [ ] Grabación en ambiente silencioso
- [ ] Grabación con ruido de fondo
- [ ] Detección de silencio después de habla
- [ ] Interrupción durante grabación
- [ ] Manejo de permisos denegados

### Network
- [ ] Conexión WiFi estable
- [ ] Conexión móvil 4G/5G
- [ ] Pérdida de conexión durante streaming
- [ ] Timeout en requests
- [ ] Rate limiting handling

### UI/UX
- [ ] Animaciones fluidas 60 FPS
- [ ] Responsive touch (<100ms)
- [ ] Rotación de pantalla
- [ ] Background/foreground transitions
- [ ] Dark/light theme

### Personalidades
- [ ] Cambio durante conversación
- [ ] Persistencia entre sesiones
- [ ] Aplicación correcta de prompts
- [ ] Voces distintas en TTS

## 📱 Dispositivos de Prueba

### Obligatorios
- Pixel 6 (Android 14)
- Samsung S23 (Android 13)
- OnePlus 11 (Android 13)
- Xiaomi Redmi Note 12 (Android 12)

### Recomendados
- Tablet Samsung Tab S8
- Android Go device
- Emulador con API 26 (min SDK)

## 🚨 Criterios de Aceptación

### Must Pass
- ✅ No crashes en 1 hora de uso continuo
- ✅ Latencia first token < 500ms en WiFi
- ✅ VAD funcional en ambiente normal
- ✅ Interrupciones inmediatas
- ✅ API key encriptada correctamente

### Should Pass
- ✅ Funciona en red móvil 4G
- ✅ Maneja pérdidas de conexión gracefully
- ✅ Animaciones smooth 60 FPS
- ✅ Memory < 60MB en uso normal

### Nice to Have
- ✅ Funciona con Bluetooth headset
- ✅ Soporte landscape
- ✅ Widget funcional

## 🐛 Bug Reporting

### Template
```markdown
**Dispositivo**: [Modelo, Android version]
**Build**: [Version code/name]
**Pasos**:
1. 
2.
3.

**Esperado**: 
**Actual**:
**Logs**: [Attach logcat]
**Video/Screenshot**: [If applicable]
```

### Severidad
- **P0**: Crash/ANR, no funciona core feature
- **P1**: Feature importante degradada
- **P2**: Issue cosmético o edge case
- **P3**: Mejora o feature request

## 📈 Métricas de Calidad

### Pre-Release
- Code Coverage: > 70%
- Crash-free rate: > 99.5%
- Performance tests pass: 100%
- UI tests pass: > 95%

### Post-Release (Firebase)
- Crash-free users: > 99%
- ANR rate: < 0.1%
- User ratings: > 4.5
- Engagement: > 5 min/session

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
name: Android CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
      - name: Run Unit Tests
        run: ./gradlew test
      - name: Run Instrumented Tests
        run: ./gradlew connectedAndroidTest
      - name: Generate Coverage Report
        run: ./gradlew jacocoTestReport
```

### Pre-commit Hooks
```bash
#!/bin/sh
# .git/hooks/pre-commit
./gradlew ktlintCheck
./gradlew test
```

## 🎮 Manual Testing Checklist

### Smoke Test (5 min)
- [ ] App launches without crash
- [ ] Avatar responds to tap
- [ ] Voice recording works
- [ ] Transcription appears
- [ ] Response is generated
- [ ] Audio plays

### Regression Test (30 min)
- [ ] All personalities work
- [ ] Settings save correctly
- [ ] Interruptions work
- [ ] Network errors handled
- [ ] Background/foreground OK
- [ ] Memory stable over time

### Full Test (2 hrs)
- [ ] Complete test matrix
- [ ] Performance profiling
- [ ] Edge cases covered
- [ ] Accessibility verified
- [ ] Security validated
- [ ] Documentation reviewed

---

**Testing es crítico para calidad. No shortcuts!** 🚀
