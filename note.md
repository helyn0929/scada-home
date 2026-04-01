scada-home/
├── .github/
│   └── copilot-instructions.md   ← 給 GitHub Copilot AI 的說明（你可以忽略）
├── .gitignore                    ← 告訴 git 哪些檔案不要上傳（如 node_modules）
│
└── frontend/                     ← 前端所有東西都在這
    │
    ├── ── 設定檔（你基本不需要動）──
    ├── package.json              ← 前端用了哪些套件、指令（npm run dev 等）
    ├── package-lock.json         ← 套件版本鎖定（自動生成，不要手動改）
    ├── vite.config.ts            ← Vite 打包工具設定（目前沒有 proxy）
    ├── tsconfig.json             ← TypeScript 設定
    ├── tailwind.config.js        ← CSS 框架設定
    ├── postcss.config.js         ← CSS 處理設定
    ├── eslint.config.js          ← 程式碼風格檢查設定
    ├── components.json           ← shadcn/ui 元件設定（她用的 UI 套件）
    ├── index.html                ← 網頁入口 HTML（只有一個 div，React 接管）
    │
    ├── .env                      ← ★ 環境變數（API 網址、mock 開關）
    │     VITE_MOCK=1             ← 現在是 1，所以跑假資料
    │     VITE_NAS_API_URL=...    ← 真實 API 位址（你之後要改這個）
    │
    ├── public/                   ← 靜態資源（直接放網址可存取）
    │   └── assets/
    │       ├── icons/            ← SVG 圖示（bolt、water、alarm...）
    │       └── models/
    │           └── turbine.glb   ← 3D 渦輪機模型（Three.js 用）
    │
    └── src/                      ← ★ 主要程式碼都在這
        │
        ├── main.tsx              ← 程式啟動點，把 App 掛進 index.html
        ├── App.tsx               ← 路由設定（目前只有 HomeScreen）
        ├── App.css / index.css   ← 全域樣式
        ├── svg.d.ts              ← 讓 TypeScript 認識 .svg 檔
        ├── vite-env.d.ts         ← 讓 TypeScript 認識 import.meta.env
        │
        ├── design-tokens/        ← 設計規範（顏色、字體大小等）
        │   ├── tokens.json
        │   └── token.ts
        │
        ├── features/             ← 頁面功能模組
        │   ├── home/
        │   │   └── HomeScreen.tsx      ← ★★ 首頁主畫面，組合所有元件
        │   └── telemetry/
        │       ├── types.ts            ← ★★ 資料格式定義（你後端要符合這個）
        │       └── useLiveTelemetry.ts ← ★★ 每秒打 API 拿資料的邏輯
        │
        └── components/           ← UI 元件（每個卡片/區塊）
            ├── kpi/
            │   └── KpiCard.tsx         ← 四個數字卡片（功率、電能、流量、容量）
            ├── nav/
            │   └── NavBar.tsx          ← 頂部導覽列
            ├── noise/
            │   └── NoiseMonitoring.tsx ← 噪音監測區塊
            ├── power/
            │   └── GeneratorPower.tsx  ← 發電機功率（S、P、Q）
            ├── temperature/
            │   └── TemperatureCard.tsx ← 溫度卡片（5 個感測器）
            ├── ui/
            │   └── card.tsx            ← 基礎卡片元件（shadcn/ui）
            ├── valves/
            │   ├── ValveStatusMap.tsx  ← 閥件狀態圖主元件
            │   ├── SvgRenderer.tsx     ← 渲染 SVG 閥件圖
            │   ├── ValveAPI.js         ← 閥件 API 呼叫
            │   └── valveStyles.css     ← 閥件樣式
            └── vibration/
                └── GeneratorVibration.tsx ← 振動監測（目前可能是假資料）

                資料流向（最重要）

.env (VITE_MOCK=1)
     ↓
useLiveTelemetry.ts   ← 每秒執行一次
     ↓ 如果 MOCK=0，打 GET /api/telemetry
     ↓ 如果 MOCK=1，產生亂數假資料
     ↓
HomeScreen.tsx        ← 把資料分發給各元件
     ↓
KpiCard / TemperatureCard / NoiseMonitoring / ValveStatusMap / GeneratorPower
你需要動的只有兩個地方
.env — 把 VITE_MOCK=1 改成 0，設定你後端的網址
vite.config.ts — 可能需要加 proxy（讓前端 /api/telemetry 轉發到你的 Flask）
她的東西你完全不需要改。 你只要讓你的後端回傳 types.ts 定義的那個 JSON 格式，她的前端就會自動顯示真實資料。

#demo_realtime
UrXPX5bskMb-AwIKOm7k7AuLPVuxiSaIUd943uhHwrZcg2gbI4K7fsfWWMqyxTqJi5iFpGNstKQvHwmdkxxGfQ==