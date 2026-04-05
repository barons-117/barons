import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const isAdmin = (s) => ['erez@barons.co.il', 'user@barons.co.il'].includes(s?.user?.email)
export const FONT = "'Open Sans Hebrew', 'Open Sans', Arial, sans-serif"
const NOTE_KEY = 'barons_recipes_note'

async function fetchData() {
  const [catRes, recipeRes, linksRes] = await Promise.all([
    supabase.from('recipe_categories').select('*').order('sort_order'),
    supabase.from('recipes').select('id, title, author, is_favorite, image_url').order('title'),
    supabase.from('recipe_category_links').select('recipe_id, category_id'),
  ])
  return { categories: catRes.data || [], recipes: recipeRes.data || [], links: linksRes.data || [] }
}

// ─── Sticky Note Modal ────────────────────────────────────
export function StickyNoteModal({ onClose }) {
  const [text, setText] = useState(() => localStorage.getItem(NOTE_KEY) || '')
  const [saved, setSaved] = useState(true)
  const timerRef = useRef(null)
  function handleChange(val) {
    setText(val); setSaved(false)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { localStorage.setItem(NOTE_KEY, val); setSaved(true) }, 600)
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:'16px' }} onClick={onClose}>
      <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'14px', padding:'20px', width:'100%', maxWidth:'480px', direction:'rtl', fontFamily:FONT, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
          <span style={{ fontSize:'14px', fontWeight:700, color:'#92400e' }}>פתקית</span>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            {!saved && <span style={{ fontSize:'11px', color:'#d97706' }}>שומר...</span>}
            {saved && text && <span style={{ fontSize:'11px', color:'#92400e', opacity:0.55 }}>נשמר</span>}
            <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:'18px', color:'#b45309', lineHeight:1 }} onClick={onClose}>✕</button>
          </div>
        </div>
        <textarea autoFocus value={text} onChange={e=>handleChange(e.target.value)} placeholder="כתוב כאן... (נשמר אוטומטית)"
          style={{ width:'100%', minHeight:'200px', border:'1px solid #fcd34d', borderRadius:'8px', background:'rgba(255,255,255,0.6)', padding:'12px', fontSize:'14px', color:'#78350f', lineHeight:1.7, fontFamily:FONT, outline:'none', direction:'rtl', resize:'vertical' }}/>
        <div style={{ marginTop:'10px', textAlign:'left' }}>
          <button style={{ background:'#92400e', color:'white', border:'none', borderRadius:'8px', padding:'8px 18px', cursor:'pointer', fontFamily:FONT, fontSize:'13px', fontWeight:600 }} onClick={onClose}>סגור</button>
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar Content ──────────────────────────────────────
export function SidebarContent({ cats, countFor, selectedCat, search, setSearch, selectCat, admin, setEditCat, setSidebarOpen, onOpenNote }) {
  const notePreview = localStorage.getItem(NOTE_KEY)
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }} onClick={e=>e.stopPropagation()}>
      <div style={{ padding:'16px 12px 12px', borderBottom:'1px solid rgba(255,255,255,0.1)', marginBottom:'12px' }}>
        <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.9)', letterSpacing:'0.5px' }}>קטגוריות</div>
      </div>
      <div style={{ position:'relative', margin:'0 10px 12px' }}>
        <svg style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', width:'13px', height:'13px', color:'rgba(255,255,255,0.4)', pointerEvents:'none' }} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
        </svg>
        <input style={{ width:'100%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'8px', padding:'8px 30px 8px 28px', color:'white', fontSize:'13px', fontFamily:FONT, outline:'none', direction:'rtl' }}
          placeholder="חיפוש..." value={search||''} onChange={e=>{ if(setSearch) setSearch(e.target.value) }}/>
        {search && <button style={{ position:'absolute', left:'8px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(255,255,255,0.45)', cursor:'pointer', fontSize:'12px', padding:'2px' }} onClick={()=>setSearch&&setSearch('')}>✕</button>}
      </div>
      <nav style={{ padding:'0 8px', flex:1, overflowY:'auto' }}>
        <SideItem label="כל המתכונים" count={countFor('all')} active={selectedCat==='all'&&!search} onClick={()=>selectCat&&selectCat('all')}/>
        <SideItem label="מועדפים" count={countFor('fav')} active={selectedCat==='fav'&&!search} onClick={()=>selectCat&&selectCat('fav')}/>
        <div style={{ height:'1px', background:'rgba(255,255,255,0.1)', margin:'8px 4px' }}/>
        {cats.map(cat=>(
          <SideItem key={cat.id} label={cat.name} count={countFor(cat.id)} active={selectedCat===cat.id&&!search}
            onClick={()=>selectCat&&selectCat(cat.id)}
            onEdit={admin?()=>{ if(setEditCat)setEditCat(cat); if(setSidebarOpen)setSidebarOpen(false) }:null}/>
        ))}
      </nav>
      <button style={{ margin:'12px 10px 6px', background:'rgba(253,230,138,0.15)', border:'1px solid rgba(253,230,138,0.3)', borderRadius:'8px', color:'rgba(253,230,138,0.85)', fontSize:'12px', padding:'8px 12px', cursor:'pointer', fontFamily:FONT, textAlign:'right', display:'flex', alignItems:'center', gap:'6px' }} onClick={onOpenNote}>
        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'right' }}>
          {notePreview ? notePreview.split('\n')[0].slice(0,28)+(notePreview.length>28?'...':'') : 'פתקית'}
        </span>
        <span>📝</span>
      </button>
      {admin && setEditCat && (
        <button style={{ margin:'0 10px', background:'none', border:'1px dashed rgba(255,255,255,0.2)', borderRadius:'8px', color:'rgba(255,255,255,0.45)', fontSize:'12px', padding:'9px 12px', cursor:'pointer', fontFamily:FONT, textAlign:'right' }}
          onClick={()=>{ if(setEditCat)setEditCat('new'); if(setSidebarOpen)setSidebarOpen(false) }}>
          + קטגוריה חדשה
        </button>
      )}
    </div>
  )
}

// ─── Magazine Card ────────────────────────────────────────
// Layout: first card is featured (wide), rest are 3-col grid
function RecipeCard({ recipe, recipeCats, featured, onOpen, onFav, onEdit, onDelete, admin }) {
  const [hov, setHov] = useState(false)
  const hasImage = !!recipe.image_url

  if (featured) {
    return (
      <div
        style={{ position:'relative', borderRadius:'16px', overflow:'hidden', cursor:'pointer', background: hasImage ? '#0f172a' : '#1e293b', minHeight:'280px', display:'flex', flexDirection:'column', justifyContent:'flex-end', transition:'transform 0.2s, box-shadow 0.2s', transform:hov?'translateY(-2px)':'none', boxShadow:hov?'0 20px 48px rgba(0,0,0,0.18)':'0 4px 16px rgba(0,0,0,0.08)' }}
        onClick={onOpen} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      >
        {hasImage
          ? <img src={recipe.image_url} alt={recipe.title} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s', transform:hov?'scale(1.04)':'scale(1)' }} onError={e=>{e.target.style.display='none'}}/>
          : <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#1e3a5f,#0f2044)' }}/>
        }
        {/* gradient overlay */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)' }}/>
        {/* content */}
        <div style={{ position:'relative', padding:'24px 24px 20px' }}>
          {recipeCats.length > 0 && (
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'8px' }}>
              {recipeCats.map(c=><span key={c.id} style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.9)', background:'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)', borderRadius:'4px', padding:'2px 8px', letterSpacing:'0.5px', textTransform:'uppercase' }}>{c.name}</span>)}
            </div>
          )}
          <h2 style={{ fontSize:'22px', fontWeight:800, color:'white', margin:'0 0 6px', lineHeight:1.2, fontFamily:FONT }}>{recipe.title}</h2>
          {recipe.author && <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.65)', margin:0 }}>מתכון של {recipe.author}</p>}
        </div>
        {/* actions */}
        <div style={{ position:'absolute', top:'14px', left:'14px', display:'flex', gap:'6px' }} onClick={e=>e.stopPropagation()}>
          {hov && admin && onEdit && <button style={{ background:'rgba(255,255,255,0.9)', border:'none', borderRadius:'6px', padding:'4px 10px', fontSize:'11px', cursor:'pointer', fontFamily:FONT, color:'#1d4ed8', fontWeight:600 }} onClick={onEdit}>עריכה</button>}
          {hov && admin && onDelete && <button style={{ background:'rgba(220,38,38,0.85)', border:'none', borderRadius:'6px', padding:'4px 10px', fontSize:'11px', cursor:'pointer', fontFamily:FONT, color:'white', fontWeight:600 }} onClick={onDelete}>מחק</button>}
        </div>
        <button style={{ position:'absolute', top:'14px', right:'14px', background:'rgba(0,0,0,0.35)', backdropFilter:'blur(4px)', border:'none', cursor:'pointer', padding:'6px', display:'flex', alignItems:'center', borderRadius:'50%' }} onClick={e=>{e.stopPropagation();onFav(e)}}>
          {recipe.is_favorite
            ? <svg width="16" height="16" viewBox="0 0 20 20" fill="#fbbf24"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            : <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
          }
        </button>
      </div>
    )
  }

  // Regular card
  return (
    <div
      style={{ position:'relative', borderRadius:'14px', overflow:'hidden', cursor:'pointer', background:'white', display:'flex', flexDirection:'column', transition:'transform 0.2s, box-shadow 0.2s', transform:hov?'translateY(-3px)':'none', boxShadow:hov?'0 16px 36px rgba(0,0,0,0.12)':'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #e2e8f0' }}
      onClick={onOpen} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    >
      {/* Image area */}
      <div style={{ height:'160px', background: hasImage ? '#0f172a' : 'linear-gradient(135deg,#e0e7ff,#dbeafe)', overflow:'hidden', flexShrink:0, position:'relative' }}>
        {hasImage
          ? <img src={recipe.image_url} alt={recipe.title} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.35s', transform:hov?'scale(1.06)':'scale(1)' }} onError={e=>{e.target.style.display='none'}}/>
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:'40px', opacity:0.3 }}>🍽</span>
            </div>
        }
        {/* fav button */}
        <button style={{ position:'absolute', top:'10px', right:'10px', background:'rgba(255,255,255,0.85)', backdropFilter:'blur(4px)', border:'none', cursor:'pointer', padding:'5px', display:'flex', alignItems:'center', borderRadius:'50%' }} onClick={e=>{e.stopPropagation();onFav(e)}}>
          {recipe.is_favorite
            ? <svg width="14" height="14" viewBox="0 0 20 20" fill="#f59e0b"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            : <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
          }
        </button>
      </div>

      {/* Text */}
      <div style={{ padding:'14px 14px 12px', flex:1, display:'flex', flexDirection:'column' }}>
        {recipeCats.length > 0 && (
          <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', marginBottom:'6px' }}>
            {recipeCats.map(c=><span key={c.id} style={{ fontSize:'10px', fontWeight:700, color:'#1d4ed8', background:'#dbeafe', borderRadius:'4px', padding:'1px 6px', textTransform:'uppercase', letterSpacing:'0.3px' }}>{c.name}</span>)}
          </div>
        )}
        <h3 style={{ fontSize:'15px', fontWeight:700, color:'#0f172a', margin:'0 0 4px', lineHeight:1.3, fontFamily:FONT }}>{recipe.title}</h3>
        {recipe.author && <p style={{ fontSize:'12px', color:'#94a3b8', margin:0, marginTop:'auto', paddingTop:'6px' }}>{recipe.author}</p>}
      </div>

      {/* Admin actions on hover */}
      {hov && admin && (
        <div style={{ position:'absolute', bottom:'10px', left:'10px', display:'flex', gap:'4px' }} onClick={e=>e.stopPropagation()}>
          {onEdit && <button style={{ background:'rgba(255,255,255,0.95)', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'3px 9px', fontSize:'10px', cursor:'pointer', fontFamily:FONT, color:'#1d4ed8', fontWeight:600 }} onClick={onEdit}>עריכה</button>}
          {onDelete && <button style={{ background:'rgba(254,242,242,0.95)', border:'1px solid #fecaca', borderRadius:'6px', padding:'3px 9px', fontSize:'10px', cursor:'pointer', fontFamily:FONT, color:'#dc2626', fontWeight:600 }} onClick={onDelete}>מחק</button>}
        </div>
      )}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────
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
  const [noteOpen, setNoteOpen] = useState(false)
  const navigate = useNavigate()
  const admin = isAdmin(session)

  useEffect(() => { load() }, [])
  useEffect(() => {
    const close = () => setSidebarOpen(false)
    if (sidebarOpen) { setTimeout(()=>document.addEventListener('click',close),10); return ()=>document.removeEventListener('click',close) }
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
    if (q) return r.title.toLowerCase().includes(q) || (r.author||'').toLowerCase().includes(q)
    if (selectedCat === 'all') return true
    if (selectedCat === 'fav') return r.is_favorite
    return (rcMap[r.id]||[]).includes(selectedCat)
  })

  const countFor = id => {
    if (id === 'all') return recipes.length
    if (id === 'fav') return recipes.filter(r=>r.is_favorite).length
    return links.filter(l=>l.category_id===id).length
  }

  async function toggleFav(e, recipe) {
    e.stopPropagation()
    await supabase.from('recipes').update({ is_favorite: !recipe.is_favorite }).eq('id', recipe.id)
    setRecipes(prev=>prev.map(r=>r.id===recipe.id?{...r,is_favorite:!r.is_favorite}:r))
  }

  async function deleteRecipe(e, id) {
    e.stopPropagation()
    if (!window.confirm('למחוק את המתכון?')) return
    await supabase.from('recipes').delete().eq('id', id)
    setRecipes(p=>p.filter(r=>r.id!==id)); setLinks(p=>p.filter(l=>l.recipe_id!==id))
  }

  function selectCat(id) { setSelectedCat(id); setSearch(''); setSidebarOpen(false) }

  const heading = search ? `תוצאות עבור "${search}"` : selectedCat==='all' ? 'כל המתכונים' : selectedCat==='fav' ? 'מועדפים' : cats.find(c=>c.id===selectedCat)?.name||''

  // Magazine: first item is featured (if it has an image, use it first)
  const sorted = [...visible].sort((a,b) => (b.image_url?1:0) - (a.image_url?1:0))
  const [featured, ...rest] = sorted

  const sidebarProps = { cats, countFor, selectedCat, search, setSearch, selectCat, admin, setEditCat, setSidebarOpen, onOpenNote:()=>setNoteOpen(true) }

  const cardProps = (recipe) => ({
    recipe,
    recipeCats: (rcMap[recipe.id]||[]).map(cid=>cats.find(c=>c.id===cid)).filter(Boolean),
    onOpen: () => navigate(`/recipes/${recipe.id}`),
    onFav: e => toggleFav(e, recipe),
    onEdit: admin ? e => { e.stopPropagation(); setEditId(recipe.id) } : null,
    onDelete: admin ? e => deleteRecipe(e, recipe.id) : null,
    admin,
  })

  return (
    <>
      <style>{`
        *{box-sizing:border-box} body{margin:0}
        .recipes-sidebar{display:flex}
        @media(max-width:768px){.recipes-sidebar{display:none}.recipe-grid{grid-template-columns:1fr!important}.recipe-grid-rest{grid-template-columns:1fr 1fr!important}}
        @media(max-width:500px){.recipe-grid-rest{grid-template-columns:1fr!important}}
        @media(min-width:769px){.hamburger-btn{display:none!important}.mobile-overlay{display:none!important}.mobile-drawer{display:none!important}}
        input::placeholder{color:rgba(255,255,255,0.3)}
      `}</style>

      <div style={{ minHeight:'100vh', background:'#f0f4ff', fontFamily:FONT, direction:'rtl', color:'#1e293b' }}>

        {/* Header */}
        <header style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'0 16px', height:'52px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:200 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <button className="hamburger-btn" style={{ background:'none', border:'none', cursor:'pointer', padding:'6px', display:'flex', flexDirection:'column', gap:'5px', marginLeft:'4px' }} onClick={e=>{e.stopPropagation();setSidebarOpen(o=>!o)}}>
              <span style={{ display:'block', width:'20px', height:'2px', background:'#334155', borderRadius:'2px', transition:'transform 0.2s', transform:sidebarOpen?'rotate(45deg) translate(5px,5px)':'none' }}/>
              <span style={{ display:'block', width:'20px', height:'2px', background:'#334155', borderRadius:'2px', opacity:sidebarOpen?0:1, transition:'opacity 0.2s' }}/>
              <span style={{ display:'block', width:'20px', height:'2px', background:'#334155', borderRadius:'2px', transition:'transform 0.2s', transform:sidebarOpen?'rotate(-45deg) translate(5px,-5px)':'none' }}/>
            </button>
            <nav style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <button style={{ background:'none', border:'none', color:'#1d4ed8', cursor:'pointer', fontSize:'14px', fontFamily:FONT, padding:0, fontWeight:700 }} onClick={()=>navigate('/')}>BARONS</button>
              <span style={{ color:'#cbd5e1', fontSize:'14px' }}>/</span>
              <span style={{ fontSize:'14px', color:'#1e293b', fontWeight:600 }}>מתכונים</span>
            </nav>
          </div>
          {admin && <button style={{ background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'white', border:'none', borderRadius:'8px', padding:'7px 14px', cursor:'pointer', fontFamily:FONT, fontWeight:700, fontSize:'13px', boxShadow:'0 2px 8px rgba(59,130,246,0.35)' }} onClick={()=>setAddOpen(true)}>+ מתכון חדש</button>}
        </header>

        {/* Mobile drawer */}
        {sidebarOpen && <div className="mobile-overlay" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:300 }} onClick={()=>setSidebarOpen(false)}/>}
        <div className="mobile-drawer" style={{ position:'fixed', top:'52px', right:sidebarOpen?0:'-260px', width:'260px', bottom:0, background:'#0b1a3e', zIndex:400, transition:'right 0.25s cubic-bezier(.4,0,.2,1)', overflowY:'auto', padding:'8px 0 20px' }}>
          {sidebarOpen && <SidebarContent {...sidebarProps}/>}
        </div>

        {/* Body */}
        <div style={{ display:'flex', minHeight:'calc(100vh - 52px)' }}>
          <aside className="recipes-sidebar" style={{ width:'240px', flexShrink:0, background:'#0b1a3e', flexDirection:'column', position:'sticky', top:'52px', height:'calc(100vh - 52px)', overflowY:'auto', padding:'8px 0 20px' }}>
            <SidebarContent {...sidebarProps}/>
          </aside>

          <main style={{ flex:1, padding:'28px 24px', minWidth:0 }}>
            {/* Header row */}
            <div style={{ marginBottom:'24px' }}>
              <h1 style={{ fontSize:'22px', fontWeight:800, color:'#0f172a', margin:'0 0 4px', letterSpacing:'-0.3px' }}>{heading}</h1>
              <p style={{ fontSize:'13px', color:'#94a3b8', margin:0 }}>{visible.length} מתכונים</p>
            </div>

            {loading ? (
              <div style={{ textAlign:'center', color:'#94a3b8', padding:'80px 0' }}>טוען...</div>
            ) : visible.length === 0 ? (
              <div style={{ textAlign:'center', color:'#94a3b8', padding:'80px 0', fontSize:'15px' }}>
                {search ? `לא נמצאו תוצאות עבור "${search}"` : 'אין מתכונים בקטגוריה זו'}
              </div>
            ) : (
              <>
                {/* Featured + first 2 in a row */}
                {featured && (
                  <div className="recipe-grid" style={{ display:'grid', gridTemplateColumns: rest.length >= 1 ? '1.6fr 1fr' : '1fr', gap:'16px', marginBottom:'16px', alignItems:'stretch' }}>
                    <RecipeCard {...cardProps(featured)} featured/>
                    {rest.length >= 1 && (
                      <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                        {rest.slice(0,2).map(r => <RecipeCard key={r.id} {...cardProps(r)}/>)}
                      </div>
                    )}
                  </div>
                )}

                {/* Rest in 3-col grid */}
                {rest.length > 2 && (
                  <div className="recipe-grid-rest" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px' }}>
                    {rest.slice(2).map(r => <RecipeCard key={r.id} {...cardProps(r)}/>)}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {noteOpen && <StickyNoteModal onClose={()=>setNoteOpen(false)}/>}
      {(addOpen||editId) && <RecipeModal recipeId={editId} categories={cats} onClose={()=>{setAddOpen(false);setEditId(null)}} onSave={()=>{load();setAddOpen(false);setEditId(null)}}/>}
      {editCat && <CatModal cat={editCat==='new'?null:editCat} onClose={()=>setEditCat(null)} onSave={()=>{load();setEditCat(null)}} onDelete={()=>{load();setEditCat(null)}}/>}
    </>
  )
}

// ─── Sidebar Item ─────────────────────────────────────────
export function SideItem({ label, count, active, onClick, onEdit }) {
  const [hov, setHov] = useState(false)
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', borderRadius:'8px', cursor:'pointer', marginBottom:'1px', background:active?'#1d4ed8':hov?'rgba(255,255,255,0.09)':'transparent' }}
      onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <span style={{ fontSize:'13px', color:active?'white':'rgba(255,255,255,0.78)', fontWeight:active?700:500 }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
        <span style={{ fontSize:'11px', fontWeight:700, color:active?'rgba(255,255,255,0.85)':'rgba(255,255,255,0.4)', background:active?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.08)', borderRadius:'10px', padding:'1px 7px' }}>{count}</span>
        {onEdit && (hov||active) && <button style={{ fontSize:'10px', color:'rgba(255,255,255,0.6)', background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'4px', padding:'2px 8px', cursor:'pointer', fontFamily:FONT }} onClick={e=>{e.stopPropagation();onEdit()}}>עריכה</button>}
      </div>
    </div>
  )
}

// ─── Image Upload Field ───────────────────────────────────
function ImageField({ imageUrl, onImageUrl }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState(imageUrl||'')
  const fileRef = useRef()

  async function uploadFile(file) {
    if (!file||!file.type.startsWith('image/')) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `recipes/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('recipe-images').upload(path, file, { upsert:true })
    if (!error) {
      const { data } = supabase.storage.from('recipe-images').getPublicUrl(path)
      onImageUrl(data.publicUrl); setUrlInput(data.publicUrl)
    }
    setUploading(false)
  }
  function handleDrop(e) { e.preventDefault(); setDragging(false); const f=e.dataTransfer.files[0]; if(f)uploadFile(f) }
  function handleUrlChange(val) { setUrlInput(val); onImageUrl(val) }
  const preview = urlInput||imageUrl
  return (
    <div style={{ marginBottom:'14px' }}>
      <Lbl>תמונה</Lbl>
      <div style={{ border:`2px dashed ${dragging?'#1d4ed8':'#e2e8f0'}`, borderRadius:'10px', padding:'16px', textAlign:'center', cursor:'pointer', background:dragging?'#eff6ff':'#fafafa', transition:'all 0.15s', marginBottom:'10px', position:'relative' }}
        onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={handleDrop} onClick={()=>fileRef.current?.click()}>
        {preview ? (
          <div style={{ position:'relative', display:'inline-block' }}>
            <img src={preview} alt="preview" style={{ height:'90px', maxWidth:'100%', borderRadius:'8px', objectFit:'cover' }}/>
            <button style={{ position:'absolute', top:'-8px', left:'-8px', width:'22px', height:'22px', borderRadius:'50%', background:'#dc2626', color:'white', border:'none', cursor:'pointer', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}
              onClick={e=>{e.stopPropagation();onImageUrl('');setUrlInput('')}}>✕</button>
          </div>
        ) : (
          <div style={{ color:'#94a3b8', fontSize:'13px' }}>
            {uploading?'מעלה...':<><div style={{ fontSize:'24px', marginBottom:'4px' }}>📷</div>גרור תמונה לכאן, או לחץ לבחירה</>}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>uploadFile(e.target.files[0])}/>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ fontSize:'12px', color:'#94a3b8', flexShrink:0 }}>או URL:</span>
        <input style={{ flex:1, padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', fontFamily:FONT, direction:'ltr', outline:'none', color:'#0f172a', background:'#fafafa' }}
          placeholder="https://..." value={urlInput} onChange={e=>handleUrlChange(e.target.value)}/>
      </div>
    </div>
  )
}

// ─── Recipe Modal ─────────────────────────────────────────
function RecipeModal({ recipeId, categories, onClose, onSave }) {
  const isEdit = !!recipeId
  const [form, setForm] = useState({ title:'', author:'', ingredients:'', instructions:'', notes:'', is_favorite:false, image_url:'' })
  const [selCats, setSelCats] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(()=>{
    if(isEdit){
      supabase.from('recipes').select('*').eq('id',recipeId).single().then(({data})=>{
        if(data)setForm({title:data.title||'',author:data.author||'',ingredients:data.ingredients||'',instructions:data.instructions||'',notes:data.notes||'',is_favorite:!!data.is_favorite,image_url:data.image_url||''})
      })
      supabase.from('recipe_category_links').select('category_id').eq('recipe_id',recipeId).then(({data})=>{
        setSelCats((data||[]).map(l=>l.category_id))
      })
    } else { if(categories.length)setSelCats([categories[0].id]) }
  },[recipeId])

  const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  const toggleCat=id=>setSelCats(p=>p.includes(id)?p.filter(c=>c!==id):[...p,id])

  async function save(){
    if(!form.title.trim())return setError('שם המתכון הוא שדה חובה')
    if(!form.ingredients.trim())return setError('מרכיבים הם שדה חובה')
    if(!form.instructions.trim())return setError('אופן הכנה הוא שדה חובה')
    setSaving(true);setError('')
    const payload={...form,notes:form.notes||null,image_url:form.image_url||null}
    let rid=recipeId
    if(isEdit){await supabase.from('recipes').update(payload).eq('id',rid)}
    else{const{data}=await supabase.from('recipes').insert(payload).select('id').single();rid=data.id}
    await supabase.from('recipe_category_links').delete().eq('recipe_id',rid)
    if(selCats.length)await supabase.from('recipe_category_links').insert(selCats.map(cid=>({recipe_id:rid,category_id:cid})))
    setSaving(false);onSave()
  }

  const inp={width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',fontFamily:FONT,direction:'rtl',outline:'none',marginBottom:'14px',color:'#0f172a',resize:'vertical',display:'block',background:'#fafafa'}

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'16px'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'16px',padding:'28px',width:'100%',maxWidth:'580px',maxHeight:'92vh',overflowY:'auto',direction:'rtl',fontFamily:FONT}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
          <span style={{fontSize:'18px',fontWeight:700,color:'#0f172a'}}>{isEdit?'עריכת מתכון':'מתכון חדש'}</span>
          <button style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#94a3b8',padding:'4px',lineHeight:1}} onClick={onClose}>✕</button>
        </div>
        <ImageField imageUrl={form.image_url} onImageUrl={v=>set('image_url',v)}/>
        <Lbl>שם המתכון *</Lbl>
        <input style={inp} value={form.title} onChange={e=>set('title',e.target.value)} placeholder="שם המתכון" autoFocus/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
          <div><Lbl>ממי המתכון</Lbl><input style={inp} value={form.author} onChange={e=>set('author',e.target.value)} placeholder="שם הכותב"/></div>
          <div><Lbl>מועדף</Lbl><label style={{display:'flex',alignItems:'center',gap:'8px',height:'40px',cursor:'pointer',fontSize:'14px',color:'#374151',fontFamily:FONT}}><input type="checkbox" checked={form.is_favorite} onChange={e=>set('is_favorite',e.target.checked)} style={{width:'16px',height:'16px',accentColor:'#1d4ed8'}}/>סמן כמועדף</label></div>
        </div>
        <Lbl>קטגוריות</Lbl>
        <div style={{display:'flex',flexWrap:'wrap',gap:'7px',marginBottom:'14px'}}>
          {categories.map(c=><button key={c.id} style={{padding:'5px 14px',border:'1px solid '+(selCats.includes(c.id)?'#1d4ed8':'#e2e8f0'),borderRadius:'20px',background:selCats.includes(c.id)?'#1d4ed8':'white',cursor:'pointer',fontSize:'13px',fontFamily:FONT,color:selCats.includes(c.id)?'white':'#374151'}} onClick={()=>toggleCat(c.id)}>{c.name}</button>)}
        </div>
        <Lbl hint="שורה לכל מרכיב">מרכיבים *</Lbl>
        <textarea style={{...inp,height:'120px'}} value={form.ingredients} onChange={e=>set('ingredients',e.target.value)} placeholder={'500 גרם קמח\n2 ביצים\n...'}/>
        <Lbl hint="שורה לכל שלב — ללא מספור">אופן הכנה *</Lbl>
        <textarea style={{...inp,height:'150px'}} value={form.instructions} onChange={e=>set('instructions',e.target.value)} placeholder={'מחממים תנור ל-180 מעלות.\nמערבבים...\n...'}/>
        <Lbl hint="אופציונלי">הערות</Lbl>
        <textarea style={{...inp,height:'65px'}} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="טיפים, וריאנטים..."/>
        {error&&<div style={{background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',padding:'10px 14px',borderRadius:'8px',fontSize:'13px',marginBottom:'12px'}}>{error}</div>}
        <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'8px'}}>
          <button style={{padding:'9px 18px',border:'1px solid #e2e8f0',borderRadius:'8px',background:'white',cursor:'pointer',fontFamily:FONT,fontSize:'14px',color:'#374151'}} onClick={onClose}>ביטול</button>
          <button style={{padding:'9px 20px',border:'none',borderRadius:'8px',background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',color:'white',cursor:'pointer',fontFamily:FONT,fontSize:'14px',fontWeight:700}} onClick={save} disabled={saving}>{saving?'שומר...':isEdit?'שמור שינויים':'הוסף מתכון'}</button>
        </div>
      </div>
    </div>
  )
}

function CatModal({ cat, onClose, onSave, onDelete }) {
  const [name, setName] = useState(cat?.name||'')
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function save(){
    if(!name.trim())return;setSaving(true)
    if(cat){await supabase.from('recipe_categories').update({name:name.trim()}).eq('id',cat.id)}
    else{const{data}=await supabase.from('recipe_categories').select('sort_order').order('sort_order',{ascending:false}).limit(1);await supabase.from('recipe_categories').insert({name:name.trim(),sort_order:(data?.[0]?.sort_order||0)+1})}
    setSaving(false);onSave()
  }
  async function del(){
    setSaving(true)
    await supabase.from('recipe_category_links').delete().eq('category_id',cat.id)
    await supabase.from('recipe_categories').delete().eq('id',cat.id)
    setSaving(false);onDelete()
  }
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'16px'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'16px',padding:'28px',width:'100%',maxWidth:'360px',direction:'rtl',fontFamily:FONT}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
          <span style={{fontSize:'18px',fontWeight:700,color:'#0f172a'}}>{cat?'עריכת קטגוריה':'קטגוריה חדשה'}</span>
          <button style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#94a3b8',padding:'4px',lineHeight:1}} onClick={onClose}>✕</button>
        </div>
        <Lbl>שם הקטגוריה</Lbl>
        <input style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',fontFamily:FONT,direction:'rtl',outline:'none',color:'#0f172a',background:'#fafafa',marginBottom:'20px'}} value={name} onChange={e=>setName(e.target.value)} autoFocus onKeyDown={e=>e.key==='Enter'&&save()}/>
        {cat&&!confirm&&<button style={{width:'100%',padding:'9px',border:'1px solid #fecaca',borderRadius:'8px',background:'white',cursor:'pointer',fontFamily:FONT,fontSize:'13px',color:'#dc2626',marginBottom:'16px'}} onClick={()=>setConfirm(true)}>מחק קטגוריה</button>}
        {confirm&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',padding:'14px',marginBottom:'16px'}}><p style={{fontSize:'13px',color:'#374151',marginBottom:'10px',fontFamily:FONT}}>למחוק את הקטגוריה &quot;{cat.name}&quot;?</p><div style={{display:'flex',gap:'8px'}}><button style={{padding:'8px 16px',border:'1px solid #e2e8f0',borderRadius:'8px',background:'white',cursor:'pointer',fontFamily:FONT,fontSize:'13px',color:'#374151'}} onClick={()=>setConfirm(false)}>ביטול</button><button style={{padding:'8px 16px',border:'none',borderRadius:'8px',background:'#dc2626',color:'white',cursor:'pointer',fontFamily:FONT,fontSize:'13px',fontWeight:700}} onClick={del} disabled={saving}>מחק</button></div></div>}
        <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
          <button style={{padding:'9px 18px',border:'1px solid #e2e8f0',borderRadius:'8px',background:'white',cursor:'pointer',fontFamily:FONT,fontSize:'14px',color:'#374151'}} onClick={onClose}>ביטול</button>
          <button style={{padding:'9px 20px',border:'none',borderRadius:'8px',background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',color:'white',cursor:'pointer',fontFamily:FONT,fontSize:'14px',fontWeight:700}} onClick={save} disabled={saving}>{saving?'שומר...':cat?'שמור':'הוסף'}</button>
        </div>
      </div>
    </div>
  )
}

export function Lbl({ children, hint }) {
  return <div style={{fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'5px',fontFamily:FONT}}>{children}{hint&&<span style={{fontWeight:400,color:'#94a3b8'}}> ({hint})</span>}</div>
}
