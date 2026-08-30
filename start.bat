@echo off
setlocal EnableDelayedExpansion
title ClaimIT - Hospital IT Warranty ^& RMA Claim System
color 0A

:: Ensure working directory is the folder where start.bat resides
cd /d "%~dp0"

echo.
echo  =============================================================
echo    🏥 ClaimIT - Hospital IT Warranty ^& RMA Claim System
echo    ระบบติดตามรับประกันและส่งเคลมครุภัณฑ์ไอทีโรงพยาบาล
echo  =============================================================
echo.

:: ── Step 1: Detect / Locate Node.js ──────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    :: Check standard Node.js installation paths on Windows
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    ) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
        set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
    ) else if exist "%LOCALAPPDATA%\Programs\node\node.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"
    ) else if exist "%APPDATA%\npm" (
        set "PATH=%APPDATA%\npm;%PATH%"
    ) else if exist "D:\6801\node.exe" (
        set "PATH=D:\6801;%PATH%"
    )
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ไม่พบ Node.js ในระบบ กำลังเริ่มดาวน์โหลดและติดตั้งอัตโนมัติ...
    echo     กรุณารอสักครู่ (Downloading Node.js installer)...
    echo.

    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.17.0/node-v20.17.0-x64.msi' -OutFile '%TEMP%\node_installer.msi' -UseBasicParsing"

    if not exist "%TEMP%\node_installer.msi" (
        echo.
        echo [ERROR] ไม่สามารถดาวน์โหลด Node.js อัตโนมัติได้
        echo กรุณาดาวน์โหลดและติดตั้งด้วยตนเองจาก: https://nodejs.org/
        echo.
        pause
        exit /b 1
    )

    echo [*] กำลังติดตั้ง Node.js ลงในเครื่อง (Installing silently)...
    msiexec /i "%TEMP%\node_installer.msi" /qn /norestart
    del "%TEMP%\node_installer.msi" >nul 2>&1

    :: Add installed path to current environment
    if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
    if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%APPDATA%\npm;%PATH%"

    where node >nul 2>&1
    if !errorlevel! neq 0 (
        echo.
        echo [ERROR] ติดตั้ง Node.js เรียบร้อยแต่ระบบต้องการการรีสตาร์ท Command Prompt
        echo กรุณาปิดหน้าต่างนี้แล้วเปิดไฟล์ start.bat ใหม่อีกครั้ง
        echo.
        pause
        exit /b 1
    )
    echo [OK] ติดตั้ง Node.js สำเร็จเรียบร้อย!
) else (
    for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
    echo [OK] ตรวจพบ Node.js: !NODE_VER!
)

:: ── Step 2: Environment Configuration ──────────────────────────────
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo [OK] สร้างไฟล์การตั้งค่า .env จากแม่แบบเรียบร้อย
    )
) else (
    echo [OK] โหลดการตั้งค่าระบบ (.env) พร้อมใช้งาน
)

:: Extract PORT from .env if defined (defaults to 8847)
set PORT=8847
if exist .env (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        set "key=%%A"
        if /i "!key!"=="PORT" (
            if not "%%B"=="" set "PORT=%%B"
        )
    )
)

:: ── Step 3: Dependency Check ───────────────────────────────────────
if not exist "node_modules\express" (
    echo.
    echo [*] กำลังติดตั้ง Libraries ที่จำเป็นสำหรับระบบ (npm install)...
    call npm install --no-audit
    if !errorlevel! neq 0 (
        echo.
        echo [ERROR] ไม่สามารถติดตั้ง dependencies ได้ กรุณาตรวจสอบอินเทอร์เน็ต
        echo.
        pause
        exit /b 1
    )
    echo [OK] ติดตั้งแพ็กเกจเสร็จสมบูรณ์
) else (
    echo [OK] แพ็กเกจระบบ (node_modules) พร้อมใช้งาน
)

:: ── Step 4: Ensure Storage Directories Exist ───────────────────────
if not exist "storage\evidence" mkdir "storage\evidence" >nul 2>&1
if not exist "backups" mkdir "backups" >nul 2>&1

:: ── Step 5: Server Launch Banner ───────────────────────────────────
echo.
echo  =============================================================
echo    🚀 กำลังเปิดใช้งานระบบ ClaimIT (Server Starting...)
echo    🌐 หน้าจอระบบ: http://localhost:%PORT%/
echo    🏥 รองรับการเข้าใช้งานผ่านเครือข่ายโรงพยาบาล (Intranet / LAN)
echo    💡 เว็บเบราว์เซอร์จะเปิดขึ้นอัตโนมัติเมื่อระบบพร้อมใช้งาน
echo  =============================================================
echo.

:: ── Step 6: Start ClaimIT Server ───────────────────────────────────
node server.js

if %errorlevel% neq 0 (
    echo.
    echo  =============================================================
    echo   [!] เซิร์ฟเวอร์หยุดทำงานด้วยรหัสข้อผิดพลาด (Exit code: %errorlevel%)
    echo  =============================================================
) else (
    echo.
    echo  =============================================================
    echo   [!] ระบบ ClaimIT ปิดการทำงานเรียบร้อย (Server stopped)
    echo  =============================================================
)

echo.
echo กดปุ่มใดๆ เพื่อปิดหน้าต่างนี้...
pause
