@echo off
chcp 65001 >nul 2>&1
setlocal
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
if %errorlevel% equ 0 goto :node_found

:: Check standard Node.js installation paths on Windows (64-bit and 32-bit)
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%ProgramW6432%\nodejs\node.exe" set "PATH=%ProgramW6432%\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\node\node.exe" set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
if exist "%APPDATA%\nvm\current\node.exe" set "PATH=%APPDATA%\nvm\current;%PATH%"
if exist "C:\nodejs\node.exe" set "PATH=C:\nodejs;%PATH%"

:node_found
:: Ensure npm directory is in PATH if present
if exist "%APPDATA%\npm" set "PATH=%APPDATA%\npm;%PATH%"

where node >nul 2>&1
if %errorlevel% equ 0 goto :node_ready

echo [!] ไม่พบ Node.js ในระบบ กำลังเริ่มดาวน์โหลดและติดตั้งอัตโนมัติ...
echo     กรุณารอสักครู่ (Downloading Node.js installer)...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.17.0/node-v20.17.0-x64.msi' -OutFile '%TEMP%\node_installer.msi' -UseBasicParsing"

if not exist "%TEMP%\node_installer.msi" goto :err_node_download

echo [*] กำลังติดตั้ง Node.js ลงในเครื่อง (Installing silently, please wait)...
start /wait msiexec /i "%TEMP%\node_installer.msi" /qn /norestart
set "MSI_EXIT_CODE=%errorlevel%"
if exist "%TEMP%\node_installer.msi" del "%TEMP%\node_installer.msi" >nul 2>&1

:: Add newly installed path to current environment
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
if exist "%ProgramW6432%\nodejs\node.exe" set "PATH=%ProgramW6432%\nodejs;%APPDATA%\npm;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%APPDATA%\npm;%PATH%"

where node >nul 2>&1
if %errorlevel% neq 0 goto :err_node_post_install

echo [OK] ติดตั้ง Node.js สำเร็จเรียบร้อย
goto :node_ready

:err_node_download
echo.
echo [ERROR] ไม่สามารถดาวน์โหลดตัวติดตั้ง Node.js อัตโนมัติได้
echo กรุณาดาวน์โหลดและติดตั้ง Node.js (LTS) ด้วยตนเองจาก: https://nodejs.org/
echo.
pause
exit /b 1

:err_node_post_install
echo.
echo [ERROR] ติดตั้ง Node.js เรียบร้อย [Exit code: %MSI_EXIT_CODE%] แต่ระบบต้องการการเปิด Command Prompt ใหม่
echo กรุณาปิดหน้าต่างนี้แล้วเปิดไฟล์ Start_ClaimIT.bat ใหม่อีกครั้ง
echo.
pause
exit /b 1

:node_ready
:: Display Node.js version
set "NODE_VER="
for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
if defined NODE_VER (
    echo [OK] ตรวจพบ Node.js: %NODE_VER%
) else (
    echo [OK] ตรวจพบ Node.js พร้อมใช้งาน
)

:: ── Step 2: Environment Configuration ──────────────────────────────
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [OK] สร้างไฟล์การตั้งค่า .env จากแม่แบบเรียบร้อย
    ) else (
        echo [!] คำเตือน: ไม่พบไฟล์ .env หรือ .env.example ระบบจะใช้ค่าเริ่มต้น
    )
) else (
    echo [OK] โหลดการตั้งค่าระบบ [.env] พร้อมใช้งาน
)

:: Extract PORT from .env if defined (defaults to 8847)
set "PORT=8847"
if exist ".env" (
    for /f "usebackq eol=# tokens=1* delims==" %%A in (".env") do (
        if /i "%%A"=="PORT" (
            set "PORT=%%B"
        )
    )
)
if defined PORT (
    set "PORT=%PORT: =%"
    set "PORT=%PORT:"=%"
)
if "%PORT%"=="" set "PORT=8847"

:: ── Step 3: Dependency Check ───────────────────────────────────────
if not exist "package.json" goto :err_no_pkg

if exist "node_modules\express" goto :deps_ready

echo.
echo [*] กำลังติดตั้ง Libraries ที่จำเป็นสำหรับระบบ (npm install)...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs\npm.cmd" set "PATH=%ProgramFiles%\nodejs;%PATH%"
    if exist "%ProgramW6432%\nodejs\npm.cmd" set "PATH=%ProgramW6432%\nodejs;%PATH%"
    if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
)
call npm install --no-audit
if %errorlevel% neq 0 goto :err_npm_install
echo [OK] ติดตั้งแพ็กเกจเสร็จสมบูรณ์
goto :deps_ready

:err_no_pkg
echo.
echo [ERROR] ไม่พบไฟล์ package.json ใน "%CD%"
echo กรุณาตรวจสอบว่าอยู่ในโฟลเดอร์ของ ClaimIT ที่ถูกต้อง
echo.
pause
exit /b 1

:err_npm_install
echo.
echo [ERROR] ไม่สามารถติดตั้ง dependencies ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
echo.
pause
exit /b 1

:deps_ready
echo [OK] แพ็กเกจระบบ (node_modules) พร้อมใช้งาน

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
if not exist "server.js" goto :err_no_server

node server.js
set "SERVER_EXIT_CODE=%errorlevel%"

if %SERVER_EXIT_CODE% neq 0 (
    echo.
    echo  =============================================================
    echo   [!] เซิร์ฟเวอร์หยุดทำงานด้วยรหัสข้อผิดพลาด [Exit code: %SERVER_EXIT_CODE%]
    echo  =============================================================
) else (
    echo.
    echo  =============================================================
    echo   [!] ระบบ ClaimIT ปิดการทำงานเรียบร้อย [Server stopped]
    echo  =============================================================
)

echo.
echo กดปุ่มใดๆ เพื่อปิดหน้าต่างนี้...
pause
exit /b %SERVER_EXIT_CODE%

:err_no_server
echo.
echo [ERROR] ไม่พบไฟล์ server.js ใน "%CD%"
echo.
pause
exit /b 1
