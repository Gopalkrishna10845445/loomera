<#
.SYNOPSIS
    LOOMERA Database Restore Automation Script
.DESCRIPTION
    Restores a PostgreSQL backup file to recover from disaster or sync environments.
    Includes safeguard prompt to prevent accidental data overwrites.
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$DbUrl = $env:DATABASE_URL,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    throw "Specified backup file does not exist: $BackupFile"
}

# Load DATABASE_URL from .env.local if not set in environment
if (-not $DbUrl -and (Test-Path ".env.local")) {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match "^\s*DATABASE_URL\s*=\s*[`"']?([^`"']+)`"??") {
            $DbUrl = $matches[1]
        }
    }
}

if (-not $DbUrl) {
    $DbUrl = "postgresql://postgres@127.0.0.1:5434/loomera"
}

Write-Host "==========================================================" -ForegroundColor Red
Write-Host "LOOMERA DATABASE DISASTER RECOVERY: RESTORE PROCESS" -ForegroundColor Red
Write-Host "==========================================================" -ForegroundColor Red
Write-Host "Source Backup: $BackupFile" -ForegroundColor Yellow
Write-Host "Target Database: $DbUrl" -ForegroundColor Yellow

if (-not $Force) {
    $Confirmation = Read-Host "CAUTION: This will overwrite tables in the target database. Type 'CONFIRM' to proceed"
    if ($Confirmation -ne "CONFIRM") {
        Write-Warning "Database restoration aborted by operator."
        exit 1
    }
}

$PsqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
if (-not (Test-Path $PsqlPath)) {
    $PsqlCmd = Get-Command "psql" -ErrorAction SilentlyContinue
    if ($PsqlCmd) { $PsqlPath = $PsqlCmd.Source }
}

if (Test-Path $PsqlPath) {
    Write-Host "Executing database restoration..." -ForegroundColor Green
    & $PsqlPath "$DbUrl" -f "$BackupFile"
    Write-Host "Database successfully restored from $BackupFile." -ForegroundColor Green
} else {
    throw "psql executable not found in standard paths."
}
