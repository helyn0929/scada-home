import React, { useEffect, useRef } from "react";
import "./valveStyles.css";
import { ValveAPI } from "./ValveAPI";
import valveSvgRaw from "@/assets/icons/valvestatusmap.svg?raw";
import SvgRenderer from "./SvgRenderer";

// Define the props for the ValveStatusMap component
//props: valves = {dn800: {open: true}, dn1400: {open: false}, dn900: {open: true}, dn1350: {open: false, percent: 45}, dn1400D: {open: true}}
interface ValveStatusMapProps {
  valves: {
    dn800?: { open: boolean };
    dn1400?: { open: boolean };
    dn900?: { open: boolean };
    dn1350?: { open: boolean; percent?: number };
    dn1400D?: { open: boolean };
  } | undefined;
}

export default function ValveStatusMap({ valves }: ValveStatusMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const insertedRef = useRef(false);

  // Called once after SVG is inserted
  function onSvgInsert(root: HTMLDivElement) {
    insertedRef.current = true;

    try {
      const svgEl = root.querySelector("svg") as SVGSVGElement | null;
      const staticPath = svgEl?.querySelector<SVGGraphicsElement>("#static-percent");
      const text = svgEl?.querySelector<SVGTextElement>("#dn1350-text");
      if (staticPath && text) {
        const bbox = staticPath.getBBox();
        const x = bbox.x + bbox.width / 2;
        const y = bbox.y + bbox.height / 2;
        text.setAttribute("x", String(x));
        text.setAttribute("y", String(y));
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

  // Update visuals whenever `valves` changes
  useEffect(() => {
    if (!valves || !insertedRef.current || !containerRef.current) return;
    const root = containerRef.current;

    // In operations, dn1400 / dn900 / dn1400D act as one main-line set.
    // If telemetry ever provides mismatched states, we still display them synchronously.
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

  return (
    <SvgRenderer
      ref={containerRef}
      raw={valveSvgRaw}
      className="valve-svg-container"
      onInsert={onSvgInsert}
    />
  );
}
