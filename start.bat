@echo off
REM ════════════════════════════════════════════════════════════
REM  Conquer Capital — double-click to start everything
REM ════════════════════════════════════════════════════════════
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
pause
