// 手機版骨架：頁首 ＋ 可捲動內容 ＋ 底部分頁列（MOBILE_DESIGN_SPEC.md §2）
// 即時數據在這裡輪詢一次，供所有分頁共用
// scada-home 版：現場版尚無告警資料，告警分頁為空、不顯示告警膠囊與鈴鐺數字
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLiveTelemetryWithStatus, type ApiStatus } from "@/features/telemetry/useLiveTelemetry";
import { useAlarmThresholds } from "@/config/alarmThresholds";
import { useIsMobile, useMobileTheme } from "./useMobileLayout";
import OverviewTab from "./OverviewTab";
import UnitTab from "./UnitTab";
import MonitorTab from "./MonitorTab";
import ValvesTab from "./ValvesTab";
import { IconBell, IconMonitor, IconMoon, IconOverview, IconSun, IconUnit, IconValve } from "./icons";

export type MobileTab = "overview" | "unit" | "monitor" | "valves" | "alarms";

const TABS: { id: MobileTab; label: string; title: string; icon: () => ReactNode }[] = [
  { id: "overview", label: "總覽", title: "總覽", icon: IconOverview },
  { id: "unit", label: "機組", title: "機組", icon: IconUnit },
  { id: "monitor", label: "監測", title: "環境監測", icon: IconMonitor },
  { id: "valves", label: "閥門", title: "閥門狀態", icon: IconValve },
  { id: "alarms", label: "告警", title: "告警", icon: IconBell },
];

/**
 * 手機寬度（< 768px）時顯示手機版，否則顯示桌面版 children
 * scada-home 沒有路由，整個首頁一起切換
 */
export function MobileGate({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileShell />;
  return <>{children}</>;
}

export default function MobileShell({ initialTab = "overview" }: { initialTab?: MobileTab }) {
  const [tab, setTab] = useState<MobileTab>(initialTab);
  const { theme, toggle } = useMobileTheme();
  // 總覽／機組／監測／閥門分頁共用同一份即時數據
  const { data, status, dataTime } = useLiveTelemetryWithStatus("/api/telemetry");
  // 門檻（介面同主系統；本 repo 門檻固定在 config/alarmThresholds.ts）
  useAlarmThresholds();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 切換分頁時回到頂端
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div
      className="m-shell fixed inset-0 flex flex-col bg-[var(--m-bg)] text-[var(--m-text)]"
      data-theme={theme}
    >
      <header className="flex shrink-0 items-center gap-2 px-[18px] pt-[18px] pb-2.5 min-h-14">
        {tab === "overview" ? (
          <div className="flex flex-col gap-0.5">
            <img src="/aesmegalogo.png" alt="AES Mega" className="block h-7 w-auto" />
            <div className="text-xs tracking-[0.02em] text-[var(--m-text-2)]">韋峰能源股份有限公司</div>
          </div>
        ) : (
          <h1 className="text-[22px] font-bold leading-7">{current.title}</h1>
        )}
        <div className="flex-1" />
        {tab === "overview" && <ConnectionChip status={status} dataTime={dataTime} />}
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === "dark" ? "切換為淺色模式" : "切換為深色模式"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--m-btn-border)] bg-[var(--m-btn)] text-[var(--m-text)] focus-visible:outline-2 focus-visible:outline-[var(--m-accent)]"
        >
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </button>
      </header>

      <main
        ref={scrollRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pt-1 pb-4"
      >
        {tab === "overview" && (
          <OverviewTab
            data={data}
            status={status}
            theme={theme}
          />
        )}
        {(tab === "unit" || tab === "monitor" || tab === "valves") && (
          <DataStatusBanner status={status} hasData={data != null} dataTime={dataTime} />
        )}
        {tab === "unit" && <UnitTab data={data} status={status} theme={theme} />}
        {tab === "monitor" && <MonitorTab data={data} status={status} theme={theme} />}
        {tab === "valves" && <ValvesTab data={data} status={status} theme={theme} />}
        {tab === "alarms" && <AlarmsPlaceholder />}
      </main>

      <nav
        aria-label="主要分頁"
        className="flex shrink-0 gap-1 border-t border-[var(--m-tabbar-border)] bg-[var(--m-tabbar)] px-2 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))]"
      >
        {TABS.map((t) => {
          const on = t.id === tab;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-[3px] rounded-2xl text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--m-accent)] ${
                on
                  ? "bg-[var(--m-tab-on-bg)] font-semibold text-[var(--m-tab-on-text)]"
                  : "text-[var(--m-text-3)]"
              }`}
            >
              <span className="relative">
                <Icon />
              </span>
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * 機組／監測／閥門分頁的連線提示：只在資料中斷或連線失敗時出現（正常時不佔空間）
 * 總覽右上已有連線膠囊，不重複顯示
 */
function DataStatusBanner({
  status,
  hasData,
  dataTime,
}: {
  status: ApiStatus;
  hasData: boolean;
  dataTime: Date | null;
}) {
  if (status !== "down" && status !== "error") return null;
  const time = dataTime ? hms(dataTime) : null;
  const text =
    status === "down"
      ? `資料中斷${time ? `，最後資料 ${time}` : ""}`
      : hasData && time
        ? `連線失敗，顯示 ${time} 的資料`
        : "連線失敗，無法取得即時數據";
  const isError = status === "error";
  return (
    <div
      role="status"
      className={`flex min-h-9 items-center gap-2 rounded-full px-4 text-[13px] ${
        isError ? "bg-[var(--m-alert-bg)] text-[var(--m-alert-text)]" : "bg-[var(--m-muted-bg)] text-[var(--m-text-2)]"
      }`}
    >
      <span className={`h-2 w-2 shrink-0 animate-pulse rounded-full ${isError ? "bg-[#EF4444]" : "bg-[var(--m-muted-dot)]"}`} />
      <span className="min-w-0 truncate">{text}</span>
      <span className="ml-auto shrink-0 text-xs">每 5 秒重試</span>
    </div>
  );
}

function hms(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 連線狀態膠囊（§3.1） */
function ConnectionChip({ status, dataTime }: { status: ApiStatus; dataTime: Date | null }) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = dataTime
    ? `${pad(dataTime.getHours())}:${pad(dataTime.getMinutes())}:${pad(dataTime.getSeconds())}`
    : "";

  const style: Record<ApiStatus, { box: string; dot: string; label: string }> = {
    live: { box: "bg-[var(--m-ok-bg)] text-[var(--m-ok-text)]", dot: "bg-[var(--m-ok-text)]", label: `即時 ${time}`.trim() },
    down: { box: "bg-[var(--m-muted-bg)] text-[var(--m-text-2)]", dot: "bg-[var(--m-muted-dot)]", label: "資料中斷" },
    error: { box: "bg-[var(--m-alert-bg)] text-[var(--m-alert-text)]", dot: "bg-[#EF4444]", label: "連線失敗" },
    connecting: { box: "bg-[var(--m-muted-bg)] text-[var(--m-text-2)]", dot: "bg-[var(--m-muted-dot)] animate-pulse", label: "連線中" },
  };
  const s = style[status];

  return (
    <div role="status" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs tabular-nums ${s.box}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </div>
  );
}

/** 告警分頁：現場版尚無告警資料，先留空（之後接上告警 API 再實作，可參考主系統 AlarmsTab） */
function AlarmsPlaceholder() {
  return (
    <section className="flex min-h-40 items-center justify-center rounded-[var(--m-card-radius)] border border-[var(--m-card-border)] bg-[var(--m-card)] p-4 text-center text-sm text-[var(--m-text-2)] shadow-[var(--m-card-shadow)]">
      目前尚無告警資料
    </section>
  );
}
