Param()
$ErrorActionPreference = 'Stop'

function Ensure-GH {
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host 'Installing GitHub CLI (gh) via winget...'
    winget install --id GitHub.cli -e --source winget
  }
}

Ensure-GH

# Ensure auth
$authOk = $true
try { gh auth status | Out-Host } catch { $authOk = $false }
if (-not $authOk) {
  Write-Host 'Authenticating with GitHub CLI...'
  gh auth login --hostname github.com --web
}

# Protection payload
$json = @'
{
  "required_status_checks": null,
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true,
  "required_conversation_resolution": true,
  "block_creations": false
}
'@

$tmp = New-TemporaryFile
Set-Content -Path $tmp -Value $json -Encoding UTF8

$owner = 'joi2025'
$repo = 'llm-audio-app'
$branches = @('main','gt5')

foreach ($b in $branches) {
  Write-Host "Protecting branch $b ..."
  gh api -X PUT "repos/$owner/$repo/branches/$b/protection" -H "Accept: application/vnd.github+json" --input $tmp | Out-Host
}

Remove-Item $tmp -ErrorAction SilentlyContinue
Write-Host 'Done applying branch protection.'
