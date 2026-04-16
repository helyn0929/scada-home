@echo off
cd /d C:\Users\aesme\scada-home-demo\backend
C:\Users\aesme\scada-home-demo\backend\venv\Scripts\python.exe scripts\hourly_aggregation_task.py >> logs\aggregation.log 2>&1
