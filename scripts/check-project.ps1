$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$workspaceRoot = Split-Path -Parent $root
$personalSiteRoot = Join-Path $workspaceRoot "My"
$archivePath = Join-Path $root "frontend/public/downloads/sanpingfang-miniprogram-source.zip"
$personalArchivePath = Join-Path $personalSiteRoot "tools/pp-tools/downloads/sanpingfang-miniprogram-source.zip"
$required = @(
  "README.md",
  ".gitignore",
  ".env.example",
  "start-pp-tools.cmd",
  "scripts/start-local.ps1",
  "scripts/backup-data.ps1",
  "scripts/backup_database.py",
  "scripts/build_miniprogram_package.py",
  "scripts/sync_personal_site_embed.mjs",
  "frontend/vite.embed.config.js",
  "frontend/dist-embed/pp-tools-embed.js",
  "frontend/dist-embed/pp-tools-embed.css",
  "docs/superpowers/specs/2026-07-10-pp-tools-complete-suite-design.md",
  "docs/superpowers/specs/2026-07-11-miniprogram-download-package-design.md",
  "docs/superpowers/plans/2026-07-11-miniprogram-download-package.md",
  "frontend/public/downloads/sanpingfang-miniprogram-source.zip",
  "docs/superpowers/plans/2026-07-11-local-production-runtime.md",
  "scripts/check_delta_companion.ps1",
  "companion/delta_companion/app.py",
  "companion/delta_companion/security.py",
  "companion/delta_companion/migration.py",
  "companion/dist/Delta-Companion.exe",
  "companion/dist/delta-companion-version.json",
  "frontend/src/api/deltaCompanionClient.js",
  "frontend/src/tools/delta-force/DeltaCalibrationPage.jsx"
)

$missing = @()
foreach ($item in $required) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $item))) {
    $missing += $item
  }
}
if (-not (Test-Path -LiteralPath $personalArchivePath)) {
  $missing += "My/tools/pp-tools/downloads/sanpingfang-miniprogram-source.zip"
}

Push-Location $root
try {
  $trackedLocalFiles = @(git ls-files -- ".env" "backend/data/*.db" "backend/data/*.sqlite" "backend/data/uploads/*" "backend/data/backups/*")
} finally {
  Pop-Location
}

if ($missing.Count -gt 0) {
  Write-Output "Project check failed. Missing files:"
  $missing | ForEach-Object { Write-Output "- $_" }
  exit 1
}

if ($trackedLocalFiles.Count -gt 0) {
  Write-Output "Project check failed. Local-only files are tracked by Git:"
  $trackedLocalFiles | ForEach-Object { Write-Output "- $_" }
  exit 1
}

$homePageContent = Get-Content -Raw -Encoding utf8 (Join-Path $root "frontend/src/pages/HomePage.jsx")
$personalContent = Get-Content -Raw -Encoding utf8 (Join-Path $personalSiteRoot "js/content.js")
if (-not $homePageContent.Contains('/downloads/sanpingfang-miniprogram-source.zip')) {
  Write-Output "Project check failed. PP Tools download link is incorrect."
  exit 1
}
if (-not $personalContent.Contains('"download": "downloads/sanpingfang-miniprogram-source.zip"')) {
  Write-Output "Project check failed. Personal-site download link is incorrect."
  exit 1
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
  $archiveEntries = @($archive.Entries | ForEach-Object { $_.FullName })
} finally {
  $archive.Dispose()
}

$requiredArchiveEntries = @("app.js", "app.json", "project.config.json", "README.md")
$missingArchiveEntries = @($requiredArchiveEntries | Where-Object { $_ -notin $archiveEntries })
$privateArchiveEntries = @($archiveEntries | Where-Object {
  $_ -eq "project.private.config.json" -or $_ -like ".git/*"
})
if ($missingArchiveEntries.Count -gt 0 -or $privateArchiveEntries.Count -gt 0) {
  Write-Output "Project check failed. Package structure or sanitization is incorrect."
  exit 1
}

$archiveHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash
$personalArchiveHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $personalArchivePath).Hash
if ($archiveHash -ne $personalArchiveHash) {
  Write-Output "Project check failed. Website package checksums do not match."
  exit 1
}

Write-Output "Project check passed. Package SHA-256: $archiveHash"
& (Join-Path $root "scripts/check_delta_companion.ps1")
