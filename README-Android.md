# Android Build Guide - LLM Audio App

## Overview
This guide covers building and deploying the React+Vite voice assistant app as an Android APK using Capacitor.

## Prerequisites
- **Android Studio** with bundled JDK
- **Android SDK** (API 34+, Build Tools 34.0.0+)
- **Node.js** and npm
- **Git**

## Environment Setup

### 1. Android SDK Configuration
```bash
# Set Android SDK path (Windows)
set ANDROID_SDK_ROOT=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk

# Add Android Studio JBR to PATH for build session
set PATH=C:\Program Files\Android\Android Studio\jbr\bin;%PATH%
```

### 2. Accept SDK Licenses
```bash
# Navigate to SDK directory
cd "%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\bin"

# Accept all licenses non-interactively
echo y | sdkmanager.bat --licenses
```

### 3. Install Required SDK Components
Via Android Studio SDK Manager:
- Android SDK Platform 35
- Android SDK Build-Tools 34.0.0
- Android SDK Command-line Tools (latest)
- CMake (if using native components)

## Build Process

### 1. Build Frontend
```bash
cd frontend
npm run build
```

### 2. Create/Update Android Wrapper
```bash
# First time only - create Capacitor Android project
npx @capacitor/cli create llm-audio-app-android com.joi2025.llmaudioapp "LLM Audio App"
cd llm-audio-app-android
npm install @capacitor/android @capacitor/core

# Copy built frontend to wrapper
robocopy ..\frontend\dist web /E

# Sync with Capacitor
npx cap add android
npx cap copy android
```

### 3. Configure Android Native Layer

#### AndroidManifest.xml
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<application
    android:usesCleartextTraffic="true"
    android:networkSecurityConfig="@xml/network_security_config">
```

#### MainActivity.java
```java
@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    // Enable TTS autoplay without user gesture
    if (getBridge() != null && getBridge().getWebView() != null) {
        getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
    }
    
    // Keep screen on during interaction
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    
    // Audio focus management
    audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
}
```

### 4. Build APK
```bash
cd android
gradlew.bat assembleDebug
```

## Installation

### ADB Installation
```bash
# List connected devices
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" devices

# Install APK
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" install -r -t --user 0 "android\app\build\outputs\apk\debug\app-debug.apk"

# Launch app
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" shell monkey -p com.joi2025.llmaudioapp -c android.intent.category.LAUNCHER 1
```

### Device Configuration
1. **Enable Developer Options**: Settings → About Phone → tap "Build Number" 7 times
2. **Enable USB Debugging**: Developer Options → USB Debugging
3. **Allow USB Installation**: Developer Options → Install via USB
4. **MIUI Specific**: Disable "MIUI Optimization" temporarily if installation fails

## App Features

### Minimal Assistant (Default)
- Ultra-minimal UI using VoiceCircleV2_Final in auto mode
- No distracting buttons or controls
- Direct voice interaction with TTS autoplay

### Admin Pro
Access via mode switching (hidden in minimal mode):
- **Health**: WebSocket status, backend connectivity, error counts
- **Latency**: p50/p95/max metrics for ws_connect, first_token, tts_start, roundtrip
- **Pipeline**: Event counters (audio_chunk, tts_cancelled, interruptions, etc.)
- **Logs**: Filterable circular buffer (500 entries) with level/source filters
- **Device**: User-Agent, connection type, permissions status

## Troubleshooting

### Build Issues
- **License errors**: Run `sdkmanager --licenses` and accept all
- **SDK path errors**: Ensure `local.properties` uses forward slashes: `sdk.dir=C:/Users/.../Sdk`
- **Java errors**: Use Android Studio's bundled JBR in PATH

### Installation Issues
- **INSTALL_FAILED_USER_RESTRICTED**: Enable "Install via USB" in Developer Options
- **Device not found**: Check USB debugging is enabled and device is authorized
- **MIUI restrictions**: Temporarily disable MIUI optimization

### Runtime Issues
- **No audio**: Check microphone permissions granted
- **No TTS**: Verify backend is accessible on same network (port 8001)
- **Connection failed**: Ensure Windows firewall allows port 8001

## Backend Configuration
Ensure backend is running and accessible:
```bash
# Backend should be accessible from mobile device
http://192.168.x.x:8001

# Test connectivity from mobile browser
http://192.168.x.x:8001/health
```

## Environment Variables
Set in frontend `.env`:
```
VITE_BACKEND_URL=http://192.168.x.x:8001
```

## Automated Build Script
```powershell
# build-android.ps1
cd frontend
npm run build
cd ..
robocopy frontend\dist llm-audio-app-android\web /E
cd llm-audio-app-android
npx cap copy android
cd android
set PATH=C:\Program Files\Android\Android Studio\jbr\bin;%PATH%
gradlew.bat assembleDebug
```

## Performance Notes
- **Native enhancements**: WAKE_LOCK prevents doze, audio focus improves TTS playback
- **Network security**: HTTP cleartext allowed for LAN backend access
- **WebView optimization**: Autoplay enabled, screen kept on during interaction
- **Metrics collection**: Real-time p50/p95 latency tracking in Admin Pro

## Support
For build issues, check:
1. Android SDK components installed
2. Licenses accepted
3. Device developer options enabled
4. Backend network accessibility
5. Firewall configuration
