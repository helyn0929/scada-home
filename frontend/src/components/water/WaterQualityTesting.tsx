import React, { useEffect, useState } from "react";

const FILL_COLOR_NORMAL = "#06E2F4";
const FILL_COLOR_ALARM = "#FE0C0C";
const VALUE_MIN = 0;
const VALUE_MAX = 10;
/** ppm at or above → bar turns red */
const PPM_ALARM_AT = 5;
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
  const outHigh = value > VALUE_MAX;
  const outLow = value < VALUE_MIN;
  const outOfRange = outHigh || outLow;
  const fillWidth = (BAR_WIDTH * clamped) / VALUE_MAX;
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
        className="block h-auto min-w-0 flex-1 max-w-[92px]"
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        preserveAspectRatio="xMidYMid meet"
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
        Water Quality
      </span>
    </div>
  );
}

type WaterQualityTestingProps = {
  hideTitle?: boolean;
  waterQualityIn?: number;
  waterQualityOut?: number;
};

export default function WaterQualityTesting({
  hideTitle = false,
  waterQualityIn,
  waterQualityOut,
}: WaterQualityTestingProps) {
  const [ppmBeforeDn900, setPpmBeforeDn900] = useState(3.8);
  const [ppmAfterDn1400d, setPpmAfterDn1400d] = useState(2.4);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPpmBeforeDn900((v) => waterQualityIn != null ? waterQualityIn : bump(v, 0.35));
      setPpmAfterDn1400d((v) => waterQualityOut != null ? waterQualityOut : bump(v, 0.3));
    }, UPDATE_MS);
    return () => window.clearInterval(id);
  }, [waterQualityIn, waterQualityOut]);

  return (
    <div
      className={`flex min-h-[96px] w-[240px] shrink-0 flex-col rounded-[20px] px-3 ${hideTitle ? "pb-3 pt-0" : "py-3"}`}
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
