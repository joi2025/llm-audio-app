# Verificar si Docker Desktop está instalado
$dockerVersion = docker --version
if ($dockerVersion -eq $null) {
    Write-Host "❌ Docker no está instalado. Por favor, instala Docker Desktop desde:"
    Write-Host "https://www.docker.com/products/docker-desktop/"
    exit 1
}

# Verificar si Docker Desktop está en ejecución
$dockerInfo = docker info
if ($dockerInfo -eq $null) {
    Write-Host "❌ Docker Desktop no está en ejecución. Por favor, inicia Docker Desktop."
    exit 1
}

# Verificar si el contenedor Redis está disponible
$redisImage = docker images redis:7-alpine --format "{{.Repository}}:{{.Tag}}"
if ($redisImage -ne "redis:7-alpine") {
    Write-Host "❌ La imagen Redis no está disponible. Intentando descargarla..."
    docker pull redis:7-alpine
}

Write-Host "✅ Docker está listo para usar!" -ForegroundColor Green
