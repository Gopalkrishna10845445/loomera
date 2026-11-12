<#
.SYNOPSIS
    LOOMERA — Supabase Production Database Provisioning & Seed Script
.DESCRIPTION
    Pushes Drizzle ORM 48-table schema to Supabase PostgreSQL, seeds catalog & admin,
    and validates database integrity over TLS encrypted connection.
#>

param (
    [Parameter(Mandatory=$false)]
    [string]$DbPassword
)

$ErrorActionPreference = "Stop"

# If password not passed as parameter, prompt securely
if (-not $DbPassword) {
    $SecurePass = Read-Host "Enter your Supabase database password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePass)
    $DbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

if (-not $DbPassword) {
    Write-Error "Database password cannot be empty."
    exit 1
}

# URL-encode password in case it contains special characters
$EncodedPassword = [System.Uri]::EscapeDataString($DbPassword)
$SupabaseHost = "db.vgqaytnajvyltxyohwtt.supabase.co"
$SupabaseUrl = "postgresql://postgres:${EncodedPassword}@${SupabaseHost}:5432/postgres?sslmode=require"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "LOOMERA PRODUCTION DATABASE PROVISIONING (SUPABASE)" -ForegroundColor Cyan
Write-Host "Target Host: $SupabaseHost (Port 5432, SSL: require)" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# Set environment variable for Drizzle & tsx scripts
$env:DATABASE_URL = $SupabaseUrl
$env:DATABASE_SSL = "true"

Write-Host "`n[1/3] Pushing 48-table Drizzle schema to Supabase..." -ForegroundColor Yellow
npx drizzle-kit push --force

Write-Host "`n[2/3] Seeding catalog (8 products, 103 variants, categories)..." -ForegroundColor Yellow
npx tsx scripts/seed.ts

Write-Host "`n[3/3] Provisioning primary SUPER_ADMIN account..." -ForegroundColor Yellow
npx tsx scripts/seed_admin.ts

Write-Host "`n[VERIFY] Inspecting Supabase catalog integrity..." -ForegroundColor Cyan
npx tsx scripts/inspect_db.ts

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "SUCCESS: Supabase database is fully provisioned and ready!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
