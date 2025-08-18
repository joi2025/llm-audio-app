# Capacitor Integration Guide
## Converting LLM Audio App to Android

## Step 1: Install Capacitor Dependencies

Navigate to your project root and install Capacitor:

```powershell
cd c:\Users\Personal\CascadeProjects\llm-audio-app

# Install Capacitor core and CLI as dev dependencies
npm install @capacitor/core @capacitor/android @capacitor/cli --save-dev

# Install additional plugins (optional but recommended)
npm install @capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar --save-dev
```

## Step 2: Initialize Capacitor

```powershell
# Initialize Capacitor with your app details
npx cap init

# When prompted, enter:
# App name: LLM Audio App
# App Package ID: com.llmaudio.app
# Web Directory: frontend/dist
```

This creates `capacitor.config.ts` (or `.json`):

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.llmaudio.app',
  appName: 'LLM Audio App',
  webDir: 'frontend/dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

## Step 3: Configure for Development

Update `capacitor.config.ts` for development with live reload:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.llmaudio.app',
  appName: 'LLM Audio App',
  webDir: 'frontend/dist',
  server: {
    // For development - replace with your local IP
    url: 'http://192.168.1.100:5173',  // Your dev server
    cleartext: true,  // Allow HTTP in development
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,  // For development only
  }
};

export default config;
```

**Important**: Find your local IP:
```powershell
ipconfig | Select-String "IPv4"
# Use the IP from your active network adapter
```

## Step 4: Add Android Platform

```powershell
# Add Android platform to your project
npx cap add android

# This creates an 'android' folder with the native project
```

## Step 5: Build Your Web Assets

```powershell
# Build the frontend
cd frontend
npm run build
cd ..

# Copy web assets to native project
npx cap copy

# Or sync (copy + update native dependencies)
npx cap sync
```

## Step 6: Configure Backend Connection

Create `frontend/src/config/capacitor.js`:

```javascript
// Detect if running in Capacitor
export const isCapacitor = () => {
  return window.Capacitor !== undefined;
};

// Get backend URL based on environment
export const getBackendUrl = () => {
  if (isCapacitor()) {
    // For production app
    return 'https://your-backend.ngrok.io';
  } else {
    // For web development
    return import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';
  }
};

// Get WebSocket URL
export const getWebSocketUrl = () => {
  const backendUrl = getBackendUrl();
  return backendUrl.replace('http://', 'ws://').replace('https://', 'wss://');
};
```

Update your WebSocket hooks to use this configuration:

```javascript
// In your WebSocket hook
import { getWebSocketUrl } from '../config/capacitor';

const wsUrl = getWebSocketUrl();
```

## Step 7: Update Package.json Scripts

Add convenient scripts to `package.json`:

```json
{
  "scripts": {
    "build": "npm run build --prefix frontend",
    "cap:sync": "npm run build && npx cap sync",
    "cap:copy": "npm run build && npx cap copy",
    "cap:open": "npx cap open android",
    "cap:run": "npm run build && npx cap run android",
    "cap:live": "npx cap run android --livereload --external",
    "android": "npm run cap:sync && npm run cap:open"
  }
}
```

## Project Structure After Integration

```
llm-audio-app/
├── android/                 # Native Android project (created by Capacitor)
│   ├── app/
│   │   ├── src/
│   │   │   └── main/
│   │   │       ├── java/com/llmaudio/app/
│   │   │       ├── AndroidManifest.xml
│   │   │       └── res/
│   │   └── build.gradle
│   └── capacitor.settings.gradle
├── frontend/
│   ├── dist/               # Built web assets (copied to Android)
│   └── src/
├── backend/
├── capacitor.config.ts     # Capacitor configuration
└── package.json
```

## Files Created by Capacitor

1. **capacitor.config.ts**: Main configuration file
2. **android/**: Complete Android Studio project
3. **android/app/src/main/java/com/llmaudio/app/MainActivity.java**: Main activity
4. **android/app/capacitor.build.gradle**: Capacitor-specific Gradle config
5. **android/variables.gradle**: Build variables

## Common Configuration Changes

### Enable HTTP for Local Development

Create/update `android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">192.168.1.100</domain> <!-- Your local IP -->
    </domain-config>
</network-security-config>
```

### Update Android Manifest

Reference the network security config in `android/app/src/main/AndroidManifest.xml`:

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    android:usesCleartextTraffic="true"
    ...>
```

## Troubleshooting

### Issue: "Web assets not found"
```powershell
# Ensure frontend is built
npm run build --prefix frontend
# Then sync
npx cap sync
```

### Issue: "Cannot connect to backend"
1. Ensure backend is running and accessible
2. Check firewall settings
3. Use ngrok for public URL:
```powershell
ngrok http 8001
# Use the HTTPS URL in capacitor.config.ts
```

### Issue: "Build failed"
```powershell
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx cap sync
npx cap open android
```

## Next Steps

1. Apply native modifications (see android-native-mods.md)
2. Build and deploy (see android-build-deploy.md)
3. Set up live reload for development
