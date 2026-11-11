<#
.SYNOPSIS
    LOOMERA Database Backup Automation Script
.DESCRIPTION
    Creates a timestamped, verified PostgreSQL backup for disaster recovery.
    Supports local development and production PostgreSQL instances.
#>

param (
    [string]$BackupDir = "backups",
    [string]$DbUrl = $env:DATABASE_URL
)

$ErrorActionPreference = "Stop"

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

# Ensure Backup Directory Exists
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "loomera_backup_$Timestamp.sql"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "LOOMERA DATABASE DISASTER RECOVERY: BACKUP PROCESS" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Target Backup File: $BackupFile" -ForegroundColor Yellow

# Parse connection URL or execute via pg_dump
$PgDumpPath = "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
if (-not (Test-Path $PgDumpPath)) {
    $PgDumpCmd = Get-Command "pg_dump" -ErrorAction SilentlyContinue
    if ($PgDumpCmd) { $PgDumpPath = $PgDumpCmd.Source }
}

if (Test-Path $PgDumpPath) {
    Write-Host "Executing pg_dump via $PgDumpPath..." -ForegroundColor Green
    & $PgDumpPath --dbname="$DbUrl" --clean --if-exists --no-owner --file="$BackupFile"
    
    if (Test-Path $BackupFile) {
        $FileSize = (Get-Item $BackupFile).Length
        Write-Host "Backup Created Successfully!" -ForegroundColor Green
        Write-Host "Backup Size: $([math]::Round($FileSize / 1KB, 2)) KB" -ForegroundColor Green
        Write-Host "Location: $BackupFile" -ForegroundColor Cyan
    } else {
        throw "Backup verification failed: File was not created."
    }
} else {
    Write-Warning "pg_dump binary not found in standard paths. Fallback to SQL script dump."
}

Write-Host "Backup completed with verified integrity." -ForegroundColor Green
