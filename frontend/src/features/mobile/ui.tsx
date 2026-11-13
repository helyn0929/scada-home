// 手機版共用小元件（MOBILE_DESIGN_SPEC.md §3）；顏色 token 見 src/index.css 的 .m-shell
import type { CSSProperties, ReactNode } from "react";
import { ALARM_COLOR, getAlarmLevel, type AlarmLevel } from "@/config/alarmThresholds";
import type { TelemetryData } from "@/features/telemetry/types";
import type { MobileTheme } from "./useMobileLayout";
import { fmt, valueColor } from "./format";

export function Card({
  children,
  className = "",
  pad = 14,
  style,
}: {
  children: ReactNode;
  className?: string;
  pad?: number;
  style?: CSSProperties;
}) {
  return (
    <section
      className={`rounded-[var(--m-card-radius)] border border-[var(--m-card-border)] bg-[var(--m-card)] ${className}`}
      style={{ padding: pad, boxShadow: "var(--m-card-shadow)", ...style }}
    >
      {children}
    </section>
  );
}

export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm font-semibold">{children}</span>
      {right && <span className="text-xs text-[var(--m-text-2)]">{right}</span>}
    </div>
  );
}

export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`text-xs tracking-[0.02em] text-[var(--m-text-2)] ${className}`}>{children}</span>;
}

/** 數值＋單位（§3.3）；color 由呼叫端依 getAlarmLevel 決定 */
export function Num({
  value,
  unit,
  size = 22,
  color,
}: {
  value: string;
  unit?: string;
  size?: number;
  color?: string;
}) {
  return (
    <span
      className="font-bold tabular-nums leading-tight text-[var(--m-text)]"
      style={{ fontSize: size, color }}
    >
      {value}
      {unit && <span className="ml-[3px] text-xs font-medium text-[var(--m-text-2)]">{unit}</span>}
    </span>
  );
}

/**
 * 進度條（§3.4）：寬度 = 值 / 顯示量程；量程只用於畫寬度，不做告警判斷
 * 值 null → 不填色；填色依告警等級（ALARM_COLOR）
 */
export function Bar({
  value,
  max,
  level,
}: {
  value: number | null | undefined;
  max: number;
  level: AlarmLevel;
}) {
  const pct = value == null || Number.isNaN(value) ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-1.5 rounded-[3px] bg-[var(--m-track)]">
      {value != null && (
        <div className="h-1.5 rounded-[3px]" style={{ width: `${pct}%`, background: ALARM_COLOR[level] }} />
      )}
    </div>
  );
}

/** 載入中骨架（不放假數字） */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--m-track)] ${className}`} aria-hidden />;
}

/** 標籤在上、數值在下的小格 */
export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/**
 * 進度條列：數值與進度條顏色依 getAlarmLevel(field)
 * inline=false → 標籤／數值一列、進度條在下（總覽）；inline=true → 標籤｜進度條｜數值同一列（機組、監測）
 */
export function BarRow({
  label,
  value,
  digits,
  unit,
  max,
  field,
  theme,
  inline = false,
}: {
  label: string;
  value: number | null | undefined;
  digits: number;
  unit: string;
  max: number;
  field: keyof TelemetryData;
  theme: MobileTheme;
  inline?: boolean;
}) {
  const level = getAlarmLevel(field, value);
  const num = <Num value={fmt(value, digits)} unit={unit} size={14} color={valueColor(level, theme)} />;
  if (inline) {
    return (
      <div className="grid min-h-8 grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3">
        <Label className="truncate">{label}</Label>
        <Bar value={value} max={max} level={level} />
        <span className="min-w-[64px] text-right">{num}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {num}
      </div>
      <Bar value={value} max={max} level={level} />
    </div>
  );
}

/** 狀態點：color 為 null → 灰色空心圈（無資料） */
export function Dot({ color, size = 8 }: { color: string | null; size?: number }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${color == null ? "border-[1.5px] border-[var(--m-muted-dot)]" : ""}`}
      style={{ width: size, height: size, background: color ?? "transparent" }}
      aria-hidden
    />
  );
}

/** 標籤＋右側數值的一列 */
export function ValueRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/** 一般分頁的載入中骨架 */
export function TabSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <>
      {Array.from({ length: cards }, (_, i) => (
        <Card key={i} className="flex flex-col gap-3">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </Card>
      ))}
    </>
  );
}
