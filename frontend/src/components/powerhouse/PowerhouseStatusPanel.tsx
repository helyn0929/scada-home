export type HealthLevel = "normal" | "warning" | "alarm" | "unknown";

const STATUS_COLOR: Record<HealthLevel, string> = {
  normal: "#06E2F4",
  warning: "#FACC15",
  alarm: "#FE0C0C",
  unknown: "#6B7280",
};

const STATUS_LABEL: Record<HealthLevel, string> = {
  normal: "Normal",
  warning: "Warning",
  alarm: "Alarm",
  unknown: "--",
};

function HealthCell({ label, level }: { label: string; level: HealthLevel }) {
  const color = STATUS_COLOR[level];
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] font-semibold text-white leading-none">{label}</span>
      <div className="flex items-center gap-1.5">
        <span
          className="text-[10px] font-semibold leading-none"
          style={{ color, transition: "color 0.4s" }}
        >
          {STATUS_LABEL[level]}
        </span>
        <div
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}`, transition: "background-color 0.4s, box-shadow 0.4s" }}
        />
      </div>
    </div>
  );
}

function AlarmCell({ label, alarm }: { label: string; alarm?: boolean }) {
  const hasData = alarm !== undefined;
  const color = !hasData ? "#6B7280" : alarm ? "#FE0C0C" : "#06E2F4";
  const text  = !hasData ? "--" : alarm ? "ON" : "OFF";
  return (
    <div className="flex items-center justify-end gap-1">
      <span className="text-[9px] font-medium leading-none text-white/50 whitespace-nowrap">
        {label}
      </span>
      <span
        className="text-[10px] font-bold leading-none"
        style={{ color, transition: "color 0.4s" }}
      >
        {text}
      </span>
      <div
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}`, transition: "background-color 0.4s, box-shadow 0.4s" }}
      />
    </div>
  );
}

export default function PowerhouseStatusPanel({
  hydraulic = "unknown",
  electrical = "unknown",
  environment = "unknown",
  overpressureAlarm,
  upsAlarm,
  generalShutdownAlarm,
  className = "",
}: {
  hydraulic?: HealthLevel;
  electrical?: HealthLevel;
  environment?: HealthLevel;
  overpressureAlarm?: boolean;
  upsAlarm?: boolean;
  generalShutdownAlarm?: boolean;
  className?: string;
}) {
  return (
    <div
      className={[
        "flex min-h-0 flex-col items-stretch justify-between rounded-[14px] bg-[#D9D9D9]/20 px-3 py-2.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]",
        className,
      ].join(" ")}
    >
      <div className="mb-1 shrink-0 flex justify-center">
        <span className="whitespace-nowrap font-semibold text-[15px] leading-[18px] text-white">
          Powerhouse Status Overview
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-[6px]">
        <HealthCell label="Hydraulic"   level={hydraulic} />
        <AlarmCell  label="Overpressure alarm" alarm={overpressureAlarm} />
        <HealthCell label="Electrical"  level={electrical} />
        <AlarmCell  label="UPS alarm"          alarm={upsAlarm} />
        <HealthCell label="Environment" level={environment} />
        <AlarmCell  label="General shutdown"   alarm={generalShutdownAlarm} />
      </div>
    </div>
  );
}
