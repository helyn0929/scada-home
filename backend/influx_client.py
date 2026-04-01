"""
InfluxDB 查詢模組（Demo 精簡版）
只保留 get_all_latest_values，從 power-main 精簡複製
"""

import os
from influxdb_client import InfluxDBClient
from dotenv import load_dotenv

load_dotenv()

INFLUX_URL = os.getenv("INFLUX_URL")
INFLUX_TOKEN = os.getenv("INFLUX_TOKEN")
INFLUX_ORG = os.getenv("INFLUX_ORG")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET", "demo_realtime")
PLANT_ID = os.getenv("PLANT_ID", "hushan")

LATEST_VALUE_RANGE = "1m"

_client = None
_query_api = None


def get_query_api():
    global _client, _query_api
    if _client is None:
        _client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
        _query_api = _client.query_api()
    return _query_api


def get_accumulated_energy(hours=24):
    """
    從 InfluxDB 累加 GEN_POWER_P 計算發電量 (kWh)
    公式：每筆 kW × 5秒 / 3600 = kWh

    Args:
        hours: 累加幾小時（預設 24 小時）

    Returns:
        float: 累積發電量 (kWh)，查無資料回傳 0
    """
    try:
        flux = f'''
            from(bucket: "{INFLUX_BUCKET}")
              |> range(start: -{hours}h)
              |> filter(fn: (r) => r._measurement == "measurements")
              |> filter(fn: (r) => r.plant_id == "{PLANT_ID}")
              |> filter(fn: (r) => r.tag_code == "GEN_POWER_P")
              |> filter(fn: (r) => r._field == "value")
              |> filter(fn: (r) => r._value > 0)
              |> sum()
        '''

        query_api = get_query_api()
        tables = query_api.query(flux)

        for table in tables:
            for record in table.records:
                total_kw = record.get_value()
                # 每筆間隔 5 秒，轉 kWh
                return round(total_kw * 5 / 3600, 2)

        return 0
    except Exception as e:
        print(f"[InfluxDB] 累積發電量查詢失敗: {e}")
        return 0


def get_all_latest_values():
    """
    查詢所有監測點的最新值

    Returns:
        dict: {tag_code: value, ...}
    """
    try:
        flux = f'''
            from(bucket: "{INFLUX_BUCKET}")
              |> range(start: -{LATEST_VALUE_RANGE})
              |> filter(fn: (r) => r._measurement == "measurements")
              |> filter(fn: (r) => r.plant_id == "{PLANT_ID}")
              |> filter(fn: (r) => r._field == "value")
              |> last()
              |> group(columns: ["tag_code"])
        '''

        query_api = get_query_api()
        tables = query_api.query(flux)

        result = {}
        for table in tables:
            for record in table.records:
                tag_code = record.values.get("tag_code")
                value = record.get_value()
                result[tag_code] = value

        return result
    except Exception as e:
        print(f"[InfluxDB] 查詢失敗: {e}")
        return {}
