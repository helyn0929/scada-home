// 手機版「機組」分頁（MOBILE_DESIGN_SPEC.md §5）
import type { TelemetryData } from "@/features/telemetry/types";
import type { ApiStatus } from "@/features/telemetry/useLiveTelemetry";
import { ALARM_COLOR, getAlarmLevel } from "@/config/alarmThresholds";
import { calcPowerFactor } from "./powerhouseHealth";
import type { MobileTheme } from "./useMobileLayout";
import { BarRow, Card, CardTitle, Dot, Num, Stat, TabSkeleton, ValueRow } from "./ui";
import { fmt, valueColor, visibleData } from "./format";

// 溫度進度條的「顯示量程」，沿用桌面溫度儀表（0–200 °C）；不做告警判斷
const TEMP_DISPLAY_MAX = 200;

export default function UnitTab({
  data,
  status,
  theme,
}: {
  data: TelemetryData | null;
  status: ApiStatus;
  theme: MobileTheme;
}) {
  if (status === "connecting" && !data) return <TabSkeleton cards={5} />;

  const d = visibleData(data, status);
  const color = (field: keyof TelemetryData, v: number | null | undefined) =>
    valueColor(getAlarmLevel(field, v), theme);
  const pf = calcPowerFactor(d?.generatorApparentPowerS, d?.generatorActivePowerP);

  return (
    <>
      {/* 發電機功率 */}
      <Card className="flex flex-col gap-3">
        <CardTitle>發電機功率</CardTitle>
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          <Stat label="P 有效功率">
            <Num
              value={fmt(d?.generatorActivePowerP, 0)}
              unit="kW"
              color={color("generatorActivePowerP", d?.generatorActivePowerP)}
            />
          </Stat>
          <Stat label="S 視在功率">
            <Num
              value={fmt(d?.generatorApparentPowerS, 0)}
              unit="kVA"
              color={color("generatorApparentPowerS", d?.generatorApparentPowerS)}
            />
          </Stat>
          <Stat label="Q 無效功率">
            <Num
              value={fmt(d?.generatorReactivePowerQ, 0)}
              unit="kvar"
              color={color("generatorReactivePowerQ", d?.generatorReactivePowerQ)}
            />
          </Stat>
          <Stat label="功率因數 P.F">
            <Num value={fmt(pf, 2)} />
          </Stat>
        </div>
      </Card>

      {/* 繞組溫度 */}
      <Card className="flex flex-col gap-2">
        <CardTitle right={`0–${TEMP_DISPLAY_MAX} °C`}>發電機繞組溫度</CardTitle>
        {(["U", "V", "W"] as const).map((p) => {
          const field = `tempWinding${p}` as const;
          return (
            <BarRow
              key={p}
              inline
              label={`${p} 相`}
              value={d?.[field]}
              digits={1}
              unit="°C"
              max={TEMP_DISPLAY_MAX}
              field={field}
              theme={theme}
            />
          );
        })}
      </Card>

      {/* 軸承溫度 */}
      <Card className="flex flex-col gap-2">
        <CardTitle right={`0–${TEMP_DISPLAY_MAX} °C`}>發電機軸承溫度</CardTitle>
        <BarRow
          inline
          label="DE 驅動端"
          value={d?.tempBearingDe}
          digits={1}
          unit="°C"
          max={TEMP_DISPLAY_MAX}
          field="tempBearingDe"
          theme={theme}
        />
        <BarRow
          inline
          label="NDE 非驅動端"
          value={d?.tempBearingNde}
          digits={1}
          unit="°C"
          max={TEMP_DISPLAY_MAX}
          field="tempBearingNde"
          theme={theme}
        />
      </Card>

      {/* 振動（不放趨勢圖） */}
      <Card className="flex flex-col gap-3">
        <CardTitle right="mm/s">發電機振動</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="DE 驅動端">
            <Num value={fmt(d?.vibrationDE, 2)} size={30} color={color("vibrationDE", d?.vibrationDE)} />
          </Stat>
          <Stat label="NDE 非驅動端">
            <Num value={fmt(d?.vibrationNDE, 2)} size={30} color={color("vibrationNDE", d?.vibrationNDE)} />
          </Stat>
        </div>
      </Card>

      {/* HPU1／HPU2 */}
      <div className="grid grid-cols-2 gap-2.5">
        <HpuCard
          name="HPU1"
          pressure={d?.hpu1Pressure}
          pressureField="hpu1Pressure"
          motorOn={d?.hpu1MotorOn}
          valveLabel="QSD 閥"
          valveOpen={d?.hpu1QsdValveOpen}
          theme={theme}
        />
        <HpuCard
          name="HPU2"
          pressure={d?.hpu2Pressure}
          pressureField="hpu2Pressure"
          motorOn={d?.hpu2MotorOn}
          valveLabel="DN1400 閥"
          valveOpen={d?.hpu2Dn1400Open}
          theme={theme}
        />
      </div>
    </>
  );
}

function HpuCard({
  name,
  pressure,
  pressureField,
  motorOn,
  valveLabel,
  valveOpen,
  theme,
}: {
  name: string;
  pressure: number | null | undefined;
  pressureField: keyof TelemetryData;
  motorOn: boolean | null | undefined;
  valveLabel: string;
  valveOpen: boolean | null | undefined;
  theme: MobileTheme;
}) {
  return (
    <Card className="flex min-w-0 flex-col gap-1">
      <CardTitle>{name}</CardTitle>
      <ValueRow label="壓力">
        <Num
          value={fmt(pressure, 0)}
          unit="bar"
          size={16}
          color={valueColor(getAlarmLevel(pressureField, pressure), theme)}
        />
      </ValueRow>
      <ValueRow label="馬達">
        <OnOff value={motorOn} on="ON" off="OFF" />
      </ValueRow>
      <ValueRow label={valveLabel}>
        <OnOff value={valveOpen} on="OPEN" off="CLOSE" />
      </ValueRow>
    </Card>
  );
}

/** 開關值（§5）：true → 青點；false → 灰點；null → 灰圈＋-- */
function OnOff({ value, on, off }: { value: boolean | null | undefined; on: string; off: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
      <Dot color={value == null ? null : value ? ALARM_COLOR.normal : "var(--m-muted-dot)"} />
      <span className={value ? "text-[var(--m-accent-text)]" : "text-[var(--m-text-2)]"}>
        {value == null ? "--" : value ? on : off}
      </span>
    </span>
  );
}
