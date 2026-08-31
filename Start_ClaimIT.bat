@echo off
chcp 65001 >nul 2>&1
setlocal
title ClaimIT - Hospital IT Warranty ^& RMA Claim System Launcher
color 0A

echo.
echo  =============================================================
echo    🏥 ClaimIT - Starting Application Launcher...
echo  =============================================================
echo.

:: 1. Locate ClaimIT project directory relative to this script
set "CLAIM_DIR="
if exist "%~dp0claimIT\server.js" set "CLAIM_DIR=%~dp0claimIT"
if not defined CLAIM_DIR if exist "%~dp0server.js" set "CLAIM_DIR=%~dp0"

if not defined CLAIM_DIR goto :err_no_dir

:: Remove trailing backslash if present
if "%CLAIM_DIR:~-1%"=="\" set "CLAIM_DIR=%CLAIM_DIR:~0,-1%"

:: 2. Ensure start.bat exists in project directory
if not exist "%CLAIM_DIR%\start.bat" goto :err_no_start

:: 3. Prevent infinite recursion if this launcher is itself named start.bat
if /i "%~f0"=="%CLAIM_DIR%\start.bat" goto :err_recursion

:: 4. Change directory to ClaimIT project folder and execute start.bat
cd /d "%CLAIM_DIR%"
call "%CLAIM_DIR%\start.bat"
set "LAUNCH_EXIT_CODE=%errorlevel%"
exit /b %LAUNCH_EXIT_CODE%

:err_no_dir
echo.
echo  [ERROR] Cannot locate ClaimIT project directory (missing server.js).
echo  [!] ไม่พบโฟลเดอร์โครงการ ClaimIT (ไม่พบไฟล์ server.js)
echo.
echo  กรุณาตรวจสอบว่าไฟล์และโฟลเดอร์ของ ClaimIT อยู่ในตำแหน่งที่ถูกต้อง
echo.
pause
exit /b 1

:err_no_start
echo.
echo  [ERROR] Cannot find 'start.bat' in "%CLAIM_DIR%"
echo  [!] ไม่พบไฟล์ start.bat ในโฟลเดอร์โครงการ
echo.
pause
exit /b 1

:err_recursion
echo.
echo  [ERROR] Launcher recursion prevented: launcher cannot call itself.
echo.
pause
exit /b 1
