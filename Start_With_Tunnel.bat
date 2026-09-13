@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
title ClaimIT - Hospital IT Warranty & RMA System Launcher
color 0A

echo.
echo  =============================================================
echo    🏥 ClaimIT - Starting System Server & Launching Web Browser...
echo  =============================================================
echo.

set "CLAIM_DIR="
if exist "%~dp0claimIT\server.js" set "CLAIM_DIR=%~dp0claimIT"
if not defined CLAIM_DIR if exist "%~dp0server.js" set "CLAIM_DIR=%~dp0"
if not defined CLAIM_DIR (
  echo  [ERROR] Cannot locate ClaimIT directory.
  pause
  exit /b 1
)

:: 1. Open the web browser immediately for the local user
echo  [1/3] กำลังเปิดเว็บเบราว์เซอร์อัตโนมัติ (Opening Browser: http://localhost:8847)...
start "" "http://localhost:8847"

:: 2. Check for Cloudflared for public HTTPS link
set "CF_BIN=%~dp0cloudflared.exe"
if not exist "%CF_BIN%" (
  where cloudflared >nul 2>&1
  if !errorlevel! equ 0 (
    set "CF_BIN=cloudflared"
  ) else (
    echo.
    echo  [!] ตรวจสอบ cloudflared.exe สำหรับสร้างลิงก์ HTTPS สาธารณะ...
    echo      กำลังดาวน์โหลดเวอร์ชันพกพาอัตโนมัติ (หากเครื่องไม่มีอินเทอร์เน็ตจะข้ามขั้นตอนนี้)...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe', '%~dp0cloudflared.exe')" >nul 2>&1
  )
)

if exist "%~dp0cloudflared.exe" set "CF_BIN=%~dp0cloudflared.exe"

:: 3. Start Cloudflare Tunnel in separate window if available
if exist "%CF_BIN%" (
  echo.
  echo  [2/3] กำลังเปิด Cloudflare HTTPS Tunnel สำหรับส่งลิงก์เข้ามือถือ/LINE...
  start "ClaimIT Public HTTPS Tunnel" cmd /c ""%CF_BIN%" tunnel --url http://localhost:8847"
) else (
  where cloudflared >nul 2>&1
  if !errorlevel! equ 0 (
    echo.
    echo  [2/3] กำลังเปิด Cloudflare HTTPS Tunnel...
    start "ClaimIT Public HTTPS Tunnel" cmd /c "cloudflared tunnel --url http://localhost:8847"
  ) else (
    echo.
    echo  [ℹ️] ไม่สามารถดาวน์โหลด Cloudflare Tunnel ได้ในขณะนี้ (อาจเนื่องจาก Proxy โรงพยาบาล)
    echo       ระบบสามารถใช้งานผ่านเครือข่ายโรงพยาบาล (Intranet / LAN) ได้ตามปกติทันที!
  )
)

:: 4. Start Server
echo.
echo  [3/3] กำลังเปิดเซิร์ฟเวอร์ ClaimIT...
echo.
cd /d "%CLAIM_DIR%"
call "%CLAIM_DIR%\start.bat"
