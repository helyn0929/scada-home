import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomeScreen from "@/features/home/HomeScreen";
import React, { useEffect, forwardRef } from "react";

type Props = {
  raw: string;
  className?: string;
  onInsert?: (root: HTMLDivElement) => void;
};

const SvgRenderer = forwardRef<HTMLDivElement, Props>(
  ({ raw, className, onInsert }, ref) => {
    useEffect(() => {
      const root = (ref as React.RefObject<HTMLDivElement>)?.current;
      if (!root) return;
      root.innerHTML = raw;
      onInsert?.(root);
      // keep raw as dependency to replace SVG if changed
    }, [raw, ref, onInsert]);

    return <div ref={ref as any} className={className} />;
  }
);

SvgRenderer.displayName = "SvgRenderer";

export default function App() {
  return (
    <>
      <HomeScreen />
      <SvgRenderer />
    </>
  );
}