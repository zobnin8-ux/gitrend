@echo off
title GitHub Trends
cd /d D:\Gitrend
echo.
echo  GitHub Trends - starting...
echo  (first start after code update may take ~20 sec for build)
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Gitrend\launch-app.ps1"
if errorlevel 1 (
  echo.
  echo  ERROR - see D:\Gitrend\data\launch.log
  echo.
  pause
  exit /b 1
)
echo.
echo  Running at http://localhost:3000
echo  To stop: run GitHub-Trends-Stop.bat
echo.
timeout /t 4 >nul
