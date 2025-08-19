# LLM Audio App - Stop Script Simple
# Version funcional sin caracteres especiales

Write-Host "Deteniendo LLM Audio App..." -ForegroundColor Red

# Detener jobs si existen
if (Test-Path ".jobs") {
    $jobIds = Get-Content ".jobs" -Raw
    $ids = $jobIds.Split(",")
    
    foreach ($id in $ids) {
        if ($id.Trim()) {
            try {
                Stop-Job -Id $id.Trim() -ErrorAction SilentlyContinue
                Remove-Job -Id $id.Trim() -ErrorAction SilentlyContinue
                Write-Host "Job $($id.Trim()) detenido" -ForegroundColor Yellow
            } catch {
                # Ignorar errores
            }
        }
    }
    
    Remove-Item ".jobs" -ErrorAction SilentlyContinue
}

# Detener procesos por puerto
$ports = @(8001, 3001)
foreach ($port in $ports) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        foreach ($conn in $connections) {
            $processId = $conn.OwningProcess
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "Proceso en puerto $port detenido" -ForegroundColor Yellow
        }
    } catch {
        # Puerto no en uso
    }
}

# Detener procesos relacionados
$processes = Get-Process | Where-Object {
    $_.ProcessName -eq "python" -or 
    $_.ProcessName -eq "node" -or
    $_.ProcessName -eq "flask"
}

foreach ($proc in $processes) {
    try {
        $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
        if ($commandLine -like "*llm-audio-app*" -or $commandLine -like "*run.py*" -or $commandLine -like "*vite*") {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Write-Host "Proceso relacionado detenido: $($proc.ProcessName)" -ForegroundColor Yellow
        }
    } catch {
        # Ignorar errores de acceso
    }
}

# Limpiar archivos temporales
if (Test-Path ".pids") {
    Remove-Item ".pids" -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Sistema detenido completamente" -ForegroundColor Green
