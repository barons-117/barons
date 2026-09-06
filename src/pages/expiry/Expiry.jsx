import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  OWNERS, ownerLabel, todayISO, daysLeft, fmtDate, relativeLabel, urgencyOf, URGENCY,
  isCustomReminders, itemTitle, bigUnit, ownerStyle, lifeProgress, ownerFace,
} from './expiryLib'
import { ItemForm, ResolveModal, CalendarPopup } from './ExpiryModals'
import './expiry.css'

const SELECT = '*, type:expiry_types(*, category:expiry_categories(*))'

const I = {
  plus:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>,
  cal:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  edit:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 20h4l10-10-4-4L4 16v4zM13 7l4 4"/></svg>,
  grid:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>,
  flame: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 1-6 1-9z"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>,
}

// small glyph per category, shown on the monogram corner
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

// Face with graceful fallback to the initial letter
function Face({ item, who }) {
  const [broken, setBroken] = useState(false)
  const src = ownerFace(item)
  const ok = src && !broken
  return (
    <div className={'xp-mono' + (ok ? ' has-img' : '')} title={who}>
      {ok && <img src={src} alt={who} loading="lazy" onError={() => setBroken(true)} />}
      <span>{who.slice(0, 1)}</span>
      {GLYPH[item.type?.category_key] || GLYPH.other}
    </div>
  )
}

const BOARD = [
  ['expired', 'פג תוקף'],
  ['urgent', 'תוך שבוע'],
  ['soon', 'תוך חודש'],
  ['quarter', 'תוך 3 חודשים'],
]

// ─── Kinetic title: letters rise out of clipped slots ────────────────────────
function Kinetic({ text }) {
  return (
    <h1 className="xp-kin" aria-label={text}>
      {[...text].map((ch, i) => <span key={i} style={{ '--i': i }}><i>{ch}</i></span>)}
    </h1>
  )
}

// ─── Odometer: digits roll up to their value ─────────────────────────────────
function Odometer({ value, unit, color }) {
  const digits = String(value).split('')
  const [go, setGo] = useState(false)
  useEffect(() => { const t = requestAnimationFrame(() => setGo(true)); return () => cancelAnimationFrame(t) }, [value])
  return (
    <span className="xp-odo" style={{ '--c': color }}>
      <span className="digits">
        {digits.map((ch, i) => {
          const n = parseInt(ch, 10)
          if (Number.isNaN(n)) return <span key={i} className="slot" style={{ width: '.3em', background: 'none', boxShadow: 'none' }}>{ch}</span>
          return (
            <span key={i} className="slot">
              <span className="strip" style={{ transform: `translateY(${go ? -n : 0}em)`, '--d': `${i * 120}ms` }}>
                {[0,1,2,3,4,5,6,7,8,9].map(k => <b key={k}>{k}</b>)}
              </span>
            </span>
          )
        })}
      </span>
      <span className="unit">{unit}</span>
    </span>
  )
}

// ─── Sun-path arc: the coming year as a horizon, today rising on the right ───
function Arc({ items, today, onPick }) {
  const W = 1000, H = 132, PAD = 34
  const days = 365
  const chord = W - PAD * 2, sag = 54
  const R = (chord * chord) / (8 * sag) + sag / 2        // radius of the shallow bow
  const cx = W / 2, cy = 96 + (R - sag)                    // centre sits far below the strip
  const a0 = Math.asin((chord / 2) / R)                    // half-angle of the bow
  const [tip, setTip] = useState(null)
  const wrapRef = useRef(null)
  // angle runs from +a0 (right end = today) to −a0 (left end = 365d). RTL: time flows right → left.
  const ang = d => a0 - (2 * a0) * Math.min(Math.max(d, 0), days) / days
  const at = (d, r = R) => { const a = ang(d); return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) } }
  const pt = d => at(d)
  const t0 = new Date(today + 'T12:00:00')
  const months = []
  for (let i = 1; i <= 12; i++) {
    const m = new Date(t0); m.setMonth(m.getMonth() + i, 1)
    const d = Math.round((m - t0) / 86400000)
    if (d <= days) months.push({ d, label: m.toLocaleDateString('he-IL', { month: 'short' }) })
  }
  const active = items.filter(it => it.status === 'active')
  const placed = []
  const dots = active
    .map(it => ({ it, d: daysLeft(it.expires_on, today) }))
    .filter(x => x.d >= 0 && x.d <= days)
    .sort((a, b) => a.d - b.d)
    .map(({ it, d }, i) => {
      let lane = 0
      while (placed.some(p => p.lane === lane && Math.abs(p.d - d) < 6)) lane++
      placed.push({ d, lane })
      const p = at(d, R + 14 + Math.min(lane, 2) * 13)
      const u = urgencyOf(d)
      return { it, d, i, u, x: p.x, y: p.y, hot: u.key === 'urgent' || u.key === 'soon' }
    })
  const expired = active.filter(it => daysLeft(it.expires_on, today) < 0).length
  const beyond = active.filter(it => daysLeft(it.expires_on, today) > days).length
  const sun = pt(0)
  const showTip = (e, dot) => {
    const box = wrapRef.current?.getBoundingClientRect()
    if (!box) return
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, dot })
  }
  return (
    <div className="xp-arc" ref={wrapRef}>
      <svg viewBox={`0 0 ${W} ${H}`} aria-label="השנה הקרובה">
        <path className="path" d={`M ${pt(0).x} ${pt(0).y} A ${R} ${R} 0 0 0 ${pt(days).x} ${pt(days).y}`} />
        {months.map(m => {
          const p1 = at(m.d, R - 5), p2 = at(m.d, R + 5), pl = at(m.d, R - 20)
          return (
            <g key={m.d}>
              <line className="tick" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />
              <text x={pl.x} y={pl.y + 4} textAnchor="middle">{m.label}</text>
            </g>
          )
        })}
        <circle className="sun-halo" cx={sun.x} cy={sun.y} r="12" />
        <circle className="sun" cx={sun.x} cy={sun.y} r="6" />
        <text className="today" x={sun.x} y={sun.y + 24} textAnchor="middle">היום</text>
        {expired > 0 && <text x={sun.x} y={sun.y - 20} textAnchor="middle" style={{ fill: URGENCY.expired.color, fontWeight: 800 }}>{expired} פגו</text>}
        {beyond > 0 && <text x={pt(days).x} y={pt(days).y + 24} textAnchor="middle">+{beyond} מעבר לשנה</text>}
        {dots.map(dt => (
          <circle key={dt.it.id} className={'dot' + (dt.hot ? ' hot' : '')} style={{ '--i': dt.i, '--g': dt.u.color }}
            cx={dt.x} cy={dt.y} r={5.5} fill={dt.u.color}
            onMouseEnter={e => showTip(e, dt)} onMouseMove={e => showTip(e, dt)} onMouseLeave={() => setTip(null)}
            onClick={() => onPick?.(dt.it)} />
        ))}
      </svg>
      {tip && (
        <div className="xp-tip" style={{ left: tip.x, top: tip.y }}>
          <b>{ownerLabel(tip.dot.it)} · {itemTitle(tip.dot.it)}</b>
          {fmtDate(tip.dot.it.expires_on)} · {relativeLabel(tip.dot.d)}
        </div>
      )}
      <div className="xp-arc-cap">
        <span><b>השנה הקרובה</b> · כל נקודה היא פריט, לחיצה פותחת אותו</span>
        <div className="xp-strip-legend">
          {['urgent', 'soon', 'quarter', 'later'].map(k => <span key={k} style={{ '--c': URGENCY[k].color }}>{URGENCY[k].label}</span>)}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onAdd, filtered }) {
  return (
    <div className="xp-empty">
      <svg viewBox="0 0 64 64" fill="none" stroke="#14181D" strokeWidth="1.6">
        <path d="M18 8h28M18 56h28M22 8c0 12 20 16 20 24S22 44 22 56M42 8c0 12-20 16-20 24s20 12 20 24" />
        <path d="M27 30h10" strokeWidth="2.4" />
      </svg>
      <div>
        <h3>{filtered ? 'אין פריטים שמתאימים לסינון' : 'עדיין ריק'}</h3>
        <p>{filtered ? 'נקה את הסינון או הוסף פריט חדש.' : 'הוסף את הדרכון שלך — זה תמיד הראשון. אחריו ביטוח הרכב, ואז כל השאר יבוא לבד.'}</p>
        {!filtered && <button className="xp-add" style={{ marginTop: 16 }} onClick={onAdd}>{I.plus}<span>פריט חדש</span></button>}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Expiry({ session }) {
  const navigate = useNavigate()
  const today = todayISO()
  const [items, setItems] = useState([])
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [owner, setOwner] = useState('all')
  const [cat, setCat] = useState('all')
  const [status, setStatus] = useState('active')       // active | resolved | all
  const [band, setBand] = useState('all')              // all | expired | urgent | soon | quarter
  const [q, setQ] = useState('')
  const [view, setView] = useState('urgency')          // urgency | category

  const [form, setForm] = useState(null)               // { item } | null
  const [resolve, setResolve] = useState(null)         // item
  const [cal, setCal] = useState(null)                 // { item, saved }
  const [toast, setToast] = useState('')

  const loadTypes = useCallback(async () => {
    const { data, error } = await supabase.from('expiry_types').select('*, category:expiry_categories(*)').order('sort_order')
    if (error) { setErr(error.message); return }
    setTypes(data || [])
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data, error }] = await Promise.all([
      supabase.from('expiry_items').select(SELECT).order('expires_on'),
      loadTypes(),
    ])
    if (error) setErr(error.message)
    setItems(data || [])
    setLoading(false)
  }, [loadTypes])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const cats = useMemo(() => {
    const m = new Map()
    types.forEach(t => { if (t.category) m.set(t.category.key, t.category) })
    return [...m.values()].sort((a, b) => a.sort_order - b.sort_order)
  }, [types])

  const active = useMemo(() => items.filter(i => i.status === 'active'), [items])
  const counts = useMemo(() => {
    const c = { expired: 0, urgent: 0, soon: 0, quarter: 0 }
    active.forEach(i => { const k = urgencyOf(daysLeft(i.expires_on, today)).key; if (k in c) c[k]++ })
    return c
  }, [active, today])

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return items.filter(i => {
      if (status === 'active' && i.status !== 'active') return false
      if (status === 'resolved' && i.status === 'active') return false
      if (owner !== 'all' && i.owner !== owner) return false
      if (cat !== 'all' && i.type?.category_key !== cat) return false
      if (band !== 'all' && urgencyOf(daysLeft(i.expires_on, today)).key !== band) return false
      if (ql) {
        const hay = [i.title, i.notes, i.reference, i.vendor, i.type?.label_he, ownerLabel(i)].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(ql)) return false
      }
      return true
    })
  }, [items, status, owner, cat, band, q, today])

  const groups = useMemo(() => {
    if (view === 'category') {
      const m = new Map()
      filtered.forEach(i => {
        const c = i.type?.category
        const k = c?.key || 'other'
        if (!m.has(k)) m.set(k, { key: k, label: c?.label_he || 'אחר', order: c?.sort_order ?? 999, items: [] })
        m.get(k).items.push(i)
      })
      return [...m.values()].sort((a, b) => a.order - b.order)
    }
    const m = new Map()
    filtered.forEach(i => {
      const u = urgencyOf(daysLeft(i.expires_on, today))
      if (!m.has(u.key)) m.set(u.key, { key: u.key, label: u.label, order: u.order, color: u.color, items: [] })
      m.get(u.key).items.push(i)
    })
    return [...m.values()].sort((a, b) => a.order - b.order)
  }, [filtered, view, today])

  const nearest = useMemo(() => {
    const up = active.map(i => ({ i, d: daysLeft(i.expires_on, today) })).filter(x => x.d >= 0).sort((a, b) => a.d - b.d)
    if (!up.length) return null
    return { d: up[0].d, items: up.filter(x => x.d === up[0].d).map(x => x.i) }
  }, [active, today])

  const isFiltered = owner !== 'all' || cat !== 'all' || band !== 'all' || q.trim() !== '' || status !== 'active'

  // ── mutations ──
  function upsertLocal(item) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === item.id)
      const next = idx === -1 ? [...prev, item] : prev.map(i => (i.id === item.id ? item : i))
      return next.sort((a, b) => a.expires_on.localeCompare(b.expires_on))
    })
  }

  function onSaved(item, meta) {
    if (!item && meta?.newType) { loadTypes(); return }
    upsertLocal(item)
    setForm(null)
    if (meta?.isNew || meta?.dateChanged) setCal({ item, saved: true })
    else setToast('נשמר')
  }

  function onResolved(item, action) {
    setResolve(null)
    if (action === 'renew') {
      // new item created; old one status changed — reload to pick both up
      load()
      setCal({ item, saved: true })
      return
    }
    upsertLocal(item)
    setToast(action === 'archive' ? 'הועבר לארכיון' : 'הושתק')
  }

  const heroLine = (() => {
    if (loading) return 'טוען…'
    if (!active.length) return 'עדיין אין פריטים במעקב.'
    const parts = []
    if (counts.expired) parts.push(<strong key="e">{counts.expired} פגו</strong>)
    if (counts.urgent) parts.push(<strong key="u">{counts.urgent} פגים תוך שבוע</strong>)
    if (counts.soon) parts.push(<strong key="s">{counts.soon} תוך חודש</strong>)
    if (!parts.length) return <>{active.length} {active.length === 1 ? 'פריט' : 'פריטים'} במעקב. אין מה לחדש ב-30 הימים הקרובים.</>
    return <>{active.length} פריטים במעקב. {parts.reduce((acc, p, i) => (i ? [...acc, ', ', p] : [p]), [])} — כדאי לטפל.</>
  })()

  return (
    <div className="xp">
      <div className="xp-wrap">
        <div className="xp-top">
          <nav className="xp-crumbs">
            <button onClick={() => navigate('/')}>BARONS</button>
            <span>/</span>
            <span className="cur">תוקף</span>
          </nav>
          <span>{fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>

        <header className="xp-hero">
          <span className="xp-blob b1" /><span className="xp-blob b2" /><span className="xp-blob b3" />
          <div className="xp-hero-grid">
            <div className="xp-hero-text">
              <Kinetic text="תוקף" />
              <div className="xp-kin-rule" />
              <p>{heroLine}</p>
              {nearest && (() => {
                const bu = bigUnit(nearest.d); const u = urgencyOf(nearest.d)
                const hot = u.key === 'urgent' || u.key === 'soon'
                return (
                  <div className="xp-near">
                    <span className="lbl">{nearest.items.length > 1 ? `הקרובים ביותר · ${nearest.items.length} באותו יום` : 'הקרוב ביותר'}</span>
                    <Odometer value={bu.n} unit={bu.unit} color={hot ? u.color : undefined} />
                    <div className="whos">
                      {nearest.items.map(it => {
                        const os = ownerStyle(it); const face = ownerFace(it); const who = ownerLabel(it)
                        return (
                          <button key={it.id} className="what" style={{ '--o': os.color, '--o-bg': os.bg }} onClick={() => navigate(`/expiry/${it.id}`)}>
                            {face ? <img src={face} alt="" onError={e => { e.currentTarget.style.display = 'none' }} /> : <i>{who.slice(0, 1)}</i>}
                            <span>{who} · {itemTitle(it)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
              <button className="xp-add" onClick={() => setForm({ item: null })}>{I.plus}<span>פריט חדש</span></button>
            </div>
            <div className="xp-board" role="group" aria-label="מה מגיע בקרוב">
              <span className="xp-board-cap">מה מגיע בקרוב · לחיצה מסננת את הרשימה</span>
              {BOARD.map(([k, label], i) => (
                <button key={k} className={'xp-tile' + (band === k ? ' on' : '') + (counts[k] ? '' : ' zero')}
                  style={{ '--c': counts[k] ? URGENCY[k].color : undefined, '--i': i }}
                  title={`הצג רק ${label}`}
                  onClick={() => { setBand(b => (b === k ? 'all' : k)); setStatus('active') }}>
                  <b>{counts[k]}</b><small>{label}</small>
                </button>
              ))}
            </div>
          </div>
          {!loading && <Arc items={items} today={today} onPick={it => navigate(`/expiry/${it.id}`)} />}
        </header>

        {err && <div className="xp-err" style={{ marginTop: 16 }}>{err}</div>}

        <div className="xp-filters">
          <div className="xp-fg">
            <label>מציג</label>
            <div className="xp-segc">
              <button className={status === 'active' ? 'on' : ''} onClick={() => { setStatus('active'); setBand('all') }}>פעילים</button>
              <button className={status === 'resolved' ? 'on' : ''} onClick={() => { setStatus('resolved'); setBand('all') }}>חודשו וארכיון</button>
              <button className={status === 'all' ? 'on' : ''} onClick={() => { setStatus('all'); setBand('all') }}>הכול</button>
            </div>
          </div>

          <div className="xp-fg">
            <label>של מי</label>
            <div className="xp-chips">
              <button className={'xp-chip' + (owner === 'all' ? ' on' : '')} onClick={() => setOwner('all')}>כולם</button>
              {OWNERS.filter(o => o.key !== 'other' || items.some(i => i.owner === 'other')).map(o => (
                <button key={o.key} className={'xp-chip' + (owner === o.key ? ' on' : '')} onClick={() => setOwner(owner === o.key ? 'all' : o.key)}>{o.label}</button>
              ))}
            </div>
          </div>

          <div className="xp-fg">
            <label>קטגוריה</label>
            <select className="xp-select" value={cat} onChange={e => setCat(e.target.value)}>
              <option value="all">כל הקטגוריות</option>
              {cats.map(c => <option key={c.key} value={c.key}>{c.label_he}</option>)}
            </select>
          </div>

          <div className="xp-fg grow">
            <label>חיפוש</label>
            <div className="xp-search-wrap">
              {I.search}
              <input className="xp-search" placeholder="שם, מספר, ספק, הערה…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
          </div>

          <div className="xp-fg">
            <label>מסודר לפי</label>
            <div className="xp-segc">
              <button className={view === 'urgency' ? 'on' : ''} onClick={() => setView('urgency')}>{I.flame}<span>דחיפות</span></button>
              <button className={view === 'category' ? 'on' : ''} onClick={() => setView('category')}>{I.grid}<span>קטגוריה</span></button>
            </div>
          </div>

          {isFiltered && (
            <div className="xp-fg xp-clear">
              <label>&nbsp;</label>
              <button className="xp-chip ghost" onClick={() => { setOwner('all'); setCat('all'); setBand('all'); setQ(''); setStatus('active') }}>{I.x}<span>נקה סינון</span></button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ paddingTop: 24 }}>{[0, 1, 2, 3, 4].map(i => <div key={i} className="xp-skel" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={() => setForm({ item: null })} filtered={isFiltered} />
        ) : (
          groups.map(g => (
            <section key={g.key} className="xp-group">
              <div className="xp-group-h" style={{ '--c': g.color }}>
                <h2>{g.label}</h2><span>{g.items.length}</span>
              </div>
              <div className="xp-list">
              {g.items.map((it, idx) => {
                const d = daysLeft(it.expires_on, today)
                const u = urgencyOf(d)
                const inactive = it.status !== 'active'
                const hot = !inactive && (u.key === 'expired' || u.key === 'urgent' || u.key === 'soon')
                const os = ownerStyle(it)
                const who = ownerLabel(it)
                const prog = lifeProgress(it, today)
                const numColor = inactive ? 'var(--xp-muted)' : (hot ? u.color : 'var(--xp-ink)')
                return (
                  <div key={it.id} className={'xp-row' + (hot ? ' hot' : '') + (inactive ? ' done' : '')}
                    role="link" tabIndex={0} title="פתח את הפריט"
                    onClick={() => navigate(`/expiry/${it.id}`)}
                    onKeyDown={e => { if (e.key === 'Enter') navigate(`/expiry/${it.id}`) }}
                    style={{ '--i': idx, '--c': hot ? u.color : undefined, '--o': os.color, '--o-bg': os.bg }}>
                    <Face item={it} who={who} />
                    <div className="xp-main">
                      <div className="xp-title">
                        <span className="who">{who}</span>
                        <span className="t">{it.type?.label_he || 'פריט'}</span>
                        {it.title && <span className="sub">{it.title}</span>}
                        <span className="xp-open">פתח <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg></span>
                        {isCustomReminders(it) && <span className="xp-tag">CUSTOM</span>}
                        {it.snoozed_until && it.snoozed_until >= today && <span className="xp-tag" title={`מושתק עד ${fmtDate(it.snoozed_until)}`}>מושתק</span>}
                      </div>
                      <div className="xp-meta">
                        <span className="cat">{it.type?.category?.label_he}</span>
                        <span>·</span>
                        <span>{fmtDate(it.expires_on)}</span>
                        {it.vendor && <><span>·</span><span>{it.vendor}</span></>}
                        {it.reference && <><span>·</span><span dir="ltr">{it.reference}</span></>}
                      </div>
                      {it.notes && <div className="xp-notes" title={it.notes}>{it.notes}</div>}
                    </div>
                    <div className="xp-days">
                      <b style={{ color: numColor }}>{bigUnit(d).n}<i>{bigUnit(d).unit}</i></b>
                      <small>{inactive ? (it.status === 'renewed' ? 'חודש' : 'ארכיון') : (d < 0 ? relativeLabel(d) : 'עד שפג')}</small>
                      {prog !== null && !inactive && <div className="xp-gauge" title={`${Math.round(prog * 100)}% מהתקופה עברו`}><i style={{ '--p': `${Math.round(prog * 100)}%` }} /></div>}
                    </div>
                    <div className="xp-acts" onClick={e => e.stopPropagation()}>
                      {!inactive && <button className="xp-act primary" onClick={() => setResolve(it)}>{I.check}<span>{d < 0 ? 'מה קרה עם זה?' : 'טיפלתי בזה'}</span></button>}
                      <button className="xp-act" onClick={() => setCal({ item: it, saved: false })}>{I.cal}<span>הוסף ליומן</span></button>
                      <button className="xp-act" onClick={() => setForm({ item: it })}>{I.edit}<span>ערוך פרטים</span></button>
                    </div>
                  </div>
                )
              })}
              </div>
            </section>
          ))
        )}
      </div>

      {form && <ItemForm types={types} item={form.item} session={session} onClose={() => setForm(null)} onSaved={onSaved} />}
      {resolve && <ResolveModal item={resolve} session={session} onClose={() => setResolve(null)} onDone={onResolved} />}
      {cal && <CalendarPopup item={cal.item} saved={cal.saved} onClose={() => setCal(null)} />}
      {toast && <div className="xp-toast">{toast}</div>}
    </div>
  )
}
