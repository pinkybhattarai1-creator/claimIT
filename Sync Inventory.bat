@echo off
title ClaimIT - Sync Inventory
cd /d "%~dp0"
node tools\sync-inventory.js
pause
