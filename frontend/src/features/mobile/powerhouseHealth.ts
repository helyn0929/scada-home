// 廠房健康燈（水力／電氣／環境）判斷與功率因數計算——自主系統 power-plant-scada 搬來，邏輯未變
import { getAlarmLevel } from "@/config/alarmThresholds";

export type HealthLevel = "normal" | "warning" | "alarm" | "unknown";

export function worstLevel(...levels: HealthLevel[]): HealthLevel {
  if (levels.includes("alarm")) return "alarm";
  if (levels.includes("warning")) return "warning";
  if (levels.every(l => l === "unknown")) return "unknown";
  return "normal";
}

/**
 * 讀門檻並轉為健康燈等級（無資料 → unknown）
 * 主系統：門檻一律來自 alarm_rules（見 config/alarmThresholds.ts），沒有規則的欄位視為 normal。
 * scada-home 原本對噪音寫死 90/100、75/85 dB，對流量以儀表量程判 alarm；兩者皆非官方規則，已移除。
 */
export function healthOf(field: string, v: number | null | undefined): HealthLevel {
  if (v == null) return "unknown";
  const level = getAlarmLevel(field, v);
  return level === "critical" ? "alarm" : level;
}

export interface PowerhouseHealthInput {
  discharge_cms?: number | null;
  guideVanePct?: number | null;
  genSpeedRpm?: number | null;
  genSpeedPct?: number | null;
  tempWindingU?: number | null;
  tempWindingV?: number | null;
  tempWindingW?: number | null;
  noiseIndoor?: number | null;
  noiseOutdoor?: number | null;
  tempControlPanel?: number | null;
  tempEnvironment?: number | null;
}

/** 門檻全數來自 alarm_rules（見 config/alarmThresholds.ts） */
export function computePowerhouseHealth(t: PowerhouseHealthInput | null | undefined) {
  return {
    hydraulic: worstLevel(
      healthOf("discharge_cms", t?.discharge_cms),
      healthOf("guideVanePct", t?.guideVanePct),
    ),
    electrical: worstLevel(
      healthOf("genSpeedRpm", t?.genSpeedRpm),
      healthOf("genSpeedPct", t?.genSpeedPct),
      healthOf("tempWindingU", t?.tempWindingU),
      healthOf("tempWindingV", t?.tempWindingV),
      healthOf("tempWindingW", t?.tempWindingW),
    ),
    environment: worstLevel(
      healthOf("noiseIndoor", t?.noiseIndoor),
      healthOf("noiseOutdoor", t?.noiseOutdoor),
      healthOf("tempControlPanel", t?.tempControlPanel),
      healthOf("tempEnvironment", t?.tempEnvironment),
    ),
  };
}

/** 功率因數 P.F = P / S（限制在 -1～1；S 為 0 或無值 → null）——同桌面 GeneratorPower */
export function calcPowerFactor(
  apparentPowerS: number | null | undefined,
  activePowerP: number | null | undefined
): number | null {
  const s = apparentPowerS ?? 0;
  const p = activePowerP ?? 0;
  return s !== 0 && !Number.isNaN(s) ? Math.max(-1, Math.min(1, p / s)) : null;
}
