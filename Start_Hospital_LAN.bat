@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
title ClaimIT - Hospital Intranet (LAN) Launcher
color 0B

echo.
echo  =============================================================
echo    🏥 ClaimIT - ระบบเซิร์ฟเวอร์เครือข่ายโรงพยาบาล (Hospital LAN)
echo  =============================================================
echo.
echo  [1] กำลังค้นหา IP เครือข่ายภายในโรงพยาบาล (Intranet IP)...

set "CLAIM_DIR="
if exist "%~dp0claimIT\server.js" set "CLAIM_DIR=%~dp0claimIT"
if not defined CLAIM_DIR if exist "%~dp0server.js" set "CLAIM_DIR=%~dp0"
if not defined CLAIM_DIR (
  echo  [ERROR] ไม่พบโฟลเดอร์ ClaimIT (ไม่พบไฟล์ server.js)
  pause
  exit /b 1
)

:: Find IPv4 Address (preferring 10.x or 192.168.x)
set "DETECTED_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  set "IP_CANDIDATE=%%a"
  set "IP_CANDIDATE=!IP_CANDIDATE: =!"
  if "!IP_CANDIDATE:~0,3!"=="10." (
    set "DETECTED_IP=!IP_CANDIDATE!"
  ) else if "!IP_CANDIDATE:~0,8!"=="192.168." (
    if not defined DETECTED_IP set "DETECTED_IP=!IP_CANDIDATE!"
  )
)

if not defined DETECTED_IP set "DETECTED_IP=127.0.0.1"

echo.
echo  -------------------------------------------------------------
echo   📢 ลิงก์สำหรับให้เจ้าหน้าที่ / พยาบาล / ช่างไอที เปิดใช้งาน:
echo.
echo        👉  http://%DETECTED_IP%:8847
echo.
echo   ✅ ผู้ใช้งานเปิดผ่าน Google Chrome หรือ Microsoft Edge ได้ทันที
echo   ✅ ไม่ต้องติดตั้ง Node.js, Git, หรือดาวน์โหลดโปรแกรมใดๆ
echo   ✅ ข้าม Web Proxy ของโรงพยาบาลอัตโนมัติ (Local Intranet Traffic)
echo  -------------------------------------------------------------
echo.
echo  💡 หากเครื่องเพื่อนร่วมงานเปิดไม่ได้ กรุณาเปิด PowerShell (Admin) แล้วรัน:
echo     New-NetFirewallRule -DisplayName "ClaimIT LAN" -Direction Inbound -LocalPort 8847 -Protocol TCP -Action Allow
echo.
echo  =============================================================
echo    กำลังเริ่มระบบ ClaimIT Server... (กด Ctrl+C เพื่อหยุดทำงาน)
echo  =============================================================
echo.

start "" "http://localhost:8847"

cd /d "%CLAIM_DIR%"
call "%CLAIM_DIR%\start.bat"
