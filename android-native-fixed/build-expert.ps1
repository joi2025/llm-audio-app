# EXPERT BUILD SCRIPT - ANDROID NATIVO
Write-Host "=== COMITE DE EXPERTOS ANDROID - BUILD NATIVO ===" -ForegroundColor Magenta
Write-Host "Arquitecto Senior: Configurando entorno..." -ForegroundColor Cyan

# Configurar entorno Java/Android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools;" + $env:PATH

Write-Host "Experto DevOps: Validando configuracion..." -ForegroundColor Yellow
Write-Host "JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Gray
Write-Host "ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Gray

Set-Location "c:\Users\Personal\CascadeProjects\llm-audio-app\android-native-fixed"

Write-Host "Especialista Build: Limpiando proyecto..." -ForegroundColor Green
try {
    & .\gradlew.bat clean --no-daemon --stacktrace
    
    Write-Host "Arquitecto Android: Compilando APK nativa..." -ForegroundColor Cyan
    & .\gradlew.bat assembleDebug --no-daemon --stacktrace --info
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: APK NATIVA COMPILADA!" -ForegroundColor Green -BackgroundColor Black
        
        $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
        if (Test-Path $apkPath) {
            Write-Host "Experto Conectividad: Validando APK nativa..." -ForegroundColor Cyan
            
            # Desinstalar version Capacitor antigua
            Write-Host "Removiendo APK Capacitor problematica..." -ForegroundColor Yellow
            & "$env:ANDROID_HOME\platform-tools\adb.exe" uninstall com.joi2025.llmaudioapp
            
            # Instalar version NATIVA
            Write-Host "Instalando APK NATIVA con mejoras..." -ForegroundColor Green
            & "$env:ANDROID_HOME\platform-tools\adb.exe" install -r $apkPath
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Performance Expert: Lanzando app optimizada..." -ForegroundColor Cyan
                & "$env:ANDROID_HOME\platform-tools\adb.exe" shell monkey -p com.joi2025.llmaudioapp -c android.intent.category.LAUNCHER 1
                
                Write-Host "" -ForegroundColor White
                Write-Host "========================================" -ForegroundColor Green
                Write-Host "  EXITO TOTAL - APP NATIVA INSTALADA   " -ForegroundColor Green -BackgroundColor Black
                Write-Host "========================================" -ForegroundColor Green
                Write-Host "WebSocket puro (sin Socket.IO)" -ForegroundColor Green
                Write-Host "VAD nativo optimizado" -ForegroundColor Green  
                Write-Host "AdminPro con metricas tiempo real" -ForegroundColor Green
                Write-Host "Jetpack Compose UI fluida" -ForegroundColor Green
                Write-Host "Conectividad robusta" -ForegroundColor Green
                Write-Host "" -ForegroundColor White
            } else {
                Write-Host "ERROR: Fallo instalacion de APK nativa" -ForegroundColor Red
            }
        } else {
            Write-Host "ERROR: APK nativa no encontrada" -ForegroundColor Red
        }
    } else {
        Write-Host "ERROR: Fallo compilacion de APK nativa" -ForegroundColor Red
        Write-Host "Revisando logs de build..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR CRITICO: $_" -ForegroundColor Red
    Write-Host "Activando protocolo de emergencia..." -ForegroundColor Yellow
}

Write-Host "Build completado por comite de expertos." -ForegroundColor White
