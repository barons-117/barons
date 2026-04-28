import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const FF = "'Open Sans Hebrew', 'Open Sans', 'Assistant', system-ui, -apple-system, sans-serif"
const LT = {
  ink:'#0f1a2e', muted:'#64748b', muted2:'#94a3b8',
  line:'rgba(37,99,235,0.08)', line2:'rgba(37,99,235,0.14)',
  accent:'#2563eb', pageBg:'linear-gradient(180deg,#e8f1ff 0%,#f6f9ff 45%,#fff 100%)',
}
const EASE = { out:'cubic-bezier(0.23, 1, 0.32, 1)' }

const COUNTRY_HE = {
  'UK':'בריטניה','Germany':'גרמניה','Netherlands':'הולנד','Spain':'ספרד','France':'צרפת',
  'Italy':'איטליה','Hungary':'הונגריה','Czech':'צ׳כיה','Austria':'אוסטריה','Belgium':'בלגיה',
  'Switzerland':'שווייץ','Poland':'פולין','Thailand':'תאילנד','Australia':'אוסטרליה',
  'Jordan':'ירדן','Portugal':'פורטוגל','Greece':'יוון','Canada':'קנדה','IL':'ישראל',
  'New York':'ניו יורק','California':'קליפורניה','Oregon':'אורגון','Nevada':'נבדה',
  'Florida':'פלורידה','Washington DC':'וושינגטון DC','Massachusetts':'מסצ׳וסטס',
  'Illinois':'אילינוי','Texas':'טקסס','Washington':'וושינגטון','Utah':'יוטה',
  'Maryland':'מרילנד','New Jersey':'ניו ג׳רזי','Ukraine':'אוקראינה','Romania':'רומניה',
  'Moldova':'מולדובה','New Zealand':'ניו זילנד','Singapore':'סינגפור','Japan':'יפן',
  'Hong Kong':'הונג קונג','Cyprus':'קפריסין','Louisiana':'לואיזיאנה','Hawaii':'הוואי',
  'North Carolina':'צפון קרוליינה',
}
const FLAG = {
  'UK':'🇬🇧','Germany':'🇩🇪','Netherlands':'🇳🇱','Spain':'🇪🇸','France':'🇫🇷',
  'Italy':'🇮🇹','Hungary':'🇭🇺','Czech':'🇨🇿','Austria':'🇦🇹','Belgium':'🇧🇪',
  'Switzerland':'🇨🇭','Poland':'🇵🇱','Thailand':'🇹🇭','Australia':'🇦🇺',
  'Jordan':'🇯🇴','Portugal':'🇵🇹','Greece':'🇬🇷','Canada':'🇨🇦','IL':'🇮🇱',
  'Ukraine':'🇺🇦','Romania':'🇷🇴','Moldova':'🇲🇩','New Zealand':'🇳🇿',
  'Singapore':'🇸🇬','Japan':'🇯🇵','Hong Kong':'🇭🇰','Cyprus':'🇨🇾',
}
const US_STATES = ['New York','California','Oregon','Nevada','Florida','Washington DC',
  'Massachusetts','Illinois','Texas','Washington','Utah','Maryland','New Jersey',
  'Louisiana','Hawaii','North Carolina','Tennessee','Colorado','Arizona','Minnesota',
  'Michigan','Pennsylvania','Georgia']

const STYLES = `
@keyframes co-fade-up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
.co-card { transition:all .18s cubic-bezier(0.23,1,0.32,1); }
.co-card:hover { transform:translateY(-2px) !important; box-shadow:0 8px 24px rgba(37,99,235,0.13) !important; border-color:rgba(37,99,235,0.22) !important; }
.co-row:hover { background:#f0f5ff !important; }
.co-sort-btn { transition:all .15s ease; }
@media(max-width:768px){
  .co-page { padding:12px 10px 80px !important; }
  .co-grid { grid-template-columns:repeat(2,1fr) !important; gap:10px !important; }
}
`

function HomeIcon(){ return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function GlobeIcon(){ return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> }
function GridIcon(){ return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> }
function ListIcon(){ return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> }
function NoteIcon(){ return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
function ChevRight(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg> }

export default function Countries({ session }) {
  const navigate = useNavigate()
  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('grouped')

  useEffect(() => { load() }, [])

  async function load() {
    const [segsRes, notesRes] = await Promise.all([
      supabase.from('trip_segments').select('country').not('country','is',null),
      supabase.from('country_notes').select('country'),
    ])
    const notesSet = new Set((notesRes.data||[]).map(n=>n.country))
    const counts = {}
    for (const s of (segsRes.data||[])) {
      if (!s.country) continue
      counts[s.country] = (counts[s.country]||0) + 1
    }
    const arr = Object.entries(counts)
      .map(([c,n]) => ({ country:c, count:n, hasNotes: notesSet.has(c) }))
      .sort((a,b) => b.count - a.count)
    setCountries(arr)
    setLoading(false)
  }

  const heC = c => COUNTRY_HE[c] || c
  const filtered = countries.filter(c =>
    !search || heC(c.country).includes(search) || c.country.toLowerCase().includes(search.toLowerCase())
  )

  const europeList   = ['UK','Germany','Netherlands','Spain','France','Italy','Hungary','Czech','Austria','Belgium','Switzerland','Poland','Portugal','Greece','Cyprus','Romania','Moldova','Ukraine']
  const asiaList     = ['Thailand','Japan','Singapore','Hong Kong','Jordan']
  const oceaniaList  = ['Australia','New Zealand']
  const nonUsAmerica = ['Canada']

  const americaItems = [
    ...filtered.filter(c => nonUsAmerica.includes(c.country)),
    ...filtered.filter(c => US_STATES.includes(c.country)).sort((a,b) => b.count - a.count),
  ]

  const grouped = [
    { label:'אירופה 🌍',    items: filtered.filter(c => europeList.includes(c.country)) },
    { label:'אמריקה 🌎',    items: americaItems },
    { label:'אסיה + אוקיינוסיה 🌏', items: filtered.filter(c => [...asiaList,...oceaniaList].includes(c.country)) },
    { label:'אחרות',        items: filtered.filter(c => ![...europeList,...asiaList,...oceaniaList,...US_STATES,...nonUsAmerica].includes(c.country)) },
  ].filter(g => g.items.length > 0)

  const alphaItems = [...filtered].sort((a,b) => heC(a.country).localeCompare(heC(b.country), 'he'))

  const cardBase = (c) => ({
    background: c.hasNotes ? '#fff' : '#f4f5f7',
    border: `1px solid ${c.hasNotes ? LT.line2 : 'rgba(0,0,0,0.07)'}`,
    borderRadius:'16px', padding:'16px',
    cursor:'pointer', fontFamily:FF, textAlign:'right',
    boxShadow: c.hasNotes ? '0 2px 8px rgba(37,99,235,0.05)' : 'none',
    position:'relative',
  })

  if (loading) return (
    <div style={{ minHeight:'100dvh',background:LT.pageBg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FF,color:LT.muted }}>טוען...</div>
  )

  return (
    <div style={{ minHeight:'100dvh',background:LT.pageBg,fontFamily:FF,color:LT.ink,direction:'rtl' }}>
      <style>{STYLES}</style>
      <div className="co-page" style={{ maxWidth:'960px',margin:'0 auto',padding:'18px 16px 80px' }}>

        {/* Breadcrumbs */}
        <div style={{ display:'flex',alignItems:'center',gap:'8px',fontSize:'12.5px',color:LT.muted,background:'rgba(255,255,255,0.7)',padding:'7px 14px',borderRadius:'999px',border:`1px solid ${LT.line2}`,backdropFilter:'blur(8px)',marginBottom:'18px',width:'fit-content' }}>
          <button onClick={()=>navigate('/')} style={{ background:'none',border:'none',cursor:'pointer',padding:0,display:'inline-flex',alignItems:'center',gap:'5px',color:LT.accent,fontFamily:FF,fontSize:'12.5px',fontWeight:800,letterSpacing:'0.04em' }}>
            <HomeIcon/><span>BARONS</span>
          </button>
          <span style={{ color:LT.muted2 }}>/</span>
          <button onClick={()=>navigate('/travels')} style={{ background:'none',border:'none',color:LT.muted,cursor:'pointer',padding:0,fontFamily:FF,fontSize:'12.5px',fontWeight:600 }}>נסיעות</button>
          <span style={{ color:LT.muted2 }}>/</span>
          <b style={{ color:LT.ink,fontWeight:700 }}>יעדים</b>
        </div>

        {/* Hero bar */}
        <div style={{ background:'#fff',border:`1px solid ${LT.line2}`,borderRadius:'22px',padding:'14px 18px',marginBottom:'22px',boxShadow:'0 6px 24px rgba(37,99,235,0.07)',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap',animation:`co-fade-up 380ms ${EASE.out} both` }}>
          <div style={{ width:'44px',height:'44px',borderRadius:'12px',background:'linear-gradient(135deg,#dbeafe,#eff6ff)',display:'flex',alignItems:'center',justifyContent:'center',color:LT.accent,flexShrink:0 }}><GlobeIcon/></div>
          <div style={{ flex:1 }}>
            <h1 style={{ margin:0,fontSize:'20px',fontWeight:900,color:LT.ink,letterSpacing:'-0.02em' }}>יעדים</h1>
            <div style={{ marginTop:'1px',fontSize:'12px',color:LT.muted }}>{countries.length} יעדים · {countries.reduce((s,c)=>s+c.count,0)} ביקורים</div>
          </div>
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="חפש..."
            style={{ border:`1.5px solid ${LT.line2}`,borderRadius:'10px',padding:'7px 12px',fontSize:'13px',fontFamily:FF,color:LT.ink,background:'#f8faff',outline:'none',width:'130px' }}
          />
          <div style={{ display:'flex',gap:'3px',background:'#f0f2f5',borderRadius:'9px',padding:'3px' }}>
            {[['grouped',<GridIcon/>,'אזור'],['alpha',<ListIcon/>,'א-ב']].map(([mode,icon,label]) => (
              <button
                key={mode}
                className="co-sort-btn"
                onClick={() => setViewMode(mode)}
                style={{
                  background: viewMode===mode ? '#fff' : 'transparent',
                  border:'none', cursor:'pointer', fontFamily:FF,
                  fontSize:'12px', fontWeight:700,
                  color: viewMode===mode ? LT.accent : LT.muted,
                  padding:'5px 10px', borderRadius:'7px',
                  boxShadow: viewMode===mode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  display:'inline-flex', alignItems:'center', gap:'4px',
                }}
              >
                {icon}{label}
              </button>
            ))}
          </div>
        </div>

        {/* GROUPED VIEW */}
        {viewMode === 'grouped' && grouped.map(g => (
          <div key={g.label} style={{ marginBottom:'26px' }}>
            <h2 style={{ margin:'0 0 11px',fontSize:'11px',fontWeight:700,letterSpacing:'0.16em',textTransform:'uppercase',color:LT.muted }}>{g.label}</h2>
            <div className="co-grid" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px' }}>
              {g.items.map((c,i) => (
                <button
                  key={c.country}
                  className="co-card"
                  onClick={() => navigate(`/country/${encodeURIComponent(c.country)}`)}
                  style={{ ...cardBase(c), animation:`co-fade-up 360ms ${EASE.out} both`, animationDelay:`${i*25}ms` }}
                >
                  {c.hasNotes && (
                    <div style={{ position:'absolute',top:'9px',left:'9px',color:LT.accent }}><NoteIcon/></div>
                  )}
                  <div style={{ fontSize:'24px',marginBottom:'6px' }}>{FLAG[c.country]||'📍'}</div>
                  <div style={{ fontSize:'13.5px',fontWeight:800,color: c.hasNotes ? LT.ink : LT.muted,marginBottom:'2px',lineHeight:1.2 }}>{heC(c.country)}</div>
                  <div style={{ fontSize:'11px',color:LT.muted2,fontVariantNumeric:'tabular-nums' }}>{c.count} {c.count===1?'ביקור':'ביקורים'}</div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* ALPHA LIST VIEW */}
        {viewMode === 'alpha' && (
          <div style={{ background:'#fff',border:`1px solid ${LT.line2}`,borderRadius:'18px',overflow:'hidden' }}>
            {alphaItems.map((c,i) => (
              <button
                key={c.country}
                className="co-row"
                onClick={() => navigate(`/country/${encodeURIComponent(c.country)}`)}
                style={{
                  width:'100%',
                  background: c.hasNotes ? '#fff' : '#fafafa',
                  border:'none',
                  borderTop: i===0 ? 'none' : `1px solid ${LT.line}`,
                  padding:'11px 16px',
                  cursor:'pointer', fontFamily:FF,
                  display:'flex', alignItems:'center', gap:'12px',
                  textAlign:'right', transition:'background .12s ease',
                }}
              >
                <span style={{ fontSize:'20px',flexShrink:0 }}>{FLAG[c.country]||'📍'}</span>
                <span style={{ flex:1,fontSize:'14.5px',fontWeight: c.hasNotes ? 700 : 500, color: c.hasNotes ? LT.ink : LT.muted }}>{heC(c.country)}</span>
                {c.hasNotes && <span style={{ color:LT.accent,display:'inline-flex',flexShrink:0 }}><NoteIcon/></span>}
                <span style={{ fontSize:'11.5px',color:LT.muted2,fontVariantNumeric:'tabular-nums',flexShrink:0 }}>{c.count} ביקורים</span>
                <span style={{ color:LT.muted2,flexShrink:0 }}><ChevRight/></span>
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
