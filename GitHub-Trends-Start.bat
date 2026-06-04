@echo off
title GitHub Trends - Start
cd /d "%~dp0"

echo.
echo  ========================================
echo   GitHub Trends - starting...
echo  ========================================
echo.
echo  First start or after code changes: build ~1-2 min.
echo  Do not double-click - wait until browser opens.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch-app.ps1"
set ERR=%ERRORLEVEL%

echo.
if %ERR% NEQ 0 (
  echo  FAILED - see messages above and:
  echo  %~dp0data\launch.log
  echo.
  pause
  exit /b %ERR%
)

echo  OK - server is running at http://localhost:3000
echo  A minimized window "GitHub Trends Server" stays open.
echo  To stop: run GitHub-Trends-Stop.bat
echo.
pause
