import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'
import { supabase } from '../lib/supabase'

const FONT = "'Open Sans Hebrew','Open Sans',Arial,sans-serif"
const PARENT_EMAILS = ['erez@barons.co.il', 'roy@barons.co.il']
const STUDENT_EMAILS = ['danielle@barons.co.il', 'daphna@barons.co.il']

const STUDENT_META = {
  'danielle@barons.co.il': { name: 'דניאל', color: '#8b5cf6', emoji: '🦋' },
  'daphna@barons.co.il':   { name: 'דפנה',  color: '#ec4899', emoji: '🌸' },
}

const SUBJECT_META = {
  english: { label: '🇬🇧 English', locked: false },
  math:    { label: '🔢 מתמטיקה', locked: true },
  science: { label: '🔬 מדעים',   locked: true },
}

const C = {
  navy:   '#0b1a3e',
  blue:   '#1d4ed8',
  bg:     '#f0f4ff',
  white:  '#ffffff',
  gold:   '#f59e0b',
  goldL:  '#fef3c7',
  green:  '#10b981',
  greenL: '#d1fae5',
  red:    '#ef4444',
  redL:   '#fee2e2',
  purple: '#8b5cf6',
  purpleL:'#ede9fe',
  border: '#e2e8f0',
  mid:    '#475569',
  light:  '#94a3b8',
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function initials(email) {
  const meta = STUDENT_META[email]
  return meta ? meta.emoji : '?'
}
function studentColor(email) {
  return (STUDENT_META[email] || {}).color || C.blue
}
function studentName(email) {
  return (STUDENT_META[email] || {}).name || email
}
function xpToLevel(xp) { return Math.floor(xp / 100) + 1 }
function xpInLevel(xp) { return xp % 100 }

// ─── tiny UI pieces ───────────────────────────────────────────────────────────
function Pill({ label, style }) {
  return (
    <span style={{ fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:99, ...style }}>
      {label}
    </span>
  )
}

function XPBar({ xp }) {
  const pct = xpInLevel(xp)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
      <span style={{ fontSize:12, fontWeight:800, color:C.gold }}>⭐ {xp} XP</span>
      <div style={{ flex:1, height:8, background:C.goldL, borderRadius:99, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:C.gold, borderRadius:99, transition:'width .5s' }} />
      </div>
      <span style={{ fontSize:12, fontWeight:800, color:C.gold }}>Lv.{xpToLevel(xp)}</span>
    </div>
  )
}

function ScoreRing({ pct }) {
  const r = 18, circ = 2 * Math.PI * r
  const color = pct >= 80 ? C.green : C.gold
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" style={{ flexShrink:0 }}>
      <circle cx="22" cy="22" r={r} fill="none" stroke={C.border} strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
        transform="rotate(-90 22 22)" strokeLinecap="round" />
      <text x="22" y="26" textAnchor="middle" fontSize="10" fontWeight="800" fill={color}>{pct}%</text>
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function School({ session }) {
  const navigate    = useNavigate()
  const email       = session?.user?.email || ''
  const isParent    = PARENT_EMAILS.includes(email)
  const isStudent   = STUDENT_EMAILS.includes(email)

  const [missions,   setMissions]   = useState([])
  const [progress,   setProgress]   = useState({}) // { missionId: { score, completed, xp, answers } }
  const [allProgress,setAllProgress]= useState({}) // parent: { email: { missionId: {...} } }
  const [subject,    setSubject]     = useState('english')
  const [loading,    setLoading]     = useState(true)
  const [activeMission, setActiveMission] = useState(null) // null = list view

  // load missions
  useEffect(() => {
    supabase
      .from('school_missions')
      .select('*')
      .eq('active', true)
      .order('created_at')
      .then(({ data }) => setMissions(data || []))
  }, [])

  // load progress
  useEffect(() => {
    if (!email) return
    if (isStudent) {
      supabase
        .from('school_progress')
        .select('mission_id, score, completed, xp, answers')
        .eq('user_id', session.user.id)
        .then(({ data }) => {
          const map = {}
          ;(data || []).forEach(r => { map[r.mission_id] = r })
          setProgress(map)
          setLoading(false)
        })
    } else if (isParent) {
      supabase
        .from('school_progress')
        .select('user_id, mission_id, score, completed, xp, answers, student_email')
        .then(({ data, error }) => {
          const map = {}
          ;(data || []).forEach(r => {
            const e = r.student_email || r.user_id
            if (!map[e]) map[e] = {}
            map[e][r.mission_id] = r
          })
          setAllProgress(map)
          setLoading(false)
        })
    }
  }, [email])

  // total XP for student
  const totalXP = Object.values(progress).reduce((s, p) => s + (p.xp || 0), 0)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:C.bg, fontFamily:FONT, fontSize:18, color:C.navy }}>
      טוען...
    </div>
  )

  if (activeMission) {
    return (
      <SchoolMission
        session={session}
        mission={activeMission}
        savedProgress={progress[activeMission.id]}
        onComplete={(newXP) => {
          setProgress(prev => ({
            ...prev,
            [activeMission.id]: { ...prev[activeMission.id], completed: true, xp: newXP }
          }))
          setActiveMission(null)
        }}
        onBack={() => setActiveMission(null)}
      />
    )
  }

  if (isParent) return (
    <SchoolParentDashboard
      session={session}
      missions={missions}
      allProgress={allProgress}
      onBack={() => navigate('/')}
    />
  )

  // ─── Student dashboard ────────────────────────────────────────────────────
  const subjectMissions = missions.filter(m => m.subject === subject)

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:FONT, direction:'rtl' }}>
      <BaronsHeader
        variant="light"
        title="אקדמיית ברון"
        subtitle="לימודים ומשימות"
        breadcrumbs={[{ label: 'לימודים', path: '/school' }]}
        session={session}
      />

      <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 16px' }}>
        {/* welcome card */}
        <div style={{ background:C.white, borderRadius:20, padding:'20px 24px', marginBottom:20, boxShadow:'0 2px 8px rgba(11,26,62,.07)', display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:60, height:60, borderRadius:'50%', background:studentColor(email), display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>
            {initials(email)}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:20, color:C.navy }}>Hi, {studentName(email)}! 👋</div>
            <div style={{ fontSize:14, color:C.mid, marginTop:2 }}>Level {xpToLevel(totalXP)} — Keep going! 🚀</div>
            <XPBar xp={totalXP} />
          </div>
        </div>

        {/* subject tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          {Object.entries(SUBJECT_META).map(([id, meta]) => (
            <button
              key={id}
              disabled={meta.locked}
              onClick={() => setSubject(id)}
              style={{
                padding:'6px 16px', borderRadius:99, fontSize:13, fontWeight:700, fontFamily:FONT,
                cursor: meta.locked ? 'not-allowed' : 'pointer',
                border: subject===id ? 'none' : `2px solid ${C.border}`,
                background: subject===id ? C.blue : C.white,
                color: subject===id ? C.white : meta.locked ? C.light : C.mid,
                opacity: meta.locked ? 0.55 : 1,
                transition:'all .2s',
              }}>
              {meta.label}{meta.locked ? ' 🔒' : ''}
            </button>
          ))}
        </div>

        {/* missions */}
        <div style={{ fontWeight:800, fontSize:16, color:C.navy, marginBottom:12 }}>📋 Missions</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {subjectMissions.length === 0 && (
            <div style={{ textAlign:'center', color:C.light, padding:40, background:C.white, borderRadius:16, fontSize:14 }}>
              אין משימות עדיין. הורה יכול להוסיף דרך הממשק שלו.
            </div>
          )}
          {[...subjectMissions]
            .sort((a, b) => {
              const aDone = !!(progress[a.id]?.completed)
              const bDone = !!(progress[b.id]?.completed)
              if (aDone && !bDone) return 1
              if (!aDone && bDone) return -1
              return 0
            })
            .map(m => {
            const mp      = progress[m.id] || {}
            const done    = !!mp.completed
            const started = (mp.answers || []).length > 0
            const totalQ  = (m.questions || []).length
            const scorePct= done && totalQ > 0 ? Math.min(100, Math.round((mp.score / totalQ) * 100)) : null
            const dateStr = mp.last_completed_at
              ? new Date(mp.last_completed_at).toLocaleDateString('he-IL', { day:'numeric', month:'short' })
              : null

            return (
              <div
                key={m.id}
                onClick={() => setActiveMission(m)}
                style={{
                  background: done ? '#f8fffe' : C.white,
                  borderRadius:16, padding:'16px 20px',
                  boxShadow:'0 2px 8px rgba(11,26,62,.07)',
                  display:'flex', alignItems:'center', gap:16, cursor:'pointer',
                  border:`2.5px solid ${done ? C.green : started ? C.blue : 'transparent'}`,
                  transition:'border-color .2s, transform .1s',
                  opacity: done ? 0.75 : 1,
                }}>
                <div style={{ width:52, height:52, borderRadius:14, background:`${m.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
                  {m.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:15, color:C.navy }}>{m.title}</div>
                  <div style={{ fontSize:12, color:C.mid, marginTop:2 }}>{m.description}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, flexWrap:'wrap' }}>
                    <Pill label={`+${m.xp} XP`} style={{ background:C.goldL, color:'#92400e' }} />
                    {done   && <Pill label="✅ Done"        style={{ background:C.greenL,  color:'#065f46' }} />}
                    {!done && started && <Pill label="▶ In Progress" style={{ background:C.purpleL, color:'#5b21b6' }} />}
                    {!done && !started && <Pill label="🆕 New"       style={{ background:C.bg,      color:C.mid    }} />}
                    {dateStr && <span style={{ fontSize:11, color:C.light }}>📅 {dateStr}</span>}
                    <span style={{ fontSize:11, color:C.light }}>{totalQ} questions</span>
                  </div>
                </div>
                {scorePct !== null && <ScoreRing pct={scorePct} />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Mission player ───────────────────────────────────────────────────────────
function SchoolMission({ session, mission, savedProgress, onComplete, onBack }) {
  const questions     = mission.questions || []
  const totalOriginal = questions.length

  // resume from where they left off
  const startQ = savedProgress?.answers ? Math.min(savedProgress.answers.length, totalOriginal - 1) : 0

  const [currentQ,    setCurrentQ]   = useState(startQ)
  const [answered,    setAnswered]   = useState(false)
  const [feedback,    setFeedback]   = useState(null)
  const [score,       setScore]      = useState(savedProgress?.score || 0)
  const [answers,     setAnswers]    = useState(savedProgress?.answers || [])
  const [openText,    setOpenText]   = useState('')
  const [tooltip,     setTooltip]    = useState(null)
  const [celebrating, setCelebrating]= useState(false)
  const [selectedIdx, setSelectedIdx]= useState(null)

  const q = questions[currentQ]

  // save progress — always upsert
  async function saveProgress(newScore, newAnswers, completed, earnedXP) {
    // fetch current attempts (mayfail if no row yet — that's fine)
    const { data: existing } = await supabase
      .from('school_progress')
      .select('attempts')
      .eq('user_id', session.user.id)
      .eq('mission_id', mission.id)
      .maybeSingle()
    const currentAttempts = existing?.attempts || 0
    const newAttempts = completed ? currentAttempts + 1 : currentAttempts

    const row = {
      user_id: session.user.id,
      mission_id: mission.id,
      student_email: session.user.email,
      score: newScore,
      answers: newAnswers,
      completed,
      xp: earnedXP,
      attempts: newAttempts,
      updated_at: new Date().toISOString()
    }
    if (completed) row.last_completed_at = new Date().toISOString()

    await supabase.from('school_progress').upsert(row, { onConflict: 'user_id,mission_id' })
  }

  function handleMC(idx) {
    if (answered === 'done') return

    const correct = idx === q.correct
    setSelectedIdx(idx)

    if (correct) {
      // correct on first OR second try
      const points  = answered === 'first_wrong' ? 0.5 : 1
      const newScore   = score + points
      const newAnswers = [...answers, { q: currentQ, correct: true, points }]
      setScore(newScore)
      setAnswers(newAnswers)
      setAnswered('done')
      setFeedback({ type: 'correct', text: answered === 'first_wrong' ? '🌟 You got it this time! Great persistence!' : q.feedback_correct })
      saveProgress(newScore, newAnswers, false, 0)
    } else {
      if (answered === 'first_wrong') {
        // second wrong — move on with 0 points, now reveal correct
        const newAnswers = [...answers, { q: currentQ, correct: false, points: 0 }]
        setAnswers(newAnswers)
        setAnswered('done')
        setFeedback({ type: 'wrong', text: `The correct answer is: "${q.options[q.correct]}". Keep going! 💪`, revealCorrect: true })
        saveProgress(score, newAnswers, false, 0)
      } else {
        // first wrong — show hint, allow retry
        setAnswered('first_wrong')
        setFeedback({ type: 'wrong', text: q.feedback_wrong })
      }
    }
  }

  function handleOpen() {
    if (answered === 'done') return
    const text = openText.toLowerCase()
    const matched = (q.keywords || []).filter(kw => text.includes(kw))
    const ratio = matched.length / Math.max(3, (q.keywords || []).length * 0.4)
    let type = 'wrong', partial = false
    if (ratio >= 1) type = 'correct'
    else if (ratio >= 0.4 && text.length > 15) { type = 'partial'; partial = true }

    if (type === 'wrong' && answered !== 'first_wrong') {
      // first wrong open — allow retry
      setAnswered('first_wrong')
      setFeedback({ type: 'wrong', text: q.feedback_wrong })
      return
    }

    const points = type === 'correct' ? 1 : type === 'partial' ? 0.5 : 0
    const newScore   = score + points
    const newAnswers = [...answers, { q: currentQ, correct: type !== 'wrong', partial }]
    setScore(newScore)
    setAnswers(newAnswers)
    setAnswered('done')
    const fb = type === 'correct' ? q.feedback_correct : type === 'partial' ? q.feedback_partial : q.feedback_wrong
    setFeedback({ type, text: fb })
    saveProgress(newScore, newAnswers, false, 0)
  }

  function handleNext() {
    setAnswered(false)
    setFeedback(null)
    setOpenText('')
    setSelectedIdx(null)
    if (currentQ + 1 >= questions.length) {
      completeMission()
    } else {
      setCurrentQ(c => c + 1)
    }
  }

  async function completeMission() {
    const ratio  = Math.min(1, score / totalOriginal)
    const earned = Math.round(mission.xp * ratio)
    await saveProgress(score, answers, true, earned)
    setCelebrating({ pct: Math.round(ratio * 100), earned })
  }

  function showHint(text, e) {
    const rect = e.target.getBoundingClientRect()
    setTooltip({ text, x: rect.left, y: rect.bottom + window.scrollY + 8 })
    setTimeout(() => setTooltip(null), 2200)
  }

  // render passage text with hint spans
  function PassageText({ html }) {
    return (
      <div
        dir="ltr"
        style={{ fontSize:15, lineHeight:1.85, color:'#1e293b' }}
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={e => {
          if (e.target.dataset.hint) showHint(e.target.dataset.hint, e)
        }}
      />
    )
  }

  const fbColors = {
    correct: { bg: C.greenL, color:'#065f46', border: C.green },
    wrong:   { bg: C.redL,   color:'#991b1b', border: C.red   },
    partial: { bg: C.goldL,  color:'#78350f', border: C.gold  },
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:FONT, direction:'ltr' }}>
      {/* tooltip */}
      {tooltip && (
        <div style={{ position:'fixed', left:tooltip.x, top:tooltip.y, background:C.navy, color:C.white, padding:'6px 14px', borderRadius:10, fontSize:13, fontWeight:700, zIndex:999, pointerEvents:'none', direction:'rtl' }}>
          {tooltip.text}
        </div>
      )}

      {/* celebration */}
      {celebrating && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,26,62,.7)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:C.white, borderRadius:24, padding:'40px 32px', textAlign:'center', maxWidth:320, width:'90%', animation:'popIn .4s cubic-bezier(.175,.885,.32,1.275)' }}>
            <div style={{ fontSize:56 }}>{celebrating.pct >= 80 ? '🏆' : celebrating.pct >= 50 ? '⭐' : '💪'}</div>
            <div style={{ fontWeight:900, fontSize:22, color:C.navy, margin:'10px 0 6px' }}>
              {celebrating.pct >= 80 ? 'Excellent!' : celebrating.pct >= 50 ? 'Good Job!' : 'Keep Going!'}
            </div>
            <div style={{ fontSize:14, color:C.mid }}>Score: {celebrating.pct}%</div>
            <div style={{ fontWeight:800, fontSize:18, color:C.gold, margin:'12px 0' }}>+{celebrating.earned} XP ⭐</div>
            <button onClick={() => onComplete(celebrating.earned)} style={{ padding:'12px 32px', background:C.blue, color:C.white, border:'none', borderRadius:12, fontSize:16, fontWeight:800, fontFamily:FONT, cursor:'pointer' }}>
              Continue →
            </button>
          </div>
        </div>
      )}
      <BaronsHeader
        variant="light"
        title={mission.title}
        subtitle="אקדמיית ברון"
        breadcrumbs={[
          { label: 'לימודים', path: '/school' },
          { label: mission.title },
        ]}
        actions={[{ label: '← חזרה', onClick: onBack }]}
      />

      <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 16px' }}>
        {/* progress */}
        <div style={{ background:C.white, borderRadius:16, padding:'14px 20px', marginBottom:20, boxShadow:'0 2px 8px rgba(11,26,62,.07)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:13, fontWeight:700, color:C.mid }}>Progress</span>
            <span style={{ fontSize:13, fontWeight:800, color:C.blue }}>{currentQ}/{totalOriginal}</span>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {Array.from({ length: totalOriginal }).map((_, i) => (
              <div key={i} style={{ width:28, height:8, borderRadius:99, background: i < currentQ ? C.green : i === currentQ ? C.blue : C.border, transition:'background .3s' }} />
            ))}
          </div>
        </div>

        {/* passage — always visible */}
        {mission.passage && (
          <div style={{ background:C.white, borderRadius:16, padding:'20px 24px', marginBottom:20, boxShadow:'0 2px 8px rgba(11,26,62,.07)', borderRight:`5px solid ${C.blue}` }}>
            <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:C.blue, marginBottom:6 }}>📖 Reading Passage</div>
            <div style={{ fontWeight:800, fontSize:16, color:C.navy, marginBottom:12 }}>{mission.passage.title}</div>
            <PassageText html={mission.passage.text} />
          </div>
        )}

        {/* question */}
        {q && (
          <div style={{ background:C.white, borderRadius:16, padding:'20px 24px', boxShadow:'0 2px 8px rgba(11,26,62,.07)' }}>
            <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:C.purple, marginBottom:6 }}>
              Question {currentQ + 1} of {questions.length}
            </div>
            <div style={{ fontWeight:700, fontSize:15, color:C.navy, marginBottom:12, lineHeight:1.5 }}>
              {q.text}
            </div>
            {q.hint_he && (answered === 'first_wrong' || (answered === 'done' && feedback?.type === 'wrong')) && (
              <div dir="rtl" style={{ fontSize:12, color:C.mid, padding:'6px 10px', background:'#f8fafc', borderRadius:8, borderRight:`3px solid ${C.gold}`, marginBottom:14, marginTop:8 }}>
                🇮🇱 {q.hint_he}
              </div>
            )}

            {/* MC options */}
            {q.type === 'mc' && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {q.options.map((opt, i) => {
                  let bg = C.white, border = C.border, color = '#1e293b'
                  const isDone    = answered === 'done'
                  const isWrong1  = answered === 'first_wrong'
                  const isSelected = selectedIdx === i
                  if (isDone && feedback?.type === 'correct' && i === q.correct) {
                    bg = C.greenL; border = C.green; color = '#065f46'
                  } else if (isDone && feedback?.revealCorrect && i === q.correct) {
                    bg = C.greenL; border = C.green; color = '#065f46'
                  } else if (isSelected && (isWrong1 || isDone) && i !== q.correct) {
                    bg = C.redL; border = C.red; color = '#991b1b'
                  }
                  const bulletBg    = (isDone && i === q.correct) ? C.green : '#f0f4ff'
                  const bulletColor = (isDone && i === q.correct) ? C.white : C.navy
                  const isDisabled  = isDone || (isWrong1 && i === selectedIdx)
                  return (
                    <button
                      key={i}
                      disabled={isDisabled}
                      onClick={() => handleMC(i)}
                      style={{ width:'100%', textAlign:'left', padding:'12px 16px', border:`2.5px solid ${border}`, borderRadius:12, background:bg, fontSize:14, fontFamily:FONT, cursor: isDisabled ? 'default' : 'pointer', color, fontWeight:600, display:'flex', alignItems:'center', gap:10, transition:'all .15s' }}>
                      <span style={{ width:26, height:26, borderRadius:'50%', background: bulletBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color: bulletColor, flexShrink:0 }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Open answer */}
            {q.type === 'open' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <textarea
                  value={openText}
                  onChange={e => setOpenText(e.target.value)}
                  disabled={answered === 'done'}
                  placeholder="Write your answer here..."
                  style={{ width:'100%', minHeight:90, padding:'12px 16px', border:`2px solid ${answered === 'first_wrong' ? C.red : C.border}`, borderRadius:12, fontSize:14, fontFamily:FONT, color:'#1e293b', resize:'vertical', direction:'ltr', textAlign:'left' }}
                />
                {answered !== 'done' && (
                  <button onClick={handleOpen} style={{ alignSelf:'flex-start', padding:'10px 24px', background:C.blue, color:C.white, border:'none', borderRadius:12, fontSize:14, fontWeight:800, fontFamily:FONT, cursor:'pointer' }}>
                    {answered === 'first_wrong' ? 'Try Again ✓' : 'Submit ✓'}
                  </button>
                )}
              </div>
            )}

            {/* feedback */}
            {feedback && (
              <div style={{ marginTop:12, padding:'12px 16px', background: fbColors[feedback.type].bg, color: fbColors[feedback.type].color, borderRadius:12, fontSize:13, fontWeight:700, borderRight:`4px solid ${fbColors[feedback.type].border}` }}>
                {feedback.text}
              </div>
            )}

            {/* next */}
            {answered === 'done' && (
              <button onClick={handleNext} style={{ width:'100%', marginTop:16, padding:'14px', background:C.navy, color:C.white, border:'none', borderRadius:12, fontSize:15, fontWeight:800, fontFamily:FONT, cursor:'pointer' }}>
                {currentQ + 1 >= questions.length ? 'Finish Mission 🎉' : 'Next Question →'}
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes popIn { from { transform:scale(.7); opacity:0 } to { transform:scale(1); opacity:1 } }`}</style>
    </div>
  )
}

// ─── Parent dashboard ─────────────────────────────────────────────────────────
function SchoolParentDashboard({ session, missions, allProgress, onBack }) {
  const [material,     setMaterial]     = useState('')
  const [generating,   setGenerating]   = useState(false)
  const [genMsg,       setGenMsg]       = useState('')
  const [previewMode,  setPreviewMode]  = useState(false)
  const [previewMission, setPreviewMission] = useState(null)
  const navigate = useNavigate()
  const isReadOnly = session?.user?.email === 'roy@barons.co.il'

  // ── Preview mode ──────────────────────────────────────────────────────────
  if (previewMode) {
    if (previewMission) {
      return (
        <div>
          <div style={{ background:C.navy, color:C.white, padding:'8px 20px', fontSize:13, fontWeight:700, display:'flex', justifyContent:'space-between', alignItems:'center', direction:'rtl' }}>
            <span>👁️ תצוגה מקדימה — לא נשמר</span>
            <button onClick={() => setPreviewMission(null)} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:C.white, padding:'4px 12px', borderRadius:8, cursor:'pointer', fontFamily:FONT, fontSize:12 }}>← חזור לרשימה</button>
          </div>
          <SchoolMission
            session={session}
            mission={previewMission}
            savedProgress={null}
            onComplete={() => setPreviewMission(null)}
            onBack={() => setPreviewMission(null)}
            previewMode={true}
          />
        </div>
      )
    }
    const subjectMissions = missions.filter(m => m.subject === 'english')
    return (
      <div style={{ minHeight:'100vh', background:C.bg, fontFamily:FONT, direction:'rtl' }}>
        <div style={{ background:C.navy, color:C.white, padding:'8px 20px', fontSize:13, fontWeight:700, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>👁️ תצוגה מקדימה של ממשק הבנות — לא נשמר</span>
          <button onClick={() => setPreviewMode(false)} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:C.white, padding:'4px 12px', borderRadius:8, cursor:'pointer', fontFamily:FONT, fontSize:12 }}>✕ סגור תצוגה מקדימה</button>
        </div>
        <div style={{ background:C.white, height:52, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', boxShadow:'0 2px 8px rgba(11,26,62,.07)' }}>
          <span style={{ fontWeight:900, fontSize:16, color:C.navy }}><span style={{ color:C.blue }}>BARONS</span> / אקדמיית ברון</span>
        </div>
        <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 16px' }}>
          <div style={{ background:C.white, borderRadius:20, padding:'20px 24px', marginBottom:20, boxShadow:'0 2px 8px rgba(11,26,62,.07)', display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:60, height:60, borderRadius:'50%', background:'#8b5cf6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>🦋</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:900, fontSize:20, color:C.navy }}>Hi, דניאל! 👋</div>
              <div style={{ fontSize:14, color:C.mid, marginTop:2 }}>Level 1 — Keep going! 🚀</div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
                <span style={{ fontSize:12, fontWeight:800, color:C.gold }}>⭐ 0 XP</span>
                <div style={{ flex:1, height:8, background:C.goldL, borderRadius:99 }}><div style={{ width:'0%', height:'100%', background:C.gold, borderRadius:99 }} /></div>
                <span style={{ fontSize:12, fontWeight:800, color:C.gold }}>Lv.1</span>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:20 }}>
            <button style={{ padding:'6px 16px', borderRadius:99, fontSize:13, fontWeight:700, fontFamily:FONT, background:C.blue, color:C.white, border:'none', cursor:'pointer' }}>🇬🇧 English</button>
            <button style={{ padding:'6px 16px', borderRadius:99, fontSize:13, fontWeight:700, fontFamily:FONT, background:C.white, color:C.light, border:`2px solid ${C.border}`, cursor:'not-allowed', opacity:.55 }}>🔢 מתמטיקה 🔒</button>
          </div>
          <div style={{ fontWeight:800, fontSize:16, color:C.navy, marginBottom:12 }}>📋 Missions</div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {subjectMissions.length === 0 && (
              <div style={{ textAlign:'center', color:C.light, padding:40, background:C.white, borderRadius:16, fontSize:14 }}>אין משימות עדיין</div>
            )}
            {subjectMissions.map(m => {
              const totalQ = (m.questions || []).filter(q => !q.isReinforcement).length
              return (
                <div key={m.id} onClick={() => setPreviewMission(m)}
                  style={{ background:C.white, borderRadius:16, padding:'16px 20px', boxShadow:'0 2px 8px rgba(11,26,62,.07)', display:'flex', alignItems:'center', gap:16, cursor:'pointer', border:'2.5px solid transparent', transition:'border-color .2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor=C.blue}
                  onMouseLeave={e => e.currentTarget.style.borderColor='transparent'}>
                  <div style={{ width:52, height:52, borderRadius:14, background:`${m.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{m.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:15, color:C.navy }}>{m.title}</div>
                    <div style={{ fontSize:12, color:C.mid, marginTop:2 }}>{m.description}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                      <span style={{ fontSize:12, fontWeight:800, padding:'2px 8px', borderRadius:99, background:C.goldL, color:'#92400e' }}>+{m.xp} XP</span>
                      <span style={{ fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:99, background:C.bg, color:C.mid }}>🆕 New</span>
                      <span style={{ fontSize:11, color:C.light }}>{totalQ} questions</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  async function generateMission() {
    if (!material.trim()) return
    setGenerating(true)
    setGenMsg('')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: `You are creating an English reading mission for Israeli 5th grade girls (age 10-11) who struggle with English.

Based on this study material:
---
${material}
---

Respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "subject": "english",
  "title": "SHORT TITLE (max 4 words)",
  "description": "Brief description",
  "icon": "ONE EMOJI",
  "color": "#hex",
  "xp": 35,
  "grade": 5,
  "passage": {
    "title": "Passage title",
    "text": "3 paragraphs in simple English (grade 4-5 level). For hard words use: <span data-hint='HEBREW_TRANSLATION' style='cursor:pointer;border-bottom:2px dotted #1d4ed8;color:#1d4ed8;font-weight:600'>ENGLISH_WORD</span>"
  },
  "questions": [
    { "type": "mc", "text": "Question?", "hint_he": "בעברית?", "options": ["A","B","C","D"], "correct": 0, "feedback_correct": "Great!", "feedback_wrong": "Hint pointing to text" },
    { "type": "mc", "text": "Question 2?", "hint_he": "בעברית?", "options": ["A","B","C","D"], "correct": 2, "feedback_correct": "Correct!", "feedback_wrong": "Hint" },
    { "type": "open", "text": "Open question (1-2 sentences)?", "hint_he": "בעברית?", "keywords": ["word1","word2","word3","word4"], "feedback_correct": "Great!", "feedback_partial": "Good, add more", "feedback_wrong": "Hint" }
  ]
}` }] })
      })
      const data = await res.json()
      const text = data.content[0].text.replace(/```json|```/g, '').trim()
      const mission = JSON.parse(text)
      const { error } = await supabase.from('school_missions').insert({ ...mission, active: true })
      if (error) throw error
      setGenMsg('✅ משימה נוספה בהצלחה! רענן כדי לראות אותה.')
      setMaterial('')
    } catch (e) {
      setGenMsg('❌ שגיאה: ' + e.message)
    }
    setGenerating(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:FONT, direction:'rtl' }}>
      <div style={{ background:C.white, height:52, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', boxShadow:'0 2px 8px rgba(11,26,62,.07)', position:'sticky', top:0, zIndex:50 }}>
        <span style={{ fontWeight:900, fontSize:16, color:C.navy }}>
          <span style={{ color:C.blue, cursor:'pointer' }} onClick={() => navigate('/')}>BARONS</span>
          {' / אקדמיית ברון — הורים'}
        </span>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setPreviewMode(true)} style={{ background:C.blue, border:'none', borderRadius:8, padding:'4px 14px', fontSize:12, color:C.white, cursor:'pointer', fontFamily:FONT, fontWeight:700 }}>👁️ תצוגה מקדימה</button>
          <button onClick={() => supabase.auth.signOut()} style={{ background:'none', border:`1.5px solid ${C.border}`, borderRadius:8, padding:'4px 12px', fontSize:12, color:C.mid, cursor:'pointer', fontFamily:FONT }}>יציאה</button>
        </div>
      </div>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'24px 16px' }}>
        {/* student cards */}
        <div style={{ fontWeight:800, fontSize:16, color:C.navy, marginBottom:14 }}>👧 סטטוס הבנות</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16, marginBottom:28 }}>
          {Object.entries(STUDENT_META).map(([email, meta]) => {
            const ep   = allProgress[email] || {}
            const xp   = Object.values(ep).reduce((s, p) => s + (p.xp || 0), 0)
            const done = Object.values(ep).filter(p => p.completed).length
            const inProg = Object.values(ep).filter(p => (p.answers || []).length > 0 && !p.completed).length
            return (
              <div key={email} style={{ background:C.white, borderRadius:16, padding:'20px', boxShadow:'0 2px 8px rgba(11,26,62,.07)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:meta.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{meta.emoji}</div>
                  <div>
                    <div style={{ fontWeight:800, fontSize:15, color:C.navy }}>{meta.name}</div>
                    <div style={{ fontSize:12, color:C.mid }}>Level {xpToLevel(xp)} · {xp} XP</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {[
                    { n: done,   label:'הושלמו', bg:C.greenL,  color:C.green  },
                    { n: inProg, label:'בתהליך',  bg:C.purpleL, color:C.purple },
                    { n: xp,     label:'XP',       bg:C.goldL,   color:C.gold   },
                  ].map(({ n, label, bg, color }) => (
                    <div key={label} style={{ flex:1, textAlign:'center', padding:'8px 4px', background:bg, borderRadius:10 }}>
                      <div style={{ fontWeight:900, fontSize:18, color }}>{n}</div>
                      <div style={{ fontSize:10, fontWeight:700, color:C.mid, marginTop:2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* missions table */}
        <div style={{ fontWeight:800, fontSize:16, color:C.navy, marginBottom:14 }}>📊 התקדמות לפי משימה</div>
        <div style={{ background:C.white, borderRadius:16, boxShadow:'0 2px 8px rgba(11,26,62,.07)', overflow:'hidden', marginBottom:28 }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', padding:'12px 20px', borderBottom:`1.5px solid ${C.border}`, fontSize:11, fontWeight:800, color:C.mid, textTransform:'uppercase', letterSpacing:.5, background:'#f8fafc' }}>
            <div>משימה</div>
            <div style={{ textAlign:'center' }}>דניאל</div>
            <div style={{ textAlign:'center' }}>דפנה</div>
          </div>
          {missions.map(m => {
            const totalQ = (m.questions || []).length
            return (
              <div key={m.id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', padding:'12px 20px', borderBottom:`1px solid ${C.border}`, alignItems:'center', fontSize:14 }}>
                <div style={{ fontWeight:700, color:C.navy }}>{m.icon} {m.title}</div>
                {['danielle@barons.co.il','daphna@barons.co.il'].map(email => {
                  const ep  = (allProgress[email] || {})[m.id] || {}
                  const pct = ep.completed && totalQ > 0 ? Math.min(100, Math.round((ep.score / totalQ) * 100)) : null
                  const attempts = ep.attempts || 0
                  const dateStr = ep.last_completed_at
                    ? new Date(ep.last_completed_at).toLocaleDateString('he-IL', { day:'numeric', month:'short' })
                    : null
                  return (
                    <div key={email} style={{ textAlign:'center' }}>
                      {ep.completed ? (
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                          <Pill label={`${pct}%`} style={{ background:pct>=80?C.greenL:C.goldL, color:pct>=80?'#065f46':'#78350f' }} />
                          {attempts > 1 && <span style={{ fontSize:10, color:C.purple, fontWeight:700 }}>🔄 {attempts}x</span>}
                          {dateStr && <span style={{ fontSize:10, color:C.light }}>📅 {dateStr}</span>}
                        </div>
                      ) : (ep.answers||[]).length > 0
                          ? <Pill label="▶" style={{ background:C.purpleL, color:'#5b21b6' }} />
                          : <span style={{ color:C.light }}>—</span>
                      }
                    </div>
                  )
                })}
              </div>
            )
          })}
          {missions.length === 0 && (
            <div style={{ textAlign:'center', padding:30, color:C.light, fontSize:13 }}>אין משימות עדיין</div>
          )}
        </div>

        {/* AI generator — only for erez */}
        {!isReadOnly && (
          <div style={{ background:C.white, borderRadius:16, padding:'20px 24px', boxShadow:'0 2px 8px rgba(11,26,62,.07)', marginBottom:16 }}>
            <div style={{ fontWeight:800, fontSize:15, color:C.navy, marginBottom:6 }}>📥 ייבוא משימה מחומר לימוד</div>
            <div style={{ fontSize:13, color:C.mid, marginBottom:14 }}>הדבק חומר לימוד (טקסט, רשימת מילים, נושא) — Claude יייצר משימת קריאה עם שאלות אוטומטית ויוסיף אותה ישירות לאתר.</div>
            <textarea
              value={material}
              onChange={e => setMaterial(e.target.value)}
              placeholder="הדבק כאן את חומר הלימוד..."
              style={{ width:'100%', minHeight:120, padding:'12px', border:`2px solid ${C.border}`, borderRadius:12, fontSize:13, fontFamily:FONT, direction:'rtl', resize:'vertical' }}
            />
            <button
              onClick={generateMission}
              disabled={generating || !material.trim()}
              style={{ marginTop:10, padding:'10px 20px', background: generating ? C.light : C.navy, color:C.white, border:'none', borderRadius:12, fontSize:14, fontWeight:700, fontFamily:FONT, cursor: generating ? 'default':'pointer' }}>
              {generating ? '⏳ יוצר משימה...' : '✨ צור משימה עם AI'}
            </button>
            {genMsg && <div style={{ marginTop:10, fontSize:13, fontWeight:700, color: genMsg.startsWith('✅') ? C.green : C.red }}>{genMsg}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
