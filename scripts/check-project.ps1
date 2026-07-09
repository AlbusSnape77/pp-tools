$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$required = @(
  "README.md",
  ".gitignore",
  ".env.example",
  "docs/superpowers/specs/2026-07-09-pp-tools-online-suite-design.md",
  "docs/superpowers/plans/2026-07-09-pp-tools-online-suite.md"
)

$missing = @()
foreach ($item in $required) {
  $path = Join-Path $root $item
  if (-not (Test-Path -Path $path)) {
    $missing += $item
  }
}

$blockedPaths = @(
  ".env",
  "backend/data/app.db",
  "backend/data/uploads"
)

$presentBlocked = @()
foreach ($item in $blockedPaths) {
  $path = Join-Path $root $item
  if (Test-Path -Path $path) {
    $presentBlocked += $item
  }
}

if ($missing.Count -gt 0) {
  Write-Output "Project check failed. Missing files:"
  $missing | ForEach-Object { Write-Output "- $_" }
  exit 1
}

if ($presentBlocked.Count -gt 0) {
  Write-Output "Project check failed. Local-only files are present:"
  $presentBlocked | ForEach-Object { Write-Output "- $_" }
  exit 1
}

Write-Output "Project check passed."
