import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'
import { supabase } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────
const EDITORS = ['erez@barons.co.il', 'roy@barons.co.il', 'user@barons.co.il']
const CARD_W = 144
const CARD_H = 66
const H_GAP  = 32
const V_GAP  = 92

const GS = {
  male:    { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' },
  female:  { bg: '#f3e8ff', border: '#c084fc', text: '#7e22ce' },
  unknown: { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' },
}

const iStyle = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 12px',
  fontSize: 14, fontFamily: "'Open Sans','Open Sans Hebrew',Arial,sans-serif",
  color: '#1e293b', background: '#fff', outline: 'none',
}
const primaryBtn = { background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontFamily: "'Open Sans','Open Sans Hebrew',Arial,sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const ghostBtn   = { background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 18px', fontFamily: "'Open Sans','Open Sans Hebrew',Arial,sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const closeBtn   = { background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: '#94a3b8', lineHeight: 1, padding: 0 }

// ─── Tree Layout ──────────────────────────────────────────────────────────────
// Assigns generations RELATIVE to focused person (focused = 0, parents = -1, children = +1)
// This avoids the BFS-from-root bug where generation depth depends on tree shape
function buildLayout(members, focusedId) {
  if (!focusedId) return { nodes: [], edges: [], width: 0, height: 0 }
  const byId = Object.fromEntries(members.map(m => [m.id, m]))
  if (!byId[focusedId]) return { nodes: [], edges: [], width: 0, height: 0 }

  const relGen = { [focusedId]: 0 }
  const included = new Set([focusedId])

  // Walk up: ancestors — each parent is one generation above their child
  function addAncestors(id) {
    const p = byId[id]
    if (!p) return
    for (const pid of [p.father_id, p.mother_id]) {
      if (!pid || !byId[pid] || relGen[pid] !== undefined) continue
      relGen[pid] = relGen[id] - 1
      included.add(pid)
      addAncestors(pid)
    }
  }
  addAncestors(focusedId)

  // Walk down: descendants — each child is one generation below their parent
  function addDescendants(id) {
    members.filter(m => m.father_id === id || m.mother_id === id).forEach(child => {
      if (relGen[child.id] !== undefined) return
      // Child generation = max(parent generations) + 1
      const parentGens = [child.father_id, child.mother_id]
        .filter(pid => pid && relGen[pid] !== undefined)
        .map(pid => relGen[pid])
      relGen[child.id] = (parentGens.length ? Math.max(...parentGens) : relGen[id]) + 1
      included.add(child.id)
      addDescendants(child.id)
    })
  }
  addDescendants(focusedId)

  // Add spouses of included people — same generation as their partner
  let changed = true
  while (changed) {
    changed = false
    included.forEach(id => {
      const p = byId[id]
      if (p?.spouse_id && byId[p.spouse_id] && relGen[p.spouse_id] === undefined) {
        relGen[p.spouse_id] = relGen[id]
        included.add(p.spouse_id)
        // Also add ancestors of newly included spouse
        addAncestors(p.spouse_id)
        changed = true
      }
    })
  }

  // Normalize: shift so min generation = 0
  const minG = Math.min(...Object.values(relGen))
  const gen = {}
  included.forEach(id => { gen[id] = relGen[id] - minG })

  const subset = members.filter(m => included.has(m.id))
  const subById = Object.fromEntries(subset.map(m => [m.id, m]))

  const maxGen = Math.max(...Object.values(gen))
  const byGen = {}
  for (let g = 0; g <= maxGen; g++) byGen[g] = []
  subset.forEach(m => { if (gen[m.id] !== undefined) byGen[gen[m.id]].push(m) })

  // Sort within each generation: keep spouses adjacent
  for (let g = 0; g <= maxGen; g++) {
    const placed = new Set(); const sorted = []
    byGen[g].forEach(m => {
      if (placed.has(m.id)) return
      sorted.push(m); placed.add(m.id)
      if (m.spouse_id && subById[m.spouse_id] && !placed.has(m.spouse_id) && gen[m.spouse_id] === g) {
        sorted.push(subById[m.spouse_id]); placed.add(m.spouse_id)
      }
    })
    byGen[g] = sorted
  }

  const posX = {}, posY = {}
  for (let g = 0; g <= maxGen; g++) {
    byGen[g].forEach((m, i) => {
      posX[m.id] = i * (CARD_W + H_GAP) + CARD_W / 2
      posY[m.id] = g * (CARD_H + V_GAP) + CARD_H / 2
    })
  }

  const edges = []
  subset.forEach(m => {
    ;[m.father_id, m.mother_id].forEach(pid => {
      if (pid && posX[pid] !== undefined && posX[m.id] !== undefined)
        edges.push({ fx: posX[pid], fy: posY[pid], tx: posX[m.id], ty: posY[m.id] })
    })
  })

  const nodes = subset.map(m => ({ ...m, x: posX[m.id] ?? 0, y: posY[m.id] ?? 0, generation: gen[m.id] ?? 0 }))
  const width  = Math.max(...Object.values(posX)) + CARD_W / 2 + 30
  const height = Math.max(...Object.values(posY)) + CARD_H / 2 + 30
  return { nodes, edges, width, height }
}

// ─── PersonSearch — autocomplete with inline add ──────────────────────────────
function PersonSearch({ label, value, onChange, members, excludeId, genderFilter }) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const ref = useRef(null)

  const currentName = value ? (members.find(m => m.id === value)?.name ?? '') : ''

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return members.filter(m => {
      if (m.id === excludeId) return false
      if (genderFilter === 'male' && m.gender === 'female') return false
      if (genderFilter === 'female' && m.gender === 'male') return false
      return m.name?.toLowerCase().includes(q)
    }).slice(0, 10)
  }, [query, members, excludeId, genderFilter])

  useEffect(() => {
    function handleClick(e) { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(id) { onChange(id); setQuery(''); setOpen(false) }
  function clear() { onChange(''); setQuery('') }

  const currentPerson = value ? members.find(m => m.id === value) : null
  const gs = currentPerson ? (GS[currentPerson.gender] || GS.unknown) : null

  return (
    <div style={{ marginBottom: 14 }} ref={ref}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
      {value && currentName ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: gs?.bg ?? '#f1f5f9', borderRadius: 8, padding: '8px 12px', border: `1.5px solid ${gs?.border ?? '#cbd5e1'}` }}>
          <span style={{ flex: 1, fontSize: 14, color: gs?.text ?? '#475569', fontWeight: 600 }}>{currentName}</span>
          <button onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="הקלד שם לחיפוש..."
            style={iStyle}
          />
          {open && query.trim() && (
            <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.13)', zIndex: 500, maxHeight: 260, overflowY: 'auto', marginTop: 4 }}>
              {suggestions.length === 0 && (
                <div style={{ padding: '10px 14px', fontSize: 13, color: '#94a3b8' }}>לא נמצאו תוצאות</div>
              )}
              {suggestions.map(p => {
                const pg = GS[p.gender] || GS.unknown
                return (
                  <div key={p.id} onMouseDown={() => select(p.id)}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}
                    onMouseEnter={e => e.currentTarget.style.background = pg.bg}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <span style={{ fontWeight: 600, color: pg.text }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {p.birth_year && `נולד/ה ${p.birth_year}`}{p.death_year && ` · נפטר/ה ${p.death_year}`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Small components ─────────────────────────────────────────────────────────
function Modal({ onClose, children, tall }) {
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 640
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff',
        borderRadius: isDesktop ? 16 : '20px 20px 0 0',
        width: '100%', maxWidth: isDesktop ? 520 : 560,
        height: tall ? (isDesktop ? 'auto' : '90vh') : 'auto',
        maxHeight: isDesktop ? '85vh' : '88vh',
        display: 'flex', flexDirection: 'column', direction: 'rtl',
        paddingBottom: isDesktop ? 0 : 'env(safe-area-inset-bottom)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
      }}>
        {!isDesktop && (
          <div style={{ padding: '10px 0 0', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2 }} />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

function PersonChip({ person, onClick }) {
  const gs = GS[person.gender] || GS.unknown
  return (
    <button onClick={onClick} style={{ background: gs.bg, border: `1.5px solid ${gs.border}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: gs.text }}>
      {person.name}{(person.birth_year || person.death_year) && <span style={{ fontWeight: 400, marginRight: 6, fontSize: 12, color: '#64748b' }}>{[person.birth_year, person.death_year].filter(Boolean).join('–')}</span>}
    </button>
  )
}

function PersonCard({ person, onClick }) {
  const gs = GS[person.gender] || GS.unknown
  return (
    <div onClick={onClick} style={{ background: gs.bg, border: `1.5px solid ${gs.border}`, borderRadius: 10, padding: '11px 13px', cursor: 'pointer', opacity: person.death_year ? 0.76 : 1, transition: 'transform 0.12s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: gs.text }}>{person.name}</div>
      {(person.birth_year || person.death_year) && (
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
          {person.birth_year && `*${person.birth_year}`}{person.birth_year && person.death_year && ' · '}{person.death_year && `†${person.death_year}`}
        </div>
      )}
    </div>
  )
}

function Toast({ msg, color }) {
  return (
    <div style={{ position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)', background: color, color: '#fff', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, zIndex: 3000, boxShadow: '0 4px 18px rgba(0,0,0,0.22)', whiteSpace: 'nowrap' }}>
      {msg}
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FamilyTree({ session }) {
  const navigate  = useNavigate()
  const userEmail = session?.user?.email
  const isAdmin   = EDITORS.includes(userEmail)

  const [members, setMembers]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [view, setView]               = useState('tree')
  const [selectedPerson, setSelected] = useState(null)
  const [focusedId, setFocusedId]     = useState(null)
  const [showForm, setShowForm]       = useState(false)
  const [formData, setFormData]       = useState(null)
  const [saving, setSaving]           = useState(false)
  const [toast, setToast]             = useState(null)
  const [search, setSearch]           = useState('')
  const [tfm, setTfm]                 = useState({ x: 40, y: 40, s: 0.75 })

  const panning   = useRef(false)
  const panOrigin = useRef({ mx: 0, my: 0, tx: 0, ty: 0 })
  const lastTouch = useRef(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('family_members').select('*').order('birth_year', { nullsFirst: true })
    const valid = (data || []).filter(m => m.name?.trim())
    setMembers(valid)
    setLoading(false)
    // Auto-focus on Erez Baron if no focus set yet
    if (!focusedId) {
      const erez = valid.find(m => m.name?.toLowerCase().includes('erez baron'))
      if (erez) setFocusedId(erez.id)
    }
  }

  const tree = useMemo(() => buildLayout(members, focusedId), [members, focusedId])

  function flash(msg, color = '#22c55e') {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3000)
  }

  function personOf(id) { return members.find(m => m.id === id) }
  function nameOf(id) { return members.find(m => m.id === id)?.name ?? '' }
  function childrenOf(id) { return members.filter(m => m.father_id === id || m.mother_id === id) }

  function siblingsOf(person) {
    return members.filter(m => {
      if (m.id === person.id) return false
      const sharedFather = person.father_id && m.father_id === person.father_id
      const sharedMother = person.mother_id && m.mother_id === person.mother_id
      return sharedFather || sharedMother
    })
  }

  // Additional partners = people who co-parent children with this person, beyond the main spouse
  function additionalPartnersOf(id, mainSpouseId) {
    const coParentIds = members
      .filter(m => m.father_id === id || m.mother_id === id)
      .map(child => child.father_id === id ? child.mother_id : child.father_id)
      .filter(pid => pid && pid !== mainSpouseId && pid !== id)
    // unique
    return [...new Set(coParentIds)].map(pid => personOf(pid)).filter(Boolean)
  }

  function formatYears(m) {
    const parts = []
    if (m.birth_year) parts.push(`נולד/ה ${m.birth_year}`)
    if (m.death_year) parts.push(`נפטר/ה ${m.death_year}`)
    return parts.join(' · ')
  }

  function focusOn(person) {
    setFocusedId(person.id)
    setSelected(null)
    setTfm({ x: 40, y: 40, s: 0.75 })
    setView('tree')
    flash(`מוצג עץ עבור: ${person.name}`)
  }

  function openAdd() {
    setFormData({ name: '', gender: 'unknown', birth_year: '', death_year: '', father_id: '', mother_id: '', spouse_id: '', side: '', notes: '' })
    setShowForm(true)
  }

  function openEdit(person) {
    setFormData({ ...person, birth_year: person.birth_year ?? '', death_year: person.death_year ?? '' })
    setSelected(null)
    setShowForm(true)
  }

  async function save() {
    if (!formData.name?.trim()) return flash('שם הוא שדה חובה', '#ef4444')
    setSaving(true)
    const payload = {
      name: formData.name.trim(), gender: formData.gender || 'unknown',
      birth_year: formData.birth_year ? +formData.birth_year : null,
      death_year: formData.death_year ? +formData.death_year : null,
      father_id: formData.father_id || null, mother_id: formData.mother_id || null,
      spouse_id: formData.spouse_id || null, side: formData.side || null,
      notes: formData.notes || null, added_by: userEmail,
    }
    const { error } = formData.id
      ? await supabase.from('family_members').update(payload).eq('id', formData.id)
      : await supabase.from('family_members').insert(payload)
    setSaving(false)
    if (error) { flash('שגיאה בשמירה', '#ef4444'); return }
    flash(formData.id ? 'עודכן ✓' : 'נוסף ✓')
    setShowForm(false)
    load()
  }

  async function deletePerson(id) {
    if (!window.confirm('למחוק?')) return
    await supabase.from('family_members').delete().eq('id', id)
    setSelected(null); flash('נמחק'); load()
  }

  // Pan/zoom
  function onMouseDown(e) {
    if (e.button !== 0) return
    panning.current = true
    panOrigin.current = { mx: e.clientX, my: e.clientY, tx: tfm.x, ty: tfm.y }
  }
  function onMouseMove(e) {
    if (!panning.current) return
    setTfm(t => ({ ...t, x: panOrigin.current.tx + (e.clientX - panOrigin.current.mx), y: panOrigin.current.ty + (e.clientY - panOrigin.current.my) }))
  }
  function onMouseUp() { panning.current = false }
  function onWheel(e) {
    e.preventDefault()
    setTfm(t => ({ ...t, s: Math.max(0.15, Math.min(3, t.s * (e.deltaY > 0 ? 0.9 : 1.11))) }))
  }
  function onTouchStart(e) {
    if (e.touches.length === 1) lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx: tfm.x, ty: tfm.y }
  }
  function onTouchMove(e) {
    if (e.touches.length !== 1 || !lastTouch.current) return
    setTfm(t => ({ ...t, x: lastTouch.current.tx + (e.touches[0].clientX - lastTouch.current.x), y: lastTouch.current.ty + (e.touches[0].clientY - lastTouch.current.y) }))
  }

  // List view
  const maxGen = tree.nodes.length ? Math.max(...tree.nodes.map(n => n.generation)) : 0
  const byGen  = useMemo(() => {
    const g = {}
    tree.nodes.forEach(n => { if (!g[n.generation]) g[n.generation] = []; g[n.generation].push(n) })
    return g
  }, [tree])

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members
    return members.filter(m => m.name?.toLowerCase().includes(search.trim().toLowerCase()))
  }, [members, search])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f0f4ff', color: '#1d4ed8', fontSize: 18, fontFamily: "'Open Sans',Arial,sans-serif", fontWeight: 700 }}>טוען…</div>
  )

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Open Sans','Open Sans Hebrew',Arial,sans-serif", background: '#f0f4ff', minHeight: '100vh' }}>

      {/* Header */}
            <BaronsHeader
        title="עץ משפחה"
        subtitle="שושלת ברון לדורותיה"
        breadcrumbs={[{ label: 'עץ משפחה', path: '/family' }]}
        actions={[]}
      />

      {/* Search + View Toggle */}
      <div style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'8px 16px', display:'flex', alignItems:'center', gap:8, direction:'rtl' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חפש אדם בעץ..."
          style={{ flex:1, border:'1px solid #e2e8f0', borderRadius:8, padding:'7px 12px', fontSize:14, fontFamily:"'Open Sans','Open Sans Hebrew',Arial,sans-serif", outline:'none', direction:'rtl' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:16, padding:'4px 8px' }}>✕</button>
        )}
        <button
          onClick={() => setView(view === 'tree' ? 'list' : 'tree')}
          style={{ background: view === 'list' ? '#1d4ed8' : '#f1f5f9', color: view === 'list' ? 'white' : '#475569', border:'none', borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', fontFamily:"'Open Sans','Open Sans Hebrew',Arial,sans-serif" }}
        >
          {view === 'tree' ? '📋 רשימה' : '🌳 עץ'}
        </button>
      </div>

      {/* Tree View */}
      {view === 'tree' && !search && (
        <div style={{ width: '100%', height: 'calc(100vh - 165px)', overflow: 'hidden', position: 'relative', cursor: 'grab', userSelect: 'none' }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onWheel={onWheel} onTouchStart={onTouchStart} onTouchMove={onTouchMove}>

          {/* Empty state */}
          {!focusedId && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, pointerEvents: 'none' }}>
              <div style={{ fontSize: 64 }}>🌳</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>עץ המשפחה BARONS</div>
              <div style={{ fontSize: 14, color: '#64748b', textAlign: 'center', maxWidth: 320, lineHeight: 1.7 }}>
                חפש אדם בשורת החיפוש למעלה,<br />לחץ עליו ואז על <strong>🎯 מקד</strong><br />כדי לראות את ענף המשפחה שלו
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>{members.length} אנשים בעץ</div>
            </div>
          )}

          {/* Hint */}
          {focusedId && (
            <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#94a3b8', zIndex: 10, pointerEvents: 'none' }}>
              גרור להזזה • גלגלת לזום
            </div>
          )}

          {/* Legend */}
          {focusedId && (
            <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: '10px 14px', fontSize: 11, zIndex: 10, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              {[['male','זכר'],['female','נקבה'],['unknown','לא ידוע']].map(([g,l]) => (
                <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: GS[g].bg, border: `1.5px solid ${GS[g].border}` }} />
                  <span style={{ color: '#475569' }}>{l}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <div style={{ width: 12, height: 0, borderTop: '2px dashed #fca5a5' }} />
                <span style={{ color: '#475569' }}>בני זוג</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <div style={{ width: 12, height: 0, borderTop: '3px solid #f59e0b' }} />
                <span style={{ color: '#475569' }}>מוקד</span>
              </div>
            </div>
          )}

          {/* Zoom controls */}
          {focusedId && (
            <div style={{ position: 'absolute', bottom: 20, left: 10, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10 }}>
              {[{l:'+',fn:()=>setTfm(t=>({...t,s:Math.min(3,t.s*1.2)}))},{l:'−',fn:()=>setTfm(t=>({...t,s:Math.max(0.15,t.s*0.8)}))},{l:'⌂',fn:()=>setTfm({x:40,y:40,s:0.75})}].map((b,i)=>(
                <button key={i} onClick={b.fn} style={{ width:36,height:36,background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,fontSize:i<2?20:15,cursor:'pointer',boxShadow:'0 2px 6px rgba(0,0,0,0.08)',fontWeight:700,color:'#475569' }}>{b.l}</button>
              ))}
            </div>
          )}

          <svg width="100%" height="100%">
            <g transform={`translate(${tfm.x},${tfm.y}) scale(${tfm.s})`}>
              {tree.edges.map((e, i) => {
                const midY = (e.fy + CARD_H/2 + e.ty - CARD_H/2) / 2
                return <path key={i} d={`M${e.fx},${e.fy+CARD_H/2} C${e.fx},${midY} ${e.tx},${midY} ${e.tx},${e.ty-CARD_H/2}`} fill="none" stroke="#cbd5e1" strokeWidth={1.5} />
              })}
              {members.filter(m => m.spouse_id && m.id < m.spouse_id).map(m => {
                const n1 = tree.nodes.find(n => n.id === m.id)
                const n2 = tree.nodes.find(n => n.id === m.spouse_id)
                if (!n1 || !n2 || n1.generation !== n2.generation) return null
                const [l, r] = n1.x < n2.x ? [n1, n2] : [n2, n1]
                return <line key={`sp-${m.id}`} x1={l.x+CARD_W/2} y1={l.y} x2={r.x-CARD_W/2} y2={r.y} stroke="#fca5a5" strokeWidth={2} strokeDasharray="6,4" />
              })}
              {tree.nodes.map(node => {
                const gs = GS[node.gender] || GS.unknown
                const isSelected = selectedPerson?.id === node.id
                const isFocused  = focusedId === node.id
                return (
                  <g key={node.id} transform={`translate(${node.x-CARD_W/2},${node.y-CARD_H/2})`} style={{ cursor: 'pointer' }} onClick={() => setSelected(node)}>
                    <rect width={CARD_W} height={CARD_H} rx={9} fill={gs.bg}
                      stroke={isFocused ? '#f59e0b' : gs.border}
                      strokeWidth={isSelected || isFocused ? 3 : 1.5}
                      opacity={node.death_year ? 0.75 : 1}
                      filter={isSelected ? 'drop-shadow(0 0 6px rgba(29,78,216,0.35))' : undefined} />
                    {node.death_year && <rect width={CARD_W} height={4} rx={3} fill={gs.border} opacity={0.7} />}
                    <text x={CARD_W/2} y={26} textAnchor="middle" fontSize={12} fontWeight={700} fill={gs.text}
                      fontFamily="'Open Sans Hebrew','Open Sans',Arial,sans-serif" style={{ userSelect: 'none' }}>
                      {node.name.length > 15 ? node.name.slice(0,14)+'…' : node.name}
                    </text>
                    <text x={CARD_W/2} y={44} textAnchor="middle" fontSize={10} fill="#64748b"
                      fontFamily="'Open Sans',Arial,sans-serif" style={{ userSelect: 'none' }}>
                      {node.birth_year && `*${node.birth_year}`}{node.birth_year && node.death_year && '  '}{node.death_year && `†${node.death_year}`}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>
        </div>
      )}

      {/* List / Search View */}
      {(view === 'list' || search) && (
        <div style={{ padding: '20px', maxWidth: 900, margin: '0 auto' }}>
          {search ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 12 }}>תוצאות: {filteredMembers.length}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {filteredMembers.map(p => <PersonCard key={p.id} person={p} onClick={() => setSelected(p)} />)}
              </div>
            </>
          ) : (
            Array.from({ length: maxGen+1 }, (_,g) => byGen[g]?.length ? (
              <div key={g} style={{ marginBottom: 30 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }}>
                  דור {g+1} — {byGen[g].length} אנשים
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {byGen[g].map(p => <PersonCard key={p.id} person={p} onClick={() => setSelected(p)} />)}
                </div>
              </div>
            ) : null)
          )}
          {view === 'list' && !focusedId && (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 20 }}>
              💡 לחץ על אדם כדי לפתוח את הפרטים שלו ולמקד את העץ סביבו
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPerson && (
        <Modal onClose={() => setSelected(null)}>
          <div style={{ padding: '10px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#0f172a' }}>{selectedPerson.name}</h2>
              {(selectedPerson.birth_year || selectedPerson.death_year) && (
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>{formatYears(selectedPerson)}</div>
              )}
            </div>
            <button onClick={() => setSelected(null)} style={closeBtn}>×</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '14px 20px' }}>

            {/* Parents */}
            {(selectedPerson.father_id || selectedPerson.mother_id) && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>הורים</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[['אבא', selectedPerson.father_id], ['אמא', selectedPerson.mother_id]].map(([label, pid]) => {
                    if (!pid) return null
                    const p = personOf(pid)
                    if (!p) return null
                    return <PersonChip key={label} person={{ ...p, name: `${label}: ${p.name}` }} onClick={() => setSelected(p)} />
                  })}
                </div>
              </div>
            )}

            {/* Spouse */}
            {selectedPerson.spouse_id && personOf(selectedPerson.spouse_id) && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>בן/בת זוג</div>
                <PersonChip person={personOf(selectedPerson.spouse_id)} onClick={() => setSelected(personOf(selectedPerson.spouse_id))} />
              </div>
            )}

            {/* Additional partners (co-parents beyond main spouse) */}
            {(() => {
              const extras = additionalPartnersOf(selectedPerson.id, selectedPerson.spouse_id)
              if (!extras.length) return null
              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>בן/בת זוג נוסף/ת</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {extras.map(p => <PersonChip key={p.id} person={p} onClick={() => setSelected(p)} />)}
                  </div>
                </div>
              )
            })()}

            {/* Details */}
            {[
              ['מין', selectedPerson.gender === 'male' ? 'זכר' : selectedPerson.gender === 'female' ? 'נקבה' : '—'],
              ['ענף', selectedPerson.side || '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>{label}</span>
                <span style={{ color: '#1e293b' }}>{value}</span>
              </div>
            ))}

            {selectedPerson.notes && (
              <div style={{ marginTop: 12, background: '#f8fafc', borderRadius: 8, padding: 12, fontSize: 13, color: '#475569', lineHeight: 1.65 }}>
                {selectedPerson.notes}
              </div>
            )}

            {/* Siblings */}
            {(() => {
              const sibs = siblingsOf(selectedPerson)
              if (!sibs.length) return null
              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>אחים ואחיות ({sibs.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {sibs.map(s => <PersonChip key={s.id} person={s} onClick={() => setSelected(s)} />)}
                  </div>
                </div>
              )
            })()}

            {/* Children */}
            {(() => {
              const ch = childrenOf(selectedPerson.id)
              if (!ch.length) return null
              return (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>ילדים ({ch.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {ch.map(c => <PersonChip key={c.id} person={c} onClick={() => setSelected(c)} />)}
                  </div>
                </div>
              )
            })()}
          </div>

          <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {isAdmin && (
                <button onClick={() => deletePerson(selectedPerson.id)} style={{ background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 14px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🗑</button>
              )}
              <button onClick={() => focusOn(selectedPerson)}
                style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                🎯 מקד בעץ
              </button>
            </div>
            {isAdmin && <button onClick={() => openEdit(selectedPerson)} style={primaryBtn}>✏️ ערוך</button>}
          </div>
        </Modal>
      )}

      {/* Add/Edit Modal */}
      {showForm && isAdmin && (
        <Modal onClose={() => setShowForm(false)} tall>
          <div style={{ padding: '10px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{formData?.id ? 'ערוך פרטים' : 'הוסף אדם'}</h2>
            <button onClick={() => setShowForm(false)} style={closeBtn}>×</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
            <FormField label="שם מלא *">
              <input value={formData?.name||''} onChange={e=>setFormData(d=>({...d,name:e.target.value}))} style={iStyle} autoFocus />
            </FormField>
            <FormField label="מין">
              <select value={formData?.gender||'unknown'} onChange={e=>setFormData(d=>({...d,gender:e.target.value}))} style={iStyle}>
                <option value="unknown">לא ידוע</option><option value="male">זכר</option><option value="female">נקבה</option>
              </select>
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="שנת לידה">
                <input type="number" value={formData?.birth_year||''} onChange={e=>setFormData(d=>({...d,birth_year:e.target.value}))} placeholder="1920" style={iStyle} />
              </FormField>
              <FormField label="שנת פטירה">
                <input type="number" value={formData?.death_year||''} onChange={e=>setFormData(d=>({...d,death_year:e.target.value}))} placeholder="2000" style={iStyle} />
              </FormField>
            </div>

            <PersonSearch label="אבא" value={formData?.father_id||''} onChange={v=>setFormData(d=>({...d,father_id:v}))}
              members={members} excludeId={formData?.id} genderFilter="male" />

            <PersonSearch label="אמא" value={formData?.mother_id||''} onChange={v=>setFormData(d=>({...d,mother_id:v}))}
              members={members} excludeId={formData?.id} genderFilter="female" />

            <PersonSearch label="בן/בת זוג" value={formData?.spouse_id||''} onChange={v=>setFormData(d=>({...d,spouse_id:v}))}
              members={members} excludeId={formData?.id} />

            <FormField label="ענף">
              <select value={formData?.side||''} onChange={e=>setFormData(d=>({...d,side:e.target.value}))} style={iStyle}>
                <option value="">—</option><option value="grossman">גרוסמן</option><option value="artag">ארטג</option>
                <option value="both">שניהם</option><option value="other">אחר</option>
              </select>
            </FormField>
            <FormField label="הערות">
              <textarea value={formData?.notes||''} onChange={e=>setFormData(d=>({...d,notes:e.target.value}))}
                rows={3} style={{ ...iStyle, resize: 'vertical', minHeight: 70 }} />
            </FormField>
          </div>
          <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>ביטול</button>
            <button onClick={save} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'שומר…' : '✓ שמור'}</button>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} />}
    </div>
  )
}
