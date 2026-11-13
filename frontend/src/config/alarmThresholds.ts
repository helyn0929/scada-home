/**
 * 告警門檻與顏色（介面與主系統 power-plant-scada 的 src/config/alarmThresholds.ts 相同）
 *
 * 本 repo 目前沒有門檻來源：NUMERIC_THRESHOLDS／BOOL_ALARM_RULES 為空，
 * 所有數值一律 normal（正常色），開關型告警沿用「true=嚴重、false=正常」。
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

/** key = TelemetryData 欄位名 */
const NUMERIC_THRESHOLDS: Record<string, AlarmThreshold> = {};
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
