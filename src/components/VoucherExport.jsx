// src/components/VoucherExport.jsx
// ============================================================
// ייצוא שוברים — אקסל (טאב לכל קטגוריה) או תצוגת הדפסה (שמור כ-PDF)
// הרכיב מרונדר בתוך העץ של .ev ולכן יורש ממנו את משתני העיצוב והמחלקות.
// ============================================================
import { useState } from 'react'
import * as XLSX from 'xlsx'

/* ---------- helpers מקומיים (הרכיב עצמאי בכוונה) ---------- */
const ils = n => '₪' + Number(n || 0).toLocaleString('he-IL')
const hasAmount = v => Number(v.amount) > 0
const balanceOf = v => hasAmount(v) ? Number(v.amount) - Number(v.used || 0) : 0

const fmtDate = d => d
  ? new Date(d + 'T12:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : ''

function daysLeft(d) {
  if (!d) return null
  const t = new Date(); t.setHours(12, 0, 0, 0)
  return Math.round((new Date(d + 'T12:00:00') - t) / 864e5)
}

const STATUS_LABEL = { active: 'פעיל', shared: 'הועבר', redeemed: 'מומש' }

const STATUS_OPTIONS = [
  { key: 'active',   label: 'שוברים פעילים' },
  { key: 'shared',   label: 'שוברים שהועברו' },
  { key: 'redeemed', label: 'שוברים שמומשו' },
]

const stamp = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** אקסל אוסר על התווים האלה בשם גיליון, ומגביל ל-31 תווים */
const sheetName = name => (name || 'ללא שם').replace(/[[\]:*?/\\]/g, '-').slice(0, 31)

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/* ---------- בניית שורות ---------- */
function headers(withCodes) {
  return [
    'סטטוס', 'מקום', 'מה כולל השובר', 'סכום', 'מומש', 'יתרה',
    'בכמה נקנה', 'ממי נקנה', 'תאריך קנייה', 'בתוקף עד', 'ימים לתפוגה',
    ...(withCodes ? ['מספר שובר', 'CVV'] : []),
    'הערות', 'הועבר ל', 'תאריך העברה', 'תאריך מימוש',
  ]
}

function rowOf(v, withCodes) {
  const dl = daysLeft(v.expires_on)
  return [
    STATUS_LABEL[v.status] || v.status,
    v.place || '',
    v.item || '',
    hasAmount(v) ? Number(v.amount) : 'שובר הטבה',
    hasAmount(v) ? Number(v.used || 0) : '',
    hasAmount(v) ? balanceOf(v) : '',
    v.paid != null ? Number(v.paid) : '',
    v.seller || '',
    fmtDate(v.bought_on),
    v.expires_on ? fmtDate(v.expires_on) : 'ללא תוקף',
    dl === null ? '' : dl,
    ...(withCodes ? [v.code || '', v.cvv || ''] : []),
    v.note || '',
    v.shared_to || '',
    fmtDate(v.shared_at),
    fmtDate(v.redeemed_at),
  ]
}

/* ============================================================ */
export default function VoucherExport({ rows, cats, reds, onClose, say }) {
  const [format, setFormat] = useState('excel')
  const [statuses, setStatuses] = useState({ active: true, shared: false, redeemed: false })
  const [withCodes, setWithCodes] = useState(true)
  const [busy, setBusy] = useState(false)

  const picked = Object.keys(statuses).filter(k => statuses[k])
  const selected = rows.filter(v => statuses[v.status])
  const catsWithData = cats.filter(c => selected.some(v => v.category_id === c.id))
  const orphans = selected.filter(v => !cats.some(c => c.id === v.category_id))

  const toggle = k => setStatuses(s => ({ ...s, [k]: !s[k] }))

  /* ---------- אקסל ---------- */
  function exportExcel() {
    const wb = XLSX.utils.book_new()
    const rtl = ws => { ws['!views'] = [{ RTL: true }]; return ws }

    // גיליון סיכום
    const summary = [
      ['שוברים עינב — סיכום'],
      ['נוצר בתאריך', new Date().toLocaleString('he-IL')],
      ['כולל', picked.map(k => STATUS_OPTIONS.find(o => o.key === k).label).join(', ')],
      [],
      ['קטגוריה', 'מספר שוברים', 'סכום כולל', 'מומש', 'יתרה', 'שוברי הטבה'],
    ]
    catsWithData.forEach(c => {
      const g = selected.filter(v => v.category_id === c.id)
      summary.push([
        c.name,
        g.length,
        g.reduce((s, v) => s + (hasAmount(v) ? Number(v.amount) : 0), 0),
        g.reduce((s, v) => s + Number(v.used || 0), 0),
        g.reduce((s, v) => s + balanceOf(v), 0),
        g.filter(v => !hasAmount(v)).length,
      ])
    })
    summary.push([])
    summary.push([
      'סה״כ',
      selected.length,
      selected.reduce((s, v) => s + (hasAmount(v) ? Number(v.amount) : 0), 0),
      selected.reduce((s, v) => s + Number(v.used || 0), 0),
      selected.reduce((s, v) => s + balanceOf(v), 0),
      selected.filter(v => !hasAmount(v)).length,
    ])
    const wsSum = XLSX.utils.aoa_to_sheet(summary)
    wsSum['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, rtl(wsSum), 'סיכום')

    // גיליון לכל קטגוריה
    const widths = [
      { wch: 9 }, { wch: 20 }, { wch: 34 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 11 }, { wch: 20 }, { wch: 13 }, { wch: 13 }, { wch: 13 },
      ...(withCodes ? [{ wch: 24 }, { wch: 8 }] : []),
      { wch: 30 }, { wch: 16 }, { wch: 13 }, { wch: 13 },
    ]
    const addSheet = (name, list) => {
      const aoa = [headers(withCodes), ...list.map(v => rowOf(v, withCodes))]
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!cols'] = widths
      ws['!freeze'] = { xSplit: 0, ySplit: 1 }
      XLSX.utils.book_append_sheet(wb, rtl(ws), sheetName(name))
    }
    catsWithData.forEach(c => addSheet(c.name, selected.filter(v => v.category_id === c.id)))
    if (orphans.length) addSheet('ללא קטגוריה', orphans)

    // יומן מימושים חלקיים
    const ids = new Set(selected.map(v => v.id))
    const log = (reds || []).filter(r => ids.has(r.voucher_id))
    if (log.length) {
      const byId = Object.fromEntries(rows.map(v => [v.id, v]))
      const catName = id => cats.find(c => c.id === id)?.name || ''
      const aoa = [['תאריך', 'קטגוריה', 'מקום', 'סכום שמומש']]
      log.forEach(r => {
        const v = byId[r.voucher_id] || {}
        aoa.push([fmtDate(r.redeemed_on), catName(v.category_id), v.place || v.item || '', Number(r.amount)])
      })
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!cols'] = [{ wch: 13 }, { wch: 20 }, { wch: 28 }, { wch: 13 }]
      XLSX.utils.book_append_sheet(wb, rtl(ws), 'יומן מימושים')
    }

    XLSX.writeFile(wb, `קופונינב-${stamp()}.xlsx`)
  }

  /* ---------- תצוגת הדפסה ---------- */
  function openPrint() {
    const win = window.open('', '_blank')
    if (!win) {
      say('הדפדפן חסם את חלון ההדפסה. אפשר לאשר חלונות קופצים ולנסות שוב.', true)
      return
    }

    const th = headers(withCodes)
    const section = c => {
      const g = selected.filter(v => v.category_id === c.id)
      if (!g.length) return ''
      const bal = g.reduce((s, v) => s + balanceOf(v), 0)
      return `
      <section>
        <h2>${esc(c.name)}
          <span class="meta">${g.length} שוברים · יתרה ${esc(ils(bal))}</span>
        </h2>
        <table>
          <thead><tr>${th.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${g.map(v => `<tr>${rowOf(v, withCodes)
            .map((cell, i) => `<td${i === 0 ? ` class="st st-${v.status}"` : ''}>${esc(cell)}</td>`)
            .join('')}</tr>`).join('')}</tbody>
        </table>
      </section>`
    }

    const totalBal = selected.reduce((s, v) => s + balanceOf(v), 0)
    const html = `<!DOCTYPE html>
<html lang="he" dir="rtl"><head><meta charset="utf-8">
<title>קופונינב — ${stamp()}</title>
<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Assistant',system-ui,sans-serif;color:#15161A;background:#fff;font-size:12px;line-height:1.5;padding:24px}
  header{border-bottom:2px solid #15161A;padding-bottom:14px;margin-bottom:22px}
  h1{font-size:26px;font-weight:800;letter-spacing:-.02em}
  header p{color:#44484F;font-size:13px;margin-top:5px}
  header .tot{font-size:15px;font-weight:700;margin-top:8px}
  section{margin-bottom:26px;page-break-inside:avoid}
  h2{font-size:16px;font-weight:800;padding-bottom:7px;border-bottom:1.5px solid #15161A;margin-bottom:9px;
     display:flex;align-items:baseline;gap:10px}
  h2 .meta{font-size:12px;font-weight:600;color:#44484F}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#EFEEEA;text-align:right;padding:6px 7px;border:1px solid #C9C7C1;font-weight:700;white-space:nowrap}
  td{padding:6px 7px;border:1px solid #D9D7D2;vertical-align:top}
  tr:nth-child(even) td{background:#FAFAF9}
  .st{font-weight:700;white-space:nowrap}
  .st-active{color:#186B43}
  .st-shared{color:#A8325A}
  .st-redeemed{color:#666B73}
  footer{margin-top:30px;padding-top:12px;border-top:1px solid #C9C7C1;color:#666B73;font-size:11px;text-align:center}
  @page{size:A4 landscape;margin:11mm}
  @media print{body{padding:0}.noprint{display:none}}
  .noprint{position:fixed;top:16px;left:16px;display:flex;gap:8px}
  .noprint button{font:inherit;font-weight:700;font-size:13px;padding:10px 18px;border-radius:10px;
    border:1px solid #15161A;background:#15161A;color:#fff;cursor:pointer}
  .noprint button.g{background:#fff;color:#15161A}
</style></head>
<body>
  <div class="noprint">
    <button onclick="window.print()">הדפסה / שמירה כ-PDF</button>
    <button class="g" onclick="window.close()">סגירה</button>
  </div>
  <header>
    <h1>קופונינב</h1>
    <p>נוצר ב-${esc(new Date().toLocaleString('he-IL'))} · ${esc(picked.map(k => STATUS_OPTIONS.find(o => o.key === k).label).join(' · '))}</p>
    <p class="tot">${selected.length} שוברים · יתרה כוללת ${esc(ils(totalBal))}</p>
  </header>
  ${catsWithData.map(section).join('')}
  ${orphans.length ? section({ id: null, name: 'ללא קטגוריה' }) : ''}
  <footer>BARONS · קופונינב</footer>
</body></html>`

    win.document.write(html)
    win.document.close()
    win.focus()
  }

  /* ---------- הרצה ---------- */
  async function run() {
    if (!picked.length) { say('צריך לבחור לפחות סוג אחד של שוברים', true); return }
    if (!selected.length) { say('אין שוברים שמתאימים לבחירה', true); return }
    setBusy(true)
    try {
      if (format === 'excel') {
        exportExcel()
        say(`יוצאו ${selected.length} שוברים לאקסל`)
        onClose()
      } else {
        openPrint()
      }
    } catch (e) {
      say('הייצוא נכשל: ' + e.message, true)
    }
    setBusy(false)
  }

  return (
    <div className="ev-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ev-modal sm" role="dialog" aria-modal="true" aria-label="ייצוא שוברים">
        <div className="ev-mh">
          <div>
            <h3>ייצוא שוברים</h3>
            <p>גיבוי מלא של הנתונים, לשמירה או להדפסה</p>
          </div>
          <button className="ev-ico" onClick={onClose} aria-label="סגירה">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="ev-mb">
          <div className="ev-seg">
            <button aria-pressed={format === 'excel'} onClick={() => setFormat('excel')}>קובץ אקסל</button>
            <button aria-pressed={format === 'print'} onClick={() => setFormat('print')}>הדפסה / PDF</button>
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>מה לייצא</div>
          <div style={{ display: 'grid', gap: 4, marginBottom: 18 }}>
            {STATUS_OPTIONS.map(o => {
              const n = rows.filter(v => v.status === o.key).length
              return (
                <label key={o.key} className="ev-check">
                  <input type="checkbox" checked={statuses[o.key]} onChange={() => toggle(o.key)} />
                  {o.label}
                  <span style={{ color: 'var(--ink3)', fontWeight: 600, marginInlineStart: 4 }}>({n})</span>
                </label>
              )
            })}
          </div>

          <label className="ev-check" style={{ borderTop: '1px solid var(--hairS)', paddingTop: 12 }}>
            <input type="checkbox" checked={withCodes} onChange={e => setWithCodes(e.target.checked)} />
            כלול מספרי שוברים ו-CVV
          </label>
          <p style={{ fontSize: 13.5, color: 'var(--ink2)', marginTop: 4 }}>
            {withCodes
              ? 'הקובץ יכיל את כל הקודים — מתאים לגיבוי, פחות לשיתוף.'
              : 'הקודים לא ייכללו — מתאים לשליחה למישהו אחר.'}
          </p>

          <div className="ev-after" style={{ marginTop: 18 }}>
            {!picked.length
              ? 'צריך לבחור לפחות סוג אחד של שוברים.'
              : !selected.length
                ? 'אין שוברים שמתאימים לבחירה הזאת.'
                : format === 'excel'
                  ? <><b>{selected.length}</b> שוברים, גיליון לכל קטגוריה ({catsWithData.length}), בתוספת גיליון סיכום ויומן מימושים.</>
                  : <><b>{selected.length}</b> שוברים בתצוגה להדפסה. בחלון שייפתח בוחרים <b>שמור כ-PDF</b> ביעד ההדפסה.</>}
          </div>
        </div>

        <div className="ev-mf">
          <button className="ev-btn ghost" onClick={onClose}>ביטול</button>
          <button className="ev-btn dark" onClick={run} disabled={busy || !selected.length}>
            {busy ? 'רגע…' : format === 'excel' ? 'הורדת האקסל' : 'פתיחת תצוגת הדפסה'}
          </button>
        </div>
      </div>
    </div>
  )
}
