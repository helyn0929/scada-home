export interface ValveState {
  open: boolean | null;  // null = 資料中斷時的未知狀態
  percent?: number;
}

export interface Valves {
  dn800?: ValveState;
  dn900?: ValveState;
  dn1350?: ValveState;
  dn1400?: ValveState;
  dn1400D?: ValveState;
}

export interface TelemetryData {
  // 🔹 資料新鮮度
  data_time?: string | null;          // 最新一筆資料的時間戳 (ISO, UTC)
  data_status?: "live" | "down";      // 後端依全域最新更新判定

  // 🔹 發電相關
  power_kw?: number;
  energy_kwh?: number;
  energy_unit?: string;
  capacity_factor?: number;

  // 🔹 水文
  discharge_cms?: number;

  // 🔹 噪音
  noiseIndoor?: number;
  noiseOutdoor?: number;

  // 🔹 溫度
  tempWindingU?: number;
  tempWindingV?: number;
  tempWindingW?: number;
  tempControlPanel?: number;
  tempEnvironment?: number;

  // 🔹 閥件
  valves?: Valves;

  // 🔹 Generator power (card: S, P, Q, P.F)
  generatorApparentPowerS?: number; // kVA, -2000..+2000
  generatorActivePowerP?: number;   // kW, -2000..+2000
  generatorReactivePowerQ?: number; // kvar, -2000..+2000

  // 🔹 振動
  vibrationDE?: number;   // mm/s, 驅動端
  vibrationNDE?: number;  // mm/s, 受力端

  // 🔹 水輪發電機儀表
  guideVanePct?: number;    // %, 導葉開度
  genSpeedRpm?: number;     // rpm, 發電機轉速
  genSpeedPct?: number;     // %, 發電機轉速百分比

  // 🔹 壓力
  pressureBeforeDn900?: number;  // bar, DN900 前壓力
  pressureAfterDn900?: number;   // bar, DN900 後壓力

  // 🔹 水質
  waterQualityIn?: number;   // ppm, 入水水質
  waterQualityOut?: number;  // ppm, 出水水質

  // 🔹 HPU1 (turbine hydraulic)
  hpu1Pressure?: number;       // bar
  hpu1MotorOn?: boolean;
  hpu1QsdValveOpen?: boolean;

  // 🔹 HPU2 (bypass hydraulic)
  hpu2Pressure?: number;       // bar
  hpu2MotorOn?: boolean;
  hpu2Dn1400Open?: boolean;

  // 🔹 Filling valve feedbacks
  dn1400FillingInletOpen?: boolean;
  dn1400FillingOutletOpen?: boolean;
  dn900FillingValveOpen?: boolean;

  // 🔹 Powerhouse alarms
  overpressureValveAlarm?: boolean;
  upsAlarm?: boolean;
  generalShutdownAlarm?: boolean;
}
