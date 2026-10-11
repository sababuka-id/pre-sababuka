[CmdletBinding()]
param(
  [switch]$ResetDemoUsers
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot "backend"
$frontendRoot = Join-Path $projectRoot "frontend"

function Test-ListeningPort([int]$Port) {
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Get-ContainerEnvValue([string[]]$Environment, [string]$Name) {
  $entry = $Environment | Where-Object { $_ -like "${Name}=*" } | Select-Object -First 1
  if (-not $entry) { return "" }
  return ([string]$entry).Substring($Name.Length + 1).Trim()
}

Write-Host "Menyiapkan SABABUKA lokal..." -ForegroundColor Cyan

$container = wsl -d Ubuntu -- docker inspect -f "{{.State.Status}}" sababuka-local-db 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "Container sababuka-local-db tidak ditemukan. Nyalakan Docker/WSL dan container database lebih dahulu."
}
if ($container.Trim() -ne "running") {
  wsl -d Ubuntu -- docker start sababuka-local-db | Out-Null
}

$dbEnv = wsl -d Ubuntu -- docker inspect -f "{{range .Config.Env}}{{println .}}{{end}}" sababuka-local-db
$dbUser = Get-ContainerEnvValue $dbEnv "POSTGRES_USER"
$dbPass = Get-ContainerEnvValue $dbEnv "POSTGRES_PASSWORD"
$dbName = Get-ContainerEnvValue $dbEnv "POSTGRES_DB"
if (-not $dbUser) { $dbUser = "postgres" }
if (-not $dbName) { $dbName = "postgres" }

if ($dbPass) {
  $env:DATABASE_URL = "postgresql://${dbUser}:${dbPass}@127.0.0.1:55432/${dbName}"
} else {
  $env:DATABASE_URL = "postgresql://${dbUser}@127.0.0.1:55432/${dbName}"
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
  Set-Content -Path $connectorKeyPath -Value $env:CONNECTOR_ENCRYPTION_KEY -NoNewline
}
$env:EVIDENCE_STORAGE_PATH = Join-Path $backendRoot "tmp\evidence"

Push-Location $backendRoot
try {
  pnpm db:migrate
  if ($LASTEXITCODE -ne 0) { throw "Migration gagal." }
  if ($ResetDemoUsers) {
    $securePassword = Read-Host "Masukkan password akun demo (minimal 16 karakter)" -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    try {
      $demoPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    } finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    if ($demoPassword.Length -lt 16) { throw "Password demo minimal 16 karakter." }
    $env:DEMO_PASSWORD = $demoPassword
    pnpm dev:seed-users
    if ($LASTEXITCODE -ne 0) { throw "Seed akun demo gagal." }
  }
  pnpm dev:seed-official
  if ($LASTEXITCODE -ne 0) { throw "Seed data resmi gagal." }
  pnpm build
  if ($LASTEXITCODE -ne 0) { throw "Build backend gagal." }

  if (-not (Test-ListeningPort 3001)) {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "pnpm start" -WorkingDirectory $backendRoot -WindowStyle Hidden | Out-Null
  }
} finally {
  Pop-Location
}

Push-Location $frontendRoot
try {
  pnpm build
  if ($LASTEXITCODE -ne 0) { throw "Build frontend gagal." }
  if (-not (Test-ListeningPort 5173)) {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "pnpm dev" -WorkingDirectory $frontendRoot -WindowStyle Hidden | Out-Null
  }
} finally {
  Pop-Location
}

$deadline = (Get-Date).AddSeconds(45)
do {
  Start-Sleep -Seconds 2
  $ready = (Test-ListeningPort 3001) -and (Test-ListeningPort 5173)
} until ($ready -or (Get-Date) -ge $deadline)
if (-not $ready) { throw "Aplikasi belum siap setelah 45 detik. Periksa proses Node.js dan Docker." }

$health = Invoke-RestMethod -Uri "http://127.0.0.1:3001/api/v1/health" -Method Get
if ($health.status -ne "ok") { throw "Health check backend tidak mengembalikan status ok." }

Write-Host ""
Write-Host "SABABUKA lokal siap." -ForegroundColor Green
Write-Host "Buka: http://127.0.0.1:5173/"
$lanAddress = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
  Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up" } |
  ForEach-Object { $_.IPv4Address.IPAddress } |
  Select-Object -First 1
if ($lanAddress) {
  Write-Host "Buka dari laptop lain: http://${lanAddress}:5173/" -ForegroundColor Cyan
  Write-Host "Pastikan kedua laptop memakai jaringan Wi-Fi yang sama."
}
Write-Host "Akun Developer/Superadmin: developer@sababuka.com"
Write-Host "Akun BAPPERIDA: bapperida@sababuka.com"
  Write-Host "Akun Walidata Diskominfosantik: kominfo@sababuka.com"
Write-Host "Akun OPD DKPP: opd.dkpp@sababuka.com"
Write-Host "Akun Pimpinan: pimpinan@sababuka.com"
if ($ResetDemoUsers) {
  Write-Host "Password akun demo sudah diatur ulang."
} else {
  Write-Host "Password akun demo tidak diubah saat restart."
}

