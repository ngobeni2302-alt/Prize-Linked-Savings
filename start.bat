@echo off
title MTN MoMo Enhanced Local Server
cd /d "%~dp0"
echo ========================================================
echo  Starting MTN MoMo Enhanced Web App on http://localhost:8080
echo ========================================================
start "" "http://localhost:8080"
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8080
pause
