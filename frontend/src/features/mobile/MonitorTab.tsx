// 手機版「監測」分頁，頁首標題「環境監測」（MOBILE_DESIGN_SPEC.md §6）
import type { TelemetryData } from "@/features/telemetry/types";
import type { ApiStatus } from "@/features/telemetry/useLiveTelemetry";
import { ALARM_COLOR, getAlarmLevel, getBoolAlarmLevel } from "@/config/alarmThresholds";
import type { MobileTheme } from "./useMobileLayout";
import { BarRow, Card, CardTitle, Dot, Label, Num, TabSkeleton, ValueRow } from "./ui";
import { fmt, levelTextColor, valueColor, visibleData } from "./format";

// 噪音進度條「顯示量程」，沿用桌面噪音圖（0–100 dB）；不做告警判斷
const NOISE_DISPLAY_MAX = 100;

const SYSTEM_ALARMS: { field: "overpressureValveAlarm" | "upsAlarm" | "generalShutdownAlarm"; label: string }[] = [
  { field: "overpressureValveAlarm", label: "Overpressure 洩壓閥" },
  { field: "upsAlarm", label: "UPS 不斷電" },
  { field: "generalShutdownAlarm", label: "General shutdown 總停機" },
];

export default function MonitorTab({
  data,
  status,
  theme,
}: {
  data: TelemetryData | null;
  status: ApiStatus;
  theme: MobileTheme;
}) {
  if (status === "connecting" && !data) return <TabSkeleton cards={4} />;

  const d = visibleData(data, status);
  const color = (field: keyof TelemetryData, v: number | null | undefined) =>
    valueColor(getAlarmLevel(field, v), theme);

  return (
    <>
      {/* 系統告警點 */}
      <Card className="flex flex-col" pad={14}>
        <Label>系統告警點</Label>
        <ul className="mt-1 divide-y divide-[var(--m-card-border)]">
          {SYSTEM_ALARMS.map(({ field, label }) => {
            const value = d?.[field];
            const level = getBoolAlarmLevel(field, value);
            const alarming = level != null && level !== "normal";
            return (
              <li key={field} className="flex min-h-12 items-center gap-3">
                <Dot color={level == null ? null : ALARM_COLOR[level]} />
                <span className={`min-w-0 flex-1 text-sm ${alarming ? "font-bold" : ""}`}>{label}</span>
                <span
                  className="text-[13px] font-bold"
                  style={{
                    color:
                      level == null
                        ? "var(--m-text-2)"
                        : alarming
                          ? levelTextColor(level, theme)
                          : "var(--m-accent-text)",
                  }}
                >
                  {value == null ? "--" : value ? "ON" : "OFF"}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* 環境溫度 */}
      <h2 className="mt-1 px-0.5 text-sm font-semibold">環境溫度</h2>
      <div className="grid grid-cols-2 gap-2.5">
        <Card className="flex min-w-0 flex-col gap-1">
          <Label>控制盤 Cubicle</Label>
          <Num value={fmt(d?.tempControlPanel, 1)} unit="°C" size={24} color={color("tempControlPanel", d?.tempControlPanel)} />
        </Card>
        <Card className="flex min-w-0 flex-col gap-1">
          <Label>廠房 Powerhouse</Label>
          <Num value={fmt(d?.tempEnvironment, 1)} unit="°C" size={24} color={color("tempEnvironment", d?.tempEnvironment)} />
        </Card>
      </div>

      {/* 噪音 */}
      <Card className="flex flex-col gap-2">
        <CardTitle right={`0–${NOISE_DISPLAY_MAX} dB`}>噪音監測</CardTitle>
        <BarRow
          inline
          label="室內"
          value={d?.noiseIndoor}
          digits={0}
          unit="dB"
          max={NOISE_DISPLAY_MAX}
          field="noiseIndoor"
          theme={theme}
        />
        <BarRow
          inline
          label="室外"
          value={d?.noiseOutdoor}
          digits={0}
          unit="dB"
          max={NOISE_DISPLAY_MAX}
          field="noiseOutdoor"
          theme={theme}
        />
      </Card>

      {/* 水中含油 */}
      <Card className="flex flex-col gap-1">
        <CardTitle>水中含油 Oil in Water</CardTitle>
        <ValueRow label="入水 DN900 前">
          <Num value={fmt(d?.waterQualityIn, 3)} unit="ppm" size={15} color={color("waterQualityIn", d?.waterQualityIn)} />
        </ValueRow>
        <ValueRow label="出水 DN1400D 後">
          <Num value={fmt(d?.waterQualityOut, 3)} unit="ppm" size={15} color={color("waterQualityOut", d?.waterQualityOut)} />
        </ValueRow>
      </Card>
    </>
  );
}
