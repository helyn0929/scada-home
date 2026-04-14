from dash import html, dcc, dash_table
import dash_bootstrap_components as dbc
from utils.db_helpers import get_all_query_tags

# ======== 區間查詢頁 ========
def query_layout(table_styles=None):
    table_styles = table_styles or {}
    tag_options = get_all_query_tags()

    return html.Div(
        id="app-root",
        children=[

            # ===== Header：整頁標題 =====
            html.Div(
                className="app-header",
                children=[
                    html.Div([
                        html.H3("區間查詢", style={"margin": 0}),
                        html.Div("快速查詢・圖表分析與匯出", className="small-label")
                    ]),
                ],
            ),

            # ===== Controls：工具列（RWD 自動一欄） =====
            html.Div(
                className="controls",
                children=[
                    # 1) 查詢項目（固定白名單，直接顯示）
                    html.Div([
                        html.Div("查詢項目", className="small-label"),
                        dcc.Checklist(
                            id="query-options",
                            options=tag_options,
                            value=[],
                            inputStyle={"marginRight": "6px"},
                            className="checklist-subtle",
                        ),
                        html.Div(id="query-options-hint", className="small-label text-red-500 mt-1"),
                    ]),

                    # 3) 日期區間 + 比較期
                    html.Div([
                        html.Div("日期區間", className="small-label"),
                        dcc.DatePickerRange(
                            id="date-range",
                            className="dpr",
                            start_date_placeholder_text="Start Date",
                            end_date_placeholder_text="End Date",
                            display_format="YYYY-MM-DD",
                            clearable=True,
                        ),
                        html.Div(id="date-range-hint", className="small-label text-red-500 mt-1"),
                        html.Div(
                            id="compare-config",
                            style={"marginTop": "10px", "display": "none"},
                            children=[
                                html.Div("比較期", className="small-label mt-2"),
                                dcc.DatePickerRange(
                                    id="compare-date-picker",
                                    className="dpr",
                                    display_format="YYYY-MM-DD",
                                    minimum_nights=0,
                                    disabled=True,
                                ),
                                html.Div(id="compare-hint", className="small-label", style={"marginTop": "6px"}),
                            ],
                        ),
                    ], className="col-left"),

                    # 右欄：模式下拉
                    html.Div([
                        html.Div("模式", className="small-label"),
                        dcc.Dropdown(
                            id="mode-switch",
                            options=[
                                {"label": "一般模式",     "value": "normal"},
                                {"label": "月比上月 MoM", "value": "mom"},
                                {"label": "月比去年 YoY", "value": "yoy"},
                                {"label": "季比上季 QoQ", "value": "qoq"},
                                {"label": "自訂比較",     "value": "custom"},
                            ],
                            value="normal",
                            clearable=False,
                            style={"width": "100%"},
                        ),
                    ]),
                ],
            ),

            # ===== 查詢按鈕（獨立一行，靠右） =====
            html.Div(
                style={"display": "flex", "justifyContent": "flex-end",
                       "padding": "0 20px", "marginBottom": "10px"},
                children=[
                    html.Button("查詢", id="export-btn", n_clicks=0, className="btn",
                                style={"minWidth": "120px"}),
                ],
            ),

            # ===== 查無資料提示 =====
            html.Div(id="no-data-hint", style={"display": "none"}),

            # ===== 統計摘要（同一區域，依模式切換） =====
            html.Div(
                id="stats-summary",
                style={"display": "none"},
                children=[
                    # 一般模式：6 張卡（原樣）
                    html.Div(
                        id="normal-summary",
                        children=[
                            dbc.Row(
                                [
                                    dbc.Col(html.Div(id="avg-card",    className="summary-card"), md=2),
                                    dbc.Col(html.Div(id="median-card", className="summary-card"), md=2),
                                    dbc.Col(html.Div(id="max-card",    className="summary-card"), md=2),
                                    dbc.Col(html.Div(id="min-card",    className="summary-card"), md=2),
                                    dbc.Col(html.Div(id="count-card",  className="summary-card"), md=2),
                                    dbc.Col(html.Div(id="sum-card",    className="summary-card"), md=2),
                                ],
                                id="stats-grid",
                                className="mb-3"
                            ),
                        ],
                    ),
                    # 比較模式：4 張卡（新增）
                    html.Div(
                        id="compare-summary",
                        style={"display": "none"},
                        children=[
                            dbc.Row(
                                [
                                    dbc.Col(html.Div(id="cmp-sum-card", className="summary-card"), md=3),
                                    dbc.Col(html.Div(id="cmp-avg-card", className="summary-card"), md=3),
                                    dbc.Col(html.Div(id="cmp-max-card", className="summary-card"), md=3),
                                    dbc.Col(html.Div(id="cmp-min-card", className="summary-card"), md=3),
                                ],
                                id="cmp-stats-grid",
                                className="mb-3"
                            ),
                        ],
                    ),
                ],
            ),

            # ===== 主內容：圖表 + 表格 =====
            html.Div(
                className="main-content",
                children=[
                    # 圖表（原樣，保留舊 ID）
                    dcc.Loading(
                        type="default",
                        children=html.Div(
                            id="charts-zone",
                            className="chart-card",
                            style={"display": "none"},
                            children=[
                                dcc.Graph(
                                    id="result-line-chart",
                                    figure={},
                                    style={"width": "100%"},
                                    config={"displayModeBar": True, "responsive": True},
                                )
                            ]
                        ),
                    ),
                    # 表格（同一區域兩種表，依模式切換顯示）
                    html.Div(
                        id="table-zone",
                        className="table-card",
                        style={"display": "none"},
                        children=[
                            # 一般模式表格（原樣）
                            dash_table.DataTable(
                                id="result-table",
                                columns=[],
                                data=[],
                                page_size=10,
                                style_table=table_styles.get("style_table", {}),
                                style_header=table_styles.get("style_header", {}),
                                style_cell=table_styles.get("style_cell", {}),
                            ),
                            # 比較模式表格（新增：用 wrapper 控制顯示/隱藏）
                            html.Div(
                                id="compare-table-wrapper",
                                style={"display": "none"},
                                children=[
                                    dash_table.DataTable(
                                        id="compare-table",
                                        columns=[],
                                        data=[],
                                        page_size=10,
                                        style_table=table_styles.get("style_table", {}),
                                        style_header=table_styles.get("style_header", {}),
                                        style_cell=table_styles.get("style_cell", {}),
                                    )
                                ],
                            ),
                        ],
                    ),
                ],
            ),
            html.Div(id="fake-output", style={"display": "none"}),
            # ===== Sticky 匯出工具列 =====
            html.Div(
                id="action-bar",
                className="action-bar",
                style={"display": "none"},
                children=[
                    dbc.Button("匯出報表 (CSV)", id="btn-download", color="success", className="btn"),
                    dcc.Download(id="download-report-csv"),
                    dbc.Button("儲存圖表 (PNG)", id="btn-download-img", color="success", className="btn"),
                    dcc.Download(id="download-graph-png"),
                ],
            ),

            # 狀態儲存
            dcc.Store(id="result-ready", data=False),
            # 用來保存 mode/base/compare 設定（之後 callback 讀寫）
            dcc.Store(id="compare-config-store"),
        ],
    )

