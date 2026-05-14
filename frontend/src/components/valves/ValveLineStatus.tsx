const COLOR_ACTIVE = "#06E2F4";
const COLOR_INACTIVE = "rgba(255,255,255,0.25)";

function Dot({ active }: { active: boolean }) {
  return (
    <div
      className="h-2 w-2 shrink-0 rounded-full"
      style={{
        backgroundColor: active ? COLOR_ACTIVE : "transparent",
        border: `1.5px solid ${active ? COLOR_ACTIVE : COLOR_INACTIVE}`,
        boxShadow: active ? `0 0 5px ${COLOR_ACTIVE}` : "none",
        transition: "background-color 0.4s, border-color 0.4s, box-shadow 0.4s",
      }}
    />
  );
}

function ValveRow({
  label,
  mainActive,
  fillingActive,
  fillingAvailable = true,
}: {
  label: string;
  mainActive: boolean;
  fillingActive: boolean;
  fillingAvailable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-1">
      <span className="w-[58px] shrink-0 text-[10px] font-semibold text-white leading-none">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <Dot active={mainActive} />
        <span
          className="text-[10px] font-medium leading-none"
          style={{ color: mainActive ? COLOR_ACTIVE : COLOR_INACTIVE, transition: "color 0.4s" }}
        >
          Main
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Dot active={fillingAvailable && fillingActive} />
        <span
          className="text-[10px] font-medium leading-none"
          style={{
            color: !fillingAvailable
              ? "rgba(255,255,255,0.15)"
              : fillingActive
                ? COLOR_ACTIVE
                : COLOR_INACTIVE,
            transition: "color 0.4s",
          }}
        >
          Filling
        </span>
      </div>
    </div>
  );
}

export type ValveLineStatusProps = {
  /** Main valve states — from existing telemetry.valves */
  dn1400Open?: boolean;
  dn900Open?: boolean;
  dn1400DOpen?: boolean;
  /** Filling valve feedbacks */
  dn1400FillingInletOpen?: boolean;
  dn1400FillingOutletOpen?: boolean;
  dn900FillingValveOpen?: boolean;
};

export default function ValveLineStatus({
  dn1400Open,
  dn900Open,
  dn1400DOpen,
  dn1400FillingInletOpen,
  dn1400FillingOutletOpen,
  dn900FillingValveOpen,
}: ValveLineStatusProps) {
  const dn1400Filling = !!(dn1400FillingInletOpen || dn1400FillingOutletOpen);
  const dn900Filling = !!dn900FillingValveOpen;

  return (
    <div className="shrink-0 rounded-[14px] bg-white/10 px-3 py-2 flex flex-col gap-[7px]">
      <ValveRow
        label="DN1400"
        mainActive={!!dn1400Open}
        fillingActive={dn1400Filling}
      />
      <ValveRow
        label="DN900"
        mainActive={!!dn900Open}
        fillingActive={dn900Filling}
      />
      <ValveRow
        label="DN1400D"
        mainActive={!!dn1400DOpen}
        fillingActive={false}
        fillingAvailable={false}
      />
    </div>
  );
}
