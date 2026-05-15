# app_blocks.py
import dash_bootstrap_components as dbc
from dash import Dash, html, Output, Input, ctx, dcc
from layout_query import query_layout
from layout_overview import overview_layout
from callbacks import query, compare_dates, overview

app = Dash(
    __name__,
    external_stylesheets=[dbc.themes.BOOTSTRAP],
    requests_pathname_prefix="/history/",
)
app.config.suppress_callback_exceptions = True
server = app.server
app.title = "湖山小水力 - 歷史查詢"

navbar = dbc.Navbar(
    dbc.Container(
        [
            html.Div(
                className="nav-left",
                children=[
                    html.Img(src="/assets/aesmegalogo.png", style={"height": "36px"}),
                    dbc.Nav(
                        [
                            dbc.NavItem(dbc.NavLink("概覽", href="#", id="btn-overview")),
                            dbc.NavItem(dbc.NavLink("區間查詢", href="#", id="btn-query")),
                        ],
                        className="navbar-tabs",
                        navbar=True,
                    ),
                ],
            ),
            html.Div(
                className="theme-switch",
                children=[
                    html.Span("Light", className="toggle-label light"),
                    dbc.Switch(id="theme-toggle", value=True, className="form-switch m-0"),
                    html.Span("Dark", className="toggle-label dark"),
                ],
            ),
        ],
        fluid=True,
    ),
    className="navbar-elevated"
)

app.layout = html.Div(
    id="theme-root",
    **{"data-theme": "dark"},
    children=[
        dcc.Store(id="theme-store", data="dark"),
        navbar,
        html.Div(id="content-area", children=overview_layout())
    ]
)


@app.callback(
    Output("theme-root", "data-theme"),
    Output("theme-store", "data"),
    Input("theme-toggle", "value"),
    prevent_initial_call=False
)
def toggle_theme(is_dark):
    mode = "dark" if is_dark else "light"
    return mode, mode


@app.callback(
    Output("content-area", "children"),
    Input("btn-overview", "n_clicks"),
    Input("btn-query", "n_clicks"),
)
def render_page(n0, n1):
    if ctx.triggered_id == "btn-query":
        return query_layout()
    return overview_layout()


@app.callback(
    Output("charts-zone", "style", allow_duplicate=True),
    Output("table-zone", "style", allow_duplicate=True),
    Output("action-bar", "style", allow_duplicate=True),
    Output("stats-summary", "style", allow_duplicate=True),
    Input("result-ready", "data"),
    prevent_initial_call='initial_duplicate',
)
def toggle_sections(ready):
    hide       = {"display": "none"}
    show_block = {"display": "block"}
    show_flex  = {"display": "flex"}
    if ready:
        return show_block, show_block, show_flex, show_block
    return hide, hide, hide, hide


@app.callback(
    Output("btn-overview", "active"),
    Output("btn-query", "active"),
    Input("btn-overview", "n_clicks"),
    Input("btn-query", "n_clicks"),
    prevent_initial_call=False
)
def highlight_active_tab(no, nq):
    if ctx.triggered_id == "btn-query":
        return False, True
    return True, False


app.clientside_callback(
    """
    function(n_clicks) {
        if (!n_clicks) return window.dash_clientside.no_update;
        const chart = document.getElementById("result-line-chart");
        if (!chart) return "";
        // 嘗試多種 selector 以相容不同 Plotly 版本
        const selectors = [
            ".modebar-btn[data-title='Download plot as a png']",
            ".modebar-btn[data-title='download plot as a png']",
            ".modebar-btn[data-attr='toimage']",
            "a[data-title='Download plot as a png']",
        ];
        for (const sel of selectors) {
            const btn = chart.querySelector(sel);
            if (btn) { btn.click(); return ""; }
        }
        // fallback: 點第一個 modebar 按鈕群裡的下載按鈕
        const allBtns = chart.querySelectorAll(".modebar-btn");
        for (const btn of allBtns) {
            const title = (btn.getAttribute("data-title") || "").toLowerCase();
            if (title.includes("download") || title.includes("png") || title.includes("image")) {
                btn.click(); return "";
            }
        }
        return "";
    }
    """,
    Output("fake-output", "children"),
    Input("btn-download-img", "n_clicks")
)



compare_dates.register_callbacks(app)
query.register_callbacks(app)
overview.register_callbacks(app)

if __name__ == "__main__":
    port = int(__import__("os").getenv("DASH_PORT", 8050))
    app.run(host="0.0.0.0", port=port, debug=False)
