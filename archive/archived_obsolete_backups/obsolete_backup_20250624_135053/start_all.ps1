docker-compose up -d
Start-Sleep -Seconds 10
Start-Process "http://localhost:3000"
Write-Host "¡Voice Advance está arrancando! Si ves la web, todo está OK."

