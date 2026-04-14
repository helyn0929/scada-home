# callbacks/compare_dates.py
from dash import Input, Output, State, no_update
from datetime import date
from dateutil.relativedelta import relativedelta
import calendar

# ---------- helpers ----------
def _parse(d):
    if not d: return None
    if isinstance(d, date): return d
    return date.fromisoformat(str(d)[:10])

def _last_day(y, m): 
    return calendar.monthrange(y, m)[1]

def _is_full_month(s: date, e: date) -> bool:
    return (s.day == 1 and e.day == _last_day(e.year, e.month) and s.year == e.year and s.month == e.month)

def _quarter_bounds(s: date):
    q_start_month = ((s.month - 1) // 3) * 3 + 1
    q_end_month = q_start_month + 2
    qs = date(s.year, q_start_month, 1)
    qe = date(s.year, q_end_month, _last_day(s.year, q_end_month))
    return qs, qe

def _is_full_quarter(s: date, e: date) -> bool:
    qs, qe = _quarter_bounds(s)
    return s == qs and e == qe

def _shift_months(s: date, e: date, months: int):
    return s - relativedelta(months=months), e - relativedelta(months=months)

def _shift_years(s: date, e: date, years: int):
    return s - relativedelta(years=years), e - relativedelta(years=years)

def _compute_compare_range(mode: str, base_start, base_end):
    """
    mode: mom | yoy | qoq | custom | normal
    回傳: (comp_start:str|None, comp_end:str|None)
    """
    s, e = _parse(base_start), _parse(base_end)
    if not (s and e) or e < s:
        return (None, None)

    if mode == "mom":
        # 整月 → 上月整月；否則等長往前 1 個月
        if _is_full_month(s, e):
            pm = (s - relativedelta(months=1))
            cs = date(pm.year, pm.month, 1)
            ce = date(pm.year, pm.month, _last_day(pm.year, pm.month))
        else:
            cs, ce = _shift_months(s, e, 1)
        return cs.isoformat(), ce.isoformat()

    if mode == "yoy":
        # 整月 → 去年同月；整季 → 去年同季；否則等長往前 1 年
        if _is_full_month(s, e):
            ly = s.year - 1
            cs = date(ly, s.month, 1)
            ce = date(ly, s.month, _last_day(ly, s.month))
        elif _is_full_quarter(s, e):
            qs, qe = _quarter_bounds(s)
            cs = date(qs.year - 1, qs.month, 1)
            ce = date(qe.year - 1, qe.month, _last_day(qe.year - 1, qe.month))
        else:
            cs, ce = _shift_years(s, e, 1)
        return cs.isoformat(), ce.isoformat()

    if mode == "qoq":
        # 整季 → 上一季整季；否則等長往前 3 個月
        if _is_full_quarter(s, e):
            qs, qe = _quarter_bounds(s)
            prev_q_end = qs - relativedelta(days=1)
            prev_q_start = (qs - relativedelta(months=3)).replace(day=1)
            cs = date(prev_q_start.year, prev_q_start.month, 1)
            ce = date(prev_q_end.year, prev_q_end.month, _last_day(prev_q_end.year, prev_q_end.month))
        else:
            cs, ce = _shift_months(s, e, 3)
        return cs.isoformat(), ce.isoformat()

    # normal / custom
    return (None, None)

# ---------- public: register callbacks ----------
def register_callbacks(app):
    @app.callback(
        Output("compare-config", "style"),
        Output("compare-date-picker", "start_date"),
        Output("compare-date-picker", "end_date"),
        Output("compare-date-picker", "disabled"),
        Output("compare-hint", "children"),
        Output("compare-config-store", "data"),
        Input("mode-switch", "value"),
        Input("date-range", "start_date"),
        Input("date-range", "end_date"),
        State("compare-date-picker", "start_date"),
        State("compare-date-picker", "end_date"),
        prevent_initial_call=False,
    )
    def sync_compare_ui(mode, base_start, base_end, cmp_s_state, cmp_e_state):
        mode = mode or "normal"
        show = mode in ("mom", "yoy", "qoq", "custom")
        style = {"display": "block"} if show else {"display": "none"}

        # 預設
        cmp_s, cmp_e = (None, None)
        disabled = (mode in ("mom", "yoy", "qoq"))
        hint = ""

        if not show:
            store = {"mode": mode, "base": {"start": base_start, "end": base_end}, "compare": None}
            return style, None, None, True, "", store

        if mode == "custom":
            # 讓使用者選；保留已選值
            disabled = False
            hint = "請選擇比較區間"
            cmp_s, cmp_e = cmp_s_state, cmp_e_state
        else:
            # 自動計算比較期
            cmp_s, cmp_e = _compute_compare_range(mode, base_start, base_end)
            hint = f"比較區間：{cmp_s} ~ {cmp_e}（自動計算）" if (cmp_s and cmp_e) else "請先選擇本期日期"

        store = {
            "mode": mode,
            "base": {"start": base_start, "end": base_end},
            "compare": {"start": cmp_s, "end": cmp_e} if (cmp_s and cmp_e) else None
        }
        return style, cmp_s, cmp_e, disabled, hint, store

