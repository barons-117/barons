import { useState, useEffect, useRef } from 'react'
import BaronsHeader from './BaronsHeader'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SidebarContent, StickyNoteModal, SideItem, FONT, Lbl } from './Recipes'

const isAdmin = (s) => ['erez@barons.co.il', 'user@barons.co.il'].includes(s?.user?.email)

function stripLeadingNumber(line) {
  return line.replace(/^\s*\d+[\.\)\-\:]\s*⁠?\s*/,'').replace(/^\s*[א-ת][\.\)\-\:]\s*/,'').replace(/^\s*[\u2022\u25cf\-\*]\s*/,'').trim()
}

async function fetchSharedData() {
  const [catRes, linksRes] = await Promise.all([
    supabase.from('recipe_categories').select('*').order('sort_order'),
    supabase.from('recipe_category_links').select('recipe_id, category_id'),
  ])
  const allLinks = linksRes.data || []
  const counts = {}
  allLinks.forEach(l => { counts[l.category_id] = (counts[l.category_id]||0)+1 })
  return { categories: catRes.data||[], links: allLinks, counts }
}

/* SVG camera icon to replace emoji */
function CameraIcon({ size = 28, color = 'rgba(148,163,184,0.6)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

// ─── Image Upload Field (same as in Recipes.jsx) ──────────
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

  function handleDrop(e) { e.preventDefault(); setDragging(false); const f=e.dataTransfer.files[0]; if(f) uploadFile(f) }
  function handleUrlChange(val) { setUrlInput(val); onImageUrl(val) }

  const preview = urlInput || imageUrl

  return (
    <div style={{ marginBottom:'14px' }}>
      <Lbl>תמונה</Lbl>
      <div style={{ border:`2px dashed ${dragging?'#3b82f6':'rgba(255,255,255,0.12)'}`, borderRadius:'10px', padding:'16px', textAlign:'center', cursor:'pointer', background:dragging?'rgba(59,130,246,0.1)':'rgba(255,255,255,0.04)', transition:'all 0.15s', marginBottom:'10px', position:'relative' }}
        onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={handleDrop} onClick={()=>fileRef.current?.click()}>
        {preview ? (
          <div style={{ position:'relative', display:'inline-block' }}>
            <img src={preview} alt="preview" style={{ height:'90px', maxWidth:'100%', borderRadius:'8px', objectFit:'cover' }}/>
            <button style={{ position:'absolute', top:'-8px', left:'-8px', width:'22px', height:'22px', borderRadius:'50%', background:'#dc2626', color:'white', border:'none', cursor:'pointer', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}
              onClick={e=>{e.stopPropagation();onImageUrl('');setUrlInput('')}}>✕</button>
          </div>
        ) : (
          <div style={{ color:'#94a3b8', fontSize:'13px' }}>
            {uploading ? 'מעלה...' : <><div style={{ marginBottom:'4px', display:'flex', justifyContent:'center' }}><CameraIcon /></div>גרור תמונה לכאן, או לחץ לבחירה</>}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>uploadFile(e.target.files[0])}/>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ fontSize:'12px', color:'rgba(148,163,184,0.7)', flexShrink:0 }}>או URL:</span>
        <input style={{ flex:1, padding:'8px 10px', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', fontSize:'13px', fontFamily:FONT, direction:'ltr', outline:'none', color:'#e2e8f0', background:'rgba(255,255,255,0.05)' }}
          placeholder="https://..." value={urlInput} onChange={e=>handleUrlChange(e.target.value)}/>
      </div>
    </div>
  )
}

/* Skeleton loader for dark mode */
function SkeletonLoader() {
  return (
    <>
      <style>{`
        @keyframes rdShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>
      <div style={{ minHeight:'100vh', background:'#0f172a', fontFamily:FONT, direction:'rtl' }}>
        <div style={{ height:'52px', background:'#0b1a3e' }}/>
        <div style={{ display:'flex', minHeight:'calc(100vh - 52px)' }}>
          <div style={{ width:'240px', flexShrink:0, background:'#0b1a3e' }}/>
          <main style={{ flex:1, padding:'20px' }}>
            <div style={{ background:'rgba(30,41,59,0.7)', borderRadius:'16px', border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden' }}>
              {/* Hero skeleton */}
              <div style={{ width:'100%', height:'240px', background:'linear-gradient(90deg,rgba(51,65,85,0.3) 25%,rgba(71,85,105,0.3) 50%,rgba(51,65,85,0.3) 75%)', backgroundSize:'200% 100%', animation:'rdShimmer 1.8s ease-in-out infinite' }}/>
              <div style={{ padding:'28px 32px' }}>
                {/* Title skeleton */}
                <div style={{ height:'28px', width:'60%', borderRadius:'8px', background:'linear-gradient(90deg,rgba(51,65,85,0.4) 25%,rgba(71,85,105,0.4) 50%,rgba(51,65,85,0.4) 75%)', backgroundSize:'200% 100%', animation:'rdShimmer 1.8s ease-in-out infinite', marginBottom:'12px' }}/>
                <div style={{ height:'16px', width:'35%', borderRadius:'6px', background:'linear-gradient(90deg,rgba(51,65,85,0.3) 25%,rgba(71,85,105,0.3) 50%,rgba(51,65,85,0.3) 75%)', backgroundSize:'200% 100%', animation:'rdShimmer 1.8s ease-in-out infinite', marginBottom:'32px' }}/>
                {/* Two column skeletons */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1.8fr', gap:'40px' }}>
                  <div>
                    {[...Array(6)].map((_,i)=><div key={i} style={{ height:'14px', width:`${70+Math.random()*30}%`, borderRadius:'4px', background:'linear-gradient(90deg,rgba(51,65,85,0.25) 25%,rgba(71,85,105,0.25) 50%,rgba(51,65,85,0.25) 75%)', backgroundSize:'200% 100%', animation:'rdShimmer 1.8s ease-in-out infinite', animationDelay:`${i*0.08}s`, marginBottom:'12px' }}/>)}
                  </div>
                  <div>
                    {[...Array(4)].map((_,i)=><div key={i} style={{ display:'flex', gap:'14px', marginBottom:'18px', alignItems:'flex-start' }}>
                      <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'linear-gradient(90deg,rgba(51,65,85,0.3) 25%,rgba(71,85,105,0.3) 50%,rgba(51,65,85,0.3) 75%)', backgroundSize:'200% 100%', animation:'rdShimmer 1.8s ease-in-out infinite', animationDelay:`${i*0.1}s`, flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ height:'14px', width:'90%', borderRadius:'4px', background:'linear-gradient(90deg,rgba(51,65,85,0.25) 25%,rgba(71,85,105,0.25) 50%,rgba(51,65,85,0.25) 75%)', backgroundSize:'200% 100%', animation:'rdShimmer 1.8s ease-in-out infinite', animationDelay:`${i*0.1}s`, marginBottom:'8px' }}/>
                        <div style={{ height:'14px', width:'60%', borderRadius:'4px', background:'linear-gradient(90deg,rgba(51,65,85,0.2) 25%,rgba(71,85,105,0.2) 50%,rgba(51,65,85,0.2) 75%)', backgroundSize:'200% 100%', animation:'rdShimmer 1.8s ease-in-out infinite', animationDelay:`${i*0.1+0.05}s` }}/>
                      </div>
                    </div>)}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

export default function RecipeDetail({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [recipeCats, setRecipeCats] = useState([])
  const [allCats, setAllCats] = useState([])
  const [catCounts, setCatCounts] = useState({})
  const [totalRecipes, setTotalRecipes] = useState(0)
  const [favCount, setFavCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const admin = isAdmin(session)

  useEffect(() => { load() }, [id])
  useEffect(() => {
    const close = () => setSidebarOpen(false)
    if (sidebarOpen) { setTimeout(()=>document.addEventListener('click',close),10); return ()=>document.removeEventListener('click',close) }
  }, [sidebarOpen])

  async function load() {
    setLoading(true)
    const [rRes, shared, recipeCount, favRes, linkRes] = await Promise.all([
      supabase.from('recipes').select('*').eq('id',id).single(),
      fetchSharedData(),
      supabase.from('recipes').select('id',{count:'exact',head:true}),
      supabase.from('recipes').select('id',{count:'exact',head:true}).eq('is_favorite',true),
      supabase.from('recipe_category_links').select('category_id').eq('recipe_id',id),
    ])
    setRecipe(rRes.data); setAllCats(shared.categories); setCatCounts(shared.counts)
    setTotalRecipes(recipeCount.count||0); setFavCount(favRes.count||0)
    const catIds = (linkRes.data||[]).map(l=>l.category_id)
    setRecipeCats((shared.categories||[]).filter(c=>catIds.includes(c.id)))
    setLoading(false)
  }

  async function toggleFav() {
    await supabase.from('recipes').update({ is_favorite:!recipe.is_favorite }).eq('id',id)
    setRecipe(p=>({...p,is_favorite:!p.is_favorite}))
    setFavCount(n=>recipe.is_favorite?n-1:n+1)
  }

  const countFor = catId => {
    if (catId==='all') return totalRecipes
    if (catId==='fav') return favCount
    return catCounts[catId]||0
  }

  function goToCat(id) { navigate('/recipes',{state:{selectedCat:id}}) }

  if (loading) return <SkeletonLoader />
  if (!recipe) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:FONT, color:'rgba(148,163,184,0.6)', background:'#0f172a' }}>מתכון לא נמצא</div>

  const ingredients = (recipe.ingredients||'').split('\n').filter(Boolean)
  const instructions = (recipe.instructions||'').split('\n').filter(Boolean).map(stripLeadingNumber).filter(Boolean)

  const sidebarProps = { cats:allCats, countFor, selectedCat:null, search:'', setSearch:null, selectCat:goToCat, admin, setEditCat:null, setSidebarOpen, onOpenNote:()=>setNoteOpen(true) }

  return (
    <>
      <style>{`
        *{box-sizing:border-box} body{margin:0}
        .recipe-cols{display:grid;grid-template-columns:1fr 1.8fr;gap:40px}
        .rd-sidebar{display:flex}
        @keyframes rdFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes rdFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes rdModalIn{from{opacity:0;transform:scale(0.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes rdGlow{0%,100%{box-shadow:0 0 4px rgba(59,130,246,0.3)}50%{box-shadow:0 0 8px rgba(59,130,246,0.5)}}
        @keyframes rdPulse{0%,100%{opacity:0.6}50%{opacity:1}}
        @media(max-width:768px){.rd-sidebar{display:none}.recipe-cols{grid-template-columns:1fr;gap:28px}.recipe-card{padding:20px 16px!important}.recipe-title{font-size:22px!important}.hdr-actions button{font-size:12px!important;padding:5px 10px!important}}
        @media(min-width:769px){.hamburger-btn{display:none!important}.mobile-overlay{display:none!important}.mobile-drawer{display:none!important}}
        @media print{
          *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
          header,.no-print,.rd-sidebar,.hamburger-btn,.mobile-drawer,.mobile-overlay,.rd-fav-badge,.rd-cat-pill,.rd-author{display:none!important}
          .recipe-hero-image{display:none!important}
          body{background:white!important;color:#1e293b!important;margin:0;padding:0}
          .rd-main-wrap{background:white!important;padding:0!important}
          .recipe-card{box-shadow:none!important;border:none!important;border-radius:0!important;padding:16px 24px!important;background:white!important;backdrop-filter:none!important}
          .recipe-cols{grid-template-columns:1fr 1.8fr!important;gap:32px!important}
          .rd-section-hdr{background:transparent!important;border:none!important;border-bottom:1px solid #e2e8f0!important;color:#334155!important;backdrop-filter:none!important;border-radius:0!important;margin:0 0 14px!important;padding:0 0 8px!important}
          .rd-ingredient-line{color:#334155!important}
          .rd-step-text{color:#1e293b!important}
          .rd-step-num{background:#1d4ed8!important}
          .rd-title{color:#0f172a!important;font-size:22pt!important}
          .rd-notes-box{background:#fffbeb!important;border-color:#fde68a!important;color:#78350f!important}
          .print-footer{display:block!important}
          .print-logo{display:none!important}
        }
        .print-logo{display:none}
        .print-footer{display:none}
        input::placeholder{color:rgba(255,255,255,0.3)}
        @media print{.print-footer{display:block!important;position:fixed;bottom:0;left:0;right:0;text-align:center;font-family:Georgia,serif;font-size:9pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding:6px 0;letter-spacing:2px}}
      `}</style>

      <div className="print-logo">BARONS</div>
      <div className="print-footer" style={{ display:'none' }}>
        מתכון מאתר BARONS · barons.co.il
      </div>

      <div className="rd-main-wrap" style={{ minHeight:'100vh', background:'#0f172a', fontFamily:FONT, direction:'rtl' }}>
        <BaronsHeader
        title={recipe?.title || 'מתכון'}
        subtitle={recipe?.subtitle || ''}
        breadcrumbs={[{ label: 'מתכונים', path: '/recipes' }, { label: recipe?.title || '...' }]}
        onDrawer={() => setSidebarOpen(prev => !prev)}
        actions={[
          { label: recipe?.is_favorite ? 'מועדף' : 'הוסף למועדפים', onClick: toggleFav },
          { label: 'הדפס', onClick: () => window.print() },
          { label: 'שתף', onClick: () => {
            if (navigator.share) {
              navigator.share({ title: recipe.title, url: window.location.href })
            } else {
              navigator.clipboard.writeText(window.location.href).then(() => alert('הקישור הועתק!'))
            }
          }},
          ...(admin ? [{ label: '✎ עריכה', onClick: () => setEditing(true), primary: true }] : []),
        ]}
      />

        {sidebarOpen && <div className="mobile-overlay" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:300, backdropFilter:'blur(4px)' }} onClick={()=>setSidebarOpen(false)}/>}
        <div className="mobile-drawer" style={{ position:'fixed', top:'52px', right:sidebarOpen?0:'-260px', width:'260px', bottom:0, background:'#0b1a3e', zIndex:400, transition:'right 0.3s cubic-bezier(.4,0,.2,1)', overflowY:'auto', padding:'8px 0 20px' }}>
          {sidebarOpen && <SidebarContent {...sidebarProps}/>}
        </div>

        <div style={{ display:'flex', minHeight:'calc(100vh - 52px)' }}>
          <aside className="rd-sidebar" style={{ width:'240px', flexShrink:0, background:'#0b1a3e', flexDirection:'column', position:'sticky', top:'52px', height:'calc(100vh - 52px)', overflowY:'auto', padding:'8px 0 20px' }}>
            <SidebarContent {...sidebarProps}/>
          </aside>

          <main style={{ flex:1, padding:'20px', minWidth:0 }}>
            <div className="recipe-card" style={{ background:'rgba(30,41,59,0.7)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', borderRadius:'16px', border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1)', animation:'rdFadeIn 0.4s cubic-bezier(.4,0,.2,1) both' }}>

              {/* Hero image */}
              {recipe.image_url && (
                <div className="recipe-hero-image" style={{ width:'100%', height:'260px', overflow:'hidden', position:'relative' }}>
                  <img src={recipe.image_url} alt={recipe.title} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.6s cubic-bezier(.4,0,.2,1)' }}/>
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.3) 50%, rgba(15,23,42,0.75) 100%)' }}/>
                </div>
              )}

              <div style={{ padding:'28px 32px' }}>
                {/* Title */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px', gap:'16px', animation:'rdFadeUp 0.5s cubic-bezier(.4,0,.2,1) 0.1s both' }}>
                  <div style={{ flex:1 }}>
                    <h1 className="recipe-title rd-title" style={{ fontSize:'26px', fontWeight:800, color:'#f1f5f9', margin:'0 0 10px', lineHeight:1.2, fontFamily:FONT, letterSpacing:'-0.3px' }}>{recipe.title}</h1>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                      {recipe.author && <span className="rd-author" style={{ fontSize:'13px', color:'rgba(148,163,184,0.8)' }}>מתכון של {recipe.author}</span>}
                      {recipe.author && recipeCats.length>0 && <span style={{ color:'rgba(255,255,255,0.15)' }}>·</span>}
                      {recipeCats.map(c=><span key={c.id} className="rd-cat-pill" style={{ fontSize:'11px', fontWeight:700, color:'rgba(147,197,253,0.95)', background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:'6px', padding:'3px 10px', backdropFilter:'blur(8px)' }}>{c.name}</span>)}
                    </div>
                  </div>
                  {recipe.is_favorite && <div className="rd-fav-badge" style={{ fontSize:'12px', fontWeight:700, color:'rgba(251,191,36,0.95)', background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:'8px', padding:'5px 14px', flexShrink:0, backdropFilter:'blur(8px)' }}>מועדף</div>}
                </div>

                <hr style={{ border:'none', borderTop:'1px solid rgba(255,255,255,0.06)', margin:'16px 0 24px' }}/>

                {/* Two columns */}
                <div className="recipe-cols">
                  <div style={{ animation:'rdFadeUp 0.5s cubic-bezier(.4,0,.2,1) 0.2s both' }}>
                    <h2 className="rd-section-hdr" style={{ fontSize:'11px', fontWeight:700, color:'rgba(148,163,184,0.7)', textTransform:'uppercase', letterSpacing:'1.5px', margin:'0 0 16px', paddingBottom:'10px', borderBottom:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.02)', margin:'0 -8px 16px', padding:'8px 8px 10px', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.05)' }}>מרכיבים</h2>
                    <ul style={{ listStyle:'none', padding:0, margin:0 }}>
                      {ingredients.map((line,i)=>{
                        const isSection = line.trim().endsWith(':')
                        if (isSection) return <li key={i} style={{ fontWeight:700, color:'rgba(226,232,240,0.85)', fontSize:'12px', paddingTop:'14px', paddingBottom:'5px', display:'block', animation:`rdFadeUp 0.4s cubic-bezier(.4,0,.2,1) ${0.25+i*0.03}s both` }}>{line}</li>
                        return (
                          <li key={i} className="rd-ingredient-line" style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'5px 0', fontSize:'14px', color:'rgba(203,213,225,0.9)', lineHeight:1.6, animation:`rdFadeUp 0.4s cubic-bezier(.4,0,.2,1) ${0.25+i*0.03}s both` }}>
                            <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'rgba(96,165,250,0.7)', flexShrink:0, marginTop:'8px', display:'inline-block', boxShadow:'0 0 6px rgba(59,130,246,0.35)' }}/>
                            <span>{line}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                  <div style={{ animation:'rdFadeUp 0.5s cubic-bezier(.4,0,.2,1) 0.3s both' }}>
                    <h2 className="rd-section-hdr" style={{ fontSize:'11px', fontWeight:700, color:'rgba(148,163,184,0.7)', textTransform:'uppercase', letterSpacing:'1.5px', margin:'0 0 16px', paddingBottom:'10px', borderBottom:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.02)', margin:'0 -8px 16px', padding:'8px 8px 10px', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.05)' }}>אופן הכנה</h2>
                    <ol style={{ listStyle:'none', padding:0, margin:0 }}>
                      {instructions.map((step,i)=>(
                        <li key={i} style={{ display:'flex', gap:'14px', marginBottom:'18px', alignItems:'flex-start', animation:`rdFadeUp 0.4s cubic-bezier(.4,0,.2,1) ${0.35+i*0.05}s both` }}>
                          <span className="rd-step-num" style={{ width:'28px', height:'28px', borderRadius:'50%', background:'linear-gradient(135deg,rgba(59,130,246,0.8),rgba(29,78,216,0.9))', color:'rgba(255,255,255,0.95)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, flexShrink:0, boxShadow:'0 2px 8px rgba(59,130,246,0.25)', border:'1px solid rgba(96,165,250,0.3)' }}>{i+1}</span>
                          <span className="rd-step-text" style={{ fontSize:'14px', color:'rgba(203,213,225,0.9)', lineHeight:1.7, paddingTop:'4px' }}>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {recipe.notes && (
                  <>
                    <hr style={{ border:'none', borderTop:'1px solid rgba(255,255,255,0.06)', margin:'24px 0 16px' }}/>
                    <div className="rd-notes-box" style={{ background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.15)', borderRadius:'10px', padding:'14px 16px', fontSize:'14px', color:'rgba(253,230,138,0.9)', lineHeight:1.7, fontFamily:FONT, backdropFilter:'blur(8px)', animation:'rdFadeUp 0.4s cubic-bezier(.4,0,.2,1) 0.5s both' }}>
                      <span style={{ fontWeight:700 }}>הערה: </span>{recipe.notes}
                    </div>
                  </>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {noteOpen && <StickyNoteModal onClose={()=>setNoteOpen(false)}/>}
      {editing && (
        <EditModal recipe={recipe} allCats={allCats} recipeCatIds={recipeCats.map(c=>c.id)}
          onClose={()=>setEditing(false)} onSave={()=>{load();setEditing(false)}}/>
      )}
    </>
  )
}

function EditModal({ recipe, allCats, recipeCatIds, onClose, onSave }) {
  const [form, setForm] = useState({ title:recipe.title||'', author:recipe.author||'', ingredients:recipe.ingredients||'', instructions:recipe.instructions||'', notes:recipe.notes||'', is_favorite:!!recipe.is_favorite, image_url:recipe.image_url||'' })
  const [selCats, setSelCats] = useState(recipeCatIds)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const toggleCat = id => setSelCats(p=>p.includes(id)?p.filter(c=>c!==id):[...p,id])

  async function save() {
    if (!form.title.trim()) return setError('שם המתכון הוא שדה חובה')
    if (!form.ingredients.trim()) return setError('מרכיבים הם שדה חובה')
    setSaving(true); setError('')
    await supabase.from('recipes').update({ ...form, notes:form.notes||null, image_url:form.image_url||null }).eq('id',recipe.id)
    await supabase.from('recipe_category_links').delete().eq('recipe_id',recipe.id)
    if (selCats.length) await supabase.from('recipe_category_links').insert(selCats.map(cid=>({recipe_id:recipe.id,category_id:cid})))
    setSaving(false); onSave()
  }

  const inp = { width:'100%', padding:'10px 12px', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', fontSize:'14px', fontFamily:FONT, direction:'rtl', outline:'none', marginBottom:'14px', color:'#e2e8f0', resize:'vertical', display:'block', background:'rgba(255,255,255,0.05)', transition:'border-color 0.2s' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.7)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'16px', animation:'rdFadeIn 0.25s cubic-bezier(.4,0,.2,1) both' }} onClick={onClose}>
      <div style={{ background:'rgba(30,41,59,0.92)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'16px', padding:'28px', width:'100%', maxWidth:'580px', maxHeight:'92vh', overflowY:'auto', direction:'rtl', fontFamily:FONT, boxShadow:'0 24px 64px rgba(0,0,0,0.4)', animation:'rdModalIn 0.35s cubic-bezier(.4,0,.2,1) both' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <span style={{ fontSize:'18px', fontWeight:700, color:'#f1f5f9' }}>עריכת מתכון</span>
          <button style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', fontSize:'16px', color:'rgba(148,163,184,0.7)', lineHeight:1, width:'28px', height:'28px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }} onClick={onClose}>✕</button>
        </div>

        <ImageField imageUrl={form.image_url} onImageUrl={v=>set('image_url',v)}/>

        <Lbl>שם המתכון *</Lbl>
        <input style={inp} value={form.title} onChange={e=>set('title',e.target.value)}/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
          <div><Lbl>ממי המתכון</Lbl><input style={inp} value={form.author} onChange={e=>set('author',e.target.value)}/></div>
          <div><Lbl>מועדף</Lbl><label style={{ display:'flex', alignItems:'center', gap:'8px', height:'40px', cursor:'pointer', fontSize:'14px', color:'rgba(203,213,225,0.9)', fontFamily:FONT }}><input type="checkbox" checked={form.is_favorite} onChange={e=>set('is_favorite',e.target.checked)} style={{ width:'16px', height:'16px', accentColor:'#3b82f6' }}/>סמן כמועדף</label></div>
        </div>
        <Lbl>קטגוריות</Lbl>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'7px', marginBottom:'14px' }}>
          {allCats.map(c=><button key={c.id} style={{ padding:'5px 14px', border:'1px solid '+(selCats.includes(c.id)?'rgba(59,130,246,0.5)':'rgba(255,255,255,0.1)'), borderRadius:'20px', background:selCats.includes(c.id)?'rgba(59,130,246,0.25)':'rgba(255,255,255,0.04)', cursor:'pointer', fontSize:'13px', fontFamily:FONT, color:selCats.includes(c.id)?'rgba(147,197,253,0.95)':'rgba(203,213,225,0.7)', transition:'all 0.2s cubic-bezier(.4,0,.2,1)' }} onClick={()=>toggleCat(c.id)}>{c.name}</button>)}
        </div>
        <Lbl hint="שורה לכל מרכיב">מרכיבים *</Lbl>
        <textarea style={{...inp,height:'120px'}} value={form.ingredients} onChange={e=>set('ingredients',e.target.value)}/>
        <Lbl hint="ללא מספור">אופן הכנה</Lbl>
        <textarea style={{...inp,height:'150px'}} value={form.instructions} onChange={e=>set('instructions',e.target.value)}/>
        <Lbl hint="אופציונלי">הערות</Lbl>
        <textarea style={{...inp,height:'65px'}} value={form.notes} onChange={e=>set('notes',e.target.value)}/>
        {error && <div style={{ background:'rgba(220,38,38,0.12)', color:'#fca5a5', border:'1px solid rgba(220,38,38,0.25)', padding:'10px 14px', borderRadius:'8px', fontSize:'13px', marginBottom:'12px' }}>{error}</div>}
        <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'8px' }}>
          <button style={{ padding:'9px 18px', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', background:'rgba(255,255,255,0.05)', cursor:'pointer', fontFamily:FONT, fontSize:'14px', color:'rgba(203,213,225,0.8)', transition:'all 0.2s' }} onClick={onClose}>ביטול</button>
          <button style={{ padding:'9px 20px', border:'1px solid rgba(59,130,246,0.3)', borderRadius:'8px', background:'linear-gradient(135deg,rgba(59,130,246,0.6),rgba(29,78,216,0.7))', color:'rgba(255,255,255,0.95)', cursor:'pointer', fontFamily:FONT, fontSize:'14px', fontWeight:700, boxShadow:'0 2px 8px rgba(59,130,246,0.2)', transition:'all 0.2s' }} onClick={save} disabled={saving}>{saving?'שומר...':'שמור שינויים'}</button>
        </div>
      </div>
    </div>
  )
}
