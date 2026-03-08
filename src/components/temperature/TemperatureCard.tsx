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

interface GaugeDialProps {
  value: number | undefined | null;
}

// Gauge-style circular dial: white background with colored arc, value in center
function GaugeDial({ value }: GaugeDialProps) {
  const clamped = clampTemp(value);
  const display = formatTemp(value);
  const fraction = clamped / 200; // 0–1

  const size = 46;
  const center = size / 2;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * (1 - fraction);

  return (
    <div className="w-[58px] h-[58px] flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
      >
        {/* Vector: white circular background */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="#FFFFFF"
          fillOpacity={0.1}
          stroke="#FFFFFF"
          strokeWidth={1}
        />
        {/* Gauge arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#06E2F4"
          strokeWidth={3}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
        />
        {/* Numeric value in the center */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
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
    <div className="min-w-[320px] w-full max-w-[360px] rounded-[20px] bg-[#D9D9D9]/15 px-4 py-3">
      {/* Topic bar: Rectangle 28 style */}
      <div className="mb-3 w-full rounded-[9px] bg-[#D9D9D9]/20 shadow-[inset_0_4px_4px_rgba(0,0,0,0.25)] px-4 py-1.5 flex items-center">
        <span className="font-semibold text-[15px] leading-[18px] text-white">
          Temperature
        </span>
      </div>

      {/* Content: 3-phase winding (left) | Control Panel & Environment (right) */}
      <div className="flex flex-row items-start justify-between gap-4">
        {/* Left: 3-phase winding — label above, U/V/W gauges, labels below */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] leading-[14px] font-semibold text-white whitespace-nowrap">
            3-phase winding
          </span>
          <div className="h-px w-full border-t-2 border-white/60 mix-blend-overlay mb-0.5" />
          <div className="flex gap-2">
            <GaugeDial value={tempWindingU} />
            <GaugeDial value={tempWindingV} />
            <GaugeDial value={tempWindingW} />
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

