# utils/date_helpers.py
"""
日期與時間處理的共用函式
統一處理 UTC/本地時區轉換、日期格式化等
"""
from datetime import datetime, timedelta, date
import pandas as pd


def utc_window_for_local_days(start_local: str, end_local: str) -> tuple[str, str]:
    """
    將本地日期區間轉換為 UTC 時間窗口（擴展前後各一天以避免時區邊界問題）

    Args:
        start_local: 本地起始日期字串，格式 "YYYY-MM-DD"
        end_local: 本地結束日期字串，格式 "YYYY-MM-DD"

    Returns:
        tuple: (start_utc, stop_utc) RFC3339 格式的 UTC 時間字串

    Example:
        >>> utc_window_for_local_days("2025-01-01", "2025-01-10")
        ('2024-12-31T00:00:00Z', '2025-01-12T00:00:00Z')
    """
    s = datetime.fromisoformat(start_local).date()
    e = datetime.fromisoformat(end_local).date()
    start_utc = (s - timedelta(days=1)).isoformat() + "T00:00:00Z"
    stop_utc = (e + timedelta(days=2)).isoformat() + "T00:00:00Z"
    return start_utc, stop_utc


def tz_date_series(ts_col, timezone: str = "Asia/Taipei") -> pd.Series:
    """
    將 UTC 時間戳欄位轉換為指定時區的日期字串序列

    Args:
        ts_col: pandas Series 或 array-like，包含 UTC 時間戳
        timezone: 目標時區，預設為 "Asia/Taipei"

    Returns:
        pd.Series: 日期字串序列，格式 "YYYY-MM-DD"

    Example:
        >>> df['_date'] = tz_date_series(df['_time'])
    """
    return pd.to_datetime(ts_col, utc=True).dt.tz_convert(timezone).dt.date.astype(str)


def local_date_to_utc_range(local_date: str) -> tuple[str, str]:
    """
    將單一本地日期轉換為該日的完整 UTC 時間範圍（含前後緩衝）

    Args:
        local_date: 本地日期字串，格式 "YYYY-MM-DD"

    Returns:
        tuple: (start_utc, stop_utc) RFC3339 格式
    """
    return utc_window_for_local_days(local_date, local_date)


def format_date_range_rfc3339(start_date: str, end_date: str,
                                include_time: bool = True) -> tuple[str, str]:
    """
    將日期字串格式化為 RFC3339 格式（不做時區轉換）

    Args:
        start_date: 起始日期 "YYYY-MM-DD"
        end_date: 結束日期 "YYYY-MM-DD"
        include_time: 是否包含時間部分，預設 True

    Returns:
        tuple: (start_rfc3339, end_rfc3339)

    Example:
        >>> format_date_range_rfc3339("2025-01-01", "2025-01-10")
        ('2025-01-01T00:00:00Z', '2025-01-10T23:59:59Z')
    """
    if include_time:
        start = f"{start_date}T00:00:00Z"
        stop = f"{end_date}T23:59:59Z"
    else:
        start = start_date
        stop = end_date
    return start, stop


def convert_utc_to_local(df: pd.DataFrame, time_col: str = '_time',
                          timezone: str = "Asia/Taipei") -> pd.DataFrame:
    """
    將 DataFrame 中的 UTC 時間欄位轉換為本地時區，並新增日期欄位

    Args:
        df: 包含時間戳的 DataFrame
        time_col: 時間欄位名稱
        timezone: 目標時區

    Returns:
        pd.DataFrame: 新增 'datetime' 和 'date' 欄位
    """
    df = df.copy()
    df['datetime'] = pd.to_datetime(df[time_col], utc=True).dt.tz_convert(timezone)
    df['date'] = df['datetime'].dt.date
    return df


def get_date_range_for_period(year: str, month: str, period: str) -> tuple[date, date]:
    """
    根據年月和旬別取得日期區間

    Args:
        year: 年份字串 "YYYY"
        month: 月份字串 "MM"
        period: 旬別 "early" (上旬), "mid" (中旬), "late" (下旬)

    Returns:
        tuple: (start_date, end_date) date 物件

    Example:
        >>> get_date_range_for_period("2025", "01", "early")
        (datetime.date(2025, 1, 1), datetime.date(2025, 1, 10))
    """
    from calendar import monthrange

    start_day_map = {"early": 1, "mid": 11, "late": 21}
    start_day = start_day_map[period]
    start_date = date(int(year), int(month), start_day)

    if period == "late":
        # 下旬：到月底
        next_month = start_date.replace(day=28) + timedelta(days=4)
        end_date = next_month - timedelta(days=next_month.day)
    else:
        # 上旬/中旬：固定 10 天
        end_day_map = {"early": 10, "mid": 20}
        end_date = date(int(year), int(month), end_day_map[period])

    return start_date, end_date
