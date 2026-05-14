import { useEffect, useRef } from "react";
import "./valveStyles.css";
import { ValveAPI } from "./ValveAPI";
import valveSvgRaw from "@/assets/icons/valvestatusmap.svg?raw";
import SvgRenderer from "./SvgRenderer";

const COLOR_ACTIVE = "#06E2F4";
const COLOR_INACTIVE = "rgba(255,255,255,0.25)";

function Dot({ active, available = true }: { active: boolean; available?: boolean }) {
  const color = available && active ? COLOR_ACTIVE : available ? COLOR_INACTIVE : "rgba(255,255,255,0.12)";
  return (
    <div
      className="h-2 w-2 shrink-0 rounded-full"
      style={{
        backgroundColor: available && active ? COLOR_ACTIVE : "transparent",
        border: `1.5px solid ${color}`,
        boxShadow: available && active ? `0 0 5px ${COLOR_ACTIVE}` : "none",
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
    <div className="grid items-center" style={{ gridTemplateColumns: "52px 1fr 1fr" }}>
      <span className="text-[10px] font-semibold text-white leading-none">
        {label}
      </span>
      <div className="flex items-center justify-center gap-1">
        <Dot active={mainActive} />
        <span
          className="text-[10px] font-medium leading-none"
          style={{ color: mainActive ? COLOR_ACTIVE : COLOR_INACTIVE, transition: "color 0.4s" }}
        >
          Main
        </span>
      </div>
      <div className="flex items-center justify-center gap-1">
        <Dot active={fillingActive} available={fillingAvailable} />
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

interface ValveStatusMapProps {
  valves: {
    dn800?: { open: boolean };
    dn1400?: { open: boolean };
    dn900?: { open: boolean };
    dn1350?: { open: boolean; percent?: number };
    dn1400D?: { open: boolean };
  } | undefined;
  // Filling valve feedbacks
  dn1400FillingInletOpen?: boolean;
  dn1400FillingOutletOpen?: boolean;
  dn900FillingValveOpen?: boolean;
  className?: string;
}

export default function ValveStatusMap({
  valves,
  dn1400FillingInletOpen,
  dn1400FillingOutletOpen,
  dn900FillingValveOpen,
  className,
}: ValveStatusMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const insertedRef = useRef(false);

  function onSvgInsert(root: HTMLDivElement) {
    insertedRef.current = true;

    try {
      const svgEl = root.querySelector("svg") as SVGSVGElement | null;
      if (!svgEl) return;

      svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
      const bgGroup = svgEl.querySelector<SVGElement>('[id="Rectangle 7"]');
      if (bgGroup) bgGroup.style.display = "none";
      const svgTitle = svgEl.querySelector<SVGElement>('[id="Valve Status Overview"]');
      if (svgTitle) svgTitle.style.display = "none";

      const staticPath = svgEl.querySelector<SVGGraphicsElement>("#static-percent");
      const text = svgEl.querySelector<SVGTextElement>("#dn1350-text");
      if (staticPath && text) {
        const bbox = staticPath.getBBox();
        text.setAttribute("x", String(bbox.x + bbox.width / 2));
        text.setAttribute("y", String(bbox.y + bbox.height / 2));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("font-size", "12");
        text.setAttribute("font-weight", "700");
        text.setAttribute("fill", "#06E2F4");
        text.setAttribute("stroke", "#000");
        text.setAttribute("stroke-width", "0.6");
        (text.style as any).paintOrder = "stroke";
        text.style.visibility = "visible";
        svgEl.appendChild(text);
      }
    } catch (e) {
      console.warn("Positioning dn1350-text failed", e);
    }
  }

  useEffect(() => {
    if (!valves || !insertedRef.current || !containerRef.current) return;
    const root = containerRef.current;

    const mainLineOpen = !!(
      valves.dn900?.open ??
      valves.dn1400?.open ??
      valves.dn1400D?.open
    );

    ValveAPI.binary("dn800", valves.dn800?.open, root);
    ValveAPI.binary("dn1400", mainLineOpen, root);
    ValveAPI.binary("dn900", mainLineOpen, root);
    ValveAPI.binary("dn1350", valves.dn1350?.open, root);
    ValveAPI.binary("dn1400D", mainLineOpen, root);
    ValveAPI.ControlDN1350(valves.dn1350, root);
    ValveAPI.flow("flow-bypass", !!valves?.dn800?.open, root);
    ValveAPI.flow("flow-dn1350", !!valves?.dn1350?.open, root);
    ValveAPI.flow("flow-dn1400", mainLineOpen, root);
  }, [valves]);

  const dn1400Main = !!(valves?.dn1400?.open ?? valves?.dn900?.open ?? valves?.dn1400D?.open);
  const dn900Main = dn1400Main;
  const dn1400DMain = dn1400Main;
  const dn1400Filling = !!(dn1400FillingInletOpen || dn1400FillingOutletOpen);
  const dn900Filling = !!dn900FillingValveOpen;

  return (
    <div className={["valve-card", className].filter(Boolean).join(" ")}>
      <div className="shrink-0 flex justify-center pt-2.5 pb-1">
        <span className="whitespace-nowrap font-semibold text-[15px] leading-[18px] text-white">
          Valve Status Overview
        </span>
      </div>
      <SvgRenderer
        ref={containerRef}
        raw={valveSvgRaw}
        className="valve-svg-container"
        onInsert={onSvgInsert}
      />
      <div className="shrink-0 px-3 py-2 flex flex-col gap-[6px] border-t border-white/10">
        <ValveRow label="DN1400"  mainActive={dn1400Main}  fillingActive={dn1400Filling} />
        <ValveRow label="DN900"   mainActive={dn900Main}   fillingActive={dn900Filling} />
        <ValveRow label="DN1400D" mainActive={dn1400DMain} fillingActive={false} fillingAvailable={false} />
      </div>
    </div>
  );
}
