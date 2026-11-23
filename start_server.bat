@echo off
title YouTube Dubber ASR Server
set PYTHONDONTWRITEBYTECODE=1

echo [INFO] Kiem tra model AI...
python -B download_models.py
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Khong the tai model AI!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [INFO] Dang khoi dong ASR Server (SenseVoice Small)...
python -B server.py
pause
