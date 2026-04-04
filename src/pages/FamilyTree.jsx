import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────
const EDITORS = ['erez@barons.co.il', 'roy@barons.co.il', 'user@barons.co.il']
const CARD_W = 136
const CARD_H = 62
const H_GAP  = 28
const V_GAP  = 90

const GENDER_STYLE = {
  male:    { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' },
  female:  { bg: '#fce7f3', border: '#f9a8d4', text: '#9d174d' },
  unknown: { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' },
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 12px',
  fontSize: 14, fontFamily: "'Open Sans','Open Sans Hebrew',Arial,sans-serif",
  color: '#1e293b', background: '#fff', outline: 'none',
}

// ─── Tree Layout ──────────────────────────────────────────────────────────────
function buildLayout(members) {
  if (!members.length) return { nodes: [], edges: [], width: 800, height: 600 }

  const byId = Object.fromEntries(members.map(m => [m.id, m]))

  // Build children map
  const childrenOf = {}   // parent_id → [child_id]
  const parentIds  = {}   // child_id  → Set of parent_ids

  members.forEach(m => {
    parentIds[m.id] = new Set()
    ;[m.father_id, m.mother_id].forEach(pid => {
      if (pid && byId[pid]) {
        if (!childrenOf[pid]) childrenOf[pid] = []
        if (!childrenOf[pid].includes(m.id)) childrenOf[pid].push(m.id)
        parentIds[m.id].add(pid)
      }
    })
  })

  // BFS to assign generations
  const gen = {}
  const roots = members.filter(m => parentIds[m.id].size === 0).map(m => m.id)
  if (!roots.length) roots.push(members[0].id)

  const queue = roots.map(id => [id, 0])
  while (queue.length) {
    const [id, g] = queue.shift()
    if (gen[id] !== undefined) continue
    gen[id] = g
    ;(childrenOf[id] || []).forEach(cid => queue.push([cid, g + 1]))
  }
  members.forEach(m => { if (gen[m.id] === undefined) gen[m.id] = 0 })

  // Sort each generation: try to keep spouses adjacent, then by name
  const maxGen = Math.max(...Object.values(gen))
  const byGen  = {}
  for (let g = 0; g <= maxGen; g++) byGen[g] = []
  members.forEach(m => byGen[gen[m.id]].push(m))

  // Sort within generation: group spouses together
  for (let g = 0; g <= maxGen; g++) {
    const placed = new Set()
    const sorted = []
    byGen[g].forEach(m => {
      if (placed.has(m.id)) return
      sorted.push(m)
      placed.add(m.id)
      if (m.spouse_id && !placed.has(m.spouse_id)) {
        const spouse = byGen[g].find(x => x.id === m.spouse_id)
        if (spouse) { sorted.push(spouse); placed.add(spouse.id) }
      }
    })
    byGen[g] = sorted
  }

  // Assign x positions
  const posX = {}, posY = {}
  for (let g = 0; g <= maxGen; g++) {
    byGen[g].forEach((m, i) => {
      posX[m.id] = i * (CARD_W + H_GAP) + CARD_W / 2
      posY[m.id] = g * (CARD_H + V_GAP) + CARD_H / 2
    })
  }

  // Nudge parents to center over their children
  for (let g = maxGen - 1; g >= 0; g--) {
    byGen[g].forEach(m => {
      const ch = (childrenOf[m.id] || []).filter(cid => posX[cid] !== undefined)
      if (!ch.length) return
      const avgX = ch.reduce((s, cid) => s + posX[cid], 0) / ch.length
      // Only nudge if no spouse (to avoid breaking couples)
      if (!m.spouse_id) posX[m.id] = avgX
    })
  }

  const allX  = Object.values(posX)
  const allY  = Object.values(posY)
  const width  = Math.max(...allX) + CARD_W / 2 + 30
  const height = Math.max(...allY) + CARD_H / 2 + 30

  // Edges: parent → child
  const edges = []
  members.forEach(m => {
    ;[m.father_id, m.mother_id].forEach(pid => {
      if (pid && posX[pid] !== undefined && posX[m.id] !== undefined) {
        edges.push({ fx: posX[pid], fy: posY[pid], tx: posX[m.id], ty: posY[m.id] })
      }
    })
  })

  const nodes = members.map(m => ({ ...m, x: posX[m.id] ?? 0, y: posY[m.id] ?? 0, generation: gen[m.id] ?? 0 }))

  return { nodes, edges, width, height }
}

// ─── Subcomponents ────────────────────────────────────────────────────────────
function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
      {children}
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FamilyTree({ session }) {
  const navigate    = useNavigate()
  const userEmail   = session?.user?.email
  const isAdmin     = EDITORS.includes(userEmail)

  // Data
  const [members, setMembers]   = useState([])
  const [loading, setLoading]   = useState(true)

  // UI
  const [view, setView]             = useState('tree')   // 'tree' | 'list'
  const [selectedPerson, setSelected] = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [formData, setFormData]     = useState(null)
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState(null)
  const [search, setSearch]         = useState('')

  // SVG pan/zoom
  const [tfm, setTfm]   = useState({ x: 40, y: 40, s: 0.85 })
  const panning         = useRef(false)
  const panOrigin       = useRef({ mx: 0, my: 0, tx: 0, ty: 0 })
  const svgContainer    = useRef(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('family_members')
      .select('*')
      .order('birth_year', { nullsFirst: true })
    setMembers(data || [])
    setLoading(false)
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  const tree = useMemo(() => buildLayout(members), [members])

  // ── Helpers ───────────────────────────────────────────────────────────────
  function flash(msg, color = '#22c55e') {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3000)
  }

  function nameOf(id) { return members.find(m => m.id === id)?.name ?? '' }

  function childrenOf(id) {
    return members.filter(m => m.father_id === id || m.mother_id === id)
  }

  function formatYears(m) {
    if (m.birth_year && m.death_year) return `${m.birth_year} — ${m.death_year}`
    if (m.birth_year) return `נולד ${m.birth_year}`
    if (m.death_year) return `נפטר ${m.death_year}`
    return ''
  }

  // ── Form ──────────────────────────────────────────────────────────────────
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
      name:       formData.name.trim(),
      gender:     formData.gender || 'unknown',
      birth_year: formData.birth_year ? +formData.birth_year : null,
      death_year: formData.death_year ? +formData.death_year : null,
      father_id:  formData.father_id  || null,
      mother_id:  formData.mother_id  || null,
      spouse_id:  formData.spouse_id  || null,
      side:       formData.side       || null,
      notes:      formData.notes      || null,
      added_by:   userEmail,
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
    if (!window.confirm('למחוק אדם זה?')) return
    await supabase.from('family_members').delete().eq('id', id)
    setSelected(null)
    flash('נמחק')
    load()
  }

  // ── SVG Pan / Zoom ────────────────────────────────────────────────────────
  function onMouseDown(e) {
    if (e.button !== 0) return
    panning.current = true
    panOrigin.current = { mx: e.clientX, my: e.clientY, tx: tfm.x, ty: tfm.y }
    e.currentTarget.style.cursor = 'grabbing'
  }
  function onMouseMove(e) {
    if (!panning.current) return
    const dx = e.clientX - panOrigin.current.mx
    const dy = e.clientY - panOrigin.current.my
    setTfm(t => ({ ...t, x: panOrigin.current.tx + dx, y: panOrigin.current.ty + dy }))
  }
  function onMouseUp(e) {
    panning.current = false
    if (e.currentTarget) e.currentTarget.style.cursor = 'grab'
  }
  function onWheel(e) {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.11
    setTfm(t => ({ ...t, s: Math.max(0.25, Math.min(2.5, t.s * factor)) }))
  }

  // Touch pan
  const lastTouch = useRef(null)
  function onTouchStart(e) {
    if (e.touches.length === 1) lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx: tfm.x, ty: tfm.y }
  }
  function onTouchMove(e) {
    if (e.touches.length !== 1 || !lastTouch.current) return
    const dx = e.touches[0].clientX - lastTouch.current.x
    const dy = e.touches[0].clientY - lastTouch.current.y
    setTfm(t => ({ ...t, x: lastTouch.current.tx + dx, y: lastTouch.current.ty + dy }))
  }

  // ── List view data ────────────────────────────────────────────────────────
  const maxGen = tree.nodes.length ? Math.max(...tree.nodes.map(n => n.generation)) : 0
  const byGen  = useMemo(() => {
    const g = {}
    tree.nodes.forEach(n => {
      if (!g[n.generation]) g[n.generation] = []
      g[n.generation].push(n)
    })
    return g
  }, [tree])

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members
    const q = search.trim().toLowerCase()
    return members.filter(m => m.name?.toLowerCase().includes(q))
  }, [members, search])

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f0f4ff', color: '#1d4ed8', fontSize: 18, fontFamily: "'Open Sans',Arial,sans-serif", fontWeight: 700 }}>
      טוען עץ משפחה…
    </div>
  )

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Open Sans','Open Sans Hebrew',Arial,sans-serif", background: '#f0f4ff', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100, padding: '12px 20px' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', fontFamily: 'inherit', fontSize: 14, padding: 0, fontWeight: 600 }}>BARONS</button>
          <span>/</span>
          <span style={{ color: '#1e293b', fontWeight: 600 }}>עץ משפחה</span>
        </nav>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: '#0f172a' }}>🌳 משפחת גרוסמן-ארטג</h1>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{members.length} אנשים • {maxGen + 1} דורות</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
              {[{ id: 'tree', label: '🌳 עץ' }, { id: 'list', label: '📋 רשימה' }].map(v => (
                <button key={v.id} onClick={() => setView(v.id)} style={{
                  background: view === v.id ? '#fff' : 'transparent', border: 'none', borderRadius: 6,
                  padding: '5px 13px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  color: view === v.id ? '#1d4ed8' : '#64748b',
                  boxShadow: view === v.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}>{v.label}</button>
              ))}
            </div>
            {isAdmin && (
              <button onClick={openAdd} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                + הוסף אדם
              </button>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div style={{ marginTop: 10 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍  חפש לפי שם..."
            style={{ ...inputStyle, background: '#f8fafc', borderColor: '#e2e8f0' }}
          />
        </div>
      </header>

      {/* ── Tree View ── */}
      {view === 'tree' && !search && (
        <div
          ref={svgContainer}
          style={{ width: '100%', height: 'calc(100vh - 148px)', overflow: 'hidden', position: 'relative', cursor: 'grab', userSelect: 'none' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
        >
          {/* hint */}
          <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#94a3b8', zIndex: 10, pointerEvents: 'none' }}>
            גרור להזזה • גלגלת לזום
          </div>

          {/* Legend */}
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: '10px 14px', fontSize: 11, zIndex: 10, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            {[['male', 'זכר'], ['female', 'נקבה'], ['unknown', 'לא ידוע']].map(([g, label]) => (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: GENDER_STYLE[g].bg, border: `1.5px solid ${GENDER_STYLE[g].border}` }} />
                <span style={{ color: '#475569' }}>{label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 14, height: 2, background: '#fca5a5', borderTop: '2px dashed #fca5a5' }} />
              <span style={{ color: '#475569' }}>בני זוג</span>
            </div>
          </div>

          {/* Zoom controls */}
          <div style={{ position: 'absolute', bottom: 20, left: 10, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10 }}>
            {[{ l: '+', fn: () => setTfm(t => ({ ...t, s: Math.min(2.5, t.s * 1.2) })) }, { l: '−', fn: () => setTfm(t => ({ ...t, s: Math.max(0.25, t.s * 0.8) })) }, { l: '⌂', fn: () => setTfm({ x: 40, y: 40, s: 0.85 }) }].map((b, i) => (
              <button key={i} onClick={b.fn} style={{ width: 36, height: 36, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: i < 2 ? 20 : 15, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', fontFamily: 'inherit', fontWeight: 700, color: '#475569' }}>
                {b.l}
              </button>
            ))}
          </div>

          <svg width="100%" height="100%">
            <g transform={`translate(${tfm.x},${tfm.y}) scale(${tfm.s})`}>

              {/* Edges: parent → child */}
              {tree.edges.map((e, i) => {
                const midY = (e.fy + CARD_H / 2 + e.ty - CARD_H / 2) / 2
                return (
                  <path key={i}
                    d={`M${e.fx},${e.fy + CARD_H / 2} C${e.fx},${midY} ${e.tx},${midY} ${e.tx},${e.ty - CARD_H / 2}`}
                    fill="none" stroke="#cbd5e1" strokeWidth={1.5}
                  />
                )
              })}

              {/* Spouse lines */}
              {members.filter(m => m.spouse_id && m.id < m.spouse_id).map(m => {
                const n1 = tree.nodes.find(n => n.id === m.id)
                const n2 = tree.nodes.find(n => n.id === m.spouse_id)
                if (!n1 || !n2 || n1.generation !== n2.generation) return null
                const left  = n1.x < n2.x ? n1 : n2
                const right = n1.x < n2.x ? n2 : n1
                return (
                  <line key={`sp-${m.id}`}
                    x1={left.x + CARD_W / 2} y1={left.y}
                    x2={right.x - CARD_W / 2} y2={right.y}
                    stroke="#fca5a5" strokeWidth={2} strokeDasharray="6,4"
                  />
                )
              })}

              {/* Person cards */}
              {tree.nodes.filter(n => !search || n.name?.toLowerCase().includes(search.toLowerCase())).map(node => {
                const gs = GENDER_STYLE[node.gender] || GENDER_STYLE.unknown
                const isSelected = selectedPerson?.id === node.id
                const deceased = !!node.death_year
                return (
                  <g key={node.id} transform={`translate(${node.x - CARD_W / 2},${node.y - CARD_H / 2})`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelected(node)}
                  >
                    <rect width={CARD_W} height={CARD_H} rx={9} ry={9}
                      fill={gs.bg} stroke={gs.border}
                      strokeWidth={isSelected ? 3 : 1.5}
                      opacity={deceased ? 0.72 : 1}
                      filter={isSelected ? 'drop-shadow(0 0 6px rgba(29,78,216,0.35))' : undefined}
                    />
                    {/* deceased bar */}
                    {deceased && <rect width={CARD_W} height={4} rx={4} ry={4} fill={gs.border} opacity={0.6} />}
                    <text x={CARD_W / 2} y={24} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={gs.text}
                      fontFamily="'Open Sans Hebrew','Open Sans',Arial,sans-serif" style={{ userSelect: 'none' }}>
                      {node.name.length > 13 ? node.name.slice(0, 12) + '…' : node.name}
                    </text>
                    <text x={CARD_W / 2} y={40} textAnchor="middle" fontSize={9.5} fill="#64748b"
                      fontFamily="'Open Sans',Arial,sans-serif" style={{ userSelect: 'none' }}>
                      {[node.birth_year, node.death_year].filter(Boolean).join(' — ')}
                    </text>
                    {node.notes && (
                      <text x={CARD_W - 9} y={13} fontSize={9} textAnchor="middle" style={{ userSelect: 'none' }}>📝</text>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>
        </div>
      )}

      {/* ── List / Search View ── */}
      {(view === 'list' || search) && (
        <div style={{ padding: '20px', maxWidth: 860, margin: '0 auto' }}>
          {search ? (
            <>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>תוצאות חיפוש: {filteredMembers.length}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
                {filteredMembers.map(p => <PersonCard key={p.id} person={p} onClick={() => setSelected(p)} />)}
              </div>
            </>
          ) : (
            Array.from({ length: maxGen + 1 }, (_, g) => (
              byGen[g]?.length ? (
                <div key={g} style={{ marginBottom: 30 }}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }}>
                    דור {g + 1} — {byGen[g].length} אנשים
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
                    {byGen[g].map(p => <PersonCard key={p.id} person={p} onClick={() => setSelected(p)} />)}
                  </div>
                </div>
              ) : null
            ))
          )}
        </div>
      )}

      {/* ── Person Detail Modal ── */}
      {selectedPerson && (
        <Modal onClose={() => setSelected(null)}>
          <div style={{ padding: '10px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#0f172a' }}>{selectedPerson.name}</h2>
            <button onClick={() => setSelected(null)} style={closeBtn}>×</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '14px 20px' }}>
            {/* years badge */}
            {(selectedPerson.birth_year || selectedPerson.death_year) && (
              <div style={{ display: 'inline-block', background: '#f1f5f9', borderRadius: 20, padding: '4px 14px', fontSize: 13, color: '#475569', fontWeight: 600, marginBottom: 14 }}>
                {formatYears(selectedPerson)}
              </div>
            )}

            {[
              ['מין', selectedPerson.gender === 'male' ? 'זכר' : selectedPerson.gender === 'female' ? 'נקבה' : '—'],
              ['אבא',      selectedPerson.father_id ? nameOf(selectedPerson.father_id) : '—'],
              ['אמא',      selectedPerson.mother_id ? nameOf(selectedPerson.mother_id) : '—'],
              ['בן/בת זוג', selectedPerson.spouse_id ? nameOf(selectedPerson.spouse_id) : '—'],
              ['ענף',      selectedPerson.side === 'grossman' ? 'גרוסמן' : selectedPerson.side === 'artag' ? 'ארטג' : selectedPerson.side || '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>{label}</span>
                <span style={{ color: '#1e293b' }}>{value}</span>
              </div>
            ))}

            {selectedPerson.notes && (
              <div style={{ marginTop: 14, background: '#f8fafc', borderRadius: 8, padding: 12, fontSize: 13, color: '#475569', lineHeight: 1.65 }}>
                {selectedPerson.notes}
              </div>
            )}

            {/* Children */}
            {(() => {
              const ch = childrenOf(selectedPerson.id)
              if (!ch.length) return null
              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#64748b', marginBottom: 8 }}>ילדים ({ch.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {ch.map(c => (
                      <span key={c.id} onClick={() => setSelected(c)}
                        style={{ background: '#f1f5f9', borderRadius: 20, padding: '4px 13px', fontSize: 13, cursor: 'pointer', color: '#1d4ed8', fontWeight: 600 }}>
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
          {isAdmin && (
            <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => deletePerson(selectedPerson.id)} style={{ background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                🗑 מחק
              </button>
              <button onClick={() => openEdit(selectedPerson)} style={primaryBtn}>✏️ ערוך</button>
            </div>
          )}
        </Modal>
      )}

      {/* ── Add / Edit Modal ── */}
      {showForm && isAdmin && (
        <Modal onClose={() => setShowForm(false)} tall>
          <div style={{ padding: '10px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{formData?.id ? 'עריכת פרטים' : 'הוסף אדם חדש'}</h2>
            <button onClick={() => setShowForm(false)} style={closeBtn}>×</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
            <FormField label="שם מלא *">
              <input value={formData?.name || ''} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} placeholder="שם" style={inputStyle} />
            </FormField>
            <FormField label="מין">
              <select value={formData?.gender || 'unknown'} onChange={e => setFormData(d => ({ ...d, gender: e.target.value }))} style={inputStyle}>
                <option value="unknown">לא ידוע</option>
                <option value="male">זכר</option>
                <option value="female">נקבה</option>
              </select>
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="שנת לידה">
                <input type="number" value={formData?.birth_year || ''} onChange={e => setFormData(d => ({ ...d, birth_year: e.target.value }))} placeholder="1920" style={inputStyle} />
              </FormField>
              <FormField label="שנת פטירה">
                <input type="number" value={formData?.death_year || ''} onChange={e => setFormData(d => ({ ...d, death_year: e.target.value }))} placeholder="2000" style={inputStyle} />
              </FormField>
            </div>
            <FormField label="אבא">
              <select value={formData?.father_id || ''} onChange={e => setFormData(d => ({ ...d, father_id: e.target.value }))} style={inputStyle}>
                <option value="">— ללא —</option>
                {members.filter(m => m.id !== formData?.id && m.gender !== 'female').map(m => (
                  <option key={m.id} value={m.id}>{m.name}{m.birth_year ? ` (${m.birth_year})` : ''}</option>
                ))}
              </select>
            </FormField>
            <FormField label="אמא">
              <select value={formData?.mother_id || ''} onChange={e => setFormData(d => ({ ...d, mother_id: e.target.value }))} style={inputStyle}>
                <option value="">— ללא —</option>
                {members.filter(m => m.id !== formData?.id && m.gender !== 'male').map(m => (
                  <option key={m.id} value={m.id}>{m.name}{m.birth_year ? ` (${m.birth_year})` : ''}</option>
                ))}
              </select>
            </FormField>
            <FormField label="בן/בת זוג">
              <select value={formData?.spouse_id || ''} onChange={e => setFormData(d => ({ ...d, spouse_id: e.target.value }))} style={inputStyle}>
                <option value="">— ללא —</option>
                {members.filter(m => m.id !== formData?.id).map(m => (
                  <option key={m.id} value={m.id}>{m.name}{m.birth_year ? ` (${m.birth_year})` : ''}</option>
                ))}
              </select>
            </FormField>
            <FormField label="ענף משפחתי">
              <select value={formData?.side || ''} onChange={e => setFormData(d => ({ ...d, side: e.target.value }))} style={inputStyle}>
                <option value="">—</option>
                <option value="grossman">גרוסמן</option>
                <option value="artag">ארטג</option>
                <option value="both">שניהם</option>
                <option value="other">אחר</option>
              </select>
            </FormField>
            <FormField label="הערות">
              <textarea value={formData?.notes || ''} onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))}
                placeholder="פרטים נוספים..." rows={3}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} />
            </FormField>
          </div>
          <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>ביטול</button>
            <button onClick={save} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'שומר…' : '✓ שמור'}
            </button>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} />}
    </div>
  )
}

// ── Small components ──────────────────────────────────────────────────────────

function PersonCard({ person, onClick }) {
  const gs = GENDER_STYLE[person.gender] || GENDER_STYLE.unknown
  return (
    <div onClick={onClick} style={{ background: gs.bg, border: `1.5px solid ${gs.border}`, borderRadius: 10, padding: '11px 13px', cursor: 'pointer', opacity: person.death_year ? 0.76 : 1, transition: 'transform 0.12s, box-shadow 0.12s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, color: gs.text, marginBottom: 3 }}>{person.name}</div>
      {(person.birth_year || person.death_year) && (
        <div style={{ fontSize: 12, color: '#64748b' }}>{[person.birth_year, person.death_year].filter(Boolean).join(' — ')}</div>
      )}
      {person.notes && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>📝 {person.notes.slice(0, 40)}</div>}
    </div>
  )
}

function Modal({ onClose, children, tall }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 560, height: tall ? '90vh' : 'auto', maxHeight: '85vh', display: 'flex', flexDirection: 'column', direction: 'rtl', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div style={{ padding: '10px 0 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2 }} />
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Shared button styles ──────────────────────────────────────────────────────
const primaryBtn = { background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontFamily: "'Open Sans','Open Sans Hebrew',Arial,sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const ghostBtn   = { background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 18px', fontFamily: "'Open Sans','Open Sans Hebrew',Arial,sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const closeBtn   = { background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: '#94a3b8', lineHeight: 1, padding: 0 }
