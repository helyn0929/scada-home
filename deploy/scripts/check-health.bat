@echo off
REM =============================================
REM  快速健康檢查（手動或排程執行）
REM =============================================

echo === 服務狀態 ===
sc query scada-flask | findstr STATE
sc query scada-nodered | findstr STATE
sc query influxdb | findstr STATE

echo.
echo === Flask API ===
curl -s http://localhost:5051/api/health
echo.

echo.
echo === InfluxDB ===
curl -s http://localhost:8086/health
echo.

echo.
echo === Node-RED ===
curl -s http://localhost:1880
echo.

pause
