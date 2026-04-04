import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { initializeApp, getApps } from 'firebase/app'
import { getDatabase, ref, set, update, onValue } from 'firebase/database'

/* ── Firebase (shared with shopping list & marathon) ── */
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
  { label: 'חזה', emoji: '🏋' }, { label: 'גב', emoji: '💪' },
  { label: 'כתפיים', emoji: '🎯' }, { label: 'רגליים', emoji: '🦵' },
  { label: 'יד קדמית', emoji: '💪' }, { label: 'יד אחורית', emoji: '🔱' },
  { label: 'בטן וגב תחתון', emoji: '⚡' }, { label: 'אירובי', emoji: '🏃' },
]
const CAT_LABELS = CATS.map(c => c.label)
const UNITS = [['kg', 'ק"ג'], ['plates', 'פלטות'], ['val', 'ערך']]

const uid     = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
const nowStr  = () => new Date().toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
const today   = () => new Date().toLocaleDateString('he-IL')
const timeNow = () => new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })

/* ── Styles (design system) ── */
const F = "'Open Sans','Open Sans Hebrew',Arial,sans-serif"
const s = {
  accent: '#1d4ed8',
  bg: '#f0f4ff',
  surface: '#fff',
  border: '#e2e8f0',
  text: '#1e293b',
  muted: '#64748b',
  green: '#16a34a',
  red: '#dc2626',
  shadow: '0 2px 8px rgba(0,0,0,0.06)',
}

const btn = {
  primary: { background: s.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  outline: { background: '#fff', color: s.accent, border: `1px solid ${s.accent}`, borderRadius: 8, padding: '7px 14px', fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  ghost:   { background: '#fff', color: s.muted,  border: `1px solid ${s.border}`,  borderRadius: 8, padding: '7px 14px', fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  danger:  { background: '#fff', color: s.red,    border: '1px solid #fca5a5',       borderRadius: 8, padding: '7px 14px', fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  sm:      { padding: '6px 12px', fontSize: 12 },
}

const input = {
  base: { width: '100%', fontFamily: F, fontSize: 14, direction: 'rtl', background: '#fff', border: `1px solid ${s.border}`, borderRadius: 8, padding: '8px 10px', color: s.text, outline: 'none' },
}

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

  const [tab,         setTab]        = useState('plan')
  const [activeCat,   setActiveCat]  = useState(CAT_LABELS[0])
  const [trainer,     setTrainer]    = useState(false)
  const [openCards,   setOpenCards]  = useState({})
  const [modal,       setModal]      = useState(null)   // { type, cat?, exId?, total? }
  const [editingName, setEditingName]= useState(null)
  const [saving,      setSaving]     = useState(false)
  const [lightbox,    setLightbox]   = useState(null)   // { src, onReplace? }

  /* Firebase realtime listener */
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

  /* Firebase writes */
  const fbSet   = useCallback(async (path, val) => { setSaving(true); try { await set(dbRef(path), val) } catch(e) { alert('שגיאה: ' + e.message) } setSaving(false) }, [])
  const fbMerge = useCallback(async (path, val) => { setSaving(true); try { await update(dbRef(path), val) } catch(e) { alert('שגיאה: ' + e.message) } setSaving(false) }, [])

  /* Plan actions */
  const createPlan = async name => {
    if (plan) await fbSet(`archive/plan_${Date.now()}`, { ...plan, archivedAt: nowStr() })
    await fbSet('currentPlan', { id: uid(), name, createdAt: nowStr(), exercises: Object.fromEntries(CAT_LABELS.map(l => [l, {}])) })
    setModal(null); setActiveCat(CAT_LABELS[0]); setOpenCards({})
  }

  const addExercise = async cat => {
    const id = uid()
    await fbSet(`currentPlan/exercises/${cat}/${id}`, { id, machineNumber: '', machineImage: '', adjustment: '', name: 'תרגיל חדש', description: '', reps: '12', sets: 3, rest: 60, weight: '0', weightUnit: 'kg', trainerNotes: {} })
  }

  const upField    = (cat, id, field, val) => fbMerge(`currentPlan/exercises/${cat}/${id}`, { [field]: val })
  const delExercise= async (cat, id) => { if (!confirm('למחוק תרגיל זה?')) return; await fbSet(`currentPlan/exercises/${cat}/${id}`, null) }

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

  /* Membership actions */
  const createMembership = async total => { await fbSet('membership', { id: uid(), total: parseInt(total), purchasedAt: today(), sessions: {} }); setModal(null) }
  const markSession      = async (date, t) => { await fbSet(`membership/sessions/s_${Date.now()}`, { date, time: t }); setModal(null) }
  const delSession       = async key => { if (!confirm('למחוק אימון זה?')) return; await fbSet(`membership/sessions/${key}`, null) }

  /* Image upload */
  const triggerUpload = (cat, id) => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'
    inp.onchange = e => {
      const f = e.target.files[0]; if (!f) return
      if (f.size > 500 * 1024) { alert('תמונה גדולה מדי — עד 500KB'); return }
      const r = new FileReader(); r.onload = ev => upField(cat, id, 'machineImage', ev.target.result); r.readAsDataURL(f)
    }
    inp.click()
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh', flexDirection:'column', gap:12, color:s.muted, fontFamily:F }}>
      <div style={{ fontSize:36, animation:'spin 1.2s linear infinite' }}>🏋</div>
      <div style={{ fontWeight:600 }}>טוען...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ background: s.bg, minHeight: '100vh', direction: 'rtl', fontFamily: F }}>

      {/* ── HEADER ── */}
      <header style={{ background:'#fff', borderBottom:`1px solid ${s.border}`, position:'sticky', top:0, zIndex:100, padding:'10px 20px' }}>
        <nav style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#94a3b8', marginBottom:6 }}>
          <button onClick={() => navigate('/')} style={{ background:'none', border:'none', cursor:'pointer', color:s.accent, fontFamily:F, fontSize:13, padding:0, fontWeight:600 }}>BARONS</button>
          <span>/</span>
          <span style={{ color:s.text, fontWeight:600 }}>My Gym</span>
        </nav>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:'#0f172a' }}>🏋 My Gym</h1>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {saving && <span style={{ fontSize:11, color:s.muted }}>שומר...</span>}
            <button
              onClick={() => setTrainer(t => !t)}
              style={{ ...btn.ghost, ...(trainer ? { background:'rgba(255,170,0,.1)', borderColor:'rgba(200,130,0,.35)', color:'#92600a' } : {}) }}>
              {trainer ? '✏️ מאמנת' : '🔒 צפייה'}
            </button>
          </div>
        </div>
      </header>

      {/* ── TAB BAR ── */}
      <div style={{ background:'#fff', borderBottom:`1px solid ${s.border}`, display:'flex', overflowX:'auto', scrollbarWidth:'none' }}>
        {[['plan','💪 תכנית'],['membership','🎫 כרטיסייה'],['archive','📁 ארכיון']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:'11px 18px', border:'none', background:'transparent', fontFamily:F, fontSize:13, fontWeight:600, whiteSpace:'nowrap', cursor:'pointer', borderBottom: tab===t ? `2px solid ${s.accent}` : '2px solid transparent', color: tab===t ? s.accent : s.muted }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding:'16px 20px', maxWidth:900, margin:'0 auto' }}>
        {tab === 'plan'       && <PlanTab       plan={plan} activeCat={activeCat} setActiveCat={setActiveCat} trainer={trainer} history={history} openCards={openCards} setOpenCards={setOpenCards} editingName={editingName} setEditingName={setEditingName} setModal={setModal} setLightbox={setLightbox} addExercise={addExercise} upField={upField} delExercise={delExercise} saveWeight={saveWeight} triggerUpload={triggerUpload} />}
        {tab === 'membership' && <MembershipTab membership={membership} setModal={setModal} delSession={delSession} />}
        {tab === 'archive'    && <ArchiveTab    archive={archive} openCards={openCards} setOpenCards={setOpenCards} />}
      </div>

      {/* ── MODAL ── */}
      {modal && (
        <ModalShell onClose={() => setModal(null)}>
          {modal.type === 'newPlan'        && <NewPlanModal      hasPlan={!!plan} onConfirm={createPlan} onClose={() => setModal(null)} />}
          {modal.type === 'newMembership'  && <NewMemModal       onConfirm={createMembership} onClose={() => setModal(null)} />}
          {modal.type === 'markSession'    && <MarkSessionModal  onConfirm={markSession} onClose={() => setModal(null)} />}
          {modal.type === 'history'        && <HistoryModal      exId={modal.exId} exName={modal.exName} history={history} onClose={() => setModal(null)} />}
          {modal.type === 'note'           && <NoteModal         onConfirm={text => addNote(modal.cat, modal.exId, text)} onClose={() => setModal(null)} />}
        </ModalShell>
      )}

      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.88)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out' }}>
          <button onClick={() => setLightbox(null)} style={{ position:'fixed', top:16, left:16, width:38, height:38, borderRadius:'50%', background:'rgba(255,255,255,.15)', border:'none', color:'#fff', fontSize:22, cursor:'pointer', fontFamily:F }}>×</button>
          <div onClick={e => e.stopPropagation()} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
            <img src={lightbox.src} alt="" style={{ maxWidth:'92vw', maxHeight:'88vh', borderRadius:12, objectFit:'contain' }} />
            {lightbox.onReplace && (
              <button onClick={() => { setLightbox(null); lightbox.onReplace() }} style={{ background:'rgba(255,255,255,.18)', border:'1px solid rgba(255,255,255,.3)', color:'#fff', padding:'8px 20px', borderRadius:20, fontSize:14, cursor:'pointer', fontFamily:F, fontWeight:600 }}>
                📷 החלף תמונה
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PLAN TAB
═══════════════════════════════════════════════════════════ */
function PlanTab({ plan, activeCat, setActiveCat, trainer, history, openCards, setOpenCards, editingName, setEditingName, setModal, setLightbox, addExercise, upField, delExercise, saveWeight, triggerUpload }) {
  if (!plan) return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:s.muted }}>
      <div style={{ fontSize:48, marginBottom:12 }}>💪</div>
      <p style={{ fontSize:18, fontWeight:800, marginBottom:8, color:s.text }}>אין תכנית פעילה</p>
      <p style={{ marginBottom:20 }}>צור תכנית אימונים כדי להתחיל</p>
      <button style={btn.primary} onClick={() => setModal({ type:'newPlan' })}>+ תכנית חדשה</button>
    </div>
  )

  const exArr = Object.values(plan.exercises?.[activeCat] || {}).filter(Boolean)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14, flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:800 }}>{plan.name}</div>
          <div style={{ fontSize:11, color:s.muted, marginTop:2 }}>נוצרה: {plan.createdAt}</div>
        </div>
        {trainer && <button style={{ ...btn.primary, ...btn.sm }} onClick={() => setModal({ type:'newPlan' })}>תכנית חדשה →</button>}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'clamp(130px,160px,160px) 1fr', gap:16 }}>

        {/* Sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {CATS.map(c => {
            const n = Object.values(plan.exercises?.[c.label] || {}).filter(Boolean).length
            const active = activeCat === c.label
            return (
              <button key={c.label} onClick={() => setActiveCat(c.label)} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', border:`1px solid ${active ? s.accent : s.border}`, borderRadius:10, background: active ? s.accent : '#fff', color: active ? '#fff' : s.muted, fontSize:12, fontWeight:600, fontFamily:F, width:'100%', cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', transition:'all .15s' }}>
                <span style={{ fontSize:15 }}>{c.emoji}</span>
                <span style={{ flex:1, textAlign:'right' }}>{c.label}</span>
                {n > 0 && <span style={{ fontSize:10, background: active ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.07)', borderRadius:10, padding:'1px 7px', color: active ? '#fff' : s.muted }}>{n}</span>}
              </button>
            )
          })}
        </div>

        {/* Exercises */}
        <div>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:s.accent, flexShrink:0 }} />
            {activeCat}
          </div>
          {exArr.length === 0 && !trainer && <div style={{ color:s.muted, fontSize:14, padding:'20px 0', textAlign:'center' }}>אין תרגילים בקטגוריה זו</div>}
          {exArr.map(ex => (
            <ExCard key={ex.id} ex={ex} cat={activeCat} trainer={trainer} history={history} openCards={openCards} setOpenCards={setOpenCards} editingName={editingName} setEditingName={setEditingName} setModal={setModal} setLightbox={setLightbox} upField={upField} delExercise={delExercise} saveWeight={saveWeight} triggerUpload={triggerUpload} />
          ))}
          {trainer && (
            <button onClick={() => addExercise(activeCat)} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:12, border:'2px dashed #cbd5e1', borderRadius:10, background:'transparent', color:s.muted, fontSize:13, fontFamily:F, fontWeight:600, width:'100%', cursor:'pointer', marginTop:6 }}>
              + הוסף תרגיל
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   EXERCISE CARD
═══════════════════════════════════════════════════════════ */
function ExCard({ ex, cat, trainer, history, openCards, setOpenCards, editingName, setEditingName, setModal, setLightbox, upField, delExercise, saveWeight, triggerUpload }) {
  const open = openCards[ex.id]
  const hist = Object.values(history || {}).filter(h => h.exerciseId === ex.id).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
  const last = hist[0]?.date || ''
  const unitKey   = ex.weightUnit || 'kg'
  const unitLabel = UNITS.find(u => u[0] === unitKey)?.[1] || 'ק"ג'

  const imgEl = ex.machineImage ? (
    trainer ? (
      <div style={{ position:'relative', flexShrink:0, width:46 }}>
        <img src={ex.machineImage} alt="" onClick={() => setLightbox({ src:ex.machineImage, onReplace:()=>triggerUpload(cat,ex.id) })} style={{ width:46, height:46, borderRadius:8, objectFit:'cover', border:`1px solid ${s.border}`, cursor:'zoom-in', display:'block' }} />
        <button onClick={e => { e.stopPropagation(); upField(cat, ex.id, 'machineImage', '') }} style={{ position:'absolute', top:-6, right:-6, width:18, height:18, borderRadius:'50%', background:s.red, border:'2px solid #fff', color:'#fff', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, fontFamily:F }}>×</button>
      </div>
    ) : (
      <img src={ex.machineImage} alt="" onClick={() => setLightbox({ src:ex.machineImage })} style={{ width:46, height:46, borderRadius:8, objectFit:'cover', border:`1px solid ${s.border}`, cursor:'zoom-in', flexShrink:0 }} />
    )
  ) : trainer ? (
    <div onClick={() => triggerUpload(cat, ex.id)} style={{ width:46, height:46, borderRadius:8, border:'2px dashed #cbd5e1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, cursor:'pointer', flexShrink:0, background:'#f8fafc' }}>📷</div>
  ) : null

  return (
    <div style={{ background:'#fff', border:`1px solid ${s.border}`, borderRadius:12, marginBottom:10, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden' }}>

      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px' }}>
        <div style={{ background:s.accent, color:'#fff', fontWeight:800, minWidth:36, height:36, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:(ex.machineNumber||'').length>2?10:13 }}>
          {ex.machineNumber || '#'}
        </div>

        {imgEl}

        <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={() => setOpenCards(o => ({ ...o, [ex.id]: !o[ex.id] }))}>
          {trainer && editingName === ex.id ? (
            <input
              autoFocus
              defaultValue={ex.name}
              onBlur={e => { setEditingName(null); upField(cat, ex.id, 'name', e.target.value.trim() || 'תרגיל') }}
              onKeyDown={e => e.key === 'Enter' && e.target.blur()}
              onClick={e => e.stopPropagation()}
              style={{ ...input.base, fontSize:14, fontWeight:700, border:`1px solid ${s.accent}`, padding:'3px 8px', width:'100%' }}
            />
          ) : (
            <div onClick={e => { if(trainer){ e.stopPropagation(); setEditingName(ex.id) } }} style={{ fontSize:14, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:s.text }}>
              {ex.name}{trainer && <span style={{ color:'#94a3b8', fontWeight:400, fontSize:11 }}> ✎</span>}
            </div>
          )}
          <div style={{ fontSize:11, color:s.muted, marginTop:2 }}>{ex.sets} סטים × {ex.reps} חז׳ · {ex.rest}″{last ? ` · ${last}` : ''}</div>
        </div>

        {/* Weight input */}
        <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <input
            type="text" inputMode="decimal"
            defaultValue={ex.weight ?? 0}
            onFocus={e => e.target.select()}
            onBlur={e => saveWeight(cat, ex.id, e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.target.blur()}
            onClick={e => e.stopPropagation()}
            style={{ fontFamily:F, fontSize:17, fontWeight:800, width:66, textAlign:'center', padding:'5px 4px', border:`1px solid ${s.border}`, borderRadius:8, background:'#f8fafc', color:s.text, outline:'none' }}
          />
          {trainer ? (
            <select
              value={unitKey}
              onChange={e => upField(cat, ex.id, 'weightUnit', e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{ fontSize:11, color:s.muted, border:`1px solid ${s.border}`, borderRadius:5, background:'#fff', padding:'1px 3px', cursor:'pointer', outline:'none', direction:'rtl', width:66, fontFamily:F }}>
              {UNITS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          ) : (
            <div style={{ fontSize:10, color:s.muted, textAlign:'center' }}>{unitLabel}</div>
          )}
        </div>

        <div onClick={() => setOpenCards(o => ({ ...o, [ex.id]: !o[ex.id] }))} style={{ fontSize:9, color:'#94a3b8', cursor:'pointer', padding:'6px 4px', flexShrink:0, transform:open?'rotate(180deg)':'none', transition:'transform .2s' }}>▼</div>
      </div>

      {/* Expanded body */}
      {open && <ExBody ex={ex} cat={cat} trainer={trainer} hist={hist} setModal={setModal} upField={upField} delExercise={delExercise} />}
    </div>
  )
}

/* ── Exercise expanded body ── */
function ExBody({ ex, cat, trainer, hist, setModal, upField, delExercise }) {
  const notes   = Object.values(ex.trainerNotes || {}).sort((a, b) => b.date.localeCompare(a.date))
  const restSec = parseInt(ex.rest) || 60
  const rm      = Math.floor(restSec / 60), rs = restSec % 60

  return (
    <div style={{ padding:'0 14px 14px', borderTop:`1px solid ${s.border}`, background:'#fafbff' }}>

      {/* Fields */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:12 }}>
        <Field label="מס׳ מכשיר"   trainer={trainer} value={ex.machineNumber} placeholder="19"     onChange={v => upField(cat, ex.id, 'machineNumber', v)} />
        <Field label="כיוונון"      trainer={trainer} value={ex.adjustment}    placeholder="גובה 3" onChange={v => upField(cat, ex.id, 'adjustment', v)} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:10 }}>
        <Field label="סטים"          trainer={trainer} value={ex.sets}    type="number" onChange={v => upField(cat, ex.id, 'sets', parseInt(v)||3)} />
        <Field label="חזרות"         trainer={trainer} value={ex.reps}    onChange={v => upField(cat, ex.id, 'reps', v)} />
        <Field label="מנוחה (שנ׳)"  trainer={trainer} value={ex.rest}    type="number" onChange={v => upField(cat, ex.id, 'rest', parseInt(v)||60)} />
      </div>

      {/* Description */}
      <div style={{ marginTop:10 }}>
        <div style={{ fontSize:11, color:s.muted, marginBottom:4, fontWeight:700 }}>הוראות / מה לשים לב</div>
        {trainer
          ? <textarea defaultValue={ex.description} onBlur={e => upField(cat, ex.id, 'description', e.target.value)} rows={2} style={{ ...input.base, resize:'vertical' }} placeholder="גב זקוף, ידיים ישרות..." />
          : ex.description && <div style={{ fontSize:14, lineHeight:1.6, color:'#334155', paddingTop:4 }}>{ex.description}</div>}
      </div>

      {/* Trainer notes */}
      {notes.length > 0 && (
        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:11, color:s.muted, fontWeight:700, marginBottom:6 }}>הערות מאמנת</div>
          {notes.map(n => (
            <div key={n.id || n.date} style={{ background:'#eff6ff', borderRight:`3px solid ${s.accent}`, borderRadius:'0 8px 8px 0', padding:'8px 10px', marginBottom:6, fontSize:13, lineHeight:1.5, color:'#334155' }}>
              {n.text}
              <div style={{ fontSize:10, color:s.muted, marginTop:3 }}>{n.date}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop:`1px solid ${s.border}`, margin:'12px 0' }} />

      {/* Action buttons */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button style={btn.ghost} onClick={() => setModal({ type:'history', exId:ex.id, exName:ex.name })}>📊 היסטוריה ({hist.length})</button>
        <button style={btn.ghost} onClick={() => setModal({ type:'note', cat, exId:ex.id })}>📝 הערה</button>
        {trainer && <button style={btn.danger} onClick={() => delExercise(cat, ex.id)}>🗑 מחק</button>}
      </div>

      {/* Timer */}
      <Timer exId={ex.id} restSec={restSec} rm={rm} rs={rs} />
    </div>
  )
}

/* ── Reusable field ── */
function Field({ label, trainer, value, type='text', placeholder='', onChange }) {
  return (
    <div>
      <div style={{ fontSize:11, color:s.muted, marginBottom:4, fontWeight:700 }}>{label}</div>
      {trainer
        ? <input type={type} defaultValue={value} placeholder={placeholder} onBlur={e => onChange(e.target.value)} style={input.base} />
        : <div style={{ fontSize:14, fontWeight:600, padding:'5px 0', color:s.text }}>{value || '—'}</div>}
    </div>
  )
}

/* ── Timer ── */
function Timer({ exId, restSec, rm, rs }) {
  const [remaining, setRemaining] = useState(restSec)
  const [running,   setRunning]   = useState(false)
  const [done,      setDone]      = useState(false)
  const intervalRef = useRef(null)

  const display = done ? '✓' : `${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`
  const color   = done ? s.green : running ? s.accent : s.text

  const start = () => {
    if (done) reset()
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false); setDone(true)
          if (navigator.vibrate) navigator.vibrate([300, 100, 300])
          return 0
        }
        return r - 1
      })
    }, 1000)
  }
  const pause = () => { clearInterval(intervalRef.current); setRunning(false) }
  const reset = () => { clearInterval(intervalRef.current); setRunning(false); setDone(false); setRemaining(restSec) }

  useEffect(() => () => clearInterval(intervalRef.current), [])

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, background:'#f0f4ff', borderRadius:10, padding:'10px 14px', marginTop:12, border:'1px solid #dbeafe' }}>
      <div style={{ fontSize:26, fontWeight:800, color, minWidth:60, textAlign:'center', fontVariantNumeric:'tabular-nums', letterSpacing:1, fontFamily:F }}>{display}</div>
      {!running
        ? <button style={{ ...btn.primary, ...btn.sm }} onClick={start}>▶ {done ? 'שוב' : remaining < restSec ? 'המשך' : 'התחל'}</button>
        : <button style={{ ...btn.outline, ...btn.sm }} onClick={pause}>⏸ עצור</button>}
      <button style={{ ...btn.ghost, ...btn.sm }} onClick={reset}>↺ אפס</button>
      <div style={{ flex:1, fontSize:12, color:s.muted, textAlign:'left' }}>{restSec}″ מנוחה</div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MEMBERSHIP TAB
═══════════════════════════════════════════════════════════ */
function MembershipTab({ membership: m, setModal, delSession }) {
  if (!m) return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:s.muted }}>
      <div style={{ fontSize:48, marginBottom:12 }}>🎫</div>
      <p style={{ fontSize:18, fontWeight:800, marginBottom:8, color:s.text }}>אין כרטיסייה פעילה</p>
      <p style={{ marginBottom:20 }}>הוסף כרטיסייה לעקוב אחרי השיעורים שלך</p>
      <button style={btn.primary} onClick={() => setModal({ type:'newMembership' })}>+ כרטיסייה חדשה</button>
    </div>
  )

  const sess     = Object.entries(m.sessions || {}).map(([k, v]) => ({ ...v, _key:k })).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
  const used     = sess.length, total = m.total, rem = total - used
  const pct      = Math.min(100, (used / total) * 100)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14, flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:800 }}>כרטיסייה</div>
          <div style={{ fontSize:11, color:s.muted, marginTop:2 }}>נרכשה: {m.purchasedAt}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={{ ...btn.ghost, ...btn.sm }} onClick={() => setModal({ type:'newMembership' })}>+ חדשה</button>
          {rem > 0 && <button style={{ ...btn.primary, ...btn.sm }} onClick={() => setModal({ type:'markSession' })}>✓ סמן אימון</button>}
        </div>
      </div>

      <div style={{ background:'#fff', border:`1px solid ${s.border}`, borderRadius:14, padding:20, marginBottom:16, boxShadow:s.shadow }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:12 }}>
          <div style={{ fontSize:56, fontWeight:800, lineHeight:1, color:s.accent }}>{rem}</div>
          <div style={{ color:s.muted, fontSize:15 }}>נותרו מתוך {total}</div>
        </div>
        <div style={{ background:'#e2e8f0', borderRadius:6, height:5, marginTop:10 }}>
          <div style={{ background:s.accent, borderRadius:6, height:5, width:`${pct}%`, transition:'width .5s' }} />
        </div>
        <div style={{ fontSize:12, color:s.muted, marginTop:5 }}>{used} שיעורים בוצעו</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:16 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ width:34, height:34, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, background: i < used ? s.accent : '#f1f5f9', color: i < used ? '#fff' : '#94a3b8', border: i < used ? 'none' : `1px solid ${s.border}` }}>
              {i < used ? '✓' : i + 1}
            </div>
          ))}
        </div>
      </div>

      {rem === 0 && <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'12px 16px', marginBottom:16, textAlign:'center', color:s.accent, fontWeight:700 }}>הכרטיסייה נגמרה — הגיע הזמן לחדש! 🎉</div>}

      <div style={{ fontSize:14, fontWeight:700, marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:s.accent }} /> היסטוריית אימונים
      </div>
      {sess.length === 0 && <div style={{ color:s.muted, fontSize:14, padding:'14px 0', textAlign:'center' }}>עדיין לא נרשמו אימונים</div>}
      {sess.map((s2, i) => (
        <div key={s2._key} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:`1px solid ${s.border}` }}>
          <div style={{ background:'rgba(29,78,216,.08)', color:s.accent, borderRadius:'50%', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{used - i}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:14 }}>{s2.date}</div>
            <div style={{ fontSize:12, color:s.muted }}>{s2.time}</div>
          </div>
          <div style={{ fontSize:13, color:s.green, fontWeight:700 }}>✓ בוצע</div>
          <button onClick={() => delSession(s2._key)} style={{ background:'none', border:'none', color:'#cbd5e1', fontSize:18, cursor:'pointer', padding:'4px 6px', fontFamily:F }}>×</button>
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
    <div style={{ textAlign:'center', padding:'60px 20px', color:s.muted }}>
      <div style={{ fontSize:48, marginBottom:12 }}>📁</div>
      <p style={{ fontSize:18, fontWeight:800, marginBottom:8, color:s.text }}>הארכיון ריק</p>
      <p>תכניות ישנות יופיעו כאן</p>
    </div>
  )
  return (
    <div>
      <div style={{ fontSize:16, fontWeight:800, marginBottom:14 }}>ארכיון תכניות ({plans.length})</div>
      {plans.map((p, pi) => {
        const open = openCards['arc_' + pi]
        return (
          <div key={pi} style={{ background:'#fff', border:`1px solid ${s.border}`, borderRadius:12, padding:14, marginBottom:10, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => setOpenCards(o => ({ ...o, ['arc_'+pi]: !o['arc_'+pi] }))}>
              <div>
                <div style={{ fontWeight:700, fontSize:15 }}>{p.name}</div>
                <div style={{ fontSize:12, color:s.muted, marginTop:2 }}>{p.createdAt} → {p.archivedAt || '—'}</div>
              </div>
              <div style={{ color:'#94a3b8', fontSize:10, transform:open?'rotate(180deg)':'none', transition:'transform .2s' }}>▼</div>
            </div>
            {open && CATS.map(c => {
              const exs = Object.values(p.exercises?.[c.label] || {}).filter(Boolean)
              if (!exs.length) return null
              return (
                <div key={c.label} style={{ marginTop:12, borderTop:`1px solid ${s.border}`, paddingTop:10 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:s.accent, marginBottom:6 }}>{c.label}</div>
                  {exs.map(ex => (
                    <div key={ex.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'5px 0', borderBottom:`1px solid ${s.border}` }}>
                      <span>{ex.machineNumber ? `[${ex.machineNumber}] ` : ''}{ex.name}</span>
                      <span style={{ color:s.muted }}>{ex.weight} · {ex.sets}×{ex.reps}</span>
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
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.55)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:1000, backdropFilter:'blur(3px)' }}>
      <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:560, maxHeight:'90vh', display:'flex', flexDirection:'column', direction:'rtl', paddingBottom:'env(safe-area-inset-bottom)' }}>
        <div style={{ padding:'10px 0 0', display:'flex', justifyContent:'center' }}>
          <div style={{ width:36, height:4, background:s.border, borderRadius:2 }} />
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ padding:'10px 20px 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>{title}</h2>
      <button onClick={onClose} style={{ background:'none', border:'none', fontSize:26, cursor:'pointer', color:'#94a3b8', lineHeight:1, padding:0, fontFamily:F }}>×</button>
    </div>
  )
}

function ModalFooter({ onClose, onConfirm, confirmLabel='✓ שמור' }) {
  return (
    <div style={{ padding:'14px 20px', borderTop:`1px solid #f1f5f9`, display:'flex', justifyContent:'space-between', gap:10 }}>
      <button style={btn.ghost} onClick={onClose}>ביטול</button>
      <button style={btn.primary} onClick={onConfirm}>{confirmLabel}</button>
    </div>
  )
}

function NewPlanModal({ hasPlan, onConfirm, onClose }) {
  const ref2 = useRef()
  const def  = 'תכנית ' + new Date().toLocaleDateString('he-IL', { month:'long', year:'numeric' })
  return <>
    <ModalHeader title="תכנית חדשה" onClose={onClose} />
    <div style={{ overflowY:'auto', flex:1, padding:'18px 20px' }}>
      {hasPlan && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:9, padding:'10px 13px', marginBottom:14, fontSize:13, color:s.red, fontWeight:600 }}>⚠️ התכנית הנוכחית תועבר לארכיון</div>}
      <div style={{ fontSize:11, color:s.muted, fontWeight:700, marginBottom:4 }}>שם התכנית</div>
      <input ref={ref2} style={input.base} defaultValue={def} />
    </div>
    <ModalFooter onClose={onClose} onConfirm={() => { const n=ref2.current?.value?.trim(); if(n)onConfirm(n) }} confirmLabel="✓ צור תכנית" />
  </>
}

function NewMemModal({ onConfirm, onClose }) {
  const ref2 = useRef()
  return <>
    <ModalHeader title="כרטיסייה חדשה" onClose={onClose} />
    <div style={{ overflowY:'auto', flex:1, padding:'18px 20px' }}>
      <div style={{ fontSize:11, color:s.muted, fontWeight:700, marginBottom:8 }}>כמה שיעורים בכרטיסייה?</div>
      <input ref={ref2} type="number" min="1" defaultValue={11} style={{ ...input.base, fontSize:24, fontWeight:800, textAlign:'center', padding:12 }} />
      <div style={{ fontSize:12, color:s.muted, textAlign:'center', marginTop:6 }}>הכנס כל מספר שתרצה</div>
    </div>
    <ModalFooter onClose={onClose} onConfirm={() => onConfirm(parseInt(ref2.current?.value)||11)} confirmLabel="✓ שמור" />
  </>
}

function MarkSessionModal({ onConfirm, onClose }) {
  const dateRef = useRef(), timeRef = useRef()
  return <>
    <ModalHeader title="סמן אימון" onClose={onClose} />
    <div style={{ overflowY:'auto', flex:1, padding:'18px 20px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div><div style={{ fontSize:11, color:s.muted, fontWeight:700, marginBottom:4 }}>תאריך</div><input ref={dateRef} style={input.base} defaultValue={today()} /></div>
        <div><div style={{ fontSize:11, color:s.muted, fontWeight:700, marginBottom:4 }}>שעה</div><input ref={timeRef} style={input.base} defaultValue={timeNow()} /></div>
      </div>
    </div>
    <ModalFooter onClose={onClose} onConfirm={() => onConfirm(dateRef.current?.value||today(), timeRef.current?.value||timeNow())} confirmLabel="✓ אשר אימון" />
  </>
}

function HistoryModal({ exId, exName, history, onClose }) {
  const items = Object.values(history || {}).filter(h => h.exerciseId === exId).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
  return <>
    <ModalHeader title={`📊 ${exName}`} onClose={onClose} />
    <div style={{ overflowY:'auto', flex:1, padding:'18px 20px' }}>
      <div style={{ fontSize:12, color:s.muted, marginBottom:12 }}>{items.length} רשומות</div>
      {items.length === 0 && <p style={{ color:s.muted, textAlign:'center', padding:'20px 0' }}>אין היסטוריה עדיין</p>}
      {items.map((h, i) => {
        const changed = i < items.length - 1 && String(h.weight) !== String(items[i+1].weight)
        return (
          <div key={h.id || i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:`1px solid ${s.border}`, fontSize:13 }}>
            <div>
              <div style={{ fontWeight:800, fontSize:16, color:s.text }}>{h.weight}</div>
              <div style={{ fontSize:11, color:s.muted }}>{h.date} · {h.time}</div>
            </div>
            {changed && <div style={{ fontSize:12, color:s.green, fontWeight:700 }}>▲ שינוי</div>}
          </div>
        )
      })}
    </div>
    <div style={{ padding:'14px 20px', borderTop:`1px solid #f1f5f9` }}>
      <button style={{ ...btn.ghost, width:'100%' }} onClick={onClose}>סגור</button>
    </div>
  </>
}

function NoteModal({ onConfirm, onClose }) {
  const ref2 = useRef()
  useEffect(() => { setTimeout(() => ref2.current?.focus(), 60) }, [])
  return <>
    <ModalHeader title="📝 הוסף הערה" onClose={onClose} />
    <div style={{ overflowY:'auto', flex:1, padding:'18px 20px' }}>
      <textarea ref={ref2} rows={4} placeholder="למשל: העלה משקל בשבוע הבא..." style={{ ...input.base, resize:'vertical' }} />
    </div>
    <ModalFooter onClose={onClose} onConfirm={() => { const t=ref2.current?.value?.trim(); if(t)onConfirm(t) }} confirmLabel="✓ שמור הערה" />
  </>
}
