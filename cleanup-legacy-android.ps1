# cleanup-legacy-android.ps1
# Script para eliminar directorios Android obsoletos después de la unificación en android-elite
# ADVERTENCIA: Este script eliminará permanentemente los directorios legacy

param(
    [switch]$DryRun = $false,
    [switch]$Force = $false
)

Write-Host "=== CLEANUP LEGACY ANDROID DIRECTORIES ===" -ForegroundColor Cyan
Write-Host "Este script eliminará los siguientes directorios obsoletos:" -ForegroundColor Yellow
Write-Host "- android-native" -ForegroundColor Red
Write-Host "- android-native-fixed" -ForegroundColor Red  
Write-Host "- android-simple" -ForegroundColor Red
Write-Host "- android-nuevo" -ForegroundColor Red
Write-Host ""
Write-Host "CONSERVARÁ:" -ForegroundColor Green
Write-Host "- android-elite (proyecto unificado)" -ForegroundColor Green
Write-Host "- backend/" -ForegroundColor Green
Write-Host "- frontend/" -ForegroundColor Green
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "android-elite")) {
    Write-Host "ERROR: No se encuentra el directorio android-elite" -ForegroundColor Red
    Write-Host "Asegúrate de ejecutar este script desde el directorio raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Directorios a eliminar
$legacyDirs = @(
    "android-native",
    "android-native-fixed", 
    "android-simple",
    "android-nuevo"
)

# Verificar qué directorios existen
$existingDirs = @()
foreach ($dir in $legacyDirs) {
    if (Test-Path $dir) {
        $existingDirs += $dir
        $size = (Get-ChildItem $dir -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "ENCONTRADO: $dir (${size:N1} MB)" -ForegroundColor Yellow
    }
}

if ($existingDirs.Count -eq 0) {
    Write-Host "No se encontraron directorios legacy para eliminar." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "Se eliminarán $($existingDirs.Count) directorios legacy" -ForegroundColor Yellow

# Modo dry-run
if ($DryRun) {
    Write-Host ""
    Write-Host "=== MODO DRY-RUN (simulación) ===" -ForegroundColor Cyan
    foreach ($dir in $existingDirs) {
        Write-Host "SIMULARÍA ELIMINAR: $dir" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Para ejecutar realmente: .\cleanup-legacy-android.ps1 -Force" -ForegroundColor Green
    exit 0
}

# Confirmación de seguridad
if (-not $Force) {
    Write-Host ""
    Write-Host "ADVERTENCIA: Esta acción es IRREVERSIBLE" -ForegroundColor Red
    Write-Host "¿Estás seguro de que quieres eliminar estos directorios? (y/N): " -NoNewline -ForegroundColor Yellow
    $confirmation = Read-Host
    
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Write-Host "Operación cancelada por el usuario" -ForegroundColor Green
        exit 0
    }
}

# Eliminar directorios
Write-Host ""
Write-Host "=== INICIANDO ELIMINACIÓN ===" -ForegroundColor Red

foreach ($dir in $existingDirs) {
    Write-Host "Eliminando $dir..." -NoNewline
    try {
        Remove-Item $dir -Recurse -Force -ErrorAction Stop
        Write-Host " ✓ ELIMINADO" -ForegroundColor Green
    }
    catch {
        Write-Host " ✗ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== LIMPIEZA COMPLETADA ===" -ForegroundColor Green
Write-Host "android-elite es ahora el único proyecto Android nativo" -ForegroundColor Cyan

# Verificar estado final
Write-Host ""
Write-Host "Estado final de directorios Android:" -ForegroundColor Cyan
if (Test-Path "android-elite") {
    Write-Host "✓ android-elite (CONSERVADO)" -ForegroundColor Green
} else {
    Write-Host "✗ android-elite (ERROR: No encontrado)" -ForegroundColor Red
}

foreach ($dir in $legacyDirs) {
    if (Test-Path $dir) {
        Write-Host "✗ $dir (ERROR: No eliminado)" -ForegroundColor Red
    } else {
        Write-Host "✓ $dir (eliminado)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Unificación Android completada exitosamente!" -ForegroundColor Green
Write-Host "Usa 'android-elite' para todo el desarrollo Android nativo" -ForegroundColor Cyan
