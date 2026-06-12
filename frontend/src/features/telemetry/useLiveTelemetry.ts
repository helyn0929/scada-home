import { useState, useEffect } from "react";
import { TelemetryData } from "./types";

// connecting: 首次連線中；live: 資料新鮮；down: 連到後端但資料中斷；error: 連不到後端
export type ApiStatus = "connecting" | "live" | "down" | "error";

export function useLiveTelemetry(url: string) {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [status, setStatus] = useState<ApiStatus>("connecting");
  // 資料更新時間：取後端回傳的 data_time（最新一筆的時間戳），斷線時凍結最後一筆
  const [dataTime, setDataTime] = useState<Date | null>(null);

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
        if (ignore) return;
        setData({ ...json });
        setStatus(json.data_status === "live" ? "live" : "down");
        // 只在拿到新的資料時間時更新；斷線（data_time 為 null）時保留最後一次
        if (json.data_time) setDataTime(new Date(json.data_time));
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

  return { data, status, dataTime };
}
