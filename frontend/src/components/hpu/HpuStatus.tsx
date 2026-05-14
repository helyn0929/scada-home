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

function PressureRow({ label, value }: { label: string; value: number | undefined }) {
  const text = value != null ? value.toFixed(0) : "--";
  return (
    <div className="flex items-center justify-between w-full gap-2">
      <span className="text-[10px] font-medium text-white/60 leading-none shrink-0">
        {label}
      </span>
      <span className="text-[10px] font-bold tabular-nums leading-none text-white shrink-0">
        {text}
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
  pressure?: number;
  motorOn?: boolean;
  valveOpen?: boolean;
  hideTitle?: boolean;
  className?: string;
};

const COLOR_OK = "#06E2F4";
const COLOR_ALARM = "#FE0C0C";
const COLOR_UNKNOWN = "rgba(255,255,255,0.35)";

export default function HpuStatus({
  unit,
  pressure,
  motorOn,
  valveOpen,
  hideTitle = false,
  className,
}: HpuStatusProps) {
  const valveLabel = unit === 1 ? "QSD Valve" : "DN1400";

  // Motor ON/OFF are both informational (no alarm) — always blue.
  const motorColor = motorOn == null ? COLOR_UNKNOWN : COLOR_OK;
  const motorText = motorOn == null ? "--" : motorOn ? "ON" : "OFF";

  const valveColor = valveOpen == null ? COLOR_UNKNOWN : valveOpen ? COLOR_OK : COLOR_ALARM;
  const valveText = valveOpen == null ? "--" : valveOpen ? "OPEN" : "CLOSE";

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
        <StatusRow label="Motor" text={motorText} color={motorColor} />
        <StatusRow label={valveLabel} text={valveText} color={valveColor} />
      </div>
    </div>
  );
}
