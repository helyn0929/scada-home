@echo off
REM =============================================
REM  NSSM 註冊 Windows 服務（以管理員身分執行）
REM  執行前請先修改下方路徑為實際安裝路徑
REM =============================================

set NSSM=C:\tools\nssm.exe
set PYTHON=C:\Users\aesme\scada-home-demo\backend\venv\Scripts\python.exe
set PYTHON_GLOBAL=C:\Python313\python.exe
set NODE=C:\Program Files\nodejs\node.exe
set NODERED=%APPDATA%\npm\node_modules\node-red\red.js
set BACKEND=C:\Users\aesme\scada-home-demo\backend
set DASH=C:\Users\aesme\scada-home-demo\dash-history

REM --- Flask API ---
%NSSM% install scada-flask "%PYTHON%" "%BACKEND%\app.py"
%NSSM% set scada-flask AppDirectory "%BACKEND%"
%NSSM% set scada-flask AppExit Default Restart
%NSSM% set scada-flask AppRestartDelay 5000
%NSSM% set scada-flask AppStdout "%BACKEND%\logs\flask-stdout.log"
%NSSM% set scada-flask AppStderr "%BACKEND%\logs\flask-stderr.log"
%NSSM% set scada-flask Description "SCADA Home - Flask API"
%NSSM% start scada-flask

REM --- Dash 歷史查詢 ---
%NSSM% install scada-dash "%PYTHON_GLOBAL%" "%DASH%\app_blocks.py"
%NSSM% set scada-dash AppDirectory "%DASH%"
%NSSM% set scada-dash AppExit Default Restart
%NSSM% set scada-dash AppRestartDelay 5000
%NSSM% set scada-dash AppStdout "%BACKEND%\logs\dash-stdout.log"
%NSSM% set scada-dash AppStderr "%BACKEND%\logs\dash-stderr.log"
%NSSM% set scada-dash Description "SCADA Home - Dash History"
%NSSM% start scada-dash

REM --- Node-RED ---
%NSSM% install scada-nodered "%NODE%" "%NODERED%"
%NSSM% set scada-nodered AppExit Default Restart
%NSSM% set scada-nodered AppRestartDelay 5000
%NSSM% set scada-nodered Description "SCADA Home - Node-RED"
%NSSM% start scada-nodered

echo.
echo === 服務註冊完成 ===
echo 可在「服務」管理員中查看：scada-flask、scada-dash、scada-nodered
echo InfluxDB 和 nginx 安裝時已自動註冊為服務
pause
