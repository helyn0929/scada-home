import React, { useEffect, useState } from "react";

const NEEDLE_COLOR = "#06E2F4";
const NEEDLE_COLOR_ALARM = "#FE0C0C";
/** Gen RPM below this → needle/value alarm (red) */
const ALARM_RPM_BELOW = 1080;
/** Gen speed (%) below this → alarm (red) */
const ALARM_SPEED_PCT_BELOW = 90;
/** Wicket gate opening valid span 0–100%; outside → alarm (red) */
const WICKET_OPEN_MIN = 0;
const WICKET_OPEN_MAX = 100;

/** Semicircular tick dial (84×52) — provided design */
const DIAL_VIEWBOX = "0 0 84 52";
const DIAL_TICK_PATH =
  "M7.21436 42.8963H2M10.0144 48.6619L2.60923 49.9979M10.0144 37.1286L2.60923 35.7946M13.8728 26.2936L7.36 22.4471M21.1241 17.4575L16.2892 11.566M30.8923 11.6919L28.32 4.46439M42 9.68889V2M53.1097 11.6919L55.6821 4.46649M62.878 17.4596L67.7128 11.566M70.1272 26.2936L76.6421 22.4492M73.9856 37.1306L81.3908 35.7967M73.9856 48.664L81.3908 50M9.31077 30.7316L4.41231 28.9069M15.3538 20.0351L11.3579 16.6081M24.6051 12.0946L22 7.47828M35.959 7.87049L35.0544 2.62082M48.041 7.87049L48.9456 2.62082M59.3949 12.0946L62 7.47828M68.6462 20.0351L72.6421 16.6081M74.6892 30.7316L79.5877 28.9069M76.7856 42.8963H82";

/** Pivot + needle sweep (math angles from +x, CCW; SVG y-down) */
const DIAL_CX = 42;
const DIAL_CY = 46;
const NEEDLE_LEN = 30;
/** t=0 → left side of arc, t=1 → right side */
const ANGLE_START_DEG = 152;
const ANGLE_END_DEG = 28;

const UPDATE_MS = 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function bump(prev: number, min: number, max: number, spread: number): number {
  const delta = (Math.random() - 0.5) * spread;
  return clamp(prev + delta, min, max);
}

function TurbineGaugeDial({
  value,
  min,
  max,
  label,
  unit,
  formatValue,
  alarm,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  formatValue: (v: number) => string;
  /** When true, needle and reading use alarm red */
  alarm?: boolean;
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

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-col items-center justify-center gap-1">
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
            style={{
              fontVariantNumeric: "tabular-nums",
              transition: "fill 0.4s ease-out",
            }}
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
      {/* Match Temperature subsection labels: text-[11px] leading-[14px] font-semibold */}
      <span className="max-w-[120px] text-center text-[12px] font-semibold leading-[15px] text-white">
        {label}
      </span>
      {outOfRange ? (
        <span className="text-[8px] font-bold leading-none text-[#FE0C0C]">
          {value > max ? "HI" : "LO"}
        </span>
      ) : null}
    </div>
  );
}

export default function TurbineGeneratorGauges() {
  const [waterCms, setWaterCms] = useState(1.2);
  const [wicketPct, setWicketPct] = useState(42);
  const [speedRpm, setSpeedRpm] = useState(720);
  const [speedPct, setSpeedPct] = useState(98);

  useEffect(() => {
    const id = window.setInterval(() => {
      setWaterCms((v) => bump(v, 0, 3, 0.35));
      /* Slightly wider mock span so >100% / <0% alarms can appear; live data replaces this */
      setWicketPct((v) => bump(v, -4, 104, 12));
      setSpeedRpm((v) => bump(v, 0, 1200, 80));
      setSpeedPct((v) => bump(v, 0, 200, 15));
    }, UPDATE_MS);
    return () => window.clearInterval(id);
  }, []);

  const pairClass =
    "grid h-full min-h-0 min-w-0 flex-1 grid-cols-2 gap-2 place-items-center px-3 py-1 rounded-[14px] bg-[#D9D9D9]/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]";

  return (
    <div className="inline-flex h-[96px] min-h-[96px] max-h-[96px] w-[480px] min-w-[480px] max-w-[480px] shrink-0 items-stretch gap-2">
      <div className={pairClass}>
        <TurbineGaugeDial
          value={waterCms}
          min={0}
          max={3}
          label="Water flow"
          unit="cms"
          formatValue={(v) => v.toFixed(2)}
        />
        <TurbineGaugeDial
          value={wicketPct}
          min={WICKET_OPEN_MIN}
          max={WICKET_OPEN_MAX}
          label="Wicket gate"
          unit="%"
          formatValue={(v) => v.toFixed(0)}
          alarm={
            wicketPct > WICKET_OPEN_MAX || wicketPct < WICKET_OPEN_MIN
          }
        />
      </div>
      <div className={pairClass}>
        <TurbineGaugeDial
          value={speedRpm}
          min={0}
          max={1200}
          label="Gen RPM"
          unit="rpm"
          formatValue={(v) => v.toFixed(0)}
          alarm={speedRpm < ALARM_RPM_BELOW}
        />
        <TurbineGaugeDial
          value={speedPct}
          min={0}
          max={200}
          label="Gen speed"
          unit="%"
          formatValue={(v) => v.toFixed(0)}
          alarm={speedPct < ALARM_SPEED_PCT_BELOW}
        />
      </div>
    </div>
  );
}
