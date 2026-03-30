import React from "react";

type NoiseMonitoringProps = {
  indoorNoise: number | undefined | null;
  outdoorNoise: number | undefined | null;
};

function clampNoise(value: number | undefined | null): number {
  if (value === undefined || value === null || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function formatNoise(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  const clamped = clampNoise(value);
  return clamped.toFixed(0);
}

/* Single SVG chart:
   - One vertical white baseline (Line 2) at x=0, spanning full height
   - Two Rectangle 30 bars (187×18 #D9D9D9) starting from that baseline
   - Cyan fills proportional to indoor / outdoor noise
*/
const BAR_WIDTH = 187;
const BAR_HEIGHT = 18;
const BAR_GAP = 8;
const TOP_MARGIN = 4;
const BOTTOM_MARGIN = 4;
const BAR1_Y = TOP_MARGIN;
const BAR2_Y = TOP_MARGIN + BAR_HEIGHT + BAR_GAP;
const CHART_HEIGHT = BAR2_Y + BAR_HEIGHT + BOTTOM_MARGIN;
const CHART_WIDTH = BAR_WIDTH;

interface NoiseChartProps {
  indoor: number | undefined | null;
  outdoor: number | undefined | null;
}

function NoiseChart({ indoor, outdoor }: NoiseChartProps) {
  const indoorClamped = clampNoise(indoor);
  const outdoorClamped = clampNoise(outdoor);
  const indoorWidth = (BAR_WIDTH * indoorClamped) / 100;
  const outdoorWidth = (BAR_WIDTH * outdoorClamped) / 100;

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="w-full max-w-[140px] max-h-full aspect-[187/50]"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Shared vertical baseline at x=0 for both bars */}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={CHART_HEIGHT}
        stroke="#FFFFFF"
        strokeWidth={1}
      />

      {/* INDOOR track */}
      <rect
        x={0}
        y={BAR1_Y}
        width={BAR_WIDTH}
        height={BAR_HEIGHT}
        fill="#D9D9D9"
      />
      <rect
        x={0}
        y={BAR1_Y}
        width={indoorWidth}
        height={BAR_HEIGHT}
        fill="#06E2F4"
        style={{ transition: "width 0.5s ease-out" }}
      />

      {/* OUTDOOR track */}
      <rect
        x={0}
        y={BAR2_Y}
        width={BAR_WIDTH}
        height={BAR_HEIGHT}
        fill="#D9D9D9"
      />
      <rect
        x={0}
        y={BAR2_Y}
        width={outdoorWidth}
        height={BAR_HEIGHT}
        fill="#06E2F4"
        style={{ transition: "width 0.5s ease-out" }}
      />
    </svg>
  );
}

export default function NoiseMonitoring({
  indoorNoise,
  outdoorNoise,
}: NoiseMonitoringProps) {
  const indoorDisplay = formatNoise(indoorNoise);
  const outdoorDisplay = formatNoise(outdoorNoise);

  return (
    <div className="w-[240px] h-[158px] shrink-0 rounded-[20px] bg-[#D9D9D9]/15 px-4 py-3 flex flex-col overflow-hidden">
      {/* Topic bar (Rectangle 29 + label) */}
      <div className="mb-3 w-fit shrink-0 flex items-center rounded-[9px] bg-[#D9D9D9]/20 shadow-[inset_0_4px_4px_rgba(0,0,0,0.25)] px-4 py-1.5">
        <span className="font-semibold text-[15px] leading-[18px] text-white truncate">
          Noise Monitoring
        </span>
      </div>
      <div className="flex-1 min-h-0 flex flex-row items-center justify-center gap-2">
        {/* Labels column */}
        <div className="flex flex-col justify-between text-xs font-medium text-white tracking-wide">
          <span>INDOOR</span>
          <span>OUTDOOR</span>
        </div>

        {/* Shared SVG chart with one baseline and two bars */}
        <div className="flex-1 min-w-0 flex justify-center items-center">
          <NoiseChart indoor={indoorNoise} outdoor={outdoorNoise} />
        </div>

        {/* Values column */}
        <div className="flex flex-col justify-between text-xs font-semibold text-white tabular-nums">
          <span>
            {indoorDisplay}
            <span className="text-[10px] text-white/70"> dB</span>
          </span>
          <span>
            {outdoorDisplay}
            <span className="text-[10px] text-white/70"> dB</span>
          </span>
        </div>
      </div>
    </div>
  );
}

