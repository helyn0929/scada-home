import { useState, useEffect } from "react";
import { TelemetryData } from "./types";

export function useLiveTelemetry(url: string) {
  const [data, setData] = useState<TelemetryData | null>(null);

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
      const mainLineOpen = toggler(1); // shared state for dn1400, dn900, dn1400D

      return {
        power_kw: 500 + Math.random() * 1000,
        energy_kwh: Math.random() * 500,
        discharge_cms: Math.random() * 50,
        capacity_factor: Math.random() * 100,
        noiseIndoor: 40 + Math.random() * 40, // 40–80 dB
        noiseOutdoor: 50 + Math.random() * 45, // 50–95 dB
        // Temperatures simulated in the 0–200 °C range
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
      };
    }

    function generateMockTemps() {
      return {
        tempWindingU: Math.random() * 200,
        tempWindingV: Math.random() * 200,
        tempWindingW: Math.random() * 200,
        tempControlPanel: Math.random() * 200,
        tempEnvironment: Math.random() * 200,
      } satisfies Pick<
        TelemetryData,
        | "tempWindingU"
        | "tempWindingV"
        | "tempWindingW"
        | "tempControlPanel"
        | "tempEnvironment"
      >;
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
          const hasTemps =
            json.tempWindingU != null &&
            json.tempWindingV != null &&
            json.tempWindingW != null &&
            json.tempControlPanel != null &&
            json.tempEnvironment != null;
          const temps = hasTemps ? json : generateMockTemps();

          setData({
            power_kw: json.power_kw,
            energy_kwh: json.energy_kwh,
            discharge_cms: json.discharge_cms,
            capacity_factor: json.capacity_factor,
            noiseIndoor: json.noiseIndoor,
            noiseOutdoor: json.noiseOutdoor,
            tempWindingU: temps.tempWindingU,
            tempWindingV: temps.tempWindingV,
            tempWindingW: temps.tempWindingW,
            tempControlPanel: temps.tempControlPanel,
            tempEnvironment: temps.tempEnvironment,
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

