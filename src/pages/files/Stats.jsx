import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'
import { supabase } from '../lib/supabase'

const COUNTRY_HE = {'UK':'בריטניה','Germany':'גרמניה','Netherlands':'הולנד','Spain':'ספרד','France':'צרפת','Italy':'איטליה','Hungary':'הונגריה','Czech':'צ׳כיה','Austria':'אוסטריה','Belgium':'בלגיה','Switzerland':'שווייץ','Poland':'פולין','Ukraine':'אוקראינה','Moldova':'מולדובה','Romania':'רומניה','Cyprus':'קפריסין','Jordan':'ירדן','Portugal':'פורטוגל','Greece':'יוון','Thailand':'תאילנד','Australia':'אוסטרליה','New Zealand':'ניו זילנד','Hong Kong':'הונג קונג','Canada':'קנדה','New York':'ניו יורק','California':'קליפורניה','Oregon':'אורגון','Nevada':'נבדה','Florida':'פלורידה','Massachusetts':'מסצ׳וסטס','Illinois':'אילינוי','Washington':'וושינגטון','Texas':'טקסס','Washington DC':'וושינגטון DC','Colorado':'קולורדו','Georgia':'ג׳ורג׳יה','Arizona':'אריזונה'}
function heCountry(c){return COUNTRY_HE[c]||c}
function daysBetween(a,b){if(!a||!b)return 0;return Math.round((new Date(b)-new Date(a))/(1000*60*60*24))}

const WORLD = {
  'אירופה': ['France','Spain','Italy','Germany','UK','Netherlands','Belgium','Switzerland','Austria','Portugal','Poland','Czech','Hungary','Greece','Romania','Ukraine','Sweden','Norway','Denmark','Finland','Ireland','Croatia','Slovenia','Slovakia','Bulgaria','Serbia','Bosnia','Albania','North Macedonia','Montenegro','Malta','Luxembourg','Iceland','Estonia','Latvia','Lithuania','Moldova','Cyprus','Belarus','Kosovo','Andorra','Liechtenstein','Monaco','San Marino','Vatican'],
  'אסיה': ['Thailand','Japan','China','India','Vietnam','Cambodia','Indonesia','Malaysia','Singapore','South Korea','Taiwan','Hong Kong','Philippines','Myanmar','Laos','Nepal','Sri Lanka','Jordan','UAE','Turkey','Georgia','Armenia','Azerbaijan','Uzbekistan','Kazakhstan','Bahrain','Kuwait','Qatar','Oman','Saudi Arabia','Lebanon','Iraq','Iran','Israel','Maldives','Bhutan','Mongolia','Bangladesh'],
  'ארה״ב — מדינות': ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming','Washington DC'],
  'אמריקה': ['Canada','Mexico','Brazil','Argentina','Colombia','Peru','Chile','Costa Rica','Panama','Cuba','Jamaica','Bahamas','Uruguay','Ecuador','Bolivia','Paraguay','Guatemala','Honduras','El Salvador','Nicaragua','Dominican Republic','Trinidad and Tobago','Belize'],
  'אפריקה': ['Morocco','Egypt','South Africa','Kenya','Tanzania','Ethiopia','Tunisia','Ghana','Nigeria','Senegal','Madagascar','Mozambique','Zimbabwe','Botswana','Namibia','Rwanda','Uganda'],
  'אוקיינוסיה': ['Australia','New Zealand','Fiji','Hawaii'],
}

export default function Stats({ session }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('years')
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('trips').select(`id, name, name_he, trip_segments(date_from, date_to, city, country, continent, segment_companions(companions(name)))`)
      if (data) {
        const enriched = data.map(t => {
          const segs = t.trip_segments||[]
          const dates = segs.map(s=>s.date_from).filter(Boolean).sort()
          const endDates = segs.map(s=>s.date_to).filter(Boolean).sort()
          return {
            ...t,
            startDate: dates[0]||null,
            endDate: endDates[endDates.length-1]||null,
            days: daysBetween(dates[0], endDates[endDates.length-1]),
            cities: [...new Set(segs.map(s=>s.city).filter(Boolean))],
            countries: [...new Set(segs.map(s=>s.country).filter(Boolean))],
            continents: [...new Set(segs.map(s=>s.continent).filter(Boolean))],
            companions: [...new Set(segs.flatMap(s=>s.segment_companions?.map(sc=>sc.companions?.name)||[]).filter(Boolean))],
            segs,
          }
        }).filter(t=>t.startDate && t.endDate < today)
        setTrips(enriched)
      }
      setLoading(false)
    }
    load()
  }, [])

  if(loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#9ca3af'}}>טוען...</div>

  const byYear = {}
  trips.forEach(t => {
    const y = t.startDate?.slice(0,4)
    if(!y) return
    if(!byYear[y]) byYear[y]={trips:[],countries:new Set(),cities:new Set(),continents:new Set()}
    byYear[y].trips.push(t)
    t.countries.forEach(c=>byYear[y].countries.add(c))
    t.cities.forEach(c=>byYear[y].cities.add(c))
    t.continents.forEach(c=>byYear[y].continents.add(c))
  })
  const years = Object.keys(byYear).sort().reverse()

  const countryCounts={}, countryDays={}, cityCounts={}, cityDays={}
  trips.forEach(t => {
    t.countries.forEach(c=>{countryCounts[c]=(countryCounts[c]||0)+1; countryDays[c]=(countryDays[c]||0)+t.days})
    t.cities.forEach(c=>{cityCounts[c]=(cityCounts[c]||0)+1; cityDays[c]=(cityDays[c]||0)+t.days})
  })
  const topCountries=Object.entries(countryCounts).sort((a,b)=>b[1]-a[1])
  const topCities=Object.entries(cityCounts).sort((a,b)=>b[1]-a[1])
  const maxCDays=Math.max(...Object.values(countryDays),1)
  const maxCityDays=Math.max(...Object.values(cityDays),1)

  const compStats={}
  trips.forEach(t=>t.companions.forEach(c=>{if(!compStats[c])compStats[c]={trips:0,days:0};compStats[c].trips++;compStats[c].days+=t.days}))
  const topComps=Object.entries(compStats).sort((a,b)=>b[1].days-a[1].days)

  const visitedCountries=new Set(trips.flatMap(t=>t.countries))

  const tabs=[{id:'years',label:'לפי שנים'},{id:'destinations',label:'לפי יעדים'},{id:'companions',label:'שותפים'},{id:'remaining',label:'נשאר עוד'}]

  return (
    <div style={S.page}>
            <BaronsHeader
        title="סטטיסטיקות"
        subtitle="נתוני נסיעות"
        breadcrumbs={[{ label: 'נסיעות', path: '/travels' }, { label: 'סטטיסטיקות' }]}
        tabs={[{ id: 'years', label: 'לפי שנים' }, { id: 'destinations', label: 'יעדים' }, { id: 'companions', label: 'שותפים' }, { id: 'remaining', label: 'נשאר עוד' }]}
        activeTab={tab}
        onTab={setTab}
        actions={[]}
      />

      <main style={S.main}>
        {tab==='years' && years.map(y=>{
          const yd=byYear[y]
          const totalDays=yd.trips.reduce((a,t)=>a+t.days,0)
          const ycDays={},ycVis={}
          yd.trips.forEach(t=>{t.countries.forEach(c=>ycDays[c]=(ycDays[c]||0)+t.days);t.cities.forEach(c=>ycVis[c]=(ycVis[c]||0)+1)})
          const topCDays=Object.entries(ycDays).sort((a,b)=>b[1]-a[1]).slice(0,3)
          const topCVis=Object.entries(ycVis).sort((a,b)=>b[1]-a[1]).slice(0,3)
          return(
            <div key={y} style={S.yearCard}>
              <div style={S.yearHeader}>
                <div style={S.yearNum}>{y}</div>
                <div style={{display:'flex',gap:'24px',flexWrap:'wrap'}}>
                  {[{n:yd.trips.length,l:'טיולים'},{n:yd.continents.size,l:'יבשות'},{n:yd.countries.size,l:'מדינות'},{n:yd.cities.size,l:'ערים'},{n:totalDays,l:'ימים'}].map(({n,l})=>(
                    <div key={l} style={{textAlign:'center'}}>
                      <div style={{fontSize:'24px',fontWeight:800,color:'white'}}>{n}</div>
                      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.8)'}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={S.yearBody}>
                <div style={{flex:1}}>
                  <div style={S.miniTitle}>מדינות — ימים</div>
                  {topCDays.map(([c,d])=><div key={c} style={S.miniRow}><span>{heCountry(c)}</span><span style={{fontWeight:700,color:'#3b82f6'}}>{d}י</span></div>)}
                </div>
                <div style={{flex:1}}>
                  <div style={S.miniTitle}>ערים — ביקורים</div>
                  {topCVis.map(([c,n])=><div key={c} style={S.miniRow}><span>{c}</span><span style={{fontWeight:700,color:'#3b82f6'}}>{n}×</span></div>)}
                </div>
                <div style={{flex:1}}>
                  <div style={S.miniTitle}>טיולים</div>
                  {yd.trips.map(t=><div key={t.id} style={{fontSize:'12px',color:'#6b7280',padding:'2px 0'}}>{t.name_he||t.name}</div>)}
                </div>
              </div>
            </div>
          )
        })}

        {tab==='destinations' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}}>
            {[
              {title:'מדינות — ביקורים',data:topCountries,maxV:topCountries[0]?.[1]||1,fmt:(c,n)=>({label:heCountry(c),val:`${n}×`})},
              {title:'מדינות — ימים',data:Object.entries(countryDays).sort((a,b)=>b[1]-a[1]).slice(0,15),maxV:maxCDays,fmt:(c,d)=>({label:heCountry(c),val:`${d}י`})},
              {title:'ערים — ביקורים',data:topCities.slice(0,15),maxV:topCities[0]?.[1]||1,fmt:(c,n)=>({label:c,val:`${n}×`})},
              {title:'ערים — ימים',data:Object.entries(cityDays).sort((a,b)=>b[1]-a[1]).slice(0,15),maxV:maxCityDays,fmt:(c,d)=>({label:c,val:`${d}י`})},
            ].map(({title,data,maxV,fmt})=>(
              <div key={title} style={S.card}>
                <h3 style={S.cardTitle}>{title}</h3>
                {data.map(([c,v],i)=>{
                  const{label,val}=fmt(c,v)
                  return(
                    <div key={c} style={S.rankRow}>
                      <span style={S.rankNum}>{i+1}</span>
                      <span style={{flex:1,fontSize:'13px'}}>{label}</span>
                      <div style={{width:'80px',height:'4px',background:'#f3f4f6',borderRadius:'2px',overflow:'hidden',margin:'0 8px'}}>
                        <div style={{height:'100%',background:'#3b82f6',width:`${Math.max(4,v/maxV*100)}%`,borderRadius:'2px'}}/>
                      </div>
                      <span style={{fontSize:'13px',fontWeight:700,color:'#3b82f6',minWidth:'36px',textAlign:'left'}}>{val}</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {tab==='companions' && (
          <div style={S.card}>
            <h3 style={S.cardTitle}>שותפים לדרך — לפי ימים</h3>
            {topComps.map(([name,stat],i)=>(
              <div key={name} style={{display:'flex',alignItems:'center',gap:'12px',padding:'13px 0',borderBottom:'1px solid #f3f4f6'}}>
                <span style={{fontSize:'14px',fontWeight:800,color:'#d1d5db',minWidth:'24px'}}>{i+1}</span>
                <span style={{flex:1,fontWeight:600,fontSize:'15px'}}>{name}</span>
                <span style={{fontSize:'13px',color:'#9ca3af'}}>{stat.trips} טיולים</span>
                <span style={{background:'#eff6ff',color:'#3b82f6',padding:'4px 14px',borderRadius:'20px',fontSize:'13px',fontWeight:700}}>{stat.days} ימים</span>
              </div>
            ))}
          </div>
        )}

        {tab==='remaining' && (
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            {Object.entries(WORLD).map(([cont,countries])=>{
              const remaining=countries.filter(c=>!visitedCountries.has(c))
              const visited=countries.filter(c=>visitedCountries.has(c))
              const pct=Math.round(visited.length/countries.length*100)
              return(
                <div key={cont} style={{...S.card,borderRight:`4px solid ${pct===100?'#10b981':pct>50?'#3b82f6':'#e5e7eb'}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                    <h3 style={{...S.cardTitle,marginBottom:0}}>{cont}</h3>
                    <span style={{fontSize:'13px',color:'#9ca3af'}}>{visited.length}/{countries.length} מדינות · {pct}%</span>
                  </div>
                  <div style={{width:'100%',height:'4px',background:'#f3f4f6',borderRadius:'2px',marginBottom:'14px'}}>
                    <div style={{height:'100%',background:'#3b82f6',width:`${pct}%`,borderRadius:'2px'}}/>
                  </div>
                  {remaining.length===0
                    ? <p style={{color:'#10b981',fontWeight:600,fontSize:'13px'}}>ביקרת בכולן!</p>
                    : <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                        {remaining.map(c=><span key={c} style={{background:'#fef3c7',color:'#92400e',padding:'3px 10px',borderRadius:'20px',fontSize:'12px'}}>{heCountry(c)}</span>)}
                      </div>
                  }
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

const S={
  page:{minHeight:'100vh',background:'#f0f4ff'},
  header:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 32px',background:'white',borderBottom:'1px solid #e5e7eb'},
  back:{background:'none',border:'none',color:'#1d4ed8',fontSize:'14px',fontWeight:700,fontFamily:'Heebo,sans-serif',cursor:'pointer'},
  title:{fontSize:'18px',fontWeight:700,color:'#111827'},
  tabBar:{display:'flex',background:'white',borderBottom:'1px solid #e5e7eb',padding:'0 32px'},
  tab:{background:'none',border:'none',padding:'14px 20px',fontSize:'14px',fontWeight:500,color:'#475569',cursor:'pointer',borderBottom:'2px solid transparent',fontFamily:'Heebo,sans-serif',transition:'all 0.2s'},
  tabActive:{color:'#3b82f6',borderBottomColor:'#3b82f6',fontWeight:700},
  main:{maxWidth:'1100px',margin:'0 auto',padding:'28px 24px'},
  yearCard:{background:'white',borderRadius:'14px',border:'1px solid #e5e7eb',marginBottom:'16px',overflow:'hidden',boxShadow:'0 1px 6px rgba(0,0,0,0.05)'},
  yearHeader:{display:'flex',alignItems:'center',gap:'40px',padding:'20px 28px',background:'linear-gradient(135deg,#0b1526,#1e40af)',flexWrap:'wrap'},
  yearNum:{fontSize:'36px',fontWeight:900,color:'white',minWidth:'60px'},
  yearBody:{display:'flex',gap:'24px',padding:'20px 28px',flexWrap:'wrap'},
  miniTitle:{fontSize:'11px',fontWeight:700,letterSpacing:'1px',color:'#64748b',marginBottom:'8px',textTransform:'uppercase'},
  miniRow:{display:'flex',justifyContent:'space-between',fontSize:'13px',color:'#1f2937',padding:'3px 0'},
  card:{background:'white',borderRadius:'14px',border:'1px solid #e5e7eb',padding:'20px',boxShadow:'0 1px 6px rgba(0,0,0,0.05)'},
  cardTitle:{fontSize:'14px',fontWeight:700,color:'#111827',marginBottom:'16px'},
  rankRow:{display:'flex',alignItems:'center',gap:'8px',padding:'7px 0',borderBottom:'1px solid #f9fafb'},
  rankNum:{fontSize:'12px',fontWeight:700,color:'#9ca3af',minWidth:'20px'},
}
