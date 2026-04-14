# utils/db_helpers.py
"""
點位/設備清單工具（輕量版，讀 JSON 取代 MySQL）
正式系統上線後改回 pymysql 查詢
"""
import json
import os

# 精簡版只開放這幾個查詢項目（順序即 Checklist 顯示順序）
QUERY_TAGS_WHITELIST = {
    "GEN_POWER_P",
    "TURB_FLOW_IN",
    "TURB_PRESS_BEFORE",
    "TURB_PRESS_AFTER",
    "ENV_WATER_IN",
    "ENV_WATER_OUT",
}
QUERY_TAGS_ORDER = [
    "GEN_POWER_P",
    "TURB_FLOW_IN",
    "TURB_PRESS_BEFORE",
    "TURB_PRESS_AFTER",
    "ENV_WATER_IN",
    "ENV_WATER_OUT",
]

_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEVICES_FILE    = os.path.join(_base, "devices.json")
_PLC_POINTS_FILE = os.path.join(_base, "plc_points.json")


def _load_devices():
    with open(_DEVICES_FILE, encoding="utf-8") as f:
        return json.load(f)


def _load_plc_points():
    with open(_PLC_POINTS_FILE, encoding="utf-8") as f:
        return json.load(f)


def get_device_options():
    """設備下拉選項（只回傳有精簡白名單點位的設備）"""
    try:
        whitelisted_devices = {
            p["device_code"]
            for p in _load_plc_points()
            if p["tag_code"] in QUERY_TAGS_WHITELIST
        }
        return [
            {"label": d["name_zh"] or d["device_code"], "value": d["device_code"]}
            for d in _load_devices()
            if d["device_code"] in whitelisted_devices
        ]
    except Exception as e:
        print(f"[db_helpers] 載入設備清單失敗: {e}")
        return []


def get_device_tags(device_code: str) -> list[dict]:
    """指定設備的點位選項（只回傳精簡白名單內的點位）"""
    if not device_code:
        return []
    try:
        result = []
        for p in _load_plc_points():
            if p["device_code"] != device_code:
                continue
            if p["tag_code"] not in QUERY_TAGS_WHITELIST:
                continue
            name  = p.get("tag_name_zh") or p["tag_code"]
            unit  = p.get("unit", "")
            label = f"{name} ({unit})" if unit else name
            result.append({"label": label, "value": p["tag_code"]})
        return result
    except Exception as e:
        print(f"[db_helpers] 載入設備點位失敗 ({device_code}): {e}")
        return []


def get_all_query_tags() -> list[dict]:
    """所有精簡白名單點位（依 QUERY_TAGS_ORDER 排序）"""
    try:
        tag_map = {}
        for p in _load_plc_points():
            if p["tag_code"] not in QUERY_TAGS_WHITELIST:
                continue
            name  = p.get("tag_name_zh") or p["tag_code"]
            unit  = p.get("unit", "")
            label = f"{name} ({unit})" if unit else name
            tag_map[p["tag_code"]] = {"label": label, "value": p["tag_code"]}
        return [tag_map[t] for t in QUERY_TAGS_ORDER if t in tag_map]
    except Exception as e:
        print(f"[db_helpers] 載入點位失敗: {e}")
        return []


def get_alarm_thresholds(tag_codes: list) -> list[dict]:
    """告警門檻（輕量版無 alarm_rules，回傳空列表，圖表不畫門檻線）"""
    return []
