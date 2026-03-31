import React from "react";

type TemperatureCardProps = {
  tempWindingU: number | undefined | null;
  tempWindingV: number | undefined | null;
  tempWindingW: number | undefined | null;
  tempControlPanel: number | undefined | null;
  tempEnvironment: number | undefined | null;
};

// Clamp temperature to 0–200 °C
function clampTemp(value: number | undefined | null): number {
  if (value === undefined || value === null || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(200, value));
}

function formatTemp(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  return clampTemp(value).toFixed(1);
}

const GAUGE_COLOR_NORMAL = "#06E2F4";
const GAUGE_COLOR_WARNING = "#FE0C0C";
const WINDING_WARNING_THRESHOLD = 115; // °C — U/V/W gauges turn red at or above this

interface GaugeDialProps {
  value: number | undefined | null;
  /** When set, stroke turns red when value >= this (e.g. 115 for winding temps). */
  warningThreshold?: number;
}

// Gauge SVG: semicircle (dome). Path starts at top center (29,0), runs down left to bottom (≈0,28.75),
// along bottom to right (≈58,28.75), then back to top. pathLength is normalized to 100.
const GAUGE_VIEWBOX = "0 0 58 46";
const GAUGE_PATH =
  "M29 0C25.1917 0 21.4207 0.743583 17.9022 2.18829C14.3838 3.633 11.1869 5.75055 8.49398 8.42002C3.05545 13.8113 0.000112293 21.1234 0.000112293 28.7478C-0.015949 34.4417 1.69128 40.0095 4.90109 44.7315C5.3318 45.3643 5.99847 45.8016 6.75442 45.9472C7.51038 46.0927 8.2937 45.9347 8.93208 45.5077C9.57045 45.0807 10.0116 44.4199 10.1584 43.6705C10.3053 42.9211 10.1458 42.1446 9.71507 41.5118C7.37918 38.0492 6.0358 34.0228 5.82837 29.8624C5.62095 25.702 6.55726 21.5638 8.53735 17.8898C10.5174 14.2158 13.4669 11.1439 17.0709 9.00203C20.6749 6.8602 24.798 5.72888 29 5.72888C33.202 5.72888 37.3251 6.8602 40.9291 9.00203C44.5331 11.1439 47.4826 14.2158 49.4627 17.8898C51.4427 21.5638 52.3791 25.702 52.1716 29.8624C51.9642 34.0228 50.6208 38.0492 48.2849 41.5118C48.0712 41.8249 47.9219 42.1768 47.8456 42.5473C47.7692 42.9178 47.7674 43.2996 47.8401 43.6708C47.9128 44.0419 48.0587 44.3953 48.2694 44.7105C48.4801 45.0257 48.7515 45.2966 49.0679 45.5077C49.548 45.8275 50.1135 45.9977 50.6919 45.9964C51.1669 45.9971 51.6349 45.8821 52.0546 45.6616C52.4743 45.441 52.8329 45.1216 53.0989 44.7315C56.3087 40.0095 58.016 34.4417 57.9999 28.7478C57.9999 21.1234 54.9446 13.8113 49.506 8.42002C44.0675 3.02877 36.6913 0 29 0Z";

const GAUGE_PATH_LENGTH = 100;
// Path runs top(0%) → left/bottom(≈25%) → bottom(50%) → right/bottom(≈75%) → top(100%).
// Use only the bottom arc: from bottom-left (25) to bottom-right (75) = 50 units.
const GAUGE_ARC_START = 25;
const GAUGE_ARC_LENGTH = 50;

function GaugeDial({ value, warningThreshold }: GaugeDialProps) {
  const id = React.useId().replace(/:/g, "");
  const clamped = clampTemp(value);
  const display = formatTemp(value);
  const isWarning =
    warningThreshold !== undefined && clamped >= warningThreshold;
  const progressStroke = isWarning ? GAUGE_COLOR_WARNING : GAUGE_COLOR_NORMAL;

  // Map 0–200°C to 0–GAUGE_ARC_LENGTH so fill runs exactly bottom-left → bottom-right.
  const progressLength = Math.min(
    GAUGE_ARC_LENGTH,
    (clamped / 200) * GAUGE_ARC_LENGTH
  );
  const gapLength = GAUGE_PATH_LENGTH - progressLength;
  const strokeDasharray = `${progressLength} ${gapLength}`;
  // Negative offset: dash starts at path position GAUGE_ARC_START (bottom-left), no overflow at start.
  const strokeDashoffset = -GAUGE_ARC_START;

  return (
    <div className="w-[58px] h-[46px] flex items-center justify-center shrink-0">
      <svg
        viewBox={GAUGE_VIEWBOX}
        className="w-full h-full block"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id={`gauge-mask-${id}`}>
            <path d={GAUGE_PATH} />
          </clipPath>
        </defs>
        {/* Track: dome background */}
        <path d={GAUGE_PATH} fill="rgba(255,255,255,0.35)" />
        {/* Progress: bottom-left → bottom-right; red when value >= warningThreshold (e.g. 115 for U/V/W) */}
        <path
          d={GAUGE_PATH}
          fill="none"
          stroke={progressStroke}
          strokeWidth={10}
          strokeLinecap="butt"
          strokeLinejoin="round"
          pathLength={GAUGE_PATH_LENGTH}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "none" }}
          clipPath={`url(#gauge-mask-${id})`}
        />
        {/* Center value */}
        <text
          x="29"
          y="26"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#FFFFFF"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="12"
          fontWeight={600}
        >
          {display}
        </text>
      </svg>
    </div>
  );
}

export default function TemperatureCard({
  tempWindingU,
  tempWindingV,
  tempWindingW,
  tempControlPanel,
  tempEnvironment,
}: TemperatureCardProps) {
  return (
    <div className="h-[158px] w-fit max-w-[480px] shrink-0 rounded-[20px] bg-[#D9D9D9]/15 px-4 py-3 flex flex-col">
      {/* Topic bar: Rectangle 28 style */}
      <div className="mb-3 w-fit shrink-0 flex items-center rounded-[9px] bg-[#D9D9D9]/20 shadow-[inset_0_4px_4px_rgba(0,0,0,0.25)] px-4 py-1.5">
        <span className="font-semibold text-[15px] leading-[18px] text-white">
          Temperature
        </span>
      </div>

      {/* Content: 3-phase winding (left) | Control Panel & Environment (right) */}
      <div className="flex flex-row items-start justify-start gap-4">
        {/* Left: 3-phase winding — label above, U/V/W gauges, labels below */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] leading-[14px] font-semibold text-white whitespace-nowrap">
            3-phase winding
          </span>
          <div className="h-px w-full border-t-2 border-white/60 mix-blend-overlay mb-0.5" />
          <div className="flex gap-2">
            <GaugeDial value={tempWindingU} warningThreshold={WINDING_WARNING_THRESHOLD} />
            <GaugeDial value={tempWindingV} warningThreshold={WINDING_WARNING_THRESHOLD} />
            <GaugeDial value={tempWindingW} warningThreshold={WINDING_WARNING_THRESHOLD} />
          </div>
          <div className="flex gap-2 mt-0.5 text-[11px] leading-[14px] font-semibold text-white">
            <span className="w-[58px] text-center">U</span>
            <span className="w-[58px] text-center">V</span>
            <span className="w-[58px] text-center">W</span>
          </div>
        </div>

        {/* Right: Control Panel and Environment — each label above its gauge */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] leading-[14px] font-semibold text-white whitespace-nowrap">
              Control panel
            </span>
            <div className="h-px w-full border-t-2 border-white/60 mix-blend-overlay mb-0.5" />
            <GaugeDial value={tempControlPanel} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] leading-[14px] font-semibold text-white whitespace-nowrap">
              Environment
            </span>
            <div className="h-px w-full border-t-2 border-white/60 mix-blend-overlay mb-0.5" />
            <GaugeDial value={tempEnvironment} />
          </div>
        </div>
      </div>
    </div>
  );
}

