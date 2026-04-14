#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小時聚合任務（scada-home 輕量版）

功能：
- 從 real_time_data 讀取 5 秒級資料
- 按小時聚合（mean, max, min, count, energy_kwh）
- 寫入 aggregated_data bucket（measurement: hourly_stats）

點位清單來源：scripts/plc_points.json（正式系統上線後改回 MySQL）

執行模式：
  自動模式（預設）：聚合上一小時
    python hourly_aggregation_task.py

  批次模式：補過去 N 天
    python hourly_aggregation_task.py --days 14

  手動模式：指定範圍
    python hourly_aggregation_task.py --start "2025-01-20T00:00:00Z" --end "2025-01-21T00:00:00Z"
"""

import os
import sys
import json
import logging
import argparse
from datetime import datetime, timedelta

from dotenv import load_dotenv
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

# --- 載入 .env（從 backend/ 目錄往上找）---
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_backend_dir, ".env"))

INFLUX_URL               = os.getenv("INFLUX_URL", "http://localhost:8086")
INFLUX_TOKEN             = os.getenv("INFLUX_TOKEN")
INFLUX_ORG               = os.getenv("INFLUX_ORG", "SCADA_hushan")
INFLUX_BUCKET_REALTIME   = os.getenv("INFLUX_BUCKET", "real_time_data")
INFLUX_BUCKET_AGGREGATED = os.getenv("INFLUX_BUCKET_AGGREGATED", "aggregated_data")
PLANT_ID                 = os.getenv("PLANT_ID", "hushan")

PLC_POINTS_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "plc_points.json")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


class HourlyAggregator:
    def __init__(self):
        self.plc_points = []
        self.influx_client = None
        self.write_api = None
        self.query_api = None

    def load_plc_points(self):
        """從 plc_points.json 讀取點位清單（正式系統上線後改回 MySQL）"""
        with open(PLC_POINTS_JSON, encoding="utf-8") as f:
            self.plc_points = json.load(f)
        logger.info(f"載入 {len(self.plc_points)} 個點位")

    def connect_influx(self):
        self.influx_client = InfluxDBClient(
            url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG
        )
        self.write_api = self.influx_client.write_api(write_options=SYNCHRONOUS)
        self.query_api = self.influx_client.query_api()
        logger.info("InfluxDB 連線成功")

    def delete_existing_hourly_data(self, start: datetime, stop: datetime):
        delete_api = self.influx_client.delete_api()
        try:
            delete_api.delete(
                start=start,
                stop=stop,
                predicate=f'_measurement="hourly_stats" AND plant_id="{PLANT_ID}"',
                bucket=INFLUX_BUCKET_AGGREGATED,
            )
        except Exception as e:
            if "404" not in str(e):
                logger.warning(f"刪除舊資料時發生錯誤（可能無資料）: {e}")

    def aggregate_hour(self, hour_start: datetime):
        hour_end = hour_start + timedelta(hours=1)
        logger.info(f"聚合時段：{hour_start.strftime('%Y-%m-%d %H:00')} ~ {hour_end.strftime('%H:00')}")

        self.delete_existing_hourly_data(hour_start, hour_end)

        aggregated_count = 0
        for point in self.plc_points:
            tag_code = point["tag_code"]
            device_code = point["device_code"]

            flux_query = f'''
from(bucket: "{INFLUX_BUCKET_REALTIME}")
  |> range(start: {hour_start.isoformat()}Z, stop: {hour_end.isoformat()}Z)
  |> filter(fn: (r) => r["_measurement"] == "measurements")
  |> filter(fn: (r) => r["plant_id"] == "{PLANT_ID}")
  |> filter(fn: (r) => r["tag_code"] == "{tag_code}")
  |> filter(fn: (r) => r["device_code"] == "{device_code}")
  |> filter(fn: (r) => r["_field"] == "value")
'''
            try:
                tables = self.query_api.query(flux_query)
                values = [r.get_value() for t in tables for r in t.records]

                if not values:
                    continue

                mean_val  = sum(values) / len(values)
                max_val   = max(values)
                min_val   = min(values)
                count_val = len(values)
                energy_kwh = mean_val * count_val * 5 / 3600

                p = (
                    Point("hourly_stats")
                    .tag("plant_id",    PLANT_ID)
                    .tag("tag_code",    tag_code)
                    .tag("device_code", device_code)
                    .field("mean",       float(mean_val))
                    .field("max",        float(max_val))
                    .field("min",        float(min_val))
                    .field("count",      count_val)
                    .field("energy_kwh", float(energy_kwh))
                    .time(hour_start)
                )
                self.write_api.write(bucket=INFLUX_BUCKET_AGGREGATED, record=p)
                aggregated_count += 1

            except Exception as e:
                logger.warning(f"{tag_code} 聚合失敗: {e}")

        logger.info(f"已聚合 {aggregated_count} 個點位")
        return aggregated_count

    def _run(self, hours_iter):
        self.load_plc_points()
        self.connect_influx()
        success = 0
        for h in hours_iter:
            try:
                if self.aggregate_hour(h) > 0:
                    success += 1
            except Exception as e:
                logger.error(f"聚合失敗: {e}")
        self.influx_client.close()
        return success

    def run_auto_mode(self):
        now = datetime.utcnow()
        last_hour = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
        logger.info(f"自動模式：聚合 {last_hour.strftime('%Y-%m-%d %H:00')}")
        self._run([last_hour])
        logger.info("聚合完成")

    def run_batch_mode(self, days: int):
        end   = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        start = end - timedelta(days=days)
        total = int((end - start).total_seconds() / 3600)
        logger.info(f"批次模式：{start.strftime('%Y-%m-%d %H:00')} ~ {end.strftime('%Y-%m-%d %H:00')}，共 {total} 小時")
        hours = [start + timedelta(hours=i) for i in range(total)]
        done = self._run(hours)
        logger.info(f"批次完成：{done}/{total} 小時")

    def run_manual_mode(self, start_str: str, end_str: str):
        start = datetime.fromisoformat(start_str.replace("Z", "+00:00")).replace(tzinfo=None)
        end   = datetime.fromisoformat(end_str.replace("Z", "+00:00")).replace(tzinfo=None)
        start = start.replace(minute=0, second=0, microsecond=0)
        end   = end.replace(minute=0, second=0, microsecond=0)
        total = int((end - start).total_seconds() / 3600)
        logger.info(f"手動模式：{start.strftime('%Y-%m-%d %H:00')} ~ {end.strftime('%Y-%m-%d %H:00')}，共 {total} 小時")
        hours = [start + timedelta(hours=i) for i in range(total)]
        done = self._run(hours)
        logger.info(f"手動完成：{done}/{total} 小時")


def main():
    parser = argparse.ArgumentParser(description="小時聚合任務")
    parser.add_argument("--days",  type=int, help="批次模式：過去 N 天")
    parser.add_argument("--start", type=str, help="手動模式：起始時間 ISO 8601")
    parser.add_argument("--end",   type=str, help="手動模式：結束時間 ISO 8601")
    args = parser.parse_args()

    agg = HourlyAggregator()
    try:
        if args.days:
            agg.run_batch_mode(args.days)
        elif args.start and args.end:
            agg.run_manual_mode(args.start, args.end)
        else:
            agg.run_auto_mode()
    except KeyboardInterrupt:
        logger.info("使用者中斷")
    except Exception as e:
        logger.error(f"任務失敗: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
