# callbacks/overview.py
"""
發電概覽頁面的 Callbacks

刷新頻率設計：
  fast   (30 秒)  → 即時功率/流量卡片（real_time_data last()）
  medium (15 分)  → 今日累積電量卡片 + 功率/流量趨勢圖（aggregated_data + real_time_data）
  slow   (1 小時) → 本月每日發電量長條圖（aggregated_data，每天才有新值）

日期切換：navigate_date callback 維護 overview-date-store
  None = 今日即時；"YYYY-MM-DD" = 歷史日
"""
import warnings
from datetime import date, datetime, timedelta, timezone

import pandas as pd
import plotly.graph_objects as go
from dash import Input, Output, State, ctx, html, no_update
from influxdb_client import InfluxDBClient
from influxdb_client.client.warnings import MissingPivotFunction

from config import (
    influx_url, influx_token, influx_org,
    influx_bucket, influx_bucket_aggregated,
    INFLUX_MEASUREMENT_REALTIME, INFLUX_MEASUREMENT_AGGREGATED,
)
from utils.theme_helpers import apply_chart_theme

warnings.simplefilter("ignore", MissingPivotFunction)

PLANT_ID  = "hushan"
POWER_TAG = "GEN_POWER_P"
FLOW_TAG  = "TURB_FLOW_IN"
TW_TZ     = timezone(timedelta(hours=8))


# ──────────────────────────────────────────────────────
#  時間工具
# ──────────────────────────────────────────────────────

def _taiwan_now() -> datetime:
    return datetime.now(timezone.utc).astimezone(TW_TZ)

def _taiwan_today_str() -> str:
    return _taiwan_now().strftime("%Y-%m-%d")

def _day_utc_range(day_str: str) -> tuple[str, str]:
    d = date.fromisoformat(day_str)
    tw_start = datetime(d.year, d.month, d.day, tzinfo=TW_TZ)
    tw_end   = tw_start + timedelta(days=1)
    return (
        tw_start.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        tw_end.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )

def _month_utc_start() -> str:
    tw = _taiwan_now()
    tw_month = tw.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return tw_month.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ──────────────────────────────────────────────────────
#  UI 元件
# ──────────────────────────────────────────────────────

def _make_card(title: str, value_str: str, unit: str, color: str = "#38bdf8"):
    return html.Div([
        html.Div(title, className="small-label", style={"marginBottom": "6px"}),
        html.Div([
            html.Span(value_str, style={"fontSize": "2rem", "fontWeight": "800", "color": color}),
            html.Span(f" {unit}", style={"fontSize": "0.95rem", "color": "var(--muted)", "marginLeft": "4px"}),
        ]),
    ], style={"padding": "4px 0"})


# ──────────────────────────────────────────────────────
#  InfluxDB 查詢
# ──────────────────────────────────────────────────────

def _latest_value(client, tag_code):
    q = f'''
from(bucket: "{influx_bucket}")
  |> range(start: -10m)
  |> filter(fn: (r) => r._measurement == "{INFLUX_MEASUREMENT_REALTIME}")
  |> filter(fn: (r) => r.plant_id == "{PLANT_ID}")
  |> filter(fn: (r) => r.tag_code == "{tag_code}")
  |> filter(fn: (r) => r._field == "value")
  |> last()
'''
    try:
        for table in client.query_api().query(q):
            for record in table.records:
                return float(record.get_value())
    except Exception:
        pass
    return None


def _day_trend(client, tag_code: str, day_str: str) -> pd.DataFrame:
    start_utc, stop_utc = _day_utc_range(day_str)
    q = f'''
from(bucket: "{influx_bucket}")
  |> range(start: {start_utc}, stop: {stop_utc})
  |> filter(fn: (r) => r._measurement == "{INFLUX_MEASUREMENT_REALTIME}")
  |> filter(fn: (r) => r.plant_id == "{PLANT_ID}")
  |> filter(fn: (r) => r.tag_code == "{tag_code}")
  |> filter(fn: (r) => r._field == "value")
  |> aggregateWindow(every: 15m, fn: mean, createEmpty: false)
  |> yield(name: "mean")
'''
    try:
        rows = []
        for table in client.query_api().query(q):
            for record in table.records:
                rows.append({"_time": record.get_time(), "value": record.get_value()})
        if not rows:
            return pd.DataFrame(columns=["datetime_tw", "value"])
        df = pd.DataFrame(rows)
        df["datetime_tw"] = pd.to_datetime(df["_time"]).dt.tz_convert("Asia/Taipei")
        return df[["datetime_tw", "value"]]
    except Exception:
        return pd.DataFrame(columns=["datetime_tw", "value"])


def _day_kwh(client, day_str: str) -> float:
    start_utc, stop_utc = _day_utc_range(day_str)
    q = f'''
from(bucket: "{influx_bucket_aggregated}")
  |> range(start: {start_utc}, stop: {stop_utc})
  |> filter(fn: (r) => r._measurement == "{INFLUX_MEASUREMENT_AGGREGATED}")
  |> filter(fn: (r) => r.plant_id == "{PLANT_ID}")
  |> filter(fn: (r) => r.tag_code == "{POWER_TAG}")
  |> filter(fn: (r) => r._field == "energy_kwh")
  |> sum()
'''
    try:
        for table in client.query_api().query(q):
            for record in table.records:
                v = record.get_value()
                if v is not None:
                    return round(float(v), 1)
    except Exception:
        pass
    return 0.0


def _day_mean(client, tag_code: str, day_str: str):
    start_utc, stop_utc = _day_utc_range(day_str)
    q = f'''
from(bucket: "{influx_bucket_aggregated}")
  |> range(start: {start_utc}, stop: {stop_utc})
  |> filter(fn: (r) => r._measurement == "{INFLUX_MEASUREMENT_AGGREGATED}")
  |> filter(fn: (r) => r.plant_id == "{PLANT_ID}")
  |> filter(fn: (r) => r.tag_code == "{tag_code}")
  |> filter(fn: (r) => r._field == "mean")
  |> mean()
'''
    try:
        for table in client.query_api().query(q):
            for record in table.records:
                v = record.get_value()
                if v is not None:
                    return float(v)
    except Exception:
        pass
    return None


def _monthly_daily_kwh(client) -> pd.DataFrame:
    start = _month_utc_start()
    q = f'''
from(bucket: "{influx_bucket_aggregated}")
  |> range(start: {start})
  |> filter(fn: (r) => r._measurement == "{INFLUX_MEASUREMENT_AGGREGATED}")
  |> filter(fn: (r) => r.plant_id == "{PLANT_ID}")
  |> filter(fn: (r) => r.tag_code == "{POWER_TAG}")
  |> filter(fn: (r) => r._field == "energy_kwh")
'''
    # 建立本月 1 日到今日的完整日期範圍（台灣時間）
    tw_now = _taiwan_now()
    month_start = tw_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    all_dates = pd.date_range(start=month_start.replace(tzinfo=None), end=tw_now.replace(tzinfo=None), freq="D")
    all_date_strs = [d.strftime("%m/%d") for d in all_dates]
    full_df = pd.DataFrame({"date_str": all_date_strs, "kwh": 0.0})

    try:
        rows = []
        for table in client.query_api().query(q):
            for record in table.records:
                rows.append({"_time": record.get_time(), "kwh": record.get_value()})
        if rows:
            df = pd.DataFrame(rows)
            df["datetime_tw"] = pd.to_datetime(df["_time"]).dt.tz_convert("Asia/Taipei")
            df["date_str"] = df["datetime_tw"].dt.strftime("%m/%d")
            actual = df.groupby("date_str", sort=False)["kwh"].sum().reset_index()
            # 用實際資料覆蓋補齊的 0
            full_df = full_df.set_index("date_str")
            full_df.update(actual.set_index("date_str"))
            full_df = full_df.reset_index()
        return full_df
    except Exception:
        return full_df


# ──────────────────────────────────────────────────────
#  Callbacks
# ──────────────────────────────────────────────────────

def register_callbacks(app):

    # ── 日期切換 ──────────────────────────────────────
    @app.callback(
        Output("overview-date-store",  "data"),
        Output("overview-date-label",  "children"),
        Output("overview-date-picker", "date"),
        Input("btn-date-prev",         "n_clicks"),
        Input("btn-date-next",         "n_clicks"),
        Input("btn-date-today",        "n_clicks"),
        Input("overview-date-picker",  "date"),
        State("overview-date-store",   "data"),
        prevent_initial_call=False,
    )
    def navigate_date(n_prev, n_next, n_today, picker_date, current_date):
        today_str = _taiwan_today_str()

        # 初始載入 或 點「今日」
        if not ctx.triggered_id or ctx.triggered_id == "btn-date-today":
            return None, "", None

        # 直接從 DatePicker 選日期
        if ctx.triggered_id == "overview-date-picker":
            if not picker_date:
                return None, "今日", None
            d = date.fromisoformat(picker_date[:10])
            if d >= date.fromisoformat(today_str):
                return None, "", None
            return d.isoformat(), d.isoformat(), d.isoformat()

        # 箭頭切換
        viewing = current_date or today_str
        if ctx.triggered_id == "btn-date-prev":
            new_date = (date.fromisoformat(viewing) - timedelta(days=1)).isoformat()
        elif ctx.triggered_id == "btn-date-next":
            d = date.fromisoformat(viewing) + timedelta(days=1)
            if d >= date.fromisoformat(today_str):
                return None, "", None
            new_date = d.isoformat()
        else:
            return no_update, no_update, no_update

        return new_date, new_date, new_date

    # ── Fast（30 秒）：即時功率 / 流量卡片 ──────────────
    @app.callback(
        Output("card-power-now",       "children"),
        Output("card-flow-now",        "children"),
        Output("overview-last-update", "children"),
        Input("overview-interval-fast", "n_intervals"),
        Input("overview-date-store",    "data"),
    )
    def update_cards_fast(n, view_date):
        today_str = _taiwan_today_str()
        is_today  = (view_date is None) or (view_date == today_str)
        day_str   = today_str if is_today else view_date

        client = InfluxDBClient(url=influx_url, token=influx_token, org=influx_org)
        try:
            if is_today:
                power_val = _latest_value(client, POWER_TAG)
                flow_val  = _latest_value(client, FLOW_TAG)
                pwr_label, flow_label = "即時功率", "即時流量"
            else:
                power_val = _day_mean(client, POWER_TAG, day_str)
                flow_val  = _day_mean(client, FLOW_TAG, day_str)
                pwr_label, flow_label = "當日平均功率", "當日平均流量"
        finally:
            client.close()

        tw_now = _taiwan_now()
        return (
            _make_card(pwr_label,  f"{power_val:.1f}" if power_val is not None else "--", "kW",  "#38bdf8"),
            _make_card(flow_label, f"{flow_val:.3f}"  if flow_val  is not None else "--", "cms", "#4ade80"),
            f"最後更新：{tw_now.strftime('%H:%M:%S')}",
        )

    # ── Medium（15 分）：趨勢圖 + 今日累積電量卡片 ───────
    @app.callback(
        Output("card-kwh-today",       "children"),
        Output("overview-power-chart", "figure"),
        Output("overview-flow-chart",  "figure"),
        Input("overview-interval-medium", "n_intervals"),
        Input("theme-store",              "data"),
        Input("overview-date-store",      "data"),
    )
    def update_charts_medium(n, theme_mode, view_date):
        theme     = theme_mode or "dark"
        today_str = _taiwan_today_str()
        is_today  = (view_date is None) or (view_date == today_str)
        day_str   = today_str if is_today else view_date
        day_label = "本日" if is_today else day_str

        client = InfluxDBClient(url=influx_url, token=influx_token, org=influx_org)
        try:
            kwh_val   = _day_kwh(client, day_str)
            df_power  = _day_trend(client, POWER_TAG, day_str)
            df_flow   = _day_trend(client, FLOW_TAG,  day_str)
        finally:
            client.close()

        kwh_label = "今日累積電量" if is_today else "當日累積電量"
        card_kwh = _make_card(kwh_label, f"{kwh_val:.1f}", "kWh", "#fb923c")

        # x 軸固定 00:00–23:59
        x_range  = [f"{day_str} 00:00", f"{day_str} 23:59"]
        xaxis_24h = dict(type="date", range=x_range, tickformat="%H:%M", dtick=3600000)

        def _y_range_padded(values, pad_ratio=0.1, min_span=None):
            """計算合理的 Y 軸範圍，避免自動縮放到微小差異"""
            vmin, vmax = values.min(), values.max()
            span = vmax - vmin
            if min_span and span < min_span:
                mid = (vmin + vmax) / 2
                vmin, vmax = mid - min_span / 2, mid + min_span / 2
            pad = (vmax - vmin) * pad_ratio
            return [round(vmin - pad, 4), round(vmax + pad, 4)]

        shared_margin = dict(l=60, r=20, t=40, b=60)

        def _build_trend_fig(df, title, y_unit, color, tick_fmt, hover_fmt, min_span):
            """建立統一格式的趨勢圖"""
            fig = go.Figure()
            if not df.empty:
                y_vals = df["value"].round(2)
                fig.add_trace(go.Scatter(
                    x=df["datetime_tw"].dt.strftime("%Y-%m-%d %H:%M:%S"),
                    y=y_vals,
                    mode="lines+markers", name=f"{y_unit}",
                    line=dict(color=color, width=2), marker=dict(size=7),
                    hovertemplate=hover_fmt,
                ))
                y_range = _y_range_padded(y_vals, min_span=min_span)
            else:
                y_range = None
            fig.update_layout(
                title_text=title,
                yaxis=dict(title=y_unit, tickformat=tick_fmt, nticks=6,
                           **({"range": y_range} if y_range else {})),
                xaxis=xaxis_24h,
                margin=shared_margin,
            )
            return apply_chart_theme(fig, theme)

        fig_power = _build_trend_fig(
            df_power, f"{day_label}功率趨勢（15 分鐘平均）",
            "kW", "#38bdf8", ".1f",
            "%{x|%H:%M}<br><b>%{y:.1f} kW</b><extra></extra>", 50,
        )
        fig_flow = _build_trend_fig(
            df_flow, f"{day_label}流量趨勢（15 分鐘平均）",
            "cms", "#4ade80", ".2f",
            "%{x|%H:%M}<br><b>%{y:.2f} cms</b><extra></extra>", 0.2,
        )

        return card_kwh, fig_power, fig_flow

    # ── Slow（1 小時）：本月每日發電量長條圖 ──────────────
    @app.callback(
        Output("overview-monthly-chart", "figure"),
        Input("overview-interval-slow",  "n_intervals"),
        Input("theme-store",             "data"),
    )
    def update_chart_slow(n, theme_mode):
        theme = theme_mode or "dark"
        client = InfluxDBClient(url=influx_url, token=influx_token, org=influx_org)
        try:
            df = _monthly_daily_kwh(client)
        finally:
            client.close()

        fig = go.Figure()
        if not df.empty:
            fig.add_trace(go.Bar(
                x=df["date_str"], y=df["kwh"],
                name="每日發電量", marker_color="#fb923c",
                text=[f"{v:.0f}" if v > 0 else "" for v in df["kwh"]],
                textposition="auto",
                textfont=dict(size=11),
                hovertemplate="%{x}<br><b>%{y:.1f} kWh</b><extra></extra>",
            ))
        fig.update_layout(title_text="本月每日發電量（kWh）", yaxis_title="kWh")
        return apply_chart_theme(fig, theme)
