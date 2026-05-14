import { useEffect, useState } from "react";

const FILL_COLOR_NORMAL = "#06E2F4";
const FILL_COLOR_ALARM = "#FE0C0C";
// Oil-in-water display range (ppm)
const VALUE_MIN = 0.1;
const VALUE_MAX = 0.5;
/** ppm at or above → bar turns red */
const PPM_ALARM_AT = 0.49;
/** Only show HI/LO if the reading is truly implausible (not just above display max). */
const SENSOR_MIN = 0.1;
const SENSOR_MAX = 0.5;
const UPDATE_MS = 1000;

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
  return clamp(prev + delta, VALUE_MIN, VALUE_MAX);
}

function QualityBarRow({
  line1,
  line2,
  value,
  unit,
}: {
  line1: string;
  line2: string;
  value: number;
  unit: string;
}) {
  const clamped = clamp(value, VALUE_MIN, VALUE_MAX);
  const outHigh = value > SENSOR_MAX;
  const outLow = value < SENSOR_MIN;
  const outOfRange = outHigh || outLow;
  const denom = VALUE_MAX - VALUE_MIN;
  const frac = denom <= 0 ? 0 : (clamped - VALUE_MIN) / denom;
  const fillWidth = BAR_WIDTH * clamp(frac, 0, 1);
  const alarmFrac =
    denom <= 0 ? 1 : (PPM_ALARM_AT - VALUE_MIN) / denom;
  const alarmX = BAR_WIDTH * clamp(alarmFrac, 0, 1);
  const fillColor = outOfRange
    ? FILL_COLOR_ALARM
    : clamped >= PPM_ALARM_AT
      ? FILL_COLOR_ALARM
      : FILL_COLOR_NORMAL;

  return (
    <div className="flex min-w-0 w-full items-start gap-1.5">
      <span className="flex w-[54px] shrink-0 flex-col text-left text-[8px] font-semibold leading-[10px] tracking-wide text-white">
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
        {/* Alarm threshold marker (e.g. 10 ppm) */}
        <line
          x1={alarmX}
          y1={BAR_TOP - 1}
          x2={alarmX}
          y2={BAR_TOP + BAR_HEIGHT + 1}
          stroke={FILL_COLOR_ALARM}
          strokeWidth={1.2}
          opacity={0.9}
          shapeRendering="crispEdges"
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
            {unit}
          </span>
        </span>
      </div>
    </div>
  );
}

export function WaterQualityTestingTitle() {
  return (
    <div className="inline-flex w-fit shrink-0 items-center rounded-[9px] bg-[#D9D9D9]/20 px-4 py-1.5 shadow-[inset_0_4px_4px_rgba(0,0,0,0.25)]">
      <span className="whitespace-nowrap font-semibold text-[15px] leading-[18px] text-white">
        Oil in Water
      </span>
    </div>
  );
}

type WaterQualityTestingProps = {
  hideTitle?: boolean;
  className?: string;
  beforeDn900?: number;
  afterDn1400d?: number;
};

export default function WaterQualityTesting({
  hideTitle = false,
  className,
  beforeDn900: liveBefore,
  afterDn1400d: liveAfter,
}: WaterQualityTestingProps) {
  const [simBefore, setSimBefore] = useState(0.22);
  const [simAfter, setSimAfter] = useState(0.18);

  useEffect(() => {
    if (liveBefore !== undefined && liveAfter !== undefined) return;
    const id = window.setInterval(() => {
      setSimBefore((v) => bump(v, 0.06));
      setSimAfter((v) => bump(v, 0.06));
    }, UPDATE_MS);
    return () => window.clearInterval(id);
  }, [liveBefore, liveAfter]);

  const ppmBeforeDn900 = liveBefore ?? simBefore;
  const ppmAfterDn1400d = liveAfter ?? simAfter;

  return (
    <div
      className={["flex min-h-[96px] flex-col rounded-[20px] px-3", hideTitle ? "pb-3 pt-0" : "py-3", className].filter(Boolean).join(" ")}
    >
      {!hideTitle ? (
        <div className="mb-1 shrink-0">
          <WaterQualityTestingTitle />
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col justify-start gap-2">
        <QualityBarRow
          line1="Before"
          line2="DN900"
          value={ppmBeforeDn900}
          unit="ppm"
        />
        <QualityBarRow
          line1="After"
          line2="DN1400D"
          value={ppmAfterDn1400d}
          unit="ppm"
        />
      </div>
    </div>
  );
}
