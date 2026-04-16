import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ScaleToFitProps = {
  /** Border-box width of the design canvas in CSS pixels. */
  designWidth: number;
  /** Optional border-box height of the design canvas in CSS pixels. When set, scale also fits height. */
  designHeight?: number;
  children: ReactNode;
  className?: string;
  /**
   * If the viewport is so narrow that `available / designWidth` would drop below this,
   * scale is clamped here and horizontal scroll is enabled.
   */
  minScale?: number;
};

/**
 * Scales a fixed-width SCADA-style layout to fit the parent width (HMI-style responsive).
 * Uses `transform: scale` + compensated height so the page does not leave a large empty gap.
 */
export default function ScaleToFit({
  designWidth,
  designHeight,
  children,
  className = "",
  minScale = 0.45,
}: ScaleToFitProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{
    scale: number;
    scaledHeight: number;
    overflowX: boolean;
  }>({ scale: 1, scaledHeight: 0, overflowX: false });

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      const rect = outer.getBoundingClientRect();
      const availW = rect.width;
      const availH = rect.height;
      const rawW = availW / designWidth;
      // offsetHeight is the layout box before transform; getBoundingClientRect includes scale.
      const unscaledH = Math.max(inner.offsetHeight, inner.scrollHeight);
      const baseH = designHeight ?? unscaledH;
      const rawH = baseH > 0 ? availH / baseH : 1;
      const raw = Math.min(rawW, rawH);
      // For true fit-to-height, keep minScale at 0 (or very low), otherwise the canvas will clip.
      const scale = Math.min(1, Math.max(minScale, raw));
      const overflowX = scale * designWidth > availW + 0.5;
      const scaledHeight = unscaledH * scale;
      setLayout({ scale, scaledHeight, overflowX });
    };

    update();

    const roOuter = new ResizeObserver(() => update());
    const roInner = new ResizeObserver(() => update());
    roOuter.observe(outer);
    roInner.observe(inner);
    return () => {
      roOuter.disconnect();
      roInner.disconnect();
    };
  }, [designWidth, minScale]);

  return (
    <div
      ref={outerRef}
      className={[
        "w-full h-full overflow-y-hidden",
        layout.overflowX ? "overflow-x-auto" : "overflow-x-hidden",
        className,
      ].join(" ")}
    >
      <div style={{ height: layout.scaledHeight || undefined }}>
        <div
          ref={innerRef}
          style={{
            width: designWidth,
            transform: `scale(${layout.scale})`,
            transformOrigin: "top left",
          }}
          className="will-change-transform"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
