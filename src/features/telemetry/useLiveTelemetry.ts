import { useState, useEffect } from "react";
import { TelemetryData } from "./types";

export function useLiveTelemetry(url: string) {
  const [data, setData] = useState<TelemetryData | null>(null);

  useEffect(() => {
    const useMockData = import.meta.env.VITE_MOCK === "1";
    const apiUrl = import.meta.env.VITE_API_URL || url;
    const intervalMs = parseInt(import.meta.env.VITE_TELEMETRY_POLL_INTERVAL_MS || "1000", 10);

    let timer: number | null = null;
    let ignore = false;

    function generateMock(): TelemetryData {
      const now = Date.now();
      const sec = Math.floor(now / 1000);
      const toggler = (n: number) => ((sec + n) % 2) === 0;
      const percent = Math.abs((sec % 101));

      return {
        power_kw: 500 + Math.random() * 1000,
        energy_kwh: Math.random() * 500,
        discharge_cms: Math.random() * 50,
        capacity_factor: Math.random() * 100,
        valves: {
          dn800: { open: toggler(0) },
          dn900: { open: toggler(1) },
          dn1400: { open: toggler(2) },
          dn1400D: { open: toggler(3) },
          dn1350: { open: percent > 0, percent },
        },
      };
    }

    async function fetchData() {
      if (useMockData) {
        setData(generateMock());
        return;
      }
      try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error("Request failed");
        const json = await res.json();
        if (!ignore) {
          setData({
            power_kw: json.power_kw,
            energy_kwh: json.energy_kwh,
            discharge_cms: json.discharge_cms,
            capacity_factor: json.capacity_factor,
            valves: json.valves, // expect backend to provide the `valves` structure
          });
        }
      } catch (err) {
        console.error("Error fetching telemetry data:", err);
      }
    }

    fetchData();
    timer = window.setInterval(fetchData, intervalMs);

    return () => {
      ignore = true;
      if (timer) window.clearInterval(timer);
    };
  }, [url]);

  return data;
}

