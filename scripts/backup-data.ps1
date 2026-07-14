$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root "backend\.venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $python)) {
  throw "后端环境不存在，请先完成 README 中的首次配置。"
}

& $python (Join-Path $PSScriptRoot "backup_database.py")
if ($LASTEXITCODE -ne 0) {
  throw "数据库备份失败。"
}
