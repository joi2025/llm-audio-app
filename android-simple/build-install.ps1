# Build and Install Android Native APK
# Configura el entorno y compila la APK nativa

Write-Host "Build Android nativo iniciando..." -ForegroundColor Green

# Configurar PATH con Android Studio JBR
$env:PATH = "C:\Program Files\Android\Android Studio\jbr\bin;" + $env:PATH

# Configurar ANDROID_HOME si no esta configurado
if (-not $env:ANDROID_HOME) {
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
    $env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
}

Write-Host "Android SDK: $env:ANDROID_HOME" -ForegroundColor Cyan

# Cambiar al directorio del proyecto
Set-Location "c:\Users\Personal\CascadeProjects\llm-audio-app\android-native"

Write-Host "Compilando APK debug..." -ForegroundColor Yellow

# Ejecutar gradle build
try {
    & .\gradlew.bat assembleDebug
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "APK compilada exitosamente!" -ForegroundColor Green
        
        # Buscar la APK generada
        $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
        
        if (Test-Path $apkPath) {
            Write-Host "APK encontrada: $apkPath" -ForegroundColor Green
            
            # Verificar dispositivos conectados
            Write-Host "Verificando dispositivos conectados..." -ForegroundColor Cyan
            & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
            
            # Instalar APK
            Write-Host "Instalando APK en dispositivo..." -ForegroundColor Yellow
            & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r -t --user 0 $apkPath
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "APK instalada exitosamente!" -ForegroundColor Green
                
                # Lanzar la app
                Write-Host "Lanzando aplicacion..." -ForegroundColor Cyan
                & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell monkey -p com.joi2025.llmaudioapp -c android.intent.category.LAUNCHER 1
                
                Write-Host "App Android nativa instalada y ejecutandose!" -ForegroundColor Green
            } else {
                Write-Host "Error instalando APK" -ForegroundColor Red
            }
        } else {
            Write-Host "APK no encontrada en $apkPath" -ForegroundColor Red
        }
    } else {
        Write-Host "Error compilando APK" -ForegroundColor Red
    }
} catch {
    Write-Host "Error durante el build: $_" -ForegroundColor Red
}

Write-Host "Build completado." -ForegroundColor White
