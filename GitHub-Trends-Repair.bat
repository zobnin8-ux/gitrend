@echo off
title GitHub Trends - Repair
cd /d "%~dp0"
echo.
echo  Repairing native SQLite module (better-sqlite3)...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0repair-native.ps1"
echo.
pause
