Param()
$ErrorActionPreference = 'Stop'

# Fetch all
git fetch origin --prune | Out-Host

# Timestamped backup name
$ts = Get-Date -Format 'yyyyMMdd_HHmmss'
$backup = "main-bkp-$ts"

# Try to fetch origin/main into a local temp ref
$hasMain = $true
try {
  git fetch origin main:refs/heads/$backup 2>$null | Out-Null
} catch {
  $hasMain = $false
}

if ($hasMain) {
  Write-Host "Backup created: $backup"
  git push origin $backup | Out-Host
} else {
  Write-Host 'No origin/main to backup'
}

# Ensure gt5 exists and make main point to it
git checkout gt5 | Out-Host
git branch -f main gt5 | Out-Host
# Force update remote main
git push origin main --force | Out-Host
