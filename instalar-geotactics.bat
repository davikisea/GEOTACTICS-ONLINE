@echo off
setlocal enabledelayedexpansion
title Instalador Automatico - GEOTACTICS ONLINE
color 0A

echo =====================================================================
echo       INSTALADOR AUTOMATICO DE GEOTACTICS ONLINE EN WINDOWS
echo                 Destino: C:\Users\morin\GEOTACTICS
echo =====================================================================
echo.

set "TARGET_DIR=C:\Users\morin\GEOTACTICS"

if not exist "%TARGET_DIR%" (
    echo [*] Creando directorio y clonando repositorio...
    git clone https://github.com/davikisea/GEOTACTICS-ONLINE.git "%TARGET_DIR%"
    if errorlevel 1 (
        echo [ERROR] Fallo al clonar con git. Verifica que Git este instalado.
        pause
        exit /b 1
    )
) else (
    echo [*] Directorio existente detectado en %TARGET_DIR%.
)

cd /d "%TARGET_DIR%"

echo [*] Configurando variables de entorno oficiales (.env.local)...
(
echo # ==============================================================================
echo # TACTICAL COMMAND: WARS OF LEGACY - LOCAL ENVIRONMENT VARIABLES
echo # ==============================================================================
echo VITE_APP_ENV="development"
echo VITE_APP_URL="http://localhost:3000"
echo VITE_VERCEL_ENV="development"
echo VITE_APP_VERSION="1.0.0"
echo.
echo # --- Supabase Database ^^& Realtime ---
echo VITE_SUPABASE_URL="https://njdzibskfaocpclrnbul.supabase.co"
echo VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZHppYnNrZmFvY3BjbHJuYnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0OTcyODEsImV4cCI6MjEwOTA3MzI4MX0.lfDuoHYaok1WEuACi7kEQrRT6f3TeHeErwCkFpdeuyc"
echo.
echo # --- Performance ^^& Audio ---
echo VITE_ENABLE_PERF_MONITOR="true"
echo VITE_ASSET_CDN_URL=""
echo VITE_AUDIO_ENABLED="true"
echo VITE_ENABLE_ANALYTICS="false"
echo.
echo # --- Gemini AI Integration ---
echo GEMINI_API_KEY=""
echo APP_URL="http://localhost:3000"
) > .env.local

echo [*] Archivo .env.local configurado correctamente con credenciales de Supabase.
echo.

echo [*] Instalando paquetes y dependencias (npm install)...
call npm install
if errorlevel 1 (
    echo [AVISO] Reintentando con --legacy-peer-deps...
    call npm install --legacy-peer-deps
)

echo.
echo =====================================================================
echo       INSTALACION COMPLETADA CON EXITO
echo =====================================================================
echo.
echo Abriendo aplicacion en el navegador y arrancando servidor local...
start http://localhost:3000
npm run dev

pause
