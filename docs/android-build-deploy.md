# Android Build and Deployment Guide
## Building and Running LLM Audio App on Android

## Development Build Options

### Option 1: Quick Development Build
```powershell
# Navigate to project root
cd c:\Users\Personal\CascadeProjects\llm-audio-app

# Build frontend and sync with Android
npm run build --prefix frontend
npx cap sync

# Open in Android Studio
npx cap open android
# Then click "Run" button in Android Studio
```

### Option 2: Command Line Build
```powershell
# Build and run directly on connected device
npx cap run android

# Or specify a target device
npx cap run android --target=device_id
```

### Option 3: Live Reload Development
```powershell
# Start frontend dev server
cd frontend
npm run dev
# Note the URL (e.g., http://192.168.1.100:5173)

# In another terminal, run with live reload
cd ..
npx cap run android --livereload --external --livereload-url=http://192.168.1.100:5173
```

## Setting Up Live Reload

### Step 1: Configure Capacitor for Live Reload
Create `capacitor.config.dev.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.llmaudio.app',
  appName: 'LLM Audio App',
  webDir: 'frontend/dist',
  server: {
    url: 'http://YOUR_LOCAL_IP:5173',  // Replace with your IP
    cleartext: true
  }
};

export default config;
```

### Step 2: Use Development Config
```powershell
# Copy dev config
cp capacitor.config.dev.ts capacitor.config.ts

# Sync and run
npx cap sync
npx cap run android
```

### Step 3: Automatic IP Detection Script
Create `scripts/setup-live-reload.ps1`:

```powershell
# Get local IP address
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.InterfaceAlias -notlike "*Loopback*" -and 
    $_.IPAddress -notlike "169.254.*"
} | Select-Object -First 1).IPAddress

Write-Host "Using IP: $ip" -ForegroundColor Green

# Update capacitor config
$config = @"
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.llmaudio.app',
  appName: 'LLM Audio App',
  webDir: 'frontend/dist',
  server: {
    url: 'http://${ip}:5173',
    cleartext: true
  }
};

export default config;
"@

$config | Out-File -FilePath "capacitor.config.ts" -Encoding utf8

Write-Host "Capacitor config updated for live reload" -ForegroundColor Green
Write-Host "Run: npm run dev --prefix frontend" -ForegroundColor Yellow
Write-Host "Then: npx cap run android" -ForegroundColor Yellow
```

## Production Build

### Step 1: Prepare for Production
```powershell
# Update capacitor.config.ts for production
# Remove server.url and set webDir to 'frontend/dist'

# Build optimized frontend
cd frontend
npm run build
cd ..

# Sync with Android
npx cap sync
```

### Step 2: Generate Signed APK

#### Option A: Using Android Studio
1. Open Android project: `npx cap open android`
2. Build → Generate Signed Bundle/APK
3. Select APK
4. Create or choose keystore
5. Fill in key details
6. Select release build variant
7. Build APK

#### Option B: Command Line with Gradle
```powershell
# Navigate to Android directory
cd android

# Generate release APK (unsigned)
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

### Step 3: Sign the APK
```powershell
# Generate keystore (first time only)
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias

# Sign the APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore my-release-key.jks app-release-unsigned.apk my-key-alias

# Verify signature
jarsigner -verify -verbose -certs app-release-unsigned.apk

# Optimize with zipalign
zipalign -v 4 app-release-unsigned.apk app-release.apk
```

## Deployment Methods

### Method 1: Direct Installation via ADB
```powershell
# Install on connected device
adb install app-release.apk

# Or replace existing installation
adb install -r app-release.apk

# For debug builds
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Method 2: Upload to Device
1. Copy APK to device via USB
2. Navigate to file on device
3. Tap to install (enable "Install from Unknown Sources" if needed)

### Method 3: Distribution Platforms
- **Google Play Store**: Upload signed AAB (Android App Bundle)
- **Firebase App Distribution**: Beta testing
- **AppCenter**: Enterprise distribution
- **Direct download**: Host APK on your server

## Backend Connection for Production

### Using ngrok for Public Access
```powershell
# Install ngrok
choco install ngrok

# Or download from https://ngrok.com

# Expose backend
ngrok http 8001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

### Update Frontend Configuration
```javascript
// frontend/src/config/api.js
export const API_CONFIG = {
  production: {
    baseUrl: 'https://your-backend.ngrok.io',
    wsUrl: 'wss://your-backend.ngrok.io'
  },
  development: {
    baseUrl: 'http://localhost:8001',
    wsUrl: 'ws://localhost:8001'
  }
};
```

## Debugging & Monitoring

### View Device Logs
```powershell
# All logs
adb logcat

# Filter by package
adb logcat | Select-String "com.llmaudio"

# Clear old logs
adb logcat -c

# Save logs to file
adb logcat > debug.log
```

### Chrome DevTools Debugging
1. Enable USB debugging on device
2. Open Chrome: `chrome://inspect`
3. Find your app under "Remote Target"
4. Click "Inspect" to open DevTools

### Monitor Performance
```powershell
# CPU usage
adb shell top | Select-String "llmaudio"

# Memory usage
adb shell dumpsys meminfo com.llmaudio.app

# Network activity
adb shell dumpsys netstats
```

## Automation Scripts

### Complete Build Script
Create `scripts/build-android.ps1`:

```powershell
param(
    [string]$BuildType = "debug",  # debug or release
    [switch]$Install = $false,
    [switch]$LiveReload = $false
)

Write-Host "Building LLM Audio App for Android..." -ForegroundColor Cyan

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
npm run build --prefix frontend

if ($LiveReload) {
    Write-Host "Setting up live reload..." -ForegroundColor Yellow
    & ./scripts/setup-live-reload.ps1
}

# Sync Capacitor
Write-Host "Syncing Capacitor..." -ForegroundColor Yellow
npx cap sync

if ($BuildType -eq "release") {
    Write-Host "Building release APK..." -ForegroundColor Yellow
    cd android
    ./gradlew assembleRelease
    cd ..
    Write-Host "APK created at: android/app/build/outputs/apk/release/" -ForegroundColor Green
} else {
    Write-Host "Building debug APK..." -ForegroundColor Yellow
    cd android
    ./gradlew assembleDebug
    cd ..
    Write-Host "APK created at: android/app/build/outputs/apk/debug/" -ForegroundColor Green
}

if ($Install) {
    Write-Host "Installing on device..." -ForegroundColor Yellow
    $apkPath = if ($BuildType -eq "release") {
        "android/app/build/outputs/apk/release/app-release.apk"
    } else {
        "android/app/build/outputs/apk/debug/app-debug.apk"
    }
    adb install -r $apkPath
    Write-Host "Installation complete!" -ForegroundColor Green
    
    # Launch app
    adb shell am start -n com.llmaudio.app/.MainActivity
}
```

### Quick Deploy Script
Create `scripts/quick-deploy.ps1`:

```powershell
# Quick build and deploy for development
Write-Host "Quick Deploy Starting..." -ForegroundColor Cyan

# Kill any existing adb server
adb kill-server
adb start-server

# Check for devices
$devices = adb devices | Select-String "device$"
if ($devices.Count -eq 0) {
    Write-Host "No devices connected!" -ForegroundColor Red
    exit 1
}

# Build and run
npx cap run android

Write-Host "Deploy complete!" -ForegroundColor Green
```

## Troubleshooting Deployment

### Issue: "App not installed"
```powershell
# Uninstall existing version
adb uninstall com.llmaudio.app

# Install fresh
adb install app-debug.apk
```

### Issue: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"
```powershell
# Force uninstall
adb uninstall com.llmaudio.app
# Or manually uninstall from device
```

### Issue: WebSocket connection fails
1. Check backend is accessible from device
2. Verify network security config
3. Use ngrok for public URL
4. Check CORS settings on backend

### Issue: Audio not working
1. Check permissions granted in app settings
2. Verify AudioManager initialization
3. Test with different audio sources

## Performance Optimization

### Reduce APK Size
```gradle
// In android/app/build.gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    
    splits {
        abi {
            enable true
            reset()
            include 'arm64-v8a', 'armeabi-v7a'
            universalApk false
        }
    }
}
```

### Enable R8 Compiler
```gradle
// In gradle.properties
android.enableR8=true
android.enableR8.fullMode=true
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Android Build

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        npm install
        npm install -g @capacitor/cli
    
    - name: Build frontend
      run: npm run build --prefix frontend
    
    - name: Sync Capacitor
      run: npx cap sync
    
    - name: Build APK
      run: |
        cd android
        ./gradlew assembleDebug
    
    - name: Upload APK
      uses: actions/upload-artifact@v2
      with:
        name: app-debug
        path: android/app/build/outputs/apk/debug/app-debug.apk
```
