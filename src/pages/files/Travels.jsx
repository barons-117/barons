import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'
import { supabase } from '../lib/supabase'

const COUNTRY_HE = {'UK':'בריטניה','Germany':'גרמניה','Netherlands':'הולנד','Spain':'ספרד','France':'צרפת','Italy':'איטליה','Hungary':'הונגריה','Czech':'צ׳כיה','Austria':'אוסטריה','Belgium':'בלגיה','Switzerland':'שווייץ','Poland':'פולין','Ukraine':'אוקראינה','Moldova':'מולדובה','Romania':'רומניה','Cyprus':'קפריסין','Jordan':'ירדן','Portugal':'פורטוגל','Greece':'יוון','Thailand':'תאילנד','Australia':'אוסטרליה','New Zealand':'ניו זילנד','Canada':'קנדה','New York':'ניו יורק','California':'קליפורניה','Oregon':'אורגון','Nevada':'נבדה','Florida':'פלורידה','Massachusetts':'מסצ׳וסטס','Illinois':'אילינוי','Washington':'וושינגטון','Texas':'טקסס','Washington DC':'וושינגטון DC'}
const CITY_HE = {'Bangkok':'בנגקוק','London':'לונדון','Paris':'פריז','Berlin':'ברלין','New York City':'ניו יורק','Portland':'פורטלנד','San Francisco':'סן פרנסיסקו','Amsterdam':'אמסטרדם','Budapest':'בודפשט','Vienna':'וינה','Brussels':'בריסל','Barcelona':'ברצלונה','Madrid':'מדריד','Rome':'רומא','Phuket':'פוקט'}

const HE_TO_EN = {}
Object.entries(COUNTRY_HE).forEach(([en,he])=>{HE_TO_EN[he]=en})
Object.entries(CITY_HE).forEach(([en,he])=>{HE_TO_EN[he]=en})

function heCountry(c){return COUNTRY_HE[c]||c}
function fmtDate(d,opts){if(!d)return'';return new Date(d).toLocaleDateString('he-IL',opts||{day:'numeric',month:'short',year:'numeric'})}
function fmtShort(d){return fmtDate(d,{day:'numeric',month:'short'})}
function daysBetween(a,b){if(!a||!b)return null;return Math.round((new Date(b)-new Date(a))/(1000*60*60*24))}

const inp = {width:'100%',border:'1.5px solid #cbd5e1',borderRadius:'8px',padding:'11px 14px',fontSize:'14px',fontFamily:'Open Sans,sans-serif',color:'#1e293b',outline:'none',boxSizing:'border-box'}

function AddTripModal({onClose, onCreated}) {
  const [form, setForm] = useState({name:'', name_he:'', start_date:'', end_date:'', city:'', country:''})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  function set(k,v){setForm(f=>({...f,[k]:v}))}

  async function save() {
    if (!form.name_he && !form.name) return
    setLoading(true)
    // Create trip
    const {data: trip} = await supabase.from('trips').insert({
      name: form.name || form.name_he,
      name_he: form.name_he || form.name,
    }).select().single()
    if (trip && form.city) {
      // Create first segment
      await supabase.from('trip_segments').insert({
        trip_id: trip.id,
        city: form.city,
        country: form.country,
        date_from: form.start_date || null,
        date_to: form.end_date || null,
      })
    }
    setLoading(false)
    onCreated()
    if (trip) navigate(`/travels/${trip.id}`)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(6px)',zIndex:200}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'18px',padding:'36px',width:'480px',maxWidth:'95vw',boxShadow:'0 24px 80px rgba(0,0,0,0.25)'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'28px'}}>
          <h2 style={{fontSize:'20px',fontWeight:800,color:'#1e293b'}}>נסיעה חדשה</h2>
          <button style={{background:'none',border:'none',fontSize:'22px',color:'#94a3b8',cursor:'pointer'}} onClick={onClose}>✕</button>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          <div>
            <label style={LBL}>שם הנסיעה (עברית)</label>
            <input style={inp} value={form.name_he} onChange={e=>set('name_he',e.target.value)} placeholder="למשל: בנגקוק עם רועי 2026" autoFocus />
          </div>
          <div>
            <label style={LBL}>שם הנסיעה (אנגלית)</label>
            <input style={inp} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Bangkok with Roy 2026" />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
            <div>
              <label style={LBL}>תאריך יציאה</label>
              <input style={inp} type="date" value={form.start_date} onChange={e=>set('start_date',e.target.value)} />
            </div>
            <div>
              <label style={LBL}>תאריך חזרה</label>
              <input style={inp} type="date" value={form.end_date} onChange={e=>set('end_date',e.target.value)} />
            </div>
          </div>
          <div style={{background:'#f8fafc',borderRadius:'10px',padding:'16px'}}>
            <div style={{fontSize:'12px',fontWeight:700,color:'#64748b',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'1px'}}>יעד ראשון (אפשרי)</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div>
                <label style={LBL}>עיר</label>
                <input style={inp} value={form.city} onChange={e=>set('city',e.target.value)} placeholder="Bangkok" />
              </div>
              <div>
                <label style={LBL}>מדינה</label>
                <input style={inp} value={form.country} onChange={e=>set('country',e.target.value)} placeholder="Thailand" />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={save}
          disabled={loading || (!form.name_he && !form.name)}
          style={{width:'100%',marginTop:'24px',background:'#1d4ed8',border:'none',color:'white',padding:'14px',borderRadius:'10px',fontSize:'16px',fontWeight:700,cursor:'pointer',fontFamily:'Open Sans,sans-serif',opacity:(!form.name_he && !form.name)?0.4:1}}
        >
          {loading ? 'יוצר...' : 'צור נסיעה ➜'}
        </button>
      </div>
    </div>
  )
}

const LBL = {display:'block',fontSize:'12px',fontWeight:600,color:'#475569',marginBottom:'5px'}

export default function Travels({ session }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  async function loadTrips() {
    const [tripsRes, flightsRes, lodgingRes] = await Promise.all([
      supabase.from('trips').select(`id, name, name_he, trip_segments(date_from, date_to, city, country, continent, segment_companions(companions(name)))`),
      supabase.from('flights').select('trip_id'),
      supabase.from('lodging').select('trip_id'),
    ])
    const tripsWithFlights = new Set((flightsRes.data||[]).map(f=>f.trip_id))
    const tripsWithLodging = new Set((lodgingRes.data||[]).map(l=>l.trip_id))
    if (tripsRes.data) {
      const enriched = tripsRes.data.map(t => {
        const segs = t.trip_segments||[]
        const dates = segs.map(s=>s.date_from).filter(Boolean).sort()
        const ends = segs.map(s=>s.date_to).filter(Boolean).sort()
        return {
          ...t,
          startDate: dates[0]||null,
          endDate: ends[ends.length-1]||null,
          cities: [...new Set(segs.map(s=>s.city).filter(Boolean))],
          countries: [...new Set(segs.map(s=>s.country).filter(Boolean))],
          companions: [...new Set(segs.flatMap(s=>s.segment_companions?.map(sc=>sc.companions?.name)||[]).filter(Boolean))],
          hasFlights: tripsWithFlights.has(t.id),
          hasLodging: tripsWithLodging.has(t.id),
        }
      }).filter(t=>t.startDate).sort((a,b)=>a.startDate.localeCompare(b.startDate))
      setTrips(enriched)
    }
    setLoading(false)
  }

  useEffect(()=>{loadTrips()},[])

  const past = trips.filter(t=>t.endDate && t.endDate < today)
  const upcoming = trips.filter(t=>t.startDate >= today)
  const totalDays = past.reduce((acc,t)=>acc+(daysBetween(t.startDate,t.endDate)||0),0)
  const countries = new Set(trips.flatMap(t=>t.countries)).size

  function matchesSearch(t, q) {
    if (!q) return true
    const ql = q.toLowerCase()
    const enTerm = (HE_TO_EN[q]||'').toLowerCase()
    const all = [t.name_he||'', t.name||'', ...t.countries, ...t.countries.map(heCountry), ...t.cities, ...t.cities.map(c=>CITY_HE[c]||c), ...t.companions].join(' ').toLowerCase()
    return all.includes(ql) || (enTerm && all.includes(enTerm))
  }

  const q = search.trim()
  const filtered = q ? past.filter(t=>matchesSearch(t,q)) : null
  const displayList = filtered || [...past].reverse()

  return (
    <div style={S.page}>
      {showAdd && <AddTripModal onClose={()=>setShowAdd(false)} onCreated={loadTrips}/>}

            <BaronsHeader
        title="נסיעות"
        subtitle="יומן הטיולים שלי"
        breadcrumbs={[{ label: 'נסיעות', path: '/travels' }]}
        actions={[{ label: 'סטטיסטיקות', onClick: () => navigate('/stats') }, { label: '+ טיול', onClick: () => setShowAdd(true), primary: true }]}
      />

      <main style={S.main}>
        <div style={S.topRow}>
          <h1 style={S.title}>הנסיעות שלי</h1>
          <div style={S.searchRow}>
            <div style={S.searchWrap}>
              <span style={S.searchIcon}>🔍</span>
              <input style={S.searchInput} placeholder="חיפוש — עברית או אנגלית..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <button style={S.advBtn} onClick={()=>navigate('/search')}>חיפוש מתקדם</button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={S.statsBar}>
          {[{v:past.length,l:'טיולים'},{v:countries,l:'מדינות'},{v:Math.round(totalDays),l:'ימים בחו״ל'},{v:upcoming.length,l:'קרובים',accent:true}].map(({v,l,accent},i)=>(
            <div key={l} style={{display:'flex',flex:1,alignItems:'center',justifyContent:'center',gap:i<3?undefined:undefined}}>
              {i>0&&<div style={{width:'1px',background:'#e2e8f0',alignSelf:'stretch',margin:'12px 0'}}/>}
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:'34px',fontWeight:800,color:accent?'#d97706':'#1d4ed8'}}>{v}</div>
                <div style={{fontSize:'12px',fontWeight:600,color:'#475569',marginTop:'2px'}}>{l}</div>
              </div>
            </div>
          ))}
        </div>

        {loading ? <div style={{textAlign:'center',color:'#64748b',padding:'60px',fontSize:'16px'}}>טוען...</div> : (
          <>
            {upcoming.length>0 && !q && (
              <section style={S.section}>
                <div style={S.secTitle}>קרובים</div>
                <div style={S.grid}>{upcoming.map((t,i)=><TripCard key={t.id} trip={t} upcoming/>)}</div>
              </section>
            )}
            {!q && (
              <section style={S.section}>
                <div style={S.secTitle}>אחרונים</div>
                <div style={S.grid}>{[...past].reverse().slice(0,3).map((t,i)=><TripCard key={t.id} trip={t}/>)}</div>
              </section>
            )}
            <section style={S.section}>
              <div style={S.secTitle}>{q?`תוצאות (${displayList.length})`:`כל הטיולים — ${past.length}`}</div>
              <div style={S.table}>
                <div style={S.tableHdr}>
                  <span>שנה</span><span>מתאריך</span><span>עד תאריך</span><span>שם הטיול</span><span>יעדים</span><span>עם מי</span><span style={{textAlign:'center'}}>ימים</span><span></span>
                </div>
                {displayList.map((t,i)=><TripRow key={t.id} trip={t} index={i} onClick={()=>navigate(`/travels/${t.id}`)}/>)}
                {displayList.length===0&&<div style={{padding:'40px',textAlign:'center',color:'#64748b'}}>לא נמצאו תוצאות</div>}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function TripCard({trip, upcoming}) {
  const navigate = useNavigate()
  const days = daysBetween(trip.startDate, trip.endDate)
  return (
    <div
      style={{background:'white',padding:'22px',cursor:'pointer',borderRadius:'14px',border:'1px solid #e2e8f0',borderTop:`3px solid ${upcoming?'#d97706':'#1d4ed8'}`,transition:'all 0.2s',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}
      onClick={()=>navigate(`/travels/${trip.id}`)}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 10px 30px rgba(0,0,0,0.1)'}}
      onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.05)'}}
    >
      {upcoming&&<div style={{fontSize:'11px',fontWeight:700,color:'#d97706',letterSpacing:'1px',marginBottom:'8px',textTransform:'uppercase'}}>קרוב</div>}
      <h3 style={{fontSize:'16px',fontWeight:700,color:'#1e293b',marginBottom:'10px',lineHeight:1.3}}>{trip.name_he||trip.name}</h3>
      <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap',marginBottom:'8px'}}>
        <span style={{fontSize:'13px',color:'#475569'}}>{fmtDate(trip.startDate,{day:'numeric',month:'short',year:'numeric'})} — {fmtShort(trip.endDate)}</span>
        {days&&<span style={{background:'#dbeafe',color:'#1e40af',padding:'2px 9px',borderRadius:'10px',fontSize:'12px',fontWeight:700}}>{days} ימים</span>}
      </div>
      <div style={{fontSize:'12px',color:'#475569',marginBottom:'6px'}}>{trip.countries.map(heCountry).join(' · ')}</div>
      {trip.companions.length>0&&<div style={{fontSize:'12px',color:'#4338ca',fontWeight:500}}>{trip.companions.slice(0,3).join(', ')}</div>}
      <div style={{display:'flex',gap:'6px',marginTop:'10px'}}>
        {!trip.hasFlights&&<span style={{fontSize:'11px',background:'#fff7ed',color:'#c2410c',padding:'2px 8px',borderRadius:'10px',border:'1px solid #fed7aa',fontWeight:600}}>אין טיסות</span>}
        {!trip.hasLodging&&<span style={{fontSize:'11px',background:'#f0fdf4',color:'#15803d',padding:'2px 8px',borderRadius:'10px',border:'1px solid #bbf7d0',fontWeight:600}}>אין לינה</span>}
      </div>
    </div>
  )
}

function TripRow({trip, onClick, index}) {
  const days = daysBetween(trip.startDate, trip.endDate)
  return (
    <div
      style={{display:'grid',gridTemplateColumns:'50px 100px 100px 1fr 130px 130px 50px 50px',padding:'12px 20px',borderBottom:'1px solid #f1f5f9',cursor:'pointer',gap:'12px',alignItems:'center',background:index%2===0?'white':'#fafbff',transition:'background 0.1s'}}
      onClick={onClick}
      onMouseEnter={e=>e.currentTarget.style.background='#eff6ff'}
      onMouseLeave={e=>e.currentTarget.style.background=index%2===0?'white':'#fafbff'}
    >
      <div style={{fontSize:'13px',fontWeight:700,color:'#4338ca'}}>{trip.startDate?.slice(0,4)}</div>
      <div style={{fontSize:'12px',color:'#334155'}}>{fmtShort(trip.startDate)}</div>
      <div style={{fontSize:'12px',color:'#334155'}}>{fmtShort(trip.endDate)}</div>
      <div style={{fontSize:'14px',fontWeight:600,color:'#1e293b'}}>{trip.name_he||trip.name}</div>
      <div style={{fontSize:'12px',color:'#334155'}}>{trip.countries.map(heCountry).slice(0,2).join(' · ')}</div>
      <div style={{fontSize:'12px',color:'#4338ca',fontWeight:500}}>{trip.companions.slice(0,2).join(', ')}{trip.companions.length>2?` +${trip.companions.length-2}`:''}</div>
      <div style={{textAlign:'center',fontSize:'13px',fontWeight:700,color:days>14?'#d97706':days>7?'#1d4ed8':'#475569'}}>{days||'—'}</div>
      <div style={{display:'flex',gap:'4px',justifyContent:'center'}}>
        {!trip.hasFlights&&<span title="אין טיסות" style={{fontSize:'14px'}}>✈️</span>}
        {!trip.hasLodging&&<span title="אין לינה" style={{fontSize:'14px'}}>🏨</span>}
      </div>
    </div>
  )
}

const S = {
  page:{minHeight:'100vh',background:'#f0f4ff'},
  header:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 32px',background:'white',borderBottom:'1px solid #e2e8f0',boxShadow:'0 1px 8px rgba(0,0,0,0.06)'},
  back:{background:'none',border:'none',color:'#1d4ed8',fontSize:'14px',fontWeight:700,cursor:'pointer'},
  crumbBtn:{background:'none',border:'none',color:'#1d4ed8',fontSize:'13px',fontWeight:600,cursor:'pointer',padding:'2px 0'},
  statsBtn:{background:'#f1f5f9',border:'1px solid #cbd5e1',color:'#334155',padding:'7px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'},
  addBtn:{background:'#1d4ed8',border:'none',color:'white',padding:'8px 18px',borderRadius:'8px',fontSize:'13px',fontWeight:700,cursor:'pointer'},
  logoutBtn:{background:'none',border:'1px solid #cbd5e1',color:'#475569',padding:'6px 16px',borderRadius:'8px',fontSize:'13px',cursor:'pointer'},
  main:{maxWidth:'1100px',margin:'0 auto',padding:'28px 24px'},
  topRow:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px',flexWrap:'wrap',gap:'16px'},
  title:{fontSize:'26px',fontWeight:800,color:'#1e293b'},
  searchRow:{display:'flex',gap:'10px',alignItems:'center'},
  searchWrap:{position:'relative'},
  searchIcon:{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',fontSize:'14px'},
  searchInput:{border:'1.5px solid #cbd5e1',borderRadius:'8px',padding:'9px 36px 9px 14px',fontSize:'14px',outline:'none',width:'240px',background:'white',color:'#1e293b'},
  advBtn:{background:'white',border:'1.5px solid #1d4ed8',color:'#1d4ed8',padding:'9px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'},
  statsBar:{display:'flex',background:'white',borderRadius:'14px',marginBottom:'36px',boxShadow:'0 2px 12px rgba(0,0,0,0.07)',border:'1px solid #e2e8f0',overflow:'hidden'},
  section:{marginBottom:'36px'},
  secTitle:{fontSize:'11px',fontWeight:700,letterSpacing:'2px',color:'#475569',marginBottom:'14px',textTransform:'uppercase'},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'14px'},
  table:{background:'white',border:'1px solid #e2e8f0',borderRadius:'14px',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'},
  tableHdr:{display:'grid',gridTemplateColumns:'50px 100px 100px 1fr 130px 130px 50px 50px',padding:'11px 20px',background:'#f8fafc',borderBottom:'2px solid #e2e8f0',gap:'12px',fontSize:'11px',fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:'1px'},
}
