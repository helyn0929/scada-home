type NoiseMonitoringProps = {
  indoorNoise: number | undefined | null;
  outdoorNoise: number | undefined | null;
  className?: string;
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

const NOISE_DB_MIN = 0;
const NOISE_DB_MAX = 100;

function noiseOutOfRange(value: number | undefined | null): boolean {
  if (value === undefined || value === null || Number.isNaN(value)) return false;
  return value < NOISE_DB_MIN || value > NOISE_DB_MAX;
}

function noiseDisplayText(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  if (noiseOutOfRange(value)) return Number(value).toFixed(0);
  return formatNoise(value);
}

/* Single SVG chart:
   - One vertical white baseline at x=0, full height
   - Two gray tracks + cyan fills (BAR_WIDTH×BAR_HEIGHT); indoor / outdoor
*/
/** Wider track uses middle column; sides get equal `1fr` so the block sits centered in the card */
const BAR_WIDTH = 176;
const BAR_HEIGHT = 18;
const BAR_GAP = 18;
const TOP_MARGIN = 5;
const BOTTOM_MARGIN = 5;
const BAR1_Y = TOP_MARGIN;
const BAR2_Y = TOP_MARGIN + BAR_HEIGHT + BAR_GAP;
const CHART_HEIGHT = BAR2_Y + BAR_HEIGHT + BOTTOM_MARGIN;
const CHART_WIDTH = BAR_WIDTH;

interface NoiseChartProps {
  indoor: number | undefined | null;
  outdoor: number | undefined | null;
}

const BAR_FILL_NORMAL = "#06E2F4";
const BAR_FILL_OVERFLOW = "#FE0C0C";

function NoiseChart({ indoor, outdoor }: NoiseChartProps) {
  const indoorClamped = clampNoise(indoor);
  const outdoorClamped = clampNoise(outdoor);
  const indoorWidth = (BAR_WIDTH * indoorClamped) / 100;
  const outdoorWidth = (BAR_WIDTH * outdoorClamped) / 100;
  const indoorOverflow = noiseOutOfRange(indoor);
  const outdoorOverflow = noiseOutOfRange(outdoor);
  const indoorFill = indoorOverflow ? BAR_FILL_OVERFLOW : BAR_FILL_NORMAL;
  const outdoorFill = outdoorOverflow ? BAR_FILL_OVERFLOW : BAR_FILL_NORMAL;

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="block h-auto w-full max-w-full"
      role="img"
      aria-hidden
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
        fill={indoorFill}
        style={{ transition: "width 0.5s ease-out, fill 0.35s ease-out" }}
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
        fill={outdoorFill}
        style={{ transition: "width 0.5s ease-out, fill 0.35s ease-out" }}
      />
    </svg>
  );
}

export default function NoiseMonitoring({
  indoorNoise,
  outdoorNoise,
  className,
}: NoiseMonitoringProps) {
  const indoorDisplay = noiseDisplayText(indoorNoise);
  const outdoorDisplay = noiseDisplayText(outdoorNoise);
  const indoorHi =
    typeof indoorNoise === "number" &&
    !Number.isNaN(indoorNoise) &&
    indoorNoise > NOISE_DB_MAX;
  const indoorLo =
    typeof indoorNoise === "number" &&
    !Number.isNaN(indoorNoise) &&
    indoorNoise < NOISE_DB_MIN;
  const outdoorHi =
    typeof outdoorNoise === "number" &&
    !Number.isNaN(outdoorNoise) &&
    outdoorNoise > NOISE_DB_MAX;
  const outdoorLo =
    typeof outdoorNoise === "number" &&
    !Number.isNaN(outdoorNoise) &&
    outdoorNoise < NOISE_DB_MIN;

  return (
    <div className={["h-[158px] rounded-[20px] bg-[#D9D9D9]/15 px-4 py-3 flex flex-col overflow-hidden", className].filter(Boolean).join(" ")}>
      {/* Topic bar (Rectangle 29 + label) */}
      <div className="mb-3 w-fit shrink-0 flex items-center rounded-[9px] bg-[#D9D9D9]/20 shadow-[inset_0_4px_4px_rgba(0,0,0,0.25)] px-4 py-1.5">
        <span className="font-semibold text-[15px] leading-[18px] text-white truncate">
          Noise Monitoring
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        {/* Side labels + fluid chart (fills remaining width inside the panel) */}
        <div className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-stretch gap-x-2">
          <div className="flex min-w-0 justify-end pr-0.5">
            <div className="flex flex-col justify-between py-0.5 text-xs font-medium tracking-wide text-white">
              <span className="leading-none">INDOOR</span>
              <span className="leading-none">OUTDOOR</span>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-center">
            <NoiseChart indoor={indoorNoise} outdoor={outdoorNoise} />
          </div>

          <div className="flex min-w-0 justify-start pl-0.5">
            <div className="flex flex-col justify-between py-0.5 text-xs font-semibold tabular-nums">
              <span
                className={`leading-none ${noiseOutOfRange(indoorNoise) ? "text-[#FE0C0C]" : "text-white"}`}
              >
                {indoorDisplay}
                {indoorHi || indoorLo ? (
                  <span className="ml-0.5 text-[9px] font-bold text-[#FE0C0C]">
                    {indoorHi ? "HI" : "LO"}
                  </span>
                ) : null}
                <span
                  className={`text-[10px] ${noiseOutOfRange(indoorNoise) ? "text-[#FE0C0C]/80" : "text-white/70"}`}
                >
                  {" "}
                  dB
                </span>
              </span>
              <span
                className={`leading-none ${noiseOutOfRange(outdoorNoise) ? "text-[#FE0C0C]" : "text-white"}`}
              >
                {outdoorDisplay}
                {outdoorHi || outdoorLo ? (
                  <span className="ml-0.5 text-[9px] font-bold text-[#FE0C0C]">
                    {outdoorHi ? "HI" : "LO"}
                  </span>
                ) : null}
                <span
                  className={`text-[10px] ${noiseOutOfRange(outdoorNoise) ? "text-[#FE0C0C]/80" : "text-white/70"}`}
                >
                  {" "}
                  dB
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

