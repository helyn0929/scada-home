import { useState, useEffect } from "react";
import { TelemetryData } from "./types";

export type ApiStatus = "connecting" | "ok" | "error";

export function useLiveTelemetry(url: string) {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [status, setStatus] = useState<ApiStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || url;
    const intervalMs = parseInt(
      import.meta.env.VITE_TELEMETRY_POLL_INTERVAL_MS || "1000",
      10
    );

    let timer: number | null = null;
    let ignore = false;

    async function fetchData() {
      try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!ignore) {
          setData({ ...json });
          setStatus("ok");
          setLastUpdated(new Date());
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

  return { data, status, lastUpdated };
}
