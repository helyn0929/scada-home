# callbacks/query.py
from influxdb_client import InfluxDBClient
from dash import Input, Output, State, dcc, no_update, ctx, html
from dash.exceptions import PreventUpdate
import pandas as pd
import plotly.graph_objects as go
from utils.theme_helpers import get_table_styles, apply_chart_theme
from utils.db_helpers import get_alarm_thresholds, get_tag_units
from utils.date_helpers import utc_window_for_local_days, tz_date_series
from utils.ui_helpers import (
    create_stat_card, format_number, format_delta, format_percent,
    calculate_safe_stats, create_comparison_card
)
from config import (
    influx_url, influx_token, influx_org,
    influx_bucket_aggregated,
    INFLUX_MEASUREMENT_AGGREGATED,
)
from datetime import date
import warnings
from influxdb_client.client.warnings import MissingPivotFunction
warnings.simplefilter("ignore", MissingPivotFunction)


# ==========================================================
#  大查詢：讀取 compare-config-store（由 compare_dates.py 維護）
#  輸出：表格、圖表、統計卡、樣式、下載旗標
# ==========================================================
def register_callbacks(app):

    @app.callback(
        # ===== 一般模式輸出（14 個）=====
        Output("result-table", "data"),
        Output("result-table", "columns"),
        Output("result-line-chart", "figure"),
        Output("result-line-chart", "style"),
        Output("result-table", "style_table"),
        Output("result-table", "style_header"),
        Output("result-table", "style_cell"),
        Output("result-ready", "data"),
        Output("avg-card", "children"),
        Output("median-card", "children"),
        Output("max-card", "children"),
        Output("min-card", "children"),
        Output("count-card", "children"),
        Output("sum-card", "children"),

        # ===== 查無資料提示 =====
        Output("no-data-hint", "children"),
        Output("no-data-hint", "style"),

        # ===== 比較模式輸出（10 個）=====
        Output("compare-table", "data"),
        Output("compare-table", "columns"),
        Output("compare-table-wrapper", "style"),
        Output("normal-summary", "style"),
        Output("compare-summary", "style"),
        Output("cmp-sum-card", "children"),
        Output("cmp-avg-card", "children"),
        Output("cmp-max-card", "children"),
        Output("cmp-min-card", "children"),
        # 比較表格主題樣式（為了切主題時同步換色，不改可視狀態）
        Output("compare-table", "style_table"),
        Output("compare-table", "style_header"),
        Output("compare-table", "style_cell"),

        Input("export-btn", "n_clicks"),
        Input("theme-store", "data"),
        State("result-line-chart", "figure"),
        State("query-options", "value"),
        State("query-options", "options"),
        State("result-ready", "data"),
        State("compare-config-store", "data"),
        State("mode-switch", "value"),
        prevent_initial_call=True,
    )
    def query_influx(n_clicks, theme_mode, current_fig,
                     selected_tags, tag_options,
                     has_result, compare_cfg, mode_value):
        from datetime import datetime, timedelta  # 放在函式內就不會汙染全域

        theme_mode = (theme_mode or "light")
        table_styles = get_table_styles(theme_mode)
        HIDE, SHOW = {"display": "none"}, {"display": "block"}
        EMPTY_SIX  = [html.Div()]*6
        EMPTY_FOUR = [html.Div()]*4

        # ---- tag_code → 中文 label 對照（從 Checklist options 取得）----
        tag_label_map = {}
        for opt in (tag_options or []):
            tag_label_map[opt["value"]] = opt["label"]

        # ---- helper：查詢函式（aggregated_data / hourly_stats）----
        def query_range(start_date, end_date, tags, query_api, single_day=False):
            """查詢多個 tag_code 的統計。
            single_day=True 時回傳 24 小時逐小時資料；否則回傳每日平均。"""
            if not tags:
                return pd.DataFrame(columns=["_date"])
            start_utc, stop_utc = utc_window_for_local_days(start_date, end_date)

            col_frames = {}
            for tag in tags:
                q = f'''
from(bucket: "{influx_bucket_aggregated}")
  |> range(start: time(v: "{start_utc}"), stop: time(v: "{stop_utc}"))
  |> filter(fn: (r) => r["_measurement"] == "{INFLUX_MEASUREMENT_AGGREGATED}")
  |> filter(fn: (r) => r["tag_code"] == "{tag}")
  |> filter(fn: (r) => r["_field"] == "mean")
  |> keep(columns: ["_time", "_value"])
'''
                df_f = query_api.query_data_frame(q)
                if isinstance(df_f, list):
                    df_f = pd.concat(df_f, ignore_index=True) if df_f else pd.DataFrame()
                if not isinstance(df_f, pd.DataFrame) or df_f.empty or "_time" not in df_f.columns:
                    continue

                df_f["_value"] = pd.to_numeric(df_f["_value"], errors="coerce")

                if single_day:
                    # 只保留台灣時間屬於目標日的小時資料，避免 buffer 天的資料混入
                    taipei_times = pd.to_datetime(df_f["_time"]).dt.tz_convert("Asia/Taipei")
                    target_date = pd.Timestamp(start_date).date()
                    mask = taipei_times.dt.date == target_date
                    df_f = df_f[mask].copy()
                    if df_f.empty:
                        continue
                    df_f["_date"] = taipei_times[mask].dt.strftime("%H:00")
                    col_frames[tag] = df_f.set_index("_date")["_value"]
                else:
                    # 每小時一個點，x 軸為台灣時間 YYYY-MM-DD HH:00
                    taipei_times = pd.to_datetime(df_f["_time"]).dt.tz_convert("Asia/Taipei")
                    df_f["_date"] = taipei_times.dt.strftime("%Y-%m-%d %H:00")
                    date_only = taipei_times.dt.date.astype(str)
                    df_f = df_f[(date_only >= start_date) & (date_only <= end_date)].copy()
                    col_frames[tag] = df_f.set_index("_date")["_value"]

            if not col_frames:
                return pd.DataFrame(columns=["_date"])

            g = pd.DataFrame(col_frames).reset_index()
            g.rename(columns={"index": "_date"}, inplace=True)
            return g

        # ---- A) 主題切換（只換樣式，不改資料/可視狀態）----
        if ctx.triggered_id == "theme-store":
            # 圖表套主題
            fig = go.Figure(current_fig) if current_fig else go.Figure()
            fig = apply_chart_theme(fig, theme_mode)
            line_style = SHOW if has_result else HIDE

            # result-table：若目前在比較模式，維持隱藏；否則換色
            is_compare_mode_now = (mode_value in {"mom", "yoy", "qoq", "custom"})
            result_table_style = dict(table_styles["style_table"])
            if is_compare_mode_now:
                result_table_style["display"] = "none"

            return (
                no_update, no_update,
                fig, line_style,
                result_table_style,                     # ★ 不會把隱藏狀態洗掉
                table_styles["style_header"],
                table_styles["style_cell"],
                no_update,                              # result-ready
                no_update, no_update, no_update,
                no_update, no_update, no_update,

                no_update, HIDE,                        # no-data-hint 保持

                no_update, no_update, no_update,        # compare-table data/cols/wrapper 保持
                no_update, no_update,                   # normal-summary / compare-summary 保持
                *([no_update]*4),                       # 四張比較卡保持
                table_styles["style_table"],            # 比較表格只換色
                table_styles["style_header"],
                table_styles["style_cell"],
            )

        # ---- B) 查詢 ----
        if not n_clicks:
            raise PreventUpdate

        cfg = compare_cfg or {}
        base = cfg.get("base") or {}
        comp = cfg.get("compare") or {}
        base_start, base_end = base.get("start"), base.get("end")
        comp_start, comp_end = comp.get("start"), comp.get("end")
        is_compare_mode = (mode_value in {"mom", "yoy", "qoq", "custom"})

        if not base_start or not base_end or not selected_tags:
            raise PreventUpdate

        query_tags = list(selected_tags or [])

        # ---- Influx 連線（只在真正查詢時才建立）----
        _influx_client = InfluxDBClient(url=influx_url, token=influx_token, org=influx_org)
        query_api = _influx_client.query_api()

        # ===== 本期 =====
        is_single_day = (base_start == base_end)
        x_label = "時間（每小時）"
        df_main = query_range(base_start, base_end, query_tags, query_api, single_day=is_single_day)

        if df_main.empty:
            _influx_client.close()
            empty_fig = apply_chart_theme(go.Figure(), theme_mode)
            empty_fig.update_layout(margin=dict(l=40, r=20, t=40, b=40),
                                    xaxis_title="Date", yaxis_title="Value")
            no_data_msg = html.Div(
                f"此時間區間（{base_start} ~ {base_end}）查無資料",
                style={"textAlign": "center", "padding": "24px",
                       "color": "var(--muted)", "fontSize": "16px"},
            )
            return (
                [], [], empty_fig, HIDE,
                table_styles["style_table"], table_styles["style_header"], table_styles["style_cell"],
                False,
                *EMPTY_SIX,
                no_data_msg, SHOW,      # no-data-hint
                [], [], HIDE,           # compare-table data/cols/wrapper
                SHOW, HIDE,             # normal-summary 顯示 / compare-summary 隱藏
                *EMPTY_FOUR,
                table_styles["style_table"], table_styles["style_header"], table_styles["style_cell"],
            )

        # ===== 一般表格 =====
        df_tbl = df_main.copy()
        for col in df_tbl.select_dtypes(include="float").columns:
            df_tbl[col] = df_tbl[col].round(2)
        data = df_tbl.to_dict("records")
        label_map = {"_date": x_label, **tag_label_map}
        columns = [{"name": label_map.get(col, col), "id": col} for col in df_tbl.columns]

        # ===== 圖（多 Y 軸：同單位共用一軸）=====
        tag_units = get_tag_units(query_tags)
        # 為每個不同單位分配 yaxis 編號
        unit_axis = {}  # unit -> yaxis key (e.g. "y", "y2", "y3"...)
        tag_yaxis = {}  # tag_code -> yaxis key
        for tag in [c for c in df_main.columns if c != "_date"]:
            unit = tag_units.get(tag, "")
            if unit not in unit_axis:
                idx = len(unit_axis) + 1
                unit_axis[unit] = "y" if idx == 1 else f"y{idx}"
            tag_yaxis[tag] = unit_axis[unit]

        fig = go.Figure()
        for f in [c for c in df_main.columns if c != "_date"]:
            fig.add_trace(go.Scatter(
                x=df_main["_date"], y=df_main[f].round(2),
                mode="lines+markers",
                name=f"{tag_label_map.get(f, f)}（本期）",
                yaxis=tag_yaxis.get(f, "y"),
                hovertemplate="%{x}<br><b>%{y:.2f}</b><extra></extra>",
            ))

        # ===== 比較期（畫第二條線；並準備比較表/卡）=====
        df_comp = pd.DataFrame()
        cmp_table_data, cmp_table_cols, cmp_cards = [], [], EMPTY_FOUR
        normal_sum_style, compare_sum_style = SHOW, HIDE
        cmp_wrapper_style = HIDE
        result_table_style = table_styles["style_table"]

        no_data_msg = ""
        no_data_style = HIDE

        if is_compare_mode and comp_start and comp_end:
            is_comp_single_day = (comp_start == comp_end)
            df_comp = query_range(comp_start, comp_end, query_tags, query_api, single_day=is_comp_single_day)

            if df_comp.empty:
                no_data_msg = html.Div(
                    f"比較區間（{comp_start} ~ {comp_end}）查無資料，僅顯示本期",
                    style={"textAlign": "center", "padding": "16px",
                           "color": "var(--muted)", "fontSize": "15px"},
                )
                no_data_style = SHOW

            if not df_comp.empty:
                for f in [c for c in df_main.columns if c != "_date"]:
                    # 對齊長度（用本期 x 軸）
                    y_cmp = pd.to_numeric(df_comp.get(f), errors="coerce").tolist() if f in df_comp.columns else []
                    fig.add_trace(go.Scatter(
                        x=df_main["_date"],
                        y=[round(v, 2) if v is not None else None for v in (y_cmp[:len(df_main)] + [None]*max(0, len(df_main)-len(y_cmp)))],
                        mode="lines+markers",
                        name=f"{tag_label_map.get(f, f)}（比較期）",
                        line=dict(dash="dash"),
                        hovertemplate="%{x}<br><b>%{y:.2f}</b><extra></extra>",
                    ))
                # ===== 比較表格（本期 vs 比較期）=====
                compare_fields = [c for c in df_main.columns if c != "_date" and c in df_comp.columns]
                if compare_fields:
                    # 支援多欄位比較：為每個欄位建立完整的比較資料
                    base_dates = df_main["_date"].tolist()
                    ref_dates  = df_comp["_date"].tolist()
                    n = min(len(base_dates), len(ref_dates))

                    rows = []
                    for i in range(n):
                        row_data = {
                            "base_date": base_dates[i],
                            "compare_date": ref_dates[i],
                        }

                        # 為每個欄位加入本期值、比較期值、差異、百分比
                        for field in compare_fields:
                            base_vals = pd.to_numeric(df_main[field], errors="coerce").tolist()
                            ref_vals = pd.to_numeric(df_comp[field], errors="coerce").tolist()

                            b_val = base_vals[i] if i < len(base_vals) else None
                            r_val = ref_vals[i] if i < len(ref_vals) else None
                            d = b_val - r_val if b_val is not None and r_val is not None else None
                            pct = format_percent(d, r_val) if d is not None else ""

                            field_label = tag_label_map.get(field, field)
                            row_data[f"{field}_base"] = format_number(b_val) if b_val is not None else "-"
                            row_data[f"{field}_compare"] = format_number(r_val) if r_val is not None else "-"
                            row_data[f"{field}_delta"] = format_delta(d)
                            row_data[f"{field}_percent"] = pct

                        rows.append(row_data)

                    cmp_table_data = rows

                    # 動態建立表格欄位
                    cmp_table_cols = [
                        {"name": "本期日期", "id": "base_date"},
                        {"name": "比較期日期", "id": "compare_date"},
                    ]
                    for field in compare_fields:
                        field_label = tag_label_map.get(field, field)
                        cmp_table_cols.extend([
                            {"name": f"{field_label} (本期)", "id": f"{field}_base"},
                            {"name": f"{field_label} (比較期)", "id": f"{field}_compare"},
                            {"name": f"Δ {field_label}", "id": f"{field}_delta"},
                            {"name": f"% {field_label}", "id": f"{field}_percent"},
                        ])

                    # ---- 比較卡片：使用第一個欄位的統計 ----
                    main_col = compare_fields[0]
                    base_vals_aln = pd.to_numeric(df_main[main_col], errors="coerce").tolist()[:n]
                    ref_vals_aln = pd.to_numeric(df_comp[main_col], errors="coerce").tolist()[:n]

                    b_sum, b_avg, b_max, b_min = calculate_safe_stats(base_vals_aln)
                    r_sum, r_avg, r_max, r_min = calculate_safe_stats(ref_vals_aln)

                    cmp_cards = [
                        create_comparison_card(f"總和 ({tag_label_map.get(main_col, main_col)})",   b_sum, r_sum),
                        create_comparison_card(f"平均 ({tag_label_map.get(main_col, main_col)})",   b_avg, r_avg),
                        create_comparison_card(f"最大值 ({tag_label_map.get(main_col, main_col)})", b_max, r_max),
                        create_comparison_card(f"最小值 ({tag_label_map.get(main_col, main_col)})", b_min, r_min),
                    ]

                    # 切換顯示：隱藏一般表、顯示比較表；六卡隱藏、四卡顯示
                    result_table_style = {**table_styles["style_table"], "display": "none"}
                    cmp_wrapper_style = SHOW
                    normal_sum_style, compare_sum_style = HIDE, SHOW

        # ===== 告警門檻線（加入 legend）=====
        from utils.db_helpers import get_alarm_thresholds
        _severity_color = {"warning": "orange", "critical": "red"}
        _severity_label = {"warning": "警戒", "critical": "告警"}
        x_range = df_main["_date"].tolist()
        for rule in get_alarm_thresholds(query_tags):
            color = _severity_color.get(rule["severity"], "gray")
            unit_str = f" {rule['threshold_unit']}" if rule["threshold_unit"] else ""
            sev_label = _severity_label.get(rule["severity"], rule["severity"])
            tag_label = tag_label_map.get(rule["tag_code"], rule["tag_code"])
            fig.add_trace(go.Scatter(
                x=x_range,
                y=[rule["threshold_value"]] * len(x_range),
                mode="lines",
                name=f"{tag_label} {sev_label}（{rule['threshold_value']}{unit_str}）",
                line=dict(color=color, dash="dot", width=1.5),
                showlegend=True,
            ))

        # 多 Y 軸 layout（每個不同單位一條軸）
        yaxis_layout = {}
        axis_positions = [0, 1, 0.08, 0.92]  # 左1、右1、左2、右2
        sides = ["left", "right", "left", "right"]
        for i, (unit, ykey) in enumerate(unit_axis.items()):
            axis_cfg = dict(
                title=unit or "數值",
                showgrid=(i == 0),
                zeroline=False,
            )
            if i > 0:
                axis_cfg["overlaying"] = "y"
                axis_cfg["side"] = sides[i % len(sides)]
                if i >= 2:
                    axis_cfg["anchor"] = "free"
                    axis_cfg["position"] = axis_positions[i]
            layout_key = "yaxis" if ykey == "y" else f"yaxis{ykey[1:]}"
            yaxis_layout[layout_key] = axis_cfg

        fig.update_layout(
            title="統計趨勢圖",
            xaxis_title=x_label,
            margin=dict(l=60, r=60, t=40, b=30),
            **yaxis_layout,
        )
        fig = apply_chart_theme(fig, theme_mode)

        # ===== 一般統計卡（有中文對照）=====
        num_series = {col: pd.to_numeric(df_main[col], errors="coerce").dropna()
                    for col in df_main.columns if col != "_date"}

        avg_card    = create_stat_card("平均數", [f"{tag_label_map.get(col, col)}：{format_number(s.mean())}"   for col, s in num_series.items()])
        median_card = create_stat_card("中位數", [f"{tag_label_map.get(col, col)}：{format_number(s.median())}" for col, s in num_series.items()])
        max_card    = create_stat_card("最大值", [f"{tag_label_map.get(col, col)}：{format_number(s.max())}"    for col, s in num_series.items()])
        min_card    = create_stat_card("最小值", [f"{tag_label_map.get(col, col)}：{format_number(s.min())}"    for col, s in num_series.items()])
        count_card  = create_stat_card("樣本數", [f"{tag_label_map.get(col, col)}：{int(s.count())}"   for col, s in num_series.items()])
        sum_card    = create_stat_card("總和",   [f"{tag_label_map.get(col, col)}：{format_number(s.sum())}"    for col, s in num_series.items()])

        # ===== 關閉 Influx 連線 =====
        _influx_client.close()

        # ===== 最終回傳（26 個輸出）=====
        return (
            data, columns,
            fig, SHOW,
            result_table_style, table_styles["style_header"], table_styles["style_cell"],
            True,
            avg_card, median_card, max_card, min_card, count_card, sum_card,

            no_data_msg, no_data_style,  # no-data-hint

            cmp_table_data, cmp_table_cols, cmp_wrapper_style,
            normal_sum_style, compare_sum_style,
            *cmp_cards,
            table_styles["style_table"], table_styles["style_header"], table_styles["style_cell"],
        )
    # --------- 下載 CSV ---------
    @app.callback(
        Output("download-report-csv", "data"),     
        Input("btn-download", "n_clicks"),
        State("result-table", "data"),
        State("compare-table", "data"),   # << 加這個
        prevent_initial_call=True
    )
    def download_csv(n_clicks, table_data, compare_data):
        if not n_clicks:
            raise PreventUpdate

        if compare_data and len(compare_data) > 0:
            df = pd.DataFrame(compare_data)
            return dcc.send_data_frame(df.to_csv, "compare_result.csv", index=False)

        if table_data and len(table_data) > 0:
            df = pd.DataFrame(table_data)
            return dcc.send_data_frame(df.to_csv, "query_result.csv", index=False)

        raise PreventUpdate

# --------- 選項報錯  ---------
    @app.callback(
        Output("date-range-hint", "children"),
        Output("query-options-hint", "children"),
        Input("export-btn", "n_clicks"),
        State("date-range", "start_date"),
        State("date-range", "end_date"),
        State("query-options", "value"),
        prevent_initial_call=True,
    )
    def show_query_hints(n_clicks, start_date, end_date, selected_fields):
        if not n_clicks:
            raise PreventUpdate

        msg_date = ""
        msg_opts = ""

        if not start_date or not end_date:
            msg_date = "⚠️ 請先選擇完整的日期區間"

        if not selected_fields:
            msg_opts = "⚠️ 請至少勾選一個查詢項目"

        return msg_date, msg_opts

