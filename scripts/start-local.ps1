$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"
$frontend = Join-Path $root "frontend"
$backend = Join-Path $root "backend"
$python = Join-Path $backend ".venv\Scripts\python.exe"
$waitress = Join-Path $backend ".venv\Scripts\waitress-serve.exe"

if (Test-Path -LiteralPath $envFile) {
  foreach ($line in Get-Content -LiteralPath $envFile -Encoding utf8) {
    if ($line -match '^\s*([A-Z_][A-Z0-9_]*)=(.*)$') {
      $name = $Matches[1]
      $value = $Matches[2].Trim()
      if (-not [Environment]::GetEnvironmentVariable($name, "Process")) {
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
      }
    }
  }
}

if (-not $env:ADMIN_PASSWORD -or $env:ADMIN_PASSWORD -eq "change-this-locally") {
  throw "请先在项目根目录的 .env 中设置 ADMIN_PASSWORD。"
}

if (-not $env:SECRET_KEY -or $env:SECRET_KEY -eq "change-this-locally" -or $env:SECRET_KEY.Length -lt 32) {
  throw "请先在项目根目录的 .env 中设置至少 32 位的 SECRET_KEY。"
}

if (-not (Test-Path -LiteralPath $python) -or -not (Test-Path -LiteralPath $waitress)) {
  throw "后端环境未安装完整，请按 README 的首次配置步骤安装 requirements.txt。"
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "没有找到 npm，请先安装 Node.js。"
}

$dbPath = if ($env:DB_PATH) { $env:DB_PATH } else { "backend/data/app.db" }
if (-not [System.IO.Path]::IsPathRooted($dbPath)) {
  $dbPath = Join-Path $root $dbPath
}
$env:DB_PATH = [System.IO.Path]::GetFullPath($dbPath)
$databaseDirectory = Split-Path -Parent $env:DB_PATH
New-Item -ItemType Directory -Path $databaseDirectory -Force | Out-Null

Write-Output "正在构建网页..."
Push-Location $frontend
try {
  & npm run build
  if ($LASTEXITCODE -ne 0) { throw "前端构建失败。" }
} finally {
  Pop-Location
}

Write-Output "正在启动 PP Tools..."
$server = Start-Process -FilePath $waitress -ArgumentList @("--host=127.0.0.1", "--port=5175", "--call", "app:create_app") -WorkingDirectory $backend -WindowStyle Hidden -PassThru

try {
  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
    Start-Sleep -Milliseconds 300
    try {
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:5175/api/health" -TimeoutSec 2
      if ($health.status -eq "ok") {
        $ready = $true
        break
      }
    } catch {
    }
  }

  if (-not $ready) {
    throw "服务未能通过健康检查。"
  }

  Write-Output "服务已启动：http://127.0.0.1:5175"
  Start-Process "http://127.0.0.1:5175"
  Write-Output "保持此窗口打开；按 Ctrl+C 停止服务。"
  Wait-Process -Id $server.Id
} finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }
}
