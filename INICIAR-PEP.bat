@echo off
setlocal
cd /d "%~dp0"
start "" "http://localhost:8765/"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1"
