import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'
import { initializeApp, getApps } from 'firebase/app'
import { getDatabase, ref, set, update, onValue } from 'firebase/database'

/* ── Firebase ── */
const FB_CONFIG = {
  apiKey: 'AIzaSyCNkfifRX7zgHcIXmAuB0HSSzCfCzsFKjk',
  authDomain: 'shopping-list-855d8.firebaseapp.com',
  databaseURL: 'https://shopping-list-855d8-default-rtdb.firebaseio.com',
  projectId: 'shopping-list-855d8',
  storageBucket: 'shopping-list-855d8.firebasestorage.app',
  messagingSenderId: '467214739172',
  appId: '1:467214739172:web:1c1e46e9072352197f2ef1',
}
const fbApp = getApps().find(a => a.name === 'gym') || initializeApp(FB_CONFIG, 'gym')
const db    = getDatabase(fbApp)
const BASE  = 'gymTracker'
const dbRef = path => ref(db, `${BASE}/${path}`)

/* ── Constants ── */
const CATS = [
  { label: 'חזה' },
  { label: 'גב' },
  { label: 'כתפיים' },
  { label: 'רגליים' },
  { label: 'יד קדמית' },
  { label: 'יד אחורית' },
  { label: 'בטן וגב תחתון' },
  { label: 'אירובי' },
]
const CAT_LABELS = CATS.map(c => c.label)
const UNITS = [['kg', 'ק"ג'], ['plates', 'פלטות'], ['val', 'ערך']]

const uid     = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
const nowStr  = () => new Date().toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
const today   = () => new Date().toLocaleDateString('he-IL')
const timeNow = () => new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
const vibrate = (p) => { try { if (navigator.vibrate) navigator.vibrate(p) } catch(_){} }

/* ── Design tokens — Bright, inviting gym theme ── */
const F = "'Open Sans Hebrew', 'Open Sans', sans-serif"

const C = {
  // Backgrounds — bright + inviting
  bg:         '#f6f8fc',
  bgGrad:     'linear-gradient(180deg, #f6f8fc 0%, #f0f4fb 100%)',
  surface:    '#ffffff',
  surfaceUp:  '#f5f7fb',
  surfaceHi:  '#eef2f9',

  // Borders
  border:     '#e2e8f0',
  borderMid:  '#cbd5e1',
  borderHi:   '#94a3b8',

  // Brand & accent
  accent:     '#3b82f6',
  accentSoft: '#60a5fa',
  accentBg:   'rgba(59,130,246,0.10)',
  accentGlow: 'rgba(59,130,246,0.28)',
  accentDeep: '#1d4ed8',

  // Status colors
  green:      '#16a34a',
  greenSoft:  '#22c55e',
  greenBg:    'rgba(34,197,94,0.12)',
  greenGlow:  'rgba(34,197,94,0.32)',
  red:        '#ef4444',
  redBg:      'rgba(239,68,68,0.10)',
  amber:      '#f59e0b',

  // Text — dark on light
  text:       '#0f172a',
  textMid:    '#475569',
  textDim:    '#94a3b8',

  // Shadows — light shadows for elevation, not glows
  shadow:     '0 4px 24px rgba(15,23,42,0.08)',
  shadowHi:   '0 8px 28px rgba(15,23,42,0.12)',
}

/* ── Button presets ── */
const btn = {
  primary: {
    background: C.accent, color: '#fff', border: 'none',
    borderRadius: 10, padding: '9px 18px', fontFamily: F,
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    boxShadow: `0 0 0 0 ${C.accentGlow}`,
    transition: 'transform 160ms var(--ease-out), box-shadow 200ms var(--ease-out), background 200ms var(--ease-out)',
  },
  outline: {
    background: 'transparent', color: C.accentSoft,
    border: `1px solid ${C.accent}`,
    borderRadius: 10, padding: '8px 16px', fontFamily: F,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    transition: 'background 160ms var(--ease-out), transform 160ms var(--ease-out)',
  },
  ghost: {
    background: '#ffffff', color: C.textMid,
    border: `1px solid ${C.border}`,
    borderRadius: 10, padding: '8px 14px', fontFamily: F,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    transition: 'background 160ms var(--ease-out), color 160ms var(--ease-out), transform 160ms var(--ease-out)',
  },
  danger: {
    background: C.redBg, color: C.red,
    border: `1px solid rgba(239,68,68,0.3)`,
    borderRadius: 10, padding: '8px 14px', fontFamily: F,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    transition: 'background 160ms var(--ease-out), transform 160ms var(--ease-out)',
  },
  sm: { padding: '6px 12px', fontSize: 12 },
}

const inp = {
  base: {
    width: '100%', fontFamily: F, fontSize: 14, direction: 'rtl',
    background: '#ffffff', border: `1px solid ${C.border}`,
    borderRadius: 10, padding: '9px 12px', color: C.text, outline: 'none',
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    transition: 'border-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out)',
  },
}

/* ── Global CSS — Emil-style: custom easings, tactile feedback, no `transition: all` ── */
const GYM_CSS = `
  :root {
    --ease-out:     cubic-bezier(0.23, 1, 0.32, 1);
    --ease-in-out:  cubic-bezier(0.77, 0, 0.175, 1);
    --ease-drawer:  cubic-bezier(0.32, 0.72, 0, 1);
    --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes gymSpin { to { transform: rotate(360deg) } }
  @keyframes gymFadeUp {
    from { opacity: 0; transform: translateY(8px) }
    to   { opacity: 1; transform: translateY(0) }
  }
  @keyframes gymPulse { 0%,100% { opacity: 1 } 50% { opacity: .5 } }
  @keyframes gymDotPulse {
    0%,100% { transform: scale(1); opacity: 1 }
    50%     { transform: scale(1.4); opacity: 0.55 }
  }
  @keyframes setCheckPop {
    0%   { transform: scale(0) rotate(-20deg); opacity: 0 }
    55%  { transform: scale(1.18) rotate(4deg); opacity: 1 }
    100% { transform: scale(1) rotate(0deg); opacity: 1 }
  }
  @keyframes setRingPulse {
    0%   { box-shadow: 0 0 0 0 ${C.greenGlow} }
    100% { box-shadow: 0 0 0 14px rgba(34,197,94,0) }
  }
  @keyframes countBadgePop {
    0%   { transform: scale(1) }
    40%  { transform: scale(1.35) }
    100% { transform: scale(1) }
  }
  @keyframes metaPulse {
    0%   { color: ${C.textMid} }
    35%  { color: ${C.greenSoft} }
    100% { color: ${C.textMid} }
  }
  @keyframes drawerUp {
    from { transform: translateY(100%); opacity: 0 }
    to   { transform: translateY(0);     opacity: 1 }
  }
  @keyframes drawerDown {
    from { transform: translateY(0);     opacity: 1 }
    to   { transform: translateY(100%); opacity: 0 }
  }
  @keyframes edgePulseGreen {
    0%,100% { box-shadow: 0 -8px 28px rgba(34,197,94,0.0), 0 0 0 0 rgba(34,197,94,0.0) }
    50%     { box-shadow: 0 -8px 28px rgba(34,197,94,0.55), 0 0 0 2px rgba(34,197,94,0.5) inset }
  }
  @keyframes confettiBurst {
    0%   { transform: translate(0,0) scale(1);    opacity: 1 }
    100% { transform: translate(var(--cx), var(--cy)) scale(0.2); opacity: 0 }
  }
  @keyframes shimmer { 0% { background-position:200% 0 } 100% { background-position:-200% 0 } }

  .gym-card {
    animation: gymFadeUp 280ms var(--ease-out) both;
  }
  .gym-press {
    transition: transform 160ms var(--ease-out);
    -webkit-tap-highlight-color: transparent;
  }
  .gym-press:active { transform: scale(0.97) }

  @media (hover: hover) and (pointer: fine) {
    .gym-btn-primary:hover  { background: #2563eb; transform: translateY(-1px); box-shadow: 0 6px 22px rgba(59,130,246,0.35) }
    .gym-btn-ghost:hover    { background: ${C.surfaceHi}; color: ${C.text} }
    .gym-btn-danger:hover   { background: rgba(239,68,68,0.16) }
    .gym-btn-outline:hover  { background: rgba(59,130,246,0.08) }
    .gym-row-hover:hover    { background: ${C.surfaceHi} }
    .gym-cat-pill:hover     { background: ${C.surfaceHi}; border-color: ${C.borderMid} }
    .gym-set-circle:hover   { border-color: ${C.borderHi}; background: ${C.surfaceHi} }
    .gym-row-clickable      { transition: background 200ms var(--ease-out); }
    .gym-row-clickable:hover { background: rgba(15,23,42,0.025) }
  }
  .gym-btn-primary:active, .gym-btn-ghost:active, .gym-btn-danger:active, .gym-btn-outline:active { transform: scale(0.97) }

  .gym-input:focus { border-color: ${C.accent}; box-shadow: 0 0 0 3px rgba(59,130,246,0.18) }

  /* Category pill bar — horizontal scroll */
  .gym-pill-bar {
    display: flex; gap: 8px; overflow-x: auto; overflow-y: hidden;
    scroll-snap-type: x proximity;
    padding: 4px 2px 10px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .gym-pill-bar::-webkit-scrollbar { display: none }
  .gym-cat-pill {
    flex: 0 0 auto;
    scroll-snap-align: center;
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 16px;
    border-radius: 999px;
    border: 1px solid ${C.border};
    background: ${C.surface};
    color: ${C.textMid};
    font: 700 13px ${F};
    cursor: pointer;
    white-space: nowrap;
    box-shadow: 0 1px 2px rgba(15,23,42,0.04);
    transition: background 180ms var(--ease-out), border-color 180ms var(--ease-out), color 180ms var(--ease-out), transform 180ms var(--ease-out), box-shadow 220ms var(--ease-out);
    -webkit-tap-highlight-color: transparent;
  }
  .gym-cat-pill:active { transform: scale(0.97) }
  .gym-cat-pill.active {
    background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
    border-color: #1d4ed8;
    color: #ffffff;
    box-shadow: 0 0 0 1px rgba(59,130,246,0.25), 0 8px 22px -8px rgba(59,130,246,0.55);
  }
  .gym-cat-pill .count {
    font: 700 11px ${F};
    padding: 1px 8px; border-radius: 999px;
    background: rgba(15,23,42,0.06);
    color: ${C.textMid};
    font-variant-numeric: tabular-nums;
    transition: background 180ms var(--ease-out), color 180ms var(--ease-out);
  }
  .gym-cat-pill.active .count {
    background: rgba(255,255,255,0.22);
    color: #ffffff;
  }
  .gym-cat-pill .count.pop { animation: countBadgePop 420ms var(--ease-spring) }

  .gym-shimmer {
    background: linear-gradient(90deg, ${C.surface} 0%, ${C.surfaceUp} 50%, ${C.surface} 100%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
  }

  /* Set checkbox */
  .gym-set-circle {
    width: 40px; height: 40px; border-radius: 50%;
    border: 2px solid ${C.borderMid};
    background: #f1f5f9;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; padding: 0;
    font: 700 15px ${F};
    color: ${C.textDim};
    transition: border-color 180ms var(--ease-out), background 180ms var(--ease-out), transform 180ms var(--ease-out), color 180ms var(--ease-out);
    -webkit-tap-highlight-color: transparent;
    font-variant-numeric: tabular-nums;
  }
  .gym-set-circle:active { transform: scale(0.94) }
  .gym-set-circle.done {
    border-color: ${C.greenSoft};
    background: rgba(34,197,94,0.15);
    color: ${C.green};
    animation: setRingPulse 520ms var(--ease-out);
  }
  .gym-set-circle.done .check {
    display: inline-block;
    animation: setCheckPop 440ms var(--ease-spring) both;
  }

  /* Weight stepper */
  .gym-step-btn {
    width: 32px; height: 38px; border-radius: 9px;
    border: 1px solid ${C.border}; background: #ffffff;
    color: ${C.textMid}; font: 800 18px ${F};
    cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    transition: background 160ms var(--ease-out), color 160ms var(--ease-out), transform 140ms var(--ease-out), border-color 160ms var(--ease-out);
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    touch-action: manipulation;
  }
  .gym-step-btn:active { transform: scale(0.92); background: ${C.surfaceHi}; color: ${C.accentDeep} }

  /* Card state: all sets done */
  .gym-card.done {
    border-color: rgba(34,197,94,0.45);
    background: linear-gradient(180deg, rgba(34,197,94,0.08), ${C.surface} 60%);
  }
  .gym-card.done .ex-name { color: ${C.green} }

  /* Untouched-today dot */
  .gym-dot-today {
    width: 7px; height: 7px; border-radius: 50%;
    background: ${C.accentSoft};
    box-shadow: 0 0 0 3px rgba(96,165,250,0.18);
    animation: gymDotPulse 2.2s var(--ease-in-out) infinite;
    flex-shrink: 0;
  }

  /* Sticky bottom rest timer */
  .gym-rest-timer {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 900;
    padding: 12px 14px calc(12px + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border-top: 1px solid ${C.border};
    box-shadow: 0 -16px 40px rgba(15,23,42,0.12);
    animation: drawerUp 280ms var(--ease-drawer) both;
  }
  .gym-rest-timer.closing { animation: drawerDown 180ms var(--ease-drawer) both }
  .gym-rest-timer.done-flash { animation: edgePulseGreen 900ms var(--ease-out) infinite }

  .gym-rest-inner {
    max-width: 560px; margin: 0 auto;
    display: flex; align-items: center; gap: 14px;
    direction: rtl;
  }
  .gym-rest-num {
    font: 900 34px ${F};
    color: ${C.text};
    font-variant-numeric: tabular-nums;
    letter-spacing: -1px;
    min-width: 76px;
    text-align: center;
  }
  .gym-rest-bar {
    position: absolute; left: 0; right: 0; top: 0;
    height: 2px; background: rgba(15,23,42,0.06);
  }
  .gym-rest-bar > div {
    height: 100%;
    background: linear-gradient(90deg, ${C.accent}, ${C.accentSoft});
    transition: width 1s linear;
  }

  /* Confetti dots */
  .gym-confetti {
    position: absolute; pointer-events: none; inset: 0; overflow: hidden;
  }
  .gym-confetti span {
    position: absolute; top: 50%; right: 50%;
    width: 6px; height: 6px; border-radius: 50%;
    background: ${C.greenSoft};
    animation: confettiBurst 720ms var(--ease-out) both;
  }

  @media (prefers-reduced-motion: reduce) {
    .gym-card,
    .gym-rest-timer,
    .gym-rest-timer.closing,
    .gym-rest-timer.done-flash,
    .gym-set-circle.done,
    .gym-set-circle.done .check,
    .gym-dot-today,
    .gym-confetti span {
      animation: none !important;
    }
    .gym-btn-primary:hover, .gym-btn-primary:active,
    .gym-btn-ghost:active, .gym-btn-danger:active, .gym-btn-outline:active,
    .gym-cat-pill:active, .gym-set-circle:active, .gym-step-btn:active {
      transform: none !important;
    }
  }
`

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function Gym({ session }) {
  const navigate = useNavigate()

  const [plan,       setPlan]       = useState(null)
  const [archive,    setArchive]    = useState({})
  const [history,    setHistory]    = useState({})
  const [membership, setMembership] = useState(null)
  const [loading,    setLoading]    = useState(true)

  const [tab,         setTab]         = useState('plan')
  const [activeCat,   setActiveCat]   = useState(CAT_LABELS[0])
  const [trainer,     setTrainer]     = useState(false)
  const [openCards,   setOpenCards]   = useState({})
  const [modal,       setModal]       = useState(null)
  const [editingName, setEditingName] = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [lightbox,    setLightbox]    = useState(null)

  /* Ephemeral set-tracking state — keyed by exercise id, value = array of bools */
  const [setProgress, setSetProgress] = useState({})
  /* Active sticky timer: { exId, exName, setIndex, setsTotal, rest } | null */
  const [restTimer, setRestTimer] = useState(null)

  useEffect(() => {
    const unsubscribe = onValue(ref(db, BASE), snap => {
      const d = snap.val() || {}
      setPlan(d.currentPlan || null)
      setArchive(d.archive || {})
      setHistory(d.history || {})
      setMembership(d.membership || null)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const fbSet   = useCallback(async (path, val) => { setSaving(true); try { await set(dbRef(path), val) } catch(e) { alert('שגיאה: ' + e.message) } setSaving(false) }, [])
  const fbMerge = useCallback(async (path, val) => { setSaving(true); try { await update(dbRef(path), val) } catch(e) { alert('שגיאה: ' + e.message) } setSaving(false) }, [])

  const createPlan = async name => {
    if (plan) await fbSet(`archive/plan_${Date.now()}`, { ...plan, archivedAt: nowStr() })
    await fbSet('currentPlan', { id: uid(), name, createdAt: nowStr(), exercises: Object.fromEntries(CAT_LABELS.map(l => [l, {}])) })
    setModal(null); setActiveCat(CAT_LABELS[0]); setOpenCards({}); setSetProgress({}); setRestTimer(null)
  }

  const addExercise = async cat => {
    const id = uid()
    await fbSet(`currentPlan/exercises/${cat}/${id}`, { id, machineNumber: '', machineImage: '', adjustment: '', name: 'תרגיל חדש', description: '', reps: '12', sets: 3, rest: 60, weight: '0', weightUnit: 'kg', trainerNotes: {} })
  }

  const upField     = (cat, id, field, val) => fbMerge(`currentPlan/exercises/${cat}/${id}`, { [field]: val })
  const delExercise = async (cat, id) => { if (!confirm('למחוק תרגיל זה?')) return; await fbSet(`currentPlan/exercises/${cat}/${id}`, null) }

  const saveWeight = async (cat, id, val) => {
    const v = String(val).trim(); if (!v) return
    await fbMerge(`currentPlan/exercises/${cat}/${id}`, { weight: v })
    const ex = plan?.exercises?.[cat]?.[id]
    if (ex) await fbSet(`history/h_${Date.now()}`, { exerciseId: id, exerciseName: ex.name, planId: plan?.id, weight: v, date: today(), time: timeNow() })
  }

  const addNote = async (cat, id, text) => {
    await fbSet(`currentPlan/exercises/${cat}/${id}/trainerNotes/n_${Date.now()}`, { text, date: nowStr() })
    setModal(null)
  }

  const createMembership = async total => { await fbSet('membership', { id: uid(), total: parseInt(total), purchasedAt: today(), sessions: {} }); setModal(null) }
  const markSession      = async (date, t) => { await fbSet(`membership/sessions/s_${Date.now()}`, { date, time: t }); setModal(null) }
  const delSession       = async key => { if (!confirm('למחוק אימון זה?')) return; await fbSet(`membership/sessions/${key}`, null) }

  const triggerUpload = (cat, id) => {
    const el = document.createElement('input'); el.type = 'file'; el.accept = 'image/*'
    el.onchange = e => {
      const f = e.target.files[0]; if (!f) return
      if (f.size > 500 * 1024) { alert('תמונה גדולה מדי — עד 500KB'); return }
      const r = new FileReader(); r.onload = ev => upField(cat, id, 'machineImage', ev.target.result); r.readAsDataURL(f)
    }
    el.click()
  }

  /* Toggle a set — updates ephemeral state + triggers rest timer on completion */
  const toggleSet = useCallback((ex, cat, idx) => {
    const totalSets = parseInt(ex.sets) || 3
    setSetProgress(prev => {
      const cur = prev[ex.id] ? prev[ex.id].slice() : new Array(totalSets).fill(false)
      // Resize if plan changed
      if (cur.length !== totalSets) {
        const next = new Array(totalSets).fill(false)
        for (let i = 0; i < Math.min(cur.length, totalSets); i++) next[i] = cur[i]
        cur.length = 0
        cur.push(...next)
      }
      cur[idx] = !cur[idx]
      return { ...prev, [ex.id]: cur }
    })
    // If we just marked done (not undone), start rest timer
    const wasDone = (setProgress[ex.id] || [])[idx]
    if (!wasDone) {
      vibrate(25)
      setRestTimer({
        exId: ex.id,
        exName: ex.name,
        setIndex: idx + 1,
        setsTotal: totalSets,
        rest: parseInt(ex.rest) || 60,
        key: Date.now(),
      })
    }
  }, [setProgress])

  const dismissRestTimer = () => setRestTimer(null)

  /* Loading */
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16, background:C.bgGrad, fontFamily:F }}>
      <div style={{ width:36, height:36, border:`3px solid ${C.border}`, borderTopColor:C.accent, borderRadius:'50%', animation:'gymSpin 0.8s linear infinite' }} />
      <div style={{ fontSize:13, fontWeight:600, color:C.textMid, letterSpacing:'0.5px' }}>טוען...</div>
      <style>{GYM_CSS}</style>
    </div>
  )

  return (
    <div style={{ background:C.bgGrad, minHeight:'100vh', direction:'rtl', fontFamily:F, paddingBottom: restTimer ? 130 : 0, transition: 'padding-bottom 240ms var(--ease-out)' }}>
      <style>{GYM_CSS}</style>

      <BaronsHeader
        variant="light"
        title="חדר כושר"
        subtitle="מעקב אימונים"
        breadcrumbs={[{ label: 'כושר', path: '/gym' }]}
        tabs={[{ id:'plan', label:'תוכנית' }, { id:'membership', label:'כרטיסייה' }, { id:'archive', label:'ארכיון' }]}
        activeTab={tab}
        onTab={setTab}
        actions={[
          { label: trainer ? 'מצב צפייה' : 'מצב מאמן', onClick: () => setTrainer(t => !t), ...(trainer ? { gold:true } : {}) },
        ]}
      />

      {trainer && (
        <div style={{ background:'rgba(245,158,11,0.14)', borderBottom:`1px solid rgba(245,158,11,0.28)`, padding:'7px 20px', fontSize:12, fontWeight:700, color:'#b45309', textAlign:'center', letterSpacing:'1px', textTransform:'uppercase' }}>
          מצב עריכה — מאמן
        </div>
      )}

      {saving && (
        <div style={{ position:'fixed', top:12, left:12, background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:'5px 12px', fontSize:11, color:C.textMid, fontWeight:600, zIndex:500, boxShadow:C.shadow, display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:C.accent, animation:'gymPulse 1s infinite' }} />
          שומר...
        </div>
      )}

      <div style={{ padding:'16px 18px', maxWidth:920, margin:'0 auto' }}>
        {tab === 'plan'       && <PlanTab plan={plan} activeCat={activeCat} setActiveCat={setActiveCat} trainer={trainer} history={history} openCards={openCards} setOpenCards={setOpenCards} editingName={editingName} setEditingName={setEditingName} setModal={setModal} setLightbox={setLightbox} addExercise={addExercise} upField={upField} delExercise={delExercise} saveWeight={saveWeight} triggerUpload={triggerUpload} setProgress={setProgress} toggleSet={toggleSet} restTimer={restTimer} />}
        {tab === 'membership' && <MembershipTab membership={membership} setModal={setModal} delSession={delSession} />}
        {tab === 'archive'    && <ArchiveTab archive={archive} openCards={openCards} setOpenCards={setOpenCards} />}
      </div>

      {/* Sticky rest timer */}
      {restTimer && (
        <RestTimer
          key={restTimer.key}
          data={restTimer}
          onDismiss={dismissRestTimer}
        />
      )}

      {/* Modal */}
      {modal && (
        <ModalShell onClose={() => setModal(null)}>
          {modal.type === 'newPlan'       && <NewPlanModal     hasPlan={!!plan} onConfirm={createPlan} onClose={() => setModal(null)} />}
          {modal.type === 'newMembership' && <NewMemModal      onConfirm={createMembership} onClose={() => setModal(null)} />}
          {modal.type === 'markSession'   && <MarkSessionModal onConfirm={markSession} onClose={() => setModal(null)} />}
          {modal.type === 'history'       && <HistoryModal     exId={modal.exId} exName={modal.exName} history={history} onClose={() => setModal(null)} />}
          {modal.type === 'note'          && <NoteModal        onConfirm={text => addNote(modal.cat, modal.exId, text)} onClose={() => setModal(null)} />}
        </ModalShell>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.86)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)' }}>
          <button onClick={() => setLightbox(null)} className="gym-press" style={{ position:'fixed', top:16, left:16, width:38, height:38, borderRadius:'50%', background:'rgba(255,255,255,0.16)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', fontSize:22, cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          <div onClick={e => e.stopPropagation()} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
            <img src={lightbox.src} alt="" style={{ maxWidth:'92vw', maxHeight:'86vh', borderRadius:14, objectFit:'contain', boxShadow:'0 20px 60px rgba(15,23,42,0.5)' }} />
            {lightbox.onReplace && (
              <button onClick={() => { setLightbox(null); lightbox.onReplace() }} className="gym-press" style={{ background:'rgba(255,255,255,0.16)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', padding:'9px 22px', borderRadius:20, fontSize:13, cursor:'pointer', fontFamily:F, fontWeight:600, transition:'background 180ms var(--ease-out)' }}>
                החלף תמונה
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PLAN TAB — horizontal pill nav + stacked cards
═══════════════════════════════════════════════════════════ */
function PlanTab({ plan, activeCat, setActiveCat, trainer, history, openCards, setOpenCards, editingName, setEditingName, setModal, setLightbox, addExercise, upField, delExercise, saveWeight, triggerUpload, setProgress, toggleSet, restTimer }) {
  const pillBarRef = useRef(null)
  const pillRefs   = useRef({})
  const [poppedCat, setPoppedCat] = useState(null)

  if (!plan) return (
    <div style={{ textAlign:'center', padding:'70px 20px' }}>
      <div style={{ width:64, height:64, borderRadius:20, background:C.accentBg, border:`1px solid rgba(59,130,246,0.22)`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:28, color:C.accent, boxShadow:'0 8px 24px -10px rgba(59,130,246,0.35)' }}>
        ▲
      </div>
      <p style={{ fontSize:20, fontWeight:800, marginBottom:8, color:C.text, letterSpacing:'-0.3px' }}>אין תכנית פעילה</p>
      <p style={{ marginBottom:24, color:C.textMid, fontSize:14 }}>צור תכנית אימונים כדי להתחיל</p>
      <button className="gym-btn-primary gym-press" style={btn.primary} onClick={() => setModal({ type:'newPlan' })}>+ תכנית חדשה</button>
    </div>
  )

  const exArr = Object.values(plan.exercises?.[activeCat] || {}).filter(Boolean)

  /* Count how many exercises in each category have all sets done (for pop animation) */
  const catCompletion = useMemo(() => {
    const out = {}
    CAT_LABELS.forEach(lbl => {
      const exs = Object.values(plan.exercises?.[lbl] || {}).filter(Boolean)
      let done = 0
      exs.forEach(ex => {
        const sets = parseInt(ex.sets) || 3
        const sp = setProgress[ex.id] || []
        if (sp.length === sets && sp.every(Boolean)) done++
      })
      out[lbl] = done
    })
    return out
  }, [plan.exercises, setProgress])

  const prevCompletion = useRef(catCompletion)
  useEffect(() => {
    CAT_LABELS.forEach(lbl => {
      if (catCompletion[lbl] > (prevCompletion.current[lbl] || 0)) {
        setPoppedCat(lbl)
        setTimeout(() => setPoppedCat(null), 500)
      }
    })
    prevCompletion.current = catCompletion
  }, [catCompletion])

  const handlePillClick = (label) => {
    setActiveCat(label)
    const el = pillRefs.current[label]
    if (el && el.scrollIntoView) {
      try { el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }) } catch(_){}
    }
  }

  return (
    <div>
      {/* Plan header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14, flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:C.text, letterSpacing:'-0.2px' }}>{plan.name}</div>
          <div style={{ fontSize:11, color:C.textMid, marginTop:2, fontVariantNumeric:'tabular-nums' }}>{plan.createdAt}</div>
        </div>
        {trainer && (
          <button className="gym-btn-primary gym-press" style={{ ...btn.primary, ...btn.sm }} onClick={() => setModal({ type:'newPlan' })}>תכנית חדשה</button>
        )}
      </div>

      {/* Sticky horizontal pill bar */}
      <div
        ref={pillBarRef}
        className="gym-pill-bar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: `linear-gradient(180deg, ${C.bg} 60%, rgba(246,248,252,0.85) 100%)`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          marginBottom: 14,
        }}
      >
        {CATS.map(c => {
          const n = Object.values(plan.exercises?.[c.label] || {}).filter(Boolean).length
          const active = activeCat === c.label
          return (
            <button
              key={c.label}
              ref={el => { pillRefs.current[c.label] = el }}
              className={`gym-cat-pill${active ? ' active' : ''}`}
              onClick={() => handlePillClick(c.label)}
            >
              <span>{c.label}</span>
              {n > 0 && (
                <span className={`count${poppedCat === c.label ? ' pop' : ''}`}>
                  {n}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Active-category header */}
      <div style={{ fontSize:12, fontWeight:700, marginBottom:12, display:'flex', alignItems:'center', gap:8, color:C.textMid, textTransform:'uppercase', letterSpacing:'1.2px' }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:C.accent, flexShrink:0 }} />
        {activeCat}
        <span style={{ color: C.textDim, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'none' }}>
          · {exArr.length} תרגילים
        </span>
      </div>

      {exArr.length === 0 && !trainer && (
        <div style={{ color:C.textDim, fontSize:14, padding:'48px 0', textAlign:'center' }}>
          <div style={{ fontSize:26, marginBottom:10, opacity:0.35 }}>○</div>
          אין תרגילים בקטגוריה זו
        </div>
      )}

      {exArr.map((ex, i) => (
        <ExCard
          key={ex.id} ex={ex} cat={activeCat} trainer={trainer}
          history={history} openCards={openCards} setOpenCards={setOpenCards}
          editingName={editingName} setEditingName={setEditingName}
          setModal={setModal} setLightbox={setLightbox}
          upField={upField} delExercise={delExercise}
          saveWeight={saveWeight} triggerUpload={triggerUpload}
          setProgress={setProgress} toggleSet={toggleSet}
          isTimerActive={restTimer?.exId === ex.id}
          animDelay={i * 50}
        />
      ))}

      {trainer && (
        <button
          onClick={() => addExercise(activeCat)}
          className="gym-press"
          style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            padding:13, border:`1.5px dashed ${C.borderMid}`,
            borderRadius:13, background:'transparent', color:C.textMid,
            fontSize:13, fontFamily:F, fontWeight:700, width:'100%',
            cursor:'pointer', marginTop:10,
            transition:'border-color 180ms var(--ease-out), color 180ms var(--ease-out), background 180ms var(--ease-out)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accentDeep; e.currentTarget.style.background = C.accentBg }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderMid; e.currentTarget.style.color = C.textMid; e.currentTarget.style.background='transparent' }}
        >
          + הוסף תרגיל
        </button>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   EXERCISE CARD — set-by-set tracking
═══════════════════════════════════════════════════════════ */
function ExCard({ ex, cat, trainer, history, openCards, setOpenCards, editingName, setEditingName, setModal, setLightbox, upField, delExercise, saveWeight, triggerUpload, setProgress, toggleSet, isTimerActive, animDelay=0 }) {
  const open = openCards[ex.id]
  const hist = Object.values(history || {}).filter(h => h.exerciseId === ex.id).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
  const last = hist[0]?.date || ''
  const unitKey   = ex.weightUnit || 'kg'
  const unitLabel = UNITS.find(u => u[0] === unitKey)?.[1] || 'ק"ג'

  const totalSets = parseInt(ex.sets) || 3
  const progArr   = setProgress[ex.id] || []
  const doneCount = progArr.filter(Boolean).length
  const allDone   = doneCount >= totalSets && totalSets > 0
  const touchedToday = hist[0]?.date === today()

  /* confetti burst on completion */
  const [burstKey, setBurstKey] = useState(0)
  const prevDoneRef = useRef(allDone)
  useEffect(() => {
    if (allDone && !prevDoneRef.current) {
      setBurstKey(k => k + 1)
      vibrate([40, 40, 80])
    }
    prevDoneRef.current = allDone
  }, [allDone])

  /* local weight for quick +/- edits */
  const [weightLocal, setWeightLocal] = useState(ex.weight ?? '0')
  useEffect(() => { setWeightLocal(ex.weight ?? '0') }, [ex.weight])

  /* long-press repeat for stepper */
  const repeatRef = useRef(null)
  const stopRepeat = () => { if (repeatRef.current) { clearInterval(repeatRef.current); repeatRef.current = null } }
  useEffect(() => () => stopRepeat(), [])

  const adjustWeight = useCallback((delta) => {
    setWeightLocal(prev => {
      const n = parseFloat(String(prev).replace(',', '.')) || 0
      const isInt = Number.isInteger(n) && Math.abs(delta) === 2.5 ? false : Number.isInteger(n)
      const step = Math.abs(delta) === 2.5 ? 2.5 : 1
      const next = Math.max(0, n + (delta < 0 ? -step : step))
      const str = Number.isInteger(next) ? String(next) : next.toFixed(1).replace(/\.0$/, '')
      saveWeight(cat, ex.id, str)
      return str
    })
    vibrate(8)
  }, [cat, ex.id, saveWeight])

  const startRepeat = (delta) => {
    adjustWeight(delta)
    stopRepeat()
    let t0 = setTimeout(() => {
      repeatRef.current = setInterval(() => adjustWeight(delta), 110)
    }, 420)
    const clear = () => { clearTimeout(t0); stopRepeat() }
    window.addEventListener('pointerup', clear, { once: true })
    window.addEventListener('pointercancel', clear, { once: true })
  }

  const imgEl = ex.machineImage ? (
    trainer ? (
      <div style={{ position:'relative', flexShrink:0, width:44 }}>
        <img src={ex.machineImage} alt="" onClick={e => { e.stopPropagation(); setLightbox({ src:ex.machineImage, onReplace:()=>triggerUpload(cat,ex.id) }) }}
          style={{ width:44, height:44, borderRadius:9, objectFit:'cover', border:`1px solid ${C.border}`, cursor:'zoom-in', display:'block', boxShadow:'0 2px 6px rgba(15,23,42,0.08)' }} />
        <button onClick={e => { e.stopPropagation(); upField(cat, ex.id, 'machineImage', '') }}
          style={{ position:'absolute', top:-5, right:-5, width:16, height:16, borderRadius:'50%', background:C.red, border:`2px solid ${C.surface}`, color:'#fff', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, fontFamily:F }}>
          ×
        </button>
      </div>
    ) : (
      <img src={ex.machineImage} alt="" onClick={e => { e.stopPropagation(); setLightbox({ src:ex.machineImage }) }}
        style={{ width:44, height:44, borderRadius:9, objectFit:'cover', border:`1px solid ${C.border}`, cursor:'zoom-in', flexShrink:0, boxShadow:'0 2px 6px rgba(15,23,42,0.08)' }} />
    )
  ) : null

  return (
    <div
      className={`gym-card${allDone ? ' done' : ''}`}
      style={{
        position: 'relative',
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        marginBottom: 10,
        overflow: 'hidden',
        boxShadow: allDone
          ? '0 4px 18px rgba(34,197,94,0.18), 0 0 0 1px rgba(34,197,94,0.35)'
          : isTimerActive
            ? '0 6px 22px rgba(59,130,246,0.18), 0 0 0 1px rgba(59,130,246,0.35)'
            : '0 4px 16px rgba(15,23,42,0.06)',
        animationDelay: `${animDelay}ms`,
        transition: 'border-color 180ms var(--ease-out), box-shadow 240ms var(--ease-out), background 240ms var(--ease-out)',
      }}
    >
      {/* confetti burst overlay */}
      {burstKey > 0 && allDone && (
        <div key={burstKey} className="gym-confetti" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => {
            const angle = (i / 10) * Math.PI * 2
            const r = 48 + (i % 3) * 8
            return (
              <span key={i} style={{
                '--cx': `${Math.cos(angle) * r}px`,
                '--cy': `${Math.sin(angle) * r}px`,
                animationDelay: `${i * 10}ms`,
                background: i % 2 === 0 ? C.greenSoft : C.accentSoft,
              }} />
            )
          })}
        </div>
      )}

      {/* Top row — clickable to toggle drawer */}
      <div
        onClick={() => setOpenCards(o => ({ ...o, [ex.id]: !o[ex.id] }))}
        className="gym-row-clickable"
        style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 14px 12px', cursor:'pointer' }}
      >
        {/* Machine # badge — bigger */}
        <div style={{
          background:'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
          color:'#ffffff',
          fontWeight:900,
          minWidth:44, height:44,
          borderRadius:12,
          display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0,
          fontSize:(ex.machineNumber||'').length>2?11:15,
          border:'1px solid rgba(29,78,216,0.4)',
          letterSpacing:'0.3px',
          fontVariantNumeric:'tabular-nums',
          boxShadow: '0 4px 14px -4px rgba(59,130,246,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
        }}>
          {ex.machineNumber || '#'}
        </div>

        {imgEl}

        {/* Name + meta */}
        <div style={{ flex:1, minWidth:0 }}>
          {trainer && editingName === ex.id ? (
            <input
              autoFocus
              defaultValue={ex.name}
              onBlur={e => { setEditingName(null); upField(cat, ex.id, 'name', e.target.value.trim() || 'תרגיל') }}
              onKeyDown={e => e.key === 'Enter' && e.target.blur()}
              onClick={e => e.stopPropagation()}
              className="gym-input"
              style={{ ...inp.base, fontSize:16, fontWeight:800, border:`1px solid ${C.accent}`, padding:'4px 10px', width:'100%' }}
            />
          ) : (
            <div
              className="ex-name"
              onClick={e => { if(trainer){ e.stopPropagation(); setEditingName(ex.id) } }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 17, fontWeight: 800, color: C.text,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                letterSpacing: '-0.2px',
                cursor: trainer ? 'text' : 'pointer',
                transition: 'color 240ms var(--ease-out)',
              }}>
              {!touchedToday && !allDone && <span className="gym-dot-today" aria-hidden="true" />}
              {allDone && (
                <span style={{
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                  width: 18, height: 18, borderRadius:'50%',
                  background: C.greenBg, color: C.green,
                  fontSize: 11, fontWeight: 900,
                  border: `1px solid rgba(34,197,94,0.4)`,
                  flexShrink: 0,
                }}>✓</span>
              )}
              <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{ex.name}</span>
              {trainer && <span style={{ color:C.textDim, fontWeight:400, fontSize:11, marginRight:4 }}>✎</span>}
            </div>
          )}
          <div
            key={`meta-${doneCount}`}
            style={{
              fontSize:11.5, color:C.textMid, marginTop:3,
              fontVariantNumeric:'tabular-nums',
              display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
              animation: doneCount > 0 ? 'metaPulse 500ms var(--ease-out)' : 'none',
            }}>
            <span style={{ fontWeight: 700, color: doneCount > 0 ? C.green : C.textMid }}>
              {doneCount}/{totalSets}
            </span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{ex.reps} חז׳</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{ex.rest}״ מנוחה</span>
            {last && <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span style={{ color: C.textDim }}>{last}</span>
            </>}
          </div>
          {ex.description && (
            <div style={{
              fontSize: 12,
              color: C.textMid,
              marginTop: 6,
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {ex.description}
            </div>
          )}
        </div>

        {/* expand chevron */}
        <button
          onClick={e => { e.stopPropagation(); setOpenCards(o => ({ ...o, [ex.id]: !o[ex.id] })) }}
          className="gym-press"
          aria-label={open ? 'סגור פרטים' : 'פתח פרטים'}
          style={{
            width: 34, height: 34, borderRadius: 9,
            background: C.surfaceUp,
            border: `1px solid ${C.border}`,
            color: C.textMid,
            fontSize: 11, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 260ms var(--ease-out), background 180ms var(--ease-out), color 180ms var(--ease-out)',
          }}>
          ▼
        </button>
      </div>

      {/* Set circles + weight stepper row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '2px 14px 16px',
        flexWrap: 'wrap',
      }}>
        {/* Sets */}
        <div style={{ display:'flex', gap:8, flex:'1 1 auto', minWidth: 0, flexWrap: 'wrap' }}>
          {Array.from({ length: totalSets }).map((_, i) => {
            const done = !!progArr[i]
            return (
              <button
                key={i}
                onClick={() => toggleSet(ex, cat, i)}
                className={`gym-set-circle${done ? ' done' : ''}`}
                aria-label={`סט ${i+1} ${done ? 'הושלם' : ''}`}
              >
                {done
                  ? <span className="check" style={{ fontSize: 18, lineHeight: 1 }}>✓</span>
                  : <span style={{ opacity: 0.7 }}>{i+1}</span>
                }
              </button>
            )
          })}
        </div>

        {/* Weight stepper */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: '#ffffff',
            border: `1px solid ${C.border}`,
            borderRadius: 11,
            padding: 3,
            flexShrink: 0,
            boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          }}>
          <button
            className="gym-step-btn"
            onPointerDown={e => { e.preventDefault(); startRepeat(-2.5) }}
            aria-label="הפחת משקל"
          >−</button>
          <input
            type="text"
            inputMode="decimal"
            value={weightLocal}
            onChange={e => setWeightLocal(e.target.value)}
            onFocus={e => e.target.select()}
            onBlur={e => saveWeight(cat, ex.id, e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.target.blur()}
            style={{
              width: 64, textAlign: 'center',
              fontFamily: F, fontSize: 20, fontWeight: 900,
              color: C.text,
              background: 'transparent',
              border: 'none', outline: 'none',
              padding: '4px 2px',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.4px',
            }}
          />
          <button
            className="gym-step-btn"
            onPointerDown={e => { e.preventDefault(); startRepeat(+2.5) }}
            aria-label="העלה משקל"
          >+</button>
        </div>
        <div style={{ fontSize: 11, color: C.textDim, flexShrink: 0, fontWeight: 600, marginRight: 2 }}>{unitLabel}</div>
      </div>

      {/* Expanded body */}
      {open && <ExBody ex={ex} cat={cat} trainer={trainer} hist={hist} setModal={setModal} upField={upField} delExercise={delExercise} setLightbox={setLightbox} triggerUpload={triggerUpload} />}
    </div>
  )
}

/* ── Exercise expanded body ── */
function ExBody({ ex, cat, trainer, hist, setModal, upField, delExercise, setLightbox, triggerUpload }) {
  const notes = Object.values(ex.trainerNotes || {}).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div style={{ padding:'0 14px 16px', borderTop:`1px solid ${C.border}`, background:C.surfaceUp, animation:'gymFadeUp 260ms var(--ease-out)' }}>

      {/* Larger image in expanded view */}
      {ex.machineImage && (
        <div style={{ marginTop: 14 }}>
          <img
            src={ex.machineImage}
            alt=""
            onClick={() => setLightbox({ src: ex.machineImage, onReplace: trainer ? () => triggerUpload(cat, ex.id) : undefined })}
            style={{
              width: '100%', height: 140, objectFit: 'cover',
              borderRadius: 12, cursor: 'zoom-in',
              border: `1px solid ${C.border}`,
              display: 'block',
            }}
          />
        </div>
      )}
      {!ex.machineImage && trainer && (
        <div
          onClick={() => triggerUpload(cat, ex.id)}
          style={{
            marginTop: 14, height: 100,
            border: `1.5px dashed ${C.borderMid}`,
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#ffffff',
            color: C.textMid, fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
            transition: 'border-color 180ms var(--ease-out), color 180ms var(--ease-out), background 180ms var(--ease-out)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accentDeep; e.currentTarget.style.background = C.accentBg }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderMid; e.currentTarget.style.color = C.textMid; e.currentTarget.style.background = '#ffffff' }}
        >
          + הוסף תמונת מכשיר
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:14 }}>
        <GymField label="מס׳ מכשיר" trainer={trainer} value={ex.machineNumber} placeholder="19"     onChange={v => upField(cat, ex.id, 'machineNumber', v)} />
        <GymField label="כיוונון"   trainer={trainer} value={ex.adjustment}    placeholder="גובה 3" onChange={v => upField(cat, ex.id, 'adjustment', v)} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:10 }}>
        <GymField label="סטים"         trainer={trainer} value={ex.sets} type="number" onChange={v => upField(cat, ex.id, 'sets', parseInt(v)||3)} />
        <GymField label="חזרות"        trainer={trainer} value={ex.reps}              onChange={v => upField(cat, ex.id, 'reps', v)} />
        <GymField label="מנוחה (שנ׳)" trainer={trainer} value={ex.rest} type="number" onChange={v => upField(cat, ex.id, 'rest', parseInt(v)||60)} />
      </div>

      {/* Description */}
      <div style={{ marginTop:12 }}>
        <div style={{ fontSize:10, color:C.textDim, marginBottom:5, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px' }}>הוראות</div>
        {trainer
          ? <textarea defaultValue={ex.description} onBlur={e => upField(cat, ex.id, 'description', e.target.value)} rows={2} className="gym-input" style={{ ...inp.base, resize:'vertical' }} placeholder="גב זקוף, ידיים ישרות..." />
          : ex.description && <div style={{ fontSize:13, lineHeight:1.7, color:C.textMid, paddingTop:3 }}>{ex.description}</div>
        }
      </div>

      {/* Trainer notes */}
      {notes.length > 0 && (
        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:10, color:C.textDim, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:'1px' }}>הערות מאמנת</div>
          {notes.map(n => (
            <div key={n.id || n.date} style={{ background:C.accentBg, borderRight:`3px solid ${C.accent}`, borderRadius:'0 9px 9px 0', padding:'9px 12px', marginBottom:6, fontSize:13, lineHeight:1.6, color:C.text }}>
              {n.text}
              <div style={{ fontSize:10, color:C.textMid, marginTop:4, fontVariantNumeric:'tabular-nums' }}>{n.date}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop:`1px solid ${C.border}`, margin:'14px 0' }} />

      {/* Action buttons */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button className="gym-btn-ghost gym-press" style={btn.ghost} onClick={() => setModal({ type:'history', exId:ex.id, exName:ex.name })}>
          היסטוריה ({hist.length})
        </button>
        <button className="gym-btn-ghost gym-press" style={btn.ghost} onClick={() => setModal({ type:'note', cat, exId:ex.id })}>
          הוסף הערה
        </button>
        {trainer && (
          <button className="gym-btn-danger gym-press" style={btn.danger} onClick={() => delExercise(cat, ex.id)}>מחק</button>
        )}
      </div>
    </div>
  )
}

/* ── GymField ── */
function GymField({ label, trainer, value, type='text', placeholder='', onChange }) {
  return (
    <div>
      <div style={{ fontSize:10, color:C.textDim, marginBottom:5, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px' }}>{label}</div>
      {trainer
        ? <input type={type} defaultValue={value} placeholder={placeholder} onBlur={e => onChange(e.target.value)} className="gym-input" style={inp.base} />
        : <div style={{ fontSize:14, fontWeight:700, padding:'5px 0', color:C.text, fontVariantNumeric:'tabular-nums' }}>{value || '—'}</div>
      }
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   STICKY REST TIMER — bottom sheet
═══════════════════════════════════════════════════════════ */
function RestTimer({ data, onDismiss }) {
  const { exName, setIndex, setsTotal, rest } = data
  const [remaining, setRemaining] = useState(rest)
  const [running, setRunning] = useState(true)
  const [done, setDone] = useState(false)
  const [closing, setClosing] = useState(false)
  const intervalRef = useRef(null)
  const totalRef = useRef(rest)

  useEffect(() => {
    totalRef.current = rest
    setRemaining(rest); setDone(false); setRunning(true)
  }, [rest])

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false); setDone(true)
          vibrate([220, 90, 220])
          // auto-dismiss after 3s
          setTimeout(() => beginClose(), 3000)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  const beginClose = () => {
    setClosing(true)
    setTimeout(() => onDismiss && onDismiss(), 180)
  }

  const toggleRun = () => {
    if (done) {
      setDone(false); setRemaining(totalRef.current); setRunning(true); return
    }
    setRunning(r => !r)
  }
  const addThirty = () => {
    totalRef.current = totalRef.current + 30
    setRemaining(r => r + 30)
    if (done) { setDone(false); setRunning(true) }
  }
  const skip = () => beginClose()

  const pct = totalRef.current > 0 ? Math.min(100, ((totalRef.current - remaining) / totalRef.current) * 100) : 0
  const mm = Math.floor(remaining / 60)
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div
      className={`gym-rest-timer${closing ? ' closing' : ''}${done ? ' done-flash' : ''}`}
      role="status"
      aria-live="polite"
    >
      {/* progress bar */}
      <div className="gym-rest-bar">
        <div style={{ width: `${pct}%`, background: done ? `linear-gradient(90deg, ${C.green}, ${C.greenSoft})` : undefined }} />
      </div>

      <div className="gym-rest-inner">
        <div className="gym-rest-num" style={{ color: done ? C.greenSoft : C.text }}>
          {done ? '✓' : `${mm}:${ss}`}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: C.textDim,
            textTransform: 'uppercase', letterSpacing: '1px',
            marginBottom: 2,
          }}>מנוחה · סט {setIndex}/{setsTotal}</div>
          <div style={{
            fontSize: 14, fontWeight: 800, color: C.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{exName}</div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            className="gym-press"
            onClick={toggleRun}
            aria-label={running ? 'השהה' : 'המשך'}
            style={{
              width: 42, height: 42, borderRadius: 11,
              background: running ? C.surfaceHi : C.accent,
              color: running ? C.text : '#fff',
              border: `1px solid ${running ? C.border : C.accent}`,
              fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: F,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 180ms var(--ease-out), border-color 180ms var(--ease-out), transform 160ms var(--ease-out)',
            }}>
            {done ? '↻' : running ? '❚❚' : '▶'}
          </button>
          <button
            className="gym-press"
            onClick={addThirty}
            aria-label="הוסף 30 שניות"
            style={{
              minWidth: 46, height: 42, borderRadius: 11,
              background: C.surfaceUp, color: C.text,
              border: `1px solid ${C.border}`,
              fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: F,
              padding: '0 8px',
              transition: 'background 180ms var(--ease-out), transform 160ms var(--ease-out)',
            }}>
            +30
          </button>
          <button
            className="gym-press"
            onClick={skip}
            aria-label="דלג"
            style={{
              width: 42, height: 42, borderRadius: 11,
              background: 'transparent', color: C.textMid,
              border: `1px solid ${C.border}`,
              fontSize: 18, fontWeight: 800, cursor: 'pointer', fontFamily: F,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 180ms var(--ease-out), color 180ms var(--ease-out), transform 160ms var(--ease-out)',
            }}>
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MEMBERSHIP TAB
═══════════════════════════════════════════════════════════ */
function MembershipTab({ membership: m, setModal, delSession }) {
  if (!m) return (
    <div style={{ textAlign:'center', padding:'70px 20px' }}>
      <div style={{ width:64, height:64, borderRadius:20, background:C.greenBg, border:`1px solid rgba(34,197,94,0.24)`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:28, color:C.green, boxShadow:'0 8px 24px -10px rgba(34,197,94,0.35)' }}>
        ◈
      </div>
      <p style={{ fontSize:20, fontWeight:800, marginBottom:8, color:C.text, letterSpacing:'-0.3px' }}>אין כרטיסייה פעילה</p>
      <p style={{ marginBottom:24, color:C.textMid, fontSize:14 }}>הוסף כרטיסייה לעקוב אחרי השיעורים שלך</p>
      <button className="gym-btn-primary gym-press" style={btn.primary} onClick={() => setModal({ type:'newMembership' })}>+ כרטיסייה חדשה</button>
    </div>
  )

  const sess = Object.entries(m.sessions || {}).map(([k, v]) => ({ ...v, _key:k })).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
  const used = sess.length, total = m.total, rem = total - used
  const pct  = Math.min(100, (used / total) * 100)
  const remColor = rem <= 3 ? C.red : rem <= 6 ? C.amber : C.green

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:C.text, letterSpacing:'-0.2px' }}>כרטיסייה</div>
          <div style={{ fontSize:11, color:C.textMid, marginTop:2, fontVariantNumeric:'tabular-nums' }}>נרכשה: {m.purchasedAt}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="gym-btn-ghost gym-press" style={{ ...btn.ghost, ...btn.sm }} onClick={() => setModal({ type:'newMembership' })}>+ חדשה</button>
          {rem > 0 && <button className="gym-btn-primary gym-press" style={{ ...btn.primary, ...btn.sm }} onClick={() => setModal({ type:'markSession' })}>סמן אימון</button>}
        </div>
      </div>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:22, marginBottom:16, boxShadow:C.shadow }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:14 }}>
          <div style={{ fontSize:56, fontWeight:900, lineHeight:1, color:remColor, fontVariantNumeric:'tabular-nums', letterSpacing:'-2px' }}>{rem}</div>
          <div style={{ color:C.textMid, fontSize:14 }}>נותרו מתוך {total}</div>
        </div>

        <div style={{ background:C.surfaceUp, borderRadius:6, height:6, marginBottom:8, overflow:'hidden' }}>
          <div style={{ background: pct > 80 ? C.red : pct > 60 ? C.amber : C.accent, borderRadius:6, height:6, width:`${pct}%`, transition:'width 600ms var(--ease-out)' }} />
        </div>
        <div style={{ fontSize:12, color:C.textMid, marginBottom:18, fontVariantNumeric:'tabular-nums' }}>{used} שיעורים בוצעו</div>

        <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              width:34, height:34, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:700, fontVariantNumeric:'tabular-nums',
              background: i < used ? `rgba(34,197,94,0.15)` : C.surfaceUp,
              color: i < used ? C.green : C.textDim,
              border: i < used ? `1px solid rgba(34,197,94,0.3)` : `1px solid ${C.border}`,
              transition:'background 240ms var(--ease-out), border-color 240ms var(--ease-out), color 240ms var(--ease-out)',
            }}>
              {i < used ? '✓' : i + 1}
            </div>
          ))}
        </div>
      </div>

      {rem === 0 && (
        <div style={{ background:'rgba(34,197,94,0.08)', border:`1px solid rgba(34,197,94,0.2)`, borderRadius:12, padding:'13px 18px', marginBottom:16, textAlign:'center', color:C.green, fontWeight:700, fontSize:14 }}>
          הכרטיסייה נגמרה — הגיע הזמן לחדש!
        </div>
      )}

      <div style={{ fontSize:11, fontWeight:700, marginBottom:12, display:'flex', alignItems:'center', gap:8, color:C.textDim, textTransform:'uppercase', letterSpacing:'1.5px' }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:C.accent }} />
        היסטוריית אימונים
      </div>

      {sess.length === 0 && (
        <div style={{ color:C.textDim, fontSize:14, padding:'20px 0', textAlign:'center' }}>עדיין לא נרשמו אימונים</div>
      )}

      {sess.map((s2, i) => (
        <div key={s2._key} className="gym-row-hover" style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 8px', borderBottom:`1px solid ${C.border}`, borderRadius:8, transition:'background 160ms var(--ease-out)' }}>
          <div style={{ background:C.accentBg, color:C.accentDeep, borderRadius:'50%', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0, fontVariantNumeric:'tabular-nums', border:`1px solid rgba(59,130,246,0.28)` }}>
            {used - i}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:14, color:C.text, fontVariantNumeric:'tabular-nums' }}>{s2.date}</div>
            <div style={{ fontSize:11, color:C.textMid, fontVariantNumeric:'tabular-nums' }}>{s2.time}</div>
          </div>
          <div style={{ fontSize:12, color:C.green, fontWeight:700 }}>בוצע</div>
          <button onClick={() => delSession(s2._key)} className="gym-press" style={{ background:'none', border:'none', color:C.textDim, fontSize:18, cursor:'pointer', padding:'4px 6px', fontFamily:F, transition:'color 160ms var(--ease-out)' }}
            onMouseEnter={e => e.currentTarget.style.color = C.red}
            onMouseLeave={e => e.currentTarget.style.color = C.textDim}>×</button>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ARCHIVE TAB
═══════════════════════════════════════════════════════════ */
function ArchiveTab({ archive, openCards, setOpenCards }) {
  const plans = Object.values(archive || {}).sort((a, b) => (b.archivedAt || '').localeCompare(a.archivedAt || ''))

  if (!plans.length) return (
    <div style={{ textAlign:'center', padding:'70px 20px', color:C.textDim }}>
      <div style={{ fontSize:32, marginBottom:12, opacity:0.3 }}>◆</div>
      <p style={{ fontSize:18, fontWeight:800, marginBottom:8, color:C.text }}>הארכיון ריק</p>
      <p>תכניות ישנות יופיעו כאן</p>
    </div>
  )

  return (
    <div>
      <div style={{ fontSize:13, fontWeight:700, marginBottom:14, color:C.textMid }}>ארכיון תכניות ({plans.length})</div>
      {plans.map((p, pi) => {
        const open = openCards['arc_' + pi]
        return (
          <div key={pi} className="gym-card" style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:13, padding:14, marginBottom:10, boxShadow:'0 4px 16px rgba(15,23,42,0.06)', animationDelay:`${pi*50}ms` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => setOpenCards(o => ({ ...o, ['arc_'+pi]: !o['arc_'+pi] }))}>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:C.text }}>{p.name}</div>
                <div style={{ fontSize:11, color:C.textMid, marginTop:2, fontVariantNumeric:'tabular-nums' }}>{p.createdAt} — {p.archivedAt || '—'}</div>
              </div>
              <div style={{ color:C.textDim, fontSize:9, transform:open?'rotate(180deg)':'none', transition:'transform 260ms var(--ease-out)' }}>▼</div>
            </div>
            {open && CATS.map(c => {
              const exs = Object.values(p.exercises?.[c.label] || {}).filter(Boolean)
              if (!exs.length) return null
              return (
                <div key={c.label} style={{ marginTop:12, borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
                  <div style={{ fontWeight:700, fontSize:12, color:C.accentDeep, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.5px' }}>{c.label}</div>
                  {exs.map(ex => (
                    <div key={ex.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:`1px solid rgba(15,23,42,0.04)`, color:C.text }}>
                      <span>{ex.machineNumber ? `[${ex.machineNumber}] ` : ''}{ex.name}</span>
                      <span style={{ color:C.textMid, fontVariantNumeric:'tabular-nums' }}>{ex.weight} · {ex.sets}×{ex.reps}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MODALS
═══════════════════════════════════════════════════════════ */
function ModalShell({ onClose, children }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.4)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:1500, backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)' }}>
      <div style={{ background:C.surface, borderRadius:'20px 20px 0 0', width:'100%', maxWidth:560, maxHeight:'90vh', display:'flex', flexDirection:'column', direction:'rtl', paddingBottom:'env(safe-area-inset-bottom)', border:`1px solid ${C.border}`, borderBottom:'none', boxShadow:'0 -20px 60px rgba(15,23,42,0.18)', animation: 'drawerUp 280ms var(--ease-drawer) both' }}>
        <div style={{ padding:'12px 0 0', display:'flex', justifyContent:'center' }}>
          <div style={{ width:32, height:3, background:C.borderMid, borderRadius:2 }} />
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ padding:'12px 20px 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:C.text, letterSpacing:'-0.2px' }}>{title}</h2>
      <button onClick={onClose} className="gym-press" style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:C.textDim, lineHeight:1, padding:0, fontFamily:F, transition:'color 160ms var(--ease-out)' }}
        onMouseEnter={e => e.currentTarget.style.color = C.text}
        onMouseLeave={e => e.currentTarget.style.color = C.textDim}>×</button>
    </div>
  )
}

function ModalFooter({ onClose, onConfirm, confirmLabel='שמור' }) {
  return (
    <div style={{ padding:'14px 20px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', gap:10 }}>
      <button className="gym-btn-ghost gym-press" style={btn.ghost} onClick={onClose}>ביטול</button>
      <button className="gym-btn-primary gym-press" style={btn.primary} onClick={onConfirm}>{confirmLabel}</button>
    </div>
  )
}

function NewPlanModal({ hasPlan, onConfirm, onClose }) {
  const ref2 = useRef()
  const def  = 'תכנית ' + new Date().toLocaleDateString('he-IL', { month:'long', year:'numeric' })
  return <>
    <ModalHeader title="תכנית חדשה" onClose={onClose} />
    <div style={{ overflowY:'auto', flex:1, padding:'18px 20px' }}>
      {hasPlan && (
        <div style={{ background:C.redBg, border:`1px solid rgba(239,68,68,0.25)`, borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:C.red, fontWeight:600 }}>
          התכנית הנוכחית תועבר לארכיון
        </div>
      )}
      <div style={{ fontSize:10, color:C.textDim, fontWeight:700, marginBottom:5, textTransform:'uppercase', letterSpacing:'1px' }}>שם התכנית</div>
      <input ref={ref2} className="gym-input" style={inp.base} defaultValue={def} />
    </div>
    <ModalFooter onClose={onClose} onConfirm={() => { const n=ref2.current?.value?.trim(); if(n)onConfirm(n) }} confirmLabel="צור תכנית" />
  </>
}

function NewMemModal({ onConfirm, onClose }) {
  const ref2 = useRef()
  return <>
    <ModalHeader title="כרטיסייה חדשה" onClose={onClose} />
    <div style={{ overflowY:'auto', flex:1, padding:'18px 20px' }}>
      <div style={{ fontSize:10, color:C.textDim, fontWeight:700, marginBottom:8, textTransform:'uppercase', letterSpacing:'1px' }}>כמה שיעורים בכרטיסייה?</div>
      <input ref={ref2} type="number" min="1" defaultValue={11} className="gym-input" style={{ ...inp.base, fontSize:28, fontWeight:800, textAlign:'center', padding:14, fontVariantNumeric:'tabular-nums' }} />
      <div style={{ fontSize:12, color:C.textDim, textAlign:'center', marginTop:8 }}>הכנס כל מספר שתרצה</div>
    </div>
    <ModalFooter onClose={onClose} onConfirm={() => onConfirm(parseInt(ref2.current?.value)||11)} confirmLabel="שמור" />
  </>
}

function MarkSessionModal({ onConfirm, onClose }) {
  const dateRef = useRef(), timeRef = useRef()
  return <>
    <ModalHeader title="סמן אימון" onClose={onClose} />
    <div style={{ overflowY:'auto', flex:1, padding:'18px 20px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <div style={{ fontSize:10, color:C.textDim, fontWeight:700, marginBottom:5, textTransform:'uppercase', letterSpacing:'1px' }}>תאריך</div>
          <input ref={dateRef} className="gym-input" style={inp.base} defaultValue={today()} />
        </div>
        <div>
          <div style={{ fontSize:10, color:C.textDim, fontWeight:700, marginBottom:5, textTransform:'uppercase', letterSpacing:'1px' }}>שעה</div>
          <input ref={timeRef} className="gym-input" style={inp.base} defaultValue={timeNow()} />
        </div>
      </div>
    </div>
    <ModalFooter onClose={onClose} onConfirm={() => onConfirm(dateRef.current?.value||today(), timeRef.current?.value||timeNow())} confirmLabel="אשר אימון" />
  </>
}

function HistoryModal({ exId, exName, history, onClose }) {
  const items = Object.values(history || {}).filter(h => h.exerciseId === exId).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
  return <>
    <ModalHeader title={exName} onClose={onClose} />
    <div style={{ overflowY:'auto', flex:1, padding:'18px 20px' }}>
      <div style={{ fontSize:11, color:C.textDim, marginBottom:14, fontVariantNumeric:'tabular-nums' }}>{items.length} רשומות</div>
      {items.length === 0 && <p style={{ color:C.textDim, textAlign:'center', padding:'24px 0' }}>אין היסטוריה עדיין</p>}
      {items.map((h, i) => {
        const changed = i < items.length - 1 && String(h.weight) !== String(items[i+1].weight)
        return (
          <div key={h.id || i} className="gym-row-hover" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 8px', borderBottom:`1px solid ${C.border}`, fontSize:13, borderRadius:8 }}>
            <div>
              <div style={{ fontWeight:800, fontSize:17, color:C.text, fontVariantNumeric:'tabular-nums' }}>{h.weight}</div>
              <div style={{ fontSize:11, color:C.textMid, fontVariantNumeric:'tabular-nums' }}>{h.date} · {h.time}</div>
            </div>
            {changed && <div style={{ fontSize:12, color:C.green, fontWeight:700 }}>שינוי ▲</div>}
          </div>
        )
      })}
    </div>
    <div style={{ padding:'14px 20px', borderTop:`1px solid ${C.border}` }}>
      <button className="gym-btn-ghost gym-press" style={{ ...btn.ghost, width:'100%' }} onClick={onClose}>סגור</button>
    </div>
  </>
}

function NoteModal({ onConfirm, onClose }) {
  const ref2 = useRef()
  useEffect(() => { setTimeout(() => ref2.current?.focus(), 60) }, [])
  return <>
    <ModalHeader title="הוסף הערה" onClose={onClose} />
    <div style={{ overflowY:'auto', flex:1, padding:'18px 20px' }}>
      <textarea ref={ref2} rows={4} placeholder="למשל: העלה משקל בשבוע הבא..." className="gym-input" style={{ ...inp.base, resize:'vertical' }} />
    </div>
    <ModalFooter onClose={onClose} onConfirm={() => { const t=ref2.current?.value?.trim(); if(t)onConfirm(t) }} confirmLabel="שמור הערה" />
  </>
}
