@echo off
setlocal EnableDelayedExpansion
title ClaimIT - Hospital IT Warranty & Claim System
color 0A

echo.
echo  =============================================================
echo    🏥 ClaimIT - Hospital IT Warranty ^& RMA Claim System
echo    ระบบติดตามรับประกันและส่งเคลมครุภัณฑ์ไอทีโรงพยาบาล
echo  =============================================================
echo.

REM ── Step 1: Check Node.js ──────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Node.js not found. Downloading and installing automatically...
    echo     กรุณารอสักครู่ กำลังดาวน์โหลด Node.js อัตโนมัติ...
    echo.

    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.17.0/node-v20.17.0-x64.msi' -OutFile '%TEMP%\node_installer.msi' -UseBasicParsing"

    if not exist "%TEMP%\node_installer.msi" (
        echo [ERROR] Failed to download Node.js. Please install manually from: https://nodejs.org/
        pause
        exit /b 1
    )

    echo [*] Installing Node.js silently...
    msiexec /i "%TEMP%\node_installer.msi" /qn /norestart
    del "%TEMP%\node_installer.msi" >nul 2>&1

    for /f "usebackq tokens=2*" %%A in (`reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path`) do set "SYS_PATH=%%B"
    for /f "usebackq tokens=2*" %%A in (`reg query "HKCU\Environment" /v Path 2^>nul`) do set "USR_PATH=%%B"
    set "PATH=%SYS_PATH%;%USR_PATH%"

    where node >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Node.js installation failed. Please restart your computer and run start.bat again.
        pause
        exit /b 1
    )
    echo [OK] Node.js installed successfully!
) else (
    for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
    echo [OK] ตรวจพบ Node.js: !NODE_VER!
)

REM ── Step 2: Environment Configuration ──────────────────────────────────────
if exist .env (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        set "line=%%A"
        if not "!line:~0,1!"=="#" if not "%%A"=="" (
            set "%%A=%%B"
        )
    )
    echo [OK] โหลดการตั้งค่าระบบจาก .env เรียบร้อย
) else (
    echo [!] ไม่พบไฟล์ .env ระบบกำลังสร้างจากค่าเริ่มต้น...
    if exist .env.example (
        copy .env.example .env >nul
        echo [OK] สร้างไฟล์ .env จากแม่แบบเรียบร้อย
    )
)

REM ── Step 3: Fast Dependency Check ──────────────────────────────────────────
if not exist node_modules (
    echo.
    echo [*] กำลังติดตั้ง Libraries ที่จำเป็นสำหรับครั้งแรก (npm install)...
    call npm install --no-audit --silent 2>nul
    echo [OK] ติดตั้งแพ็กเกจเสร็จสมบูรณ์
) else (
    echo [OK] แพ็กเกจระบบ (node_modules) พร้อมใช้งานทันที
)

REM ── Step 4: Ensure Storage Directories Exist ───────────────────────────────
if not exist "storage\evidence" mkdir "storage\evidence" >nul 2>&1
if not exist "backups" mkdir "backups" >nul 2>&1

REM ── Step 5: Port and URL Setup ─────────────────────────────────────────────
if not defined PORT set PORT=8847

echo.
echo  =============================================================
echo    🚀 ระบบกำลังเปิดใช้งาน (Server Launching...)
echo    🌐 เปิดหน้าจอที่: http://localhost:%PORT%/
echo    🧑‍💼 Staff Portal: staff / staff123
echo    💻 IT Admin: admin / admin123
echo    💡 สมาชิกในเครือข่ายสามารถเข้าใช้งานผ่าน IP ของเครื่องนี้ได้ทันที
echo  =============================================================
echo.

REM Automatically launch browser in background after 2 seconds
start "" /b cmd /c "powershell -Command Start-Sleep -Seconds 2 && start http://localhost:%PORT%/"

REM Start ClaimIT Server
node server.js

echo.
echo [!] โปรแกรมปิดการทำงานแล้ว (Server stopped)
pause
