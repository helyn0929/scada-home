import React from "react";

const GAUGE_COLOR_NORMAL = "#06E2F4";

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

/** Same dome path and arc math as TemperatureCard GaugeDial */
const GAUGE_VIEWBOX = "0 0 58 46";
const GAUGE_PATH =
  "M29 0C25.1917 0 21.4207 0.743583 17.9022 2.18829C14.3838 3.633 11.1869 5.75055 8.49398 8.42002C3.05545 13.8113 0.000112293 21.1234 0.000112293 28.7478C-0.015949 34.4417 1.69128 40.0095 4.90109 44.7315C5.3318 45.3643 5.99847 45.8016 6.75442 45.9472C7.51038 46.0927 8.2937 45.9347 8.93208 45.5077C9.57045 45.0807 10.0116 44.4199 10.1584 43.6705C10.3053 42.9211 10.1458 42.1446 9.71507 41.5118C7.37918 38.0492 6.0358 34.0228 5.82837 29.8624C5.62095 25.702 6.55726 21.5638 8.53735 17.8898C10.5174 14.2158 13.4669 11.1439 17.0709 9.00203C20.6749 6.8602 24.798 5.72888 29 5.72888C33.202 5.72888 37.3251 6.8602 40.9291 9.00203C44.5331 11.1439 47.4826 14.2158 49.4627 17.8898C51.4427 21.5638 52.3791 25.702 52.1716 29.8624C51.9642 34.0228 50.6208 38.0492 48.2849 41.5118C48.0712 41.8249 47.9219 42.1768 47.8456 42.5473C47.7692 42.9178 47.7674 43.2996 47.8401 43.6708C47.9128 44.0419 48.0587 44.3953 48.2694 44.7105C48.4801 45.0257 48.7515 45.2966 49.0679 45.5077C49.548 45.8275 50.1135 45.9977 50.6919 45.9964C51.1669 45.9971 51.6349 45.8821 52.0546 45.6616C52.4743 45.441 52.8329 45.1216 53.0989 44.7315C56.3087 40.0095 58.016 34.4417 57.9999 28.7478C57.9999 21.1234 54.9446 13.8113 49.506 8.42002C44.0675 3.02877 36.6913 0 29 0Z";

const GAUGE_PATH_LENGTH = 100;
const GAUGE_ARC_START = 25;
const GAUGE_ARC_LENGTH = 50;

/** Maps [min,max] to arc fill like Temperature maps 0–200 to the bottom arc */
function PowerGaugeDial({
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
  const id = React.useId().replace(/:/g, "");
  const hasValue =
    value !== undefined && value !== null && !Number.isNaN(value);
  const clamped = hasValue ? clamp(value!, min, max) : null;
  const display =
    clamped !== null ? formatValue(clamped) : "--";

  const t =
    clamped !== null ? (clamped - min) / (max - min) : 0;
  const progressLength = Math.min(
    GAUGE_ARC_LENGTH,
    Math.max(0, t) * GAUGE_ARC_LENGTH
  );
  const gapLength = GAUGE_PATH_LENGTH - progressLength;
  const strokeDasharray = `${progressLength} ${gapLength}`;
  const strokeDashoffset = -GAUGE_ARC_START;

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <span className="text-[11px] font-semibold leading-[14px] text-white">
        {label}
      </span>
      <div className="flex h-[46px] w-[58px] shrink-0 items-center justify-center">
        <svg
          viewBox={GAUGE_VIEWBOX}
          className="block h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <clipPath id={`gp-gauge-mask-${id}`}>
              <path d={GAUGE_PATH} />
            </clipPath>
          </defs>
          <path d={GAUGE_PATH} fill="rgba(255,255,255,0.35)" />
          <path
            d={GAUGE_PATH}
            fill="none"
            stroke={GAUGE_COLOR_NORMAL}
            strokeWidth={10}
            strokeLinecap="butt"
            strokeLinejoin="round"
            pathLength={GAUGE_PATH_LENGTH}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "none" }}
            clipPath={`url(#gp-gauge-mask-${id})`}
          />
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
      {unit ? (
        <span className="text-[10px] font-normal text-white/70 tabular-nums">
          {unit}
        </span>
      ) : null}
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
    <div className="inline-flex h-[158px] w-fit max-w-[480px] shrink-0 flex-col overflow-hidden rounded-[20px] px-3 py-3">
      {/* Title — background sized to text only */}
      <div className="mb-3 inline-flex w-fit shrink-0 items-center rounded-[9px] bg-[#D9D9D9]/20 px-4 py-1.5 shadow-[inset_0_4px_4px_rgba(0,0,0,0.25)]">
        <span className="whitespace-nowrap font-semibold text-[15px] leading-[18px] text-white">
          Generator Power
        </span>
      </div>

      {/* Four gauges — even columns across full width (matches shared column with Generator Vibration) */}
      <div className="grid min-h-0 w-max flex-1 grid-cols-4 gap-2 place-items-center">
        <PowerGaugeDial
          value={apparentPowerS}
          min={-2000}
          max={2000}
          label="S"
          unit="kVA"
          formatValue={(v) => v.toFixed(0)}
        />
        <PowerGaugeDial
          value={activePowerP}
          min={-2000}
          max={2000}
          label="P"
          unit="kW"
          formatValue={(v) => v.toFixed(0)}
        />
        <PowerGaugeDial
          value={reactivePowerQ}
          min={-2000}
          max={2000}
          label="Q"
          unit="kvar"
          formatValue={(v) => v.toFixed(0)}
        />
        <PowerGaugeDial
          value={pf}
          min={-1}
          max={1}
          label="P.F"
          unit=" "
          formatValue={(v) => v.toFixed(2)}
        />
      </div>
    </div>
  );
}
