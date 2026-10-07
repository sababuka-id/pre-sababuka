[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ruleName = "SABABUKA Demo LAN (TCP 5173)"

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Jalankan PowerShell sebagai Administrator untuk menambahkan aturan firewall."
}

Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule `
  -DisplayName $ruleName `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort 5173 `
  -Profile Any `
  -RemoteAddress LocalSubnet | Out-Null

Write-Host "Akses SABABUKA pada TCP 5173 diizinkan hanya dari subnet lokal." -ForegroundColor Green
