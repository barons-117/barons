import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const isAdmin = (s) => s?.user?.email === 'erez@barons.co.il'
const FONT = "'Open Sans Hebrew', 'Open Sans', Arial, sans-serif"

export default function RecipeDetail({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [recipeCats, setRecipeCats] = useState([])
  const [allCats, setAllCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const admin = isAdmin(session)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [rRes, catRes, linkRes] = await Promise.all([
      supabase.from('recipes').select('*').eq('id', id).single(),
      supabase.from('recipe_categories').select('*').order('sort_order'),
      supabase.from('recipe_category_links').select('category_id').eq('recipe_id', id),
    ])
    setRecipe(rRes.data)
    setAllCats(catRes.data || [])
    const catIds = (linkRes.data || []).map(l => l.category_id)
    setRecipeCats((catRes.data || []).filter(c => catIds.includes(c.id)))
    setLoading(false)
  }

  async function toggleFav() {
    await supabase.from('recipes').update({ is_favorite: !recipe.is_favorite }).eq('id', id)
    setRecipe(p => ({ ...p, is_favorite: !p.is_favorite }))
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: FONT, color: '#64748b' }}>טוען...</div>
  if (!recipe) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: FONT, color: '#94a3b8' }}>מתכון לא נמצא</div>

  const ingredients = (recipe.ingredients || '').split('\n').filter(Boolean)
  const instructions = (recipe.instructions || '').split('\n').filter(Boolean)

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }

        /* Responsive columns */
        .recipe-cols {
          display: grid;
          grid-template-columns: 1fr 1.8fr;
          gap: 40px;
        }
        @media (max-width: 640px) {
          .recipe-cols {
            grid-template-columns: 1fr;
            gap: 28px;
          }
          .recipe-card {
            padding: 20px 16px !important;
          }
          .recipe-title {
            font-size: 22px !important;
          }
          .recipe-header-actions {
            flex-wrap: wrap;
            gap: 6px !important;
          }
          .recipe-header-actions button {
            font-size: 12px !important;
            padding: 5px 10px !important;
          }
        }

        /* Print */
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .recipe-card { box-shadow: none !important; border: none !important; border-radius: 0 !important; padding: 20px !important; }
          .recipe-cols { grid-template-columns: 1fr 1.8fr !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f0f4ff', fontFamily: FONT, direction: 'rtl' }}>

        {/* ── HEADER — matches all BARONS sub-pages ── */}
        <header className="no-print" style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 16px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, gap: '12px' }}>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
            <button style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: '14px', fontFamily: FONT, padding: 0, fontWeight: 700, flexShrink: 0 }} onClick={() => navigate('/')}>BARONS</button>
            <span style={{ color: '#cbd5e1', fontSize: '14px', flexShrink: 0 }}>/</span>
            <button style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: '14px', fontFamily: FONT, padding: 0, fontWeight: 700, flexShrink: 0 }} onClick={() => navigate('/recipes')}>מתכונים</button>
            <span style={{ color: '#cbd5e1', fontSize: '14px', flexShrink: 0 }}>/</span>
            <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipe.title}</span>
          </nav>

          <div className="recipe-header-actions" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              style={{ background: recipe.is_favorite ? '#fffbeb' : 'white', border: `1px solid ${recipe.is_favorite ? '#fde68a' : '#e2e8f0'}`, color: recipe.is_favorite ? '#92400e' : '#374151', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontFamily: FONT, fontSize: '13px', fontWeight: 500 }}
              onClick={toggleFav}
            >
              {recipe.is_favorite ? 'מועדף' : 'מועדפים'}
            </button>
            <button style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontFamily: FONT, fontSize: '13px', color: '#374151', fontWeight: 500 }} onClick={() => window.print()}>הדפסה</button>
            {admin && (
              <button style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontFamily: FONT, fontSize: '13px', color: '#1d4ed8', fontWeight: 500 }} onClick={() => setEditing(true)}>עריכה</button>
            )}
            <button style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontFamily: FONT, fontSize: '13px', color: '#374151', fontWeight: 500 }} onClick={() => navigate('/recipes')}>חזרה</button>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <main style={{ padding: '20px 16px', maxWidth: '960px', margin: '0 auto' }}>
          <div className="recipe-card" style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '32px 36px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>

            {/* Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <h1 className="recipe-title" style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', lineHeight: 1.2, fontFamily: FONT }}>
                  {recipe.title}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {recipe.author && <span style={{ fontSize: '13px', color: '#64748b' }}>מתכון של {recipe.author}</span>}
                  {recipe.author && recipeCats.length > 0 && <span style={{ color: '#e2e8f0' }}>·</span>}
                  {recipeCats.map(c => (
                    <span key={c.id} style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', borderRadius: '4px', padding: '2px 8px' }}>{c.name}</span>
                  ))}
                </div>
              </div>
              {recipe.is_favorite && (
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '4px 12px', flexShrink: 0 }}>מועדף</div>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '16px 0 24px' }} />

            {/* Two columns — stack on mobile */}
            <div className="recipe-cols">

              {/* Ingredients */}
              <div>
                <h2 style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 16px', paddingBottom: '8px', borderBottom: '2px solid #e0e7ff' }}>
                  מרכיבים
                </h2>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {ingredients.map((line, i) => {
                    const isSection = line.trim().endsWith(':')
                    if (isSection) return (
                      <li key={i} style={{ fontWeight: 700, color: '#334155', fontSize: '12px', paddingTop: '12px', paddingBottom: '4px', display: 'block', letterSpacing: '0.3px' }}>
                        {line}
                      </li>
                    )
                    return (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '5px 0', fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#93c5fd', flexShrink: 0, marginTop: '7px', display: 'inline-block' }} />
                        <span>{line}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {/* Instructions */}
              <div>
                <h2 style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 16px', paddingBottom: '8px', borderBottom: '2px solid #e0e7ff' }}>
                  אופן הכנה
                </h2>
                <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {instructions.map((step, i) => (
                    <li key={i} style={{ display: 'flex', gap: '14px', marginBottom: '16px', alignItems: 'flex-start' }}>
                      <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                        {i + 1}
                      </span>
                      <span style={{ fontSize: '14px', color: '#334155', lineHeight: 1.7, paddingTop: '4px' }}>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Notes */}
            {recipe.notes && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '24px 0 16px' }} />
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 16px', fontSize: '14px', color: '#78350f', lineHeight: 1.7, fontFamily: FONT }}>
                  <span style={{ fontWeight: 700 }}>הערה: </span>{recipe.notes}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {editing && (
        <EditModal
          recipe={recipe}
          allCats={allCats}
          recipeCatIds={recipeCats.map(c => c.id)}
          onClose={() => setEditing(false)}
          onSave={() => { load(); setEditing(false) }}
        />
      )}
    </>
  )
}

// ─── Edit Modal ───────────────────────────────────────────
function EditModal({ recipe, allCats, recipeCatIds, onClose, onSave }) {
  const [form, setForm] = useState({
    title: recipe.title || '', author: recipe.author || '',
    ingredients: recipe.ingredients || '', instructions: recipe.instructions || '',
    notes: recipe.notes || '', is_favorite: !!recipe.is_favorite,
  })
  const [selCats, setSelCats] = useState(recipeCatIds)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleCat = id => setSelCats(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id])

  async function save() {
    if (!form.title.trim()) return setError('שם המתכון הוא שדה חובה')
    if (!form.ingredients.trim()) return setError('מרכיבים הם שדה חובה')
    setSaving(true); setError('')
    await supabase.from('recipes').update({ ...form, notes: form.notes || null }).eq('id', recipe.id)
    await supabase.from('recipe_category_links').delete().eq('recipe_id', recipe.id)
    if (selCats.length) await supabase.from('recipe_category_links').insert(selCats.map(cid => ({ recipe_id: recipe.id, category_id: cid })))
    setSaving(false); onSave()
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontFamily: FONT, direction: 'rtl', outline: 'none', marginBottom: '14px', color: '#0f172a', resize: 'vertical', display: 'block', background: '#fafafa' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto', direction: 'rtl', fontFamily: FONT }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>עריכת מתכון</span>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94a3b8', lineHeight: 1 }} onClick={onClose}>✕</button>
        </div>

        <Lbl>שם המתכון *</Lbl>
        <input style={inp} value={form.title} onChange={e => set('title', e.target.value)} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div><Lbl>ממי המתכון</Lbl><input style={inp} value={form.author} onChange={e => set('author', e.target.value)} /></div>
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
          {allCats.map(c => (
            <button key={c.id} style={{ padding: '5px 14px', border: '1px solid ' + (selCats.includes(c.id) ? '#1d4ed8' : '#e2e8f0'), borderRadius: '20px', background: selCats.includes(c.id) ? '#1d4ed8' : 'white', cursor: 'pointer', fontSize: '13px', fontFamily: FONT, color: selCats.includes(c.id) ? 'white' : '#374151' }} onClick={() => toggleCat(c.id)}>{c.name}</button>
          ))}
        </div>

        <Lbl hint="שורה לכל מרכיב">מרכיבים *</Lbl>
        <textarea style={{ ...inp, height: '120px' }} value={form.ingredients} onChange={e => set('ingredients', e.target.value)} />

        <Lbl hint="שורה לכל שלב">אופן הכנה</Lbl>
        <textarea style={{ ...inp, height: '150px' }} value={form.instructions} onChange={e => set('instructions', e.target.value)} />

        <Lbl hint="אופציונלי">הערות</Lbl>
        <textarea style={{ ...inp, height: '65px' }} value={form.notes} onChange={e => set('notes', e.target.value)} />

        {error && <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button style={{ padding: '9px 18px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontFamily: FONT, fontSize: '14px', color: '#374151' }} onClick={onClose}>ביטול</button>
          <button style={{ padding: '9px 20px', border: 'none', borderRadius: '8px', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: 'white', cursor: 'pointer', fontFamily: FONT, fontSize: '14px', fontWeight: 700 }} onClick={save} disabled={saving}>{saving ? 'שומר...' : 'שמור שינויים'}</button>
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
