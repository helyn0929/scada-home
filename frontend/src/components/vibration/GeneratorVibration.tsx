import { useState, useEffect, useRef } from "react";

const DE_COLOR = "#06E2F4";
const NDE_COLOR = "#F46D06";
const MAX_POINTS = 80;
const Y_MAX_MM_S = 5;
const UPDATE_MS = 500;

// Realistic low-amplitude vibration: stable baseline + small random walk (mm/s)
function nextVibration(prev: number, base: number, spread: number): number {
  const drift = (Math.random() - 0.5) * 0.15;
  const next = prev + drift;
  const clamped = Math.max(base - spread, Math.min(base + spread, next));
  return Math.max(0, Math.min(Y_MAX_MM_S, clamped));
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

export default function GeneratorVibration({
  className,
  de: liveDe,
  nde: liveNde,
}: {
  className?: string;
  de?: number;
  nde?: number;
}) {
  const [dePoints, setDePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [ndePoints, setNdePoints] = useState<Array<{ x: number; y: number }>>([]);
  const deLast = useRef(1.4);
  const ndeLast = useRef(1.8);

  useEffect(() => {
    // Seed initial points so the chart fills from the start
    const seedDe: Array<{ x: number; y: number }> = [];
    const seedNde: Array<{ x: number; y: number }> = [];
    let d = 1.4;
    let n = 1.8;
    for (let i = 0; i < MAX_POINTS; i++) {
      d = nextVibration(d, 1.4, 0.6);
      n = nextVibration(n, 1.8, 0.5);
      seedDe.push({ x: i, y: d });
      seedNde.push({ x: i, y: n });
    }
    deLast.current = d;
    ndeLast.current = n;
    setDePoints(seedDe);
    setNdePoints(seedNde);
  }, []);

  useEffect(() => {
    if (dePoints.length === 0) return;
    const t = setInterval(() => {
      setDePoints((prev) => {
        const nextY = liveDe !== undefined ? liveDe : nextVibration(deLast.current, 1.4, 0.6);
        deLast.current = nextY;
        return [...prev.slice(1), { x: MAX_POINTS - 1, y: nextY }].map((p, i) => ({ ...p, x: i }));
      });
      setNdePoints((prev) => {
        const nextY = liveNde !== undefined ? liveNde : nextVibration(ndeLast.current, 1.8, 0.5);
        ndeLast.current = nextY;
        return [...prev.slice(1), { x: MAX_POINTS - 1, y: nextY }].map((p, i) => ({ ...p, x: i }));
      });
    }, UPDATE_MS);
    return () => clearInterval(t);
  }, [dePoints.length, liveDe, liveNde]);

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
    <div className={["flex flex-col overflow-hidden rounded-[20px] bg-[#D9D9D9]/15 px-3 py-3", className ?? "h-[158px] w-[296px] shrink-0"].join(" ")}>
      <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-3">
        <div className="w-fit shrink-0 rounded-[9px] bg-[#D9D9D9]/20 px-4 py-1.5 shadow-[inset_0_4px_4px_rgba(0,0,0,0.25)]">
          <span className="font-semibold text-[15px] leading-[18px] text-white">
            Generator Vibration
          </span>
        </div>

      {/* Chart area: legend + SVG */}
      <div className="flex flex-1 min-h-0 min-w-0 flex-row items-stretch gap-1">
        {/* DE / NDE stacked on left */}
        <div className="flex shrink-0 flex-col justify-center gap-2 py-0.5">
          <div className="flex items-center gap-1.5">
            <div
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: DE_COLOR }}
            />
            <span className="text-[11px] font-semibold text-white">DE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: NDE_COLOR }}
            />
            <span className="text-[11px] font-semibold text-white">NDE</span>
          </div>
        </div>
        <div className="flex flex-1 min-h-0 min-w-0 flex-col">
          <svg
            viewBox="0 0 320 100"
            className="block h-full w-full"
            preserveAspectRatio="none"
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
