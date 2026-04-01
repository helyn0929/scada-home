"""
Demo 模擬資料腳本
每 5 秒寫入假資料到 InfluxDB demo_realtime bucket
模擬 PLC 資料，範圍依據前端 useLiveTelemetry.ts 的 mock 設定

執行：cd scada-home/backend && python simulate.py
停止：Ctrl+C
"""

import os
import time
import math
import random
from datetime import datetime, timezone, timedelta
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
from dotenv import load_dotenv

load_dotenv()

INFLUX_URL = os.getenv("INFLUX_URL")
INFLUX_TOKEN = os.getenv("INFLUX_TOKEN")
INFLUX_ORG = os.getenv("INFLUX_ORG")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET", "demo_realtime")
PLANT_ID = os.getenv("PLANT_ID", "hushan")
INTERVAL = 5  # 秒

# ========================================
# 模擬範圍定義（依據前端 mock + plc_points 總表）
# 格式: tag_code → (min, max, device_code)
# ========================================
TAGS = {
    # 發電相關
    "GEN_POWER_P":    (500, 1500, "generator"),     # kW, 前端 mock: 500+random*1000
    "GEN_POWER_S":    (500, 1500, "generator"),     # kVA
    "GEN_POWER_Q":    (-500, 500, "generator"),     # kvar
    "TURB_FLOW_IN":   (0, 3, "turbine"),            # cms, 前端 mock: random*50 但實際 range 0-3

    # 噪音
    "ENV_NOISE_IN":   (40, 80, "environment"),      # dB, 前端 mock: 40+random*40
    "ENV_NOISE_OUT":  (50, 95, "environment"),      # dB, 前端 mock: 50+random*45

    # 溫度
    "GEN_TEMP_U":     (50, 95, "generator"),        # °C
    "GEN_TEMP_V":     (50, 95, "generator"),        # °C
    "GEN_TEMP_W":     (50, 95, "generator"),        # °C
    "CTRL_TEMP":      (20, 40, "control"),          # °C
    "GEN_TEMP_ENV":   (20, 35, "generator"),        # °C

    # 振動
    "GEN_VIB_DE":     (0.2, 1.5, "generator"),      # mm/s
    "GEN_VIB_NDE":    (0.2, 1.5, "generator"),      # mm/s

    # 閥門開關（Bool: 0 或 1）
    "VALVE_OPV_FB_OPEN":       (0, 1, "valve"),     # DN800 洩壓閥
    "VALVE_DN900_FB_OPEN":     (0, 1, "valve"),     # DN900
    "VALVE_DN1350_FB_OPEN":    (0, 1, "valve"),     # DN1350
    "VALVE_DN1400_FB_OPEN":    (0, 1, "valve"),     # DN1400 進水主閥
    "VALVE_DN1400_OUT_FB_OPEN": (0, 1, "valve"),    # DN1400 尾水主閥

    # DN1350 開度百分比
    "VALVE_DN1350_PCT": (0, 100, "valve"),          # %

    # 水輪發電機儀表（新增）
    "TURB_GUIDE_VANE": (0, 100, "turbine"),         # %, 導葉開度
    "GEN_SPEED":       (300, 400, "generator"),     # rpm, 額定~360rpm
    "GEN_SPEED_PCT":   (90, 105, "generator"),      # %

    # 壓力（新增）
    "TURB_PRESS_BEFORE": (4, 8, "turbine"),         # bar, DN900前
    "TURB_PRESS_AFTER":  (3, 7, "turbine"),         # bar, DN900後

    # 水質（新增）
    "ENV_WATER_IN":  (2, 6, "environment"),         # ppm
    "ENV_WATER_OUT": (1, 5, "environment"),         # ppm
}

# 布林型 tag（閥門開關）
BOOL_TAGS = {
    "VALVE_OPV_FB_OPEN",
    "VALVE_DN900_FB_OPEN",
    "VALVE_DN1350_FB_OPEN",
    "VALVE_DN1400_FB_OPEN",
    "VALVE_DN1400_OUT_FB_OPEN",
}

# 當前值（用於模擬微幅波動）
current_values = {}


def init_values():
    """初始化每個 tag 的起始值"""
    for tag, (vmin, vmax, _) in TAGS.items():
        if tag in BOOL_TAGS:
            # 前端 mock 邏輯：DN900/DN1400/DN1400D 連動，OPV 獨立切換
            current_values[tag] = 1.0
        elif tag == "VALVE_DN1350_PCT":
            current_values[tag] = random.uniform(30, 70)
        else:
            # 起始值：範圍中間偏上
            current_values[tag] = vmin + (vmax - vmin) * random.uniform(0.4, 0.7)


def generate_value(tag, vmin, vmax):
    """產生下一個值（微幅波動）"""
    # 布林值：模擬前端的 toggler 邏輯，偶爾切換
    if tag in BOOL_TAGS:
        if tag == "VALVE_OPV_FB_OPEN":
            # 洩壓閥獨立，每 10 秒切換一次
            return float(int(time.time() / 10) % 2)
        else:
            # DN900/DN1400/DN1400D 連動
            return float(int(time.time() / 8) % 2)

    # DN1350 開度：緩慢變化
    if tag == "VALVE_DN1350_PCT":
        current = current_values[tag]
        current += random.uniform(-3, 3)
        return max(0, min(100, round(current, 1)))

    # 實數值：±2-5% 微幅波動
    current = current_values[tag]
    noise = random.uniform(-0.03, 0.03)
    new_val = current * (1 + noise)

    # 功率跟流量正相關
    if tag == "GEN_POWER_P" and "TURB_FLOW_IN" in current_values:
        flow = current_values["TURB_FLOW_IN"]
        new_val = flow * 500 + 200 + random.uniform(-20, 20)

    return max(vmin, min(vmax, round(new_val, 2)))


def write_batch(write_api):
    """寫入一批資料"""
    timestamp = datetime.utcnow()
    points = []

    for tag, (vmin, vmax, device_code) in TAGS.items():
        value = generate_value(tag, vmin, vmax)
        current_values[tag] = value

        p = Point("measurements") \
            .tag("plant_id", PLANT_ID) \
            .tag("tag_code", tag) \
            .tag("device_code", device_code) \
            .field("value", float(value)) \
            .time(timestamp)
        points.append(p)

    write_api.write(bucket=INFLUX_BUCKET, record=points)

    tw_time = datetime.now(timezone(timedelta(hours=8))).strftime('%H:%M:%S')
    power = current_values.get("GEN_POWER_P", 0)
    flow = current_values.get("TURB_FLOW_IN", 0)
    print(f"[{tw_time}] 寫入 {len(points)} 筆 | P={power:.0f}kW, Flow={flow:.2f}cms")


def main():
    print("=" * 50)
    print("Demo 模擬資料腳本")
    print(f"InfluxDB: {INFLUX_URL}")
    print(f"Bucket:   {INFLUX_BUCKET}")
    print(f"間隔:     {INTERVAL} 秒")
    print("=" * 50)

    client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
    write_api = client.write_api(write_options=SYNCHRONOUS)

    init_values()
    print("\n開始模擬，按 Ctrl+C 停止\n")

    try:
        while True:
            write_batch(write_api)
            time.sleep(INTERVAL)
    except KeyboardInterrupt:
        print("\n停止模擬")
    finally:
        client.close()


if __name__ == "__main__":
    main()
