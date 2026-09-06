import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  ownerLabel, todayISO, daysLeft, fmtDate, relativeLabel, urgencyOf,
  effectiveOffsets, effectivePostExpiry, isCustomReminders, offsetLabel, bigUnit,
  ownerStyle, ownerFace, lifeProgress, addDays,
} from './expiryLib'
import { ItemForm, ResolveModal, CalendarPopup } from './ExpiryModals'
import './expiry.css'

const SELECT = '*, type:expiry_types(*, category:expiry_categories(*))'

const I = {
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>,
  off:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  cal:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  edit:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 20h4l10-10-4-4L4 16v4zM13 7l4 4"/></svg>,
  undo:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14l-4-4 4-4M5 10h9a5 5 0 0 1 0 10h-3"/></svg>,
  bell:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/></svg>,
  note:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 4h11l3 3v13H5zM8 10h8M8 14h6"/></svg>,
  info:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>,
  link:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>,
}

const GLYPH = {
  travel:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14l18-8-4 15-5-4-4 3v-5l9-6"/></svg>,
  identity:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2.5"/><path d="M14 10h4M14 14h4"/></svg>,
  insurance:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>,
  finance:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/></svg>,
  vehicle:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M5 16l1.5-6h11L19 16M3 16h18v3H3zM7 19v1M17 19v1"/></svg>,
  home:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M4 11l8-7 8 7v9H4z"/></svg>,
  warranty:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 3l3 3h4v4l3 2-3 2v4h-4l-3 3-3-3H5v-4l-3-2 3-2V6h4z"/></svg>,
  subscription: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/></svg>,
  health:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  legal:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3v18M5 7h14M5 7l-3 7h6zM19 7l-3 7h6z"/></svg>,
  other:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/></svg>,
}

// ─── Ring gauge: how much of the document's life is left ─────────────────────
function Gauge({ progress, days, inactive, label }) {
  const R = 78, C = 2 * Math.PI * R
  const left = progress === null ? 0 : 1 - progress
  const dash = C * (inactive || days < 0 ? 0 : Math.max(0.02, left))
  const bu = bigUnit(days)
  return (
    <div className="xp-gauge-ring">
      <svg viewBox="0 0 176 176">
        <circle className="track" cx="88" cy="88" r={R} fill="none" strokeWidth="10" />
        <circle className="fill" cx="88" cy="88" r={R} fill="none" strokeWidth="10" strokeDasharray={`${dash} ${C}`} />
      </svg>
      <div className="xp-gauge-in">
        <div>
          <b>{days < 0 ? `−${bu.n}` : bu.n}</b>
          <i>{bu.unit}</i>
          <small>{label}</small>
        </div>
      </div>
    </div>
  )
}

function Portrait({ face, who, glyph }) {
  const [broken, setBroken] = useState(false)
  return (
    <div className="xp-t-portrait">
      {face && !broken ? <img src={face} alt={who} onError={() => setBroken(true)} /> : <i>{who.slice(0, 1)}</i>}
      <span className="glyph">{glyph}</span>
    </div>
  )
}

export default function ExpiryDetail({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const today = todayISO()

  const [item, setItem] = useState(null)
  const [prev, setPrev] = useState(null)
  const [next, setNext] = useState(null)
  const [log, setLog] = useState([])
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [form, setForm] = useState(false)
  const [resolve, setResolve] = useState(null)
  const [cal, setCal] = useState(null)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    const { data, error } = await supabase.from('expiry_items').select(SELECT).eq('id', id).single()
    if (error) { setErr(error.message); setLoading(false); return }
    setItem(data)
    const [p, n, l, t] = await Promise.all([
      data.renewed_from_id ? supabase.from('expiry_items').select(SELECT).eq('id', data.renewed_from_id).single() : Promise.resolve({ data: null }),
      supabase.from('expiry_items').select(SELECT).eq('renewed_from_id', data.id).maybeSingle(),
      supabase.from('expiry_reminder_log').select('*').eq('item_id', data.id).order('sent_at', { ascending: false }),
      supabase.from('expiry_types').select('*, category:expiry_categories(*)').order('sort_order'),
    ])
    setPrev(p.data || null); setNext(n.data || null); setLog(l.data || []); setTypes(t.data || [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  // deep-link from the digest email: ?action=renew | archive
  useEffect(() => {
    if (!item || loading) return
    const a = params.get('action')
    if (!a) return
    if (item.status === 'active') {
      if (a === 'renew') setResolve('renew')
      else if (a === 'archive') setResolve('not_relevant')
    }
    params.delete('action'); setParams(params, { replace: true })
  }, [item, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(t)
  }, [toast])

  async function restore() {
    const { data, error } = await supabase.from('expiry_items').update({ status: 'active', archive_reason: null, resolved_at: null, resolved_note: null })
      .eq('id', item.id).select(SELECT).single()
    if (error) { setErr(error.message); return }
    setItem(data); setToast('שוחזר')
  }
  async function unsnooze() {
    const { data, error } = await supabase.from('expiry_items').update({ snoozed_until: null }).eq('id', item.id).select(SELECT).single()
    if (error) { setErr(error.message); return }
    setItem(data); setToast('ההשתקה בוטלה')
  }
  function onResolved(updated, action) {
    setResolve(null)
    if (action === 'renew') { navigate(`/expiry/${updated.id}`, { replace: true }); setCal({ item: updated, saved: true }); return }
    setItem(updated)
    setToast(action === 'archive' ? 'הועבר לארכיון' : 'הושתק')
  }

  if (loading) {
    return <div className="xp"><div className="xp-wrap"><div style={{ paddingTop: 40 }}>{[0, 1, 2].map(i => <div key={i} className="xp-skel" />)}</div></div></div>
  }
  if (!item) {
    return (
      <div className="xp"><div className="xp-wrap">
        <div className="xp-err" style={{ marginTop: 40 }}>{err || 'הפריט לא נמצא.'}</div>
        <button className="xp-btn ghost" onClick={() => navigate('/expiry')}>לרשימה</button>
      </div></div>
    )
  }

  const d = daysLeft(item.expires_on, today)
  const u = urgencyOf(d)
  const inactive = item.status !== 'active'
  const hot = !inactive && (u.key === 'expired' || u.key === 'urgent' || u.key === 'soon')
  const os = ownerStyle(item)
  const face = ownerFace(item)
  const who = ownerLabel(item)
  const prog = lifeProgress(item, today)
  const snoozed = item.snoozed_until && item.snoozed_until >= today
  const statusPill = item.status === 'renewed'
    ? { l: 'חודש', c: '#3F5F8F', bg: '#E8EEF8' }
    : item.status === 'archived'
      ? { l: item.archive_reason === 'not_relevant' ? 'לא רלוונטי' : 'ארכיון', c: '#5B6470', bg: '#EEF0EC' }
      : null

  const offsets = effectiveOffsets(item)
  const every = effectivePostExpiry(item)
  const steps = offsets.map(o => {
    const sent = log.find(l => l.offset_days === o)
    const date = addDays(item.expires_on, -o)
    const state = sent ? 'sent' : (d < o ? 'past' : 'future')
    return { o, sent, date, state }
  })
  const nextIdx = steps.findIndex(s => s.state === 'future')
  const nags = log.filter(l => l.offset_days < 0)

  const gaugeLabel = inactive ? statusPill?.l : (d < 0 ? 'מאז שפג' : 'עד שפג')
  const cssVars = { '--o': os.color, '--o-bg': os.bg, '--c': hot ? u.color : undefined, '--c-bg': hot ? u.bg : undefined }

  return (
    <div className="xp" style={cssVars}>
      <div className="xp-wrap xp-dpage">
        <div className="xp-top">
          <nav className="xp-crumbs">
            <button onClick={() => navigate('/')}>BARONS</button><span>/</span>
            <button onClick={() => navigate('/expiry')}>תוקף</button><span>/</span>
            <span className="cur">{item.type?.label_he}</span>
          </nav>
        </div>

        {err && <div className="xp-err" style={{ marginTop: 16 }}>{err}</div>}

        {/* ── Ticket ── */}
        <section className={'xp-ticket' + (hot ? ' hot' : '')} style={{ marginTop: 16 }}>
          <div className="xp-t-body">
            <Portrait face={face} who={who} glyph={GLYPH[item.type?.category_key] || GLYPH.other} />
            <div>
              <div className="xp-t-who">{who}</div>
              <h1 className="xp-t-title">{item.type?.label_he}{item.title && <> <span className="sub">{item.title}</span></>}</h1>
              <div className="xp-t-tags">
                <span className="xp-t-tag o">{item.type?.category?.label_he}</span>
                {statusPill && <span className="xp-t-tag st" style={{ '--c': statusPill.c, '--c-bg': statusPill.bg }}>{statusPill.l}</span>}
                {!inactive && hot && <span className="xp-t-tag st">{u.label}</span>}
                {snoozed && <span className="xp-t-tag">{I.clock} מושתק עד {fmtDate(item.snoozed_until)}</span>}
                {isCustomReminders(item) && <span className="xp-t-tag">תזכורות מותאמות</span>}
                {item.vendor && <span className="xp-t-tag">{item.vendor}</span>}
              </div>
            </div>
          </div>
          <div className="xp-t-stub">
            <span className="notch top" /><span className="notch bot" />
            <Gauge progress={prog} days={d} inactive={inactive} label={gaugeLabel} />
            <div className="xp-t-date">
              <b>{fmtDate(item.expires_on, { day: 'numeric', month: 'long', year: 'numeric' })}</b>
              <span>{fmtDate(item.expires_on, { weekday: 'long' })}{prog !== null && !inactive && d >= 0 ? ` · ${Math.round(prog * 100)}% מהתקופה עברו` : ''}</span>
            </div>
          </div>
        </section>

        {/* ── Spec sheet ── */}
        <div className="xp-dgrid">
          <div className="xp-dcol">
            <div className="xp-panel">
              <div className="xp-panel-h">{I.note} הערות</div>
              <div className={'xp-memo' + (item.notes ? '' : ' empty')}>
                {item.notes || 'אין הערות עדיין. כדאי לכתוב כאן מה צריך לזכור כשזה יגיע — זה מה שיופיע במייל.'}
              </div>
            </div>

            <div className="xp-panel">
              <div className="xp-panel-h">{I.bell} לוח תזכורות</div>
              <div className="xp-steps">
                {steps.map((s, i) => (
                  <div key={s.o} className={'xp-step ' + s.state + (i === nextIdx ? ' next' : '')}>
                    <div className="dot">{s.state === 'sent' && I.check}</div>
                    <b>{offsetLabel(s.o)}</b>
                    <span>{s.sent ? `נשלח ${fmtDate(s.sent.sent_at.slice(0, 10), { day: 'numeric', month: 'short' })}` : s.state === 'past' ? 'עבר' : fmtDate(s.date, { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                  </div>
                ))}
                <div className={'xp-step' + (d < 0 && every ? ' next' : '')}>
                  <div className="dot" />
                  <b>אחרי שפג</b>
                  <span>{every ? `כל ${every} ימים` : 'שקט'}{nags.length ? ` · נשלחו ${nags.length}` : ''}</span>
                </div>
              </div>
              <div className="xp-steps-foot">
                <span>נמענים: {item.notify_emails?.length ? item.notify_emails.join(', ') : `לפי בעלים (${who})`}</span>
                {isCustomReminders(item) && <span>· לוח מותאם לפריט זה</span>}
              </div>
            </div>

            <div className="xp-panel">
              <div className="xp-panel-h">{I.info} פרטים</div>
              <div className="xp-facts">
                <div className="xp-fact"><small>תוקף עד</small><span>{fmtDate(item.expires_on)}</span></div>
                {item.issued_on && <div className="xp-fact"><small>הונפק</small><span>{fmtDate(item.issued_on)}</span></div>}
                {item.reference && <div className="xp-fact"><small>מספר</small><span dir="ltr">{item.reference}</span></div>}
                {item.vendor && <div className="xp-fact"><small>ספק / גוף</small><span>{item.vendor}</span></div>}
                {item.amount != null && <div className="xp-fact"><small>עלות חידוש</small><span>{Number(item.amount).toLocaleString('he-IL')} {item.currency === 'ILS' || !item.currency ? '₪' : item.currency}</span></div>}
                {item.url && <div className="xp-fact"><small>קישור</small><span><a href={item.url} target="_blank" rel="noreferrer">{item.url.replace(/^https?:\/\//, '').slice(0, 32)}</a></span></div>}
                {item.resolved_note && <div className="xp-fact"><small>סיבה</small><span>{item.resolved_note}</span></div>}
                <div className="xp-fact"><small>נוצר</small><span>{fmtDate(item.created_at.slice(0, 10))}</span></div>
                {item.resolved_at && <div className="xp-fact"><small>נסגר</small><span>{fmtDate(item.resolved_at.slice(0, 10))}</span></div>}
              </div>
            </div>

            {(prev || next) && (
              <div className="xp-panel">
                <div className="xp-panel-h">{I.undo} שרשרת חידושים</div>
                <div className="xp-chain">
                  {next && <button onClick={() => navigate(`/expiry/${next.id}`)}><span className="pt" />הגרסה הנוכחית · עד {fmtDate(next.expires_on)}</button>}
                  <div className="cur"><span className="pt" />זה · עד {fmtDate(item.expires_on)}</div>
                  {prev && <button onClick={() => navigate(`/expiry/${prev.id}`)}><span className="pt" />הקודם · פג {fmtDate(prev.expires_on)}</button>}
                </div>
              </div>
            )}
          </div>

          <aside className="xp-rail">
            {!inactive && <button className="xp-btn primary" onClick={() => setResolve(d < 0 ? 'choose' : 'renew')}>{I.check}<span>{d < 0 ? 'מה קרה עם זה?' : 'חידשתי — עדכן תאריך'}</span></button>}
            {!inactive && <button className="xp-btn ghost" onClick={() => setResolve('not_relevant')}>{I.off}<span>לא רלוונטי, אפשר להסיר</span></button>}
            {!inactive && (snoozed
              ? <button className="xp-btn ghost" onClick={unsnooze}>{I.clock}<span>בטל השתקה</span></button>
              : <button className="xp-btn ghost" onClick={() => setResolve('snooze')}>{I.clock}<span>הזכר לי שוב ב-…</span></button>)}
            {item.status === 'archived' && <button className="xp-btn primary" onClick={restore}>{I.undo}<span>שחזר לרשימה</span></button>}
            <button className="xp-btn ghost" onClick={() => setCal({ item, saved: false })}>{I.cal}<span>הוסף ליומן</span></button>
            <button className="xp-btn ghost" onClick={() => setForm(true)}>{I.edit}<span>ערוך פרטים</span></button>

            <div className="sec">בקצרה</div>
            <div className="xp-panel">
              <div className="xp-kv">
                <div><span className="k">מצב</span><span className="v" style={{ color: hot ? u.color : undefined }}>{inactive ? statusPill?.l : relativeLabel(d)}</span></div>
                <div><span className="k">תזכורת הבאה</span><span className="v">{nextIdx >= 0 ? fmtDate(steps[nextIdx].date, { day: 'numeric', month: 'short' }) : (d < 0 && every ? `כל ${every} ימים` : '—')}</span></div>
                <div><span className="k">נשלחו</span><span className="v">{log.length}</span></div>
                {item.type?.renewal_months && <div><span className="k">תקופה טיפוסית</span><span className="v">{item.type.renewal_months >= 12 ? `${Math.round(item.type.renewal_months / 12)} שנים` : `${item.type.renewal_months} חודשים`}</span></div>}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {form && <ItemForm types={types} item={item} session={session} onClose={() => setForm(false)}
        onSaved={(it, meta) => { if (!it) return; setItem(it); setForm(false); if (meta?.dateChanged) setCal({ item: it, saved: true }); else setToast('נשמר') }} />}
      {resolve && <ResolveModal item={item} session={session} initial={resolve} onClose={() => setResolve(null)} onDone={onResolved} />}
      {cal && <CalendarPopup item={cal.item} saved={cal.saved} onClose={() => setCal(null)} />}
      {toast && <div className="xp-toast">{toast}</div>}
    </div>
  )
}
