import { useEffect, useRef } from "react";
import "./valveStyles.css";
import { ValveAPI } from "./ValveAPI";
import valveSvgRaw from "@/assets/icons/valvestatusmap.svg?raw";

//props: valves = {dn800: {open: true}, dn1400: {open: false}, dn900: {open: true}, dn1350: {open: false, percent: 45}, dn1400D: {open: true}}
interface ValveStatusMapProps {
  valves: {
    dn800?: { open: boolean };
    dn1400?: { open: boolean };
    dn900?: { open: boolean };
    dn1350?: { open: boolean; percent?: number };
    dn1400D?: { open: boolean };
  }
}

export default function ValveStatusMap({ valves }: ValveStatusMapProps) {
  console.log("ValveStatusMap RENDER");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const insertedRef = useRef(false);

  useEffect(() => {
    // Insert SVG once into the container (synchronous)
    const root = containerRef.current;
    if (!root || insertedRef.current) return;
    try {
      root.innerHTML = valveSvgRaw;
      insertedRef.current = true;
    } catch (err) {
      console.error("Failed to insert SVG into container:", err);
    }
    // Position dn1350 percent text at the legacy percent graphic location
    try {
      const svgEl = root.querySelector("svg") as SVGSVGElement | null;
      const staticPath = svgEl?.querySelector<SVGGraphicsElement>("#static-percent");
      const text = svgEl?.querySelector<SVGTextElement>('#dn1350-text');
      if (staticPath && text) {
        const bbox = staticPath.getBBox();
        const x = bbox.x + bbox.width / 2;
        const y = bbox.y + bbox.height / 2;
        text.setAttribute('x', String(x));
        text.setAttribute('y', String(y));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        // Improve visibility: larger, bold, colored with thin stroke
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', '700');
        text.setAttribute('fill', '#06E2F4');
        text.setAttribute('stroke', '#000');
        text.setAttribute('stroke-width', '0.6');
        (text.style as any).paintOrder = 'stroke';
        text.style.visibility = 'visible';
        // Bring text to front so it's not occluded by other SVG elements
        svgEl.appendChild(text);
        // Debug information
        console.log('dn1350 positioning:', {
          foundStatic: !!staticPath,
          bbox,
          textX: text.getAttribute('x'),
          textY: text.getAttribute('y'),
          textFill: text.getAttribute('fill'),
          textVisibility: text.style.visibility,
        });
      } else {
        console.warn('dn1350 positioning: staticPath or dn1350-text not found', { staticPath: !!staticPath, text: !!text });
      }
    } catch (e) {
      console.warn('Positioning dn1350-text failed', e);
    }
  }, []);

  useEffect(() => {
    if (!valves || !insertedRef.current || !containerRef.current) return;

    const root = containerRef.current;
    ValveAPI.binary("dn800", valves.dn800?.open, root);
    ValveAPI.binary("dn1400", valves.dn1400?.open, root);
    ValveAPI.binary("dn900", valves.dn900?.open, root);
    ValveAPI.binary("dn1350", valves.dn1350?.open, root);
    // Match SVG id "valve-dn1400D" (capital D)
    ValveAPI.binary("dn1400D", valves.dn1400D?.open, root);

    ValveAPI.ControlDN1350(valves.dn1350, root);

    ValveAPI.flow("flow-bypass", !!valves?.dn800?.open, root);
    ValveAPI.flow("flow-dn1350", !!valves?.dn1350?.open, root);
    ValveAPI.flow(
      "flow-dn1400",
      !!valves?.dn1400?.open &&
        !!valves?.dn900?.open &&
        !!valves?.dn1400D?.open,
      root
    );
  }, [valves]);

  return (
    <div className="scada-card">
      <div ref={containerRef} className="valve-svg-container" />
    </div>
  );
}
