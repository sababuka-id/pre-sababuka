[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot "backend"
$frontendRoot = Join-Path $projectRoot "frontend"

function Test-ListeningPort([int]$Port) {
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

Write-Host "Menyiapkan demo SABABUKA..." -ForegroundColor Cyan

$container = wsl -d Ubuntu -- docker inspect -f "{{.State.Status}}" sababuka-local-db 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "Container sababuka-local-db tidak ditemukan. Nyalakan Docker/WSL dan container database lebih dahulu."
}
if ($container.Trim() -ne "running") {
  wsl -d Ubuntu -- docker start sababuka-local-db | Out-Null
}

$dbEnv = wsl -d Ubuntu -- docker inspect -f "{{range .Config.Env}}{{println .}}{{end}}" sababuka-local-db
$dbUser = (($dbEnv | Select-String "^POSTGRES_USER=") -replace "^POSTGRES_USER=", "").Trim()
$dbPass = (($dbEnv | Select-String "^POSTGRES_PASSWORD=") -replace "^POSTGRES_PASSWORD=", "").Trim()
$dbName = (($dbEnv | Select-String "^POSTGRES_DB=") -replace "^POSTGRES_DB=", "").Trim()
if (-not $dbUser) { $dbUser = "postgres" }
if (-not $dbName) { $dbName = "postgres" }

$securePassword = Read-Host "Masukkan password akun demo (minimal 16 karakter)" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $demoPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
if ($demoPassword.Length -lt 16) { throw "Password demo minimal 16 karakter." }

$env:DATABASE_URL = "postgresql://${dbUser}:${dbPass}@127.0.0.1:55432/${dbName}"
$env:NODE_ENV = "development"
$env:DEMO_PASSWORD = $demoPassword
$env:HOST = "127.0.0.1"
$env:PORT = "3001"
$env:COOKIE_SECURE = "false"
$env:LOG_LEVEL = "info"
$env:MFA_ENCRYPTION_KEY = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
$env:EVIDENCE_STORAGE_PATH = Join-Path $backendRoot "tmp\evidence"

Push-Location $backendRoot
try {
  pnpm db:migrate
  if ($LASTEXITCODE -ne 0) { throw "Migration gagal." }
  pnpm dev:seed-users
  if ($LASTEXITCODE -ne 0) { throw "Seed akun demo gagal." }
  pnpm dev:seed-content
  if ($LASTEXITCODE -ne 0) { throw "Seed konten demo gagal." }
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
Write-Host "Demo SABABUKA siap." -ForegroundColor Green
Write-Host "Buka: http://127.0.0.1:5173/"
$lanAddress = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
  Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up" } |
  ForEach-Object { $_.IPv4Address.IPAddress } |
  Select-Object -First 1
if ($lanAddress) {
  Write-Host "Buka dari laptop lain: http://${lanAddress}:5173/" -ForegroundColor Cyan
  Write-Host "Pastikan kedua laptop memakai jaringan Wi-Fi yang sama."
}
Write-Host "Akun Pimpinan: pimpinan@sababuka.local"
Write-Host "Akun BAPPERIDA: bapperida@sababuka.local"
Write-Host "Gunakan password demo yang baru dimasukkan."

