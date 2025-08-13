# ========================================
# 🚀 LLM Audio App - Start Script v2.0
# Sistema autónomo con personalidades avanzadas
# ========================================

param(
    [switch]$Production,
    [switch]$Development,
    [switch]$Silent,
    [switch]$NoOpen
)

# Configuración
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colores para output
function Write-ColorOutput($Message, $Color = "White") {
    if (-not $Silent) {
        Write-Host $Message -ForegroundColor $Color
    }
}

# Helpers de logging (deben definirse antes de su uso)
function Write-Success($Message) { Write-ColorOutput "[OK] $Message" "Green" }
function Write-Info($Message) { Write-ColorOutput "[INFO] $Message" "Cyan" }
function Write-Warning($Message) { Write-ColorOutput "[WARN] $Message" "Yellow" }
function Write-Error($Message) { Write-ColorOutput "[ERROR] $Message" "Red" }

# Verificar que Docker esté en modo Linux containers (no Windows containers) usando formato estable
function Get-DockerOSType {
    try {
        $out = docker info --format '{{.OSType}}' 2>$null
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($out)) { return $null }
        return $out.Trim()
    } catch { return $null }
}

# Esperar a que el daemon de Docker esté listo (hasta 45s)
function Wait-DockerDaemon {
    param([int]$TimeoutSec = 45)
    $elapsed = 0
    while ($elapsed -lt $TimeoutSec) {
        $osType = Get-DockerOSType
        if ($osType) { return $osType }
        Start-Sleep -Seconds 3
        $elapsed += 3
    }
    return $null
}

$osType = Wait-DockerDaemon -TimeoutSec 45
if (-not $osType) {
    Write-Error "Docker daemon no responde. Abre Docker Desktop y espera a que inicialice el motor Linux (WSL2)."
    Write-Host "Pista: si ves el error de pipe 'dockerDesktopLinuxEngine', cambia a 'Switch to Linux containers'." -ForegroundColor Yellow
    exit 1
}
if ($osType -ne 'linux') {
    Write-Error "Docker Desktop no está en modo Linux containers (detectado: '$osType'). Usa 'Switch to Linux containers' y vuelve a ejecutar."
    exit 1
}
Write-Success "Docker en modo Linux containers"

# Header
if (-not $Silent) {
    Clear-Host
    Write-Host @"
========================================
   LLM Audio App v2.0 - Sistema Avanzado
   15 Personalidades | Auto-Deteccion
========================================
"@ -ForegroundColor Cyan
}

Write-Info "Iniciando sistema autonomo..."

# ========================================
# 1. VERIFICACIÓN DE DEPENDENCIAS
# ========================================

Write-Info "Verificando dependencias del sistema..."

# Verificar Docker
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker detectado: $dockerVersion"
    } else {
        throw "Docker no encontrado"
    }
} catch {
    Write-Error "Docker Desktop no está instalado o no está en ejecución. Descárgalo de: https://www.docker.com/"
    exit 1
}

# ========================================
# 2. CONFIGURACIÓN AUTOMÁTICA
# ========================================

Write-Info "Configurando entorno automáticamente..."

# Preparar secretos de Docker (dev)
$secretsDir = Join-Path "docker" "secrets"
New-Item -ItemType Directory -Path $secretsDir -Force | Out-Null
if (-not (Test-Path (Join-Path $secretsDir "openai_api_key"))) {
    Write-Warning "docker/secrets/openai_api_key no existe. Creando placeholder..."
    "sk-your-api-key-here" | Out-File -FilePath (Join-Path $secretsDir "openai_api_key") -Encoding ASCII -NoNewline
}
if (-not (Test-Path (Join-Path $secretsDir "flask_secret_key"))) {
    Write-Warning "docker/secrets/flask_secret_key no existe. Creando clave aleatoria..."
    -join ((33..126) | Get-Random -Count 48 | ForEach-Object {[char]$_}) | Out-File -FilePath (Join-Path $secretsDir "flask_secret_key") -Encoding ASCII -NoNewline
}

# ========================================
# 3. INSTALACIÓN AUTOMÁTICA DE DEPENDENCIAS
# ========================================

Write-Info "Entorno dockerizado: se omite instalación local de dependencias"

# ========================================
# 4. LIMPIEZA DE PROCESOS ANTERIORES
# ========================================

Write-Info "Limpiando procesos anteriores..."

# No matamos procesos locales; Compose aisla puertos (proxy usa 8080)

# Limpiar archivos PID anteriores
if (Test-Path ".pids") {
    Remove-Item ".pids" -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path ".pids" -Force | Out-Null

# ========================================
# 5. INICIO DE SERVICIOS
# ========================================

Write-Info "Iniciando servicios con Docker Compose (dev)..."
$composeDir = Join-Path $PWD 'docker'
Push-Location $composeDir
# Build explícito para minimizar fallos en 'up'
docker compose build
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Error "Fallo al construir imágenes con Docker Compose"
    exit 1
}

docker compose up -d --remove-orphans | Out-Null
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Error "Error iniciando servicios con Docker Compose"
    exit 1
}
Pop-Location

# Guardar estado simple
"compose" | Out-File -FilePath ".pids/backend.pid" -Encoding UTF8
"compose" | Out-File -FilePath ".pids/frontend.pid" -Encoding UTF8
Write-Success "Servicios dockerizados iniciados"

# Esperar a que el frontend esté listo
Write-Info "Esperando a que el proxy (frontend) este listo en :8080..."
$maxAttempts = 90
$attempt = 0
do {
    Start-Sleep -Seconds 1
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
            break
        }
    } catch {
        # Continuar intentando
    }
} while ($attempt -lt $maxAttempts)

if ($attempt -ge $maxAttempts) {
    Write-Warning "Frontend tardó más de lo esperado, pero puede estar funcionando"
}

if ($attempt -lt $maxAttempts) {
    Write-Success "Proxy y backend listos"
} else {
    Write-Warning "Proxy tardó más de lo esperado, intenta abrir igualmente"
}

# ========================================
# 6. VERIFICACIÓN FINAL Y APERTURA
# ========================================

Write-Success "Sistema iniciado correctamente!"

if (-not $Silent) {
    Write-Host @"

========================================
   SISTEMA LISTO - URLS DISPONIBLES
========================================
Aplicacion Principal: http://localhost:8080
Backend API Health:  http://localhost:8080/api/health
Socket.IO:           http://localhost:8080/socket.io/

RECOMENDADO: Usa el modo v2 Auto en el frontend
========================================
"@ -ForegroundColor Green
}

# Abrir navegador automáticamente
if (-not $NoOpen) {
    Start-Sleep -Seconds 2
    try {
        Start-Process "http://localhost:8080"
        Write-Success "Navegador abierto automaticamente"
    } catch {
        Write-Warning "No se pudo abrir el navegador automáticamente"
    }
}

# Guardar información del sistema
$systemInfo = @{
    StartTime = Get-Date
    BackendPID = $backendProcess.Id
    FrontendPID = $frontendProcess.Id
    BackendURL = "http://localhost:8080/api"
    FrontendURL = "http://localhost:8080"
    Version = "2.0"
    Features = @("Personalidades", "Auto-Deteccion", "AdminPanel", "Espanol-Optimizado")
} | ConvertTo-Json

$systemInfo | Out-File -FilePath ".pids/system.json" -Encoding UTF8

Write-Success "Información del sistema guardada"

if (-not $Silent) {
    Write-Host "`nConsejo: Para detener el sistema, ejecuta: .\stop.ps1" -ForegroundColor Cyan
    Write-Host "Para ver logs en tiempo real, revisa las ventanas minimizadas" -ForegroundColor Cyan
    Write-Host "`nDisfruta tu asistente de voz con personalidades avanzadas!" -ForegroundColor Green
}

exit 0
