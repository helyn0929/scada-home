# utils/ui_helpers.py
"""
UI 元件生成工具函式
提供統計卡片、格式化等通用 UI 功能
"""
from dash import html
import pandas as pd
import numpy as np


def create_stat_card(title: str, items: list) -> html.Div:
    """
    建立統計卡片元件

    Args:
        title: 卡片標題
        items: 統計項目列表（字串）

    Returns:
        html.Div: 統計卡片元件

    Example:
        >>> create_stat_card("平均數", ["流量：123.45", "發電量：678.90"])
    """
    return html.Div([
        html.Div(title, className="stat-title"),
        html.Div([html.Div(x) for x in items], className="stat-value"),
    ])


def format_number(value, decimals: int = 2) -> str:
    """
    格式化數字為字串

    Args:
        value: 數值
        decimals: 小數位數

    Returns:
        str: 格式化後的字串，失敗時返回 "-"
    """
    try:
        return f"{float(value):.{decimals}f}"
    except:
        return "-"


def format_delta(value) -> str:
    """
    格式化差異值（帶正負號）

    Args:
        value: 差異值

    Returns:
        str: 格式化後的字串，例如 "+123" 或 "-45"
    """
    return f"{int(round(value)):+d}" if value is not None else ""


def format_percent(delta, reference) -> str:
    """
    計算並格式化百分比變化

    Args:
        delta: 差異值
        reference: 參考值（分母）

    Returns:
        str: 格式化後的百分比，例如 "+12.5%" 或 "-3.2%"
    """
    if reference is None or reference == 0:
        return ""
    percent = (delta / reference) * 100
    return f"{percent:+.1f}%"


def calculate_safe_stats(sequence):
    """
    安全地計算統計值（處理 NaN 和空序列）

    Args:
        sequence: 數值序列（list, ndarray, 或 Series）

    Returns:
        tuple: (sum, mean, max, min) 或 (None, None, None, None)
    """
    # 統一轉換為 float ndarray
    if isinstance(sequence, pd.Series):
        arr = pd.to_numeric(sequence, errors="coerce").to_numpy(dtype=float)
    else:
        arr = pd.to_numeric(pd.Series(sequence), errors="coerce").to_numpy(dtype=float)

    if arr.size == 0 or np.isnan(arr).all():
        return (None, None, None, None)

    # 使用 nan-safe 聚合函式，轉為原生 float 避免 JSON 序列化問題
    s_sum = float(np.nansum(arr))
    s_avg = float(np.nanmean(arr))
    s_max = float(np.nanmax(arr))
    s_min = float(np.nanmin(arr))

    return (s_sum, s_avg, s_max, s_min)


def create_comparison_card(title: str, base_value, compare_value) -> html.Div:
    """
    建立比較卡片（本期 vs 比較期）

    Args:
        title: 卡片標題
        base_value: 本期數值
        compare_value: 比較期數值

    Returns:
        html.Div: 比較卡片元件
    """
    delta = (base_value - compare_value) if pd.notna(base_value) and pd.notna(compare_value) else pd.NA
    percent = (delta / compare_value * 100) if (pd.notna(delta) and pd.notna(compare_value) and compare_value != 0) else pd.NA

    return create_stat_card(title, [
        f"本期：{format_number(base_value)}   /  比較期：{format_number(compare_value)}",
        f"差異：{format_number(delta)} ({format_number(percent)}%)",
    ])
