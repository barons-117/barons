import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'
import { getDatabase, ref, set, get, push, onValue, remove } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js'

// ─── Firebase ─────────────────────────────────────────────────────────────────
const FB_CONFIG = {
  apiKey: 'AIzaSyCNkfifRX7zgHcIXmAuB0HSSzCfCzsFKjk',
  authDomain: 'shopping-list-855d8.firebaseapp.com',
  databaseURL: 'https://shopping-list-855d8-default-rtdb.firebaseio.com',
  projectId: 'shopping-list-855d8',
  storageBucket: 'shopping-list-855d8.firebasestorage.app',
  messagingSenderId: '467214739172',
  appId: '1:467214739172:web:1c1e46e9072352197f2ef1',
}
const fbApp = getApps().length ? getApps()[0] : initializeApp(FB_CONFIG)
const db = getDatabase(fbApp)
const DB_PATH      = 'marathon/roy/workouts'
const FREE_PATH    = 'marathon/roy/freeRuns'

// ─── Write permissions ────────────────────────────────────────────────────────
const CAN_WRITE = ['roy@barons.co.il', 'erez@barons.co.il']

// ─── Constants ────────────────────────────────────────────────────────────────
const PLAN_START   = new Date('2026-03-22T00:00:00')
const RACE_DATE    = new Date('2026-09-27T07:00:00')
const TOTAL_PLAN_KM = 1820

const DAY_OFFSETS = { tue:2, wed:3, fri:5, sat:6 }
const DAY_NAMES   = { tue:'שלישי', wed:'רביעי', fri:'שישי', sat:'שבת' }
const TYPE_NAMES  = { easy:'קל', tempo:'טמפו', intervals:'אינטרוולים', long:'ארוך', race:'מרתון', free:'חופשי' }
const TYPE_ICONS  = { easy:'🟢', tempo:'🟠', intervals:'🔴', long:'🔵', race:'🏆', free:'🏃' }

const HR_ZONES = {
  easy:      { z:'Z2',   min:109, max:127 },
  long:      { z:'Z2',   min:109, max:127 },
  tempo:     { z:'Z3–4', min:145, max:163 },
  intervals: { z:'Z4–5', min:163, max:181 },
  race:      { z:'Z3',   min:140, max:155 },
  free:      { z:'—',    min:0,   max:999 },
}

const PLAN = [
  { week:1,  workouts:[{day:'tue',type:'easy',dist:4},{day:'fri',type:'easy',dist:5},{day:'sat',type:'easy',dist:6}]},
  { week:2,  workouts:[{day:'tue',type:'easy',dist:5},{day:'fri',type:'easy',dist:5,notes:'האצות'},{day:'sat',type:'easy',dist:7}]},
  { week:3,  workouts:[{day:'tue',type:'easy',dist:5},{day:'fri',type:'easy',dist:6},{day:'sat',type:'easy',dist:8}]},
  { week:4,  workouts:[{day:'tue',type:'easy',dist:5},{day:'fri',type:'easy',dist:6},{day:'sat',type:'easy',dist:9}]},
  { week:5,  workouts:[{day:'tue',type:'easy',dist:5},{day:'fri',type:'easy',dist:6,notes:'האצות'},{day:'sat',type:'easy',dist:10}]},
  { week:6,  workouts:[{day:'tue',type:'easy',dist:5},{day:'fri',type:'easy',dist:6},{day:'sat',type:'easy',dist:10}]},
  { week:7,  workouts:[{day:'tue',type:'easy',dist:5},{day:'wed',type:'tempo',dist:5},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:12}]},
  { week:8,  workouts:[{day:'tue',type:'easy',dist:5},{day:'wed',type:'intervals',dist:6},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:14}]},
  { week:9,  workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'tempo',dist:6},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:15}]},
  { week:10, workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'intervals',dist:6},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:16}]},
  { week:11, workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'tempo',dist:7},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:18}]},
  { week:12, workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'intervals',dist:7},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:19}]},
  { week:13, workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'tempo',dist:8},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:20}]},
  { week:14, workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'intervals',dist:8},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:22}]},
  { week:15, workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'tempo',dist:8},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:24}]},
  { week:16, workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'intervals',dist:9},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:25}]},
  { week:17, workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'tempo',dist:9},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:26}]},
  { week:18, workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'intervals',dist:10},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:27}]},
  { week:19, workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'tempo',dist:10},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:28}]},
  { week:20, workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'tempo',dist:10},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:28}]},
  { week:21, workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'intervals',dist:10},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:28}]},
  { week:22, workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'tempo',dist:10},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:30}]},
  { week:23, workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'intervals',dist:10},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:30}]},
  { week:24, workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'tempo',dist:12},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:32}]},
  { week:25, workouts:[{day:'tue',type:'easy',dist:6},{day:'wed',type:'intervals',dist:12},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:32}]},
  { week:26, workouts:[{day:'tue',type:'easy',dist:6},{day:'fri',type:'easy',dist:6},{day:'sat',type:'long',dist:20}]},
  { week:27, workouts:[{day:'tue',type:'easy',dist:5},{day:'fri',type:'easy',dist:5}]},
  { week:28, workouts:[{day:'sat',type:'race',dist:42.2,notes:'מרתון ברלין!'}]},
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCurrentWeek() {
  const t = new Date(); t.setHours(0,0,0,0)
  const s = new Date(PLAN_START); s.setHours(0,0,0,0)
  return Math.max(1, Math.min(28, Math.floor((t - s) / 86400000 / 7) + 1))
}
function getDaysToRace() {
  const t = new Date(); t.setHours(0,0,0,0)
  const r = new Date(RACE_DATE); r.setHours(0,0,0,0)
  return Math.max(0, Math.floor((r - t) / 86400000))
}
function getWorkoutDate(weekNum, day) {
  const d = new Date(PLAN_START)
  d.setDate(d.getDate() + (weekNum - 1) * 7 + DAY_OFFSETS[day])
  return d
}
function fmtDate(d) { return d.toLocaleDateString('he-IL', { day:'numeric', month:'numeric' }) }
function fmtDateLong(d) { return d.toLocaleDateString('he-IL', { day:'numeric', month:'long', year:'numeric' }) }
function wKey(w, d) { return `w${w}_${d}` }
function isPast(w, d) {
  const t = new Date(); t.setHours(0,0,0,0)
  return getWorkoutDate(w, d) < t
}
function isToday(w, d) {
  const t = new Date(); t.setHours(0,0,0,0)
  return getWorkoutDate(w, d).getTime() === t.getTime()
}
function weekTotalKm(wd) { return wd.workouts.reduce((s,w) => s + w.dist, 0) }
function fmtPace(km, min) {
  if (!km || !min) return '—'
  const pm = min / km, m = Math.floor(pm), s = Math.round((pm - m) * 60)
  return `${m}:${s.toString().padStart(2,'0')} /ק"מ`
}
function hrZoneLabel(hr) {
  if (!hr) return ''
  if (hr < 109)  return 'Zone 1'
  if (hr <= 127) return '✅ Zone 2 (קל)'
  if (hr <= 145) return 'Zone 3'
  if (hr <= 163) return 'Zone 4 (טמפו)'
  return 'Zone 5 (מקסימלי)'
}
function isoToDateInput(iso) {
  return iso ? iso.slice(0,10) : new Date().toISOString().slice(0,10)
}

// ─── Feedback engine ──────────────────────────────────────────────────────────
function generateFeedback(type, dist, actual) {
  const lines = []
  const { distance, hr, effort, timeMin } = actual
  const isEasy = type === 'easy' || type === 'long'
  if (type === 'free') return ['🏃 ריצה חופשית נרשמה!']

  if (hr) {
    if (isEasy) {
      if (hr > 145)      lines.push('⚠️ דופק גבוה מדי לריצה קלה — Zone 2 = 109–127')
      else if (hr > 127) lines.push('🔶 הדופק קצת גבוה — שמור על 109–127')
      else if (hr >= 109) lines.push('✅ דופק Zone 2 מושלם — ככה צריך!')
      else               lines.push('🔵 דופק נמוך — בסדר גמור לריצת שחרור')
    } else if (type === 'tempo') {
      if (hr < 140)      lines.push('⬆️ הדופק נמוך לטמפו — דחוף יותר (יעד: 145–163)')
      else if (hr > 163) lines.push('⬇️ הדופק גבוה מדי לטמפו — שמור שליטה (עד 163)')
      else               lines.push('✅ דופק טמפו מדויק — כל הכבוד!')
    } else if (type === 'intervals') {
      if (hr < 163) lines.push('⬆️ אינטרוולים → דופק 163+ — תן יותר')
      else          lines.push('✅ דופק אינטרוולים טוב — עבודה קשה ומבוקרת')
    }
  }
  if (distance && dist) {
    const diff = parseFloat(distance) - dist
    if (diff < -1.5)          lines.push(`📏 רצת ${Math.abs(diff).toFixed(1)} ק"מ פחות מהמתוכנן`)
    else if (diff > 2)        lines.push(`📏 רצת ${diff.toFixed(1)} ק"מ יותר מהמתוכנן — עקוב אחר התוכנית`)
    else if (Math.abs(diff) <= 0.5) lines.push('📏 מרחק מדויק — מצוין!')
  }
  if (effort) {
    const e = parseInt(effort)
    if (isEasy && e >= 7)             lines.push(`💪 מאמץ ${e}/10 גבוה לריצה קלה — יעד: 4–5`)
    else if (type==='tempo' && e < 6) lines.push('💪 מאמץ נמוך לטמפו — צריך להרגיש קשה אבל נשלט')
    else if (type==='intervals' && e<7) lines.push('💪 לאינטרוולים תן יותר — יעד מאמץ 8–9')
  }
  if (distance && timeMin) {
    const pace = timeMin / distance
    if (isEasy && pace < 6.5)              lines.push('🏃 קצב מהיר מדי לריצה קלה — יעד: 7:00–7:45')
    else if (type==='tempo' && pace > 6.2) lines.push('⚡ קצב הטמפו איטי — שאף ל-5:30–5:50 /ק"מ')
  }
  if (!lines.length) lines.push('👍 אימון תקין — המשך ככה!')
  return lines
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:     'linear-gradient(160deg,#0b1526 0%,#0f2a5c 60%,#0b1a3e 100%)',
  card:   'rgba(255,255,255,0.06)',
  card2:  'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.10)',
  accent: '#FF5500',
  amber:  '#FFB800',
  green:  '#22c55e',
  red:    '#ef4444',
  indigo: '#818cf8',
  gold:   '#f5c542',
  text:   '#eeeae4',
  muted:  'rgba(255,255,255,0.50)',
  mono:   "'Space Mono',monospace",
  font:   "'Open Sans Hebrew','Heebo',sans-serif",
}

// ─── Easing curves + keyframes (centralized, Emil style) ──────────────────────
const EASE = {
  out:     'cubic-bezier(0.22, 1, 0.36, 1)',     // --ease-out
  inOut:   'cubic-bezier(0.65, 0, 0.35, 1)',     // --ease-in-out
  drawer:  'cubic-bezier(0.32, 0.72, 0, 1)',     // --ease-drawer (Emil's drawer curve)
  spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',  // soft overshoot
}

const GLOBAL_CSS = `
  @keyframes mFadeUp {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }
  @keyframes mFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes mShimmer {
    0%   { transform: translateX(-120%); }
    100% { transform: translateX(120%); }
  }
  @keyframes mHeroFloat {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-4px); }
  }
  @keyframes mGoalPulse {
    0%,100% { text-shadow: 0 0 18px rgba(255,85,0,0.35), 0 0 2px rgba(255,85,0,0.25); }
    50%     { text-shadow: 0 0 26px rgba(255,85,0,0.55), 0 0 3px rgba(255,85,0,0.4); }
  }
  @keyframes mRingPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(255,85,0,0.35), 0 8px 28px rgba(255,85,0,0.15); }
    50%     { box-shadow: 0 0 0 6px rgba(255,85,0,0), 0 10px 32px rgba(255,85,0,0.22); }
  }
  @keyframes mTodayPulse {
    0%,100% { box-shadow: inset 0 0 0 1px rgba(255,85,0,0.45), 0 0 18px -4px rgba(255,85,0,0.35); }
    50%     { box-shadow: inset 0 0 0 1px rgba(255,85,0,0.65), 0 0 28px -2px rgba(255,85,0,0.55); }
  }
  @keyframes mCheckPop {
    0%   { transform: scale(0.4); opacity: 0; }
    60%  { transform: scale(1.12); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes mBadgePulse {
    0%,100% { transform: scale(1); }
    50%     { transform: scale(1.04); }
  }
  @keyframes mDotPulse {
    0%,100% { opacity: 0.55; transform: scale(1); }
    50%     { opacity: 1;    transform: scale(1.25); }
  }
  @keyframes mBlobDrift1 {
    0%,100% { transform: translate(0,0) scale(1); }
    50%     { transform: translate(40px,-30px) scale(1.08); }
  }
  @keyframes mBlobDrift2 {
    0%,100% { transform: translate(0,0) scale(1); }
    50%     { transform: translate(-50px,40px) scale(0.94); }
  }
  @keyframes mSlideRight {
    from { opacity: 0; transform: translateX(12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes mModalIn {
    from { opacity: 0; transform: translateY(14px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }
  @keyframes mBackdropIn {
    from { opacity: 0; backdrop-filter: blur(0px); }
    to   { opacity: 1; backdrop-filter: blur(16px); }
  }
  @keyframes mGoldShimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes mFire {
    0%,100% { transform: scale(1)   rotate(-2deg); }
    50%     { transform: scale(1.1) rotate(2deg); }
  }
  @keyframes mSkeleton {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes mTabCrossfade {
    from { opacity: 0; filter: blur(4px); transform: translateY(4px); }
    to   { opacity: 1; filter: blur(0);  transform: translateY(0); }
  }

  .m-btn { transition: transform 160ms ${EASE.out}, box-shadow 200ms ${EASE.out}, background-color 200ms ${EASE.out}, color 200ms ${EASE.out}, border-color 200ms ${EASE.out}; }
  .m-btn:active { transform: scale(0.97); }

  .m-row { transition: background-color 200ms ${EASE.out}, transform 200ms ${EASE.out}, box-shadow 200ms ${EASE.out}; }
  .m-row:active { transform: scale(0.99); }

  .m-stat { transition: transform 220ms ${EASE.out}, box-shadow 220ms ${EASE.out}, border-color 220ms ${EASE.out}; }

  .m-input { transition: border-color 180ms ${EASE.out}, box-shadow 220ms ${EASE.out}, background-color 180ms ${EASE.out}; }
  .m-input:focus { border-color: rgba(255,85,0,0.55) !important; box-shadow: 0 0 0 4px rgba(255,85,0,0.18); background-color: rgba(255,255,255,0.09) !important; }

  @media (hover: hover) and (pointer: fine) {
    .m-btn:hover { filter: brightness(1.08); }
    .m-row:hover { background-color: rgba(255,255,255,0.04); }
    .m-stat:hover { transform: translateY(-2px); box-shadow: 0 10px 24px -12px rgba(0,0,0,0.6); border-color: rgba(255,255,255,0.18); }
    .m-type-icon { transition: transform 220ms ${EASE.spring}; }
    .m-row:hover .m-type-icon { transform: translateY(-2px) scale(1.08); }
    .m-plan-row:hover { background-color: rgba(255,255,255,0.035); }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }
`

// ─── useCountUp hook ──────────────────────────────────────────────────────────
function useCountUp(target, { duration = 900, decimals = 0, delay = 0 } = {}) {
  const [val, setVal] = useState(0)
  const startRef = useRef(null)
  const rafRef = useRef(null)
  useEffect(() => {
    const num = parseFloat(target) || 0
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setVal(num)
      return
    }
    let cancelled = false
    const startTimer = setTimeout(() => {
      if (cancelled) return
      startRef.current = null
      const step = (ts) => {
        if (startRef.current === null) startRef.current = ts
        const p = Math.min(1, (ts - startRef.current) / duration)
        // ease-out curve
        const eased = 1 - Math.pow(1 - p, 3)
        setVal(num * eased)
        if (p < 1) rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    }, delay)
    return () => {
      cancelled = true
      clearTimeout(startTimer)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, delay])
  return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString()
}

// ─── Shared UI pieces ─────────────────────────────────────────────────────────
function Card({ children, style, className = '' }) {
  return (
    <div className={className} style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: 16, marginBottom: 10, backdropFilter: 'blur(12px)', ...style
    }}>{children}</div>
  )
}
function CardTitle({ children, style }) {
  return <div style={{ fontSize:10, fontWeight:700, color:C.muted, letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:12, ...style }}>{children}</div>
}

const TYPE_COLORS = {
  easy:      { bg:'rgba(34,197,94,0.15)',  c:'#22c55e', glow:'rgba(34,197,94,0.35)' },
  long:      { bg:'rgba(129,140,248,0.15)',c:'#818cf8', glow:'rgba(129,140,248,0.4)' },
  tempo:     { bg:'rgba(251,146,60,0.15)', c:'#fb923c', glow:'rgba(251,146,60,0.4)' },
  intervals: { bg:'rgba(239,68,68,0.15)',  c:'#ef4444', glow:'rgba(239,68,68,0.45)' },
  race:      { bg:'rgba(255,85,0,0.22)',   c:'#FF5500', glow:'rgba(255,85,0,0.5)' },
  free:      { bg:'rgba(255,255,255,0.10)',c:'rgba(255,255,255,0.75)', glow:'rgba(255,255,255,0.25)' },
}

function TypeBadge({ type, pulse = false }) {
  const col = TYPE_COLORS[type] || TYPE_COLORS.free
  return (
    <span style={{
      background: col.bg,
      color: col.c,
      padding: '2px 9px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: 'nowrap',
      boxShadow: pulse ? `0 0 12px -2px ${col.glow}` : 'none',
      animation: pulse ? 'mBadgePulse 2.4s ease-in-out infinite' : 'none',
      display: 'inline-block',
    }}>{TYPE_NAMES[type]}</span>
  )
}

function Field({ label, children, delay = 0 }) {
  return (
    <div style={{
      marginBottom: 14,
      opacity: 0,
      animation: `mFadeUp 380ms ${EASE.out} forwards`,
      animationDelay: `${delay}ms`,
    }}>
      <label style={{ display:'block', fontSize:10, fontWeight:700, color:C.muted, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
  borderRadius:10, padding:'11px 14px', color:C.text, fontFamily:C.mono, fontSize:18,
  outline:'none', direction:'ltr', textAlign:'center', boxSizing:'border-box',
}

// ─── Background blobs (subtle depth) ──────────────────────────────────────────
function BackgroundBlobs() {
  return (
    <div aria-hidden style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
      <div style={{
        position:'absolute', top:'-10%', right:'-10%', width:340, height:340, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(255,85,0,0.18), rgba(255,85,0,0) 70%)',
        filter:'blur(40px)', animation:`mBlobDrift1 28s ${EASE.inOut} infinite`,
      }}/>
      <div style={{
        position:'absolute', bottom:'-15%', left:'-15%', width:420, height:420, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(129,140,248,0.15), rgba(129,140,248,0) 70%)',
        filter:'blur(50px)', animation:`mBlobDrift2 32s ${EASE.inOut} infinite`,
      }}/>
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ height = 80, style }) {
  return (
    <div style={{
      height,
      borderRadius: 14,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 100%)',
      backgroundSize: '200% 100%',
      animation: `mSkeleton 1.2s ${EASE.inOut} infinite`,
      marginBottom: 10,
      border: `1px solid ${C.border}`,
      ...style,
    }}/>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Marathon({ session }) {
  const userEmail = session?.user?.email
  const canWrite  = CAN_WRITE.includes(userEmail)
  const navigate  = useNavigate()

  const [tab,        setTab]        = useState('dashboard')
  const [displayTab, setDisplayTab] = useState('dashboard')
  const [tabPhase,   setTabPhase]   = useState('in') // 'in' | 'out'
  const [allWorkouts,setAllWorkouts]= useState({})
  const [freeRuns,   setFreeRuns]   = useState({})
  const [loaded,     setLoaded]     = useState(false)
  const [modal,      setModal]      = useState(null)
  const [freeModal,  setFreeModal]  = useState(null)
  const [form,       setForm]       = useState({})
  const [freeForm,   setFreeForm]   = useState({})
  const [saving,     setSaving]     = useState(false)
  const [feedback,   setFeedback]   = useState(null)
  const [openWeeks,  setOpenWeeks]  = useState({})

  const currentWeek = getCurrentWeek()
  const daysLeft    = getDaysToRace()
  const weekData    = PLAN[currentWeek - 1]

  // ── Tab crossfade: delay actual content swap until fade-out completes ──
  useEffect(() => {
    if (tab === displayTab) return
    setTabPhase('out')
    const t = setTimeout(() => {
      setDisplayTab(tab)
      setTabPhase('in')
    }, 180)
    return () => clearTimeout(t)
  }, [tab, displayTab])

  // ── Firebase ──
  useEffect(() => {
    async function migrate() {
      const done = await get(ref(db, `${DB_PATH}/_migrated_w2_to_w1`))
      if (done.val()) return
      for (const d of ['tue','wed','fri','sat']) {
        const old = ref(db, `${DB_PATH}/w2_${d}`)
        const snap = await get(old)
        if (snap.val()) { await set(ref(db, `${DB_PATH}/w1_${d}`), snap.val()); await set(old, null) }
      }
      await set(ref(db, `${DB_PATH}/_migrated_w2_to_w1`), true)
    }
    let u1, u2
    migrate().then(() => {
      u1 = onValue(ref(db, DB_PATH),   s => { setAllWorkouts(s.val() || {}); setLoaded(true) })
      u2 = onValue(ref(db, FREE_PATH), s => setFreeRuns(s.val() || {}))
    })
    setOpenWeeks(prev => ({ ...prev, [currentWeek]: true }))
    return () => { if (u1) u1(); if (u2) u2() }
  }, [])

  // ── Derived ──
  const totalKmDone = [
    ...Object.values(allWorkouts).filter(w => w && typeof w === 'object' && !w._migrated),
    ...Object.values(freeRuns),
  ].reduce((s, w) => s + (parseFloat(w?.distance) || 0), 0)

  // Current plan-week date window (Sunday-to-Saturday based on PLAN_START offset)
  const weekStartDate = useMemo(() => {
    const d = new Date(PLAN_START)
    d.setDate(d.getDate() + (currentWeek - 1) * 7)
    d.setHours(0, 0, 0, 0)
    return d
  }, [currentWeek])
  const weekEndDate = useMemo(() => {
    const d = new Date(weekStartDate)
    d.setDate(d.getDate() + 7)
    return d
  }, [weekStartDate])

  // Free runs (manual extra runs) that fall inside the current plan week
  const freeRunsThisWeek = useMemo(() => {
    return Object.values(freeRuns).filter(r => {
      if (!r?.date) return false
      const d = new Date(r.date)
      return d >= weekStartDate && d < weekEndDate
    })
  }, [freeRuns, weekStartDate, weekEndDate])

  const plannedKmDone = weekData?.workouts.reduce((s,w) => {
    const k = wKey(currentWeek, w.day)
    return s + (parseFloat(allWorkouts[k]?.distance) || 0)
  }, 0) || 0
  const freeKmDone = freeRunsThisWeek.reduce((s, r) => s + (parseFloat(r.distance) || 0), 0)
  const weekKm = plannedKmDone + freeKmDone

  const plannedDoneCount = weekData?.workouts.filter(w => allWorkouts[wKey(currentWeek, w.day)]).length || 0
  const weekDone = plannedDoneCount + freeRunsThisWeek.length

  const goalPct  = Math.min(100, (totalKmDone / TOTAL_PLAN_KM) * 100)
  const plannedKm = weekData ? weekTotalKm(weekData) : 0
  const loadRatio = plannedKm > 0 ? weekKm / plannedKm : 0
  const loadInfo = loadRatio < 0.5
    ? { label:'🟢 נמוך',    color:C.green,  pct:Math.max(8, loadRatio*200) }
    : loadRatio <= 1.1
    ? { label:'🟠 אופטימלי',color:C.accent, pct:Math.min(95, loadRatio*85) }
    : { label:'🔴 גבוה',    color:C.red,    pct:100 }

  // ── Streak calculation (consecutive recent done workouts) ──
  const streak = useMemo(() => {
    const all = [
      ...Object.entries(allWorkouts)
        .filter(([k,v]) => v && typeof v === 'object' && !k.startsWith('_') && v.completedAt)
        .map(([,v]) => ({ date: new Date(v.completedAt) })),
      ...Object.values(freeRuns).filter(r => r?.date).map(r => ({ date: new Date(r.date) })),
    ].sort((a,b) => b.date - a.date)
    if (!all.length) return 0
    // Count entries within the last 14 days sliding window (simple proxy)
    const cutoff = Date.now() - 14 * 86400000
    return all.filter(e => e.date.getTime() > cutoff).length
  }, [allWorkouts, freeRuns])

  // ── Planned workout modal ──
  function openModal(weekNum, day, isEdit=false) {
    const planned = PLAN[weekNum-1]?.workouts.find(w => w.day===day)
    if (!planned) return
    const ex = allWorkouts[wKey(weekNum, day)]
    let initMin='', initSec=''
    if (ex?.timeStr) { const [m,s]=ex.timeStr.split(':'); initMin=m||''; initSec=s||'' }
    setForm({ dist:ex?.distance||'', min:initMin, sec:initSec, hr:ex?.hr||'', power:ex?.power||'', effort:ex?.effort||'5', notes:ex?.notes||'' })
    setFeedback(null)
    setModal({ weekNum, day, planned, isEdit })
  }

  async function savePlanned() {
    const dist = parseFloat(form.dist)
    if (!dist || dist <= 0) { alert('נא להזין מרחק'); return }
    const mins = parseInt(form.min)||0, secs = Math.min(59, parseInt(form.sec)||0)
    const timeStr = (mins||secs) ? `${mins}:${secs.toString().padStart(2,'0')}` : null
    const timeMin = timeStr ? mins + secs/60 : null
    const hr = parseInt(form.hr)||null, power = parseInt(form.power)||null, effort = parseInt(form.effort)
    setSaving(true)
    const fb = generateFeedback(modal.planned.type, modal.planned.dist, { distance:dist, hr, effort, timeMin })
    const data = { distance:dist.toString(), timeStr, timeMin:timeMin?.toString()||null, hr:hr?.toString()||null, power:power?.toString()||null, effort:effort.toString(), notes:form.notes||null, feedback:fb, completedAt:new Date().toISOString(), plannedDist:modal.planned.dist, plannedType:modal.planned.type }
    try {
      await set(ref(db, `${DB_PATH}/${wKey(modal.weekNum, modal.day)}`), data)
      setFeedback(fb)
    } catch(e) { alert(`שגיאה: ${e?.message}`) }
    setSaving(false)
  }

  // ── Free run modal ──
  function openFreeModal(id=null) {
    if (id && freeRuns[id]) {
      const r = freeRuns[id]
      let initMin='', initSec=''
      if (r.timeStr) { const [m,s]=r.timeStr.split(':'); initMin=m||''; initSec=s||'' }
      setFreeForm({ date:isoToDateInput(r.date), type:r.type||'easy', dist:r.distance||'', min:initMin, sec:initSec, hr:r.hr||'', power:r.power||'', effort:r.effort||'5', notes:r.notes||'' })
      setFreeModal({ id })
    } else {
      setFreeForm({ date:new Date().toISOString().slice(0,10), type:'easy', dist:'', min:'', sec:'', hr:'', power:'', effort:'5', notes:'' })
      setFreeModal({ id:null })
    }
    setFeedback(null)
  }

  async function saveFreeRun() {
    const dist = parseFloat(freeForm.dist)
    if (!dist || dist <= 0) { alert('נא להזין מרחק'); return }
    if (!freeForm.date) { alert('נא לבחור תאריך'); return }
    const mins = parseInt(freeForm.min)||0, secs = Math.min(59, parseInt(freeForm.sec)||0)
    const timeStr = (mins||secs) ? `${mins}:${secs.toString().padStart(2,'0')}` : null
    const timeMin = timeStr ? mins + secs/60 : null
    const hr = parseInt(freeForm.hr)||null, power = parseInt(freeForm.power)||null, effort = parseInt(freeForm.effort)
    setSaving(true)
    const data = { date:freeForm.date, type:freeForm.type||'easy', distance:dist.toString(), timeStr, timeMin:timeMin?.toString()||null, hr:hr?.toString()||null, power:power?.toString()||null, effort:effort.toString(), notes:freeForm.notes||null, savedAt:new Date().toISOString(), isFree:true }
    try {
      if (freeModal.id) {
        await set(ref(db, `${FREE_PATH}/${freeModal.id}`), data)
      } else {
        await push(ref(db, FREE_PATH), data)
      }
      setFreeModal(null)
    } catch(e) { alert(`שגיאה: ${e?.message}`) }
    setSaving(false)
  }

  async function deleteFreeRun(id) {
    if (!window.confirm('למחוק ריצה זו?')) return
    await remove(ref(db, `${FREE_PATH}/${id}`))
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:C.font, direction:'rtl', color:C.text, position:'relative' }}>
      <style>{GLOBAL_CSS}</style>
      <BackgroundBlobs />

      {/* ── Header ── */}
      <BaronsHeader
        title="מרתון ברלין 2026"
        subtitle={`שבוע ${currentWeek} מתוך 28 · ${daysLeft ?? '—'} ימים`}
        breadcrumbs={[{ label: 'מרתון', path: '/marathon' }]}
        tabs={[
          { id: 'dashboard', label: 'דשבורד' },
          { id: 'plan',      label: 'תוכנית' },
          { id: 'history',   label: 'היסטוריה' },
        ]}
        activeTab={tab}
        onTab={setTab}
        actions={[]}
      />

      <div style={{ maxWidth:440, margin:'0 auto', padding:'12px 12px 90px', position:'relative', zIndex:1 }}>

        <div style={{
          opacity: tabPhase === 'out' ? 0 : 1,
          filter: tabPhase === 'out' ? 'blur(4px)' : 'blur(0)',
          transform: tabPhase === 'out' ? 'translateY(4px)' : 'translateY(0)',
          transition: `opacity 220ms ${EASE.out}, filter 220ms ${EASE.out}, transform 220ms ${EASE.out}`,
        }}>

          {/* ════ DASHBOARD ════ */}
          {displayTab === 'dashboard' && (
            <DashboardTab
              key="dash"
              loaded={loaded}
              currentWeek={currentWeek}
              daysLeft={daysLeft}
              weekData={weekData}
              weekDone={weekDone}
              weekKm={weekKm}
              totalKmDone={totalKmDone}
              goalPct={goalPct}
              plannedKm={plannedKm}
              loadInfo={loadInfo}
              allWorkouts={allWorkouts}
              canWrite={canWrite}
              openModal={openModal}
              openFreeModal={openFreeModal}
              streak={streak}
            />
          )}

          {/* ════ PLAN ════ */}
          {displayTab === 'plan' && (
            <PlanTab
              key="plan"
              currentWeek={currentWeek}
              allWorkouts={allWorkouts}
              canWrite={canWrite}
              openModal={openModal}
              openWeeks={openWeeks}
              setOpenWeeks={setOpenWeeks}
            />
          )}

          {/* ════ HISTORY ════ */}
          {displayTab === 'history' && (
            <HistoryTab
              key="hist"
              allWorkouts={allWorkouts}
              freeRuns={freeRuns}
              canWrite={canWrite}
              openModal={openModal}
              openFreeModal={openFreeModal}
              deleteFreeRun={deleteFreeRun}
            />
          )}
        </div>
      </div>

      {/* ── Planned workout modal ── */}
      {modal && canWrite && (
        <Modal onClose={() => { setModal(null); setFeedback(null) }}>
          <div style={{ fontSize:17, fontWeight:700, marginBottom:2 }}>{modal.isEdit?'ערוך אימון':'רשום אימון'}</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:16 }}>שבוע {modal.weekNum} · {DAY_NAMES[modal.day]} · {fmtDate(getWorkoutDate(modal.weekNum,modal.day))}</div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:18 }}>
            {[{val:modal.planned.dist,lbl:'ק"מ מתוכנן'},{val:TYPE_NAMES[modal.planned.type],lbl:'סוג'},{val:(HR_ZONES[modal.planned.type]||HR_ZONES.easy).z,lbl:'אזור דופק'}].map((b,i)=>(
              <div key={b.lbl} style={{
                background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`,
                borderRadius:9, padding:'8px 10px', textAlign:'center',
                opacity: 0,
                animation: `mFadeUp 360ms ${EASE.out} forwards`,
                animationDelay: `${60 + i * 40}ms`,
              }}>
                <div style={{ fontFamily:C.mono, fontSize:15, fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{b.val}</div>
                <div style={{ fontSize:10, color:C.muted }}>{b.lbl}</div>
              </div>
            ))}
          </div>

          <WorkoutFormFields form={form} setForm={setForm} baseDelay={200} />

          <button onClick={savePlanned} disabled={saving} className="m-btn" style={saving?Btn.savingPrimary:Btn.savePrimary}>
            {saving?'שומר...':'✓ שמור אימון'}
          </button>
          <button onClick={() => { setModal(null); setFeedback(null) }} className="m-btn" style={Btn.cancel}>ביטול</button>

          {feedback && <FeedbackBox lines={feedback} />}
        </Modal>
      )}

      {/* ── Free run modal ── */}
      {freeModal !== null && canWrite && (
        <Modal onClose={() => setFreeModal(null)}>
          <div style={{ fontSize:17, fontWeight:700, marginBottom:2 }}>
            {freeModal.id ? 'ערוך ריצה חופשית' : '+ ריצה חופשית'}
          </div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:16 }}>ריצה שלא חלק מהתוכנית המובנית</div>

          <Field label="תאריך" delay={60}>
            <input className="m-input" type="date" value={freeForm.date} onChange={e=>setFreeForm(f=>({...f,date:e.target.value}))} style={{ ...inputStyle, fontSize:16, fontFamily:C.font, direction:'ltr' }} />
          </Field>

          <Field label="סוג ריצה" delay={100}>
            <select className="m-input" value={freeForm.type} onChange={e=>setFreeForm(f=>({...f,type:e.target.value}))} style={{ ...inputStyle, fontSize:15, fontFamily:C.font, direction:'rtl', textAlign:'right', cursor:'pointer' }}>
              <option value="easy">🟢 קל</option>
              <option value="tempo">🟠 טמפו</option>
              <option value="intervals">🔴 אינטרוולים</option>
              <option value="long">🔵 ארוך</option>
              <option value="free">🏃 חופשי</option>
            </select>
          </Field>

          <WorkoutFormFields form={freeForm} setForm={setFreeForm} baseDelay={140} />

          <button onClick={saveFreeRun} disabled={saving} className="m-btn" style={saving?Btn.savingPrimary:Btn.savePrimary}>
            {saving?'שומר...':'✓ שמור ריצה'}
          </button>
          <button onClick={() => setFreeModal(null)} className="m-btn" style={Btn.cancel}>ביטול</button>
        </Modal>
      )}
    </div>
  )
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab({
  loaded, currentWeek, daysLeft, weekData, weekDone, weekKm,
  totalKmDone, goalPct, plannedKm, loadInfo, allWorkouts,
  canWrite, openModal, openFreeModal, streak,
}) {
  const isRaceWeek = currentWeek >= 28
  const daysCount = useCountUp(daysLeft, { duration: 1100, delay: 120 })
  const totalKmCount = useCountUp(totalKmDone, { duration: 900, delay: 60 })
  const weekKmCount  = useCountUp(weekKm, { duration: 900, decimals: 1, delay: 120 })
  const weekDoneCount = useCountUp(weekDone, { duration: 700, delay: 180 })
  const loadPctAnimated = useCountUp(loadInfo.pct, { duration: 900, delay: 260 })

  if (!loaded) {
    return (
      <>
        <Skeleton height={120} />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:10 }}>
          <Skeleton height={60} style={{ marginBottom: 0 }} />
          <Skeleton height={60} style={{ marginBottom: 0 }} />
          <Skeleton height={60} style={{ marginBottom: 0 }} />
        </div>
        <Skeleton height={240} />
        <Skeleton height={80} />
      </>
    )
  }

  const stats = [
    { v: `${weekDoneCount}/${weekData?.workouts.length||0}`, l:'אימונים השבוע', dot: weekDone > 0 },
    { v: weekKmCount, l:'ק"מ השבוע', dot: weekKm > 0 },
    { v: totalKmCount, l:'ק"מ סה"כ', dot: totalKmDone > 0 },
  ]

  return (
    <>
      {/* Goal card */}
      <div style={{
        background:'linear-gradient(135deg,rgba(255,85,0,0.14) 0%,rgba(17,13,24,0.85) 100%)',
        border:`1px solid rgba(255,85,0,${isRaceWeek ? 0.55 : 0.28})`,
        borderRadius:16,
        padding:18,
        marginBottom:12,
        backdropFilter:'blur(12px)',
        position:'relative',
        overflow:'hidden',
        opacity: 0,
        animation: `mFadeUp 520ms ${EASE.out} forwards${isRaceWeek ? ', mRingPulse 2.8s ease-in-out infinite 520ms' : ''}`,
        boxShadow: '0 12px 36px -18px rgba(255,85,0,0.45), 0 2px 0 rgba(255,255,255,0.04) inset',
      }}>
        {/* Background 42.2 with float */}
        <div aria-hidden style={{
          position:'absolute', fontFamily:C.mono, fontSize:92, fontWeight:700,
          color:'rgba(255,85,0,0.07)', left:-10, bottom:-20, lineHeight:1,
          pointerEvents:'none',
          animation: `mHeroFloat 6s ${EASE.inOut} infinite`,
          letterSpacing: '-0.02em',
        }}>42.2</div>

        {/* Orange glow gradient */}
        <div aria-hidden style={{
          position:'absolute', top:-60, right:-60, width:200, height:200,
          background:'radial-gradient(circle, rgba(255,85,0,0.25), rgba(255,85,0,0) 70%)',
          pointerEvents:'none', filter:'blur(20px)',
        }}/>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12, position:'relative' }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,85,0,0.75)', letterSpacing:'0.16em', textTransform:'uppercase' }}>מטרה</div>
            <div style={{ fontSize:17, fontWeight:700, marginTop:2 }}>BMW Berlin Marathon</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:1 }}>27.09.2026</div>
          </div>
          <div style={{ textAlign:'left' }}>
            <div style={{
              fontFamily:C.mono, fontSize:28, fontWeight:700, color:C.accent, lineHeight:1,
              fontVariantNumeric:'tabular-nums',
              animation: `mGoalPulse 3.2s ${EASE.inOut} infinite`,
            }}>4:00</div>
            <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>יעד</div>
          </div>
        </div>

        {/* Days countdown — prominent */}
        <div style={{
          display:'flex', alignItems:'baseline', gap:8, marginBottom:12, position:'relative',
        }}>
          <div style={{
            fontFamily:C.mono, fontSize:32, fontWeight:700, color:C.text, lineHeight:1,
            fontVariantNumeric:'tabular-nums',
            textShadow: '0 0 24px rgba(255,255,255,0.12)',
          }}>{daysCount}</div>
          <div style={{ fontSize:12, color:C.muted, fontWeight:600 }}>ימים למרוץ</div>
          {streak >= 3 && (
            <div style={{
              marginRight:'auto',
              display:'inline-flex', alignItems:'center', gap:4,
              background:'rgba(255,85,0,0.15)', color:C.accent,
              padding:'3px 9px', borderRadius:999, fontSize:11, fontWeight:700,
              border:'1px solid rgba(255,85,0,0.3)',
            }}>
              <span style={{ display:'inline-block', animation:`mFire 1.4s ${EASE.inOut} infinite` }}>🔥</span>
              {streak} רצף
            </div>
          )}
        </div>

        {/* Progress bar with shimmer */}
        <div style={{
          height:7, background:'rgba(255,255,255,0.08)', borderRadius:4,
          overflow:'hidden', marginBottom:6, position:'relative',
        }}>
          <div style={{
            width:`${goalPct}%`, height:'100%',
            background:`linear-gradient(90deg,${C.accent},#ff8c42)`,
            borderRadius:4,
            transition:`width 900ms ${EASE.out}`,
            position:'relative',
            boxShadow:'0 0 12px rgba(255,85,0,0.5)',
          }}>
            <div aria-hidden style={{
              position:'absolute', inset:0, borderRadius:4,
              background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
              animation:`mShimmer 2.4s ${EASE.inOut} infinite`,
            }}/>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:C.muted, fontVariantNumeric:'tabular-nums' }}>
          <span>{totalKmCount} ק"מ סה"כ</span><span>{goalPct.toFixed(0)}%</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
        {stats.map((s, i) => (
          <div key={s.l} className="m-stat" style={{
            background:'rgba(255,255,255,0.04)',
            border:`1px solid ${C.border}`,
            borderRadius:12,
            padding:'12px 8px',
            textAlign:'center',
            position:'relative',
            opacity: 0,
            animation: `mFadeUp 420ms ${EASE.out} forwards`,
            animationDelay: `${80 + i * 60}ms`,
          }}>
            {s.dot && (
              <span aria-hidden style={{
                position:'absolute', top:8, right:8, width:6, height:6, borderRadius:'50%',
                background:C.accent, boxShadow:`0 0 8px ${C.accent}`,
                animation:`mDotPulse 2s ${EASE.inOut} infinite`,
              }}/>
            )}
            <div style={{ fontFamily:C.mono, fontSize:19, fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{s.v}</div>
            <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* This week */}
      <Card style={{
        opacity: 0,
        animation: `mFadeUp 460ms ${EASE.out} 180ms forwards`,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <CardTitle style={{ margin:0 }}>אימוני השבוע — שבוע {currentWeek}</CardTitle>
          {canWrite && (
            <button
              onClick={() => openFreeModal()}
              className="m-btn"
              style={{
                background:'rgba(255,85,0,0.15)',
                border:`1px solid rgba(255,85,0,0.35)`,
                color:C.accent,
                borderRadius:8,
                padding:'5px 11px',
                fontSize:11,
                fontWeight:700,
                fontFamily:C.font,
                cursor:'pointer',
              }}>
              + ריצה חופשית
            </button>
          )}
        </div>
        {weekData?.workouts.map((w, idx) => {
          const key = wKey(currentWeek, w.day)
          const done = allWorkouts[key]
          const today = isToday(currentWeek, w.day)
          const past  = isPast(currentWeek, w.day)
          const wDate = getWorkoutDate(currentWeek, w.day)
          const isLong = w.type === 'long' && w.dist > 20
          const col = TYPE_COLORS[w.type] || TYPE_COLORS.free
          return (
            <div
              key={w.day}
              className="m-row"
              onClick={() => canWrite && !done && openModal(currentWeek, w.day)}
              style={{
                display:'flex',
                alignItems:'center',
                gap:10,
                padding:'11px 10px',
                borderRadius:10,
                marginBottom:4,
                borderBottom: idx === weekData.workouts.length - 1 ? 'none' : `1px solid ${C.border}`,
                background: today ? 'rgba(255,85,0,0.08)' : isLong ? 'rgba(129,140,248,0.05)' : 'transparent',
                cursor: canWrite && !done ? 'pointer' : 'default',
                position:'relative',
                opacity: 0,
                animation: `mFadeUp 380ms ${EASE.out} forwards`,
                animationDelay: `${240 + idx * 50}ms`,
                ...(today ? { animationName: 'mFadeUp, mTodayPulse', animationDuration: '380ms, 2.6s', animationIterationCount: '1, infinite', animationDelay: `${240 + idx * 50}ms, ${240 + idx * 50 + 380}ms`, animationTimingFunction: `${EASE.out}, ${EASE.inOut}` } : {}),
              }}>
              <div className="m-type-icon" style={{
                fontSize:22, width:36, textAlign:'center', flexShrink:0,
                filter: today ? `drop-shadow(0 0 8px ${col.glow})` : 'none',
              }}>{TYPE_ICONS[w.type]}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, color:C.muted, fontVariantNumeric:'tabular-nums' }}>
                  {DAY_NAMES[w.day]} · {fmtDate(wDate)}
                  {isLong && <span style={{ color:C.indigo, marginInlineStart:6 }}>· ריצה ארוכה</span>}
                </div>
                <div style={{ fontSize:14, fontWeight:600, marginTop:1 }}>
                  {TYPE_NAMES[w.type]}{w.notes?` · ${w.notes}`:''}
                </div>
                <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, fontVariantNumeric:'tabular-nums' }}>{w.dist} ק"מ</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                {done ? (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:6, color:C.green, fontSize:12, fontWeight:600, fontVariantNumeric:'tabular-nums' }}>
                      <span style={{
                        width:18, height:18, borderRadius:'50%',
                        background:C.green, color:'#000',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:9, fontWeight:900,
                        boxShadow:'0 0 12px rgba(34,197,94,0.55)',
                        animation:`mCheckPop 480ms ${EASE.spring} both`,
                      }}>✓</span>
                      {parseFloat(done.distance).toFixed(1)} ק"מ
                    </div>
                    {done.hr && <div style={{ fontFamily:C.mono, fontSize:10, color:C.muted, fontVariantNumeric:'tabular-nums' }}>♥ {done.hr}</div>}
                    {canWrite && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openModal(currentWeek, w.day, true) }}
                        className="m-btn"
                        style={Btn.small}>ערוך</button>
                    )}
                  </>
                ) : canWrite ? (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); openModal(currentWeek, w.day) }}
                      className="m-btn"
                      style={Btn.primary}>+ רשום</button>
                    <div style={{ fontSize:11, color: today ? C.accent : past ? C.amber : C.muted, fontWeight: today ? 700 : 400 }}>
                      {today ? 'היום!' : past ? '⚠️ לא בוצע' : fmtDate(wDate)}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize:11, color:C.muted }}>{fmtDate(wDate)}</div>
                )}
              </div>
            </div>
          )
        })}
      </Card>

      {/* Load */}
      <Card style={{
        opacity: 0,
        animation: `mFadeUp 460ms ${EASE.out} 260ms forwards`,
      }}>
        <CardTitle>עומס אימונים</CardTitle>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, height:7, background:'rgba(255,255,255,0.08)', borderRadius:4, overflow:'hidden', position:'relative' }}>
            <div style={{
              width:`${loadPctAnimated}%`, height:'100%',
              background:loadInfo.color, borderRadius:4,
              transition:`width 900ms ${EASE.out}, background-color 400ms ${EASE.out}`,
              boxShadow:`0 0 10px ${loadInfo.color}88`,
              position:'relative',
            }}>
              <div aria-hidden style={{
                position:'absolute', inset:0,
                background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                animation:`mShimmer 2.8s ${EASE.inOut} infinite`,
              }}/>
            </div>
          </div>
          <span style={{
            fontSize:12, fontWeight:700, color:loadInfo.color, whiteSpace:'nowrap',
            transition:`color 400ms ${EASE.out}`,
          }}>{loadInfo.label}</span>
        </div>
        <div style={{ fontSize:12, color:C.muted, marginTop:8, fontVariantNumeric:'tabular-nums' }}>
          {weekKmCount} / {plannedKm} ק"מ מתוכננים השבוע
        </div>
      </Card>

      {/* Alerts */}
      <Alerts weekData={weekData} currentWeek={currentWeek} allWorkouts={allWorkouts} />

      {/* Coaching */}
      {currentWeek > 1 && (() => {
        const pw = currentWeek-1, pd = PLAN[pw-1]
        if (!pd) return null
        const completed = pd.workouts.map(w => { const k=wKey(pw,w.day); return allWorkouts[k]?{...w,...allWorkouts[k]}:null }).filter(Boolean)
        if (!completed.length) return null
        const lines = genCoaching(pw, completed, pd.workouts)
        return (
          <Card style={{
            opacity: 0,
            animation: `mFadeUp 500ms ${EASE.out} 380ms forwards`,
          }}>
            <CardTitle>סיכום מאמן — שבוע {pw}</CardTitle>
            {lines.map((l,i) => (
              <div key={i} style={{
                fontSize:13, lineHeight:1.7, padding:'2px 0',
                opacity: 0,
                animation: `mSlideRight 420ms ${EASE.out} forwards`,
                animationDelay: `${500 + i * 80}ms`,
              }}>{l}</div>
            ))}
          </Card>
        )
      })()}
    </>
  )
}

// ─── Plan Tab ─────────────────────────────────────────────────────────────────
function PlanTab({ currentWeek, allWorkouts, canWrite, openModal, openWeeks, setOpenWeeks }) {
  const guideRows = [
    { icon:'🟢', label:'קל / ארוך',  pace:'7:00–7:45 /ק"מ', hr:'דופק 109–127 | Zone 2' },
    { icon:'🟠', label:'טמפו',        pace:'5:30–5:50 /ק"מ', hr:'דופק 145–163 | Zone 3–4' },
    { icon:'🔴', label:'אינטרוולים',  pace:'5:00–5:20 /ק"מ', hr:'דופק 163+ | Zone 4–5' },
    { icon:'🏆', label:'מרתון',       pace:'5:41 /ק"מ',      hr:'דופק 140–155 | Zone 3' },
  ]

  return (
    <>
      <Card style={{
        opacity: 0,
        animation: `mFadeUp 460ms ${EASE.out} forwards`,
      }}>
        <CardTitle>מדריך קצב ודופק</CardTitle>
        {guideRows.map((r, i) => (
          <div key={r.label} className="m-plan-row" style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'9px 8px', borderBottom: i === guideRows.length - 1 ? 'none' : `1px solid ${C.border}`,
            borderRadius: 6,
            transition: `background-color 200ms ${EASE.out}`,
            opacity: 0,
            animation: `mFadeUp 380ms ${EASE.out} forwards`,
            animationDelay: `${100 + i * 50}ms`,
          }}>
            <span style={{ fontSize:13, color:C.muted }}>{r.icon} {r.label}</span>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontFamily:C.mono, fontSize:12, fontVariantNumeric:'tabular-nums' }}>{r.pace}</div>
              <div style={{ fontSize:11, color:C.muted }}>{r.hr}</div>
            </div>
          </div>
        ))}
      </Card>

      {PLAN.map((wd, wIdx) => {
        const { week, workouts } = wd
        const isCurrent = week === currentWeek
        const isDone = week < currentWeek && workouts.every(w => allWorkouts[wKey(week,w.day)])
        const isRace = week === 28
        const completedCount = workouts.filter(w => allWorkouts[wKey(week,w.day)]).length
        const isOpen = openWeeks[week]
        const weekStart = new Date(PLAN_START); weekStart.setDate(PLAN_START.getDate()+(week-1)*7)

        return (
          <div key={week} style={{
            marginBottom: 5,
            opacity: 0,
            animation: `mFadeUp 360ms ${EASE.out} forwards`,
            animationDelay: `${200 + Math.min(wIdx * 30, 500)}ms`,
          }}>
            <div
              onClick={() => setOpenWeeks(p => ({...p,[week]:!p[week]}))}
              className="m-row"
              style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'11px 13px',
                background: isRace
                  ? 'linear-gradient(90deg,rgba(245,197,66,0.1),rgba(255,85,0,0.08))'
                  : isCurrent
                  ? 'rgba(255,85,0,0.08)'
                  : C.card,
                border: `1px solid ${
                  isRace ? 'rgba(245,197,66,0.5)' :
                  isCurrent ? 'rgba(255,85,0,0.4)' :
                  isDone ? 'rgba(34,197,94,0.25)' : C.border
                }`,
                borderRadius: isOpen ? '10px 10px 0 0' : 10,
                cursor:'pointer',
                backdropFilter:'blur(12px)',
                position:'relative',
                overflow:'hidden',
                ...(isCurrent ? { animation:`mRingPulse 3s ${EASE.inOut} infinite` } : {}),
                ...(isRace ? { boxShadow:'0 0 20px -6px rgba(245,197,66,0.35)' } : {}),
              }}>
              {isRace && (
                <div aria-hidden style={{
                  position:'absolute', inset:0,
                  background:'linear-gradient(90deg, transparent, rgba(245,197,66,0.15), transparent)',
                  backgroundSize:'200% 100%',
                  animation:`mGoldShimmer 3.6s ${EASE.inOut} infinite`,
                  pointerEvents:'none',
                }}/>
              )}
              <span style={{ fontFamily:C.mono, fontSize:11, color:isRace ? C.gold : C.muted, minWidth:22, fontVariantNumeric:'tabular-nums', fontWeight:700 }}>{week}</span>
              <span style={{ flex:1, fontSize:13, fontWeight:600, position:'relative' }}>
                {isRace ? '🏆 מרוץ ברלין!' : `שבוע ${week}`}
                {isCurrent && !isRace && (
                  <span style={{
                    marginInlineStart:6, color:C.accent, fontSize:11, fontWeight:700,
                    animation:`mBadgePulse 2.2s ${EASE.inOut} infinite`,
                    display:'inline-block',
                  }}>← עכשיו</span>
                )}
                {isDone && <span style={{ marginInlineStart:6, color:C.green, fontSize:12 }}>✓</span>}
              </span>
              <span style={{ fontFamily:C.mono, fontSize:12, color: isRace ? C.gold : C.accent, fontVariantNumeric:'tabular-nums', position:'relative' }}>{weekTotalKm(wd)} ק"מ</span>
              <span style={{
                color:C.muted, fontSize:11,
                transition:`transform 220ms ${EASE.out}`,
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0)',
                display:'inline-block',
              }}>›</span>
            </div>
            {isOpen && (
              <div style={{
                background:C.card2, border:`1px solid ${C.border}`, borderTop:'none',
                borderRadius:'0 0 10px 10px', padding:'6px 13px 12px', backdropFilter:'blur(12px)',
                animation:`mFadeIn 260ms ${EASE.out}`,
              }}>
                <div style={{ fontSize:11, color:C.muted, padding:'6px 0 4px' }}>{fmtDate(weekStart)} · {completedCount}/{workouts.length} אימונים</div>
                {workouts.map((w, i) => {
                  const done = allWorkouts[wKey(week,w.day)]
                  return (
                    <div key={w.day} className="m-plan-row" style={{
                      display:'flex', alignItems:'center', gap:8,
                      padding:'8px 6px',
                      borderBottom:i === workouts.length - 1 ? 'none' : `1px solid ${C.border}`,
                      fontSize:13, borderRadius:6,
                      opacity: 0,
                      animation: `mFadeUp 320ms ${EASE.out} forwards`,
                      animationDelay: `${i * 40}ms`,
                    }}>
                      <span style={{ color:C.muted, minWidth:38, fontSize:12 }}>{DAY_NAMES[w.day]}</span>
                      <TypeBadge type={w.type} />
                      {w.notes && <span style={{ fontSize:11, color:C.muted }}>{w.notes}</span>}
                      <span style={{ fontFamily:C.mono, fontSize:12, marginRight:'auto', fontVariantNumeric:'tabular-nums' }}>{w.dist} ק"מ</span>
                      {done
                        ? <span style={{
                            color:C.green, fontSize:12, fontVariantNumeric:'tabular-nums',
                            animation:`mCheckPop 480ms ${EASE.spring} both`,
                          }}>✓ {parseFloat(done.distance).toFixed(1)}</span>
                        : (week <= currentWeek && canWrite)
                          ? <button onClick={() => openModal(week,w.day)} className="m-btn" style={Btn.tiny}>רשום</button>
                          : null
                      }
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

// ─── Weekly coaching (extracted) ──────────────────────────────────────────────
function genCoaching(weekNum, completed, plannedWorkouts) {
  const lines = []
  const done = completed.length, planned = plannedWorkouts.length
  if (!done) return ['❌ השבוע לא בוצעו ריצות — נסה לשמור על הרציפות']
  lines.push(done < planned ? `📋 הושלמו ${done} מתוך ${planned} אימונים` : `✅ כל ${done} האימונים בוצעו — שבוע מושלם!`)
  const highHr = completed.filter(w => (w.type==='easy'||w.type==='long') && parseInt(w.hr)>140)
  if (highHr.length) lines.push('⚠️ ריצות קלות בדופק גבוה — אם לא אפשר לדבר, זה לא קל!')
  const km = completed.reduce((s,w)=>s+(parseFloat(w.distance)||0),0)
  const pkm = plannedWorkouts.reduce((s,w)=>s+w.dist,0)
  if (km > pkm*1.2) lines.push('🔥 שבוע עמוס — תן לגוף לנוח')
  else if (km < pkm*0.7) lines.push('💤 שבוע קל מהמתוכנן — נסה לשלם בשבוע הבא')
  else lines.push(`🎯 עומס מאוזן — ${km.toFixed(1)} ק"מ. המשך ככה!`)
  if (weekNum < 7) lines.push('📈 בניית בסיס — אל תמהר. ריצות קלות = השקעה לעתיד')
  if (weekNum >= 26) lines.push('🏁 שלב הטייפר — פחות זה יותר! שמור אנרגיה למרוץ')
  return lines
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
function Alerts({ weekData, currentWeek, allWorkouts }) {
  const alerts = []
  weekData?.workouts.forEach(w => {
    const done = allWorkouts[wKey(currentWeek, w.day)]
    if (done && (w.type==='easy'||w.type==='long') && parseInt(done.hr)>140)
      alerts.push({type:'warn', msg:`⚠️ ריצת ${DAY_NAMES[w.day]} — דופק ${done.hr} גבוה! Zone 2 = 109–127 bpm`})
  })
  const missed = weekData?.workouts.filter(w=>!allWorkouts[wKey(currentWeek,w.day)]&&isPast(currentWeek,w.day)).length||0
  if (missed) alerts.push({type:'info', msg:`📅 ${missed} אימון${missed>1?'ים':''} טרם תועד${missed>1?'ו':''} — אפשר לרשום בדיעבד`})
  if (currentWeek>=26) alerts.push({type:'ok', msg:'🏁 שלב הטייפר! עכשיו נח יותר ממה שרץ'})
  alerts.push({type:'warn', msg:'☀️ חום ישראלי — רוץ בבוקר מוקדם, שתה הרבה, הדופק יהיה גבוה יותר'})
  const cols = {
    warn:{bg:'rgba(255,184,0,0.08)',b:'rgba(255,184,0,0.28)',c:'#FFB800'},
    info:{bg:'rgba(129,140,248,0.08)',b:'rgba(129,140,248,0.28)',c:'#818cf8'},
    ok:  {bg:'rgba(34,197,94,0.08)', b:'rgba(34,197,94,0.28)', c:'#22c55e'},
  }
  return alerts.map((a,i) => {
    const cl = cols[a.type]
    return (
      <div key={i} style={{
        background:cl.bg, border:`1px solid ${cl.b}`, color:cl.c,
        borderRadius:10, padding:'11px 13px', marginBottom:8,
        fontSize:13, lineHeight:1.55,
        opacity: 0,
        animation: `mFadeUp 400ms ${EASE.out} forwards`,
        animationDelay: `${320 + i * 60}ms`,
      }}>{a.msg}</div>
    )
  })
}

// ─── History tab ──────────────────────────────────────────────────────────────
function HistoryTab({ allWorkouts, freeRuns, canWrite, openModal, openFreeModal, deleteFreeRun }) {
  const entries = []

  PLAN.forEach(wd => {
    wd.workouts.forEach(w => {
      const key = wKey(wd.week, w.day)
      const done = allWorkouts[key]
      if (done && done.distance) entries.push({ isFree:false, week:wd.week, day:w.day, planned:w, done, date:getWorkoutDate(wd.week,w.day) })
    })
  })

  Object.entries(freeRuns).forEach(([id, r]) => {
    if (r && r.distance && r.date) entries.push({ isFree:true, id, done:r, date:new Date(r.date+'T12:00:00') })
  })

  if (!entries.length) return (
    <div style={{
      textAlign:'center', padding:'56px 20px', color:C.muted,
      opacity: 0,
      animation: `mFadeUp 500ms ${EASE.out} forwards`,
    }}>
      <div style={{ fontSize:44, marginBottom:14, animation:`mHeroFloat 4s ${EASE.inOut} infinite` }}>📋</div>
      עדיין אין ריצות מתועדות
    </div>
  )

  entries.sort((a,b) => b.date - a.date)
  const today = new Date(); today.setHours(0,0,0,0)

  return entries.map((e, i) => {
    const { done } = e
    const type  = e.isFree ? (done.type||'free') : e.planned.type
    const label = e.isFree ? (done.notes||'ריצה חופשית') : `${TYPE_NAMES[e.planned.type]}${e.planned.notes?` · ${e.planned.notes}`:''}`
    const pace  = (done.distance && done.timeMin) ? fmtPace(parseFloat(done.distance), parseFloat(done.timeMin)) : ''
    const fb    = done.feedback?.slice(0,2).join(' · ') || ''
    const col   = TYPE_COLORS[type] || TYPE_COLORS.free
    const isTodayEntry = new Date(e.date.getTime()).setHours(0,0,0,0) === today.getTime()

    return (
      <div key={i} className="m-row" style={{
        display:'flex',
        gap:12,
        padding:14,
        background:C.card,
        border:`1px solid ${isTodayEntry ? 'rgba(255,85,0,0.35)' : e.isFree?'rgba(255,255,255,0.06)':C.border}`,
        borderRadius:14,
        marginBottom:8,
        backdropFilter:'blur(12px)',
        boxShadow: isTodayEntry ? '0 0 18px -4px rgba(255,85,0,0.3)' : 'none',
        opacity: 0,
        animation: `mFadeUp 380ms ${EASE.out} forwards`,
        animationDelay: `${Math.min(i * 50, 600)}ms`,
        position:'relative',
      }}>
        <div className="m-type-icon" style={{
          fontSize:22, width:36, paddingTop:2, flexShrink:0,
          filter:`drop-shadow(0 0 6px ${col.glow})`,
        }}>{TYPE_ICONS[type]||'🏃'}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:11, color:C.muted, marginBottom:3 }}>
            {e.isFree ? `🏃 חופשי · ${fmtDateLong(e.date)}` : `שבוע ${e.week} · ${DAY_NAMES[e.day]} · ${fmtDateLong(e.date)}`}
            {isTodayEntry && <span style={{
              marginInlineStart:6, color:C.accent, fontWeight:700,
              animation:`mBadgePulse 2.2s ${EASE.inOut} infinite`,
              display:'inline-block',
            }}>· היום</span>}
          </div>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>{label}</div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {done.distance && <span style={{ fontFamily:C.mono, fontSize:11, color:C.muted, fontVariantNumeric:'tabular-nums' }}><span style={{ color:C.text }}>{parseFloat(done.distance).toFixed(1)}</span> ק"מ</span>}
            {done.hr       && <span style={{ fontFamily:C.mono, fontSize:11, color:C.muted, fontVariantNumeric:'tabular-nums' }}>♥ <span style={{ color:C.text }}>{done.hr}</span></span>}
            {pace          && <span style={{ fontFamily:C.mono, fontSize:11, color:C.muted, fontVariantNumeric:'tabular-nums' }}>⏱ <span style={{ color:C.text }}>{pace}</span></span>}
            {done.power    && <span style={{ fontFamily:C.mono, fontSize:11, color:C.muted, fontVariantNumeric:'tabular-nums' }}>⚡ <span style={{ color:C.text }}>{done.power}W</span></span>}
            {done.effort   && <span style={{ fontFamily:C.mono, fontSize:11, color:C.muted, fontVariantNumeric:'tabular-nums' }}>מאמץ <span style={{ color:C.text }}>{done.effort}/10</span></span>}
          </div>
          {fb && <div style={{ fontSize:12, color:C.muted, marginTop:7, lineHeight:1.5, borderTop:`1px solid ${C.border}`, paddingTop:7 }}>{fb}</div>}
        </div>
        {canWrite && (
          <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
            <button onClick={() => e.isFree ? openFreeModal(e.id) : openModal(e.week, e.day, true)} className="m-btn" style={Btn.tiny}>ערוך</button>
            {e.isFree && <button onClick={() => deleteFreeRun(e.id)} className="m-btn" style={{ ...Btn.tiny, color:C.red, borderColor:'rgba(239,68,68,0.25)' }}>מחק</button>}
          </div>
        )}
      </div>
    )
  })
}

// ─── Shared form fields ───────────────────────────────────────────────────────
function WorkoutFormFields({ form, setForm, baseDelay = 80 }) {
  const hrZone = form.hr ? hrZoneLabel(parseInt(form.hr)) : ''
  return <>
    <Field label="מרחק (ק״מ)" delay={baseDelay}>
      <input className="m-input" type="number" inputMode="decimal" placeholder="0.0" step="0.1" min="0" value={form.dist} onChange={e=>setForm(f=>({...f,dist:e.target.value}))} style={inputStyle} />
    </Field>
    <Field label="זמן ריצה" delay={baseDelay + 40}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 14px 1fr', alignItems:'center', gap:4, direction:'ltr' }}>
        <input className="m-input" type="number" inputMode="numeric" placeholder="35" min="0" max="999" value={form.min} onChange={e=>setForm(f=>({...f,min:e.target.value}))} style={inputStyle} />
        <div style={{ textAlign:'center', fontSize:20, fontWeight:700, color:C.muted }}>:</div>
        <input className="m-input" type="number" inputMode="numeric" placeholder="20" min="0" max="59" value={form.sec} onChange={e=>setForm(f=>({...f,sec:e.target.value}))} style={inputStyle} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 14px 1fr', marginTop:4, direction:'ltr' }}>
        <div style={{ textAlign:'center', fontSize:10, color:C.muted }}>דקות</div><div/><div style={{ textAlign:'center', fontSize:10, color:C.muted }}>שניות</div>
      </div>
    </Field>
    <Field label={`דופק ממוצע (bpm)${hrZone ? ` — ${hrZone}` : ''}`} delay={baseDelay + 80}>
      <input className="m-input" type="number" inputMode="numeric" placeholder="140" value={form.hr} onChange={e=>setForm(f=>({...f,hr:e.target.value}))} style={inputStyle} />
    </Field>
    <Field label="Running Power (ואט) — אופציונלי" delay={baseDelay + 120}>
      <input className="m-input" type="number" inputMode="numeric" placeholder="220" value={form.power} onChange={e=>setForm(f=>({...f,power:e.target.value}))} style={inputStyle} />
    </Field>
    <Field label={`מאמץ סובייקטיבי — ${form.effort||5}/10`} delay={baseDelay + 160}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <input type="range" min="1" max="10" value={form.effort||5} onChange={e=>setForm(f=>({...f,effort:e.target.value}))} style={{ flex:1, accentColor:C.accent, height:4, cursor:'pointer' }} />
        <div style={{
          fontFamily:C.mono, fontSize:22, fontWeight:700, color:C.accent,
          width:26, textAlign:'center', fontVariantNumeric:'tabular-nums',
          transition:`transform 200ms ${EASE.out}`,
        }}>{form.effort||5}</div>
      </div>
    </Field>
    <Field label="הערות (אופציונלי)" delay={baseDelay + 200}>
      <input className="m-input" type="text" placeholder="..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{ ...inputStyle, fontFamily:C.font, fontSize:14, textAlign:'right', direction:'rtl' }} />
    </Field>
  </>
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ children, onClose }) {
  return (
    <div
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}
      style={{
        position:'fixed', inset:0,
        background:'rgba(0,0,0,0.72)',
        backdropFilter:'blur(16px)',
        WebkitBackdropFilter:'blur(16px)',
        zIndex:300,
        display:'flex', alignItems:'flex-end', justifyContent:'center',
        animation:`mBackdropIn 280ms ${EASE.drawer}`,
      }}>
      <div style={{
        background:'linear-gradient(180deg,#0f1e3a 0%,#0b1526 100%)',
        border:`1px solid ${C.border}`,
        borderRadius:'22px 22px 0 0',
        width:'100%', maxWidth:440,
        padding:'18px 20px 34px',
        maxHeight:'92vh', overflowY:'auto',
        fontFamily:C.font, direction:'rtl',
        boxShadow:'0 -20px 60px -10px rgba(0,0,0,0.5)',
        animation:`mModalIn 340ms ${EASE.drawer}`,
      }}>
        <div style={{
          width:42, height:4, background:C.border, borderRadius:2, margin:'0 auto 16px',
        }} />
        {children}
      </div>
    </div>
  )
}

function FeedbackBox({ lines }) {
  return (
    <div style={{
      background:'rgba(255,255,255,0.04)',
      border:`1px solid ${C.border}`,
      borderRadius:12, padding:14, marginTop:16,
      opacity: 0,
      animation:`mFadeUp 460ms ${EASE.out} forwards`,
    }}>
      <div style={{ fontSize:10, fontWeight:700, color:C.accent, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:8 }}>📊 משוב מאמן</div>
      {lines.map((l,i) => (
        <div key={i} style={{
          fontSize:13, lineHeight:1.7, padding:'2px 0',
          opacity: 0,
          animation:`mSlideRight 380ms ${EASE.out} forwards`,
          animationDelay: `${100 + i * 80}ms`,
        }}>{l}</div>
      ))}
    </div>
  )
}

const Btn = {
  primary: {
    background:C.accent, color:'#fff', border:'none', borderRadius:8,
    padding:'7px 13px', fontSize:12, fontWeight:600, fontFamily:C.font,
    cursor:'pointer', whiteSpace:'nowrap',
    boxShadow:'0 4px 14px -4px rgba(255,85,0,0.55)',
  },
  small: {
    background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)',
    border:'1px solid rgba(255,255,255,0.12)', borderRadius:7,
    padding:'4px 10px', fontSize:11, fontFamily:C.font, cursor:'pointer',
  },
  tiny: {
    background:'transparent', color:'rgba(255,255,255,0.5)',
    border:'1px solid rgba(255,255,255,0.14)', borderRadius:6,
    padding:'3px 9px', fontSize:11, fontFamily:C.font, cursor:'pointer',
  },
  savePrimary: {
    width:'100%', background:`linear-gradient(180deg,${C.accent},#e64a00)`,
    border:'none', color:'#fff', borderRadius:12, padding:15,
    fontSize:16, fontWeight:700, fontFamily:C.font, cursor:'pointer',
    marginTop:8, boxShadow:'0 10px 26px -10px rgba(255,85,0,0.65), inset 0 1px 0 rgba(255,255,255,0.25)',
  },
  savingPrimary: {
    width:'100%', background:'rgba(255,85,0,0.4)', border:'none',
    color:'#fff', borderRadius:12, padding:15, fontSize:16,
    fontWeight:700, fontFamily:C.font, cursor:'default', marginTop:8,
  },
  cancel: {
    width:'100%', background:'transparent', border:`1px solid ${C.border}`,
    color:C.muted, borderRadius:12, padding:12, fontSize:14,
    fontWeight:600, fontFamily:C.font, cursor:'pointer', marginTop:8,
  },
}
