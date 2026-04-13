import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'
import { supabase } from '../lib/supabase'

const COUNTRY_HE = {'UK':'בריטניה','Germany':'גרמניה','Netherlands':'הולנד','Spain':'ספרד','France':'צרפת','Italy':'איטליה','Hungary':'הונגריה','Czech':'צ׳כיה','Austria':'אוסטריה','Belgium':'בלגיה','Switzerland':'שווייץ','Poland':'פולין','Ukraine':'אוקראינה','Romania':'רומניה','Cyprus':'קפריסין','Jordan':'ירדן','Portugal':'פורטוגל','Greece':'יוון','Thailand':'תאילנד','Australia':'אוסטרליה','New Zealand':'ניו זילנד','Canada':'קנדה','New York':'ניו יורק','California':'קליפורניה','Oregon':'אורגון','Nevada':'נבדה','Florida':'פלורידה','Massachusetts':'מסצ׳וסטס','Illinois':'אילינוי','Washington':'וושינגטון','Texas':'טקסס','Washington DC':'וושינגטון DC','Colorado':'קולורדו','Georgia':'ג׳ורג׳יה','Arizona':'אריזונה','Tennessee':'טנסי','North Carolina':'צפון קרוליינה','Minnesota':'מינסוטה','Michigan':'מישיגן','Pennsylvania':'פנסילבניה','Maryland':'מרילנד','Louisiana':'לואיזיאנה','Hawaii':'הוואי','Utah':'יוטה','Missouri':'מיזורי'}
const CITY_HE = {'Bangkok':'בנגקוק','London':'לונדון','Paris':'פריז','Amsterdam':'אמסטרדם','Barcelona':'ברצלונה','New York City':'ניו יורק','Berlin':'ברלין','Budapest':'בודפשט','Prague':'פראג','Madrid':'מדריד','Rome':'רומא','Vienna':'וינה','Brussels':'בריסל','Portland':'פורטלנד','San Francisco':'סן פרנסיסקו','Los Angeles':'לוס אנג׳לס','Las Vegas':'לאס וגאס','Miami':'מיאמי','Sydney':'סידני','Chicago':'שיקגו','Munich':'מינכן','Phuket':'פוקט','Lisbon':'ליסבון','Warsaw':'ורשה','Kyiv':'קייב','Atlanta':'אטלנטה','Tel Aviv-Yafo':'תל אביב','Newark':'ניוארק'}

// Hebrew → English for search
const HE_CITY_TO_EN = Object.fromEntries(Object.entries(CITY_HE).map(([en,he])=>[he,en]))
const HE_COUNTRY_TO_EN = Object.fromEntries(Object.entries(COUNTRY_HE).map(([en,he])=>[he,en]))

function heCountry(c){return COUNTRY_HE[c]||c}
function heCity(c){return CITY_HE[c]||c}
function daysBetween(a,b){if(!a||!b)return 0;return Math.round((new Date(b)-new Date(a))/(1000*60*60*24))}
function fmtDate(d){if(!d)return'';return new Date(d+'T12:00:00').toLocaleDateString('he-IL',{day:'numeric',month:'short',year:'numeric'})}

const inp={width:'100%',border:'1.5px solid #cbd5e1',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',fontFamily:'Open Sans,sans-serif',color:'#1e293b',outline:'none',boxSizing:'border-box'}

export default function Search({session}){
  const[trips,setTrips]=useState([])
  const[loading,setLoading]=useState(true)
  const[country,setCountry]=useState('')
  const[city,setCity]=useState('')
  const[year,setYear]=useState('')
  const[companion,setCompanion]=useState('')
  const[quickSearch,setQuickSearch]=useState('')
  const[companions,setCompanions]=useState([])
  const[countries,setCountries]=useState([])
  const navigate=useNavigate()

  useEffect(()=>{
    async function load(){
      const[tripsRes,compRes]=await Promise.all([
        supabase.from('trips').select(`id,name,name_he,trip_segments(date_from,date_to,city,country,continent,segment_companions(companions(name)))`),
        // Only companions with at least one segment
        supabase.from('companions').select('name').order('name'),
      ])
      const enriched=(tripsRes.data||[]).map(t=>{
        const segs=t.trip_segments||[]
        const dates=segs.map(s=>s.date_from).filter(Boolean).sort()
        const ends=segs.map(s=>s.date_to).filter(Boolean).sort()
        const comps=[...new Set(segs.flatMap(s=>s.segment_companions?.map(sc=>sc.companions?.name)||[]).filter(Boolean))]
        return{
          ...t,
          startDate:dates[0]||null,
          endDate:ends[ends.length-1]||null,
          cities:[...new Set(segs.map(s=>s.city).filter(Boolean))],
          countries:[...new Set(segs.map(s=>s.country).filter(Boolean))],
          companions: comps,
        }
      }).filter(t=>t.startDate).sort((a,b)=>b.startDate.localeCompare(a.startDate))
      setTrips(enriched)
      setCountries([...new Set(enriched.flatMap(t=>t.countries))].sort())
      // Only companions that appear in at least one trip
      const usedComps=new Set(enriched.flatMap(t=>t.companions))
      setCompanions((compRes.data||[]).map(c=>c.name).filter(n=>usedComps.has(n)).sort())
      setLoading(false)
    }
    load()
  },[])

  const hasFilter=country||city||year||companion||quickSearch

  function matchesQuick(t,q){
    if(!q)return true
    const ql=q.toLowerCase()
    // Try Hebrew → English mapping
    const enCity=HE_CITY_TO_EN[q]||''
    const enCountry=HE_COUNTRY_TO_EN[q]||''
    const all=[
      t.name_he||'', t.name||'',
      ...t.countries, ...t.countries.map(heCountry),
      ...t.cities, ...t.cities.map(heCity),
      ...t.companions,
    ].join(' ').toLowerCase()
    return all.includes(ql)||(enCity&&all.includes(enCity.toLowerCase()))||(enCountry&&all.includes(enCountry.toLowerCase()))
  }

  const results=trips.filter(t=>{
    if(quickSearch && !matchesQuick(t,quickSearch))return false
    if(country && !t.countries.includes(country))return false
    if(year && t.startDate?.slice(0,4)!==year)return false
    if(companion && !t.companions.includes(companion))return false
    if(city){
      const cl=city.toLowerCase()
      const enCity=(HE_CITY_TO_EN[city]||'').toLowerCase()
      const match=t.cities.some(c=>c.toLowerCase().includes(cl)||c.toLowerCase().includes(enCity)||heCity(c).toLowerCase().includes(cl))
      if(!match)return false
    }
    return true
  })
  const displayList=hasFilter?results:trips
  const totalDays=displayList.reduce((a,t)=>a+(daysBetween(t.startDate,t.endDate)||0),0)

  function exportCSV(){
    const rows=[
      ['שנה','מתאריך','עד תאריך','שם הטיול','מדינות','ערים','עם מי','ימים'],
      ...displayList.map(t=>[
        t.startDate?.slice(0,4)||'',t.startDate||'',t.endDate||'',
        t.name_he||t.name,
        t.countries.map(heCountry).join('; '),
        t.cities.map(heCity).join('; '),
        t.companions.join('; '),
        daysBetween(t.startDate,t.endDate)||0,
      ])
    ]
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a');a.href=url;a.download='barons_trips.csv';a.click()
    URL.revokeObjectURL(url)
  }

  function exportPrint(){
    const win=window.open('','_blank')
    win.document.write(`<html dir="rtl"><head><meta charset="UTF-8"><title>BARONS</title>
      <style>body{font-family:Arial,sans-serif;direction:rtl;padding:20px;color:#1e293b}
      h1{font-size:20px}table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#1e40af;color:white;padding:8px;text-align:right}
      td{padding:8px;border-bottom:1px solid #e2e8f0}
      tr:nth-child(even)td{background:#f8fafc}</style></head><body>
      <button onclick="window.print()" style="margin-bottom:16px;padding:8px 16px;background:#1e40af;color:white;border:none;border-radius:6px;cursor:pointer">הדפס / שמור PDF</button>
      <h1>BARONS — ${hasFilter?`תוצאות (${displayList.length})`:`כל הטיולים (${displayList.length})`}</h1>
      <table><tr><th>שנה</th><th>מתאריך</th><th>עד תאריך</th><th>שם הטיול</th><th>מדינות</th><th>עם מי</th><th>ימים</th></tr>
      ${displayList.map(t=>`<tr><td>${t.startDate?.slice(0,4)||''}</td><td>${t.startDate||''}</td><td>${t.endDate||''}</td>
      <td><strong>${t.name_he||t.name}</strong></td><td>${t.countries.map(heCountry).join(', ')}</td>
      <td>${t.companions.join(', ')}</td><td style="text-align:center;font-weight:700">${daysBetween(t.startDate,t.endDate)||'—'}</td></tr>`).join('')}
      </table></body></html>`)
    win.document.close()
  }

  const years=[...new Set(trips.map(t=>t.startDate?.slice(0,4)).filter(Boolean))].sort().reverse()

  return(
    <div style={S.page}>
            <BaronsHeader
        title="חיפוש נסיעות"
        breadcrumbs={[{ label: 'נסיעות', path: '/travels' }, { label: 'חיפוש' }]}
        actions={[{ label: 'PDF', onClick: () => exportPDF && exportPDF() }]}
      />

      <main style={S.main}>
        <h1 style={{fontSize:'24px',fontWeight:800,color:'#1e293b',marginBottom:'20px'}}>חיפוש מתקדם</h1>

        {/* Quick search */}
        <div style={{position:'relative',marginBottom:'16px'}}>
          <span style={{position:'absolute',right:'14px',top:'50%',transform:'translateY(-50%)',fontSize:'16px',pointerEvents:'none'}}>🔍</span>
          <input
            style={{...inp,paddingRight:'42px',fontSize:'15px',borderRadius:'10px'}}
            placeholder="חיפוש חופשי — עברית או אנגלית (מדינה, עיר, שם טיול, נוסע...)"
            value={quickSearch}
            onChange={e=>setQuickSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Filters */}
        <div style={S.filtersBox}>
          <div style={{fontSize:'11px',fontWeight:700,color:'#64748b',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'1px'}}>סינון מדויק</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'14px'}}>
            <div>
              <label style={S.lbl}>מדינה</label>
              <select style={inp} value={country} onChange={e=>setCountry(e.target.value)}>
                <option value="">כל המדינות</option>
                {countries.map(c=><option key={c} value={c}>{heCountry(c)}</option>)}
              </select>
            </div>
            <div>
              <label style={S.lbl}>עיר</label>
              <input style={inp} value={city} onChange={e=>setCity(e.target.value)} placeholder="עברית או אנגלית"/>
            </div>
            <div>
              <label style={S.lbl}>שנה</label>
              <select style={inp} value={year} onChange={e=>setYear(e.target.value)}>
                <option value="">כל השנים</option>
                {years.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={S.lbl}>עם מי</label>
              <select style={inp} value={companion} onChange={e=>setCompanion(e.target.value)}>
                <option value="">כולם</option>
                {companions.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {hasFilter&&<button style={{marginTop:'12px',background:'none',border:'1px solid #cbd5e1',color:'#64748b',padding:'6px 16px',borderRadius:'8px',fontSize:'13px',cursor:'pointer'}} onClick={()=>{setCountry('');setCity('');setYear('');setCompanion('');setQuickSearch('')}}>נקה סינון</button>}
        </div>

        {/* Summary + export */}
        {!loading&&(
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px',flexWrap:'wrap',gap:'8px'}}>
            <div style={{fontSize:'14px',color:'#475569'}}>
              {hasFilter?`נמצאו ${displayList.length} טיולים`:`כל הטיולים — ${displayList.length}`}
              {totalDays>0&&<span style={{marginRight:'12px',color:'#1d4ed8',fontWeight:600}}>{totalDays} ימים סה״כ</span>}
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={exportCSV} style={S.exportBtn}>⬇ Excel / CSV</button>
              <button onClick={exportPrint} style={S.exportBtn}>🖨 PDF</button>
            </div>
          </div>
        )}

        {loading?<div style={{textAlign:'center',color:'#64748b',padding:'60px'}}>טוען...</div>:(
          <div style={S.table}>
            <div style={S.tableHdr}>
              <span>שנה</span><span>מתאריך</span><span>עד תאריך</span><span>שם הטיול</span><span>יעדים</span><span>עם מי</span><span style={{textAlign:'center'}}>ימים</span>
            </div>
            {displayList.map((t,i)=>(
              <div key={t.id}
                style={{display:'grid',gridTemplateColumns:'50px 100px 100px 1fr 140px 140px 50px',padding:'11px 20px',borderBottom:'1px solid #f1f5f9',cursor:'pointer',gap:'12px',alignItems:'center',background:i%2===0?'white':'#fafbff'}}
                onClick={()=>navigate(`/travels/${t.id}`)}
                onMouseEnter={e=>e.currentTarget.style.background='#eff6ff'}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'white':'#fafbff'}
              >
                <div style={{fontSize:'13px',fontWeight:700,color:'#4338ca'}}>{t.startDate?.slice(0,4)}</div>
                <div style={{fontSize:'12px',color:'#334155',direction:'rtl'}}>{fmtDate(t.startDate)}</div>
                <div style={{fontSize:'12px',color:'#334155',direction:'rtl'}}>{fmtDate(t.endDate)}</div>
                <div style={{fontSize:'14px',fontWeight:600,color:'#1e293b'}}>{t.name_he||t.name}</div>
                <div style={{fontSize:'12px',color:'#334155'}}>{t.countries.map(heCountry).slice(0,2).join(' · ')}</div>
                <div style={{fontSize:'12px',color:'#4338ca',fontWeight:500}}>{t.companions.slice(0,2).join(', ')}{t.companions.length>2?` +${t.companions.length-2}`:''}</div>
                <div style={{textAlign:'center',fontSize:'13px',fontWeight:700,color:'#475569'}}>{daysBetween(t.startDate,t.endDate)||'—'}</div>
              </div>
            ))}
            {displayList.length===0&&<div style={{padding:'40px',textAlign:'center',color:'#94a3b8'}}>לא נמצאו תוצאות</div>}
          </div>
        )}
      </main>
    </div>
  )
}

const S={
  page:{minHeight:'100vh',background:'#f0f4ff'},
  header:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 24px',background:'white',borderBottom:'1px solid #e2e8f0',boxShadow:'0 1px 6px rgba(0,0,0,0.05)'},
  crumb:{background:'none',border:'none',color:'#1d4ed8',fontSize:'13px',fontWeight:600,cursor:'pointer',padding:'2px 0'},
  logoutBtn:{background:'none',border:'1px solid #cbd5e1',color:'#475569',padding:'6px 14px',borderRadius:'8px',fontSize:'13px',cursor:'pointer'},
  main:{maxWidth:'1100px',margin:'0 auto',padding:'28px 24px'},
  filtersBox:{background:'white',border:'1px solid #e2e8f0',borderRadius:'12px',padding:'18px',marginBottom:'20px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'},
  lbl:{display:'block',fontSize:'12px',fontWeight:700,color:'#475569',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'1px'},
  exportBtn:{background:'white',border:'1.5px solid #1d4ed8',color:'#1d4ed8',padding:'7px 14px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'Open Sans,sans-serif'},
  table:{background:'white',border:'1px solid #e2e8f0',borderRadius:'14px',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'},
  tableHdr:{display:'grid',gridTemplateColumns:'50px 100px 100px 1fr 140px 140px 50px',padding:'11px 20px',background:'#f8fafc',borderBottom:'2px solid #e2e8f0',gap:'12px',fontSize:'11px',fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:'1px'},
}
