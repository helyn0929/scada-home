import { useEffect, useState } from "react";

const UPDATE_MS = 1200;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function bump(prev: number, spread: number, min: number, max: number) {
  return clamp(prev + (Math.random() - 0.5) * spread, min, max);
}

function StatusRow({
  label,
  text,
  color,
}: {
  label: string;
  text: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between w-full gap-2">
      <span className="text-[10px] font-medium text-white/60 leading-none shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        <span
          className="text-[10px] font-bold leading-none tabular-nums"
          style={{ color, transition: "color 0.4s" }}
        >
          {text}
        </span>
        <div
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 4px ${color}`,
            transition: "background-color 0.4s, box-shadow 0.4s",
          }}
        />
      </div>
    </div>
  );
}

function PressureRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between w-full gap-2">
      <span className="text-[10px] font-medium text-white/60 leading-none shrink-0">
        {label}
      </span>
      <span className="text-[10px] font-bold tabular-nums leading-none text-white shrink-0">
        {value.toFixed(0)}
        <span className="text-[9px] font-medium text-white/60"> bar</span>
      </span>
    </div>
  );
}

export function HpuStatusTitle({ name }: { name: string }) {
  return (
    <div className="inline-flex w-fit shrink-0 items-center rounded-[9px] bg-[#D9D9D9]/20 px-4 py-1.5 shadow-[inset_0_4px_4px_rgba(0,0,0,0.25)]">
      <span className="whitespace-nowrap font-semibold text-[15px] leading-[18px] text-white">
        {name}
      </span>
    </div>
  );
}

type HpuStatusProps = {
  unit: 1 | 2;
  /** Live telemetry — falls back to simulation when undefined */
  pressure?: number;
  motorOn?: boolean;
  valveOpen?: boolean;
  hideTitle?: boolean;
  className?: string;
};

export default function HpuStatus({
  unit,
  pressure: livePressure,
  motorOn: liveMotorOn,
  valveOpen: liveValveOpen,
  hideTitle = false,
  className,
}: HpuStatusProps) {
  const basePressure = unit === 1 ? 145 : 138;
  const [simPressure, setSimPressure] = useState(basePressure);

  useEffect(() => {
    if (livePressure !== undefined) return;
    const id = window.setInterval(() => {
      setSimPressure((v) => bump(v, 1.5, basePressure - 4, basePressure + 4));
    }, UPDATE_MS);
    return () => window.clearInterval(id);
  }, [basePressure, livePressure]);

  const pressure = livePressure ?? simPressure;
  const motorOn = liveMotorOn ?? true;
  const valveOpen = liveValveOpen ?? (unit === 1 ? true : false);
  const valveLabel = unit === 1 ? "QSD Valve" : "DN1400";

  return (
    <div
      className={[
        "flex min-h-[96px] flex-col rounded-[20px] px-3",
        hideTitle ? "pb-3 pt-0" : "py-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!hideTitle ? (
        <div className="mb-1 shrink-0">
          <HpuStatusTitle name={`HPU${unit}`} />
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col justify-start gap-[7px] pt-1">
        <PressureRow label="Pressure" value={pressure} />
        <StatusRow
          label="Motor"
          text={motorOn ? "ON" : "OFF"}
          color={motorOn ? "#06E2F4" : "#FE0C0C"}
        />
        <StatusRow
          label={valveLabel}
          text={valveOpen ? "OPEN" : "CLOSE"}
          color={valveOpen ? "#06E2F4" : "#FE0C0C"}
        />
      </div>
    </div>
  );
}
