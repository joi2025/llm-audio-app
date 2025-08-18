# BUILD PROYECTO ANDROID NUEVO - TEMPLATE LIMPIO GARANTIZADO
Write-Host "=== PROYECTO ANDROID NUEVO - TEMPLATE LIMPIO ===" -ForegroundColor Green -BackgroundColor Black
Write-Host "Expertos Android: Compilando proyecto desde cero..." -ForegroundColor Cyan

# Configurar entorno con versiones estables
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools;" + $env:PATH

Write-Host "Template limpio configurado:" -ForegroundColor Yellow
Write-Host "- Gradle 7.4.2 (estable)" -ForegroundColor Gray
Write-Host "- Kotlin 1.8.10 (probado)" -ForegroundColor Gray
Write-Host "- Hilt 2.44 (compatible)" -ForegroundColor Gray
Write-Host "- Compose 2023.03.00 (funcional)" -ForegroundColor Gray

Set-Location "c:\Users\Personal\CascadeProjects\llm-audio-app\android-nuevo"

Write-Host "Arquitecto Senior: Limpiando proyecto..." -ForegroundColor Green
try {
    & .\gradlew.bat clean --no-daemon --stacktrace
    
    Write-Host "Experto Build: Compilando APK nativa nueva..." -ForegroundColor Cyan
    & .\gradlew.bat assembleDebug --no-daemon --stacktrace
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "" -ForegroundColor White
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "   EXITO - APK NATIVA NUEVA CREADA     " -ForegroundColor Green -BackgroundColor Black
        Write-Host "========================================" -ForegroundColor Green
        
        $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
        if (Test-Path $apkPath) {
            Write-Host "APK nativa encontrada: $apkPath" -ForegroundColor Green
            
            # Desinstalar version anterior
            Write-Host "Removiendo version anterior..." -ForegroundColor Yellow
            & "$env:ANDROID_HOME\platform-tools\adb.exe" uninstall com.joi2025.llmaudioapp
            
            # Instalar nueva version NATIVA
            Write-Host "Instalando APK NATIVA NUEVA..." -ForegroundColor Green
            & "$env:ANDROID_HOME\platform-tools\adb.exe" install -r $apkPath
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Lanzando app nativa nueva..." -ForegroundColor Cyan
                & "$env:ANDROID_HOME\platform-tools\adb.exe" shell monkey -p com.joi2025.llmaudioapp -c android.intent.category.LAUNCHER 1
                
                Write-Host "" -ForegroundColor White
                Write-Host "PROYECTO ANDROID NATIVO NUEVO INSTALADO" -ForegroundColor Green -BackgroundColor Black
                Write-Host "Template limpio con arquitectura base" -ForegroundColor Green
                Write-Host "Listo para migrar funcionalidades avanzadas" -ForegroundColor Green
                Write-Host "" -ForegroundColor White
            } else {
                Write-Host "ERROR: Fallo instalacion" -ForegroundColor Red
            }
        } else {
            Write-Host "ERROR: APK no encontrada" -ForegroundColor Red
        }
    } else {
        Write-Host "ERROR: Fallo compilacion" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}

Write-Host "Build proyecto nuevo completado." -ForegroundColor White
