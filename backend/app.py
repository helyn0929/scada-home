"""
Demo Flask API（極簡版）
只提供 /api/view/home 給 scada-home 首頁用
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from influx_client import get_all_latest_values, get_accumulated_energy

load_dotenv()

app = Flask(__name__)
CORS(app)

# 額定容量 (kW)，用於計算容量因數
RATED_CAPACITY = 1500

# InfluxDB tag_code → 前端 TelemetryData 欄位對應
TAG_MAPPING = {
    "power_kw":                "GEN_POWER_P",
    # "energy_kwh":           "GEN_POWER_ACCUM",  # 待確認是否有此值可接
    "discharge_cms":           "TURB_FLOW_IN",
    "noiseIndoor":             "ENV_NOISE_IN",
    "noiseOutdoor":            "ENV_NOISE_OUT",
    "tempWindingU":            "GEN_TEMP_U",
    "tempWindingV":            "GEN_TEMP_V",
    "tempWindingW":            "GEN_TEMP_W",
    "tempControlPanel":        "CTRL_TEMP",
    "tempEnvironment":         "GEN_TEMP_ENV",
    "generatorApparentPowerS": "GEN_POWER_S",
    "generatorActivePowerP":   "GEN_POWER_P",
    "generatorReactivePowerQ": "GEN_POWER_Q",
    "guideVanePct":            "TURB_GUIDE_VANE",
    "genSpeedRpm":             "GEN_SPEED",
    "genSpeedPct":             "GEN_SPEED_PCT",
    "pressureBeforeDn900":     "TURB_PRESS_BEFORE",
    "pressureAfterDn900":      "TURB_PRESS_AFTER",
    "waterQualityIn":          "ENV_WATER_IN",
    "waterQualityOut":         "ENV_WATER_OUT",
}

# 閥門 tag_code 對應（開關狀態）
VALVE_MAPPING = {
    "dn800":  "VALVE_OPV_FB_OPEN",        # 洩壓閥 (OPV)
    "dn900":  "VALVE_DN900_FB_OPEN",     # DN900 全開回饋
    "dn1350": "VALVE_DN1350_FB_OPEN",    # DN1350 全開回饋
    "dn1400": "VALVE_DN1400_FB_OPEN",    # DN1400 進水閥 (inlet) 全開回饋
    "dn1400D": "VALVE_DN1400_OUT_FB_OPEN",  # DN1400 尾水主閥 (outlet)
}

# 振動 tag_code 對應
VIBRATION_MAPPING = {
    "vibrationDE":  "GEN_VIB_DE",
    "vibrationNDE": "GEN_VIB_NDE",
}


@app.route("/api/view/home")
def view_home():
    """scada-home 首頁需要的所有資料，一次給齊"""
    raw = get_all_latest_values()

    # 基本欄位轉換
    data = {}
    for frontend_key, tag_code in TAG_MAPPING.items():
        data[frontend_key] = raw.get(tag_code)

    # 累積發電量（從 InfluxDB 累加 GEN_POWER_P，PLC 有直接值時可替換）
    energy_kwh = get_accumulated_energy(hours=24)
    if energy_kwh >= 1000:
        data["energy_kwh"] = round(energy_kwh / 1000, 2)
        data["energy_unit"] = "MWh"
    else:
        data["energy_kwh"] = energy_kwh
        data["energy_unit"] = "kWh"

    # 容量因數（計算欄位）
    power = raw.get("GEN_POWER_P")
    if power is not None and RATED_CAPACITY > 0:
        data["capacity_factor"] = round((power / RATED_CAPACITY) * 100, 2)
    else:
        data["capacity_factor"] = None

    # 閥門狀態
    valves = {}
    for valve_name, tag_code in VALVE_MAPPING.items():
        val = raw.get(tag_code)
        if val is not None:
            valves[valve_name] = {"open": bool(val)}
        else:
            valves[valve_name] = {"open": False}

    # DN1350 額外加百分比（如果有的話）
    dn1350_pct = raw.get("VALVE_DN1350_PCT")
    if dn1350_pct is not None and "dn1350" in valves:
        valves["dn1350"]["percent"] = dn1350_pct

    data["valves"] = valves

    # 振動
    for frontend_key, tag_code in VIBRATION_MAPPING.items():
        data[frontend_key] = raw.get(tag_code)

    return jsonify(data)


@app.route("/api/health")
def health():
    """健康檢查"""
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5051))
    print(f"Demo API 啟動: http://localhost:{port}")
    print(f"首頁資料: http://localhost:{port}/api/view/home")
    app.run(host="0.0.0.0", port=port, debug=True)
