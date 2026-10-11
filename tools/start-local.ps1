[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot "backend"
$frontendRoot = Join-Path $projectRoot "frontend"

$nodeCommand = Get-Command "node.exe" -ErrorAction SilentlyContinue
$npmCommand = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
if (-not $nodeCommand -or -not $npmCommand) {
  throw "Node.js belum tersedia. Instal Node.js LTS, lalu buka ulang PowerShell."
}

function Test-ListeningPort([int]$Port) {
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Get-ContainerEnvValue([string[]]$Environment, [string]$Name) {
  $entry = $Environment | Where-Object { $_ -like "${Name}=*" } | Select-Object -First 1
  if (-not $entry) { return "" }
  return ([string]$entry).Substring($Name.Length + 1).Trim()
}

Write-Host "Menyalakan SABABUKA lokal..." -ForegroundColor Cyan

$dockerCommand = Get-Command "docker.exe" -ErrorAction SilentlyContinue
if (-not $dockerCommand) {
  throw "Docker Desktop belum terpasang atau docker.exe tidak ditemukan."
}

$previousErrorPreference = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
docker.exe info *> $null
$dockerInfoExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorPreference
if ($dockerInfoExitCode -ne 0) {
  throw "Docker Desktop belum berjalan. Buka Docker Desktop, tunggu sampai siap, lalu jalankan kembali skrip ini."
}

$ErrorActionPreference = "SilentlyContinue"
$containerStatus = docker.exe inspect -f "{{.State.Status}}" sababuka-local-db 2>$null
$dockerInspectExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorPreference
if ($dockerInspectExitCode -ne 0) {
  throw "Database lokal 'sababuka-local-db' belum tersedia. Container database perlu disiapkan satu kali terlebih dahulu."
}
if ($containerStatus.Trim() -ne "running") {
  docker.exe start sababuka-local-db | Out-Null
}

$dbEnv = docker.exe inspect -f "{{range .Config.Env}}{{println .}}{{end}}" sababuka-local-db
$dbUser = Get-ContainerEnvValue $dbEnv "POSTGRES_USER"
$dbPass = Get-ContainerEnvValue $dbEnv "POSTGRES_PASSWORD"
$dbName = Get-ContainerEnvValue $dbEnv "POSTGRES_DB"
if (-not $dbUser) { $dbUser = "postgres" }
if (-not $dbName) { $dbName = "postgres" }

$env:DATABASE_URL = if ($dbPass) {
  "postgresql://${dbUser}:${dbPass}@127.0.0.1:55432/${dbName}"
} else {
  "postgresql://${dbUser}@127.0.0.1:55432/${dbName}"
}
$env:NODE_ENV = "development"
$env:HOST = "127.0.0.1"
$env:PORT = "3001"
$env:COOKIE_SECURE = "false"
$env:LOG_LEVEL = "info"
$env:MFA_ENCRYPTION_KEY = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
$connectorKeyPath = Join-Path $backendRoot "tmp\connector-encryption-key"
if (Test-Path $connectorKeyPath) {
  $env:CONNECTOR_ENCRYPTION_KEY = (Get-Content $connectorKeyPath -Raw).Trim()
} else {
  $env:CONNECTOR_ENCRYPTION_KEY = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
  New-Item -ItemType Directory -Force -Path (Split-Path $connectorKeyPath) | Out-Null
  [IO.File]::WriteAllText($connectorKeyPath, $env:CONNECTOR_ENCRYPTION_KEY)
}
$evidencePath = Join-Path $backendRoot "tmp\evidence"
New-Item -ItemType Directory -Force -Path $evidencePath | Out-Null
$env:EVIDENCE_STORAGE_PATH = $evidencePath

if (-not (Test-ListeningPort 3001)) {
  Start-Process -FilePath $nodeCommand.Source `
    -ArgumentList "node_modules/tsx/dist/cli.mjs", "src/server.ts" `
    -WorkingDirectory $backendRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $backendRoot "tmp\backend.stdout.log") `
    -RedirectStandardError (Join-Path $backendRoot "tmp\backend.stderr.log")
}

if (-not (Test-ListeningPort 5173)) {
  Start-Process -FilePath $npmCommand.Source `
    -ArgumentList "run", "dev" `
    -WorkingDirectory $frontendRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $frontendRoot "frontend.stdout.log") `
    -RedirectStandardError (Join-Path $frontendRoot "frontend.stderr.log")
}

$deadline = (Get-Date).AddSeconds(90)
do {
  Start-Sleep -Seconds 1
  $ready = (Test-ListeningPort 3001) -and (Test-ListeningPort 5173)
} until ($ready -or (Get-Date) -ge $deadline)

if (-not $ready) {
  throw "Aplikasi belum siap. Periksa backend/tmp/backend.stderr.log dan frontend/frontend.stderr.log."
}

$health = Invoke-RestMethod -Uri "http://127.0.0.1:3001/api/v1/health" -Method Get
if ($health.status -ne "ok") { throw "Health check backend gagal." }

Write-Host ""
Write-Host "SABABUKA lokal siap." -ForegroundColor Green
Write-Host "Buka: http://127.0.0.1:5173/login"
Write-Host "Login Developer: developer@sababuka.com"
Write-Host "Script ini tidak menjalankan migrasi, seed, atau mengubah data."
