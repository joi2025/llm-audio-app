# LLMAudio App Documentation

This document provides an overview of the LLMAudio application's structure and components.

## Table of Contents
1.  [Application Class (`LLMAudioApplication.kt`)](#1-application-class-llmaudioapplicationkt)
2.  [Dependency Injection (`di` package)](#2-dependency-injection-di-package)
3.  [Data Layer (`data` package)](#3-data-layer-data-package)
4.  [Domain Layer (`domain` package)](#4-domain-layer-domain-package)
5.  [Presentation Layer (`presentation` package)](#5-presentation-layer-presentation-package)
6.  [Android Manifest (`AndroidManifest.xml`)](#6-android-manifest-androidmanifestxml)
7.  [App-Level Build Script (`app/build.gradle.kts`)](#7-app-level-build-script-appbuildgradlekts)

---

## 1. Application Class (`LLMAudioApplication.kt`)

*   **File:** `com/llmaudio/app/LLMAudioApplication.kt`
*   **Purpose:** The custom `Application` class for the LLMAudio app.
*   **Key Features:**
    *   Annotated with `@HiltAndroidApp` to enable Hilt dependency injection at the application level.
    *   Overrides `onCreate()`:
        *   Initializes Timber (a logging library) for debug builds.

---

## 2. Dependency Injection (`di` package)

### `di/AppModule.kt`
*   **Purpose:** Defines Hilt modules responsible for providing various application-wide dependencies.
*   **Modules & Key Provisions:**
    *   **Application Context:** Provides the application `Context`.
    *   **Networking (OpenAI Service):**
        *   `OkHttpClient`: Includes `AuthInterceptor` (for API key), `HttpLoggingInterceptor`, `CurlLoggingInterceptor`, and `ChuckerInterceptor` (for debugging). Configured with timeouts.
        *   `Retrofit`: Base URL `https://api.openai.com/`, uses the provided `OkHttpClient` and `GsonConverterFactory`.
        *   `OpenAiService`: Retrofit interface for OpenAI API calls.
    *   **Audio:**
        *   `AudioPlayer`: Provides an instance for playing TTS audio.
    *   **Database (Room):**
        *   `AppDatabase`: Named "llmaudio_database", uses `fallbackToDestructiveMigration()`.
        *   `MessageDao`, `ConsentDao`, `MetricsDao`: DAOs for database operations.
    *   **Repositories:**
        *   `MessageRepository`, `ConsentRepository`, `MetricsRepository`.
    *   **DataStore & Secure Storage:**
        *   `DataStore<Preferences>`: Named "settings".
        *   `ApiKeyStore`: Securely manages the OpenAI API key using `EncryptedSharedPreferences`.
        *   `SelectedPersonalityStore`: Manages the selected personality ID using DataStore.

---

## 3. Data Layer (`data` package)

This package handles data sourcing, storage, and management.

### API (`data/api`)

*   **`AuthInterceptor.kt`**
    *   **Purpose:** OkHttp `Interceptor` that adds the "Authorization" header (Bearer token) using the API key from `ApiKeyStore`.
*   **`CurlLoggingInterceptor.kt`**
    *   **Purpose:** OkHttp `Interceptor` that logs network requests as cURL commands for debugging.
*   **`OpenAiService.kt`**
    *   **Purpose:** Retrofit service interface for OpenAI API.
    *   **Endpoints:**
        *   `createChatCompletionStream` (POST `v1/chat/completions`): For streaming chat completions.
        *   `createTranscription` (POST `v1/audio/transcriptions`): For audio transcription.
        *   `createTTS` (POST `v1/audio/speech`): For text-to-speech synthesis.
        *   `listModels` (GET `v1/models`): To list available OpenAI models.

### Database (`data/database`)

*   **`AppDatabase.kt`**
    *   **Purpose:** Defines the Room database (`llmaudio_database`).
    *   **Entities:** `MessageEntity`, `ConsentRecordEntity`, `MetricItemEntity`, `LogEntryEntity`.
    *   **DAOs:** Exposes `MessageDao`, `ConsentDao`, `MetricsDao`.
    *   **Type Converters:** Uses `DatabaseConverters`.
*   **`ConsentDao.kt`**
    *   **Purpose:** DAO for `ConsentRecordEntity` (consent records).
    *   **Methods:** `insert`, `getAll`, `getLatestByType`, `deleteAll`.
*   **`Converters.kt`**
    *   **Purpose:** Room `TypeConverter` functions for `Date` to `Long` timestamps, `List<String>` to JSON, and `Map<String, String>` to JSON.
*   **`MessageDao.kt`**
    *   **Purpose:** DAO for `MessageEntity` (chat messages).
    *   **Methods:** `insertMessage`, `getMessagesForSession`, `getAllMessages`, `deleteMessagesForSession`, `deleteAllMessages`.
*   **`MetricsDao.kt`**
    *   **Purpose:** DAO for `MetricItemEntity` (analytics) and `LogEntryEntity` (logging).
    *   **Methods:** Insert, get all, and delete all for both metrics and logs.

### Models (`data/model`)

*   **`ApiModels.kt`**
    *   **Purpose:** Data classes for OpenAI API requests and responses.
    *   **Key Classes:** `ChatCompletionRequest`, `Message` (role, content), `TranscriptionResponse`, `TTSRequest`, `OpenAIModelsResponse`, `OpenAIModel`, `ErrorResponse`.
*   **`DatabaseEntities.kt`**
    *   **Purpose:** Room entity classes.
    *   **Entities:** `MessageEntity`, `ConsentRecordEntity`, `MetricItemEntity`, `LogEntryEntity` with their respective fields and annotations.
*   **`Message.kt`**
    *   **Purpose:** Contains a duplicate definition of the `Message` data class also found in `ApiModels.kt`. Recommended to consolidate.

### Repositories (`data/repository`)

*   **`ConsentRepository.kt`**
    *   **Purpose:** Manages consent records via `ConsentDao`.
    *   **Methods:** `recordConsent`, `getAllConsentRecords`, `getLatestConsent`, `clearAllConsentData`.
*   **`MessageRepository.kt`**
    *   **Purpose:** Manages chat messages via `MessageDao`.
    *   **Methods:** `saveMessage`, `getMessagesForSession`, `getAllMessages`, `deleteMessagesForSession`, `deleteAllMessages`.
*   **`MetricsRepository.kt`**
    *   **Purpose:** Manages metrics and log entries via `MetricsDao`; provides app/device info.
    *   **Methods:** `recordMetric`, `getAllMetrics`, `clearAllMetrics`, `log` (with `LogLevel` enum), `getAllLogs`, `clearAllLogs`, `getAppVersion`, `getDeviceModel`, etc.

### Stores (`data/store`)

*   **`ApiKeyStore.kt`**
    *   **Purpose:** Securely manages OpenAI API key using `EncryptedSharedPreferences`.
    *   **Key Features:** `setApiKey`, `getApiKey`, `apiKeyFlow: StateFlow<String>`, `clearApiKey`.
*   **`SelectedPersonalityStore.kt`**
    *   **Purpose:** Manages the selected personality ID using Jetpack DataStore (`Preferences`).
    *   **Key Features:** `selectedPersonalityIdFlow: Flow<String?>`, `saveSelectedPersonalityId`, `clearSelectedPersonalityId`.

---

## 4. Domain Layer (`domain` package)

This package contains core business logic and domain-specific models.

### Audio (`domain/audio`)

*   **`AudioPlayer.kt`**
    *   **Purpose:** Interface and implementation for playing a queue of TTS audio segments.
    *   **Key Components:**
        *   `PlaybackListener` interface (`onStart`, `onStop`, `onError`).
        *   `AudioPlayer` class: Manages playback queue (`AudioSegment` data), uses `AudioTrack` for PCM playback, handles sequential playback, state management (`isPlaying`, `isPaused`), error handling, and allows setting playback speed.

### Models (`domain/model`)

*   **`Personalities.kt`**
    *   **Purpose:** Defines the `Personality` data structure and a predefined set of personalities.
    *   **Key Components:**
        *   `Personality` data class: Fields include `id`, `name`, `systemPrompt`, `voiceId`, `modelName`, `temperature`, `maxTokensDefault`, `maxTokensExtended`, `voiceEngine`, `iconResId`, `exampleInteractions`.
        *   `Personalities` object: Provides `getAll()`, `getDefault()`, `findById()` for accessing hardcoded personality configurations.
*   **`VoiceState.kt`**
    *   **Purpose:** Sealed class representing states of the voice interaction pipeline.
    *   **States:** `Idle`, `Listening`, `Processing`, `Speaking`, `Error(message: String)`.

---

## 5. Presentation Layer (`presentation` package)

This package handles UI and user interaction.

### Components (`presentation/components`)

Reusable Jetpack Compose UI building blocks:

*   **`ApiKeySetupDialog.kt`:** Dialog for API key input and validation.
*   **`AudioWaveform.kt`:** Visualizes audio input amplitude.
*   **`ChatBubble.kt`:** Displays a single chat message (user/assistant styled).
*   **`ErrorDialog.kt`:** Generic dialog for displaying error messages.
*   **`LoadingIndicator.kt`:** Displays a progress indicator (e.g., `CircularProgressIndicator`).
*   **`MessageInput.kt`:** (Currently an empty file) Intended for user text input.
*   **`MicrophoneButton.kt`:** Button to start/stop audio recording, changes based on `VoiceState`.
*   **`PermissionRationaleDialog.kt`:** Dialog explaining the need for permissions.
*   **`PersonalitySelector.kt`:** UI for choosing AI personalities.
*   **`SettingsButton.kt`:** Button to navigate to settings.
*   **`SimpleConfirmationDialog.kt`:** Reusable dialog for user confirmations.
*   **`VoiceAvatar.kt`:** Displays AI personality avatar, animates based on `VoiceState`.

### Navigation (`presentation/navigation`)

*   **`AppNavigation.kt`**
    *   **Purpose:** Defines the main `NavHost` and navigation graph using Jetpack Compose Navigation. Links `Screen` routes to Composable screen functions.
*   **`Screen.kt`**
    *   **Purpose:** Sealed class hierarchy defining all navigable screen routes (e.g., `Main`, `Settings`, `AdminPro`, `History`) for type-safe navigation.

### Screens (`presentation/screens`)

Composable functions representing different application screens, often co-located with their ViewModels.

*   **`AdminProScreen.kt` & `AdminProViewModel.kt`**
    *   **Screen:** Tabbed layout for administrative functions (Consent, Metrics, Usage, Diagnostics, Personalities, Config).
    *   **ViewModel:** Provides data (consent records, metrics, logs, API key status, device info) and actions (test connectivity, clear data) for the admin panel.
*   **`HistoryScreen.kt` & `HistoryViewModel.kt`**
    *   **Screen:** Displays chat message history using `LazyColumn` and `ChatBubble`.
    *   **ViewModel:** Provides a `Flow<List<MessageEntity>>` of chat messages from `MessageRepository`.
*   **`MainScreen.kt`**
    *   **Purpose:** Primary user interface for voice interaction.
    *   **Features:** Displays `VoiceAvatar`, conversation transcript, `MicrophoneButton`, `AudioWaveform`, `PersonalitySelector`. Handles API key setup, errors, and permission requests. Interacts heavily with `VoicePipelineViewModel`.
*   **`OnboardingScreen.kt`**
    *   **Purpose:** Guides new users through initial setup (e.g., welcome, permissions, API key).
*   **`SettingsScreen.kt` & `SettingsViewModel.kt`**
    *   **Screen:** Allows configuration of API key, personality, clearing history, managing consent.
    *   **ViewModel:** Manages settings-related data persistence and logic, interacting with `ApiKeyStore`, `SelectedPersonalityStore`, `MessageRepository`.

### Theme (`presentation/theme`)

*   **`Color.kt`:** Defines the application's color palette (primary, secondary, custom colors).
*   **`Shape.kt`:** Defines custom `RoundedCornerShape`s for UI elements.
*   **`Theme.kt`:** Main `LLMAudioAppTheme` Composable that applies `MaterialTheme` (colors, typography, shapes). Handles light/dark theme.
*   **`Type.kt`:** Defines `Typography` styles (font families, sizes, weights) for various text elements.

### ViewModel (`presentation/viewmodel`)

*   **`VoicePipelineViewModel.kt`**
    *   **Purpose:** The central ViewModel managing the core voice interaction lifecycle: audio recording, STT, LLM interaction, and TTS.
    *   **Key Responsibilities:**
        *   Manages `VoiceState` (Idle, Listening, Processing, Speaking, Error).
        *   Handles audio recording via `AudioRecord`.
        *   Performs STT using `OpenAiService.createTranscription()`.
        *   Manages conversation history and streams requests to `OpenAiService.createChatCompletionStream()`.
        *   Processes LLM responses (SSE), detects sentence boundaries for predictive TTS.
        *   Initiates TTS via `OpenAiService.createTTS()` and plays audio using `AudioPlayer`.
        *   Manages API key (validation, storage via `ApiKeyStore`).
        *   Manages personality selection (storage via `SelectedPersonalityStore`).
        *   Exposes numerous `StateFlow`s for UI observation (transcription, assistant response, error messages, audio level, API key validity, current personality).

### MainActivity (`MainActivity.kt`)

*   **File:** `com/llmaudio/app/presentation/MainActivity.kt`
*   **Purpose:** The main and only `Activity` in this single-activity Compose application.
*   **Key Features:**
    *   `@AndroidEntryPoint` for Hilt.
    *   Sets up edge-to-edge display.
    *   Hosts the `LLMAudioAppTheme` and the main navigation composable (likely `AppNavigation`).

---

## 6. Android Manifest (`AndroidManifest.xml`)

*   **Location:** `app/src/main/AndroidManifest.xml`
*   **Purpose:** Declares essential information about the application to the Android system.
*   **Permissions (`<uses-permission>`):
    *   `android.permission.INTERNET`: For network API calls.
    *   `android.permission.RECORD_AUDIO`: For microphone voice input.
    *   `android.permission.MODIFY_AUDIO_SETTINGS`: May be used by `AudioPlayer` or for VAD.
    *   `android.permission.WAKE_LOCK`: To keep processor/screen active for long operations.
    *   `android.permission.FOREGROUND_SERVICE`: For reliable background tasks (e.g., continuous listening).
    *   `android.permission.POST_NOTIFICATIONS`: To post notifications (Android 13+).
*   **Application (`<application>`) Attributes:**
    *   `android:name=".LLMAudioApplication"`: Custom `Application` class.
    *   `android:allowBackup="true"`
    *   `android:icon="@mipmap/ic_launcher"`
    *   `android:label="@string/app_name"`
    *   `android:theme="@style/Theme.LLMAudioApp"` (Pre-Compose base theme)
    *   `android:enableOnBackInvokedCallback="true"` (Predictive back gesture support)
    *   `android:hardwareAccelerated="true"`
    *   `android:largeHeap="true"` (Requests larger heap, use judiciously)
    *   `android:extractNativeLibs="true"`
    *   `android:requestLegacyExternalStorage="false"` (Opts out of legacy storage)
*   **Meta-data (`<meta-data>`):
    *   MIUI-specific configurations for notch display and theme disabling.
*   **Activity (`<activity>` - `presentation.MainActivity`):
    *   `android:exported="true"`
    *   `android:screenOrientation="portrait"`
    *   `android:windowSoftInputMode="adjustResize"`
    *   **Intent Filter:** Declares it as the main entry point (`ACTION_MAIN`) and launcher activity (`CATEGORY_LAUNCHER`).

---

## 7. App-Level Build Script (`app/build.gradle.kts`)

*   **Location:** `app/build.gradle.kts`
*   **Purpose:** Configures build settings specific to the `app` module.
*   **Plugins:**
    *   `com.android.application`, `org.jetbrains.kotlin.android`, `org.jetbrains.kotlin.kapt`, `com.google.dagger.hilt.android`, `kotlin-parcelize`.
*   **Android Configuration (`android { ... }`):
    *   `namespace = "com.llmaudio.app"`
    *   `compileSdk = 34`
    *   **`defaultConfig`:**
        *   `applicationId = "com.llmaudio.app"`
        *   `minSdk = 26`, `targetSdk = 34`
        *   `versionCode = 1`, `versionName = "1.0.0"`
        *   `testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"`
        *   `vectorDrawables { useSupportLibrary = true }`
    *   **`buildTypes`:**
        *   **`release`:** `isMinifyEnabled = true`, `isShrinkResources = true`, ProGuard rules, `buildConfigField`s (`BACKEND_URL`, `DEBUG_LOGS=false`, `OPENAI_ORG_ID`), `signingConfig` (points to debug, **NEEDS CORRECTION for actual release**).
        *   **`debug`:** `isDebuggable = true`, `buildConfigField`s (`BACKEND_URL`, `DEBUG_LOGS=true`, `OPENAI_ORG_ID`).
    *   `compileOptions`: Java 17 compatibility.
    *   `kotlinOptions`: JVM target 17.
    *   `buildFeatures`: `compose = true`, `buildConfig = true`.
    *   `composeOptions`: `kotlinCompilerExtensionVersion = "1.5.4"`.
    *   `packaging`: Excludes certain META-INF files.
*   **Dependencies (`dependencies { ... }`):
    *   **Core & UI:** AndroidX Core, Lifecycle, Activity, Jetpack Compose (BOM, UI, Graphics, Material3, Animation, Icons), ViewModel, Navigation.
    *   **Async & Networking:** Coroutines, Retrofit, OkHttp (core, logging, SSE), Java-WebSocket.
    *   **Data & DI:** Gson, Hilt, DataStore, Security (Crypto for EncryptedPrefs), Room.
    *   **Utilities:** Accompanist Permissions.
    *   **Audio:** `androidx.media:media`.
    *   **Testing:** JUnit, Mockito-Kotlin, Coroutines Test, Arch Core Testing, Room Testing, Hilt Testing, Espresso, Compose UI Test, MockWebServer.
    *   **Debug:** Compose UI Tooling, UI Test Manifest.

---
This concludes the documentation of the Kotlin source files, AndroidManifest.xml, and app-level build script.
