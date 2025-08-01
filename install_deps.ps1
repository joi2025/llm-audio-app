# Install dependencies with specific versions that work with Python 3.13
$packages = @(
    "fastapi==0.103.1",
    "uvicorn==0.23.2",
    "websockets==11.0.3",
    "openai==0.28.0",
    "python-dotenv==1.0.0",
    "pyttsx3==2.90",
    "python-multipart==0.0.6",
    "numpy>=2.0.0",  # Using a newer version that supports Python 3.13
    "pydantic>=2.0.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4"
)

# Create virtual environment if it doesn't exist
if (-not (Test-Path ".\venv")) {
    Write-Host "Creating virtual environment..."
    python -m venv venv
}

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip
python -m pip install --upgrade pip

# Install wheel first to ensure we can use pre-built wheels
pip install wheel

# Install each package individually with retry logic
foreach ($package in $packages) {
    $maxRetries = 3
    $retryCount = 0
    $installed = $false
    
    while (-not $installed -and $retryCount -lt $maxRetries) {
        try {
            Write-Host "Installing $package..."
            pip install $package --no-cache-dir
            $installed = $true
        } catch {
            $retryCount++
            Write-Warning "Failed to install $package (Attempt $retryCount of $maxRetries)"
            if ($retryCount -ge $maxRetries) {
                Write-Error "Failed to install $package after $maxRetries attempts"
                exit 1
            }
            Start-Sleep -Seconds 5
        }
    }
}

Write-Host "All dependencies installed successfully!" -ForegroundColor Green

# Verify installation
try {
    python -c "import fastapi, uvicorn, websockets, openai, dotenv, pyttsx3, numpy, pydantic"
    Write-Host "Verification successful! All required packages are installed." -ForegroundColor Green
} catch {
    Write-Error "Verification failed. Some packages might not be installed correctly."
    exit 1
}
