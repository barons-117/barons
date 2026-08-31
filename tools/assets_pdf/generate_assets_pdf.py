#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BARONS — מחולל חוברת נכסים PDF
==============================

שימוש:
    python3 generate_assets_pdf.py --assets export.json [--savings savings.json] -o out.pdf

הקלט `--assets` הוא הפלט של assets_export.sql (תא JSON יחיד).
הקלט `--savings` הוא אופציונלי: JSON (רשימת אובייקטים או אובייקט של קבוצות).

⚠️ חשבון השווי וההכנסה כאן חייב להישאר זהה ל-Assets.jsx.
   כל שינוי בלוגיקה שם — לעדכן גם כאן. ראה §17 ב-BARONS_SKILL.md.
"""

import argparse, json, html, sys, datetime, os

# ─── FX ───────────────────────────────────────────────────────────────────────
# זהה ל-FALLBACK_FX ב-Assets.jsx / AssetDetail.jsx
# עודכן 31/08/2026. חייב להישאר זהה ל-FALLBACK_FX ב-Assets.jsx / AssetDetail.jsx
FX = {"ILS": 1.0, "USD": 3.00, "EUR": 3.47, "HUF": 0.0097, "GBP": 4.04}

FREQ_DIV = {"monthly": 1, "quarterly": 3, "semi-annual": 6, "annual": 12}

ENTITIES = [
    {"key": "erez_only", "label": "ארז", "color": "#2563eb",
     "income_entities": ["erez"]},
    {"key": "erez_roi", "label": "ארז ורועי", "color": "#7c3aed",
     "income_entities": ["erez", "roi", "erez_roi"]},
    {"key": "reuven_private", "label": "ראובן ברון — פרטי", "color": "#16a34a",
     "income_entities": ["reuven_private"]},
    {"key": "reuven_company", "label": "ראובן ברון פיתוח וניהול", "color": "#d97706",
     "income_entities": ["reuven_company"]},
]

ENTITY_LABELS = {
    "erez": "ארז", "roi": "רועי", "erez_roi": "ארז ורועי",
    "reuven_private": "ראובן ברון — פרטי",
    "reuven_company": "ראובן ברון פיתוח וניהול",
    "external": "חיצוני",
}

TYPE_LABELS = {
    "residential": "מגורים", "commercial": "עסקי",
    "real_estate_abroad": 'נדל"ן בחו"ל', "equity": "מניות / חברה",
    "land": "קרקע", "investment": "השקעה", "income": "הכנסה קבועה",
}

STATUS_LABELS = {"active": "פעיל", "archived": "ארכיון", "sold": "נמכר"}

INCOME_KIND_LABELS = {
    "national_insurance": "ביטוח לאומי", "pension_fund": "קרן פנסיה",
    "provident_fund": "קרן גמל / השתלמות", "state_pension": "קרן גמלאות",
    "other": "אחר",
}

FREQ_LABELS = {"monthly": "חודשי", "quarterly": "רבעוני",
               "semi-annual": "חצי-שנתי", "annual": "שנתי"}

# ⚠️ 'plus' מופיע בנתונים בפועל וזהה במשמעותו ל-'excluded' (הסכום לפני מע"מ).
# אף אחד מהם אינו מחלק ב-1.18 — רק 'included'. זהה ל-Assets.jsx.
VAT_LABELS = {"none": 'ללא מע"מ', "included": 'כולל מע"מ',
              "excluded": '+ מע"מ', "plus": '+ מע"מ'}

CURRENCY_SYM = {"ILS": "₪", "USD": "$", "EUR": "€", "GBP": "£", "HUF": "HUF "}


# ─── חשבון — חייב להישאר זהה ל-Assets.jsx ────────────────────────────────────

def to_ils(amount, currency):
    if amount is None:
        return 0.0
    return float(amount) * FX.get(currency or "ILS", 1.0)


def income_monthly_ils(inc):
    """gross → נטו (אם כולל מע"מ) → חלוקה לפי תדירות → שקלים."""
    gross = inc.get("gross_amount")
    if not gross:
        return 0.0
    net = float(gross) / 1.18 if inc.get("vat_type") == "included" else float(gross)
    monthly = net / FREQ_DIV.get(inc.get("payment_frequency"), 1)
    return to_ils(monthly, inc.get("currency"))


def entity_monthly_ils(income_rows, partner_rows, entity):
    total = 0.0
    for inc in income_rows:
        if not inc.get("is_active"):
            continue
        monthly = income_monthly_ils(inc)
        # ⚠️ null נחשב True — רשומות ישנות נוצרו לפני שהשדה קיים
        split_by_ownership = inc.get("split_by_ownership") is not False
        pct = 0.0
        if split_by_ownership:
            p = next((p for p in partner_rows if p.get("entity") == entity), None)
            pct = float(p["percentage"]) if p and p.get("percentage") else 0.0
        else:
            s = next((s for s in inc.get("_splits", []) if s.get("entity") == entity), None)
            pct = float(s["percentage"]) if s and s.get("percentage") else 0.0
        total += monthly * pct
    return total


def entities_monthly_ils(income_rows, partner_rows, entity_list):
    return sum(entity_monthly_ils(income_rows, partner_rows, e) for e in entity_list)


def asset_value_ils(asset, partner_rows, entity_list):
    """שווי החלק של הישויות בנכס. מדויק ללוגיקה של SummaryBlock."""
    pct = sum(float(p.get("percentage") or 0) for p in partner_rows
              if p.get("entity") in entity_list)

    if asset.get("asset_type") == "investment":
        return asset.get("_total_investments_ils", 0.0) * pct

    # ⚠️ estimated_value = 0 הוא falsy ומפעיל fallback. רק NULL מנטרל אותו.
    ev = asset.get("estimated_value")
    if ev:
        return to_ils(ev, asset.get("estimated_value_currency")) * pct

    purchases = asset.get("_total_purchases_ils", 0.0)
    if purchases and pct > 0:
        internal_pct = sum(float(p.get("percentage") or 0) for p in partner_rows
                           if p.get("entity") != "external")
        if internal_pct > 0:
            return (purchases / internal_pct) * pct
    return 0.0


# ─── פורמט ────────────────────────────────────────────────────────────────────

def fmt_ils(n):
    if not n:
        return "—"
    return "₪" + f"{round(n):,}"


def fmt_orig(n, currency):
    if not n:
        return ""
    sym = CURRENCY_SYM.get(currency, (currency or "") + " ")
    return f"{sym}{round(float(n)):,}"


def fmt_pct(p):
    if p is None:
        return "—"
    v = float(p) * 100
    return f"{v:.2f}".rstrip("0").rstrip(".") + "%"


def fmt_date(d):
    if not d:
        return "—"
    try:
        return datetime.date.fromisoformat(str(d)[:10]).strftime("%d/%m/%Y")
    except Exception:
        return str(d)


def esc(s):
    return html.escape(str(s)) if s is not None else ""


def ltr(s):
    """בידוד כיווניות לטקסט לטיני/מספרי בתוך פסקה RTL.
    בלי זה '+972-...' נראה '972-...+' והמספר בכתובת קופץ לסוף."""
    if not s:
        return ""
    return f'<span class="ltr">{esc(s)}</span>' 


# ─── בניית מודל הנתונים ───────────────────────────────────────────────────────

def build(data):
    assets = data.get("assets", [])
    partners = data.get("partners", [])
    income = data.get("income", [])
    splits = data.get("income_splits", [])
    purchases = data.get("purchases", [])
    investments = data.get("investments", [])
    events = data.get("events", [])
    contacts = data.get("contacts", [])
    files = data.get("files", [])

    by_asset = lambda rows: _group(rows, "asset_id")

    p_map = by_asset(partners)
    i_map = by_asset(income)
    u_map = by_asset(purchases)
    v_map = by_asset(investments)
    e_map = by_asset(events)
    c_map = by_asset(contacts)
    f_map = by_asset(files)

    s_map = _group(splits, "income_id")
    for inc in income:
        inc["_splits"] = s_map.get(inc["id"], [])

    for a in assets:
        aid = a["id"]
        a["_partners"] = sorted(p_map.get(aid, []),
                                key=lambda p: -float(p.get("percentage") or 0))
        a["_income"] = i_map.get(aid, [])
        a["_purchases"] = u_map.get(aid, [])
        a["_investments"] = v_map.get(aid, [])
        a["_events"] = e_map.get(aid, [])
        a["_contacts"] = [c for c in c_map.get(aid, []) if (c.get("name") or "").strip()]
        a["_files"] = f_map.get(aid, [])
        a["_total_purchases_ils"] = sum(
            to_ils(p.get("amount"), p.get("currency")) for p in a["_purchases"])
        a["_total_investments_ils"] = sum(
            to_ils(v.get("amount"), v.get("currency")) for v in a["_investments"])

    return assets


def _group(rows, key):
    out = {}
    for r in rows or []:
        out.setdefault(r.get(key), []).append(r)
    return out


def entity_matches(entity_key, partner_rows):
    ents = [p.get("entity") for p in partner_rows]
    if entity_key == "erez_only":
        return "erez" in ents and "roi" not in ents and "erez_roi" not in ents
    if entity_key == "erez_roi":
        return "erez_roi" in ents or ("erez" in ents and "roi" in ents)
    return any(e == entity_key for e in ents)


# ─── רינדור ───────────────────────────────────────────────────────────────────

def _is_latin(s):
    letters = [c for c in str(s) if c.isalpha()]
    if not letters:
        return False
    return sum(1 for c in letters if c.isascii()) / len(letters) > 0.5


def render_kv(pairs):
    rows = [f"<tr><th>{esc(k)}</th><td>{v}</td></tr>"
            for k, v in pairs if v not in (None, "", "—")]
    if not rows:
        return ""
    return f'<table class="kv">{"".join(rows)}</table>'


def render_table(headers, rows, cls="data"):
    if not rows:
        return ""
    h = "".join(f"<th>{esc(x)}</th>" for x in headers)
    b = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<table class="{cls}"><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table>'


def section(title, body):
    if not body:
        return ""
    return f'<div class="sec"><h3>{esc(title)}</h3>{body}</div>'


def render_asset(a, depth=0):
    parts = []
    tag = TYPE_LABELS.get(a.get("asset_type"), a.get("asset_type") or "")
    status = STATUS_LABELS.get(a.get("status"), a.get("status") or "")

    cls = "asset child" if depth else "asset"
    parts.append(f'<div class="{cls}">')
    parts.append(
        f'<div class="ahead"><h2>{esc(a.get("name"))}</h2>'
        f'<div class="tags"><span class="tag">{esc(tag)}</span>'
        f'<span class="tag st-{esc(a.get("status"))}">{esc(status)}</span></div></div>'
    )

    addr = ", ".join(filter(None, [a.get("address_street"), a.get("address_city"),
                                   a.get("address_country")]))
    gush = " / ".join(filter(None, [a.get("gush"), a.get("helka")]))

    ev = a.get("estimated_value")
    if ev:
        val = fmt_ils(to_ils(ev, a.get("estimated_value_currency")))
        orig = fmt_orig(ev, a.get("estimated_value_currency"))
        if a.get("estimated_value_currency") not in (None, "ILS"):
            val += f" <span class='dim'>({orig})</span>"
    elif a.get("asset_type") == "investment" and a["_total_investments_ils"]:
        val = fmt_ils(a["_total_investments_ils"]) + " <span class='dim'>(סך השקעות)</span>"
    elif a["_total_purchases_ils"]:
        val = fmt_ils(a["_total_purchases_ils"]) + " <span class='dim'>(אומדן מרכישות)</span>"
    else:
        val = "—"

    monthly = sum(income_monthly_ils(i) for i in a["_income"] if i.get("is_active"))

    parts.append(render_kv([
        ("כתובת", ltr(addr) if addr and _is_latin(addr) else esc(addr)),
        ("גוש / חלקה", esc(gush)),
        ("שווי מלא", val),
        ("הכנסה חודשית ברוטו", fmt_ils(monthly) if monthly else None),
        ("נמכר בתאריך", fmt_date(a["sold_date"]) if a.get("sold_date") else None),
        ("מחיר מכירה", fmt_orig(a.get("sold_price"), a.get("sold_price_currency"))
         if a.get("sold_price") else None),
    ]))

    # בעלות
    if a["_partners"]:
        rows = [[esc(ENTITY_LABELS.get(p.get("entity"), p.get("entity"))),
                 fmt_pct(p.get("percentage")),
                 esc(p.get("name") or ""), esc(p.get("notes") or "")]
                for p in a["_partners"]]
        total = sum(float(p.get("percentage") or 0) for p in a["_partners"])
        # סובלנות 0.5% — אחוזי בעלות נשמרים מעוגלים (0.0833×3+0.75 = 0.9999)
        flag = "" if abs(total - 1.0) < 0.005 else ' <span class="warn">⚠ הסכום אינו 100%</span>'
        rows.append([f'<b>סה"כ</b>', f"<b>{fmt_pct(total)}</b>{flag}", "", ""])
        parts.append(section("בעלות",
                             render_table(["ישות", "אחוז", "שם", "הערות"], rows)))

    # רכישות
    if a["_purchases"]:
        rows = [[fmt_date(u.get("purchase_date")),
                 fmt_orig(u.get("amount"), u.get("currency")),
                 fmt_ils(to_ils(u.get("amount"), u.get("currency"))),
                 esc(u.get("from_whom") or ""), esc(u.get("notes") or "")]
                for u in a["_purchases"]]
        rows.append(["<b>סה\"כ</b>", "", f'<b>{fmt_ils(a["_total_purchases_ils"])}</b>', "", ""])
        parts.append(section("רכישות",
                             render_table(["תאריך", "סכום", 'בש"ח', "ממי", "הערות"], rows)))

    # הכנסות
    if a["_income"]:
        rows = []
        for inc in sorted(a["_income"], key=lambda x: not x.get("is_active")):
            who = " · ".join(filter(None, [inc.get("tenant_name"), inc.get("tenant_name2")]))
            contact = " · ".join(ltr(x) for x in [
                inc.get("tenant_phone"), inc.get("tenant_email"),
                inc.get("tenant_phone2"), inc.get("tenant_email2")] if x)
            kind = INCOME_KIND_LABELS.get(inc.get("income_kind"), "")
            amt = fmt_orig(inc.get("gross_amount"), inc.get("currency"))
            m = income_monthly_ils(inc)
            period = " – ".join(filter(None, [
                fmt_date(inc["start_date"]) if inc.get("start_date") else None,
                fmt_date(inc["contract_end_date"]) if inc.get("contract_end_date") else None]))
            state = "פעיל" if inc.get("is_active") else "לא פעיל"
            note = esc(inc.get("notes") or "")
            if contact:
                note = (note + "<br>" if note else "") + f'<span class="dim">{contact}</span>'
            rows.append([
                esc(who or kind or "—"),
                amt + f'<br><span class="dim">{esc(FREQ_LABELS.get(inc.get("payment_frequency"), ""))}'
                      f' · {esc(VAT_LABELS.get(inc.get("vat_type"), ""))}</span>',
                fmt_ils(m),
                esc(period or "—"),
                f'<span class="{"ok" if inc.get("is_active") else "off"}">{state}</span>',
                note,
            ])
        parts.append(section("הכנסות ושוכרים", render_table(
            ["שוכר / מקור", "סכום", 'חודשי בש"ח', "תקופה", "סטטוס", "הערות"], rows)))

    # השקעות
    if a["_investments"]:
        rows = [[esc(v.get("manager_name") or ""),
                 fmt_orig(v.get("amount"), v.get("currency")),
                 fmt_ils(to_ils(v.get("amount"), v.get("currency"))),
                 fmt_date(v.get("balance_date")), esc(v.get("notes") or "")]
                for v in a["_investments"]]
        rows.append(["<b>סה\"כ</b>", "", f'<b>{fmt_ils(a["_total_investments_ils"])}</b>', "", ""])
        parts.append(section("השקעות",
                             render_table(["מנהל", "סכום", 'בש"ח', "נכון לתאריך", "הערות"], rows)))

    # אנשי קשר
    if a["_contacts"]:
        rows = [[esc(c.get("name") or ""), esc(c.get("role") or ""),
                 ltr(c.get("phone")), ltr(c.get("email")),
                 esc(c.get("notes") or "")] for c in a["_contacts"]]
        parts.append(section("אנשי קשר",
                             render_table(["שם", "תפקיד", "טלפון", 'דוא"ל', "הערות"], rows)))

    # מסמכים
    if a["_files"]:
        rows = [[esc(f.get("caption") or "—"),
                 esc((f.get("storage_path") or "").rsplit(".", 1)[-1].upper()
                     if f.get("storage_path") else "קישור חיצוני")]
                for f in a["_files"]]
        parts.append(section("מסמכים", render_table(["תיאור", "סוג"], rows)))

    # אירועים
    if a["_events"]:
        rows = [[fmt_date(e.get("event_date")), esc(e.get("description") or "")]
                for e in a["_events"]]
        parts.append(section("אירועים", render_table(["תאריך", "תיאור"], rows)))

    # תיאור מלא — pre-wrap, כמו GeneralSection
    if a.get("description"):
        parts.append(f'<div class="sec"><h3>תיאור</h3>'
                     f'<div class="desc">{esc(a["description"])}</div></div>')

    parts.append("</div>")
    return "".join(parts)


def render_summary(assets):
    rows = []
    grand_m = grand_v = 0.0
    for ent in ENTITIES:
        mine = [a for a in assets if entity_matches(ent["key"], a["_partners"])
                and a.get("status") == "active"]
        m = sum(entities_monthly_ils(a["_income"], a["_partners"], ent["income_entities"])
                for a in mine)
        v = sum(asset_value_ils(a, a["_partners"], ent["income_entities"]) for a in mine)
        grand_m += m
        grand_v += v
        rows.append([
            f'<span class="dot" style="background:{ent["color"]}"></span> {esc(ent["label"])}',
            str(len(mine)), fmt_ils(m), fmt_ils(v)])
    rows.append(["<b>סך הכל</b>", "", f"<b>{fmt_ils(grand_m)}</b>", f"<b>{fmt_ils(grand_v)}</b>"])
    return render_table(["ישות", "נכסים", "הכנסה חודשית", "שווי חלק"], rows, cls="data summary")


def render_index(assets):
    active = [a for a in assets if a.get("status") == "active"]
    rows = []
    for a in sorted(active, key=lambda x: (x.get("address_city") or "\uffff", x.get("name") or "")):
        owners = " · ".join(
            f'{ENTITY_LABELS.get(p["entity"], p["entity"])} {fmt_pct(p["percentage"])}'
            for p in a["_partners"] if p.get("entity") != "external")
        m = sum(income_monthly_ils(i) for i in a["_income"] if i.get("is_active"))
        ev = a.get("estimated_value")
        if ev:
            v = fmt_ils(to_ils(ev, a.get("estimated_value_currency")))
        elif a["_total_investments_ils"]:
            v = fmt_ils(a["_total_investments_ils"])
        elif a["_total_purchases_ils"]:
            v = fmt_ils(a["_total_purchases_ils"])
        else:
            v = "—"
        city = a.get("address_city") or ""
        rows.append([esc(a.get("name")), esc(TYPE_LABELS.get(a.get("asset_type"), "")),
                     ltr(city) if _is_latin(city) else esc(city),
                     esc(owners), v, fmt_ils(m)])
    return render_table(["נכס", "סוג", "עיר", "בעלות", "שווי מלא", "הכנסה חודשית"], rows)


def render_savings(savings):
    """גיליון החיסכון והביטוחים. כל רשומה = שורת טבלה + שורת הערות ברוחב מלא."""
    if not savings:
        return ""
    sections = savings.get("sections") if isinstance(savings, dict) else None
    if not sections:
        return ""

    out = ['<div class="page-break"></div>',
           '<h1 class="chap">חיסכון, פנסיה וביטוחים</h1>',
           '<div class="note">מקור: גיליון BARONS Savings, מתוחזק בנפרד ממסד הנתונים '
           'של מודול הנכסים. הסכומים כאן אינם מתחברים לסיכום הנכסים — ראה הערת '
           'ההצלבה בסוף הפרק.</div>']

    for sec in sections:
        cols = sec.get("columns", [])
        n = len(cols)
        head = "".join(f"<th>{esc(c)}</th>" for c in cols)
        body = []
        for r in sec.get("rows", []):
            cells = "".join(f"<td>{esc(c)}</td>" for c in r.get("cells", []))
            body.append(f"<tr>{cells}</tr>")
            if r.get("notes"):
                body.append(f'<tr class="noterow"><td colspan="{n}">'
                            f'{esc(r["notes"])}</td></tr>')
        if sec.get("total"):
            tcells = "".join(f"<td><b>{esc(v)}</b></td>" for _, v in sec["total"])
            body.append(f'<tr class="totalrow">{tcells}</tr>')
        out.append(f'<div class="sec savings"><h3>{esc(sec.get("title"))}</h3>'
                   f'<table class="data"><thead><tr>{head}</tr></thead>'
                   f'<tbody>{"".join(body)}</tbody></table></div>')

    out.append(
        '<div class="sec"><h3>הצלבה מול מודול הנכסים</h3><div class="note">'
        'שני המקורות מודדים דברים שונים ואין לחבר ביניהם. גיליון החיסכון מציג את '
        'החלק האישי בלבד ומשתמש בשערי המרה משלו (דולר 3.00 · אירו 3.42), בעוד מודול '
        'הנכסים מציג שווי מלא לצד החלק היחסי ומשתמש ב-3.72 · 4.05. פערים ידועים: '
        'דוהני 66 מוערך בגיליון ב-275,000 ₪ ואין לו הערכת שווי במסד הנתונים; '
        'OKY מוצג בגיליון כ-240,000 ₪ (14.56% מ-550,000$) בעוד המסד מחזיק שווי חברה '
        'נטו של 645,000$ הכולל גם את 93rd ובניכוי המשכנתא.'
        '</div></div>')
    return "".join(out)


CSS = """
@page { size: A4; margin: 16mm 14mm 18mm;
  @bottom-center { content: counter(page); font-family: AssistantLa, DejaVu Sans;
                   font-size: 8pt; color: #94a3b8; } }
@page :first { margin: 0; @bottom-center { content: none; } }
* { box-sizing: border-box; }
body { font-family: AssistantHe, AssistantLa, "DejaVu Sans", sans-serif; direction: rtl;
       font-size: 9.2pt; line-height: 1.5; color: #1e293b; margin: 0; }
.cover { height: 297mm; padding: 40mm 24mm; background: #0f172a; color: #fff;
         page-break-after: always; }
.cover h1 { font-size: 40pt; font-weight: 800; margin: 0 0 6mm; letter-spacing: -1px; }
.cover .sub { font-size: 13pt; color: #93c5fd; margin-bottom: 30mm; }
.cover .meta { font-size: 9.5pt; color: #94a3b8; line-height: 2; }
.cover .rule { width: 40mm; height: 3px; background: #1d4ed8; margin: 0 0 8mm; }
h1.chap { font-size: 19pt; font-weight: 800; color: #0f172a; margin: 0 0 6mm;
          padding-bottom: 3mm; border-bottom: 2px solid #1d4ed8; }
.asset { page-break-before: always; page-break-inside: auto; }
.asset.child { page-break-before: always; }
.ahead { border-bottom: 1.5px solid #1d4ed8; padding-bottom: 2.5mm; margin-bottom: 4mm; }
.ahead h2 { font-size: 15pt; font-weight: 800; margin: 0 0 1.5mm; color: #0f172a; }
.tags { display: block; }
.tag { display: inline-block; font-size: 7.5pt; font-weight: 700; padding: 1px 7px;
       border-radius: 20px; background: #e2e8f0; color: #475569; margin-left: 4px; }
.tag.st-active { background: #dcfce7; color: #15803d; }
.tag.st-sold { background: #fee2e2; color: #b91c1c; }
.tag.st-archived { background: #f1f5f9; color: #64748b; }
.sec { margin: 4mm 0; page-break-inside: avoid; }
.sec h3 { font-size: 9.5pt; font-weight: 700; color: #1d4ed8; margin: 0 0 1.5mm;
          text-transform: none; }
table { width: 100%; border-collapse: collapse; font-size: 8.4pt; }
table.kv th { width: 32mm; text-align: right; font-weight: 600; color: #64748b;
              padding: 1.4mm 0; vertical-align: top; }
table.kv td { padding: 1.4mm 0; }
table.data { border: 1px solid #e2e8f0; }
table.data th { background: #f1f5f9; font-weight: 700; text-align: right;
                padding: 1.8mm 2mm; border-bottom: 1px solid #cbd5e1; color: #334155; }
table.data td { padding: 1.8mm 2mm; border-bottom: 1px solid #eef2f6;
                vertical-align: top; }
table.data tr:last-child td { border-bottom: none; }
table.summary { font-size: 9.5pt; }
.desc { white-space: pre-wrap; font-size: 8.6pt; line-height: 1.62; color: #334155;
        background: #f8fafc; border-right: 3px solid #1d4ed8; padding: 3mm 4mm;
        page-break-inside: auto; }
tr.noterow td { font-size: 7.6pt; color: #64748b; background: #f8fafc;\n                padding: 1mm 2mm 2mm; line-height: 1.45; }\ntr.totalrow td { background: #f1f5f9; border-top: 1.5px solid #cbd5e1; }\n.sec.savings { page-break-inside: auto; }\n.sec.savings table.data { font-size: 7.9pt; }\n.ltr { direction: ltr; unicode-bidi: isolate; display: inline-block; }
.dim { color: #94a3b8; font-size: 7.6pt; }
.ok { color: #15803d; font-weight: 700; }
.off { color: #94a3b8; }
.warn { color: #b91c1c; font-weight: 700; }
.dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; }
.page-break { page-break-before: always; }
.note { font-size: 8pt; color: #64748b; margin-top: 3mm; }
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--assets", required=True)
    ap.add_argument("--savings")
    ap.add_argument("-o", "--out", default="barons_assets.pdf")
    ap.add_argument("--include-archived", action="store_true")
    args = ap.parse_args()

    raw = json.load(open(args.assets, encoding="utf-8"))
    if isinstance(raw, list):
        raw = raw[0]
    if "export_json" in raw:
        raw = raw["export_json"]
        if isinstance(raw, str):
            raw = json.loads(raw)

    assets = build(raw)
    if not args.include_archived:
        assets = [a for a in assets if a.get("status") != "archived"]

    savings = None
    if args.savings:
        savings = json.load(open(args.savings, encoding="utf-8"))

    gen = raw.get("generated_at") or datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    n_active = len([a for a in assets if a.get("status") == "active"])

    by_id = {a["id"]: a for a in assets}
    roots = [a for a in assets if not a.get("parent_asset_id")
             or a.get("parent_asset_id") not in by_id]
    children = _group([a for a in assets if a.get("parent_asset_id") in by_id],
                      "parent_asset_id")

    body = []
    claimed = set()
    for ent in ENTITIES:
        mine = [a for a in roots if entity_matches(ent["key"], a["_partners"])]
        claimed.update(a["id"] for a in mine)
        if not mine:
            continue
        body.append(f'<div class="page-break"></div>'
                    f'<h1 class="chap">{esc(ent["label"])}</h1>')
        for a in sorted(mine, key=lambda x: (x.get("address_city") or "\uffff",
                                             x.get("name") or "")):
            body.append(render_asset(a))
            for c in sorted(children.get(a["id"], []), key=lambda x: x.get("name") or ""):
                body.append(render_asset(c, depth=1))

    # נכסים שאף ישות לא תפסה — בלי זה הם נעלמים מהחוברת בשקט
    orphans = [a for a in roots if a["id"] not in claimed]
    if orphans:
        body.append('<div class="page-break"></div>'
                    '<h1 class="chap">ללא שיוך בעלות</h1>'
                    '<div class="note">לנכסים האלה אין רשומות ב-asset_partners, '
                    'ולכן הם אינם נספרים באף סיכום ישות. לטפל או להעביר לארכיון.</div>')
        for a in orphans:
            body.append(render_asset(a))

    doc = f"""<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<style>{CSS}</style></head><body>
<div class="cover">
  <div class="rule"></div>
  <h1>נכסים</h1>
  <div class="sub">BARONS · חוברת נכסים והון</div>
  <div class="meta">
    נכון לתאריך {esc(gen)}<br>
    {n_active} נכסים פעילים<br>
    שערי המרה: דולר {FX['USD']} · אירו {FX['EUR']} · פורינט {FX['HUF']}<br><br>
    מסמך פנימי — לשימוש אישי בלבד
  </div>
</div>

<h1 class="chap">סיכום לפי ישות</h1>
{render_summary(assets)}
<div class="note">ההכנסה והשווי מחושבים לפי החלק היחסי של כל ישות, על נכסים פעילים בלבד.
שווי המוצג כ"אומדן מרכישות" מבוסס על סך הרכישות מחולק באחוז הפנימי, כשאין הערכת שווי מפורשת.</div>

<div class="sec" style="margin-top:8mm"><h3>כל הנכסים הפעילים</h3>
{render_index(assets)}</div>

{''.join(body)}
{render_savings(savings)}
</body></html>"""

    from weasyprint import HTML
    HTML(string=doc, base_url=os.getcwd()).write_pdf(args.out)
    print(f"נוצר: {args.out}  ({len(assets)} נכסים, {n_active} פעילים)")


if __name__ == "__main__":
    main()
