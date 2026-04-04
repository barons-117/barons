import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const isAdmin = (s) => s?.user?.email === 'erez@barons.co.il'
const FONT = "'Open Sans Hebrew', 'Open Sans', Arial, sans-serif"

async function fetchData() {
  const [catRes, recipeRes, linksRes] = await Promise.all([
    supabase.from('recipe_categories').select('*').order('sort_order'),
    supabase.from('recipes').select('id, title, author, is_favorite').order('title'),
    supabase.from('recipe_category_links').select('recipe_id, category_id'),
  ])
  return { categories: catRes.data || [], recipes: recipeRes.data || [], links: linksRes.data || [] }
}

export default function Recipes({ session }) {
  const [cats, setCats] = useState([])
  const [recipes, setRecipes] = useState([])
  const [links, setLinks] = useState([])
  const [selectedCat, setSelectedCat] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editCat, setEditCat] = useState(null)
  const navigate = useNavigate()
  const admin = isAdmin(session)

  useEffect(() => { load() }, [])
  // Close sidebar on outside click
  useEffect(() => {
    const close = () => setSidebarOpen(false)
    if (sidebarOpen) {
      setTimeout(() => document.addEventListener('click', close), 10)
      return () => document.removeEventListener('click', close)
    }
  }, [sidebarOpen])

  async function load() {
    setLoading(true)
    const d = await fetchData()
    setCats(d.categories); setRecipes(d.recipes); setLinks(d.links)
    setLoading(false)
  }

  const rcMap = {}
  links.forEach(l => { (rcMap[l.recipe_id] = rcMap[l.recipe_id] || []).push(l.category_id) })

  const visible = recipes.filter(r => {
    const q = search.toLowerCase()
    const ms = !q || r.title.toLowerCase().includes(q) || (r.author || '').toLowerCase().includes(q)
    const mc = selectedCat === 'all' ? true : selectedCat === 'fav' ? r.is_favorite : (rcMap[r.id] || []).includes(selectedCat)
    return ms && mc
  })

  const countFor = id => {
    if (id === 'all') return recipes.length
    if (id === 'fav') return recipes.filter(r => r.is_favorite).length
    return links.filter(l => l.category_id === id).length
  }

  async function toggleFav(e, recipe) {
    e.stopPropagation()
    await supabase.from('recipes').update({ is_favorite: !recipe.is_favorite }).eq('id', recipe.id)
    setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, is_favorite: !r.is_favorite } : r))
  }

  async function deleteRecipe(e, id) {
    e.stopPropagation()
    if (!window.confirm('למחוק את המתכון?')) return
    await supabase.from('recipes').delete().eq('id', id)
    setRecipes(p => p.filter(r => r.id !== id))
    setLinks(p => p.filter(l => l.recipe_id !== id))
  }

  function selectCat(id) {
    setSelectedCat(id)
    setSearch('')
    setSidebarOpen(false)
  }

  const heading = search ? `תוצאות עבור "${search}"` : selectedCat === 'all' ? 'כל המתכונים' : selectedCat === 'fav' ? 'מועדפים' : cats.find(c => c.id === selectedCat)?.name || ''

  // The sidebar content — shared between desktop and mobile drawer
  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} onClick={e => e.stopPropagation()}>
      <div style={{ padding: '16px 12px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.5px' }}>קטגוריות</div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', margin: '0 10px 12px' }}>
        <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
        <input
          style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 30px 8px 28px', color: 'white', fontSize: '13px', fontFamily: FONT, outline: 'none', direction: 'rtl' }}
          placeholder="חיפוש..."
          value={search}
          onChange={e => { setSearch(e.target.value); if (e.target.value) setSelectedCat('all') }}
        />
        {search && <button style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '12px', padding: '2px' }} onClick={() => setSearch('')}>✕</button>}
      </div>

      {/* Nav */}
      <nav style={{ padding: '0 8px', flex: 1, overflowY: 'auto' }}>
        <SideItem label="כל המתכונים" count={countFor('all')} active={selectedCat === 'all' && !search} onClick={() => selectCat('all')} />
        <SideItem label="מועדפים" count={countFor('fav')} active={selectedCat === 'fav' && !search} onClick={() => selectCat('fav')} />
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 4px' }} />
        {cats.map(cat => (
          <SideItem key={cat.id} label={cat.name} count={countFor(cat.id)} active={selectedCat === cat.id && !search} onClick={() => selectCat(cat.id)} onEdit={admin ? () => { setEditCat(cat); setSidebarOpen(false) } : null} />
        ))}
      </nav>

      {admin && (
        <button
          style={{ margin: '12px 10px 0', background: 'none', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', color: 'rgba(255,255,255,0.45)', fontSize: '12px', padding: '9px 12px', cursor: 'pointer', fontFamily: FONT, textAlign: 'right' }}
          onClick={() => { setEditCat('new'); setSidebarOpen(false) }}
        >
          + קטגוריה חדשה
        </button>
      )}
    </div>
  )

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        .recipes-sidebar { display: flex; }
        @media (max-width: 768px) {
          .recipes-sidebar { display: none; }
          .recipes-body { flex-direction: column; }
        }
        @media (min-width: 769px) {
          .hamburger-btn { display: none !important; }
          .mobile-overlay { display: none !important; }
          .mobile-drawer { display: none !important; }
        }
        input::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f0f4ff', fontFamily: FONT, direction: 'rtl', color: '#1e293b' }}>

        {/* ── HEADER ── */}
        <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 16px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Hamburger — mobile only */}
            <button
              className="hamburger-btn"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', flexDirection: 'column', gap: '5px', marginLeft: '4px' }}
              onClick={e => { e.stopPropagation(); setSidebarOpen(o => !o) }}
            >
              <span style={{ display: 'block', width: '20px', height: '2px', background: '#334155', borderRadius: '2px', transition: 'transform 0.2s', transform: sidebarOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
              <span style={{ display: 'block', width: '20px', height: '2px', background: '#334155', borderRadius: '2px', opacity: sidebarOpen ? 0 : 1, transition: 'opacity 0.2s' }} />
              <span style={{ display: 'block', width: '20px', height: '2px', background: '#334155', borderRadius: '2px', transition: 'transform 0.2s', transform: sidebarOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
            </button>

            {/* Breadcrumb */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: '14px', fontFamily: FONT, padding: 0, fontWeight: 700 }} onClick={() => navigate('/')}>BARONS</button>
              <span style={{ color: '#cbd5e1', fontSize: '14px' }}>/</span>
              <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>מתכונים</span>
            </nav>
          </div>

          {admin && (
            <button
              style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontFamily: FONT, fontWeight: 700, fontSize: '13px', boxShadow: '0 2px 8px rgba(59,130,246,0.35)' }}
              onClick={() => setAddOpen(true)}
            >
              + מתכון חדש
            </button>
          )}
        </header>

        {/* ── MOBILE OVERLAY + DRAWER ── */}
        {sidebarOpen && (
          <div
            className="mobile-overlay"
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div
          className="mobile-drawer"
          style={{ position: 'fixed', top: '52px', right: sidebarOpen ? 0 : '-260px', width: '260px', bottom: 0, background: '#0b1a3e', zIndex: 400, transition: 'right 0.25s cubic-bezier(.4,0,.2,1)', overflowY: 'auto', padding: '8px 0 20px' }}
        >
          <SidebarContent />
        </div>

        {/* ── BODY ── */}
        <div className="recipes-body" style={{ display: 'flex', minHeight: 'calc(100vh - 52px)' }}>

          {/* Desktop sidebar */}
          <aside
            className="recipes-sidebar"
            style={{ width: '240px', flexShrink: 0, background: '#0b1a3e', flexDirection: 'column', position: 'sticky', top: '52px', height: 'calc(100vh - 52px)', overflowY: 'auto', padding: '8px 0 20px' }}
          >
            <SidebarContent />
          </aside>

          {/* Main content */}
          <main style={{ flex: 1, padding: '24px 20px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{heading}</h1>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>{visible.length} מתכונים</p>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '80px 0' }}>טוען...</div>
            ) : visible.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '80px 0', fontSize: '15px' }}>
                {search ? `לא נמצאו תוצאות עבור "${search}"` : 'אין מתכונים בקטגוריה זו'}
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                {visible.map((recipe, i) => {
                  const recipeCats = (rcMap[recipe.id] || []).map(cid => cats.find(c => c.id === cid)).filter(Boolean)
                  return (
                    <RecipeRow
                      key={recipe.id}
                      recipe={recipe}
                      recipeCats={recipeCats}
                      isLast={i === visible.length - 1}
                      onOpen={() => navigate(`/recipes/${recipe.id}`)}
                      onFav={e => toggleFav(e, recipe)}
                      onEdit={admin ? e => { e.stopPropagation(); setEditId(recipe.id) } : null}
                      onDelete={admin ? e => deleteRecipe(e, recipe.id) : null}
                    />
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── MODALS ── */}
      {(addOpen || editId) && (
        <RecipeModal recipeId={editId} categories={cats}
          onClose={() => { setAddOpen(false); setEditId(null) }}
          onSave={() => { load(); setAddOpen(false); setEditId(null) }} />
      )}
      {editCat && (
        <CatModal cat={editCat === 'new' ? null : editCat}
          onClose={() => setEditCat(null)}
          onSave={() => { load(); setEditCat(null) }}
          onDelete={() => { load(); setEditCat(null) }} />
      )}
    </>
  )
}

// ─── Sidebar Item ─────────────────────────────────────────
function SideItem({ label, count, active, onClick, onEdit }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: '8px', cursor: 'pointer', marginBottom: '1px', transition: 'background 0.12s', background: active ? '#1d4ed8' : hov ? 'rgba(255,255,255,0.09)' : 'transparent' }}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <span style={{ fontSize: '13px', color: active ? 'white' : 'rgba(255,255,255,0.78)', fontWeight: active ? 700 : 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)', background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1px 7px' }}>{count}</span>
        {onEdit && (hov || active) && (
          <button style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontFamily: FONT }} onClick={e => { e.stopPropagation(); onEdit() }}>עריכה</button>
        )}
      </div>
    </div>
  )
}

// ─── Recipe Row ───────────────────────────────────────────
function RecipeRow({ recipe, recipeCats, isLast, onOpen, onFav, onEdit, onDelete }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', transition: 'background 0.1s', background: hov ? '#f8faff' : 'white', borderBottom: isLast ? 'none' : '1px solid #f1f5f9', position: 'relative' }}
      onClick={onOpen}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Left blue accent bar on hover */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '3px', background: '#1d4ed8', opacity: hov ? 1 : 0, transition: 'opacity 0.15s', borderRadius: '0 0 0 3px' }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '4px', lineHeight: 1.3 }}>{recipe.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          {recipe.author && <span style={{ fontSize: '12px', color: '#64748b' }}>{recipe.author}</span>}
          {recipe.author && recipeCats.length > 0 && <span style={{ fontSize: '12px', color: '#e2e8f0' }}>·</span>}
          {recipeCats.map(c => (
            <span key={c.id} style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', borderRadius: '4px', padding: '1px 6px' }}>{c.name}</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginRight: '10px' }} onClick={e => e.stopPropagation()}>
        {hov && onEdit && <button style={{ fontSize: '11px', padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer', fontFamily: FONT, color: '#374151' }} onClick={onEdit}>עריכה</button>}
        {hov && onDelete && <button style={{ fontSize: '11px', padding: '4px 10px', border: '1px solid #fecaca', borderRadius: '6px', background: 'white', cursor: 'pointer', fontFamily: FONT, color: '#dc2626' }} onClick={onDelete}>מחק</button>}
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }} onClick={onFav}>
          {recipe.is_favorite
            ? <svg width="18" height="18" viewBox="0 0 20 20" fill="#f59e0b"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            : <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke={hov ? '#94a3b8' : '#e2e8f0'} strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          }
        </button>
      </div>
    </div>
  )
}

// ─── Recipe Modal ─────────────────────────────────────────
function RecipeModal({ recipeId, categories, onClose, onSave }) {
  const isEdit = !!recipeId
  const [form, setForm] = useState({ title: '', author: '', ingredients: '', instructions: '', notes: '', is_favorite: false })
  const [selCats, setSelCats] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit) {
      supabase.from('recipes').select('*').eq('id', recipeId).single().then(({ data }) => {
        if (data) setForm({ title: data.title || '', author: data.author || '', ingredients: data.ingredients || '', instructions: data.instructions || '', notes: data.notes || '', is_favorite: !!data.is_favorite })
      })
      supabase.from('recipe_category_links').select('category_id').eq('recipe_id', recipeId).then(({ data }) => {
        setSelCats((data || []).map(l => l.category_id))
      })
    } else {
      if (categories.length) setSelCats([categories[0].id])
    }
  }, [recipeId])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleCat = id => setSelCats(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id])

  async function save() {
    if (!form.title.trim()) return setError('שם המתכון הוא שדה חובה')
    if (!form.ingredients.trim()) return setError('מרכיבים הם שדה חובה')
    if (!form.instructions.trim()) return setError('אופן הכנה הוא שדה חובה')
    setSaving(true); setError('')
    let rid = recipeId
    if (isEdit) {
      await supabase.from('recipes').update({ ...form, notes: form.notes || null }).eq('id', rid)
    } else {
      const { data } = await supabase.from('recipes').insert({ ...form, notes: form.notes || null }).select('id').single()
      rid = data.id
    }
    await supabase.from('recipe_category_links').delete().eq('recipe_id', rid)
    if (selCats.length) await supabase.from('recipe_category_links').insert(selCats.map(cid => ({ recipe_id: rid, category_id: cid })))
    setSaving(false); onSave()
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontFamily: FONT, direction: 'rtl', outline: 'none', marginBottom: '14px', color: '#0f172a', resize: 'vertical', display: 'block', background: '#fafafa' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto', direction: 'rtl', fontFamily: FONT }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{isEdit ? 'עריכת מתכון' : 'מתכון חדש'}</span>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94a3b8', padding: '4px', lineHeight: 1 }} onClick={onClose}>✕</button>
        </div>

        <Lbl>שם המתכון *</Lbl>
        <input style={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="שם המתכון" autoFocus />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div>
            <Lbl>ממי המתכון</Lbl>
            <input style={inp} value={form.author} onChange={e => set('author', e.target.value)} placeholder="שם הכותב" />
          </div>
          <div>
            <Lbl>מועדף</Lbl>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px', cursor: 'pointer', fontSize: '14px', color: '#374151', fontFamily: FONT }}>
              <input type="checkbox" checked={form.is_favorite} onChange={e => set('is_favorite', e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#1d4ed8' }} />
              סמן כמועדף
            </label>
          </div>
        </div>

        <Lbl>קטגוריות</Lbl>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '14px' }}>
          {categories.map(c => (
            <button key={c.id} style={{ padding: '5px 14px', border: '1px solid ' + (selCats.includes(c.id) ? '#1d4ed8' : '#e2e8f0'), borderRadius: '20px', background: selCats.includes(c.id) ? '#1d4ed8' : 'white', cursor: 'pointer', fontSize: '13px', fontFamily: FONT, color: selCats.includes(c.id) ? 'white' : '#374151', transition: 'all 0.1s' }} onClick={() => toggleCat(c.id)}>{c.name}</button>
          ))}
        </div>

        <Lbl hint="שורה לכל מרכיב">מרכיבים *</Lbl>
        <textarea style={{ ...inp, height: '120px' }} value={form.ingredients} onChange={e => set('ingredients', e.target.value)} placeholder={'500 גרם קמח\n2 ביצים\n...'} />

        <Lbl hint="שורה לכל שלב">אופן הכנה *</Lbl>
        <textarea style={{ ...inp, height: '150px' }} value={form.instructions} onChange={e => set('instructions', e.target.value)} placeholder={'מחממים תנור ל-180 מעלות.\nמערבבים...'} />

        <Lbl hint="אופציונלי">הערות</Lbl>
        <textarea style={{ ...inp, height: '65px' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="טיפים, וריאנטים..." />

        {error && <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button style={{ padding: '9px 18px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontFamily: FONT, fontSize: '14px', color: '#374151' }} onClick={onClose}>ביטול</button>
          <button style={{ padding: '9px 20px', border: 'none', borderRadius: '8px', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: 'white', cursor: 'pointer', fontFamily: FONT, fontSize: '14px', fontWeight: 700 }} onClick={save} disabled={saving}>{saving ? 'שומר...' : isEdit ? 'שמור שינויים' : 'הוסף מתכון'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Category Modal ───────────────────────────────────────
function CatModal({ cat, onClose, onSave, onDelete }) {
  const [name, setName] = useState(cat?.name || '')
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    if (cat) {
      await supabase.from('recipe_categories').update({ name: name.trim() }).eq('id', cat.id)
    } else {
      const { data } = await supabase.from('recipe_categories').select('sort_order').order('sort_order', { ascending: false }).limit(1)
      await supabase.from('recipe_categories').insert({ name: name.trim(), sort_order: (data?.[0]?.sort_order || 0) + 1 })
    }
    setSaving(false); onSave()
  }

  async function del() {
    setSaving(true)
    await supabase.from('recipe_category_links').delete().eq('category_id', cat.id)
    await supabase.from('recipe_categories').delete().eq('id', cat.id)
    setSaving(false); onDelete()
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontFamily: FONT, direction: 'rtl', outline: 'none', color: '#0f172a', background: '#fafafa', marginBottom: '20px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '360px', direction: 'rtl', fontFamily: FONT }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{cat ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}</span>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94a3b8', padding: '4px', lineHeight: 1 }} onClick={onClose}>✕</button>
        </div>
        <Lbl>שם הקטגוריה</Lbl>
        <input style={inp} value={name} onChange={e => setName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && save()} />
        {cat && !confirm && (
          <button style={{ width: '100%', padding: '9px', border: '1px solid #fecaca', borderRadius: '8px', background: 'white', cursor: 'pointer', fontFamily: FONT, fontSize: '13px', color: '#dc2626', marginBottom: '16px' }} onClick={() => setConfirm(true)}>מחק קטגוריה</button>
        )}
        {confirm && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#374151', marginBottom: '10px', fontFamily: FONT }}>למחוק את הקטגוריה &quot;{cat.name}&quot;? המתכונים לא יימחקו.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontFamily: FONT, fontSize: '13px', color: '#374151' }} onClick={() => setConfirm(false)}>ביטול</button>
              <button style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: '#dc2626', color: 'white', cursor: 'pointer', fontFamily: FONT, fontSize: '13px', fontWeight: 700 }} onClick={del} disabled={saving}>מחק</button>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button style={{ padding: '9px 18px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontFamily: FONT, fontSize: '14px', color: '#374151' }} onClick={onClose}>ביטול</button>
          <button style={{ padding: '9px 20px', border: 'none', borderRadius: '8px', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: 'white', cursor: 'pointer', fontFamily: FONT, fontSize: '14px', fontWeight: 700 }} onClick={save} disabled={saving}>{saving ? 'שומר...' : cat ? 'שמור' : 'הוסף'}</button>
        </div>
      </div>
    </div>
  )
}

function Lbl({ children, hint }) {
  return (
    <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px', fontFamily: FONT }}>
      {children}
      {hint && <span style={{ fontWeight: 400, color: '#94a3b8' }}> ({hint})</span>}
    </div>
  )
}
