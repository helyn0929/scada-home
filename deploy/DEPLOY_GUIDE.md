# 湖山 SCADA Home - 現場部署指南

## 目標架構

```
使用者瀏覽器（手機/電腦）
    ↓ http://現場電腦IP
  nginx (:80)
    ├── /          → 前端靜態檔 (dist/)
    ├── /api/      → 轉發到 Flask (:5051)
    └── /history/  → 轉發到 Dash  (:8050)

Flask (:5051) ← 查詢 → InfluxDB (:8086)  ← real_time_data
Dash  (:8050) ← 查詢 → InfluxDB (:8086)  ← real_time_data + aggregated_data
Node-RED      ← 寫入 → InfluxDB (:8086)
PLC (DB74)    → Node-RED
hourly_aggregation_task (排程) → InfluxDB (:8086)
```

所有東西都跑在同一台 Windows 電腦上。

---

## 前置準備（你的電腦上先做好）

### P1. 前端 build

```bash
cd scada-home/frontend
# 確認 .env 是相對路徑版本
# VITE_API_URL=/api/view/home

npm run build
# 產出 frontend/dist/ 資料夾
```

### P2. 準備好帶去現場的東西

```
隨身碟/
├── installers/
│   ├── influxdb-xxx-windows.zip     ← https://portal.influxdata.com/downloads/
│   ├── node-vxx.x.x-x64.msi        ← https://nodejs.org/
│   ├── python-3.12.x-amd64.exe     ← https://www.python.org/downloads/
│   ├── nssm-2.24.zip               ← https://nssm.cc/download
│   ├── nginx-1.xx.x.zip            ← https://nginx.org/en/download.html（Windows版）
│   └── AnyDesk.exe                  ← https://anydesk.com/
│
└── scada-home/                      ← 整個專案資料夾（含 frontend/dist/）
```

---

## 現場安裝步驟

> 以下所有路徑假設安裝在 `C:\`，實際路徑請自行調整

### Step 1：安裝 Python 3

1. 執行 `python-3.12.x-amd64.exe`
2. **勾選 "Add Python to PATH"**
3. 安裝完畢，開 cmd 驗證：`python --version`

### Step 2：安裝 Node.js

1. 執行 `node-vxx.x.x-x64.msi`
2. 預設選項安裝即可
3. 驗證：`node --version` 和 `npm --version`

### Step 3：安裝 Node-RED

```bash
npm install -g node-red
```

驗證：`node-red`（會啟動，看到 Started flows 後 Ctrl+C 關掉）

### Step 4：安裝 InfluxDB

1. 解壓 `influxdb-xxx-windows.zip` 到 `C:\influxdb\`
2. 執行 `influxd.exe` 啟動
3. 開瀏覽器 `http://localhost:8086`，完成初始設定：
   - Organization: `SCADA_hushan`
   - Bucket: `real_time_data`（7 天 retention）
   - 記下產生的 Token
4. 再手動建立第二個 Bucket：`aggregated_data`（retention: 永久 / 0）
4. 把 InfluxDB 註冊為 Windows 服務：
```bash
# 以管理員身分執行
sc create influxdb binPath= "C:\influxdb\influxd.exe" start= auto
sc start influxdb
```

### Step 5：複製專案檔案

```bash
# 把整個 scada-home 複製到現場電腦
xcopy /E /I 隨身碟\scada-home C:\scada-home
```

### Step 6：設定 backend .env

把 `deploy\env\backend.env` 複製到 `backend\.env`，填入 Step 4 產生的 Token：

```
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=（貼上你在 Step 4 拿到的 token）
INFLUX_ORG=SCADA_hushan
INFLUX_BUCKET=real_time_data
INFLUX_BUCKET_AGGREGATED=aggregated_data
FLASK_PORT=5051
FLASK_DEBUG=0
PLANT_ID=hushan
```

### Step 7：安裝 Python 套件

```bash
cd C:\scada-home\backend
pip install -r requirements.txt

cd C:\scada-home\dash-history
pip install -r requirements.txt
```

驗證 Flask 能跑：
```bash
cd C:\scada-home\backend
python app.py
# 看到 [PROD] API 啟動 就對了，Ctrl+C 關掉
```

驗證 Dash 能跑：
```bash
cd C:\scada-home\dash-history
python app_blocks.py
# 開瀏覽器 http://localhost:8050 看到頁面就對了，Ctrl+C 關掉
```

### Step 8：設定 nginx

1. 解壓 `nginx-1.xx.x.zip` 到 `C:\nginx\`
2. 用 `deploy\nginx\nginx.conf` **覆蓋** `C:\nginx\conf\nginx.conf`
3. 確認 nginx.conf 裡的路徑是否正確：
   - `root C:/scada-home/frontend/dist;` ← 前端靜態檔位置
4. 啟動 nginx：
```bash
cd C:\nginx
start nginx
```
5. 開瀏覽器 `http://localhost`，應該能看到前端畫面
### Step 9：設定 Node-RED flow

1. 啟動 Node-RED：`node-red`
2. 開瀏覽器 `http://localhost:1880`
3. 匯入 `backend/nodered_flow.json`
4. **把模擬資料區塊換成真實 PLC 讀取節點**
5. 修改 InfluxDB 寫入 URL 為 `http://localhost:8086`（本機）
6. Deploy

### Step 10：安裝 NSSM + 註冊服務

1. 解壓 `nssm-2.24.zip`，把 `nssm.exe` 放到 `C:\tools\nssm\`
2. **以管理員身分執行** `deploy\scripts\register-services.bat`
3. 執行前先檢查 `.bat` 裡的路徑是否正確（Python、Node、backend 位置）
4. 完成後打開 Windows「服務」管理員，確認以下服務都是「執行中」：
   - `scada-flask`
   - `scada-dash`
   - `scada-nodered`
   - `influxdb`

### Step 11：設定 nginx 開機自啟

nginx 沒有內建 Windows 服務功能，也用 NSSM：

```bash
C:\tools\nssm\nssm.exe install scada-nginx "C:\nginx\nginx.exe"
C:\tools\nssm\nssm.exe set scada-nginx AppDirectory "C:\nginx"
C:\tools\nssm\nssm.exe start scada-nginx
```

### Step 11b：設定小時聚合排程

聚合任務每小時把 5 秒原始資料壓縮成小時統計，供歷史查詢頁使用。

**先手動測試一次：**
```bash
cd C:\scada-home\backend
python scripts\hourly_aggregation_task.py
# 看到「聚合完成」代表 InfluxDB 連線正常
```

**用 Windows 工作排程器設定每小時自動執行：**

1. 開始功能表 → 搜尋「工作排程器」→ 開啟
2. 右側點「**建立工作**」（不是「建立基本工作」）
3. **一般** 頁籤：
   - 名稱：`scada-hourly-aggregation`
   - 勾選「**不論使用者是否登入都要執行**」
   - 勾選「以最高權限執行」
4. **觸發程序** 頁籤 → 新增：
   - 開始工作：**依照排程**
   - 設定：**每天**
   - 開始時間：`00:05`（整點後 5 分鐘，確保資料寫入完畢）
   - 勾選「**重複工作，間隔：1 小時**」
   - 持續時間：**無限期**
5. **動作** 頁籤 → 新增：
   - 動作：**啟動程式**
   - 程式：`C:\Python312\python.exe`
   - 新增引數：`scripts\hourly_aggregation_task.py`
   - 起始於：`C:\scada-home\backend`
6. **條件** 頁籤：取消勾選「只有電腦使用 AC 電源時才啟動」
7. 確定 → 輸入 Windows 帳號密碼

**驗證設定是否成功：**
```bash
# 在工作排程器右側點「執行」立即觸發一次
# 或在 cmd 執行：
schtasks /run /tn "scada-hourly-aggregation"

# 查看執行結果：
schtasks /query /tn "scada-hourly-aggregation" /fo list
```

> **注意**：如果現場電腦有設定自動休眠，需要關掉，否則排程任務不會執行。
> 控制台 → 電源選項 → 「讓電腦進入睡眠狀態」設為「從不」

### Step 12：安裝 AnyDesk（遠端存取）

1. 執行 `AnyDesk.exe`，安裝
2. 設定 → 安全性 → 設定「無人值守密碼」
3. 記下 AnyDesk ID 和密碼
4. 之後你在辦公室就能用 AnyDesk 連進這台電腦

### Step 13：開放防火牆

以管理員身分執行：
```bash
netsh advfirewall firewall add rule name="scada-http" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="scada-nodered" dir=in action=allow protocol=TCP localport=1880
```

（Port 5051 和 8086 只有 nginx/Flask 在本機互連，不需要對外開放）

### Step 14：最終驗證

1. 在現場電腦瀏覽器開 `http://localhost` → 看到畫面
2. 用手機（連同一個網路）開 `http://現場電腦IP` → 看到畫面
3. 執行 `deploy\scripts\check-health.bat` → 全部服務 RUNNING
4. 重開機 → 等 1 分鐘 → 再開瀏覽器確認 → 服務自動啟動

---

## 到現場才做（TODO）

### T1：nginx Basic Auth（訪客登入）

讓老闆或公司同仁用瀏覽器打開時需要輸入帳號密碼。

```bash
# Step 1：產生密碼檔（Windows 上用 Python 代替 htpasswd）
python -c "import crypt; print('admin:' + crypt.crypt('你的密碼'))" > C:\nginx\conf\.htpasswd

# 若是 Windows 原生（沒有 crypt），改用 Apache htpasswd 工具，
# 或到 https://www.web2generators.com/apache-tools/htpasswd-generator 產生一行貼入
```

在 `nginx.conf` 的 `location /` 區塊加上：
```nginx
location / {
    auth_basic "SCADA Login";
    auth_basic_user_file C:/nginx/conf/.htpasswd;
    try_files $uri $uri/ /index.html;
}
```

> 注意：`/api/` 不加認證，讓 Flask 直接被 nginx 代理。

重啟 nginx 後生效：
```bash
sc stop scada-nginx && sc start scada-nginx
```

---

### T2：異常通報 Email（斷線通知）

系統斷線時自動發 email。需要現場的 SMTP 帳號（公司信箱或 Gmail App Password）。

在 `backend/app.py` 加入：
```python
import smtplib
from email.mime.text import MIMEText

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
ALERT_TO   = os.getenv("ALERT_TO", "")

def send_alert(subject: str, body: str):
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASS, ALERT_TO]):
        return  # 未設定就靜默略過
    try:
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = SMTP_USER
        msg["To"] = ALERT_TO
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.send_message(msg)
    except Exception as e:
        app.logger.error(f"Email 發送失敗: {e}")
```

在 `view_home()` 斷線狀態改變時呼叫：
```python
if _influx_ok:
    app.logger.warning("InfluxDB 回傳空資料")
    send_alert("[SCADA] 異常", "InfluxDB 無資料，請確認 Node-RED 與 PLC 連線")
    _influx_ok = False
```

在 `backend/.env` 加入（到現場填）：
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=你的信箱@gmail.com
SMTP_PASS=Gmail_App_Password_16碼
ALERT_TO=收件者@example.com
```

> Gmail 需先到 Google 帳號 → 安全性 → 啟用兩步驟驗證 → 產生「應用程式密碼」

---

## 日常維運

### 看 log（出問題時）

| 服務 | log 位置 |
|------|---------|
| Flask | `C:\scada-home\backend\logs\flask.log` |
| Flask stdout/stderr | `C:\scada-home\backend\logs\flask-stdout.log` |
| nginx | `C:\nginx\logs\access.log` / `error.log` |
| Node-RED | `C:\Users\<使用者>\.node-red\` |
| InfluxDB | `C:\influxdb\` 下的 log 檔 |

### 手動重啟服務

```bash
# 在 cmd（管理員）
sc stop scada-flask && sc start scada-flask
sc stop scada-nodered && sc start scada-nodered
sc stop scada-nginx && sc start scada-nginx
```

### 遠端修復

1. 用 AnyDesk 連到現場電腦
2. 看 log 找原因
3. 改設定或程式碼
4. 重啟對應服務

### 前端改版（重新部署前端）

```bash
# 在你的開發電腦
cd scada-home/frontend
npm run build

# 把 dist/ 複製到現場電腦覆蓋
# 然後現場電腦不需要重啟任何服務，nginx 直接 serve 新檔案
```

### 後端改版（重新部署 Flask）

```bash
# 把新的 .py 複製到現場電腦覆蓋
# 然後重啟 Flask
sc stop scada-flask && sc start scada-flask
```

---

## 故障排查 SOP

| 症狀 | 可能原因 | 排查步驟 |
|------|---------|---------|
| 畫面打不開 | nginx 沒跑 | `sc query scada-nginx` |
| 畫面開了但全部 `--` | Flask 或 InfluxDB 掛了 | 打 `http://localhost:5051/api/health` |
| API 回 null | InfluxDB 沒資料 | 打 InfluxDB UI `http://localhost:8086` 看有沒有資料 |
| InfluxDB 有資料但 API 沒有 | `.env` 的 token/bucket 不對 | 檢查 `backend/.env` |
| 資料不更新（凍住） | Node-RED 掛了或 PLC 斷線 | `http://localhost:1880` 看 Node-RED |
| 重開機後服務沒起來 | NSSM 服務沒設定好 | `services.msc` 檢查服務啟動類型是「自動」 |

---

## 服務 Port 對照

| Port | 服務 | 對外？ |
|------|------|--------|
| 80 | nginx（前端 + API + 歷史查詢代理） | 是（使用者用這個） |
| 1880 | Node-RED | 是（管理介面） |
| 5051 | Flask API | 否（nginx 代理） |
| 8050 | Dash 歷史查詢 | 否（nginx 代理） |
| 8086 | InfluxDB | 否（內部使用） |
