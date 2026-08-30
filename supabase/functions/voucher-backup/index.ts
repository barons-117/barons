// supabase/functions/voucher-backup/index.ts
// ============================================================
// גיבוי שבועי — בונה קובץ אקסל מכל השוברים ושולח במייל דרך Resend.
// מופעל מ-pg_cron. רץ עם service role key, אז RLS לא חל עליו.
//
// פריסה:  npx supabase functions deploy voucher-backup --no-verify-jwt
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const TO = ['einavsw88@gmail.com', 'erez@barons.co.il']
const FROM = 'BARONS <barons@agnon.net>'

const ils = (n: number) => '₪' + Number(n || 0).toLocaleString('he-IL')
const hasAmount = (v: any) => Number(v.amount) > 0
const balanceOf = (v: any) => hasAmount(v) ? Number(v.amount) - Number(v.used || 0) : 0

function fmtDate(d: string | null) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function daysLeft(d: string | null) {
  if (!d) return null
  const today = new Date(); today.setHours(12, 0, 0, 0)
  return Math.round((new Date(d + 'T12:00:00').getTime() - today.getTime()) / 864e5)
}

const STATUS: Record<string, string> = { active: 'פעיל', shared: 'הועבר', redeemed: 'מומש' }
const sheetName = (n: string) => (n || 'ללא שם').replace(/[[\]:*?/\\]/g, '-').slice(0, 31)

const HEADERS = [
  'סטטוס', 'מקום', 'מה כולל השובר', 'סכום', 'מומש', 'יתרה',
  'בכמה נקנה', 'ממי נקנה', 'תאריך קנייה', 'בתוקף עד', 'ימים לתפוגה',
  'מספר שובר', 'CVV', 'הערות', 'הועבר ל', 'תאריך העברה', 'תאריך מימוש',
]

const rowOf = (v: any) => [
  STATUS[v.status] || v.status,
  v.place || '',
  v.item || '',
  hasAmount(v) ? Number(v.amount) : 'שובר הטבה',
  hasAmount(v) ? Number(v.used || 0) : '',
  hasAmount(v) ? balanceOf(v) : '',
  v.paid != null ? Number(v.paid) : '',
  v.seller || '',
  fmtDate(v.bought_on),
  v.expires_on ? fmtDate(v.expires_on) : 'ללא תוקף',
  daysLeft(v.expires_on) ?? '',
  v.code || '',
  v.cvv || '',
  v.note || '',
  v.shared_to || '',
  fmtDate(v.shared_at),
  fmtDate(v.redeemed_at),
]

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const [{ data: cats }, { data: rows }, { data: reds }] = await Promise.all([
      supabase.from('voucher_categories').select('*').order('sort_order'),
      supabase.from('einav_vouchers').select('*').order('created_at', { ascending: false }),
      supabase.from('voucher_redemptions').select('*').order('redeemed_on'),
    ])

    const all = rows || []
    const categories = cats || []
    const active = all.filter((v: any) => v.status === 'active')
    const balance = active.reduce((s: number, v: any) => s + balanceOf(v), 0)
    const expiring = active.filter((v: any) => {
      const n = daysLeft(v.expires_on)
      return n !== null && n <= 30
    })

    // ---------- בניית האקסל ----------
    const wb = XLSX.utils.book_new()
    const rtl = (ws: any) => { ws['!views'] = [{ RTL: true }]; return ws }
    const widths = [
      { wch: 9 }, { wch: 20 }, { wch: 34 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 11 }, { wch: 20 }, { wch: 13 }, { wch: 13 }, { wch: 13 },
      { wch: 24 }, { wch: 8 }, { wch: 30 }, { wch: 16 }, { wch: 13 }, { wch: 13 },
    ]

    const summary: any[][] = [
      ['קופונינב — גיבוי'],
      ['נוצר בתאריך', new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })],
      [],
      ['קטגוריה', 'מספר שוברים', 'סכום כולל', 'מומש', 'יתרה', 'שוברי הטבה'],
    ]
    for (const c of categories) {
      const g = all.filter((v: any) => v.category_id === c.id)
      if (!g.length) continue
      summary.push([
        c.name, g.length,
        g.reduce((s: number, v: any) => s + (hasAmount(v) ? Number(v.amount) : 0), 0),
        g.reduce((s: number, v: any) => s + Number(v.used || 0), 0),
        g.reduce((s: number, v: any) => s + balanceOf(v), 0),
        g.filter((v: any) => !hasAmount(v)).length,
      ])
    }
    summary.push([])
    summary.push(['סה״כ שוברים', all.length])
    summary.push(['מתוכם פעילים', active.length])
    summary.push(['יתרה פעילה', balance])

    const wsSum = XLSX.utils.aoa_to_sheet(summary)
    wsSum['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, rtl(wsSum), 'סיכום')

    for (const c of categories) {
      const g = all.filter((v: any) => v.category_id === c.id)
      if (!g.length) continue
      const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...g.map(rowOf)])
      ws['!cols'] = widths
      XLSX.utils.book_append_sheet(wb, rtl(ws), sheetName(c.name))
    }

    const orphans = all.filter((v: any) => !categories.some((c: any) => c.id === v.category_id))
    if (orphans.length) {
      const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...orphans.map(rowOf)])
      ws['!cols'] = widths
      XLSX.utils.book_append_sheet(wb, rtl(ws), 'ללא קטגוריה')
    }

    if (reds && reds.length) {
      const byId: Record<string, any> = Object.fromEntries(all.map((v: any) => [v.id, v]))
      const catName = (id: string) => categories.find((c: any) => c.id === id)?.name || ''
      const aoa: any[][] = [['תאריך', 'קטגוריה', 'מקום', 'סכום שמומש']]
      for (const r of reds) {
        const v = byId[r.voucher_id] || {}
        aoa.push([fmtDate(r.redeemed_on), catName(v.category_id), v.place || v.item || '', Number(r.amount)])
      }
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!cols'] = [{ wch: 13 }, { wch: 20 }, { wch: 28 }, { wch: 13 }]
      XLSX.utils.book_append_sheet(wb, rtl(ws), 'יומן מימושים')
    }

    const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' })

    // ---------- המייל ----------
    const d = new Date()
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const expiringHtml = expiring.length
      ? `<div style="background:#FBF1DF;border:1px solid #D9B978;border-radius:10px;padding:14px 16px;margin:20px 0">
           <strong style="color:#8A5A0E">${expiring.length} שוברים פגים בחודש הקרוב</strong>
           <ul style="margin:8px 18px 0;padding:0;color:#44484F">
             ${expiring.slice(0, 8).map((v: any) =>
               `<li>${v.place || v.item || ''} — ${hasAmount(v) ? ils(balanceOf(v)) : 'שובר הטבה'}, עד ${fmtDate(v.expires_on)}</li>`
             ).join('')}
           </ul>
         </div>`
      : ''

    const html = `
<div style="font-family:'Assistant',Arial,sans-serif;direction:rtl;text-align:right;color:#15161A;max-width:600px;margin:0 auto;padding:24px;line-height:1.6">
  <h1 style="font-size:26px;margin:0 0 6px">קופונינב — הגיבוי השבועי</h1>
  <p style="color:#44484F;margin:0 0 20px">מצורף קובץ אקסל עם כל השוברים, כולל מספרי השוברים והקודים. זהו העותק המעודכן ביותר — שווה לשמור אותו.</p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr>
      <td style="padding:12px;border:1px solid #E0DED9;border-radius:8px">
        <div style="font-size:13px;color:#666B73">יתרה פעילה</div>
        <div style="font-size:22px;font-weight:800">${ils(balance)}</div>
      </td>
      <td style="padding:12px;border:1px solid #E0DED9">
        <div style="font-size:13px;color:#666B73">שוברים פעילים</div>
        <div style="font-size:22px;font-weight:800">${active.length}</div>
      </td>
      <td style="padding:12px;border:1px solid #E0DED9">
        <div style="font-size:13px;color:#666B73">סה״כ בגיבוי</div>
        <div style="font-size:22px;font-weight:800">${all.length}</div>
      </td>
    </tr>
  </table>

  ${expiringHtml}

  <p style="margin:24px 0 0">
    <a href="https://barons.co.il/#/einav"
       style="display:inline-block;background:#15161A;color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-weight:700">
      פתיחת רשימת השוברים
    </a>
  </p>

  <p style="color:#666B73;font-size:13px;margin-top:28px;border-top:1px solid #E0DED9;padding-top:14px">
    BARONS · קופונינב · נשלח אוטומטית פעם בשבוע
  </p>
</div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: TO,
        subject: `קופונינב — הגיבוי השבועי (${stamp})`,
        html,
        attachments: [{ filename: `קופונינב-${stamp}.xlsx`, content: base64 }],
      }),
    })

    const out = await res.json()
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, resend: out }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, vouchers: all.length, id: out.id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
