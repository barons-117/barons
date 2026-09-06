// ═══════════════════════════════════════════════════════════════════════════
// BARONS · expiry-daily-digest
// Sends one consolidated email per recipient with every item that hits a
// reminder step today (or that was missed). Idempotent via expiry_reminder_log.
//
// Deploy:  supabase functions deploy expiry-daily-digest --no-verify-jwt
// Secrets: RESEND_API_KEY (exists), DIGEST_SECRET (new, any random string)
//
// Modes (query string):
//   ?dry_run=1   compute and return JSON, send nothing, log nothing
//   ?test=1      send a real email with ALL active items (ignores offsets), log nothing
//   (none)       production: send what is due, write log rows
// ═══════════════════════════════════════════════════════════════════════════
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
const DIGEST_SECRET = Deno.env.get('DIGEST_SECRET') || ''
const FROM = 'BARONS תוקף <barons@agnon.net>'
const ADMIN = 'erez@barons.co.il'
const SITE = 'https://barons.co.il'

const OWNER_LABEL: Record<string, string> = { erez: 'ארז', roy: 'רועי', daphna: 'דפנה', danielle: 'דניאל', family: 'משפחה', other: 'אחר' }

// ─── helpers ────────────────────────────────────────────────────────────────
function todayJerusalem(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
function daysLeft(iso: string, today: string): number {
  return Math.round((new Date(iso + 'T12:00:00Z').getTime() - new Date(today + 'T12:00:00Z').getTime()) / 86400000)
}
function fmtDate(iso: string): string {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}
function relative(d: number): string {
  if (d === 0) return 'פג היום'
  if (d === 1) return 'פג מחר'
  if (d > 0) return d < 60 ? `בעוד ${d} ימים` : `בעוד ${Math.round(d / 30)} חודשים`
  const a = -d
  return a < 60 ? `פג לפני ${a} ימים` : `פג לפני ${Math.round(a / 30)} חודשים`
}
function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
type Band = { key: string; label: string; color: string; bg: string; order: number }
const BANDS: Record<string, Band> = {
  expired: { key: 'expired', label: 'פג תוקף', color: '#B42318', bg: '#FCEBE8', order: 0 },
  urgent:  { key: 'urgent',  label: 'השבוע',   color: '#C2410C', bg: '#FDEEE3', order: 1 },
  soon:    { key: 'soon',    label: 'החודש',   color: '#A16207', bg: '#FBF3DB', order: 2 },
  heads:   { key: 'heads',   label: 'בהמשך',   color: '#3F5F8F', bg: '#E8EEF8', order: 3 },
}
function bandOf(d: number): Band {
  if (d < 0) return BANDS.expired
  if (d <= 7) return BANDS.urgent
  if (d <= 30) return BANDS.soon
  return BANDS.heads
}
function ownerLabel(it: any): string {
  return it.owner === 'other' && it.owner_other ? it.owner_other : (OWNER_LABEL[it.owner] || it.owner)
}
function itemTitle(it: any): string {
  const t = it.type?.label_he || 'פריט'
  return it.title ? `${t} · ${it.title}` : t
}

// ─── email HTML ─────────────────────────────────────────────────────────────
function renderEmail(rows: { it: any; d: number }[], today: string, isTest: boolean): { subject: string; html: string } {
  const byBand = new Map<string, { band: Band; rows: typeof rows }>()
  for (const r of rows) {
    const b = bandOf(r.d)
    if (!byBand.has(b.key)) byBand.set(b.key, { band: b, rows: [] })
    byBand.get(b.key)!.rows.push(r)
  }
  const groups = [...byBand.values()].sort((a, b) => a.band.order - b.band.order)
  const nExp = byBand.get('expired')?.rows.length || 0
  const nUrg = byBand.get('urgent')?.rows.length || 0
  const subjParts: string[] = []
  if (nExp) subjParts.push(`${nExp} פגו`)
  if (nUrg) subjParts.push(`${nUrg} השבוע`)
  const subject = (isTest ? '[בדיקה] ' : '') + 'תוקף · ' + (subjParts.length ? subjParts.join(', ') : `${rows.length} תזכורות`)

  const section = (g: { band: Band; rows: typeof rows }) => `
    <tr><td style="padding:22px 0 8px;font-size:13px;font-weight:700;color:${g.band.color};letter-spacing:.02em">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${g.band.color};margin-left:6px;vertical-align:middle"></span>${g.band.label} · ${g.rows.length}
    </td></tr>
    ${g.rows.map(({ it, d }) => `
    <tr><td style="padding:0 0 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #E3E6E0;border-radius:14px">
        <tr>
          <td style="padding:16px 18px;border-right:4px solid ${g.band.color};border-radius:0 14px 14px 0">
            <div style="font-size:17px;font-weight:700;color:#14181D;line-height:1.3">${esc(itemTitle(it))}</div>
            <div style="font-size:13px;color:#6B7280;margin-top:4px">
              <span style="display:inline-block;background:#EEF0EC;color:#4B5563;font-weight:600;padding:1px 8px;border-radius:999px;font-size:12px">${esc(ownerLabel(it))}</span>
              &nbsp;${esc(fmtDate(it.expires_on))} · <b style="color:${g.band.color}">${esc(relative(d))}</b>
              ${it.vendor ? ` · ${esc(it.vendor)}` : ''}${it.reference ? ` · <span dir="ltr">${esc(it.reference)}</span>` : ''}
            </div>
            ${it.notes ? `<div style="margin-top:10px;padding:10px 12px;background:#F5F6F2;border-radius:10px;font-size:14px;line-height:1.55;color:#14181D;white-space:pre-wrap">${esc(it.notes)}</div>` : ''}
            <div style="margin-top:12px">
              <a href="${SITE}/#/expiry/${it.id}?action=renew" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:8px 14px;border-radius:9px">חידשתי</a>
              <a href="${SITE}/#/expiry/${it.id}?action=archive" style="display:inline-block;color:#4B5563;text-decoration:none;font-weight:600;font-size:13px;padding:8px 12px;border:1px solid #CFD4CC;border-radius:9px;margin-right:6px">לא רלוונטי</a>
              <a href="${SITE}/#/expiry/${it.id}" style="display:inline-block;color:#6B7280;text-decoration:none;font-size:13px;padding:8px 8px">פתח</a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>`).join('')}`

  const html = `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap" rel="stylesheet"></head>
  <body style="margin:0;background:#F5F6F2;font-family:'Open Sans','Open Sans Hebrew',Arial,sans-serif;direction:rtl">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
      <tr><td style="padding:0 0 4px;font-size:12px;color:#8B939E">BARONS · ${esc(fmtDate(today))}${isTest ? ' · <b style="color:#B42318">הודעת בדיקה</b>' : ''}</td></tr>
      <tr><td style="font-size:30px;font-weight:800;letter-spacing:-.02em;color:#14181D;line-height:1.1">תוקף</td></tr>
      <tr><td style="padding:8px 0 4px;font-size:15px;color:#4B5563;line-height:1.5">
        ${rows.length === 1 ? 'פריט אחד דורש' : `${rows.length} פריטים דורשים`} תשומת לב.${isTest ? ' זו בדיקה של מערכת המייל — מוצגים כל הפריטים הפעילים.' : ''}
      </td></tr>
      ${groups.map(section).join('')}
      <tr><td style="padding:22px 0 0;font-size:12px;color:#8B939E;line-height:1.6">
        נשלח אוטומטית כל בוקר כשיש מה להזכיר. <a href="${SITE}/#/expiry" style="color:#1d4ed8;text-decoration:none">לרשימה המלאה</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>`
  return { subject, html }
}

async function sendResend(to: string[], subject: string, html: string): Promise<string> {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`Resend ${r.status}: ${JSON.stringify(j)}`)
  return j.id || ''
}

// ─── main ───────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dry_run') === '1'
  const isTest = url.searchParams.get('test') === '1'

  if (DIGEST_SECRET) {
    const got = req.headers.get('x-digest-secret') || url.searchParams.get('secret') || ''
    if (got !== DIGEST_SECRET) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY)
  const today = todayJerusalem()

  // config: owner → email map, cc admin
  let ownerEmails: Record<string, string> = { erez: ADMIN }
  let ccAdmin = true
  try {
    const { data: cfg } = await db.from('app_config').select('key,value').in('key', ['expiry.owner_emails', 'expiry.cc_admin'])
    for (const row of cfg || []) {
      const v = typeof row.value === 'string' ? JSON.parse(row.value) : row.value
      if (row.key === 'expiry.owner_emails' && v && typeof v === 'object') ownerEmails = { ...ownerEmails, ...v }
      if (row.key === 'expiry.cc_admin') ccAdmin = Boolean(v)
    }
  } catch (_) { /* app_config may differ — defaults apply */ }

  const { data: items, error } = await db
    .from('expiry_items')
    .select('*, type:expiry_types(*)')
    .eq('status', 'active')
    .eq('reminders_paused', false)
    .order('expires_on')
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })

  const ids = (items || []).map(i => i.id)
  const { data: logs } = ids.length
    ? await db.from('expiry_reminder_log').select('item_id,offset_days').in('item_id', ids)
    : { data: [] as any[] }
  const logged = new Set((logs || []).map(l => `${l.item_id}:${l.offset_days}`))

  // decide what's due
  type Due = { it: any; d: number; offsets: number[] }   // offsets = log rows to write
  const due: Due[] = []
  for (const it of items || []) {
    const d = daysLeft(it.expires_on, today)
    if (isTest) { due.push({ it, d, offsets: [] }); continue }
    if (it.snoozed_until && it.snoozed_until >= today) continue
    if (d >= 0) {
      const offsets: number[] = (it.offsets_override?.length ? it.offsets_override : it.type?.default_offsets) || [30, 7, 0]
      const missed = offsets.filter((o: number) => o >= d && !logged.has(`${it.id}:${o}`))
      if (missed.length) due.push({ it, d, offsets: missed })
    } else {
      const every: number = it.post_expiry_override ?? it.type?.post_expiry_every ?? 14
      if (every > 0 && (-d) % every === 0 && !logged.has(`${it.id}:${d}`)) due.push({ it, d, offsets: [d] })
    }
  }

  // group by recipient
  const byEmail = new Map<string, Due[]>()
  for (const x of due) {
    const tos: string[] = x.it.notify_emails?.length ? x.it.notify_emails : [ownerEmails[x.it.owner] || ADMIN]
    if (ccAdmin && !tos.includes(ADMIN)) tos.push(ADMIN)
    for (const e of tos) {
      if (!byEmail.has(e)) byEmail.set(e, [])
      byEmail.get(e)!.push(x)
    }
  }
  if (isTest) {  // test goes to admin only
    const all = [...byEmail.values()].flat()
    const uniq = [...new Map(all.map(x => [x.it.id, x])).values()]
    byEmail.clear(); byEmail.set(ADMIN, uniq)
  }

  const summary: any = { today, mode: dryRun ? 'dry_run' : isTest ? 'test' : 'send', active_items: items?.length || 0, due: due.length, recipients: {} }
  for (const [email, list] of byEmail) {
    summary.recipients[email] = list.map(x => ({ item: itemTitle(x.it), days_left: x.d, log_offsets: x.offsets }))
  }
  if (dryRun || byEmail.size === 0) {
    return new Response(JSON.stringify(summary, null, 2), { headers: { 'Content-Type': 'application/json' } })
  }

  // send + log
  summary.sent = []
  for (const [email, list] of byEmail) {
    const sorted = [...list].sort((a, b) => a.d - b.d)
    const { subject, html } = renderEmail(sorted, today, isTest)
    try {
      const id = await sendResend([email], subject, html)
      summary.sent.push({ email, subject, resend_id: id })
      if (!isTest) {
        const rows = list.flatMap(x => x.offsets.map(o => ({ item_id: x.it.id, offset_days: o, sent_to: [email], resend_id: id })))
        if (rows.length) await db.from('expiry_reminder_log').upsert(rows, { onConflict: 'item_id,offset_days', ignoreDuplicates: true })
      }
    } catch (e) {
      summary.sent.push({ email, error: String(e) })
    }
  }
  return new Response(JSON.stringify(summary, null, 2), { headers: { 'Content-Type': 'application/json' } })
})
