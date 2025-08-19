# Android Development Environment Setup Guide
## Converting React Web App to Android with Capacitor

## Prerequisites Installation

### 1. Android Studio
**Download**: https://developer.android.com/studio
- Version: Latest stable (Hedgehog 2023.1.1 or newer)
- During installation, select:
  - Android SDK
  - Android SDK Platform-Tools
  - Android Virtual Device (AVD)
  - Intel HAXM (for emulator acceleration)

### 2. Java Development Kit (JDK)
Android Studio includes OpenJDK, but ensure it's configured:
- Default location: `C:\Program Files\Android\Android Studio\jbr`
- Version required: JDK 11 or 17

### 3. Android SDK Configuration
Open Android Studio → SDK Manager (Tools → SDK Manager)

**SDK Platforms**:
- Android 14.0 (API 34) - Recommended
- Android 13.0 (API 33) - Fallback
- Android 12.0 (API 31) - Minimum

**SDK Tools**:
- Android SDK Build-Tools 34.0.0
- Android SDK Command-line Tools
- Android Emulator
- Android SDK Platform-Tools
- Google USB Driver (for Windows)
- Intel x86 Emulator Accelerator (HAXM)

### 4. Environment Variables (Windows)

Open PowerShell as Administrator and run:
```powershell
# Set ANDROID_HOME
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', "$env:LOCALAPPDATA\Android\Sdk", 'User')

# Set ANDROID_SDK_ROOT (same as ANDROID_HOME)
[System.Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', "$env:LOCALAPPDATA\Android\Sdk", 'User')

# Add to PATH
$currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
$androidPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk\platform-tools",
    "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin",
    "$env:LOCALAPPDATA\Android\Sdk\emulator"
)

foreach ($path in $androidPaths) {
    if ($currentPath -notlike "*$path*") {
        $currentPath += ";$path"
    }
}

[System.Environment]::SetEnvironmentVariable('Path', $currentPath, 'User')

# Refresh environment
$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'User')
```

### 5. Accept Android Licenses
```powershell
# Navigate to SDK location
cd $env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin

# Accept all licenses automatically
.\sdkmanager.bat --licenses
# Press 'y' for all prompts or use:
echo y | .\sdkmanager.bat --licenses
```

### 6. Node.js & Capacitor CLI
```powershell
# Ensure Node.js 18+ is installed
node --version

# Install Capacitor CLI globally (optional, can use npx)
npm install -g @capacitor/cli

# Verify installation
npx cap --version
```

## Device Setup

### Physical Device (Recommended)
1. **Enable Developer Options**:
   - Settings → About Phone
   - Tap "Build Number" 7 times
   
2. **Enable USB Debugging**:
   - Settings → Developer Options
   - Enable "USB Debugging"
   - Enable "Install via USB"
   
3. **Connect Device**:
   ```powershell
   # Verify connection
   adb devices
   # Should show: "device_id    device"
   ```

### Emulator Setup
1. Open Android Studio
2. AVD Manager (Tools → AVD Manager)
3. Create Virtual Device:
   - Phone → Pixel 6
   - System Image: API 34 (Google Play)
   - RAM: 4GB minimum
   - Internal Storage: 4GB

## Troubleshooting

### Issue: "ANDROID_HOME not found"
```powershell
# Verify environment variable
echo $env:ANDROID_HOME
# Should output: C:\Users\[YourUser]\AppData\Local\Android\Sdk

# If not set, run the environment setup again and restart terminal
```

### Issue: "adb is not recognized"
```powershell
# Check if platform-tools is in PATH
where.exe adb
# If not found, add to PATH:
$env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
```

### Issue: "Device not showing in adb devices"
1. Install device-specific USB drivers
2. Try different USB cable/port
3. Revoke USB debugging authorizations and reconnect
4. For Xiaomi/MIUI:
   - Settings → Additional Settings → Developer Options
   - Enable "USB Debugging (Security Settings)"
   - Disable "MIUI Optimization"

### Issue: "License not accepted"
```powershell
# Manual acceptance
cd $env:ANDROID_HOME\cmdline-tools\latest\bin
.\sdkmanager.bat --update
.\sdkmanager.bat --licenses
```

## Quick Verification Commands
```powershell
# Check Java
java -version

# Check Android SDK
echo $env:ANDROID_HOME

# Check ADB
adb version

# Check connected devices
adb devices

# Check installed SDK packages
sdkmanager --list_installed
```
