import React from "react";

const GAUGE_COLOR = "#06E2F4";
const TRACK_COLOR = "rgba(255,255,255,0.35)";

type GeneratorPowerProps = {
  /** Apparent power, kVA, -2000 to +2000 */
  apparentPowerS?: number | null;
  /** Active power, kW, -2000 to +2000 */
  activePowerP?: number | null;
  /** Reactive power, kvar, -2000 to +2000 */
  reactivePowerQ?: number | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Progress 0..1 from min to max; value outside range is clamped. */
function toProgress(value: number | undefined | null, min: number, max: number): number {
  if (value === undefined || value === null || Number.isNaN(value)) return 0;
  const c = clamp(value, min, max);
  return (c - min) / (max - min);
}

/** Semicircular arc gauge for range [min, max]. Progress starts at beginning of arc and extends to value; rounded cap. */
function PowerGaugeArc({
  value,
  min,
  max,
  label,
  unit,
  formatValue,
}: {
  value: number | undefined | null;
  min: number;
  max: number;
  label: string;
  unit: string;
  formatValue: (v: number) => string;
}) {
  const progress = toProgress(value, min, max);
  const clampedValue =
    value !== undefined && value !== null && !Number.isNaN(value)
      ? clamp(value, min, max)
      : null;
  const display = clampedValue !== null ? formatValue(clampedValue) : "--";

  const r = 36;
  const cx = 43.5;
  const cy = 78.25;
  // Bottom semicircle: left (cx-r, cy) to right (cx+r, cy)
  const pathD = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const pathLength = 100;
  const progressLength = progress * pathLength;
  const gapLength = pathLength - progressLength;

  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <span className="text-[11px] leading-[14px] font-semibold text-white">
        {label}
      </span>
      <div className="w-[87px] h-[52px] flex items-center justify-center relative">
        <svg
          viewBox="0 42 87 48"
          className="w-full h-full block"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Track: full semicircle */}
          <path
            d={pathD}
            fill="none"
            stroke={TRACK_COLOR}
            strokeWidth={8}
            strokeLinecap="butt"
          />
          {/* Progress: from start of arc to value; rounded cap */}
          <path
            d={pathD}
            fill="none"
            stroke={GAUGE_COLOR}
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={pathLength}
            strokeDasharray={`${progressLength} ${gapLength}`}
            strokeDashoffset={0}
            style={{ transition: "stroke-dasharray 0.3s ease-out" }}
          />
        </svg>
      </div>
      <span className="text-[11px] leading-[14px] font-semibold text-white tabular-nums">
        {display}
        {unit ? (
          <span className="text-[10px] text-white/70 font-normal ml-0.5">
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export default function GeneratorPower({
  apparentPowerS,
  activePowerP,
  reactivePowerQ,
}: GeneratorPowerProps) {
  const s = apparentPowerS ?? 0;
  const p = activePowerP ?? 0;
  const pf =
    s !== 0 && !Number.isNaN(s)
      ? clamp(p / s, -1, 1)
      : (null as number | null);

  return (
    <div className="flex-1 min-w-[380px] w-full max-w-[480px] h-[158px] rounded-[20px] bg-[#D9D9D9]/15 px-4 py-3 flex flex-col overflow-hidden">
      {/* Title bar — same style as other cards */}
      <div className="shrink-0 mb-3 w-full rounded-[9px] bg-[#D9D9D9]/20 shadow-[inset_0_4px_4px_rgba(0,0,0,0.25)] px-4 py-1.5 flex items-center">
        <span className="font-semibold text-[15px] leading-[18px] text-white">
          Generator Power
        </span>
      </div>

      {/* Four gauges in a row: S, P, Q, P.F */}
      <div className="flex-1 min-h-0 flex flex-row items-center justify-between gap-2">
        <PowerGaugeArc
          value={apparentPowerS}
          min={-2000}
          max={2000}
          label="S"
          unit="kVA"
          formatValue={(v) => v.toFixed(0)}
        />
        <PowerGaugeArc
          value={activePowerP}
          min={-2000}
          max={2000}
          label="P"
          unit="kW"
          formatValue={(v) => v.toFixed(0)}
        />
        <PowerGaugeArc
          value={reactivePowerQ}
          min={-2000}
          max={2000}
          label="Q"
          unit="kvar"
          formatValue={(v) => v.toFixed(0)}
        />
        <PowerGaugeArc
          value={pf}
          min={-1}
          max={1}
          label="P.F"
          unit=""
          formatValue={(v) => v.toFixed(2)}
        />
      </div>
    </div>
  );
}
