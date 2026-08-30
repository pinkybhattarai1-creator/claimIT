@echo off
setlocal
title ClaimIT - Hospital IT Warranty ^& RMA Claim System Launcher
color 0A

echo.
echo  =============================================================
echo    🏥 ClaimIT - Starting Application Launcher...
echo  =============================================================
echo.

:: Check if start.bat is in current folder or claimIT subfolder
if exist "%~dp0start.bat" (
    cd /d "%~dp0"
    call start.bat
) else if exist "%~dp0claimIT\start.bat" (
    cd /d "%~dp0claimIT"
    call start.bat
) else (
    echo.
    echo  [ERROR] Cannot find 'start.bat'
    echo  [!] ไม่พบไฟล์ start.bat ในโฟลเดอร์ปัจจุบันหรือ claimIT
    echo.
    echo  กรุณาตรวจสอบว่าโฟลเดอร์ claimIT อยู่ในตำแหน่งที่ถูกต้อง
    echo.
    pause
    exit /b 1
)

:: If start.bat exits, keep window open so the user can read any output
if %errorlevel% neq 0 (
    echo.
    echo  [!] ClaimIT stopped with code %errorlevel%
    echo.
    pause
)
