@echo off
echo =========================================
echo   ClaimIT - Hospital IT Claim System
echo =========================================

REM Load .env file if it exists
if exist .env (
    echo Loading environment from .env...
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        if not "%%A"=="" if not "%%A:~0,1%"=="#" set "%%A=%%B"
    )
)

echo Installing dependencies...
call npm install --silent

echo Starting Node.js server...
start http://localhost:%PORT:-8847%
npm start
pause
