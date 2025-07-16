# Script para mover archivos obsoletos a la carpeta archive
$ErrorActionPreference = "Stop"

# Crear carpeta archive si no existe
if (-not (Test-Path "archive")) {
    New-Item -ItemType Directory -Path "archive"
}

# Mover archivos obsoletos
$filesToArchive = @(
    "archived_obsolete_backups",
    "obsolete_backup_20250624_160529",
    "backend_logs_20250624_160529.txt",
    "frontend_logs_20250624_160529.txt",
    "nats_logs_20250624_160529.txt",
    "repair_log.txt",
    "repair_voice_advance_v3.ps1",
    "start_all.bat",
    "start_all.ps1",
    "start_services.bat",
    "start_services.ps1",
    "CHECKLIST.md",
    "MIGRATION.md",
    "TECHNOLOGIES.md",
    "project_context.txt"
)

foreach ($file in $filesToArchive) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "archive\" -Force
        Write-Host "Movido $file a archive"
    }
}

# Mover scripts duplicados al backend
Move-Item -Path "backend\scripts\*" -Destination "backend\" -Force
Remove-Item -Path "backend\scripts" -Force

Write-Host "Archivado completado" -ForegroundColor Green
