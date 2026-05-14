import { useEffect, useRef, useState } from "react";
import type { TurbineScenePresetId } from "@/components/three/turbineScenePresets";

const NEEDLE_COLOR = "#06E2F4";
const NEEDLE_COLOR_ALARM = "#FE0C0C";
const ALARM_RPM_BELOW = 1080;
const ALARM_RPM_ABOVE = 1205;
const ALARM_SPEED_PCT_BELOW = 90;
const WICKET_OPEN_MIN = 0;
const WICKET_OPEN_MAX = 100;

const WATER_FLOW_MIN = 0;
const WATER_FLOW_MAX = 2.5;
const GEN_RPM_MIN = 900;
const GEN_RPM_MAX = 1205;
const GEN_SPEED_PCT_MIN = 80;
const GEN_SPEED_PCT_MAX = 120;

// Health thresholds
const WINDING_TEMP_WARN = 100;
const WINDING_TEMP_ALARM = 120;
const CTRL_PANEL_TEMP_WARN = 45;
const CTRL_PANEL_TEMP_ALARM = 60;
const AMBIENT_TEMP_WARN = 35;
const AMBIENT_TEMP_ALARM = 40;
const NOISE_INDOOR_WARN = 85;
const NOISE_INDOOR_ALARM = 95;
const NOISE_OUTDOOR_WARN = 70;
const NOISE_OUTDOOR_ALARM = 80;

/** Semicircular tick dial (84×52) — provided design */
const DIAL_VIEWBOX = "0 0 84 52";
const DIAL_TICK_PATH =
  "M7.21436 42.8963H2M10.0144 48.6619L2.60923 49.9979M10.0144 37.1286L2.60923 35.7946M13.8728 26.2936L7.36 22.4471M21.1241 17.4575L16.2892 11.566M30.8923 11.6919L28.32 4.46439M42 9.68889V2M53.1097 11.6919L55.6821 4.46649M62.878 17.4596L67.7128 11.566M70.1272 26.2936L76.6421 22.4492M73.9856 37.1306L81.3908 35.7967M73.9856 48.664L81.3908 50M9.31077 30.7316L4.41231 28.9069M15.3538 20.0351L11.3579 16.6081M24.6051 12.0946L22 7.47828M35.959 7.87049L35.0544 2.62082M48.041 7.87049L48.9456 2.62082M59.3949 12.0946L62 7.47828M68.6462 20.0351L72.6421 16.6081M74.6892 30.7316L79.5877 28.9069M76.7856 42.8963H82";

const DIAL_CX = 42;
const DIAL_CY = 46;
const NEEDLE_LEN = 30;
const ANGLE_START_DEG = 152;
const ANGLE_END_DEG = 28;

const UPDATE_MS = 1000;

// ── Health level helpers ──────────────────────────────────────────────────────

export type HealthLevel = "normal" | "warning" | "alarm";

const STATUS_COLOR: Record<HealthLevel, string> = {
  normal: "#06E2F4",
  warning: "#FACC15",
  alarm: "#FE0C0C",
};

const STATUS_LABEL: Record<HealthLevel, string> = {
  normal: "Normal",
  warning: "Warning",
  alarm: "Alarm",
};

function worstLevel(...levels: HealthLevel[]): HealthLevel {
  if (levels.includes("alarm")) return "alarm";
  if (levels.includes("warning")) return "warning";
  return "normal";
}

function thresholdLevel(v: number | undefined, warnAt: number, alarmAt: number): HealthLevel {
  if (v == null) return "normal";
  if (v >= alarmAt) return "alarm";
  if (v >= warnAt) return "warning";
  return "normal";
}

// ── Telemetry prop type ───────────────────────────────────────────────────────

export interface TurbineGaugeTelemetry {
  tempWindingU?: number;
  tempWindingV?: number;
  tempWindingW?: number;
  noiseIndoor?: number;
  noiseOutdoor?: number;
  tempControlPanel?: number;
  tempEnvironment?: number;
  waterFlowCms?: number;
  wicketGatePct?: number;
  genRpm?: number;
  genSpeedPct?: number;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function bump(prev: number, min: number, max: number, spread: number): number {
  const delta = (Math.random() - 0.5) * spread;
  return clamp(prev + delta, min, max);
}

function HealthCell({ label, level }: { label: string; level: HealthLevel }) {
  const color = STATUS_COLOR[level];
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] font-semibold text-white leading-none">{label}</span>
      <div className="flex items-center gap-1.5">
        <span
          className="text-[10px] font-semibold leading-none"
          style={{ color, transition: "color 0.4s" }}
        >
          {STATUS_LABEL[level]}
        </span>
        <div
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}`, transition: "background-color 0.4s, box-shadow 0.4s" }}
        />
      </div>
    </div>
  );
}

function AlarmCell({ label, alarm }: { label: string; alarm?: boolean }) {
  const color = alarm ? "#FE0C0C" : "#06E2F4";
  return (
    <div className="flex items-center justify-end gap-1">
      <span className="text-[9px] font-medium leading-none text-white/50 whitespace-nowrap">
        {label}
      </span>
      <span
        className="text-[10px] font-bold leading-none"
        style={{ color, transition: "color 0.4s" }}
      >
        {alarm ? "ON" : "OFF"}
      </span>
      <div
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}`, transition: "background-color 0.4s, box-shadow 0.4s" }}
      />
    </div>
  );
}

export function PowerhouseStatusPanel({
  hydraulic,
  electrical,
  environment,
  overpressureAlarm,
  upsAlarm,
  generalShutdownAlarm,
  className = "",
}: {
  hydraulic: HealthLevel;
  electrical: HealthLevel;
  environment: HealthLevel;
  overpressureAlarm?: boolean;
  upsAlarm?: boolean;
  generalShutdownAlarm?: boolean;
  className?: string;
}) {
  return (
    <div className={["flex min-h-0 flex-col items-stretch justify-between rounded-[14px] bg-[#D9D9D9]/20 px-3 py-2.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]", className].join(" ")}>
      <div className="mb-1 shrink-0 flex justify-center">
        <span className="whitespace-nowrap font-semibold text-[15px] leading-[18px] text-white">
          Powerhouse Status Overview
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-[6px]">
        <HealthCell label="Hydraulic"   level={hydraulic} />
        <AlarmCell  label="Overpressure alarm" alarm={overpressureAlarm} />
        <HealthCell label="Electrical"  level={electrical} />
        <AlarmCell  label="UPS alarm"         alarm={upsAlarm} />
        <HealthCell label="Environment" level={environment} />
        <AlarmCell  label="General shutdown"  alarm={generalShutdownAlarm} />
      </div>
    </div>
  );
}

function TurbineGaugeDial({
  value,
  min,
  max,
  label,
  unit,
  formatValue,
  alarm,
  onActivate,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  formatValue: (v: number) => string;
  alarm?: boolean;
  onActivate?: () => void;
}) {
  const clamped = clamp(value, min, max);
  const outOfRange = value < min || value > max;
  const display = outOfRange ? formatValue(value) : formatValue(clamped);
  const t = Math.max(0, Math.min(1, (clamped - min) / (max - min)));
  const span = ANGLE_START_DEG - ANGLE_END_DEG;
  const angleDeg = ANGLE_START_DEG - t * span;
  const rad = (angleDeg * Math.PI) / 180;
  const nx = DIAL_CX + NEEDLE_LEN * Math.cos(rad);
  const ny = DIAL_CY - NEEDLE_LEN * Math.sin(rad);
  const alarmVisual = Boolean(alarm) || outOfRange;
  const accent = alarmVisual ? NEEDLE_COLOR_ALARM : NEEDLE_COLOR;
  const valueFill = alarmVisual ? NEEDLE_COLOR_ALARM : "#FFFFFF";
  const unitFill = alarmVisual ? "rgba(254,12,12,0.85)" : "rgba(255,255,255,0.78)";
  const interactive = Boolean(onActivate);

  return (
    <div
      className={[
        "flex min-h-0 w-full min-w-0 flex-col items-center justify-center gap-1",
        interactive
          ? "cursor-pointer rounded-md outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#06E2F4]"
          : "",
      ].join(" ")}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? () => onActivate?.() : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate?.();
              }
            }
          : undefined
      }
    >
      <div className="flex h-[58px] w-[94px] shrink-0 items-center justify-center">
        <svg
          width={84}
          height={52}
          viewBox={DIAL_VIEWBOX}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="block h-full w-full max-h-[58px] max-w-[94px]"
          preserveAspectRatio="xMidYMid meet"
        >
          <path
            d={DIAL_TICK_PATH}
            stroke="white"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1={DIAL_CX}
            y1={DIAL_CY}
            x2={nx}
            y2={ny}
            stroke={accent}
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ transition: "stroke 0.4s ease-out" }}
          />
          <circle
            cx={DIAL_CX}
            cy={DIAL_CY}
            r={3}
            fill={accent}
            style={{ transition: "fill 0.4s ease-out" }}
          />
          <text
            x={42}
            y={35}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={valueFill}
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="14"
            fontWeight={600}
            style={{ fontVariantNumeric: "tabular-nums", transition: "fill 0.4s ease-out" }}
          >
            {display}
          </text>
          <text
            x={42}
            y={46.5}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={unitFill}
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="12"
            fontWeight={500}
            style={{ transition: "fill 0.4s ease-out" }}
          >
            {unit}
          </text>
        </svg>
      </div>
      <span className="max-w-[120px] text-center text-[12px] font-semibold leading-[15px] text-white">
        {label}
      </span>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export type TurbineGaugeScene = Exclude<TurbineScenePresetId, "default">;

export default function TurbineGeneratorGauges({
  onFocusScene,
  telemetry,
  hidePanel = false,
  onHealthChange,
}: {
  onFocusScene?: (scene: TurbineGaugeScene) => void;
  telemetry?: TurbineGaugeTelemetry;
  hidePanel?: boolean;
  onHealthChange?: (hydraulic: HealthLevel, electrical: HealthLevel, environment: HealthLevel) => void;
}) {
  const [simWaterCms, setSimWaterCms] = useState(1.2);
  const [simWicketPct, setSimWicketPct] = useState(42);
  const [simSpeedRpm, setSimSpeedRpm] = useState(720);
  const [simSpeedPct, setSimSpeedPct] = useState(98);

  const hasLiveGauges =
    telemetry?.waterFlowCms !== undefined ||
    telemetry?.wicketGatePct !== undefined ||
    telemetry?.genRpm !== undefined ||
    telemetry?.genSpeedPct !== undefined;

  useEffect(() => {
    if (hasLiveGauges) return;
    const id = window.setInterval(() => {
      setSimWaterCms((v) => bump(v, WATER_FLOW_MIN, WATER_FLOW_MAX, 0.25));
      setSimWicketPct((v) => bump(v, -4, 104, 12));
      setSimSpeedRpm((v) => bump(v, GEN_RPM_MIN - 80, GEN_RPM_MAX + 80, 45));
      setSimSpeedPct((v) => bump(v, GEN_SPEED_PCT_MIN - 10, GEN_SPEED_PCT_MAX + 10, 4));
    }, UPDATE_MS);
    return () => window.clearInterval(id);
  }, [hasLiveGauges]);

  const waterCms = telemetry?.waterFlowCms ?? simWaterCms;
  const wicketPct = telemetry?.wicketGatePct ?? simWicketPct;
  const speedRpm = telemetry?.genRpm ?? simSpeedRpm;
  const speedPct = telemetry?.genSpeedPct ?? simSpeedPct;

  // ── Health computation ──────────────────────────────────────────────────────
  const hydraulicHealth = worstLevel(
    waterCms < WATER_FLOW_MIN || waterCms > WATER_FLOW_MAX ? "alarm" : "normal",
    wicketPct < WICKET_OPEN_MIN || wicketPct > WICKET_OPEN_MAX ? "alarm" : "normal",
  );

  const electricalHealth = worstLevel(
    speedRpm < ALARM_RPM_BELOW || speedRpm > ALARM_RPM_ABOVE ? "alarm" : "normal",
    speedPct < ALARM_SPEED_PCT_BELOW ? "alarm" : "normal",
    thresholdLevel(telemetry?.tempWindingU, WINDING_TEMP_WARN, WINDING_TEMP_ALARM),
    thresholdLevel(telemetry?.tempWindingV, WINDING_TEMP_WARN, WINDING_TEMP_ALARM),
    thresholdLevel(telemetry?.tempWindingW, WINDING_TEMP_WARN, WINDING_TEMP_ALARM),
  );

  const environmentHealth = worstLevel(
    thresholdLevel(telemetry?.noiseIndoor, NOISE_INDOOR_WARN, NOISE_INDOOR_ALARM),
    thresholdLevel(telemetry?.noiseOutdoor, NOISE_OUTDOOR_WARN, NOISE_OUTDOOR_ALARM),
    thresholdLevel(telemetry?.tempControlPanel, CTRL_PANEL_TEMP_WARN, CTRL_PANEL_TEMP_ALARM),
    thresholdLevel(telemetry?.tempEnvironment, AMBIENT_TEMP_WARN, AMBIENT_TEMP_ALARM),
  );

  // Notify parent whenever health changes (stable ref avoids dep-array churn)
  const onHealthChangeRef = useRef(onHealthChange);
  useEffect(() => { onHealthChangeRef.current = onHealthChange; });
  useEffect(() => {
    onHealthChangeRef.current?.(hydraulicHealth, electricalHealth, environmentHealth);
  }, [hydraulicHealth, electricalHealth, environmentHealth]);

  const pairClass =
    "grid h-full min-h-0 w-[236px] min-w-[236px] shrink-0 grid-cols-2 gap-2 place-items-center px-3 py-1 rounded-[14px] bg-[#D9D9D9]/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]";

  return (
    <div className={["flex h-[96px] min-h-[96px] max-h-[96px] shrink-0 items-stretch gap-2", hidePanel ? "w-fit" : "w-full min-w-0"].join(" ")}>
      <div className={pairClass}>
        <TurbineGaugeDial
          value={waterCms}
          min={WATER_FLOW_MIN}
          max={WATER_FLOW_MAX}
          label="Water flow"
          unit="cms"
          formatValue={(v) => v.toFixed(2)}
          onActivate={onFocusScene ? () => onFocusScene("hydraulic") : undefined}
        />
        <TurbineGaugeDial
          value={wicketPct}
          min={WICKET_OPEN_MIN}
          max={WICKET_OPEN_MAX}
          label="Wicket gate"
          unit="%"
          formatValue={(v) => v.toFixed(0)}
          alarm={wicketPct > WICKET_OPEN_MAX || wicketPct < WICKET_OPEN_MIN}
          onActivate={onFocusScene ? () => onFocusScene("hydraulic") : undefined}
        />
      </div>
      <div className={pairClass}>
        <TurbineGaugeDial
          value={speedRpm}
          min={GEN_RPM_MIN}
          max={GEN_RPM_MAX}
          label="Gen RPM"
          unit="rpm"
          formatValue={(v) => v.toFixed(0)}
          alarm={speedRpm < ALARM_RPM_BELOW || speedRpm > ALARM_RPM_ABOVE}
          onActivate={onFocusScene ? () => onFocusScene("generator") : undefined}
        />
        <TurbineGaugeDial
          value={speedPct}
          min={GEN_SPEED_PCT_MIN}
          max={GEN_SPEED_PCT_MAX}
          label="Gen speed"
          unit="%"
          formatValue={(v) => v.toFixed(0)}
          alarm={speedPct < ALARM_SPEED_PCT_BELOW}
          onActivate={onFocusScene ? () => onFocusScene("generator") : undefined}
        />
      </div>
      {!hidePanel && (
        <PowerhouseStatusPanel
          hydraulic={hydraulicHealth}
          electrical={electricalHealth}
          environment={environmentHealth}
          className="flex-1 h-full"
        />
      )}
    </div>
  );
}
