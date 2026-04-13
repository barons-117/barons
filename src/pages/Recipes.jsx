import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'
import { supabase } from '../lib/supabase'

const isAdmin = (s) => ['erez@barons.co.il', 'user@barons.co.il'].includes(s?.user?.email)
export const FONT = "'Open Sans Hebrew', 'Open Sans', Arial, sans-serif"
const NOTE_KEY = 'barons_recipes_note'

// --- SVG icon components ---
const CameraIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)
const PlateIcon = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <path d="M12 2a14.5 14.5 0 0 0 0 20"/>
    <path d="M12 2a14.5 14.5 0 0 1 0 20"/>
  </svg>
)
const NoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const EmptyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v4a1 1 0 0 0 1 1h3"/>
    <path d="M21 7v4a1 1 0 0 1-1 1h-3"/>
    <path d="M7 21h10"/>
    <path d="M12 17v4"/>
    <rect x="2" y="3" width="20" height="4" rx="1"/>
    <circle cx="12" cy="14" r="3"/>
  </svg>
)

// --- Glass style helpers ---
const GLASS = {
  card: {
    background: 'rgba(30, 41, 59, 0.55)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
  },
  sidebar: {
    background: 'rgba(11, 26, 62, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  modal: {
    background: 'rgba(15, 23, 42, 0.92)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(148, 163, 184, 0.12)',
  },
  input: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(148, 163, 184, 0.15)',
    color: '#e2e8f0',
  },
  tag: {
    background: 'rgba(99, 102, 241, 0.2)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(99, 102, 241, 0.25)',
    color: '#a5b4fc',
  },
}

const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'

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
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:'16px', animation:'rcFadeIn 0.2s ease both' }} onClick={onClose}>
      <div style={{ ...GLASS.modal, background:'rgba(45, 35, 15, 0.92)', border:'1px solid rgba(253, 230, 138, 0.2)', borderRadius:'16px', padding:'22px', width:'100%', maxWidth:'480px', direction:'rtl', fontFamily:FONT, boxShadow:'0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(253,230,138,0.08)', animation:'rcScaleIn 0.3s '+SPRING+' both' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
          <span style={{ fontSize:'14px', fontWeight:700, color:'#fcd34d' }}>פתקית</span>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            {!saved && <span style={{ fontSize:'11px', color:'#fbbf24', opacity:0.7 }}>שומר...</span>}
            {saved && text && <span style={{ fontSize:'11px', color:'#fcd34d', opacity:0.45 }}>נשמר</span>}
            <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:'18px', color:'rgba(253,230,138,0.6)', lineHeight:1, transition:'color 0.15s' }} onClick={onClose}>✕</button>
          </div>
        </div>
        <textarea autoFocus value={text} onChange={e=>handleChange(e.target.value)} placeholder="כתוב כאן... (נשמר אוטומטית)"
          style={{ width:'100%', minHeight:'200px', border:'1px solid rgba(253,230,138,0.2)', borderRadius:'10px', background:'rgba(253,230,138,0.08)', padding:'14px', fontSize:'14px', color:'#fef3c7', lineHeight:1.7, fontFamily:FONT, outline:'none', direction:'rtl', resize:'vertical', transition:'border-color 0.2s' }}
          onFocus={e=>e.target.style.borderColor='rgba(253,230,138,0.4)'}
          onBlur={e=>e.target.style.borderColor='rgba(253,230,138,0.2)'}/>
        <div style={{ marginTop:'12px', textAlign:'left' }}>
          <button style={{ background:'linear-gradient(135deg, #d97706, #b45309)', color:'white', border:'none', borderRadius:'10px', padding:'9px 20px', cursor:'pointer', fontFamily:FONT, fontSize:'13px', fontWeight:600, transition:'transform 0.15s '+SPRING, boxShadow:'0 2px 8px rgba(217,119,6,0.3)' }}
            onMouseDown={e=>e.currentTarget.style.transform='scale(0.96)'}
            onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
            onClick={onClose}>סגור</button>
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
      <div style={{ padding:'16px 12px 12px', borderBottom:'1px solid rgba(255,255,255,0.06)', marginBottom:'12px' }}>
        <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.85)', letterSpacing:'0.5px' }}>קטגוריות</div>
      </div>
      <div style={{ position:'relative', margin:'0 10px 12px' }}>
        <svg style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', width:'13px', height:'13px', color:'rgba(255,255,255,0.35)', pointerEvents:'none' }} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
        </svg>
        <input className="rc-sidebar-search" style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'9px 30px 9px 28px', color:'white', fontSize:'13px', fontFamily:FONT, outline:'none', direction:'rtl', transition:'border-color 0.25s, box-shadow 0.25s, background 0.25s' }}
          placeholder="חיפוש..." value={search||''} onChange={e=>{ if(setSearch) setSearch(e.target.value) }}
          onFocus={e=>{e.target.style.borderColor='rgba(99,102,241,0.5)';e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.1)';e.target.style.background='rgba(255,255,255,0.09)'}}
          onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.1)';e.target.style.boxShadow='none';e.target.style.background='rgba(255,255,255,0.06)'}}/>
        {search && <button style={{ position:'absolute', left:'8px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'12px', padding:'2px' }} onClick={()=>setSearch&&setSearch('')}>✕</button>}
      </div>
      <nav style={{ padding:'0 8px', flex:1, overflowY:'auto' }}>
        <SideItem label="כל המתכונים" count={countFor('all')} active={selectedCat==='all'&&!search} onClick={()=>selectCat&&selectCat('all')}/>
        <SideItem label="מועדפים" count={countFor('fav')} active={selectedCat==='fav'&&!search} onClick={()=>selectCat&&selectCat('fav')}/>
        <div style={{ height:'1px', background:'rgba(255,255,255,0.06)', margin:'8px 4px' }}/>
        {cats.map(cat=>(
          <SideItem key={cat.id} label={cat.name} count={countFor(cat.id)} active={selectedCat===cat.id&&!search}
            onClick={()=>selectCat&&selectCat(cat.id)}
            onEdit={admin?()=>{ if(setEditCat)setEditCat(cat); if(setSidebarOpen)setSidebarOpen(false) }:null}/>
        ))}
      </nav>
      <button style={{ margin:'12px 10px 6px', background:'rgba(253,230,138,0.08)', border:'1px solid rgba(253,230,138,0.15)', borderRadius:'10px', color:'rgba(253,230,138,0.8)', fontSize:'12px', padding:'9px 12px', cursor:'pointer', fontFamily:FONT, textAlign:'right', display:'flex', alignItems:'center', gap:'8px', transition:'background 0.2s, border-color 0.2s' }}
        onMouseEnter={e=>{e.currentTarget.style.background='rgba(253,230,138,0.14)';e.currentTarget.style.borderColor='rgba(253,230,138,0.25)'}}
        onMouseLeave={e=>{e.currentTarget.style.background='rgba(253,230,138,0.08)';e.currentTarget.style.borderColor='rgba(253,230,138,0.15)'}}
        onClick={onOpenNote}>
        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'right' }}>
          {notePreview ? notePreview.split('\n')[0].slice(0,28)+(notePreview.length>28?'...':'') : 'פתקית'}
        </span>
        <NoteIcon/>
      </button>
      {admin && setEditCat && (
        <button style={{ margin:'0 10px', background:'none', border:'1px dashed rgba(255,255,255,0.12)', borderRadius:'10px', color:'rgba(255,255,255,0.4)', fontSize:'12px', padding:'9px 12px', cursor:'pointer', fontFamily:FONT, textAlign:'right', transition:'border-color 0.2s, color 0.2s' }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.25)';e.currentTarget.style.color='rgba(255,255,255,0.6)'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.12)';e.currentTarget.style.color='rgba(255,255,255,0.4)'}}
          onClick={()=>{ if(setEditCat)setEditCat('new'); if(setSidebarOpen)setSidebarOpen(false) }}>
          + קטגוריה חדשה
        </button>
      )}
    </div>
  )
}

// ─── Skeleton Loader ─────────────────────────────────────
function SkeletonGrid() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px', animation:'rcFadeIn 0.4s ease both' }}>
      {[0,1,2,3,4,5].map(i => (
        <div key={i} style={{ borderRadius:'14px', overflow:'hidden', ...GLASS.card }}>
          <div style={{ height:'160px', background:'linear-gradient(110deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.03) 60%)', backgroundSize:'200% 100%', animation:'rcShimmer 1.8s ease-in-out infinite' }}/>
          <div style={{ padding:'16px' }}>
            <div style={{ height:'14px', width:'70%', background:'rgba(255,255,255,0.06)', borderRadius:'6px', marginBottom:'10px' }}/>
            <div style={{ height:'10px', width:'40%', background:'rgba(255,255,255,0.04)', borderRadius:'6px' }}/>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Magazine Card ────────────────────────────────────────
function RecipeCard({ recipe, recipeCats, featured, onOpen, onFav, onEdit, onDelete, admin }) {
  const [hov, setHov] = useState(false)
  const hasImage = !!recipe.image_url

  if (featured) {
    return (
      <div
        style={{ position:'relative', borderRadius:'18px', overflow:'hidden', cursor:'pointer', background:'#0f172a', minHeight:'280px', display:'flex', flexDirection:'column', justifyContent:'flex-end', transition:'transform 0.35s '+SPRING+', box-shadow 0.35s '+EASE_OUT, transform:hov?'translateY(-4px) scale(1.005)':'none', boxShadow:hov?'0 24px 56px rgba(0,0,0,0.35), 0 0 0 1px rgba(99,102,241,0.15)':'0 4px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(148,163,184,0.06)' }}
        onClick={onOpen} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      >
        {hasImage
          ? <img src={recipe.image_url} alt={recipe.title} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.6s '+EASE_OUT, transform:hov?'scale(1.05)':'scale(1)' }} onError={e=>{e.target.style.display='none'}}/>
          : <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}/>
        }
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.1) 100%)' }}/>
        <div style={{ position:'relative', padding:'28px 26px 22px' }}>
          {recipeCats.length > 0 && (
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'10px' }}>
              {recipeCats.map(c=><span key={c.id} style={{ fontSize:'10px', fontWeight:700, ...GLASS.tag, borderRadius:'6px', padding:'3px 10px', letterSpacing:'0.5px' }}>{c.name}</span>)}
            </div>
          )}
          <h2 style={{ fontSize:'24px', fontWeight:800, color:'white', margin:'0 0 6px', lineHeight:1.25, fontFamily:FONT, textShadow:'0 2px 12px rgba(0,0,0,0.3)' }}>{recipe.title}</h2>
          {recipe.author && <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)', margin:0 }}>מתכון של {recipe.author}</p>}
        </div>
        <div style={{ position:'absolute', top:'14px', left:'14px', display:'flex', gap:'6px' }} onClick={e=>e.stopPropagation()}>
          {hov && admin && onEdit && <button style={{ ...GLASS.card, color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.3)', borderRadius:'8px', padding:'5px 12px', fontSize:'11px', cursor:'pointer', fontFamily:FONT, fontWeight:600, transition:'background 0.15s' }} onClick={onEdit}>עריכה</button>}
          {hov && admin && onDelete && <button style={{ background:'rgba(220,38,38,0.7)', backdropFilter:'blur(8px)', border:'1px solid rgba(220,38,38,0.4)', borderRadius:'8px', padding:'5px 12px', fontSize:'11px', cursor:'pointer', fontFamily:FONT, color:'white', fontWeight:600 }} onClick={onDelete}>מחק</button>}
        </div>
        <button style={{ position:'absolute', top:'14px', right:'14px', background:'rgba(0,0,0,0.4)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', padding:'7px', display:'flex', alignItems:'center', borderRadius:'50%', transition:'transform 0.2s '+SPRING+', background 0.15s' }}
          onMouseDown={e=>e.currentTarget.style.transform='scale(0.82)'}
          onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
          onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
          onClick={e=>{e.stopPropagation();onFav(e)}}>
          {recipe.is_favorite
            ? <svg width="16" height="16" viewBox="0 0 20 20" fill="#fbbf24"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            : <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
          }
        </button>
      </div>
    )
  }

  // Regular card — dark glass
  return (
    <div
      style={{ position:'relative', borderRadius:'14px', overflow:'hidden', cursor:'pointer', ...GLASS.card, display:'flex', flexDirection:'column', transition:'transform 0.35s '+SPRING+', box-shadow 0.35s '+EASE_OUT+', border-color 0.3s', transform:hov?'translateY(-4px) scale(1.01)':'none', boxShadow:hov?'0 20px 44px rgba(0,0,0,0.3), 0 0 0 1px rgba(99,102,241,0.15)':'0 2px 12px rgba(0,0,0,0.15)', borderColor:hov?'rgba(148,163,184,0.18)':'rgba(148,163,184,0.1)' }}
      onClick={onOpen} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    >
      <div style={{ height:'160px', background: hasImage ? '#0f172a' : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', overflow:'hidden', flexShrink:0, position:'relative' }}>
        {hasImage
          ? <img src={recipe.image_url} alt={recipe.title} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.5s '+EASE_OUT, transform:hov?'scale(1.06)':'scale(1)' }} onError={e=>{e.target.style.display='none'}}/>
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <PlateIcon/>
            </div>
        }
        <button style={{ position:'absolute', top:'10px', right:'10px', background:'rgba(0,0,0,0.4)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', padding:'5px', display:'flex', alignItems:'center', borderRadius:'50%', transition:'transform 0.2s '+SPRING }}
          onMouseDown={e=>e.currentTarget.style.transform='scale(0.82)'}
          onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
          onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
          onClick={e=>{e.stopPropagation();onFav(e)}}>
          {recipe.is_favorite
            ? <svg width="14" height="14" viewBox="0 0 20 20" fill="#fbbf24"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            : <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
          }
        </button>
      </div>

      <div style={{ padding:'14px 16px 14px', flex:1, display:'flex', flexDirection:'column' }}>
        {recipeCats.length > 0 && (
          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', marginBottom:'8px' }}>
            {recipeCats.map(c=><span key={c.id} style={{ fontSize:'10px', fontWeight:600, ...GLASS.tag, borderRadius:'5px', padding:'2px 8px', letterSpacing:'0.3px' }}>{c.name}</span>)}
          </div>
        )}
        <h3 style={{ fontSize:'15px', fontWeight:700, color:'#e2e8f0', margin:'0 0 4px', lineHeight:1.35, fontFamily:FONT }}>{recipe.title}</h3>
        {recipe.author && <p style={{ fontSize:'12px', color:'rgba(148,163,184,0.7)', margin:0, marginTop:'auto', paddingTop:'6px' }}>{recipe.author}</p>}
      </div>

      {hov && admin && (
        <div style={{ position:'absolute', bottom:'10px', left:'10px', display:'flex', gap:'4px' }} onClick={e=>e.stopPropagation()}>
          {onEdit && <button style={{ ...GLASS.card, color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.25)', borderRadius:'6px', padding:'3px 10px', fontSize:'10px', cursor:'pointer', fontFamily:FONT, fontWeight:600 }} onClick={onEdit}>עריכה</button>}
          {onDelete && <button style={{ background:'rgba(220,38,38,0.6)', backdropFilter:'blur(8px)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:'6px', padding:'3px 10px', fontSize:'10px', cursor:'pointer', fontFamily:FONT, color:'#fca5a5', fontWeight:600 }} onClick={onDelete}>מחק</button>}
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

  const withImages = visible.filter(r => r.image_url)
  const pool = withImages.length > 0 ? withImages : visible
  const visibleKey = visible.map(r=>r.id).join(',')
  const featuredIdx = useMemo(
    () => pool.length > 0 ? Math.floor(Math.random() * pool.length) : 0,
    [visibleKey] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const featured = pool[featuredIdx % Math.max(1, pool.length)] || null
  const sorted = [...visible].sort((a,b) => (b.image_url?1:0) - (a.image_url?1:0))
  const rest = sorted.filter(r => r.id !== featured?.id)

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
        .rc-sidebar-search::placeholder{color:rgba(255,255,255,0.28)!important}
        input::placeholder{color:rgba(255,255,255,0.3)}
        .rcard{animation:rcFadeUp 0.45s ${EASE_OUT} both;opacity:0}
        @media(hover:hover)and(pointer:fine){.rcard:active{transform:scale(0.98)!important;transition-duration:0.1s!important}}
        @keyframes rcFadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes rcFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes rcScaleIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
        @keyframes rcShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes rcGlow{0%,100%{box-shadow:0 0 8px rgba(99,102,241,0.15)}50%{box-shadow:0 0 20px rgba(99,102,241,0.25)}}
      `}</style>

      <div style={{ minHeight:'100vh', background:'#0f172a', fontFamily:FONT, direction:'rtl', color:'#e2e8f0' }}>

        <BaronsHeader
          title="מתכונים"
          subtitle="ספר המתכונים המשפחתי"
          breadcrumbs={[{ label: 'מתכונים', path: '/recipes' }]}
          onDrawer={() => setSidebarOpen(prev => !prev)}
          actions={[{ label: '+ מתכון', onClick: () => setAddOpen && setAddOpen(true), primary: true }]}
        />

        {sidebarOpen && <div className="mobile-overlay" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:300, animation:'rcFadeIn 0.2s ease both' }} onClick={()=>setSidebarOpen(false)}/>}
        <div className="mobile-drawer" style={{ position:'fixed', top:'52px', right:sidebarOpen?0:'-270px', width:'270px', bottom:0, ...GLASS.sidebar, zIndex:400, transition:`right ${sidebarOpen?'0.35s':'0.25s'} ${EASE_OUT}`, overflowY:'auto', padding:'8px 0 20px', borderLeft:'1px solid rgba(255,255,255,0.06)' }}>
          {sidebarOpen && <SidebarContent {...sidebarProps}/>}
        </div>

        <div style={{ display:'flex', minHeight:'calc(100vh - 52px)' }}>
          <aside className="recipes-sidebar" style={{ width:'240px', flexShrink:0, background:'rgba(11, 26, 62, 0.6)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', borderLeft:'1px solid rgba(255,255,255,0.05)', flexDirection:'column', position:'sticky', top:'52px', height:'calc(100vh - 52px)', overflowY:'auto', padding:'8px 0 20px' }}>
            <SidebarContent {...sidebarProps}/>
          </aside>

          <main style={{ flex:1, padding:'28px 24px', minWidth:0 }}>
            <div style={{ marginBottom:'24px', animation:'rcFadeUp 0.4s '+EASE_OUT+' both' }}>
              <h1 style={{ fontSize:'22px', fontWeight:800, color:'#f1f5f9', margin:'0 0 4px', letterSpacing:'-0.3px' }}>{heading}</h1>
              <p style={{ fontSize:'13px', color:'rgba(148,163,184,0.7)', margin:0 }}>{visible.length} מתכונים</p>
            </div>

            {loading ? (
              <SkeletonGrid/>
            ) : visible.length === 0 ? (
              <div style={{ textAlign:'center', padding:'80px 0', animation:'rcFadeIn 0.4s ease both' }}>
                <EmptyIcon/>
                <p style={{ color:'rgba(148,163,184,0.6)', fontSize:'15px', marginTop:'16px' }}>
                  {search ? `לא נמצאו תוצאות עבור "${search}"` : 'אין מתכונים בקטגוריה זו'}
                </p>
              </div>
            ) : (
              <>
                {featured && (
                  <div className="recipe-grid rcard" style={{ display:'grid', gridTemplateColumns: rest.length >= 1 ? '1.6fr 1fr' : '1fr', gap:'16px', marginBottom:'16px', alignItems:'stretch', animationDelay:'0.05s' }}>
                    <RecipeCard {...cardProps(featured)} featured/>
                    {rest.length >= 1 && (
                      <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                        {rest.slice(0,2).map((r,i) => <div key={r.id} className="rcard" style={{animationDelay:`${0.1+i*0.06}s`}}><RecipeCard {...cardProps(r)}/></div>)}
                      </div>
                    )}
                  </div>
                )}

                {rest.length > 2 && (
                  <div className="recipe-grid-rest" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px' }}>
                    {rest.slice(2).map((r,i) => <div key={r.id} className="rcard" style={{animationDelay:`${Math.min(0.15+i*0.04, 0.6)}s`}}><RecipeCard {...cardProps(r)}/></div>)}
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
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', borderRadius:'10px', cursor:'pointer', marginBottom:'2px', background:active?'rgba(99,102,241,0.25)':hov?'rgba(255,255,255,0.06)':'transparent', transition:'background 0.25s '+EASE_OUT+', box-shadow 0.25s', boxShadow:active?'inset 0 0 0 1px rgba(99,102,241,0.3)':'none' }}
      onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <span style={{ fontSize:'13px', color:active?'#c7d2fe':'rgba(255,255,255,0.75)', fontWeight:active?700:500, transition:'color 0.2s' }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
        <span style={{ fontSize:'11px', fontWeight:700, color:active?'rgba(199,210,254,0.8)':'rgba(255,255,255,0.35)', background:active?'rgba(99,102,241,0.2)':'rgba(255,255,255,0.06)', borderRadius:'10px', padding:'1px 8px', transition:'all 0.2s' }}>{count}</span>
        {onEdit && (hov||active) && <button style={{ fontSize:'10px', color:'rgba(255,255,255,0.55)', background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'5px', padding:'2px 8px', cursor:'pointer', fontFamily:FONT, transition:'background 0.15s' }}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.18)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}
          onClick={e=>{e.stopPropagation();onEdit()}}>עריכה</button>}
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
      <div style={{ border:`2px dashed ${dragging?'rgba(99,102,241,0.5)':'rgba(148,163,184,0.15)'}`, borderRadius:'12px', padding:'18px', textAlign:'center', cursor:'pointer', background:dragging?'rgba(99,102,241,0.08)':'rgba(255,255,255,0.03)', transition:'all 0.2s '+EASE_OUT, marginBottom:'10px', position:'relative' }}
        onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={handleDrop} onClick={()=>fileRef.current?.click()}>
        {preview ? (
          <div style={{ position:'relative', display:'inline-block' }}>
            <img src={preview} alt="preview" style={{ height:'90px', maxWidth:'100%', borderRadius:'10px', objectFit:'cover' }}/>
            <button style={{ position:'absolute', top:'-8px', left:'-8px', width:'22px', height:'22px', borderRadius:'50%', background:'#dc2626', color:'white', border:'none', cursor:'pointer', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, transition:'transform 0.15s '+SPRING }}
              onMouseDown={e=>e.currentTarget.style.transform='scale(0.85)'}
              onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
              onClick={e=>{e.stopPropagation();onImageUrl('');setUrlInput('')}}>✕</button>
          </div>
        ) : (
          <div style={{ color:'rgba(148,163,184,0.6)', fontSize:'13px' }}>
            {uploading?'מעלה...':<><div style={{ marginBottom:'6px' }}><CameraIcon/></div>גרור תמונה לכאן, או לחץ לבחירה</>}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>uploadFile(e.target.files[0])}/>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ fontSize:'12px', color:'rgba(148,163,184,0.5)', flexShrink:0 }}>או URL:</span>
        <input style={{ flex:1, padding:'8px 10px', ...GLASS.input, borderRadius:'8px', fontSize:'13px', fontFamily:FONT, direction:'ltr', outline:'none' }}
          placeholder="https://..." value={urlInput} onChange={e=>handleUrlChange(e.target.value)}
          onFocus={e=>{e.target.style.borderColor='rgba(99,102,241,0.4)';e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.08)'}}
          onBlur={e=>{e.target.style.borderColor='rgba(148,163,184,0.15)';e.target.style.boxShadow='none'}}/>
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

  const inp={width:'100%',padding:'10px 12px',...GLASS.input,borderRadius:'10px',fontSize:'14px',fontFamily:FONT,direction:'rtl',outline:'none',marginBottom:'14px',resize:'vertical',display:'block',transition:'border-color 0.2s, box-shadow 0.2s'}
  const inpFocus = e => {e.target.style.borderColor='rgba(99,102,241,0.4)';e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.08)'}
  const inpBlur = e => {e.target.style.borderColor='rgba(148,163,184,0.15)';e.target.style.boxShadow='none'}

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'16px',animation:'rcFadeIn 0.2s ease both'}} onClick={onClose}>
      <div style={{...GLASS.modal,borderRadius:'18px',padding:'28px',width:'100%',maxWidth:'580px',maxHeight:'92vh',overflowY:'auto',direction:'rtl',fontFamily:FONT,animation:'rcScaleIn 0.3s '+SPRING+' both',boxShadow:'0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'22px'}}>
          <span style={{fontSize:'18px',fontWeight:700,color:'#f1f5f9'}}>{isEdit?'עריכת מתכון':'מתכון חדש'}</span>
          <button style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',cursor:'pointer',fontSize:'16px',color:'rgba(148,163,184,0.7)',padding:'4px 8px',lineHeight:1,transition:'background 0.15s, color 0.15s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.1)';e.currentTarget.style.color='#e2e8f0'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.color='rgba(148,163,184,0.7)'}}
            onClick={onClose}>✕</button>
        </div>
        <ImageField imageUrl={form.image_url} onImageUrl={v=>set('image_url',v)}/>
        <Lbl>שם המתכון *</Lbl>
        <input style={inp} value={form.title} onChange={e=>set('title',e.target.value)} placeholder="שם המתכון" autoFocus onFocus={inpFocus} onBlur={inpBlur}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
          <div><Lbl>ממי המתכון</Lbl><input style={inp} value={form.author} onChange={e=>set('author',e.target.value)} placeholder="שם הכותב" onFocus={inpFocus} onBlur={inpBlur}/></div>
          <div><Lbl>מועדף</Lbl><label style={{display:'flex',alignItems:'center',gap:'8px',height:'40px',cursor:'pointer',fontSize:'14px',color:'#94a3b8',fontFamily:FONT}}><input type="checkbox" checked={form.is_favorite} onChange={e=>set('is_favorite',e.target.checked)} style={{width:'16px',height:'16px',accentColor:'#6366f1'}}/>סמן כמועדף</label></div>
        </div>
        <Lbl>קטגוריות</Lbl>
        <div style={{display:'flex',flexWrap:'wrap',gap:'7px',marginBottom:'14px'}}>
          {categories.map(c=><button key={c.id} style={{padding:'5px 14px',border:'1px solid '+(selCats.includes(c.id)?'rgba(99,102,241,0.5)':'rgba(148,163,184,0.15)'),borderRadius:'20px',background:selCats.includes(c.id)?'rgba(99,102,241,0.25)':'rgba(255,255,255,0.04)',cursor:'pointer',fontSize:'13px',fontFamily:FONT,color:selCats.includes(c.id)?'#c7d2fe':'#94a3b8',transition:'all 0.2s '+EASE_OUT}} onClick={()=>toggleCat(c.id)}>{c.name}</button>)}
        </div>
        <Lbl hint="שורה לכל מרכיב">מרכיבים *</Lbl>
        <textarea style={{...inp,height:'120px'}} value={form.ingredients} onChange={e=>set('ingredients',e.target.value)} placeholder={'500 גרם קמח\n2 ביצים\n...'} onFocus={inpFocus} onBlur={inpBlur}/>
        <Lbl hint="שורה לכל שלב — ללא מספור">אופן הכנה *</Lbl>
        <textarea style={{...inp,height:'150px'}} value={form.instructions} onChange={e=>set('instructions',e.target.value)} placeholder={'מחממים תנור ל-180 מעלות.\nמערבבים...\n...'} onFocus={inpFocus} onBlur={inpBlur}/>
        <Lbl hint="אופציונלי">הערות</Lbl>
        <textarea style={{...inp,height:'65px'}} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="טיפים, וריאנטים..." onFocus={inpFocus} onBlur={inpBlur}/>
        {error&&<div style={{background:'rgba(220,38,38,0.12)',color:'#fca5a5',border:'1px solid rgba(220,38,38,0.25)',padding:'10px 14px',borderRadius:'10px',fontSize:'13px',marginBottom:'12px'}}>{error}</div>}
        <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'10px'}}>
          <button style={{padding:'9px 18px',border:'1px solid rgba(148,163,184,0.15)',borderRadius:'10px',background:'rgba(255,255,255,0.04)',cursor:'pointer',fontFamily:FONT,fontSize:'14px',color:'#94a3b8',transition:'all 0.15s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)';e.currentTarget.style.borderColor='rgba(148,163,184,0.25)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor='rgba(148,163,184,0.15)'}}
            onClick={onClose}>ביטול</button>
          <button style={{padding:'9px 22px',border:'none',borderRadius:'10px',background:'linear-gradient(135deg,#6366f1,#4f46e5)',color:'white',cursor:'pointer',fontFamily:FONT,fontSize:'14px',fontWeight:700,transition:'transform 0.15s '+SPRING+', box-shadow 0.2s',boxShadow:'0 2px 12px rgba(99,102,241,0.3)'}}
            onMouseDown={e=>e.currentTarget.style.transform='scale(0.96)'}
            onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
            onClick={save} disabled={saving}>{saving?'שומר...':isEdit?'שמור שינויים':'הוסף מתכון'}</button>
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

  const catInp = {width:'100%',padding:'10px 12px',...GLASS.input,borderRadius:'10px',fontSize:'14px',fontFamily:FONT,direction:'rtl',outline:'none',marginBottom:'20px',transition:'border-color 0.2s, box-shadow 0.2s'}

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'16px',animation:'rcFadeIn 0.2s ease both'}} onClick={onClose}>
      <div style={{...GLASS.modal,borderRadius:'18px',padding:'28px',width:'100%',maxWidth:'360px',direction:'rtl',fontFamily:FONT,animation:'rcScaleIn 0.3s '+SPRING+' both',boxShadow:'0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'22px'}}>
          <span style={{fontSize:'18px',fontWeight:700,color:'#f1f5f9'}}>{cat?'עריכת קטגוריה':'קטגוריה חדשה'}</span>
          <button style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',cursor:'pointer',fontSize:'16px',color:'rgba(148,163,184,0.7)',padding:'4px 8px',lineHeight:1,transition:'background 0.15s, color 0.15s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.1)';e.currentTarget.style.color='#e2e8f0'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.color='rgba(148,163,184,0.7)'}}
            onClick={onClose}>✕</button>
        </div>
        <Lbl>שם הקטגוריה</Lbl>
        <input style={catInp} value={name} onChange={e=>setName(e.target.value)} autoFocus onKeyDown={e=>e.key==='Enter'&&save()}
          onFocus={e=>{e.target.style.borderColor='rgba(99,102,241,0.4)';e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.08)'}}
          onBlur={e=>{e.target.style.borderColor='rgba(148,163,184,0.15)';e.target.style.boxShadow='none'}}/>
        {cat&&!confirm&&<button style={{width:'100%',padding:'9px',border:'1px solid rgba(220,38,38,0.25)',borderRadius:'10px',background:'rgba(220,38,38,0.08)',cursor:'pointer',fontFamily:FONT,fontSize:'13px',color:'#fca5a5',marginBottom:'16px',transition:'background 0.15s, border-color 0.15s'}}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(220,38,38,0.15)';e.currentTarget.style.borderColor='rgba(220,38,38,0.35)'}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(220,38,38,0.08)';e.currentTarget.style.borderColor='rgba(220,38,38,0.25)'}}
          onClick={()=>setConfirm(true)}>מחק קטגוריה</button>}
        {confirm&&<div style={{background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:'10px',padding:'14px',marginBottom:'16px'}}><p style={{fontSize:'13px',color:'#e2e8f0',marginBottom:'10px',fontFamily:FONT}}>למחוק את הקטגוריה &quot;{cat.name}&quot;?</p><div style={{display:'flex',gap:'8px'}}><button style={{padding:'8px 16px',border:'1px solid rgba(148,163,184,0.15)',borderRadius:'8px',background:'rgba(255,255,255,0.04)',cursor:'pointer',fontFamily:FONT,fontSize:'13px',color:'#94a3b8'}} onClick={()=>setConfirm(false)}>ביטול</button><button style={{padding:'8px 16px',border:'none',borderRadius:'8px',background:'#dc2626',color:'white',cursor:'pointer',fontFamily:FONT,fontSize:'13px',fontWeight:700}} onClick={del} disabled={saving}>מחק</button></div></div>}
        <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
          <button style={{padding:'9px 18px',border:'1px solid rgba(148,163,184,0.15)',borderRadius:'10px',background:'rgba(255,255,255,0.04)',cursor:'pointer',fontFamily:FONT,fontSize:'14px',color:'#94a3b8',transition:'all 0.15s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)';e.currentTarget.style.borderColor='rgba(148,163,184,0.25)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor='rgba(148,163,184,0.15)'}}
            onClick={onClose}>ביטול</button>
          <button style={{padding:'9px 22px',border:'none',borderRadius:'10px',background:'linear-gradient(135deg,#6366f1,#4f46e5)',color:'white',cursor:'pointer',fontFamily:FONT,fontSize:'14px',fontWeight:700,transition:'transform 0.15s '+SPRING+', box-shadow 0.2s',boxShadow:'0 2px 12px rgba(99,102,241,0.3)'}}
            onMouseDown={e=>e.currentTarget.style.transform='scale(0.96)'}
            onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
            onClick={save} disabled={saving}>{saving?'שומר...':cat?'שמור':'הוסף'}</button>
        </div>
      </div>
    </div>
  )
}

export function Lbl({ children, hint }) {
  return <div style={{fontSize:'12px',fontWeight:600,color:'#94a3b8',marginBottom:'5px',fontFamily:FONT}}>{children}{hint&&<span style={{fontWeight:400,color:'rgba(148,163,184,0.6)'}}> ({hint})</span>}</div>
}
