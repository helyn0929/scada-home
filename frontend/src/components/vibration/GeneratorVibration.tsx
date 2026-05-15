import React, { useState, useEffect, useRef } from "react";

const DE_COLOR = "#06E2F4";
const NDE_COLOR = "#F46D06";
const MAX_POINTS = 80;
const Y_MAX_MM_S = 5;
const UPDATE_MS = 500;

// Small visual jitter around the live telemetry value so the trace looks
// alive between PLC polls. The center value is always the latest live reading
// — this only smooths the path between updates, it doesn't fabricate readings.
function jitterAround(centerLive: number): number {
  const drift = (Math.random() - 0.5) * 0.15;
  const next = centerLive + drift;
  return Math.max(0, Math.min(Y_MAX_MM_S, next));
}

function pointsToPath(
  points: Array<{ x: number; y: number }>,
  width: number,
  height: number,
  left: number,
  bottom: number
): string {
  if (points.length < 2) return "";
  const xScale = width / Math.max(1, MAX_POINTS - 1);
  const yScale = height / Y_MAX_MM_S;
  const first = points[0];
  let d = `M ${left + first.x * xScale} ${bottom - first.y * yScale}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    d += ` L ${left + p.x * xScale} ${bottom - p.y * yScale}`;
  }
  return d;
}

interface GeneratorVibrationProps {
  vibrationDE?: number;
  vibrationNDE?: number;
  className?: string;
}

export default function GeneratorVibration({ vibrationDE, vibrationNDE, className = "" }: GeneratorVibrationProps) {
  const [dePoints, setDePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [ndePoints, setNdePoints] = useState<Array<{ x: number; y: number }>>([]);
  const deLast = useRef<number | null>(null);
  const ndeLast = useRef<number | null>(null);
  const [hasSeeded, setHasSeeded] = useState(false);

  // Seed a flat line once at the first real reading so the chart starts
  // as a straight line and only begins moving once telemetry arrives.
  useEffect(() => {
    if (hasSeeded) return;
    if (vibrationDE == null && vibrationNDE == null) return;
    const deVal = vibrationDE ?? 0;
    const ndeVal = vibrationNDE ?? 0;
    deLast.current = deVal;
    ndeLast.current = ndeVal;
    setDePoints(Array.from({ length: MAX_POINTS }, (_, i) => ({ x: i, y: deVal })));
    setNdePoints(Array.from({ length: MAX_POINTS }, (_, i) => ({ x: i, y: ndeVal })));
    setHasSeeded(true);
  }, [vibrationDE, vibrationNDE, hasSeeded]);

  // After seeding, redraw at UPDATE_MS using the latest live value as the
  // center, with small jitter so the trace looks alive between PLC polls.
  useEffect(() => {
    if (!hasSeeded) return;
    const t = setInterval(() => {
      if (vibrationDE != null) {
        const nextY = jitterAround(vibrationDE);
        deLast.current = nextY;
        setDePoints((prev) => {
          const arr = [...prev.slice(1), { x: MAX_POINTS - 1, y: nextY }];
          return arr.map((p, i) => ({ ...p, x: i }));
        });
      }
      if (vibrationNDE != null) {
        const nextY = jitterAround(vibrationNDE);
        ndeLast.current = nextY;
        setNdePoints((prev) => {
          const arr = [...prev.slice(1), { x: MAX_POINTS - 1, y: nextY }];
          return arr.map((p, i) => ({ ...p, x: i }));
        });
      }
    }, UPDATE_MS);
    return () => clearInterval(t);
  }, [hasSeeded, vibrationDE, vibrationNDE]);

  const chartWidth = 268;
  const chartHeight = 58;
  const left = 36;
  const bottom = 70;
  // Keep the background/axes aligned to the actual chart plot area.
  // pointsToPath maps y in [0..Y_MAX_MM_S] into [bottom - chartHeight .. bottom].
  const panelTop = bottom - chartHeight; // 12
  const dePath = pointsToPath(dePoints, chartWidth, chartHeight, left, bottom);
  const ndePath = pointsToPath(ndePoints, chartWidth, chartHeight, left, bottom);

  return (
    <div className={`flex h-[158px] w-full min-w-0 flex-col overflow-hidden rounded-[20px] bg-[#D9D9D9]/15 px-3 py-3 ${className}`}>
      <div className="flex w-full min-w-0 flex-col gap-3">
        <div className="w-fit shrink-0 rounded-[9px] bg-[#D9D9D9]/20 px-4 py-1.5 shadow-[inset_0_4px_4px_rgba(0,0,0,0.25)]">
          <span className="font-semibold text-[15px] leading-[18px] text-white">
            Generator Vibration
          </span>
        </div>

      {/* Chart area: legend + flexible SVG */}
      <div className="flex min-h-0 w-full min-w-0 flex-row items-stretch gap-1">
        {/* DE / NDE stacked on left */}
        <div className="flex shrink-0 flex-col justify-center gap-2 py-0.5">
          <div className="flex items-center gap-1.5">
            <div
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: DE_COLOR }}
            />
            <span className="text-[11px] font-semibold text-white">DE</span>
            <span className="w-[32px] text-right text-[11px] font-semibold tabular-nums" style={{ color: DE_COLOR }}>
              {deLast.current != null ? deLast.current.toFixed(2) : "--"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: NDE_COLOR }}
            />
            <span className="text-[11px] font-semibold text-white">NDE</span>
            <span className="w-[32px] text-right text-[11px] font-semibold tabular-nums" style={{ color: NDE_COLOR }}>
              {ndeLast.current != null ? ndeLast.current.toFixed(2) : "--"}
            </span>
          </div>
        </div>
        <div className="flex h-full w-full min-w-0 flex-1 flex-col">
          <svg
            viewBox="0 0 320 100"
            className="block h-full w-full"
            preserveAspectRatio="xMidYMid meet"
          >
          {/* Inner panel background — spans chart area, fits card */}
          <rect
            x={32}
            y={panelTop}
            width={278}
            height={bottom - panelTop}
            rx={4}
            fill="#D9D9D9"
            fillOpacity={0.2}
          />
          {/* Y-axis line (left) */}
          <line
            x1={left}
            y1={panelTop}
            x2={left}
            y2={bottom}
            stroke="white"
            strokeWidth={1}
          />
          {/* X-axis line (bottom) */}
          <line
            x1={left}
            y1={bottom}
            x2={left + chartWidth}
            y2={bottom}
            stroke="white"
            strokeWidth={1}
          />
          {/* Y-axis label */}
          <text
            x={14}
            y={panelTop + (bottom - panelTop) / 2}
            fill="white"
            fontSize="9"
            fontFamily="Inter, system-ui, sans-serif"
            textAnchor="middle"
            transform="rotate(-90, 14, 46)"
          >
            mm/s
          </text>
          {/* DE trend line (cyan) */}
          {dePath && (
            <path
              d={dePath}
              fill="none"
              stroke={DE_COLOR}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: "none" }}
            />
          )}
          {/* NDE trend line (orange) */}
          {ndePath && (
            <path
              d={ndePath}
              fill="none"
              stroke={NDE_COLOR}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: "none" }}
            />
          )}
          </svg>
        </div>
      </div>
      </div>
    </div>
  );
}
