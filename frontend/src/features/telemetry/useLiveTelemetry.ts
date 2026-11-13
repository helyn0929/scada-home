import { useState, useEffect } from "react";
import type { TelemetryData } from "./types";

/** connecting=尚未取得、live=即時、down=後端回報資料中斷、error=連線失敗 */
export type ApiStatus = "connecting" | "live" | "down" | "error";

/** 連續失敗幾次後清空資料（避免斷線後畫面一直停在最後一筆，看起來像是活的） */
const ERROR_CLEAR_AFTER = 3;

/**
 * 即時數據＋連線狀態（手機版使用）
 * - 欄位名稱與主系統 power-plant-scada 一致；後端回傳的欄位全部原樣傳給畫面
 * - 回應可為 { success, data } 或直接是資料物件
 * - VITE_MOCK=1 時使用下方 generateMock() 的展示資料
 */
export function useLiveTelemetryWithStatus(url: string) {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [status, setStatus] = useState<ApiStatus>("connecting");
  const [dataTime, setDataTime] = useState<Date | null>(null);

  useEffect(() => {
    const useMockData = import.meta.env.VITE_MOCK === "1";
    const apiUrl = import.meta.env.VITE_API_URL || url;
    const intervalMs = parseInt(
      import.meta.env.VITE_TELEMETRY_POLL_INTERVAL_MS || "1000",
      10
    );

    let timer: number | null = null;
    let ignore = false;
    let consecutiveErrors = 0;

    function generateMock(): TelemetryData {
      const now = Date.now();
      const sec = Math.floor(now / 1000);
      const toggler = (n: number) => ((sec + n) % 2) === 0;
      const percent = Math.abs((sec % 101));
      const mainLineOpen = toggler(1); // shared state for dn1400, dn900, dn1400D

      return {
        data_time: new Date(now).toISOString(),
        data_status: "live",
        power_kw: 500 + Math.random() * 1000,
        energy_kwh: Math.random() * 500,
        discharge_cms: Math.random() * 2.5,
        capacity_factor: Math.random() * 100,
        noiseIndoor: 40 + Math.random() * 40, // 40–80 dB
        noiseOutdoor: 50 + Math.random() * 45, // 50–95 dB
        // Temperatures simulated in the 0–200 °C range
        tempWindingU: Math.random() * 200,
        tempWindingV: Math.random() * 200,
        tempWindingW: Math.random() * 200,
        tempControlPanel: Math.random() * 200,
        tempEnvironment: Math.random() * 200,
        tempBearingDe: Math.random() * 200,
        tempBearingNde: Math.random() * 200,
        valves: {
          dn800: { open: toggler(0) },
          dn900: { open: mainLineOpen },
          dn1400: { open: mainLineOpen },
          dn1400D: { open: mainLineOpen },
          dn1350: { open: percent > 0, percent },
        },
        guideVanePct: Math.random() * 100,
        genSpeedRpm: 900 + Math.random() * 300,
        genSpeedPct: Math.random() * 100,
        pressureBeforeDn1350: 6 + Math.random() * 8,
        pressureAfterDn1350: 6 + Math.random() * 8,
        pressureBeforeDn900: 4 + Math.random() * 4,
        pressureAfterDn900: 4 + Math.random() * 4,
        waterQualityIn: Math.random() * 0.5,
        waterQualityOut: Math.random() * 0.5,
        vibrationDE: Math.random() * 3,
        vibrationNDE: Math.random() * 3,
        // Generator power: -2000..+2000 (kVA, kW, kvar)
        generatorApparentPowerS: -2000 + Math.random() * 4000,
        generatorActivePowerP: -2000 + Math.random() * 4000,
        generatorReactivePowerQ: -2000 + Math.random() * 4000,
      };
    }

    async function fetchData() {
      if (useMockData) {
        const mock = generateMock();
        setData(mock);
        setStatus("live");
        setDataTime(new Date());
        return;
      }
      try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error("Request failed");
        const json = await res.json();
        if (ignore) return;
        if (json && json.success === false) throw new Error(json.error ?? "API error");
        const payload: TelemetryData = json?.data ?? json;
        consecutiveErrors = 0;
        setData({ ...payload });
        // 後端沒有 data_status 欄位時視為即時
        setStatus(payload.data_status === "down" ? "down" : "live");
        setDataTime(payload.data_time ? new Date(payload.data_time) : new Date());
      } catch (err) {
        if (ignore) return;
        console.error("Error fetching telemetry data:", err);
        consecutiveErrors += 1;
        setStatus("error");
        if (consecutiveErrors >= ERROR_CLEAR_AFTER) setData(null);
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

/** 桌面首頁使用：只取數據 */
export function useLiveTelemetry(url: string) {
  return useLiveTelemetryWithStatus(url).data;
}
