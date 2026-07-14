$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$workspaceRoot = Split-Path -Parent $root
$siteRoot = Join-Path $workspaceRoot "My"
$exe = Join-Path $root "companion/dist/Delta-Companion.exe"
$siteExe = Join-Path $siteRoot "tools/pp-tools/downloads/Delta-Companion.exe"
$manifestPath = Join-Path $root "companion/dist/delta-companion-version.json"
$siteManifestPath = Join-Path $siteRoot "tools/pp-tools/downloads/delta-companion-version.json"

$required = @(
  "companion/delta_companion/app.py",
  "companion/delta_companion/security.py",
  "companion/delta_companion/migration.py",
  "companion/dist/Delta-Companion.exe",
  "companion/dist/delta-companion-version.json",
  "frontend/src/api/deltaCompanionClient.js",
  "frontend/src/tools/delta-force/DeltaCalibrationPage.jsx"
)
$missing = @($required | Where-Object { -not (Test-Path -LiteralPath (Join-Path $root $_)) })
if (-not (Test-Path -LiteralPath $siteExe)) { $missing += "My/tools/pp-tools/downloads/Delta-Companion.exe" }
if (-not (Test-Path -LiteralPath $siteManifestPath)) { $missing += "My/tools/pp-tools/downloads/delta-companion-version.json" }
if ($missing.Count -gt 0) {
  throw "Delta Companion check failed. Missing: $($missing -join ', ')"
}

$exeHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $exe).Hash.ToLowerInvariant()
$siteExeHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $siteExe).Hash.ToLowerInvariant()
if ($exeHash -ne $siteExeHash) { throw "Delta Companion executable hashes do not match." }

$manifest = Get-Content -Raw -Encoding UTF8 $manifestPath | ConvertFrom-Json
$siteManifest = Get-Content -Raw -Encoding UTF8 $siteManifestPath | ConvertFrom-Json
if ($manifest.sha256 -ne $exeHash -or $siteManifest.sha256 -ne $exeHash) {
  throw "Delta Companion manifest hash does not match the executable."
}
$versionLine = Select-String -Path (Join-Path $root "companion/delta_companion/__init__.py") -Pattern '__version__\s*=\s*"([^"]+)"'
$sourceVersion = $versionLine.Matches[0].Groups[1].Value
if ($manifest.version -ne $sourceVersion) { throw "Delta Companion manifest version does not match source." }

$forbiddenReleaseFiles = @(Get-ChildItem -File -Recurse (Join-Path $root "companion/dist") | Where-Object {
  $_.Extension -in @(".db", ".sqlite", ".png", ".jpg", ".jpeg") -or $_.Name -eq "pairings.json"
})
if ($forbiddenReleaseFiles.Count -gt 0) { throw "Private data exists in the release directory." }

$configText = Get-Content -Raw -Encoding UTF8 (Join-Path $root "companion/delta_companion/config.py")
if (-not $configText.Contains('HOST = "127.0.0.1"') -or $configText.Contains('HOST = "0.0.0.0"')) {
  throw "Delta Companion must bind only to the loopback address."
}
$sourceFiles = Get-ChildItem -File -Recurse (Join-Path $root "companion/delta_companion") -Filter "*.py"
$wildcardCors = @($sourceFiles | Select-String -Pattern 'Allow-Origin[^\r\n]*\*|ALLOWED_ORIGINS\s*=\s*\[?\s*["'']\*["'']')
if ($wildcardCors.Count -gt 0) { throw "Wildcard CORS configuration is not allowed." }
$privatePaths = @($sourceFiles | Select-String -SimpleMatch "E:\A Study\Coding")
if ($privatePaths.Count -gt 0) { throw "A local absolute project path exists in Companion source." }

Write-Output "Delta Companion check passed. Version: $sourceVersion"
Write-Output "Executable bytes: $((Get-Item -LiteralPath $exe).Length)"
Write-Output "SHA-256: $exeHash"
