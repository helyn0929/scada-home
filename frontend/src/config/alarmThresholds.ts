/**
 * 告警門檻與顏色（介面與主系統 power-plant-scada 的 src/config/alarmThresholds.ts 相同）
 *
 * 本 repo 沒有後端門檻來源，門檻寫在下方 NUMERIC_THRESHOLDS（手機版使用）；
 * 開關型告警沿用「true=嚴重、false=正常」。
 * 現場版若已有門檻，合併時以現場版的本檔取代即可（呼叫端不用改）。
 */
export type AlarmLevel = "normal" | "warning" | "critical";

export const ALARM_COLOR: Record<AlarmLevel, string> = {
  normal: "#06E2F4",
  warning: "#FACC15",
  critical: "#FE0C0C",
};

export interface AlarmThreshold {
  warnAbove?: number;
  critAbove?: number;
  warnBelow?: number;
  critBelow?: number;
}

export interface BoolAlarmRule {
  alarmValue: boolean;
  severity: "warning" | "critical";
}

/**
 * key = TelemetryData 欄位名
 * 數值取自本 repo 桌面元件原本寫死的門檻（TurbineGeneratorGauges、PressureDN900／DN1350、WaterQualityTesting）；
 * 「超出量程即告警」的項目以 critBelow／critAbove 表示。注意：本函式為「大於／小於」，桌面元件部分為「大於等於」。
 */
const NUMERIC_THRESHOLDS: Record<string, AlarmThreshold> = {
  // 電氣（TurbineGeneratorGauges）
  genSpeedRpm: { critBelow: 1080, critAbove: 1205 },
  genSpeedPct: { critBelow: 90 },
  tempWindingU: { warnAbove: 100, critAbove: 120 },
  tempWindingV: { warnAbove: 100, critAbove: 120 },
  tempWindingW: { warnAbove: 100, critAbove: 120 },
  // 水力（TurbineGeneratorGauges：超出儀表量程視為告警）
  discharge_cms: { critBelow: 0, critAbove: 2.5 },
  guideVanePct: { critBelow: 0, critAbove: 100 },
  // 環境（TurbineGeneratorGauges）
  tempControlPanel: { warnAbove: 45, critAbove: 60 },
  tempEnvironment: { warnAbove: 35, critAbove: 40 },
  noiseIndoor: { warnAbove: 85, critAbove: 95 },
  noiseOutdoor: { warnAbove: 70, critAbove: 80 },
  // 管路壓力（PressureDN1350／DN900：低於 5.25 bar 變紅）
  pressureBeforeDn1350: { critBelow: 5.25 },
  pressureAfterDn1350: { critBelow: 5.25 },
  pressureBeforeDn900: { critBelow: 5.25 },
  pressureAfterDn900: { critBelow: 5.25 },
  // 水中含油（WaterQualityTesting：0.49 ppm 以上變紅）
  waterQualityIn: { critAbove: 0.49 },
  waterQualityOut: { critAbove: 0.49 },
};
const BOOL_ALARM_RULES: Record<string, BoolAlarmRule> = {};

/** 依欄位門檻判定告警等級（無門檻定義或無值 → normal） */
export function getAlarmLevel(field: string, value: number | null | undefined): AlarmLevel {
  if (value == null || Number.isNaN(value)) return "normal";
  const t = NUMERIC_THRESHOLDS[field];
  if (!t) return "normal";
  if (t.critAbove != null && value > t.critAbove) return "critical";
  if (t.critBelow != null && value < t.critBelow) return "critical";
  if (t.warnAbove != null && value > t.warnAbove) return "warning";
  if (t.warnBelow != null && value < t.warnBelow) return "warning";
  return "normal";
}

export function getAlarmColor(field: string, value: number | null | undefined): string {
  return ALARM_COLOR[getAlarmLevel(field, value)];
}

/** 開關型告警等級（無資料 → null，由呼叫端顯示 --／灰色） */
export function getBoolAlarmLevel(field: string, value: boolean | null | undefined): AlarmLevel | null {
  if (value == null) return null;
  const rule = BOOL_ALARM_RULES[field];
  if (!rule) return value ? "critical" : "normal";
  return value === rule.alarmValue ? rule.severity : "normal";
}

export type ThresholdsStatus = "loading" | "ready" | "error";

/** 主系統會在這裡向後端載入門檻；本 repo 門檻固定在檔內，直接回 ready */
export function useAlarmThresholds(): ThresholdsStatus {
  return "ready";
}
