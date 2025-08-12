Param(
  [string]$Owner = 'joi2025',
  [string]$Repo = 'llm-audio-app',
  [string[]]$Branches = @('main','gt5')
)
$ErrorActionPreference = 'Stop'

$token = $Env:GITHUB_TOKEN
if (-not $token -or $token.Trim().Length -eq 0) {
  throw 'GITHUB_TOKEN environment variable is not set. Create a PAT with repo scope and set $Env:GITHUB_TOKEN before running.'
}

$headers = @{
  'Authorization' = "Bearer $token"
  'Accept'        = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
}

$body = @{ 
  required_status_checks = $null
  enforce_admins = $true
  required_pull_request_reviews = @{ 
    dismiss_stale_reviews = $true
    require_code_owner_reviews = $false
    required_approving_review_count = 1
  }
  restrictions = $null
  allow_force_pushes = $false
  allow_deletions = $false
  required_linear_history = $true
  required_conversation_resolution = $true
  block_creations = $false
}

foreach ($b in $Branches) {
  Write-Host "Protecting $Owner/$Repo branch $b ..."
  $url = "https://api.github.com/repos/$Owner/$Repo/branches/$b/protection"
  Invoke-RestMethod -Method Put -Uri $url -Headers $headers -Body ($body | ConvertTo-Json -Depth 5) | Out-Host
}

Write-Host 'Branch protection applied.'
