# Android Minimal + Admin Pro — Plan por fases

## Objetivos
- Entregar una UI **Minimal Assistant** sin fricción (auto-voz por defecto, sin botones extra).
- Entregar **Admin Pro** con métricas reales (p50/p95) y logs filtrables.
- Estabilizar experiencia Android (WebView, permisos, build reproducible).

## Fases

### Fase 0 — Preparación
- Rama: `android-minimal`.
- Script de build: npm build → cap copy → gradle assembleDebug.

### Fase 1 — Minimal Assistant (frontend)
- `frontend/src/components/MinimalAssistant.jsx`: cascarón minimal que usa `VoiceCircleV2_Final` en `autoMode`.
- `frontend/src/App.jsx`: vista por defecto `minimal`, controles ocultos.

### Fase 2 — Admin Pro (frontend)
- `frontend/src/components/AdminPro.jsx`: scaffold de secciones Salud / Latencia / Pipeline / Logs / Dispositivo.
- Integrar métricas en hooks y listeners de Socket (pendiente conectar con backend y eventos WS).

### Fase 3 — Pulido Android (nativo)
- Manifest: INTERNET, RECORD_AUDIO, usesCleartextTraffic, WAKE_LOCK.
- `MainActivity.java`: media autoplay ya habilitado; añadir `KEEP_SCREEN_ON`.
- Network security config para HTTP LAN si aplica.

### Fase 4 — Documentación
- Guías de build e instalación ADB.
- Troubleshooting (SDK/licencias/MIUI, firewall, etc.).

## Comandos útiles
```bash
# Build frontend
npm run build --prefix frontend

# Copiar a Android
npx cap copy android

# Build APK debug
cd android && gradlew assembleDebug

# Instalar APK (Windows)
"%LOCALAPPDATA%/Android/Sdk/platform-tools/adb.exe" install -r android/app/build/outputs/apk/debug/app-debug.apk
```
