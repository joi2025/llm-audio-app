param(
    [switch]$NoBackup,
    [switch]$SkipBackupButAsk
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups"
$archiveDir = "archived_obsolete_backups" # New directory for old backups
$obsoleteDir = "obsolete_backup_$timestamp"
$logFile = "repair_log.txt"

# --- LOG CENTRALIZADO ---
function Log {
    param([string]$msg)
    $logMsg = "[$(Get-Date -Format 'HH:mm:ss')] $msg"
    Write-Host $logMsg
    Add-Content -Path $logFile -Value $logMsg
}
Set-Content -Path $logFile -Value "--- Reparación iniciada: $(Get-Date -Format o) ---`n"

# --- PRE-REPAIR SANITIZATION (CRITICAL FIX) ---
Log "Buscando y saneando backups obsoletos anidados para evitar errores de ruta larga..."
if (!(Test-Path $archiveDir)) { New-Item -ItemType Directory -Path $archiveDir | Out-Null }

$obsoleteFolders = Get-ChildItem -Path . -Directory -Filter "obsolete_backup_*" -ErrorAction SilentlyContinue
foreach ($folder in $obsoleteFolders) {
    Log "Procesando backup obsoleto: $($folder.Name)"
    try {
        Move-Item -Path $folder.FullName -Destination $archiveDir -Force
        Log "Movido $($folder.Name) a $archiveDir"
    } catch {
        Log "ERROR: No se pudo mover $($folder.Name). Probablemente la ruta es demasiado larga. Se forzará la eliminación."
        try {
            Remove-Item -Recurse -Force -Path $folder.FullName
            Log "Eliminado con éxito: $($folder.Name)"
        } catch {
            Log "FALLO CRÍTICO: No se pudo eliminar la carpeta $($folder.FullName). Por favor, elimínala manualmente y ejecuta el script de nuevo."
            exit 1
        }
    }
}
Log "Saneamiento de backups obsoletos completado."


# 1. Preguntar si se quiere crear backup
if (!(Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
$doBackup = !$NoBackup
if ($doBackup) {
    $response = Read-Host "¿Quieres crear un backup antes de reparar? (S/n)"
    if ($response -eq 'n' -or $response -eq 'N') {
        $doBackup = $false
    }
}

# Salto condicional del backup si se especifica el nuevo parámetro
if ($SkipBackupButAsk) {
    Log "Se omite la creación del backup por el parámetro -SkipBackupButAsk."
    $doBackup = $false
}

# 2. Crear backup ZIP si se ha elegido
if ($doBackup) {
    $backupZip = "$backupDir/llm_audio_backup_$timestamp.zip"
    Log "Creando backup de seguridad en $backupZip..."
    
    # Lista de exclusión para el backup. Más robusta.
    $excludePatterns = @(
        "node_modules", 
        "backups", 
        $archiveDir, 
        "obsolete_backup_*", 
        "*.zip", 
        "*.log",
        ".git",
        ".vscode"
    )

    $filesToBackup = Get-ChildItem -Path . -Recurse -ErrorAction SilentlyContinue | Where-Object {
        $item = $_;
        $shouldExclude = $false;
        foreach ($pattern in $excludePatterns) {
            if ($item.FullName -like "*\$pattern*") {
                $shouldExclude = $true;
                break;
            }
        }
        -not $shouldExclude;
    } | Select-Object -ExpandProperty FullName

    Compress-Archive -Path $filesToBackup -DestinationPath $backupZip -Force
    Log "Backup creado con éxito."
} else {
    Log "Saltando creación de backup por preferencia del usuario."
}

# 3. Listado de imprescindibles (no mover a obsoletos)
$imprescindibles = @(
    "docker-compose.yml", ".env", ".env.example", "README.md",
    "repair_voice_advance_v3.ps1", "start_all.ps1", "frontend", "backend", "nginx", 
    $backupDir, $archiveDir, $logFile, $obsoleteDir
)

# 4. Mover archivos/carpetas NO imprescindibles a la nueva carpeta obsoleta
Log "Moviendo archivos no imprescindibles a $obsoleteDir..."
New-Item -ItemType Directory -Path $obsoleteDir -ErrorAction SilentlyContinue | Out-Null

$rootItems = Get-ChildItem -Path . | Where-Object { $_.Name -notin $imprescindibles }
foreach ($item in $rootItems) {
    Log "Moviendo a obsoletos: $($item.Name)"
    Move-Item -Path $item.FullName -Destination $obsoleteDir -Force
}

# 5. Crear .env si falta
if (!(Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Log "Archivo .env creado a partir de .env.example"
}

# 6. Validar YAML
function Test-Yaml {
    param([string]$file)
    try {
        python -c "import yaml,sys; yaml.safe_load(open('$file'))" 2>&1 | Out-Null
        return $true
    } catch { return $false }
}
if (!(Test-Yaml "docker-compose.yml")) {
    Log "ERROR: docker-compose.yml inválido. Restaurando backup si existe..."
    if ($doBackup) {
        Expand-Archive $backupZip -DestinationPath . -Force
        Log "Backup restaurado."
    }
    exit 1
}

# --- CONTROL DE SERVICIOS DOCKER ---
# 7. Reconstruir y arrancar servicios
Log "Limpiando entorno Docker (down -v)..."
docker-compose down -v --remove-orphans
Log "Reconstruyendo imágenes Docker sin caché (build --no-cache)..."
docker-compose build --no-cache
Log "Arrancando servicios en segundo plano (up -d)..."
docker-compose up -d

# 8. Comprobar estado de todos los servicios y guardar logs
Log "Esperando 15 segundos para que los servicios se estabilicen..."
Start-Sleep -Seconds 15

$services = @("frontend", "backend", "nats")
$allUp = $true

foreach ($svc in $services) {
    $containerNamePattern = "llm-audio-app-${svc}"
    $containerId = docker ps -q --filter "name=${containerNamePattern}"
    
    if (-not [string]::IsNullOrEmpty($containerId)) {
        $status = docker inspect -f '{{.State.Status}}' $containerId
        Log "Estado de $svc ($containerNamePattern): $status"
        if ($status -ne "running") {
            $allUp = $false
            Log "ERROR: ¡El servicio $svc no está en estado 'running'!'"
        }
        # Guardar logs
        docker logs $containerId | Out-File -Encoding UTF8 -FilePath "${svc}_logs_$timestamp.txt"
    } else {
        Log "ERROR: No se encontró ningún contenedor para el servicio $svc con el patrón $containerNamePattern."
        $allUp = $false
    }
}

# 9. Si algún servicio no está "Up", restaurar backup
if (-not $allUp) {
    Log "ERROR CRÍTICO: Uno o más servicios no arrancaron correctamente. Restaurando backup..."
    if ($doBackup) {
        Expand-Archive $backupZip -DestinationPath . -Force
        Log "Backup restaurado debido a un error de arranque de servicios."
    }
    exit 1
}

Log "--- Reparación y comprobaciones finalizadas: $(Get-Date -Format o) ---"
Log "Todo parece estar en orden. Los servicios están corriendo."
Log "Abre http://localhost:3000 para verificar la aplicación."
