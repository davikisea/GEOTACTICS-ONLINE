# Script de instalacion automatica de Geotactics Online
$ErrorActionPreference = "Continue"
$TargetDir = "C:\Users\morin\GEOTACTICS"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "     INSTALADOR AUTOMATICO DE GEOTACTICS ONLINE EN WINDOWS           " -ForegroundColor Cyan
Write-Host "               Destino: $TargetDir                                  " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

# 1. Clonar si no existe
if (-not (Test-Path $TargetDir)) {
    Write-Host "[*] Clonando repositorio en $TargetDir..." -ForegroundColor Yellow
    git clone https://github.com/davikisea/GEOTACTICS-ONLINE.git $TargetDir
} else {
    Write-Host "[*] Directorio existente detectado en $TargetDir." -ForegroundColor Green
}

Set-Location $TargetDir

# 2. Configurar .env.local con las claves oficiales de Supabase
Write-Host "[*] Configurando .env.local con las claves del proyecto..." -ForegroundColor Yellow
$envContent = @"
# ==============================================================================
# TACTICAL COMMAND: WARS OF LEGACY - LOCAL ENVIRONMENT VARIABLES (.env.local)
# ==============================================================================

# --- Entorno Local ---
VITE_APP_ENV="development"
VITE_APP_URL="http://localhost:3000"
VITE_VERCEL_ENV="development"
VITE_APP_VERSION="1.0.0"

# --- Supabase Database & Realtime (Client Side) ---
VITE_SUPABASE_URL="https://njdzibskfaocpclrnbul.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZHppYnNrZmFvY3BjbHJuYnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0OTcyODEsImV4cCI6MjEwOTA3MzI4MX0.lfDuoHYaok1WEuACi7kEQrRT6f3TeHeErwCkFpdeuyc"

# --- Performance & Asset Optimization ---
VITE_ENABLE_PERF_MONITOR="true"
VITE_ASSET_CDN_URL=""
VITE_AUDIO_ENABLED="true"
VITE_ENABLE_ANALYTICS="false"

# --- AI Studio / Gemini Integration ---
GEMINI_API_KEY=""
APP_URL="http://localhost:3000"
"@

Set-Content -Path ".env.local" -Value $envContent -Encoding UTF8
Write-Host "[OK] .env.local generado con exito con claves de Supabase." -ForegroundColor Green

# 3. Instalacion de dependencias
Write-Host "[*] Instalando dependencias mediante npm..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Reintentando instalacion con --legacy-peer-deps..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
}

# 4. Lanzar servidor
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "      INSTALACION COMPLETADA CON EXITO - ARRANCANDO SERVIDOR         " -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green

Start-Process "http://localhost:3000"
npm run dev
