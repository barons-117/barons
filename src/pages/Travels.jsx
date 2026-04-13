import { useEffect, useRef, useState } from 'react'
import { TripItImportWithTrip } from './TripItImport'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'
import { supabase } from '../lib/supabase'

const COUNTRY_HE = {'UK':'בריטניה','Germany':'גרמניה','Netherlands':'הולנד','Spain':'ספרד','France':'צרפת','Italy':'איטליה','Hungary':'הונגריה','Czech':'צ׳כיה','Austria':'אוסטריה','Belgium':'בלגיה','Switzerland':'שווייץ','Poland':'פולין','Ukraine':'אוקראינה','Moldova':'מולדובה','Romania':'רומניה','Cyprus':'קפריסין','Jordan':'ירדן','Portugal':'פורטוגל','Greece':'יוון','Thailand':'תאילנד','Australia':'אוסטרליה','New Zealand':'ניו זילנד','Canada':'קנדה','New York':'ניו יורק','California':'קליפורניה','Oregon':'אורגון','Nevada':'נבדה','Florida':'פלורידה','Massachusetts':'מסצ׳וסטס','Illinois':'אילינוי','Washington':'וושינגטון','Texas':'טקסס','Washington DC':'וושינגטון DC'}
const CITY_HE = {'Bangkok':'בנגקוק','London':'לונדון','Paris':'פריז','Berlin':'ברלין','New York City':'ניו יורק','Portland':'פורטלנד','San Francisco':'סן פרנסיסקו','Amsterdam':'אמסטרדם','Budapest':'בודפשט','Vienna':'וינה','Brussels':'בריסל','Barcelona':'ברצלונה','Madrid':'מדריד','Rome':'רומא','Phuket':'פוקט'}

const HE_TO_EN = {}
Object.entries(COUNTRY_HE).forEach(([en,he])=>{HE_TO_EN[he]=en})
Object.entries(CITY_HE).forEach(([en,he])=>{HE_TO_EN[he]=en})

function heCountry(c){return COUNTRY_HE[c]||c}
function fmtDate(d,opts){if(!d)return'';return new Date(d).toLocaleDateString('he-IL',opts||{day:'numeric',month:'short',year:'numeric'})}
function fmtShort(d){return fmtDate(d,{day:'numeric',month:'short'})}
function daysBetween(a,b){if(!a||!b)return null;return Math.round((new Date(b)-new Date(a))/(1000*60*60*24))}

const CONT_COLORS = {
  'אירופה': '#3b82f6', 'אסיה': '#f59e0b', 'צפון אמריקה': '#10b981',
  'דרום אמריקה': '#14b8a6', 'אפריקה': '#ef4444', 'אוקיאניה': '#8b5cf6',
  'מזרח התיכון': '#f97316',
}
function contColor(c) { return CONT_COLORS[c] || '#64748b' }

/* -- Emil Kowalski easing system -- */
const EASE = {
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
}

/* -- Dark theme tokens -- */
const T = {
  bg: '#0f172a',
  surface: 'rgba(255,255,255,0.04)',
  surfaceBorder: 'rgba(255,255,255,0.08)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  accent: '#3b82f6',
  glass: 'rgba(255,255,255,0.05)',
  glassBorder: '1px solid rgba(255,255,255,0.08)',
  glassInner: 'inset 0 1px 0 rgba(255,255,255,0.06)',
  font: 'Open Sans Hebrew, Open Sans, sans-serif',
}

/* -- Shared input style -- */
const inp = {
  width: '100%',
  border: '1.5px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  padding: '11px 14px',
  fontSize: '14px',
  fontFamily: T.font,
  color: T.text,
  outline: 'none',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)',
  transition: `border-color 220ms ${EASE.out}, box-shadow 220ms ${EASE.out}, background 220ms ${EASE.out}`,
}
const LBL = { display: 'block', fontSize: '11px', fontWeight: 700, color: T.textMuted, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }

function inputFocus(e) {
  e.target.style.borderColor = 'rgba(59,130,246,0.7)'
  e.target.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.18)'
  e.target.style.background = 'rgba(255,255,255,0.09)'
}
function inputBlur(e) {
  e.target.style.borderColor = 'rgba(255,255,255,0.1)'
  e.target.style.boxShadow = 'none'
  e.target.style.background = 'rgba(255,255,255,0.06)'
}

/* -- CSS keyframes & utilities injected once -- */
const KEYFRAMES = `
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}

@keyframes tv-shimmer {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}
@keyframes tv-blob1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(60px, -40px) scale(1.1); }
  66% { transform: translate(-30px, 30px) scale(0.95); }
}
@keyframes tv-blob2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-50px, 50px) scale(1.05); }
  66% { transform: translate(40px, -20px) scale(0.9); }
}
@keyframes tv-blob3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, 60px) scale(0.95); }
  66% { transform: translate(-60px, -30px) scale(1.08); }
}
@keyframes tv-modal-in {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes tv-backdrop-in {
  from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
  to   { opacity: 1; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
}
@keyframes tv-fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes tv-fade-blur-in {
  from { opacity: 0; filter: blur(4px); transform: translateY(6px); }
  to   { opacity: 1; filter: blur(0px); transform: translateY(0); }
}
@keyframes tv-pulse-amber {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0); }
  50%      { box-shadow: 0 0 28px 2px rgba(251,191,36,0.22); }
}
@keyframes tv-pulse-urgent {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.78; }
}
@keyframes tv-breathe {
  0%, 100% { transform: scale(1); opacity: 0.25; }
  50%      { transform: scale(1.06); opacity: 0.35; }
}

.tv-press { transition: transform 160ms var(--ease-out); }
@media (hover: hover) and (pointer: fine) {
  .tv-press:active { transform: scale(0.97); }
}

.tv-card-hover {
  transition:
    transform 220ms var(--ease-out),
    box-shadow 220ms var(--ease-out);
  will-change: transform;
}
@media (hover: hover) and (pointer: fine) {
  .tv-card-hover:hover { transform: translateY(-3px); }
  .tv-card-hover:active { transform: scale(0.99); }
}

.tv-stat {
  transition: transform 220ms var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .tv-stat:hover { transform: translateY(-2px); }
}

.tv-row {
  transition:
    background-color 180ms var(--ease-out),
    box-shadow 180ms var(--ease-out),
    transform 180ms var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .tv-row:hover { transform: translateX(-2px); }
  .tv-row:active { transform: scale(0.99); }
}

@media (prefers-reduced-motion: reduce) {
  .tv-row, .tv-card-hover, .tv-press, .tv-stat {
    transition: none !important;
    animation: none !important;
  }
}

/* Past trips list — responsive row */
.tv-row-grid {
  display: grid;
  grid-template-columns: 50px 100px 100px 1fr 130px 130px 50px 50px;
  padding: 13px 20px;
  gap: 12px;
  align-items: center;
}
.tv-row-mobile { display: none; }
.tv-row-cell-meta { display: block; }
.tv-row-meta-mobile { display: none; }
.tv-table-header { display: grid; }

@media (max-width: 700px) {
  .tv-row-grid {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 5px;
    padding: 12px 14px;
  }
  .tv-row-grid > .tv-row-cell-meta { display: none; }
  .tv-row-mobile {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
  }
  .tv-row-meta-mobile {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
    font-size: 11.5px;
    color: #94a3b8;
    line-height: 1.4;
  }
  .tv-row-meta-mobile .tv-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: rgba(255,255,255,0.18);
    display: inline-block;
    flex-shrink: 0;
  }
  .tv-row-meta-mobile .tv-meta-year {
    color: #818cf8;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .tv-row-meta-mobile .tv-meta-dates {
    font-variant-numeric: tabular-nums;
    color: #cbd5e1;
  }
  .tv-row-meta-mobile .tv-meta-countries { color: #cbd5e1; }
  .tv-row-meta-mobile .tv-meta-comps { color: #a5b4fc; }
  .tv-mobile-name {
    flex: 1;
    min-width: 0;
    font-size: 15px;
    font-weight: 700;
    color: #f1f5f9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: -0.01em;
  }
  .tv-mobile-days {
    flex-shrink: 0;
    background: rgba(59,130,246,0.14);
    border: 1px solid rgba(59,130,246,0.25);
    color: #93c5fd;
    font-size: 12px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 12px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .tv-mobile-icons {
    display: flex;
    gap: 6px;
    color: rgba(148,163,184,0.55);
    font-size: 11px;
    flex-shrink: 0;
  }
  .tv-table-header { display: none !important; }
  .tv-row:hover { transform: none; }
}
`

/* -- useCountUp hook -- */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  const startRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (typeof target !== 'number' || Number.isNaN(target)) { setValue(target); return }
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setValue(target); return }

    startRef.current = null
    const tick = (ts) => {
      if (startRef.current == null) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(1, elapsed / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(eased * target))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return value
}

/* -- AddTripModal -- */
function AddTripModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', name_he: '', start_date: '', end_date: '', city: '', country: '' })
  const [loading, setLoading] = useState(false)
  const [closing, setClosing] = useState(false)
  const navigate = useNavigate()
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleClose() {
    setClosing(true)
    setTimeout(() => onClose(), 180)
  }

  async function save() {
    if (!form.name_he && !form.name) return
    setLoading(true)
    const { data: trip } = await supabase.from('trips').insert({
      name: form.name || form.name_he,
      name_he: form.name_he || form.name,
    }).select().single()
    if (trip && form.city) {
      await supabase.from('trip_segments').insert({
        trip_id: trip.id,
        city: form.city,
        country: form.country,
        date_from: form.start_date || null,
        date_to: form.end_date || null,
      })
    }
    setLoading(false)
    onCreated()
    if (trip) navigate(`/travels/${trip.id}`)
  }

  const fieldStagger = (i) => ({
    animation: `tv-fade-up 340ms ${EASE.drawer} ${80 + i * 50}ms both`,
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 200,
        animation: closing
          ? `tv-backdrop-in 180ms ${EASE.out} reverse forwards`
          : `tv-backdrop-in 240ms ${EASE.out} both`,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: 'rgba(30,41,59,0.95)',
          borderRadius: '24px',
          padding: '40px',
          width: '500px',
          maxWidth: '95vw',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
          border: T.glassBorder,
          direction: 'rtl',
          willChange: 'transform, opacity',
          animation: closing
            ? `tv-modal-in 180ms ${EASE.drawer} reverse forwards`
            : `tv-modal-in 280ms ${EASE.drawer} both`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', ...fieldStagger(0) }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: T.text, letterSpacing: '-0.5px' }}>נסיעה חדשה</h2>
          <button
            className="tv-press"
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', width: '32px', height: '32px',
              borderRadius: '50%', fontSize: '16px', color: T.textMuted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: `background 180ms ${EASE.out}, transform 160ms ${EASE.out}`,
            }}
            onClick={handleClose}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={fieldStagger(1)}>
            <label style={LBL}>שם הנסיעה (עברית)</label>
            <input style={inp} value={form.name_he} onChange={e => set('name_he', e.target.value)} placeholder="למשל: בנגקוק עם רועי 2026" autoFocus onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div style={fieldStagger(2)}>
            <label style={LBL}>שם הנסיעה (אנגלית)</label>
            <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Bangkok with Roy 2026" onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', ...fieldStagger(3) }}>
            <div>
              <label style={LBL}>תאריך יציאה</label>
              <input style={{ ...inp, colorScheme: 'dark' }} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} onFocus={inputFocus} onBlur={inputBlur} />
            </div>
            <div>
              <label style={LBL}>תאריך חזרה</label>
              <input style={{ ...inp, colorScheme: 'dark' }} type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} onFocus={inputFocus} onBlur={inputBlur} />
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)', ...fieldStagger(4) }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: T.textDim, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>יעד ראשון -- אפשרי</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={LBL}>עיר</label>
                <input style={inp} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Bangkok" onFocus={inputFocus} onBlur={inputBlur} />
              </div>
              <div>
                <label style={LBL}>מדינה</label>
                <input style={inp} value={form.country} onChange={e => set('country', e.target.value)} placeholder="Thailand" onFocus={inputFocus} onBlur={inputBlur} />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={save}
          disabled={loading || (!form.name_he && !form.name)}
          className="tv-press"
          style={{
            width: '100%', marginTop: '28px', background: '#2563eb', border: 'none', color: 'white',
            padding: '15px', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            fontFamily: T.font,
            opacity: (!form.name_he && !form.name) ? 0.4 : 1,
            transition: `transform 160ms ${EASE.out}, box-shadow 220ms ${EASE.out}, background 180ms ${EASE.out}`,
            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
            ...fieldStagger(5),
          }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(37,99,235,0.45)' } }}
          onMouseLeave={e => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.3)' }}
        >
          {loading ? 'יוצר...' : 'צור נסיעה'}
        </button>
      </div>
    </div>
  )
}

/* -- TripCard (unused but preserved) -- */
function TripCard({ trip, upcoming }) {
  const navigate = useNavigate()
  const days = daysBetween(trip.startDate, trip.endDate)
  const accentColor = upcoming ? '#d97706' : '#3b82f6'

  return (
    <div
      className="tv-card-hover tv-press"
      style={{
        background: T.glass,
        padding: '24px',
        cursor: 'pointer',
        borderRadius: '18px',
        border: T.glassBorder,
        borderTop: `3px solid ${accentColor}`,
        transition: `transform 220ms ${EASE.out}, box-shadow 220ms ${EASE.out}`,
        boxShadow: `0 2px 8px rgba(0,0,0,0.2), ${T.glassInner}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
      onClick={() => navigate(`/travels/${trip.id}`)}
    >
      {upcoming && (
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
          קרוב
        </div>
      )}
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: T.text, lineHeight: 1.3, margin: 0 }}>{trip.name_he || trip.name}</h3>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: T.textMuted }}>
          {fmtDate(trip.startDate, { day: 'numeric', month: 'short', year: 'numeric' })} -- {fmtShort(trip.endDate)}
        </span>
        {days && (
          <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
            {days} ימים
          </span>
        )}
      </div>
      <div style={{ fontSize: '12px', color: T.textMuted }}>{trip.countries.map(heCountry).join(' · ')}</div>
      {trip.companions.length > 0 && (
        <div style={{ fontSize: '12px', color: '#818cf8', fontWeight: 500 }}>{trip.companions.slice(0, 3).join(', ')}</div>
      )}
      {(!trip.hasFlights || !trip.hasLodging) && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
          {!trip.hasFlights && (
            <span style={{ fontSize: '11px', background: 'rgba(251,146,60,0.12)', color: '#fb923c', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(251,146,60,0.2)', fontWeight: 600 }}>
              אין טיסות
            </span>
          )}
          {!trip.hasLodging && (
            <span style={{ fontSize: '11px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(74,222,128,0.15)', fontWeight: 600 }}>
              אין לינה
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/* -- UpcomingCard (extracted for countUp hook) -- */
function UpcomingCard({ trip, idx, today, onClick }) {
  const daysLeft = Math.ceil((new Date(trip.startDate) - new Date(today)) / 86400000)
  const tripDays = daysBetween(trip.startDate, trip.endDate)
  const accent = contColor(trip.continents?.[0])
  const urgency = daysLeft <= 7
    ? { num: '#f87171', glow: 'rgba(248,113,113,0.15)', ring: 'rgba(248,113,113,0.3)' }
    : daysLeft <= 30
    ? { num: '#fbbf24', glow: 'rgba(251,191,36,0.12)', ring: 'rgba(251,191,36,0.25)' }
    : { num: '#38bdf8', glow: 'rgba(56,189,248,0.1)', ring: 'rgba(56,189,248,0.25)' }

  const count = useCountUp(daysLeft, 700 + idx * 80)
  const ref = useRef(null)

  return (
    <div
      ref={ref}
      onClick={onClick}
      className="tv-card-hover"
      style={{
        display: 'flex', alignItems: 'stretch', borderRadius: '16px',
        border: T.glassBorder, overflow: 'hidden', cursor: 'pointer',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: `0 2px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)`,
        transition: `transform 240ms ${EASE.out}, box-shadow 240ms ${EASE.out}`,
        animation: `tv-fade-up 420ms ${EASE.out} ${120 + idx * 60}ms both`,
        willChange: 'transform',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 14px 40px rgba(0,0,0,0.32), 0 0 28px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.08)`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = `0 2px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)`
      }}
    >
      {/* Accent strip with glow */}
      <div style={{
        width: '5px', background: accent, flexShrink: 0,
        boxShadow: `0 0 12px ${accent}40`,
      }} />
      {/* Info */}
      <div style={{ flex: 1, padding: '16px 20px', minWidth: 0 }}>
        <div style={{ fontSize: '17px', fontWeight: 800, color: T.text, marginBottom: '4px', lineHeight: 1.25 }}>
          {trip.name_he || trip.name}
        </div>
        <div style={{ fontSize: '12px', color: T.textMuted, marginBottom: '3px' }}>
          {fmtDate(trip.startDate, { day: 'numeric', month: 'long' })} -- {fmtDate(trip.endDate, { day: 'numeric', month: 'long', year: 'numeric' })}
          {tripDays && <span style={{ marginRight: '6px' }}>· {tripDays} ימים</span>}
        </div>
        {trip.countries.length > 0 && (
          <div style={{ fontSize: '12px', color: T.textMuted }}>{trip.countries.map(heCountry).join(' · ')}</div>
        )}
        {trip.companions.length > 0 && (
          <div style={{ fontSize: '12px', color: '#818cf8', fontWeight: 500, marginTop: '3px' }}>
            {trip.companions.slice(0, 3).join(', ')}{trip.companions.length > 3 ? ` +${trip.companions.length - 3}` : ''}
          </div>
        )}
      </div>
      {/* Countdown */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '16px 24px', background: urgency.glow, flexShrink: 0, minWidth: '90px',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        animation: daysLeft <= 7 ? `tv-pulse-urgent 2.4s ${EASE.inOut} infinite` : 'none',
      }}>
        <div style={{
          fontSize: '38px', fontWeight: 900, lineHeight: 1, color: urgency.num,
          letterSpacing: '-1px',
          textShadow: `0 0 20px ${urgency.glow}`,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {count}
        </div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: urgency.num, opacity: 0.6, marginTop: '3px', letterSpacing: '0.5px' }}>
          ימים
        </div>
      </div>
    </div>
  )
}

/* -- TripRow -- */
function TripRow({ trip, onClick, index }) {
  const days = daysBetween(trip.startDate, trip.endDate)
  const [hovered, setHovered] = useState(false)
  const delay = Math.min(index * 30, 600)
  const countriesStr = trip.countries.map(heCountry).slice(0, 3).join(' · ')
  const compsStr = trip.companions.length > 0
    ? trip.companions.slice(0, 2).join(', ') + (trip.companions.length > 2 ? ` +${trip.companions.length - 2}` : '')
    : ''
  const daysColor = days > 14 ? '#fbbf24' : days > 7 ? '#60a5fa' : T.textMuted

  return (
    <div
      className="tv-row tv-row-grid"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        cursor: 'pointer',
        background: hovered
          ? 'rgba(59,130,246,0.08)'
          : index % 2 === 0
          ? 'transparent'
          : 'rgba(255,255,255,0.02)',
        boxShadow: hovered ? 'inset 0 0 0 1px rgba(59,130,246,0.15)' : 'inset 0 0 0 1px transparent',
        animation: `tv-fade-up 360ms ${EASE.out} ${delay}ms both`,
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Desktop grid cells */}
      <div className="tv-row-cell-meta" style={{ fontSize: '13px', fontWeight: 700, color: '#818cf8', fontVariantNumeric: 'tabular-nums' }}>{trip.startDate?.slice(0, 4)}</div>
      <div className="tv-row-cell-meta" style={{ fontSize: '12px', color: T.textMuted }}>{fmtShort(trip.startDate)}</div>
      <div className="tv-row-cell-meta" style={{ fontSize: '12px', color: T.textMuted }}>{fmtShort(trip.endDate)}</div>
      <div className="tv-row-cell-meta" style={{ fontSize: '14px', fontWeight: 600, color: T.text }}>{trip.name_he || trip.name}</div>
      <div className="tv-row-cell-meta" style={{ fontSize: '12px', color: T.textMuted }}>{trip.countries.map(heCountry).slice(0, 2).join(' · ')}</div>
      <div className="tv-row-cell-meta" style={{ fontSize: '12px', color: '#818cf8', fontWeight: 500 }}>
        {trip.companions.slice(0, 2).join(', ')}{trip.companions.length > 2 ? ` +${trip.companions.length - 2}` : ''}
      </div>
      <div className="tv-row-cell-meta" style={{ textAlign: 'center', fontSize: '13px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: daysColor }}>
        {days || '--'}
      </div>
      <div className="tv-row-cell-meta" style={{ display: 'flex', gap: '4px', justifyContent: 'center', fontSize: '12px', color: T.textDim }}>
        {!trip.hasFlights && <span title="אין טיסות">✈</span>}
        {!trip.hasLodging && <span title="אין לינה">■</span>}
      </div>

      {/* Mobile two-line layout */}
      <div className="tv-row-mobile">
        <div className="tv-mobile-name">{trip.name_he || trip.name}</div>
        <div className="tv-mobile-icons">
          {!trip.hasFlights && <span title="אין טיסות">✈</span>}
          {!trip.hasLodging && <span title="אין לינה">■</span>}
        </div>
        {days != null && (
          <div className="tv-mobile-days" style={{ color: daysColor, borderColor: `${daysColor}40`, background: `${daysColor}1a` }}>
            {days} ימים
          </div>
        )}
      </div>
      <div className="tv-row-meta-mobile">
        <span className="tv-meta-year">{trip.startDate?.slice(0, 4)}</span>
        <span className="tv-dot" />
        <span className="tv-meta-dates">{fmtShort(trip.startDate)} → {fmtShort(trip.endDate)}</span>
        {countriesStr && (<><span className="tv-dot" /><span className="tv-meta-countries">{countriesStr}</span></>)}
        {compsStr && (<><span className="tv-dot" /><span className="tv-meta-comps">{compsStr}</span></>)}
      </div>
    </div>
  )
}

/* -- Empty state SVG -- */
function EmptyIcon() {
  return (
    <svg
      width="64" height="64" viewBox="0 0 64 64" fill="none"
      style={{
        marginBottom: '12px',
        animation: `tv-breathe 4s ${EASE.inOut} infinite`,
        transformOrigin: 'center',
      }}
    >
      <circle cx="32" cy="32" r="28" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M22 38c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      <circle cx="26" cy="28" r="2" fill="#64748b" />
      <circle cx="38" cy="28" r="2" fill="#64748b" />
      <path d="M20 20l4 4M44 20l-4 4" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/* -- StatCell with count-up & stagger -- */
function StatCell({ v, l, accent, idx }) {
  const count = useCountUp(typeof v === 'number' ? v : 0, 900)
  return (
    <div
      className="tv-stat"
      style={{
        flex: 1, textAlign: 'center', padding: '24px 0',
        animation: `tv-fade-up 480ms ${EASE.out} ${120 + idx * 50}ms both`,
        borderRadius: '14px',
        ...(accent ? { animationName: 'tv-fade-up' } : {}),
      }}
    >
      <div
        style={{
          fontSize: '36px', fontWeight: 900,
          color: accent ? '#fbbf24' : '#60a5fa',
          letterSpacing: '-1px', lineHeight: 1,
          textShadow: accent ? '0 0 24px rgba(251,191,36,0.35)' : '0 0 24px rgba(96,165,250,0.3)',
          fontVariantNumeric: 'tabular-nums',
          display: 'inline-block',
          padding: accent ? '2px 10px' : 0,
          borderRadius: accent ? '10px' : 0,
          animation: accent ? `tv-pulse-amber 3.2s ${EASE.inOut} infinite` : 'none',
        }}
      >
        {count}
      </div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: T.textDim, marginTop: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>{l}</div>
    </div>
  )
}

/* -- Main Component -- */
export default function Travels({ session }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showTripit, setShowTripit] = useState(false)
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  async function loadTrips() {
    const [tripsRes, flightsRes, lodgingRes] = await Promise.all([
      supabase.from('trips').select(`id, name, name_he, trip_segments(date_from, date_to, city, country, continent, segment_companions(companions(name)))`),
      supabase.from('flights').select('trip_id'),
      supabase.from('lodging').select('trip_id'),
    ])
    const tripsWithFlights = new Set((flightsRes.data || []).map(f => f.trip_id))
    const tripsWithLodging = new Set((lodgingRes.data || []).map(l => l.trip_id))
    if (tripsRes.data) {
      const enriched = tripsRes.data.map(t => {
        const segs = t.trip_segments || []
        const dates = segs.map(s => s.date_from).filter(Boolean).sort()
        const ends = segs.map(s => s.date_to).filter(Boolean).sort()
        return {
          ...t,
          startDate: dates[0] || null,
          endDate: ends[ends.length - 1] || null,
          cities: [...new Set(segs.map(s => s.city).filter(Boolean))],
          countries: [...new Set(segs.map(s => s.country).filter(Boolean))],
          continents: [...new Set(segs.map(s => s.continent).filter(Boolean))],
          companions: [...new Set(segs.flatMap(s => s.segment_companions?.map(sc => sc.companions?.name) || []).filter(Boolean))],
          hasFlights: tripsWithFlights.has(t.id),
          hasLodging: tripsWithLodging.has(t.id),
        }
      }).filter(t => t.startDate).sort((a, b) => a.startDate.localeCompare(b.startDate))
      setTrips(enriched)
    }
    setLoading(false)
  }

  useEffect(() => { loadTrips() }, [])

  const past = trips.filter(t => t.endDate && t.endDate < today)
  const upcoming = trips.filter(t => t.startDate >= today)
  const totalDays = past.reduce((acc, t) => acc + (daysBetween(t.startDate, t.endDate) || 0), 0)
  const countries = new Set(trips.flatMap(t => t.countries)).size

  function matchesSearch(t, q) {
    if (!q) return true
    const ql = q.toLowerCase()
    const enTerm = (HE_TO_EN[q] || '').toLowerCase()
    const all = [t.name_he || '', t.name || '', ...t.countries, ...t.countries.map(heCountry), ...t.cities, ...t.cities.map(c => CITY_HE[c] || c), ...t.companions].join(' ').toLowerCase()
    return all.includes(ql) || (enTerm && all.includes(enTerm))
  }

  const q = search.trim()
  const filtered = q ? past.filter(t => matchesSearch(t, q)) : null
  const displayList = filtered || [...past].reverse()

  const stats = [
    { v: past.length, l: 'טיולים', accent: false },
    { v: countries, l: 'מדינות', accent: false },
    { v: Math.round(totalDays), l: 'ימים בחו״ל', accent: false },
    { v: upcoming.length, l: 'קרובים', accent: true },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      fontFamily: T.font,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{KEYFRAMES}</style>
      {showAdd && <AddTripModal onClose={() => setShowAdd(false)} onCreated={loadTrips} />}
      {showTripit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', zIndex: 200 }} onClick={() => setShowTripit(false)}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', width: '540px', maxWidth: '95vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#e2e8f0' }}>ייבא טיול מ-TripIt</h3>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }} onClick={() => setShowTripit(false)}>✕</button>
            </div>
            <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#93c5fd', lineHeight: 1.6 }}>
              <strong>איך ייבאים?</strong><br/>
              פתח טיול ב-TripIt → לחץ Print → בחר הכל (Cmd+A) → העתק (Cmd+C) → הדבק כאן.<br/>
              <span style={{ color: '#64748b', fontSize: '12px' }}>הטיול ייווצר אוטומטית עם כל הטיסות והמלונות.</span>
            </div>
            <TripItImportWithTrip onClose={() => setShowTripit(false)} onCreated={loadTrips} />
          </div>
        </div>
      )}

      {/* Floating gradient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%', width: '500px', height: '500px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          animation: `tv-blob1 28s ${EASE.inOut} infinite`, filter: 'blur(40px)',
          willChange: 'transform',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-10%', width: '600px', height: '600px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
          animation: `tv-blob2 32s ${EASE.inOut} infinite`, filter: 'blur(40px)',
          willChange: 'transform',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '30%', width: '400px', height: '400px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)',
          animation: `tv-blob3 30s ${EASE.inOut} infinite`, filter: 'blur(40px)',
          willChange: 'transform',
        }} />
        {/* Noise texture overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat', opacity: 0.5,
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <BaronsHeader
          title="נסיעות"
          subtitle="יומן הטיולים שלי"
          breadcrumbs={[{ label: 'נסיעות', path: '/travels' }]}
          actions={[
            { label: 'סטטיסטיקות', onClick: () => navigate('/stats') },
            { label: '📋 TripIt', onClick: () => setShowTripit(true) },
            { label: '+ טיול', onClick: () => setShowAdd(true), primary: true }
          ]}
        />

        <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

          {/* Top row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '28px', flexWrap: 'wrap', gap: '16px',
            animation: `tv-fade-up 480ms ${EASE.out} both`,
          }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: T.text, letterSpacing: '-0.5px', margin: 0 }}>הנסיעות שלי</h1>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: T.textDim, pointerEvents: 'none' }}>
                  &#9740;
                </span>
                <input
                  style={{
                    border: '1.5px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '10px 38px 10px 14px',
                    fontSize: '14px',
                    outline: 'none',
                    width: '260px',
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    color: T.text,
                    fontFamily: T.font,
                    transition: `border-color 240ms ${EASE.out}, box-shadow 240ms ${EASE.out}, background 240ms ${EASE.out}`,
                    direction: 'rtl',
                  }}
                  placeholder="חיפוש -- עברית או אנגלית..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(59,130,246,0.6)'
                    e.target.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.18), 0 0 24px rgba(59,130,246,0.12)'
                    e.target.style.background = 'rgba(255,255,255,0.09)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                    e.target.style.boxShadow = 'none'
                    e.target.style.background = 'rgba(255,255,255,0.05)'
                  }}
                />
              </div>
              <button
                className="tv-press"
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(59,130,246,0.4)', color: '#60a5fa',
                  padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: T.font,
                  transition: `background 180ms ${EASE.out}, transform 160ms ${EASE.out}, box-shadow 200ms ${EASE.out}`,
                }}
                onClick={() => navigate('/search')}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.12)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                חיפוש מתקדם
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '18px',
            marginBottom: '40px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
            border: T.glassBorder,
            overflow: 'hidden',
            animation: `tv-fade-up 520ms ${EASE.out} 60ms both`,
          }}>
            {stats.map(({ v, l, accent }, i) => (
              <div key={l} style={{ display: 'flex', flex: 1, alignItems: 'stretch' }}>
                {i > 0 && <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)', alignSelf: 'stretch', margin: '16px 0' }} />}
                <StatCell v={v} l={l} accent={accent} idx={i} />
              </div>
            ))}
          </div>

          {/* Loading skeleton */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  height: '80px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)',
                  border: T.glassBorder, overflow: 'hidden', position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
                    filter: 'blur(0.5px)',
                    animation: `tv-shimmer 1.2s ${EASE.inOut} infinite`,
                  }} />
                </div>
              ))}
            </div>
          ) : (
            <div
              key={q || 'all'}
              style={{ animation: `tv-fade-blur-in 360ms ${EASE.out} both` }}
            >
              {/* Upcoming section */}
              {upcoming.length > 0 && !q && (
                <section style={{ marginBottom: '44px' }}>
                  <div style={{
                    fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: T.textDim,
                    marginBottom: '16px', textTransform: 'uppercase',
                    animation: `tv-fade-up 440ms ${EASE.out} 100ms both`,
                  }}>
                    קרובים
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {upcoming.map((t, idx) => (
                      <UpcomingCard
                        key={t.id}
                        trip={t}
                        idx={idx}
                        today={today}
                        onClick={() => navigate(`/travels/${t.id}`)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Past trips table */}
              <section style={{
                marginBottom: '36px',
                animation: `tv-fade-up 480ms ${EASE.out} ${upcoming.length > 0 && !q ? 240 : 100}ms both`,
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: T.textDim, marginBottom: '16px', textTransform: 'uppercase' }}>
                  {q ? `תוצאות (${displayList.length})` : `כל הטיולים -- ${past.length}`}
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.03)', border: T.glassBorder,
                  borderRadius: '18px', overflow: 'hidden',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}>
                  <div className="tv-table-header" style={{
                    gridTemplateColumns: '50px 100px 100px 1fr 130px 130px 50px 50px',
                    padding: '12px 20px',
                    background: 'rgba(255,255,255,0.04)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)', gap: '12px',
                    fontSize: '10px', fontWeight: 700, color: T.textDim,
                    textTransform: 'uppercase', letterSpacing: '1.5px',
                    direction: 'rtl',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}>
                    <span>שנה</span><span>מתאריך</span><span>עד תאריך</span><span>שם הטיול</span><span>יעדים</span><span>עם מי</span><span style={{ textAlign: 'center' }}>ימים</span><span></span>
                  </div>
                  {displayList.map((t, i) => (
                    <TripRow key={t.id} trip={t} index={i} onClick={() => navigate(`/travels/${t.id}`)} />
                  ))}
                  {displayList.length === 0 && (
                    <div style={{ padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: `tv-fade-up 440ms ${EASE.out} both` }}>
                      <EmptyIcon />
                      <div style={{ fontSize: '15px', color: T.textDim, fontWeight: 500 }}>לא נמצאו תוצאות</div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
