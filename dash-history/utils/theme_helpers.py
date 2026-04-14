# utils/theme_helpers.py
"""
主題相關的工具函式
提供圖表、表格等元件的主題樣式
"""

def apply_chart_theme(fig, theme_mode: str):
    """
    將主題樣式套用到 Plotly 圖表

    Args:
        fig: Plotly Figure 物件
        theme_mode: "light" 或 "dark"

    Returns:
        fig: 套用主題後的 Figure 物件
    """
    # 取得目前已設定的 margin，僅補預設值不覆蓋
    cur_margin = fig.layout.margin.to_plotly_json() if fig.layout.margin else {}
    merged_margin = {**dict(l=50, r=20, t=40, b=50), **{k: v for k, v in cur_margin.items() if v is not None}}

    if theme_mode == "dark":
        grid_color = "#2a3342"
        fig.update_layout(
            template="plotly_dark",
            paper_bgcolor="#111827",
            plot_bgcolor="#111827",
            font=dict(color="#e5e7eb", size=13),
            margin=merged_margin,
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
        )
    else:
        grid_color = "#e5e7eb"
        fig.update_layout(
            template="plotly_white",
            paper_bgcolor="#ffffff",
            plot_bgcolor="#ffffff",
            font=dict(color="#111827", size=13),
            margin=merged_margin,
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
        )
    # 只補 gridcolor/zeroline，不覆蓋已有的 tickformat/nticks/range 等設定
    fig.update_xaxes(gridcolor=grid_color, zeroline=False)
    fig.update_yaxes(gridcolor=grid_color, zeroline=False)
    return fig


def get_table_styles(theme_mode: str):
    if theme_mode == "dark":
        return {
            "style_table": {
                "overflowX": "auto",
                "backgroundColor": "#111827",
                "border": "1px solid #2a3342"
            },
            "style_header": {
                "backgroundColor": "#1f2937",
                "color": "#e5e7eb",
                "fontWeight": "bold",
                "border": "1px solid #2a3342"
            },
            "style_cell": {
                "backgroundColor": "#111827",
                "color": "#e5e7eb",
                "textAlign": "center",
                "border": "1px solid #2a3342"
            }
        }
    else:
        return {
            "style_table": {
                "overflowX": "auto",
                "backgroundColor": "#ffffff",
                "border": "1px solid #e5e7eb"
            },
            "style_header": {
                "backgroundColor": "#f3f4f6",
                "color": "#111827",
                "fontWeight": "bold",
                "border": "1px solid #e5e7eb"
            },
            "style_cell": {
                "backgroundColor": "#ffffff",
                "color": "#111827",
                "textAlign": "center",
                "border": "1px solid #e5e7eb"
            }
        }

