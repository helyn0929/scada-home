// 手機版「總覽」分頁（MOBILE_DESIGN_SPEC.md §4）——scada-home 版：現場版尚無告警資料，不顯示告警橫幅
import type { ReactNode } from "react";
import type { TelemetryData } from "@/features/telemetry/types";
import type { ApiStatus } from "@/features/telemetry/useLiveTelemetry";
import { ALARM_COLOR, getAlarmLevel } from "@/config/alarmThresholds";
import { calcPowerFactor, computePowerhouseHealth, type HealthLevel } from "./powerhouseHealth";
import type { MobileTheme } from "./useMobileLayout";
import { BarRow, Card, CardTitle, Label, Num, Skeleton, Stat } from "./ui";
import { fmt, levelTextColor, valueColor, visibleData } from "./format";

// 以下僅為進度條「顯示量程」，不做告警判斷（沿用桌面儀表量程）
const GUIDE_VANE_MAX = 100;
const GEN_SPEED_PCT_MAX = 100;

export default function OverviewTab({
  data,
  status,
  theme,
}: {
  data: TelemetryData | null;
  status: ApiStatus;
  theme: MobileTheme;
}) {
  if (status === "connecting" && !data) return <OverviewSkeleton />;

  // 資料中斷：所有數值顯示 --（§9）
  const d = visibleData(data, status);
  const color = (field: keyof TelemetryData, v: number | null | undefined) =>
    valueColor(getAlarmLevel(field, v), theme);
  const pf = calcPowerFactor(d?.generatorApparentPowerS, d?.generatorActivePowerP);
  const health = computePowerhouseHealth(d);
  const light = theme === "light";

  return (
    <>
      {/* 有效功率主卡 */}
      <Card pad={18} className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <Label>有效功率 Active Power</Label>
          <span className="text-[var(--m-accent)]">
            <IconBolt />
          </span>
        </div>
        <div className="tracking-[-0.02em]">
          <Num value={fmt(d?.power_kw, 1)} unit="kW" size={48} color={color("power_kw", d?.power_kw)} />
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-[var(--m-card-border)] pt-3">
          <Stat label="S 視在">
            <Num
              value={fmt(d?.generatorApparentPowerS, 0)}
              unit="kVA"
              size={16}
              color={color("generatorApparentPowerS", d?.generatorApparentPowerS)}
            />
          </Stat>
          <Stat label="Q 無效">
            <Num
              value={fmt(d?.generatorReactivePowerQ, 0)}
              unit="kvar"
              size={16}
              color={color("generatorReactivePowerQ", d?.generatorReactivePowerQ)}
            />
          </Stat>
          <Stat label="P.F">
            <Num value={fmt(pf, 2)} size={16} />
          </Stat>
        </div>
      </Card>

      {/* 四格數值卡 */}
      <div className="grid grid-cols-2 gap-2.5">
        <KpiTile light={light} tint="#FFF1E3" icon={<IconTrend />} iconColor="#F59E0B" label="累計發電量">
          <Num value={fmt(d?.energy_kwh, 3)} unit={data?.energy_unit ?? "kWh"} size={24} color={color("energy_kwh", d?.energy_kwh)} />
        </KpiTile>
        <KpiTile light={light} tint="#EFEAFE" icon={<IconGaugePie />} iconColor="#8B5CF6" label="容量因數">
          <Num value={fmt(d?.capacity_factor, 1)} unit="%" size={24} color={color("capacity_factor", d?.capacity_factor)} />
        </KpiTile>
        <KpiTile light={light} tint="#E3F7F7" icon={<IconWaves />} iconColor="#0891B2" label="出水量 Discharge">
          <Num value={fmt(d?.discharge_cms, 3)} unit="cms" size={24} color={color("discharge_cms", d?.discharge_cms)} />
        </KpiTile>
        <KpiTile light={light} tint="#F4FAD9" icon={<IconRotor />} iconColor="#65A30D" label="發電機轉速">
          <Num value={fmt(d?.genSpeedRpm, 0)} unit="rpm" size={24} color={color("genSpeedRpm", d?.genSpeedRpm)} />
        </KpiTile>
      </div>

      {/* 運轉參數 */}
      <Card className="flex flex-col gap-3">
        <CardTitle>運轉參數</CardTitle>
        <BarRow
          label="導葉開度 Wicket gate"
          value={d?.guideVanePct}
          digits={0}
          unit="%"
          max={GUIDE_VANE_MAX}
          field="guideVanePct"
          theme={theme}
        />
        <BarRow
          label="發電機轉速比 Gen speed"
          value={d?.genSpeedPct}
          digits={0}
          unit="%"
          max={GEN_SPEED_PCT_MAX}
          field="genSpeedPct"
          theme={theme}
        />
        <div className="flex items-center justify-between">
          <Label>水流量 Water flow</Label>
          <Num value={fmt(d?.discharge_cms, 2)} unit="cms" size={14} color={color("discharge_cms", d?.discharge_cms)} />
        </div>
      </Card>

      {/* 廠房狀態 */}
      <Card className="flex flex-col gap-2.5">
        <CardTitle>廠房狀態</CardTitle>
        <div className="flex flex-wrap gap-2">
          <HealthChip label="水力" level={health.hydraulic} theme={theme} />
          <HealthChip label="電氣" level={health.electrical} theme={theme} />
          <HealthChip label="環境" level={health.environment} theme={theme} />
        </div>
      </Card>
    </>
  );
}

/** 2×2 數值卡：淺色版為淡色底＋白色圖示方塊；深色版為一般卡片 */
function KpiTile({
  light,
  tint,
  icon,
  iconColor,
  label,
  children,
}: {
  light: boolean;
  tint: string;
  icon: ReactNode;
  iconColor: string;
  label: string;
  children: ReactNode;
}) {
  if (!light) {
    return (
      <Card className="flex min-w-0 flex-col gap-1.5">
        <Label>{label}</Label>
        {children}
      </Card>
    );
  }
  return (
    <section
      className="flex min-w-0 flex-col gap-2 rounded-[var(--m-card-radius)] p-[14px]"
      style={{ background: tint }}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white" style={{ color: iconColor }}>
        {icon}
      </span>
      <Label className="!text-[#4B5563]">{label}</Label>
      {children}
    </section>
  );
}

const HEALTH_LABEL: Record<HealthLevel, string> = {
  normal: "正常",
  warning: "警告",
  alarm: "告警",
  unknown: "--",
};

function HealthChip({ label, level, theme }: { label: string; level: HealthLevel; theme: MobileTheme }) {
  const alarmLevel = level === "alarm" ? "critical" : level === "warning" ? "warning" : "normal";
  let bg: string;
  let fg: string;
  if (level === "unknown") {
    bg = "var(--m-muted-bg)";
    fg = "var(--m-text-2)";
  } else if (level === "normal") {
    bg = theme === "light" ? "#E3F6F9" : "#0F2530";
    fg = theme === "light" ? "#0E7490" : "#67E8F9";
  } else if (alarmLevel === "critical") {
    // 與告警條同配色（ALARM_COLOR 紅字在紅底上對比不足）
    bg = "var(--m-alert-bg)";
    fg = "var(--m-alert-text)";
  } else {
    bg = `${ALARM_COLOR[alarmLevel]}26`; // 約 15% 透明度
    fg = levelTextColor(alarmLevel, theme);
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: bg, color: fg }}
    >
      {level === "unknown" ? (
        <span className="h-[7px] w-[7px] rounded-full border border-[var(--m-muted-dot)]" />
      ) : (
        <span className="h-[7px] w-[7px] rounded-full" style={{ background: ALARM_COLOR[alarmLevel] }} />
      )}
      {label} {HEALTH_LABEL[level]}
    </span>
  );
}

function OverviewSkeleton() {
  return (
    <>
      <Card pad={18} className="flex flex-col gap-3.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-12 w-44" />
        <Skeleton className="h-9 w-full" />
      </Card>
      <div className="grid grid-cols-2 gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-24" />
          </Card>
        ))}
      </div>
      <Card className="flex flex-col gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </Card>
    </>
  );
}

/* ── 圖示（取自設計稿，stroke 2px） ── */
const svgProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};
const IconBolt = () => (
  <svg {...svgProps}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
  </svg>
);
const IconTrend = () => (
  <svg {...svgProps}>
    <path d="M3 17l5-6 4 3 6-8" />
    <path d="M14 6h4v4" />
  </svg>
);
const IconGaugePie = () => (
  <svg {...svgProps}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 12V4" />
    <path d="M12 12l6 4" />
  </svg>
);
const IconWaves = () => (
  <svg {...svgProps}>
    <path d="M3 9c3-2 6 2 9 0s6-2 9 0" />
    <path d="M3 15c3-2 6 2 9 0s6-2 9 0" />
  </svg>
);
const IconRotor = () => (
  <svg {...svgProps}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
  </svg>
);
