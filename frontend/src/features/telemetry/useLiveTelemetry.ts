import { useState, useEffect } from "react";
import { TelemetryData } from "./types";

export type ApiStatus = "connecting" | "ok" | "error";

export function useLiveTelemetry(url: string) {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [status, setStatus] = useState<ApiStatus>("connecting");

  useEffect(() => {
    const useMockData = import.meta.env.VITE_MOCK === "1";
    const apiUrl = import.meta.env.VITE_API_URL || url;
    const intervalMs = parseInt(
      import.meta.env.VITE_TELEMETRY_POLL_INTERVAL_MS || "1000",
      10
    );

    let timer: number | null = null;
    let ignore = false;

    function generateMock(): TelemetryData {
      const now = Date.now();
      const sec = Math.floor(now / 1000);
      const toggler = (n: number) => ((sec + n) % 2) === 0;
      const percent = Math.abs((sec % 101));
      const mainLineOpen = toggler(1);

      return {
        power_kw: 500 + Math.random() * 1000,
        energy_kwh: Math.random() * 500,
        discharge_cms: Math.random() * 50,
        capacity_factor: Math.random() * 100,
        noiseIndoor: 40 + Math.random() * 40,
        noiseOutdoor: 50 + Math.random() * 45,
        tempWindingU: Math.random() * 200,
        tempWindingV: Math.random() * 200,
        tempWindingW: Math.random() * 200,
        tempControlPanel: Math.random() * 200,
        tempEnvironment: Math.random() * 200,
        valves: {
          dn800: { open: toggler(0) },
          dn900: { open: mainLineOpen },
          dn1400: { open: mainLineOpen },
          dn1400D: { open: mainLineOpen },
          dn1350: { open: percent > 0, percent },
        },
        generatorApparentPowerS: -2000 + Math.random() * 4000,
        generatorActivePowerP: -2000 + Math.random() * 4000,
        generatorReactivePowerQ: -2000 + Math.random() * 4000,
        vibrationDE: Math.random() * 5,
        vibrationNDE: Math.random() * 5,
      };
    }

    async function fetchData() {
      if (useMockData) {
        setData(generateMock());
        setStatus("ok");
        return;
      }
      try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!ignore) {
          setData({ ...json });
          setStatus("ok");
        }
      } catch {
        if (!ignore) setStatus("error");
      }
    }

    fetchData();
    timer = window.setInterval(fetchData, intervalMs);

    return () => {
      ignore = true;
      if (timer) window.clearInterval(timer);
    };
  }, [url]);

  return { data, status };
}
