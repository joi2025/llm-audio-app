# Build and Install Simple Android APK
Write-Host "Iniciando build Android simple..." -ForegroundColor Green

# Configurar entorno
$env:PATH = "C:\Program Files\Android\Android Studio\jbr\bin;" + $env:PATH
if (-not $env:ANDROID_HOME) {
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
}

Set-Location "c:\Users\Personal\CascadeProjects\llm-audio-app\android-simple"

# Limpiar y compilar
Write-Host "Limpiando proyecto..." -ForegroundColor Yellow
& .\gradlew.bat clean

Write-Host "Compilando APK..." -ForegroundColor Yellow
& .\gradlew.bat assembleDebug

if ($LASTEXITCODE -eq 0) {
    Write-Host "APK compilada exitosamente!" -ForegroundColor Green
    
    $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $apkPath) {
        Write-Host "Instalando APK..." -ForegroundColor Cyan
        & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r $apkPath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Lanzando app..." -ForegroundColor Green
            & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell monkey -p com.joi2025.llmaudioapp -c android.intent.category.LAUNCHER 1
            Write-Host "App instalada y ejecutandose!" -ForegroundColor Green
        }
    }
} else {
    Write-Host "Error en build" -ForegroundColor Red
}
