# Script de pre-commit para Husky en Windows

# Ejecutar lint-staged
try {
    npx lint-staged
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Linting failed. Please fix the issues and try again." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ An error occurred during pre-commit: $_" -ForegroundColor Red
    exit 1
}
