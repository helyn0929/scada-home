import { useEffect, useState } from "react";

const FILL_COLOR_NORMAL = "#06E2F4";
const FILL_COLOR_ALARM = "#FE0C0C";
const PRESSURE_MIN = 0;
const PRESSURE_MAX = 10;
/** bar below this (bar) → fill turns red */
const PRESSURE_ALARM_LOW_BAR = 5.25;
const UPDATE_MS = 1100;

/** Shorter, thinner bar track — fits 96px card and aligns with KPI content width */
const BAR_WIDTH = 118;
const BAR_HEIGHT = 10;
const BAR_TOP = 2;
const CHART_HEIGHT = BAR_TOP + BAR_HEIGHT + 3;
const CHART_WIDTH = BAR_WIDTH;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function bump(prev: number, spread: number): number {
  const delta = (Math.random() - 0.5) * spread;
  return clamp(prev + delta, PRESSURE_MIN, PRESSURE_MAX);
}

function PressureBarRow({
  line1,
  line2,
  value,
}: {
  line1: string;
  line2: string;
  value: number;
}) {
  const clamped = clamp(value, PRESSURE_MIN, PRESSURE_MAX);
  const outHigh = value > PRESSURE_MAX;
  const outLow = value < PRESSURE_MIN;
  const outOfRange = outHigh || outLow;
  const fillWidth = (BAR_WIDTH * clamped) / PRESSURE_MAX;
  const fillColor = outOfRange
    ? FILL_COLOR_ALARM
    : clamped < PRESSURE_ALARM_LOW_BAR
      ? FILL_COLOR_ALARM
      : FILL_COLOR_NORMAL;

  return (
    <div className="flex min-w-0 w-full items-start gap-1.5">
      <span className="flex w-[54px] shrink-0 flex-col text-left text-[8px] font-medium leading-[10px] tracking-wide text-white">
        <span>{line1}</span>
        <span>{line2}</span>
      </span>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="block min-w-0 flex-1"
        style={{ height: CHART_HEIGHT }}
        preserveAspectRatio="none"
        aria-hidden
      >
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={CHART_HEIGHT}
            stroke="#FFFFFF"
            strokeWidth={0.85}
          />
          <rect
            x={0}
            y={BAR_TOP}
            width={BAR_WIDTH}
            height={BAR_HEIGHT}
            fill="#D9D9D9"
            rx={1}
          />
          <rect
            x={0}
            y={BAR_TOP}
            width={fillWidth}
            height={BAR_HEIGHT}
            fill={fillColor}
            rx={1}
            style={{
              transition: "width 0.65s ease-out, fill 0.4s ease-out",
            }}
          />
      </svg>
      <div className="flex min-w-0 shrink-0 justify-end pl-0.5">
        <span
          className={`whitespace-nowrap text-right text-xs font-semibold tabular-nums leading-none ${outOfRange ? "text-[#FE0C0C]" : "text-white"}`}
        >
          {outOfRange ? value.toFixed(1) : clamped.toFixed(1)}
          {outOfRange ? (
            <span className="ml-0.5 text-[9px] font-bold text-[#FE0C0C]">
              {outHigh ? "HI" : "LO"}
            </span>
          ) : null}
          <span
            className={`text-[10px] ${outOfRange ? "text-[#FE0C0C]/80" : "text-white/70"}`}
          >
            {" "}
            bar
          </span>
        </span>
      </div>
    </div>
  );
}

export function PressureDN900Title() {
  return (
    <div className="inline-flex w-fit shrink-0 items-center rounded-[9px] bg-[#D9D9D9]/20 px-4 py-1.5 shadow-[inset_0_4px_4px_rgba(0,0,0,0.25)]">
      <span className="whitespace-nowrap font-semibold text-[15px] leading-[18px] text-white">
        Pressure DN900
      </span>
    </div>
  );
}

type PressureDN900Props = {
  hideTitle?: boolean;
  className?: string;
  upstream?: number;
  downstream?: number;
};

export default function PressureDN900({
  hideTitle = false,
  className,
  upstream: liveUpstream,
  downstream: liveDownstream,
}: PressureDN900Props) {
  const [simUpstream, setSimUpstream] = useState(5.2);
  const [simDownstream, setSimDownstream] = useState(4.6);

  useEffect(() => {
    if (liveUpstream !== undefined && liveDownstream !== undefined) return;
    const id = window.setInterval(() => {
      setSimUpstream((v) => bump(v, 0.45));
      setSimDownstream((v) => bump(v, 0.4));
    }, UPDATE_MS);
    return () => window.clearInterval(id);
  }, [liveUpstream, liveDownstream]);

  const pressureBeforeDn900 = liveUpstream ?? simUpstream;
  const pressureAfterDn900 = liveDownstream ?? simDownstream;

  return (
    <div
      className={["flex min-h-[96px] flex-col rounded-[20px] px-3", hideTitle ? "pb-3 pt-0" : "py-3", className].filter(Boolean).join(" ")}
    >
      {!hideTitle ? (
        <div className="mb-1 shrink-0">
          <PressureDN900Title />
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col justify-start gap-2">
        <PressureBarRow line1="Upstream" line2="DN900" value={pressureBeforeDn900} />
        <PressureBarRow line1="Downstream" line2="DN900" value={pressureAfterDn900} />
      </div>
    </div>
  );
}
