# verify-mobile-env.ps1
# Android Development Environment Verification Script
# Checks all required tools and configurations for Capacitor Android development

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Android Development Environment Check" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# Function to check command availability
function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Function to print status
function Write-Status {
    param($Check, $Success, $Message)
    if ($Success) {
        Write-Host "[✓] $Check" -ForegroundColor Green
        Write-Host "    $Message" -ForegroundColor Gray
    } else {
        Write-Host "[✗] $Check" -ForegroundColor Red
        Write-Host "    $Message" -ForegroundColor Yellow
        $script:errors += "$Check : $Message"
    }
    Write-Host ""
}

# 1. Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
if (Test-Command "node") {
    $nodeVersion = node --version
    $nodeVersionNum = [version]($nodeVersion -replace 'v', '')
    if ($nodeVersionNum -ge [version]"18.0.0") {
        Write-Status "Node.js" $true "Version: $nodeVersion"
    } else {
        Write-Status "Node.js" $false "Version $nodeVersion is too old. Need 18.0.0+"
    }
} else {
    Write-Status "Node.js" $false "Not installed. Download from https://nodejs.org"
}

# 2. Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Status "npm" $true "Version: $npmVersion"
} else {
    Write-Status "npm" $false "Not installed. Comes with Node.js"
}

# 3. Check Java
Write-Host "Checking Java..." -ForegroundColor Yellow
if (Test-Command "java") {
    $javaVersion = java -version 2>&1 | Select-String "version" | Select-Object -First 1
    if ($javaVersion -match '(11|17|18|19|20|21)') {
        Write-Status "Java" $true "Version: $javaVersion"
    } else {
        Write-Status "Java" $false "Version issue: $javaVersion. Need JDK 11+"
    }
} else {
    Write-Status "Java" $false "Not found. Install via Android Studio"
}

# 4. Check ANDROID_HOME
Write-Host "Checking Android SDK..." -ForegroundColor Yellow
$androidHome = $env:ANDROID_HOME
if (-not [string]::IsNullOrEmpty($androidHome)) {
    if (Test-Path $androidHome) {
        Write-Status "ANDROID_HOME" $true "Path: $androidHome"
        
        # Check for key SDK components
        $platformTools = Join-Path $androidHome "platform-tools"
        $buildTools = Join-Path $androidHome "build-tools"
        
        if (Test-Path $platformTools) {
            Write-Host "    [✓] platform-tools found" -ForegroundColor Green
        } else {
            Write-Host "    [✗] platform-tools missing" -ForegroundColor Red
            $warnings += "platform-tools not found. Install via SDK Manager"
        }
        
        if (Test-Path $buildTools) {
            $buildVersions = Get-ChildItem $buildTools -Directory | Select-Object -ExpandProperty Name
            Write-Host "    [✓] build-tools: $($buildVersions -join ', ')" -ForegroundColor Green
        } else {
            Write-Host "    [✗] build-tools missing" -ForegroundColor Red
            $warnings += "build-tools not found. Install via SDK Manager"
        }
    } else {
        Write-Status "ANDROID_HOME" $false "Path doesn't exist: $androidHome"
    }
} else {
    Write-Status "ANDROID_HOME" $false "Not set. Set to Android SDK location"
}
Write-Host ""

# 5. Check ADB
Write-Host "Checking ADB..." -ForegroundColor Yellow
if (Test-Command "adb") {
    $adbVersion = adb version 2>&1 | Select-String "Android Debug Bridge" | Select-Object -First 1
    Write-Status "ADB" $true "$adbVersion"
    
    # Check connected devices
    $devices = adb devices 2>&1 | Select-String "device$" | Measure-Object
    if ($devices.Count -gt 0) {
        Write-Host "    [✓] $($devices.Count) device(s) connected" -ForegroundColor Green
    } else {
        Write-Host "    [!] No devices connected" -ForegroundColor Yellow
        $warnings += "No Android devices connected. Connect a device or start an emulator"
    }
} else {
    Write-Status "ADB" $false "Not found. Add platform-tools to PATH"
}

# 6. Check Gradle
Write-Host "Checking Gradle..." -ForegroundColor Yellow
if (Test-Command "gradle") {
    $gradleVersion = gradle --version 2>&1 | Select-String "Gradle" | Select-Object -First 1
    Write-Status "Gradle" $true "$gradleVersion"
} else {
    Write-Host "[!] Gradle" -ForegroundColor Yellow
    Write-Host "    Not in PATH (OK - Android Studio includes it)" -ForegroundColor Gray
    Write-Host ""
}

# 7. Check Capacitor CLI
Write-Host "Checking Capacitor..." -ForegroundColor Yellow
if (Test-Command "npx") {
    try {
        $capVersion = npx cap --version 2>&1
        if ($capVersion -match '\d+\.\d+\.\d+') {
            Write-Status "Capacitor CLI" $true "Version: $capVersion"
        } else {
            Write-Status "Capacitor CLI" $false "Not installed. Run: npm install @capacitor/cli"
        }
    } catch {
        Write-Status "Capacitor CLI" $false "Error checking version"
    }
} else {
    Write-Status "Capacitor CLI" $false "npx not found"
}

# 8. Check Android licenses
Write-Host "Checking Android Licenses..." -ForegroundColor Yellow
if ($androidHome) {
    $sdkManager = Join-Path $androidHome "cmdline-tools\latest\bin\sdkmanager.bat"
    if (-not (Test-Path $sdkManager)) {
        $sdkManager = Join-Path $androidHome "tools\bin\sdkmanager.bat"
    }
    
    if (Test-Path $sdkManager) {
        $licenses = & $sdkManager --licenses 2>&1 | Select-String "accepted"
        if ($licenses) {
            Write-Status "Android Licenses" $true "All licenses accepted"
        } else {
            Write-Status "Android Licenses" $false "Run: sdkmanager --licenses"
        }
    } else {
        Write-Host "[!] Android Licenses" -ForegroundColor Yellow
        Write-Host "    Cannot verify - sdkmanager not found" -ForegroundColor Gray
        Write-Host ""
    }
}

# Summary
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

if ($errors.Count -eq 0) {
    Write-Host "✅ Environment is ready for Android development!" -ForegroundColor Green
} else {
    Write-Host "❌ Found $($errors.Count) error(s):" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "   - $error" -ForegroundColor Red
    }
}

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️ Warnings ($($warnings.Count)):" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "   - $warning" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
if ($errors.Count -gt 0) {
    Write-Host "1. Fix the errors listed above" -ForegroundColor White
    Write-Host "2. Re-run this script to verify" -ForegroundColor White
} else {
    Write-Host "1. Navigate to your project directory" -ForegroundColor White
    Write-Host "2. Run: npm install @capacitor/core @capacitor/android @capacitor/cli" -ForegroundColor White
    Write-Host "3. Run: npx cap init" -ForegroundColor White
    Write-Host "4. Run: npx cap add android" -ForegroundColor White
}

# Exit with error code if issues found
if ($errors.Count -gt 0) {
    exit 1
} else {
    exit 0
}
