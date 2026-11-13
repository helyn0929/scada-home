// 手機版共用的格式化與顏色函式（與元件分開放，符合 react-refresh 規則）
import { ALARM_COLOR, type AlarmLevel } from "@/config/alarmThresholds";
import type { TelemetryData } from "@/features/telemetry/types";
import type { ApiStatus } from "@/features/telemetry/useLiveTelemetry";
import type { MobileTheme } from "./useMobileLayout";

/** 數值為 null／undefined／NaN → "--"；0 是有效值 */
export function fmt(value: number | null | undefined, digits: number): string {
  if (value == null || Number.isNaN(value)) return "--";
  return Number(value).toFixed(digits);
}

/**
 * 告警等級的文字色：深色直接用 ALARM_COLOR；
 * 淺色底上 ALARM_COLOR 的黃／紅對比不足，改用同色系加深版本（§10 允許）
 */
const LIGHT_LEVEL_TEXT: Record<AlarmLevel, string> = {
  normal: "#0E7490",
  warning: "#A16207",
  critical: "#B91C1C",
};

/** 數值文字色：正常 → 主文字色；警告／嚴重 → 告警色 */
export function valueColor(level: AlarmLevel, theme: MobileTheme): string | undefined {
  if (level === "normal") return undefined;
  return theme === "light" ? LIGHT_LEVEL_TEXT[level] : ALARM_COLOR[level];
}

export function levelTextColor(level: AlarmLevel, theme: MobileTheme): string {
  return theme === "light" ? LIGHT_LEVEL_TEXT[level] : ALARM_COLOR[level];
}

/** 分頁共用：資料中斷時所有數值顯示 --（§9） */
export function visibleData(data: TelemetryData | null, status: ApiStatus): TelemetryData | null {
  return status === "down" ? null : data;
}
