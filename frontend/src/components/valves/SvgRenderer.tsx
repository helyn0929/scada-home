import React, { useEffect, useLayoutEffect, forwardRef, useRef } from "react";

type Props = {
  raw: string;
  className?: string;
  onInsert?: (root: HTMLDivElement) => void;
};

const SvgRenderer = forwardRef<HTMLDivElement, Props>(({ raw, className, onInsert }, ref) => {
  const innerRef = useRef<HTMLDivElement | null>(null);

  // Ensure parent ref is set to the actual DOM node
  useEffect(() => {
    const node = innerRef.current;
    if (!node) return;
    if (ref) {
      if (typeof ref === "function") ref(node);
      else (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  }, [ref]);

  // Insert SVG before paint to avoid flicker / timing races
  useLayoutEffect(() => {
    const root = innerRef.current;
    if (!root) return;
    try {
      if (root.innerHTML !== raw) root.innerHTML = raw;
      onInsert?.(root);
      // debug help — remove when stable
      // eslint-disable-next-line no-console
      console.debug("SvgRenderer inserted SVG", root);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("SvgRenderer failed to insert SVG:", e);
    }
  }, [raw, onInsert]);

  return <div ref={innerRef as any} className={className} />;
});

SvgRenderer.displayName = "SvgRenderer";
export default SvgRenderer;