import { useState, useEffect } from 'react'
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
  // returns YYYY-MM-DD from ISO string
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
  text:   '#eeeae4',
  muted:  'rgba(255,255,255,0.50)',
  mono:   "'Space Mono',monospace",
  font:   "'Open Sans Hebrew','Heebo',sans-serif",
}

// ─── Shared UI pieces ─────────────────────────────────────────────────────────
function Card({ children, style }) {
  return <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:10, backdropFilter:'blur(12px)', ...style }}>{children}</div>
}
function CardTitle({ children }) {
  return <div style={{ fontSize:10, fontWeight:700, color:C.muted, letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:12 }}>{children}</div>
}
function TypeBadge({ type }) {
  const cols = { easy:{bg:'rgba(34,197,94,0.15)',c:'#22c55e'}, long:{bg:'rgba(129,140,248,0.15)',c:'#818cf8'}, tempo:{bg:'rgba(251,146,60,0.15)',c:'#fb923c'}, intervals:{bg:'rgba(239,68,68,0.15)',c:'#ef4444'}, race:{bg:'rgba(255,85,0,0.20)',c:'#FF5500'}, free:{bg:'rgba(255,255,255,0.10)',c:'rgba(255,255,255,0.7)'} }
  const col = cols[type] || cols.free
  return <span style={{ background:col.bg, color:col.c, padding:'2px 9px', borderRadius:6, fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>{TYPE_NAMES[type]}</span>
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:10, fontWeight:700, color:C.muted, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>{label}</label>
      {children}
    </div>
  )
}
const inputStyle = { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'11px 14px', color:C.text, fontFamily:C.mono, fontSize:18, outline:'none', direction:'ltr', textAlign:'center', boxSizing:'border-box' }

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Marathon({ session }) {
  const userEmail = session?.user?.email
  const canWrite  = CAN_WRITE.includes(userEmail)

  const [tab,        setTab]        = useState('dashboard')
  const [allWorkouts,setAllWorkouts]= useState({})
  const [freeRuns,   setFreeRuns]   = useState({})
  const [modal,      setModal]      = useState(null)   // planned workout modal
  const [freeModal,  setFreeModal]  = useState(null)   // free run modal (null | 'new' | {id,...})
  const [form,       setForm]       = useState({})
  const [freeForm,   setFreeForm]   = useState({})
  const [saving,     setSaving]     = useState(false)
  const [feedback,   setFeedback]   = useState(null)
  const [openWeeks,  setOpenWeeks]  = useState({})

  const currentWeek = getCurrentWeek()
  const daysLeft    = getDaysToRace()
  const weekData    = PLAN[currentWeek - 1]

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
    migrate().then(() => {
      const u1 = onValue(ref(db, DB_PATH),   s => setAllWorkouts(s.val() || {}))
      const u2 = onValue(ref(db, FREE_PATH), s => setFreeRuns(s.val() || {}))
      return () => { u1(); u2() }
    })
    setOpenWeeks(prev => ({ ...prev, [currentWeek]: true }))
  }, [])

  // ── Derived ──
  const totalKmDone = [
    ...Object.values(allWorkouts).filter(w => w && typeof w === 'object' && !w._migrated),
    ...Object.values(freeRuns),
  ].reduce((s, w) => s + (parseFloat(w?.distance) || 0), 0)

  const weekKm = weekData?.workouts.reduce((s,w) => {
    const k = wKey(currentWeek, w.day)
    return s + (parseFloat(allWorkouts[k]?.distance) || 0)
  }, 0) || 0
  const weekDone = weekData?.workouts.filter(w => allWorkouts[wKey(currentWeek, w.day)]).length || 0
  const goalPct  = Math.min(100, (totalKmDone / TOTAL_PLAN_KM) * 100)
  const plannedKm = weekData ? weekTotalKm(weekData) : 0
  const loadRatio = plannedKm > 0 ? weekKm / plannedKm : 0
  const loadInfo = loadRatio < 0.5
    ? { label:'🟢 נמוך',    color:C.green,  pct:Math.max(8, loadRatio*200) }
    : loadRatio <= 1.1
    ? { label:'🟠 אופטימלי',color:C.accent, pct:Math.min(95, loadRatio*85) }
    : { label:'🔴 גבוה',    color:C.red,    pct:100 }

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
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:C.font, direction:'rtl', color:C.text }}>

      {/* ── Header ── */}
      <div style={{ background:'rgba(11,21,38,0.90)', backdropFilter:'blur(20px)', borderBottom:`1px solid ${C.border}`, padding:'12px 16px 10px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:10, color:C.muted, letterSpacing:'0.15em', textTransform:'uppercase' }}>BARONS / ROY</div>
            <div style={{ fontSize:20, fontWeight:800, lineHeight:1.15 }}>מרתון <span style={{ color:C.accent }}>ברלין</span></div>
          </div>
          <div style={{ background:C.accent, borderRadius:10, padding:'5px 11px', textAlign:'center' }}>
            <div style={{ fontFamily:C.mono, fontSize:22, fontWeight:700, color:'#fff', lineHeight:1 }}>{daysLeft}</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.75)', letterSpacing:'0.08em' }}>ימים למרוץ</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
          <span style={{ fontSize:11, color:C.muted, whiteSpace:'nowrap' }}>שבוע {currentWeek} מתוך 28</span>
          <div style={{ flex:1, height:3, background:'rgba(255,255,255,0.1)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ width:`${(currentWeek/28)*100}%`, height:'100%', background:C.accent, borderRadius:2 }} />
          </div>
          <span style={{ fontFamily:C.mono, fontSize:11, color:C.accent }}>{totalKmDone.toFixed(0)} ק"מ</span>
        </div>
      </div>

      <div style={{ maxWidth:440, margin:'0 auto', padding:'12px 12px 90px' }}>

        {/* ════ DASHBOARD ════ */}
        {tab === 'dashboard' && <>
          {/* Goal card */}
          <div style={{ background:'linear-gradient(135deg,rgba(255,85,0,0.12) 0%,rgba(17,13,24,0.8) 100%)', border:`1px solid rgba(255,85,0,0.25)`, borderRadius:14, padding:16, marginBottom:10, backdropFilter:'blur(12px)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', fontFamily:C.mono, fontSize:76, fontWeight:700, color:'rgba(255,85,0,0.05)', left:-6, bottom:-14, lineHeight:1, pointerEvents:'none' }}>42.2</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,85,0,0.6)', letterSpacing:'0.14em', textTransform:'uppercase' }}>מטרה</div>
                <div style={{ fontSize:16, fontWeight:700 }}>BMW Berlin Marathon</div>
                <div style={{ fontSize:12, color:C.muted }}>27.09.2026</div>
              </div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontFamily:C.mono, fontSize:26, fontWeight:700, color:C.accent, lineHeight:1 }}>4:00</div>
                <div style={{ fontSize:10, color:C.muted }}>יעד</div>
              </div>
            </div>
            <div style={{ height:5, background:'rgba(255,255,255,0.1)', borderRadius:3, overflow:'hidden', marginBottom:5 }}>
              <div style={{ width:`${goalPct}%`, height:'100%', background:`linear-gradient(90deg,${C.accent},#ff8c42)`, borderRadius:3, transition:'width 0.8s' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:C.muted }}>
              <span>{totalKmDone.toFixed(0)} ק"מ סה"כ</span><span>{goalPct.toFixed(0)}%</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:10 }}>
            {[{v:`${weekDone}/${weekData?.workouts.length||0}`,l:'אימונים השבוע'},{v:weekKm.toFixed(1),l:'ק"מ השבוע'},{v:totalKmDone.toFixed(0),l:'ק"מ סה"כ'}].map(s=>(
              <div key={s.l} style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, borderRadius:11, padding:'10px 8px', textAlign:'center' }}>
                <div style={{ fontFamily:C.mono, fontSize:18, fontWeight:700 }}>{s.v}</div>
                <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* This week */}
          <Card>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <CardTitle style={{ margin:0 }}>אימוני השבוע — שבוע {currentWeek}</CardTitle>
              {canWrite && (
                <button onClick={() => openFreeModal()} style={{ background:'rgba(255,85,0,0.15)', border:`1px solid rgba(255,85,0,0.35)`, color:C.accent, borderRadius:8, padding:'5px 11px', fontSize:11, fontWeight:700, fontFamily:C.font, cursor:'pointer' }}>
                  + ריצה חופשית
                </button>
              )}
            </div>
            {weekData?.workouts.map(w => {
              const key = wKey(currentWeek, w.day)
              const done = allWorkouts[key]
              const today = isToday(currentWeek, w.day)
              const past  = isPast(currentWeek, w.day)
              const wDate = getWorkoutDate(currentWeek, w.day)
              return (
                <div key={w.day} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:22, width:36, textAlign:'center', flexShrink:0 }}>{TYPE_ICONS[w.type]}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, color:C.muted }}>{DAY_NAMES[w.day]} · {fmtDate(wDate)}</div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{TYPE_NAMES[w.type]}{w.notes?` · ${w.notes}`:''}</div>
                    <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted }}>{w.dist} ק"מ</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, flexShrink:0 }}>
                    {done ? (
                      <>
                        <div style={{ display:'flex', alignItems:'center', gap:5, color:C.green, fontSize:12, fontWeight:600 }}>
                          <span style={{ width:18, height:18, borderRadius:'50%', background:C.green, color:'#000', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900 }}>✓</span>
                          {parseFloat(done.distance).toFixed(1)} ק"מ
                        </div>
                        {done.hr && <div style={{ fontFamily:C.mono, fontSize:10, color:C.muted }}>♥ {done.hr}</div>}
                        {canWrite && <button onClick={() => openModal(currentWeek, w.day, true)} style={Btn.small}>ערוך</button>}
                      </>
                    ) : canWrite ? (
                      <>
                        <button onClick={() => openModal(currentWeek, w.day)} style={Btn.primary}>+ רשום</button>
                        <div style={{ fontSize:11, color: today ? C.accent : past ? C.amber : C.muted }}>
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
          <Card>
            <CardTitle>עומס אימונים</CardTitle>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ flex:1, height:5, background:'rgba(255,255,255,0.1)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ width:`${loadInfo.pct}%`, height:'100%', background:loadInfo.color, borderRadius:3, transition:'width 0.6s' }} />
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:loadInfo.color, whiteSpace:'nowrap' }}>{loadInfo.label}</span>
            </div>
            <div style={{ fontSize:12, color:C.muted, marginTop:7 }}>{weekKm.toFixed(1)} / {plannedKm} ק"מ מתוכננים השבוע</div>
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
            return <Card><CardTitle>סיכום מאמן — שבוע {pw}</CardTitle>{lines.map((l,i)=><div key={i} style={{ fontSize:13, lineHeight:1.7, padding:'2px 0' }}>{l}</div>)}</Card>
          })()}
        </>}

        {/* ════ PLAN ════ */}
        {tab === 'plan' && <>
          <Card>
            <CardTitle>מדריך קצב ודופק</CardTitle>
            {[{icon:'🟢',label:'קל / ארוך',pace:'7:00–7:45 /ק"מ',hr:'דופק 109–127 | Zone 2'},{icon:'🟠',label:'טמפו',pace:'5:30–5:50 /ק"מ',hr:'דופק 145–163 | Zone 3–4'},{icon:'🔴',label:'אינטרוולים',pace:'5:00–5:20 /ק"מ',hr:'דופק 163+ | Zone 4–5'},{icon:'🏆',label:'מרתון',pace:'5:41 /ק"מ',hr:'דופק 140–155 | Zone 3'}].map(r=>(
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:13, color:C.muted }}>{r.icon} {r.label}</span>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontFamily:C.mono, fontSize:12 }}>{r.pace}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{r.hr}</div>
                </div>
              </div>
            ))}
          </Card>

          {PLAN.map(wd => {
            const { week, workouts } = wd
            const isCurrent = week === currentWeek
            const isDone = week < currentWeek && workouts.every(w => allWorkouts[wKey(week,w.day)])
            const completedCount = workouts.filter(w => allWorkouts[wKey(week,w.day)]).length
            const isOpen = openWeeks[week]
            const weekStart = new Date(PLAN_START); weekStart.setDate(PLAN_START.getDate()+(week-1)*7)
            return (
              <div key={week} style={{ marginBottom:5 }}>
                <div onClick={() => setOpenWeeks(p=>({...p,[week]:!p[week]}))} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 13px', background:isCurrent?'rgba(255,85,0,0.08)':C.card, border:`1px solid ${isCurrent?'rgba(255,85,0,0.4)':isDone?'rgba(34,197,94,0.25)':C.border}`, borderRadius:isOpen?'10px 10px 0 0':10, cursor:'pointer', backdropFilter:'blur(12px)' }}>
                  <span style={{ fontFamily:C.mono, fontSize:11, color:C.muted, minWidth:22 }}>{week}</span>
                  <span style={{ flex:1, fontSize:13, fontWeight:600 }}>{week===28?'🏆 מרוץ!':`שבוע ${week}${isCurrent?' ← עכשיו':''}`}</span>
                  <span style={{ fontFamily:C.mono, fontSize:12, color:C.accent }}>{weekTotalKm(wd)} ק"מ</span>
                  <span style={{ color:C.muted, fontSize:11, transition:'transform 0.2s', transform:isOpen?'rotate(90deg)':'none' }}>›</span>
                </div>
                {isOpen && (
                  <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderTop:'none', borderRadius:'0 0 10px 10px', padding:'4px 13px 10px', backdropFilter:'blur(12px)' }}>
                    <div style={{ fontSize:11, color:C.muted, padding:'6px 0 3px' }}>{fmtDate(weekStart)} · {completedCount}/{workouts.length} אימונים</div>
                    {workouts.map(w => {
                      const done = allWorkouts[wKey(week,w.day)]
                      return (
                        <div key={w.day} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
                          <span style={{ color:C.muted, minWidth:38, fontSize:12 }}>{DAY_NAMES[w.day]}</span>
                          <TypeBadge type={w.type} />
                          {w.notes && <span style={{ fontSize:11, color:C.muted }}>{w.notes}</span>}
                          <span style={{ fontFamily:C.mono, fontSize:12, marginRight:'auto' }}>{w.dist} ק"מ</span>
                          {done
                            ? <span style={{ color:C.green, fontSize:12 }}>✓ {parseFloat(done.distance).toFixed(1)}</span>
                            : (week <= currentWeek && canWrite)
                              ? <button onClick={() => openModal(week,w.day)} style={Btn.tiny}>רשום</button>
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
        </>}

        {/* ════ HISTORY ════ */}
        {tab === 'history' && (
          <HistoryTab
            allWorkouts={allWorkouts}
            freeRuns={freeRuns}
            canWrite={canWrite}
            openModal={openModal}
            openFreeModal={openFreeModal}
            deleteFreeRun={deleteFreeRun}
          />
        )}
      </div>

      {/* ── Bottom nav ── */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:440, background:'rgba(11,21,38,0.95)', backdropFilter:'blur(20px)', borderTop:`1px solid ${C.border}`, display:'flex', zIndex:200 }}>
        {[{id:'dashboard',icon:'📊',label:'לוח'},{id:'plan',icon:'📅',label:'תכנית'},{id:'history',icon:'📋',label:'יומן'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'9px 4px 13px', gap:3, border:'none', background:'none', color:tab===t.id?C.accent:C.muted, fontFamily:C.font, fontSize:10, fontWeight:500, cursor:'pointer' }}>
            <span style={{ fontSize:21 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── Planned workout modal ── */}
      {modal && canWrite && (
        <Modal onClose={() => { setModal(null); setFeedback(null) }}>
          <div style={{ fontSize:17, fontWeight:700, marginBottom:2 }}>{modal.isEdit?'ערוך אימון':'רשום אימון'}</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:16 }}>שבוע {modal.weekNum} · {DAY_NAMES[modal.day]} · {fmtDate(getWorkoutDate(modal.weekNum,modal.day))}</div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:18 }}>
            {[{val:modal.planned.dist,lbl:'ק"מ מתוכנן'},{val:TYPE_NAMES[modal.planned.type],lbl:'סוג'},{val:(HR_ZONES[modal.planned.type]||HR_ZONES.easy).z,lbl:'אזור דופק'}].map(b=>(
              <div key={b.lbl} style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, borderRadius:9, padding:'8px 10px', textAlign:'center' }}>
                <div style={{ fontFamily:C.mono, fontSize:15, fontWeight:700 }}>{b.val}</div>
                <div style={{ fontSize:10, color:C.muted }}>{b.lbl}</div>
              </div>
            ))}
          </div>

          <WorkoutFormFields form={form} setForm={setForm} />

          <button onClick={savePlanned} disabled={saving} style={saving?Btn.savingPrimary:Btn.savePrimary}>
            {saving?'שומר...':'✓ שמור אימון'}
          </button>
          <button onClick={() => { setModal(null); setFeedback(null) }} style={Btn.cancel}>ביטול</button>

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

          <Field label="תאריך">
            <input type="date" value={freeForm.date} onChange={e=>setFreeForm(f=>({...f,date:e.target.value}))} style={{ ...inputStyle, fontSize:16, fontFamily:C.font, direction:'ltr' }} />
          </Field>

          <Field label="סוג ריצה">
            <select value={freeForm.type} onChange={e=>setFreeForm(f=>({...f,type:e.target.value}))} style={{ ...inputStyle, fontSize:15, fontFamily:C.font, direction:'rtl', textAlign:'right', cursor:'pointer' }}>
              <option value="easy">🟢 קל</option>
              <option value="tempo">🟠 טמפו</option>
              <option value="intervals">🔴 אינטרוולים</option>
              <option value="long">🔵 ארוך</option>
              <option value="free">🏃 חופשי</option>
            </select>
          </Field>

          <WorkoutFormFields form={freeForm} setForm={setFreeForm} />

          <button onClick={saveFreeRun} disabled={saving} style={saving?Btn.savingPrimary:Btn.savePrimary}>
            {saving?'שומר...':'✓ שמור ריצה'}
          </button>
          <button onClick={() => setFreeModal(null)} style={Btn.cancel}>ביטול</button>
        </Modal>
      )}
    </div>
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
  const cols = { warn:{bg:'rgba(255,184,0,0.08)',b:'rgba(255,184,0,0.25)',c:'#FFB800'}, info:{bg:'rgba(129,140,248,0.08)',b:'rgba(129,140,248,0.25)',c:'#818cf8'}, ok:{bg:'rgba(34,197,94,0.08)',b:'rgba(34,197,94,0.25)',c:'#22c55e'} }
  return alerts.map((a,i) => {
    const cl = cols[a.type]
    return <div key={i} style={{ background:cl.bg, border:`1px solid ${cl.b}`, color:cl.c, borderRadius:10, padding:'10px 12px', marginBottom:8, fontSize:13, lineHeight:1.55 }}>{a.msg}</div>
  })
}

// ─── History tab ──────────────────────────────────────────────────────────────
function HistoryTab({ allWorkouts, freeRuns, canWrite, openModal, openFreeModal, deleteFreeRun }) {
  const entries = []

  // Planned workouts
  PLAN.forEach(wd => {
    wd.workouts.forEach(w => {
      const key = wKey(wd.week, w.day)
      const done = allWorkouts[key]
      if (done && done.distance) entries.push({ isFree:false, week:wd.week, day:w.day, planned:w, done, date:getWorkoutDate(wd.week,w.day) })
    })
  })

  // Free runs
  Object.entries(freeRuns).forEach(([id, r]) => {
    if (r && r.distance && r.date) entries.push({ isFree:true, id, done:r, date:new Date(r.date+'T12:00:00') })
  })

  if (!entries.length) return (
    <div style={{ textAlign:'center', padding:'48px 20px', color:C.muted }}>
      <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
      עדיין אין ריצות מתועדות
    </div>
  )

  entries.sort((a,b) => b.date - a.date)

  return entries.map((e, i) => {
    const { done } = e
    const type  = e.isFree ? (done.type||'free') : e.planned.type
    const label = e.isFree ? (done.notes||'ריצה חופשית') : `${TYPE_NAMES[e.planned.type]}${e.planned.notes?` · ${e.planned.notes}`:''}`
    const pace  = (done.distance && done.timeMin) ? fmtPace(parseFloat(done.distance), parseFloat(done.timeMin)) : ''
    const fb    = done.feedback?.slice(0,2).join(' · ') || ''

    return (
      <div key={i} style={{ display:'flex', gap:12, padding:14, background:C.card, border:`1px solid ${e.isFree?'rgba(255,255,255,0.06)':C.border}`, borderRadius:14, marginBottom:8, backdropFilter:'blur(12px)' }}>
        <div style={{ fontSize:22, width:36, paddingTop:2, flexShrink:0 }}>{TYPE_ICONS[type]||'🏃'}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:11, color:C.muted, marginBottom:2 }}>
            {e.isFree ? `🏃 חופשי · ${fmtDateLong(e.date)}` : `שבוע ${e.week} · ${DAY_NAMES[e.day]} · ${fmtDateLong(e.date)}`}
          </div>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:5 }}>{label}</div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {done.distance && <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:C.muted }}><span style={{ color:C.text }}>{parseFloat(done.distance).toFixed(1)}</span> ק"מ</span>}
            {done.hr       && <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:C.muted }}>♥ <span style={{ color:C.text }}>{done.hr}</span></span>}
            {pace          && <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:C.muted }}>⏱ <span style={{ color:C.text }}>{pace}</span></span>}
            {done.power    && <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:C.muted }}>⚡ <span style={{ color:C.text }}>{done.power}W</span></span>}
            {done.effort   && <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:C.muted }}>מאמץ <span style={{ color:C.text }}>{done.effort}/10</span></span>}
          </div>
          {fb && <div style={{ fontSize:12, color:C.muted, marginTop:6, lineHeight:1.5, borderTop:`1px solid ${C.border}`, paddingTop:6 }}>{fb}</div>}
        </div>
        {canWrite && (
          <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
            <button onClick={() => e.isFree ? openFreeModal(e.id) : openModal(e.week, e.day, true)} style={Btn.tiny}>ערוך</button>
            {e.isFree && <button onClick={() => deleteFreeRun(e.id)} style={{ ...Btn.tiny, color:C.red, borderColor:'rgba(239,68,68,0.25)' }}>מחק</button>}
          </div>
        )}
      </div>
    )
  })
}

// ─── Shared form fields ───────────────────────────────────────────────────────
function WorkoutFormFields({ form, setForm }) {
  const hrZone = form.hr ? hrZoneLabel(parseInt(form.hr)) : ''
  return <>
    <Field label="מרחק (ק״מ)">
      <input type="number" inputMode="decimal" placeholder="0.0" step="0.1" min="0" value={form.dist} onChange={e=>setForm(f=>({...f,dist:e.target.value}))} style={inputStyle} />
    </Field>
    <Field label="זמן ריצה">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 14px 1fr', alignItems:'center', gap:4, direction:'ltr' }}>
        <input type="number" inputMode="numeric" placeholder="35" min="0" max="999" value={form.min} onChange={e=>setForm(f=>({...f,min:e.target.value}))} style={inputStyle} />
        <div style={{ textAlign:'center', fontSize:20, fontWeight:700, color:C.muted }}>:</div>
        <input type="number" inputMode="numeric" placeholder="20" min="0" max="59" value={form.sec} onChange={e=>setForm(f=>({...f,sec:e.target.value}))} style={inputStyle} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 14px 1fr', marginTop:4, direction:'ltr' }}>
        <div style={{ textAlign:'center', fontSize:10, color:C.muted }}>דקות</div><div/><div style={{ textAlign:'center', fontSize:10, color:C.muted }}>שניות</div>
      </div>
    </Field>
    <Field label={`דופק ממוצע (bpm)${hrZone ? ` — ${hrZone}` : ''}`}>
      <input type="number" inputMode="numeric" placeholder="140" value={form.hr} onChange={e=>setForm(f=>({...f,hr:e.target.value}))} style={inputStyle} />
    </Field>
    <Field label="Running Power (ואט) — אופציונלי">
      <input type="number" inputMode="numeric" placeholder="220" value={form.power} onChange={e=>setForm(f=>({...f,power:e.target.value}))} style={inputStyle} />
    </Field>
    <Field label={`מאמץ סובייקטיבי — ${form.effort||5}/10`}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <input type="range" min="1" max="10" value={form.effort||5} onChange={e=>setForm(f=>({...f,effort:e.target.value}))} style={{ flex:1, accentColor:C.accent, height:4, cursor:'pointer' }} />
        <div style={{ fontFamily:C.mono, fontSize:22, fontWeight:700, color:C.accent, width:26, textAlign:'center' }}>{form.effort||5}</div>
      </div>
    </Field>
    <Field label="הערות (אופציונלי)">
      <input type="text" placeholder="..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{ ...inputStyle, fontFamily:C.font, fontSize:14, textAlign:'right', direction:'rtl' }} />
    </Field>
  </>
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ children, onClose }) {
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose()}} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:'linear-gradient(180deg,#0f1e3a 0%,#0b1526 100%)', border:`1px solid ${C.border}`, borderRadius:'20px 20px 0 0', width:'100%', maxWidth:440, padding:'16px 18px 32px', maxHeight:'92vh', overflowY:'auto', fontFamily:C.font, direction:'rtl' }}>
        <div style={{ width:38, height:4, background:C.border, borderRadius:2, margin:'0 auto 14px' }} />
        {children}
      </div>
    </div>
  )
}

function FeedbackBox({ lines }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, borderRadius:12, padding:14, marginTop:16 }}>
      <div style={{ fontSize:10, fontWeight:700, color:C.accent, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:8 }}>📊 משוב מאמן</div>
      {lines.map((l,i) => <div key={i} style={{ fontSize:13, lineHeight:1.7, padding:'2px 0' }}>{l}</div>)}
    </div>
  )
}

const Btn = {
  primary: { background:C.accent, color:'#fff', border:'none', borderRadius:8, padding:'7px 13px', fontSize:12, fontWeight:600, fontFamily:C.font, cursor:'pointer', whiteSpace:'nowrap' },
  small:   { background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:7, padding:'4px 10px', fontSize:11, fontFamily:C.font, cursor:'pointer' },
  tiny:    { background:'transparent', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:6, padding:'3px 9px', fontSize:11, fontFamily:C.font, cursor:'pointer' },
  savePrimary:   { width:'100%', background:C.accent, border:'none', color:'#fff', borderRadius:12, padding:15, fontSize:16, fontWeight:700, fontFamily:C.font, cursor:'pointer', marginTop:6 },
  savingPrimary: { width:'100%', background:'rgba(255,85,0,0.4)', border:'none', color:'#fff', borderRadius:12, padding:15, fontSize:16, fontWeight:700, fontFamily:C.font, cursor:'default', marginTop:6 },
  cancel:  { width:'100%', background:'transparent', border:`1px solid ${C.border}`, color:C.muted, borderRadius:12, padding:12, fontSize:14, fontWeight:600, fontFamily:C.font, cursor:'pointer', marginTop:8 },
}
