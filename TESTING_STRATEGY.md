# 🧪 TESTING STRATEGY

## Strategic Testing Pyramid for android-elite

### 🎯 **Mission Critical**: Restore Zero Confidence → 100% Reliability

The current project has **ZERO** meaningful test coverage. Unit tests create false security without validating real user journeys. This strategy implements a **bulletproof testing pyramid** that validates every critical path.

---

## 🏗️ **Testing Architecture Overview**

```
        E2E Tests (5%)
       /              \
      /   CRITICAL     \
     /   USER FLOWS     \
    /____________________\
   /                      \
  /   Integration (15%)    \
 /   COMPONENT COLLAB      \
/____________________________\
/                            \
/      Unit Tests (80%)       \
/     ISOLATED COMPONENTS     \
/______________________________\
```

### **Testing Distribution Strategy**
- **80% Unit Tests**: Fast, isolated, comprehensive coverage
- **15% Integration Tests**: Component collaboration validation  
- **5% E2E Tests**: Complete user journey validation

---

## 🔬 **Unit Tests (80% - Foundation Layer)**

**PURPOSE**: Validate individual components work in isolation

### **Core Components to Test**

#### **AudioPlayer.kt**
```kotlin
class AudioPlayerTest {
    @Test fun `playAudioStream should handle MP3 data correctly`()
    @Test fun `playAudioStream should queue multiple chunks`()
    @Test fun `stopPlayback should clear queue immediately`()
    @Test fun `playAudioStream should handle malformed data gracefully`()
    @Test fun `concurrent playback should be thread-safe`()
}
```

#### **VoiceActivityDetector.kt**
```kotlin
class VoiceActivityDetectorTest {
    @Test fun `detectVoiceActivity should trigger on threshold`()
    @Test fun `detectVoiceActivity should ignore background noise`()
    @Test fun `startListening should initialize properly`()
    @Test fun `stopListening should cleanup resources`()
}
```

#### **MetricsRepository.kt**
```kotlin
class MetricsRepositoryTest {
    @Test fun `recordLatency should store metrics correctly`()
    @Test fun `getAverageLatency should calculate p50_p95 accurately`()
    @Test fun `recordInterruption should increment counters`()
    @Test fun `clearMetrics should reset all data`()
}
```

#### **Personality.kt**
```kotlin
class PersonalityTest {
    @Test fun `getSystemPrompt should return correct prompt for personality`()
    @Test fun `getAllPersonalities should return 15 personalities`()
    @Test fun `getPersonalityByName should handle invalid names`()
    @Test fun `getVoiceForPersonality should map correctly`()
}
```

#### **MessageRepository.kt**
```kotlin
class MessageRepositoryTest {
    @Test fun `saveMessage should persist to Room database`()
    @Test fun `getConversationHistory should return chronological order`()
    @Test fun `deleteConversation should remove all related messages`()
    @Test fun `searchMessages should find text matches`()
}
```

### **Testing Tools & Setup**
```kotlin
dependencies {
    // Unit Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.mockito.kotlin:mockito-kotlin:5.1.0")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
    testImplementation("androidx.arch.core:core-testing:2.2.0")
    
    // Room Testing
    testImplementation("androidx.room:room-testing:2.6.1")
    
    // Hilt Testing
    testImplementation("com.google.dagger:hilt-android-testing:2.48")
    kaptTest("com.google.dagger:hilt-compiler:2.48")
}
```

---

## 🔗 **Integration Tests (15% - Collaboration Layer)**

**PURPOSE**: Verify components work together correctly with mocked external dependencies

### **Critical Integration Scenarios**

#### **VoicePipelineViewModel Integration**
```kotlin
@HiltAndroidTest
class VoicePipelineViewModelIntegrationTest {
    
    @get:Rule val hiltRule = HiltAndroidRule(this)
    
    @Test fun `voice pipeline should coordinate STT_Chat_TTS flow`() {
        // Given: Mocked repositories with realistic responses
        // When: User starts voice recording
        // Then: Should trigger STT → Chat → TTS sequence
        // And: UI states should transition correctly
    }
    
    @Test fun `interruption should cancel TTS and reset state`() {
        // Given: TTS is playing
        // When: User interrupts with new voice input
        // Then: Should stop TTS immediately and start new cycle
    }
}
```

#### **WebSocketRepository Integration**
```kotlin
class WebSocketRepositoryIntegrationTest {
    
    @Test fun `websocket should handle connection lifecycle`() {
        // Given: MockWebServer configured
        // When: Repository connects/disconnects
        // Then: Should handle all states gracefully
    }
    
    @Test fun `websocket should parse streaming responses`() {
        // Given: Mock streaming LLM response
        // When: Repository receives chunks
        // Then: Should emit correct parsed events
    }
}
```

### **Mock Strategy**
- **OpenAI API**: MockWebServer with realistic response patterns
- **Audio System**: Mock AudioManager and MediaRecorder
- **Database**: In-memory Room database for tests
- **Network**: MockWebServer for WebSocket simulation

---

## 🎯 **E2E Tests (5% - Critical User Flows)**

**PURPOSE**: Validate complete user journeys that restore confidence

### **🚨 MOST CRITICAL: Full Conversation Flow Test**

```kotlin
@LargeTest
@HiltAndroidTest
class FullConversationFlowTest {
    
    @get:Rule val composeTestRule = createAndroidComposeRule<MainActivity>()
    @get:Rule val hiltRule = HiltAndroidRule(this)
    
    private lateinit var mockWebServer: MockWebServer
    
    @Before
    fun setup() {
        hiltRule.inject()
        mockWebServer = MockWebServer()
        mockWebServer.start()
        
        // Configure mock responses for complete flow
        setupMockOpenAIResponses()
    }
    
    @Test
    fun test_happyPath_fullConversationCycle() {
        // 🎯 THE MOST IMPORTANT TEST IN THE ENTIRE PROJECT
        
        // Step 1: App launches and shows voice avatar
        composeTestRule.onNodeWithTag("voice_avatar")
            .assertIsDisplayed()
            .assertTextContains("Toca para hablar")
        
        // Step 2: User taps to start recording
        composeTestRule.onNodeWithTag("voice_avatar")
            .performClick()
        
        // Step 3: Verify "Escuchando..." state
        composeTestRule.onNodeWithTag("status_text")
            .assertTextContains("Escuchando...")
        
        // Step 4: Simulate voice input completion
        // (Cannot use real microphone, so trigger programmatically)
        simulateVoiceInputCompletion("Hola, ¿cómo estás?")
        
        // Step 5: Verify "Procesando..." state  
        composeTestRule.onNodeWithTag("status_text")
            .assertTextContains("Procesando...")
        
        // Step 6: Wait for mock STT response
        composeTestRule.waitUntil(timeoutMillis = 5000) {
            try {
                composeTestRule.onNodeWithTag("status_text")
                    .assertTextContains("Hablando...")
                true
            } catch (e: AssertionError) {
                false
            }
        }
        
        // Step 7: Verify TTS playback started
        composeTestRule.onNodeWithTag("status_text")
            .assertTextContains("Hablando...")
        
        // Step 8: Wait for conversation completion
        composeTestRule.waitUntil(timeoutMillis = 10000) {
            try {
                composeTestRule.onNodeWithTag("status_text")
                    .assertTextContains("Toca para hablar")
                true
            } catch (e: AssertionError) {
                false
            }
        }
        
        // Step 9: Verify return to idle state
        composeTestRule.onNodeWithTag("voice_avatar")
            .assertIsDisplayed()
        composeTestRule.onNodeWithTag("status_text")
            .assertTextContains("Toca para hablar")
        
        // 🏆 SUCCESS: Complete user journey validated!
    }
    
    @Test
    fun test_interruption_flow() {
        // Test interrupting TTS with new voice input
        // This validates the most complex user interaction
    }
    
    @Test
    fun test_error_recovery() {
        // Test network errors, API failures, audio issues
        // Ensures app doesn't crash under adverse conditions
    }
    
    private fun setupMockOpenAIResponses() {
        // STT Mock Response
        mockWebServer.enqueue(MockResponse()
            .setBody("""{"text": "Hola, ¿cómo estás?"}""")
            .setHeader("Content-Type", "application/json"))
        
        // Chat Mock Response (Streaming)
        mockWebServer.enqueue(MockResponse()
            .setBody("""
                data: {"choices":[{"delta":{"content":"¡Hola!"}}]}
                
                data: {"choices":[{"delta":{"content":" Estoy"}}]}
                
                data: {"choices":[{"delta":{"content":" muy bien, gracias."}}]}
                
                data: [DONE]
            """.trimIndent())
            .setHeader("Content-Type", "text/event-stream"))
        
        // TTS Mock Response
        mockWebServer.enqueue(MockResponse()
            .setBody(generateMockAudioData())
            .setHeader("Content-Type", "audio/mpeg"))
    }
    
    private fun simulateVoiceInputCompletion(transcript: String) {
        // Trigger ViewModel method to simulate VAD completion
        // This replaces real microphone input for testing
    }
}
```

### **Additional E2E Scenarios**

#### **AdminPro Integration Test**
```kotlin
@Test
fun test_adminPro_fullWorkflow() {
    // Navigate to AdminPro
    // Verify all tabs load correctly
    // Test metrics display
    // Test settings modification
    // Verify persistence
}
```

#### **Personality System E2E**
```kotlin
@Test  
fun test_personality_switching_affects_conversation() {
    // Start conversation with default personality
    // Switch to different personality mid-conversation
    // Verify system prompt changes
    // Verify voice changes
    // Verify conversation context maintained
}
```

---

## 🛠️ **Test Infrastructure Setup**

### **MockWebServer Configuration**
```kotlin
@Module
@TestInstallIn(
    components = [SingletonComponent::class],
    replaces = [NetworkModule::class]
)
object TestNetworkModule {
    
    @Provides
    @Singleton
    fun provideTestOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor { chain ->
                // Redirect to MockWebServer
                val request = chain.request().newBuilder()
                    .url("http://localhost:${mockWebServer.port}/")
                    .build()
                chain.proceed(request)
            }
            .build()
    }
}
```

### **Test Database Configuration**
```kotlin
@Module
@TestInstallIn(
    components = [SingletonComponent::class], 
    replaces = [DatabaseModule::class]
)
object TestDatabaseModule {
    
    @Provides
    @Singleton
    fun provideTestDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
    }
}
```

---

## 🚀 **Test Execution Strategy**

### **Local Development**
```bash
# Run all unit tests
./gradlew test

# Run integration tests  
./gradlew connectedAndroidTest

# Run specific E2E test
./gradlew connectedAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.llmaudio.app.FullConversationFlowTest
```

### **CI/CD Pipeline**
```yaml
# .github/workflows/ci.yml
- name: Run Unit Tests
  run: ./gradlew test
  
- name: Start Android Emulator
  uses: reactivecircus/android-emulator-runner@v2
  with:
    api-level: 29
    script: ./gradlew connectedCheck
```

---

## 📊 **Success Criteria**

### **Coverage Targets**
- **Unit Tests**: >90% line coverage
- **Integration Tests**: All critical component interactions
- **E2E Tests**: 100% of critical user paths

### **Quality Gates**
- **All tests must pass** before merge to main
- **E2E tests must run** on every PR
- **Performance tests** validate <500ms latency
- **Memory tests** ensure no leaks

### **Confidence Restoration Metrics**
- ✅ **Full conversation flow validated**
- ✅ **Error scenarios handled gracefully**  
- ✅ **Performance benchmarks met**
- ✅ **Zero crashes in test scenarios**

---

## 🎯 **Implementation Priority**

1. **Phase 1**: Implement FullConversationFlowTest (CRITICAL)
2. **Phase 2**: Add core unit tests (AudioPlayer, VAD, Repositories)
3. **Phase 3**: Integration tests for ViewModels
4. **Phase 4**: Additional E2E scenarios
5. **Phase 5**: Performance and stress testing

**The FullConversationFlowTest is the single most important test - it validates the entire user experience and will restore confidence in the system.**
