// 手機版「閥門」分頁（MOBILE_DESIGN_SPEC.md §7）
// 只顯示資料中有的開關狀態；不自行推導「運轉模式」
import type { TelemetryData, ValveState, Valves } from "@/features/telemetry/types";
import type { ApiStatus } from "@/features/telemetry/useLiveTelemetry";
import { ALARM_COLOR, getAlarmLevel } from "@/config/alarmThresholds";
import type { MobileTheme } from "./useMobileLayout";
import { Card, CardTitle, Dot, Label, Num, TabSkeleton, ValueRow } from "./ui";
import { fmt, valueColor, visibleData } from "./format";

/** 開＝青、關＝紅（同桌面閥件圖 ValveAPI.binary）、無資料＝灰色空心圈 */
const OPEN_COLOR = ALARM_COLOR.normal;
const CLOSED_COLOR = ALARM_COLOR.critical;

type Tri = boolean | null | undefined;

const FLOW: { key: keyof Valves; name: string; desc: string }[] = [
  { key: "dn800", name: "DN800", desc: "洩壓閥" },
  { key: "dn1350", name: "DN1350", desc: "單噴孔流量閥" },
  { key: "dn1400", name: "DN1400", desc: "主進水閥" },
  { key: "dn900", name: "DN900", desc: "機組進水" },
  { key: "dn1400D", name: "DN1400D", desc: "下游出水" },
];

/** DN1350 單噴孔流量閥：只顯示全開／全關，其他狀態顯示 --（使用者決定） */
const DN1350_STATE: Partial<Record<NonNullable<ValveState["state"]>, string>> = {
  open: "全開",
  closed: "全關",
};

export default function ValvesTab({
  data,
  status,
  theme,
}: {
  data: TelemetryData | null;
  status: ApiStatus;
  theme: MobileTheme;
}) {
  if (status === "connecting" && !data) return <TabSkeleton cards={3} />;

  const d = visibleData(data, status);
  const light = theme === "light";
  const pathColor = light ? "#A5E6EF" : "#1E4D57";
  const color = (field: keyof TelemetryData, v: number | null | undefined) =>
    valueColor(getAlarmLevel(field, v), theme);

  return (
    <>
      {/* 圖例 */}
      <div className="flex items-center gap-4 px-0.5 text-xs text-[var(--m-text-2)]">
        <span className="inline-flex items-center gap-1.5">
          <Dot color={OPEN_COLOR} />
          ON／開
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Dot color={CLOSED_COLOR} />
          OFF／關
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Dot color={null} />
          未知
        </span>
      </div>

      {/* 閥件流程 */}
      <Card className="flex flex-col gap-1">
        <div className="pl-7 text-xs text-[var(--m-text-2)]">
          水流方向 <span className="text-[var(--m-accent)]">↓</span> 上游 → 機組
        </div>
        <ol>
          {FLOW.map(({ key, name, desc }, i) => {
            const v = d?.valves?.[key];
            const isDn1350 = key === "dn1350";
            const dn1350State = isDn1350 ? (v?.state ?? stateFromOpen(v?.open)) : undefined;
            const open: Tri = isDn1350 ? openFromState(dn1350State) : v?.open;
            return (
              <li key={key} className="flex min-h-16 items-stretch gap-3">
                {/* 路徑線＋節點 */}
                <div className="relative flex w-4 shrink-0 items-center justify-center">
                  <span
                    className="absolute left-1/2 w-[3px] -translate-x-1/2"
                    style={{
                      background: pathColor,
                      top: i === 0 ? "50%" : 0,
                      bottom: i === FLOW.length - 1 ? "50%" : 0,
                    }}
                  />
                  <span className="relative rounded-full bg-[var(--m-card)]">
                    <Dot color={nodeColor(open)} size={16} />
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className="text-[15px] font-bold leading-5">{name}</span>
                  <span className="text-xs text-[var(--m-text-2)]">
                    {desc}
                    {isDn1350 && (
                      <>
                        {" · 開度 "}
                        <span className="font-semibold tabular-nums text-[var(--m-text)]">
                          {fmt(v?.percent, 1)}
                          {v?.percent != null && "%"}
                        </span>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center">
                  {isDn1350 ? (
                    <StatePill open={open} text={(dn1350State && DN1350_STATE[dn1350State]) ?? "--"} light={light} />
                  ) : (
                    <StatePill open={open} text={openText(open)} light={light} />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      {/* 充水閥 */}
      <Card className="flex flex-col gap-1">
        <CardTitle>充水閥 Filling</CardTitle>
        <FillingRow label="DN1400 充水進" open={d?.dn1400FillingInletOpen} />
        <FillingRow label="DN1400 充水出" open={d?.dn1400FillingOutletOpen} />
        <FillingRow label="DN900 充水閥" open={d?.dn900FillingValveOpen} />
      </Card>

      {/* 管路壓力 */}
      <Card className="flex flex-col gap-1">
        <CardTitle>管路壓力</CardTitle>
        <div className="mt-1 text-[13px] font-semibold">DN1350</div>
        <ValueRow label="閥前 Before">
          <Num value={fmt(d?.pressureBeforeDn1350, 1)} unit="bar" size={15} color={color("pressureBeforeDn1350", d?.pressureBeforeDn1350)} />
        </ValueRow>
        <ValueRow label="閥後 After">
          <Num value={fmt(d?.pressureAfterDn1350, 1)} unit="bar" size={15} color={color("pressureAfterDn1350", d?.pressureAfterDn1350)} />
        </ValueRow>
        <div className="my-1 border-t border-[var(--m-card-border)]" />
        <div className="text-[13px] font-semibold">DN900</div>
        <ValueRow label="閥前 Before">
          <Num value={fmt(d?.pressureBeforeDn900, 2)} unit="bar" size={15} color={color("pressureBeforeDn900", d?.pressureBeforeDn900)} />
        </ValueRow>
        <ValueRow label="閥後 After">
          <Num value={fmt(d?.pressureAfterDn900, 2)} unit="bar" size={15} color={color("pressureAfterDn900", d?.pressureAfterDn900)} />
        </ValueRow>
      </Card>
    </>
  );
}

/** 沒有 state 欄位時，以開關回授顯示全開／全關 */
function stateFromOpen(open: Tri): ValveState["state"] {
  return open == null ? undefined : open ? "open" : "closed";
}

/** 全開／全關以外的狀態，節點與標籤一致顯示為未知（灰色空心圈、--） */
function openFromState(state: ValveState["state"]): Tri {
  if (state === "open") return true;
  if (state === "closed") return false;
  return null;
}

function nodeColor(open: Tri): string | null {
  return open == null ? null : open ? OPEN_COLOR : CLOSED_COLOR;
}

function openText(open: Tri): string {
  return open == null ? "--" : open ? "ON" : "OFF";
}

function StatePill({ open, text, light }: { open: Tri; text: string; light: boolean }) {
  const style =
    open == null
      ? { background: "var(--m-muted-bg)", color: "var(--m-text-2)" }
      : open
        ? { background: light ? "#E3F6F9" : "#0F2530", color: "var(--m-accent-text)" }
        : { background: "var(--m-alert-bg)", color: "var(--m-alert-text)" };
  return (
    <span className="inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-bold" style={style}>
      {text}
    </span>
  );
}

function FillingRow({ label, open }: { label: string; open: Tri }) {
  return (
    <div className="flex min-h-10 items-center gap-2.5">
      <Dot color={nodeColor(open)} />
      <Label className="flex-1">{label}</Label>
      <span
        className="text-[13px] font-bold"
        style={{
          color: open == null ? "var(--m-text-2)" : open ? "var(--m-accent-text)" : "var(--m-alert-text)",
        }}
      >
        {openText(open)}
      </span>
    </div>
  );
}
