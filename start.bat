@echo off
setlocal EnableDelayedExpansion
title ClaimIT - Hospital IT Claim System
color 0A

echo.
echo  ==========================================
echo    ClaimIT - Hospital IT Claim System
echo    Warranty ^& RMA Management Portal
echo  ==========================================
echo.

REM ── Step 1: Check if Node.js is installed ──────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Node.js not found. Downloading and installing automatically...
    echo     This may take a few minutes. Please wait.
    echo.

    REM Download Node.js LTS installer using PowerShell
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.17.0/node-v20.17.0-x64.msi' -OutFile '%TEMP%\node_installer.msi' -UseBasicParsing"

    if not exist "%TEMP%\node_installer.msi" (
        echo [ERROR] Failed to download Node.js. Please install it manually from:
        echo         https://nodejs.org/
        pause
        exit /b 1
    )

    echo [*] Installing Node.js silently...
    msiexec /i "%TEMP%\node_installer.msi" /qn /norestart
    del "%TEMP%\node_installer.msi" >nul 2>&1

    REM Refresh PATH so node is available in this session
    for /f "usebackq tokens=2*" %%A in (`reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path`) do set "SYS_PATH=%%B"
    for /f "usebackq tokens=2*" %%A in (`reg query "HKCU\Environment" /v Path 2^>nul`) do set "USR_PATH=%%B"
    set "PATH=%SYS_PATH%;%USR_PATH%"

    where node >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Node.js installation failed. Please restart your computer and try again.
        echo         Or install manually from: https://nodejs.org/
        pause
        exit /b 1
    )
    echo [OK] Node.js installed successfully!
    echo.
) else (
    for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
    echo [OK] Node.js %NODE_VER% is already installed.
)

REM ── Step 2: Load .env configuration ────────────────────────────────────────
if exist .env (
    echo [*] Loading environment configuration from .env...
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        set "line=%%A"
        if not "!line:~0,1!"=="#" if not "%%A"=="" (
            set "%%A=%%B"
        )
    )
) else (
    echo [!] No .env file found. Copying from .env.example...
    if exist .env.example (
        copy .env.example .env >nul
        echo [OK] .env created from template. Edit it if needed.
    ) else (
        echo [WARN] No .env.example found either. Using built-in defaults.
    )
)

REM ── Step 3: Install npm dependencies ───────────────────────────────────────
echo.
echo [*] Installing/updating dependencies (express, sqlite3, etc.)...
call npm install --silent 2>nul
if %errorlevel% neq 0 (
    echo [!] npm install had warnings but continuing...
)
echo [OK] Dependencies ready.

REM ── Step 4: Set defaults and launch ────────────────────────────────────────
if not defined PORT set PORT=8847
if not defined SECRET_PORTAL_PATH set SECRET_PORTAL_PATH=pinky

echo.
echo  ==========================================
echo    Server starting on port %PORT%
echo    Opening browser to:
echo    http://localhost:%PORT%/%SECRET_PORTAL_PATH%
echo  ==========================================
echo.

REM Wait a moment for server to start before opening browser
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:%PORT%/%SECRET_PORTAL_PATH%"

REM Start the Node.js server
node server.js

echo.
echo [!] Server has stopped.
pause
