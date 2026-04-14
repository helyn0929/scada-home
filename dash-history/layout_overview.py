# layout_overview.py
from dash import html, dcc
import dash_bootstrap_components as dbc


def overview_layout():
    return html.Div(
        id="app-root",
        children=[
            # 即時卡片：30 秒
            dcc.Interval(id="overview-interval-fast",   interval=30_000,    n_intervals=0),
            # 趨勢圖 + 今日累積電量：15 分鐘
            dcc.Interval(id="overview-interval-medium", interval=900_000,   n_intervals=0),
            # 本月長條圖：1 小時
            dcc.Interval(id="overview-interval-slow",   interval=3_600_000, n_intervals=0),
            # 目前查看日期（None = 今日即時）
            dcc.Store(id="overview-date-store", data=None),

            # ===== Header =====
            html.Div(
                className="app-header",
                children=[
                    html.Div([
                        html.H3("發電概覽", style={"margin": 0}),
                        html.Div("即時狀態・每 30 秒自動更新", className="small-label"),
                    ]),
                    # 日期切換列
                    html.Div(
                        style={
                            "display": "flex", "alignItems": "center", "gap": "10px",
                            "marginLeft": "auto", "paddingRight": "20px",
                        },
                        children=[
                            html.Button(
                                "‹", id="btn-date-prev", n_clicks=0,
                                className="date-nav-btn",
                                style={"fontSize": "1.2rem", "padding": "2px 10px"},
                            ),
                            dcc.DatePickerSingle(
                                id="overview-date-picker",
                                display_format="YYYY/MM/DD",
                                placeholder="選擇日期",
                                clearable=True,
                                style={"fontSize": "0.95rem"},
                            ),
                            html.Button(
                                "›", id="btn-date-next", n_clicks=0,
                                className="date-nav-btn",
                                style={"fontSize": "1.2rem", "padding": "2px 10px"},
                            ),
                            html.Button(
                                "今日", id="btn-date-today", n_clicks=0,
                                className="date-nav-btn",
                                style={"padding": "4px 12px", "fontWeight": "600"},
                            ),
                            html.Span(
                                id="overview-date-label",
                                style={"fontSize": "0.9rem", "color": "var(--muted)"},
                            ),
                        ],
                    ),
                    html.Div(
                        id="overview-last-update",
                        className="small-label",
                        style={"paddingRight": "20px", "alignSelf": "flex-end"},
                    ),
                ],
                style={"display": "flex", "alignItems": "center"},
            ),

            # ===== 統計卡片 =====
            dbc.Row(
                [
                    dbc.Col(html.Div(id="card-power-now",  className="summary-card"), md=4),
                    dbc.Col(html.Div(id="card-flow-now",   className="summary-card"), md=4),
                    dbc.Col(html.Div(id="card-kwh-today",  className="summary-card"), md=4),
                ],
                className="mb-3",
                style={"padding": "0 20px"},
            ),

            # ===== 圖表區 =====
            html.Div(
                className="main-content",
                children=[
                    # 圖表 1：功率趨勢（不用 dcc.Loading，避免自動更新時閃爍）
                    html.Div(
                        className="chart-card",
                        children=[
                            dcc.Graph(
                                id="overview-power-chart",
                                figure={},
                                style={"width": "100%", "height": "320px"},
                                config={"displayModeBar": "hover", "responsive": True},
                            )
                        ],
                    ),
                    # 圖表 2：流量趨勢
                    html.Div(
                        className="chart-card",
                        children=[
                            dcc.Graph(
                                id="overview-flow-chart",
                                figure={},
                                style={"width": "100%", "height": "320px"},
                                config={"displayModeBar": "hover", "responsive": True},
                            )
                        ],
                    ),
                    # 圖表 3：本月每日發電量長條圖
                    html.Div(
                        className="chart-card",
                        children=[
                            dcc.Graph(
                                id="overview-monthly-chart",
                                figure={},
                                style={"width": "100%", "height": "320px"},
                                config={"displayModeBar": "hover", "responsive": True},
                            )
                        ],
                    ),
                ],
            ),
        ],
    )
