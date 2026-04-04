import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CITY_HE = {
  'Tel Aviv-Yafo':'תל אביב','Tel Aviv':'תל אביב',
  'London':'לונדון','Paris':'פריז','Amsterdam':'אמסטרדם','Barcelona':'ברצלונה',
  'Bangkok':'בנגקוק','New York City':'ניו יורק','Berlin':'ברלין','Budapest':'בודפשט',
  'Prague':'פראג','Madrid':'מדריד','Rome':'רומא','Vienna':'וינה','Brussels':'בריסל',
  'Portland':'פורטלנד','San Francisco':'סן פרנסיסקו','Los Angeles':'לוס אנג׳לס',
  'Las Vegas':'לאס וגאס','Miami':'מיאמי','Sydney':'סידני','Chicago':'שיקגו',
  'Munich':'מינכן','Phuket':'פוקט','Lisbon':'ליסבון','Warsaw':'ורשה',
  'Newark':'ניוארק','Houston':'יוסטון','Seattle':'סיאטל','Vancouver':'ונקובר',
  'Toronto':'טורונטו','Montreal':'מונטריאול','Boston':'בוסטון','Auckland':'אוקלנד',
  'Dublin':'דבלין','Stockholm':'סטוקהולם','Copenhagen':'קופנהגן','Oslo':'אוסלו',
  'Athens':'אתונה','Bucharest':'בוקרשט','Atlanta':'אטלנטה','Dallas':'דאלאס',
  'Denver':'דנוור','Orlando':'אורלנדו','Minneapolis':'מיניאפוליס','Detroit':'דטרויט',
  'Phoenix':'פיניקס','San Diego':'סן דייגו','Philadelphia':'פילדלפיה',
  'Charlotte':'שרלוט','New Orleans':'ניו אורלינס','Nashville':'נאשוויל',
  'Salt Lake City':'סולט לייק סיטי','Austin':'אוסטין','Singapore':'סינגפור',
  'Tokyo':'טוקיו','Hong Kong':'הונג קונג','Seoul':'סיאול','Kyiv':'קייב',
  'Kiev':'קייב','Shanghai':'שנגחאי','Beijing':'בייג׳ינג',
}
const COUNTRY_HE = {
  'UK':'בריטניה','Germany':'גרמניה','Netherlands':'הולנד','Spain':'ספרד','France':'צרפת',
  'Italy':'איטליה','Hungary':'הונגריה','Czech':'צ׳כיה','Austria':'אוסטריה','Belgium':'בלגיה',
  'Switzerland':'שווייץ','Poland':'פולין','Thailand':'תאילנד','Australia':'אוסטרליה',
  'Jordan':'ירדן','Portugal':'פורטוגל','Greece':'יוון','Canada':'קנדה','IL':'ישראל',
  'New York':'ניו יורק','California':'קליפורניה','Oregon':'אורגון','Nevada':'נבדה',
  'Florida':'פלורידה','Washington DC':'וושינגטון DC','Massachusetts':'מסצ׳וסטס',
  'Illinois':'אילינוי','Texas':'טקסס','Georgia':'ג׳ורג׳יה','Colorado':'קולורדו',
  'Washington':'וושינגטון','Arizona':'אריזונה','Minnesota':'מינסוטה','Michigan':'מישיגן',
  'Pennsylvania':'פנסילבניה','North Carolina':'צפון קרוליינה','Tennessee':'טנסי',
  'Utah':'יוטה','Maryland':'מרילנד','New Jersey':'ניו ג׳רזי','Louisiana':'לואיזיאנה',
  'Hawaii':'הוואי','Missouri':'מיזורי','Ukraine':'אוקראינה','Romania':'רומניה',
  'New Zealand':'ניו זילנד','Singapore':'סינגפור','Japan':'יפן','South Korea':'דרום קוריאה',
}
const CONT_HE = {'Europe':'אירופה','Asia':'אסיה','USA':'ארה״ב','America':'אמריקה','Australia':'אוסטרליה','Africa':'אפריקה'}
const CONT_COLORS = {'Europe':'#3b82f6','Asia':'#f59e0b','USA':'#10b981','America':'#8b5cf6','Australia':'#f97316','Africa':'#ef4444','':'#6366f1'}
const COUNTRY_TO_CONT = {
  'UK':'Europe','Germany':'Europe','Netherlands':'Europe','Spain':'Europe','France':'Europe',
  'Italy':'Europe','Hungary':'Europe','Czech':'Europe','Austria':'Europe','Belgium':'Europe',
  'Switzerland':'Europe','Poland':'Europe','Portugal':'Europe','Greece':'Europe',
  'Romania':'Europe','Ukraine':'Europe','Cyprus':'Europe','Ireland':'Europe',
  'Thailand':'Asia','Japan':'Asia','China':'Asia','Singapore':'Asia','South Korea':'Asia',
  'Hong Kong':'Asia','Jordan':'Asia','India':'Asia',
  'Australia':'Australia','New Zealand':'Australia',
  'Canada':'America','Mexico':'America','Brazil':'America',
  'New York':'USA','California':'USA','Oregon':'USA','Nevada':'USA','Florida':'USA',
  'Massachusetts':'USA','Illinois':'USA','Texas':'USA','Georgia':'USA','Colorado':'USA',
  'Washington DC':'USA','Washington':'USA','Arizona':'USA','Minnesota':'USA',
  'Michigan':'USA','Pennsylvania':'USA','North Carolina':'USA','Tennessee':'USA',
  'Utah':'USA','Maryland':'USA','New Jersey':'USA','Louisiana':'USA','Hawaii':'USA',
  'Missouri':'USA','IL':'Asia',
}
const AIRPORT_INFO = {
  'TLV':{city:'Tel Aviv-Yafo',country:'IL'},'LHR':{city:'London',country:'UK'},
  'LGW':{city:'London',country:'UK'},'LTN':{city:'London',country:'UK'},
  'STN':{city:'London',country:'UK'},'CDG':{city:'Paris',country:'France'},
  'ORY':{city:'Paris',country:'France'},'AMS':{city:'Amsterdam',country:'Netherlands'},
  'FRA':{city:'Frankfurt',country:'Germany'},'MUC':{city:'Munich',country:'Germany'},
  'BER':{city:'Berlin',country:'Germany'},'TXL':{city:'Berlin',country:'Germany'},
  'VIE':{city:'Vienna',country:'Austria'},'ZRH':{city:'Zurich',country:'Switzerland'},
  'BCN':{city:'Barcelona',country:'Spain'},'MAD':{city:'Madrid',country:'Spain'},
  'FCO':{city:'Rome',country:'Italy'},'MXP':{city:'Milan',country:'Italy'},
  'BRU':{city:'Brussels',country:'Belgium'},'CRL':{city:'Brussels',country:'Belgium'},
  'CPH':{city:'Copenhagen',country:'Denmark'},'OSL':{city:'Oslo',country:'Norway'},
  'ARN':{city:'Stockholm',country:'Sweden'},'DUB':{city:'Dublin',country:'Ireland'},
  'LIS':{city:'Lisbon',country:'Portugal'},'ATH':{city:'Athens',country:'Greece'},
  'WAW':{city:'Warsaw',country:'Poland'},'BUD':{city:'Budapest',country:'Hungary'},
  'PRG':{city:'Prague',country:'Czech'},'KBP':{city:'Kyiv',country:'Ukraine'},
  'OTP':{city:'Bucharest',country:'Romania'},
  'BKK':{city:'Bangkok',country:'Thailand'},'HKT':{city:'Phuket',country:'Thailand'},
  'DMK':{city:'Bangkok',country:'Thailand'},'SIN':{city:'Singapore',country:'Singapore'},
  'KUL':{city:'Kuala Lumpur',country:'Malaysia'},'HKG':{city:'Hong Kong',country:'Hong Kong'},
  'ICN':{city:'Seoul',country:'South Korea'},'NRT':{city:'Tokyo',country:'Japan'},
  'PEK':{city:'Beijing',country:'China'},'PVG':{city:'Shanghai',country:'China'},
  'JFK':{city:'New York City',country:'New York'},'EWR':{city:'Newark',country:'New York'},
  'LGA':{city:'New York City',country:'New York'},'LAX':{city:'Los Angeles',country:'California'},
  'SFO':{city:'San Francisco',country:'California'},'PDX':{city:'Portland',country:'Oregon'},
  'LAS':{city:'Las Vegas',country:'Nevada'},'MIA':{city:'Miami',country:'Florida'},
  'MCO':{city:'Orlando',country:'Florida'},'FLL':{city:'Fort Lauderdale',country:'Florida'},
  'BOS':{city:'Boston',country:'Massachusetts'},'ORD':{city:'Chicago',country:'Illinois'},
  'MDW':{city:'Chicago',country:'Illinois'},'SEA':{city:'Seattle',country:'Washington'},
  'IAH':{city:'Houston',country:'Texas'},'DFW':{city:'Dallas',country:'Texas'},
  'AUS':{city:'Austin',country:'Texas'},'DCA':{city:'Washington DC',country:'Washington DC'},
  'IAD':{city:'Washington DC',country:'Washington DC'},
  'ATL':{city:'Atlanta',country:'Georgia'},'CLT':{city:'Charlotte',country:'North Carolina'},
  'DEN':{city:'Denver',country:'Colorado'},'PHX':{city:'Phoenix',country:'Arizona'},
  'MSP':{city:'Minneapolis',country:'Minnesota'},'DTW':{city:'Detroit',country:'Michigan'},
  'PHL':{city:'Philadelphia',country:'Pennsylvania'},'SAN':{city:'San Diego',country:'California'},
  'SLC':{city:'Salt Lake City',country:'Utah'},'MSY':{city:'New Orleans',country:'Louisiana'},
  'BNA':{city:'Nashville',country:'Tennessee'},'BWI':{city:'Baltimore',country:'Maryland'},
  'HNL':{city:'Honolulu',country:'Hawaii'},'YVR':{city:'Vancouver',country:'Canada'},
  'YYZ':{city:'Toronto',country:'Canada'},'YUL':{city:'Montreal',country:'Canada'},
  'SYD':{city:'Sydney',country:'Australia'},'MEL':{city:'Melbourne',country:'Australia'},
  'AKL':{city:'Auckland',country:'New Zealand'},
}

function heCity(c){return CITY_HE[c]||c}
function heCountry(c){return COUNTRY_HE[c]||c}
function heCont(c){return CONT_HE[c]||c}
function contColor(c){return CONT_COLORS[c]||'#6366f1'}
function fmtLong(d){if(!d)return'';return new Date(d+'T12:00:00').toLocaleDateString('he-IL',{day:'numeric',month:'long',year:'numeric'})}
function fmtShort(d){if(!d)return'';return new Date(d+'T12:00:00').toLocaleDateString('he-IL',{day:'numeric',month:'short'})}
function daysBetween(a,b){if(!a||!b)return null;return Math.round((new Date(b)-new Date(a))/(1000*60*60*24))}
function addDays(d,n){if(!d)return d;const dt=new Date(d+'T12:00:00');dt.setDate(dt.getDate()+n);return dt.toISOString().split('T')[0]}
function sortFlights(fs){return[...fs].sort((a,b)=>((a.departure_date||'')+(a.departure_time||'00:00')).localeCompare((b.departure_date||'')+(b.departure_time||'00:00')))}
function hotelsForSeg(seg,lodging){
  if(!seg.date_from)return[]
  const sf=seg.date_from,st=seg.date_to
  return lodging.filter(l=>{if(!l.check_in)return false;if(!st)return l.check_in>=sf;return l.check_in>=sf&&l.check_in<st})
}

const inp={width:'100%',border:'1.5px solid #cbd5e1',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',fontFamily:'Open Sans,sans-serif',color:'#1e293b',outline:'none',boxSizing:'border-box'}
const LBL={display:'block',fontSize:'11px',fontWeight:700,color:'#64748b',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'1px'}

function Modal({title,onClose,children}){
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(6px)',zIndex:200}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'16px',padding:'32px',width:'520px',maxWidth:'95vw',maxHeight:'88vh',overflowY:'auto',boxShadow:'0 24px 80px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
          <h3 style={{fontSize:'17px',fontWeight:700,color:'#1e293b'}}>{title}</h3>
          <button style={{background:'none',border:'none',fontSize:'20px',color:'#94a3b8',cursor:'pointer'}} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
function Field({label,children}){return(<div style={{marginBottom:'14px'}}><label style={LBL}>{label}</label>{children}</div>)}
function SaveBtn({loading,onClick}){return<button onClick={onClick} disabled={loading} style={{background:'#1d4ed8',border:'none',color:'white',padding:'12px',borderRadius:'8px',fontSize:'15px',fontWeight:700,cursor:'pointer',fontFamily:'Open Sans,sans-serif',marginTop:'8px',width:'100%'}}>{loading?'שומר...':'שמור'}</button>}

function AddSegModal({tripId,onClose,onSaved}){
  const[form,setForm]=useState({city:'',country:'',continent:'',date_from:'',date_to:''})
  const[loading,setLoading]=useState(false)
  function set(k,v){setForm(f=>{const nf={...f,[k]:v};if(k==='country'&&!f.continent)nf.continent=COUNTRY_TO_CONT[v]||'';return nf})}
  async function save(){setLoading(true);await supabase.from('trip_segments').insert({...form,trip_id:tripId,date_from:form.date_from||null,date_to:form.date_to||null});setLoading(false);onSaved();onClose()}
  return(<Modal title="הוסף יעד" onClose={onClose}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
      <Field label="עיר"><input style={inp} value={form.city} onChange={e=>set('city',e.target.value)} autoFocus/></Field>
      <Field label="מדינה"><input style={inp} value={form.country} onChange={e=>set('country',e.target.value)}/></Field>
    </div>
    <Field label="יבשת">
      <select style={inp} value={form.continent} onChange={e=>set('continent',e.target.value)}>
        <option value="">בחר יבשת</option>
        {['Europe','Asia','USA','America','Australia','Africa'].map(c=><option key={c} value={c}>{CONT_HE[c]}</option>)}
      </select>
    </Field>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
      <Field label="תאריך כניסה"><input style={inp} type="date" value={form.date_from} onChange={e=>set('date_from',e.target.value)}/></Field>
      <Field label="תאריך יציאה"><input style={inp} type="date" value={form.date_to} onChange={e=>set('date_to',e.target.value)}/></Field>
    </div>
    <SaveBtn loading={loading} onClick={save}/>
  </Modal>)
}

function LodgingModal({tripId,onClose,onSaved,existing}){
  const[form,setForm]=useState(existing||{hotel_name:'',address:'',room_type:'',check_in:'',check_out:'',num_guests:'1',confirmation:'',booking_site:''})
  const[loading,setLoading]=useState(false)
  function set(k,v){setForm(f=>({...f,[k]:v}))}
  async function save(){setLoading(true);if(existing)await supabase.from('lodging').update(form).eq('id',existing.id);else await supabase.from('lodging').insert({...form,trip_id:tripId});setLoading(false);onSaved();onClose()}
  return(<Modal title={existing?'עריכת לינה':'הוסף לינה'} onClose={onClose}>
    <Field label="שם המלון"><input style={inp} value={form.hotel_name} onChange={e=>set('hotel_name',e.target.value)} autoFocus/></Field>
    <Field label="כתובת"><input style={inp} value={form.address} onChange={e=>set('address',e.target.value)}/></Field>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
      <Field label="צ׳ק-אין"><input style={inp} type="date" value={form.check_in} onChange={e=>set('check_in',e.target.value)}/></Field>
      <Field label="צ׳ק-אאוט"><input style={inp} type="date" value={form.check_out} onChange={e=>set('check_out',e.target.value)}/></Field>
    </div>
    <Field label="סוג חדר"><input style={inp} value={form.room_type} onChange={e=>set('room_type',e.target.value)}/></Field>
    <Field label="אישור"><input style={inp} value={form.confirmation} onChange={e=>set('confirmation',e.target.value)}/></Field>
    <Field label="אתר הזמנה"><input style={inp} value={form.booking_site} onChange={e=>set('booking_site',e.target.value)}/></Field>
    <SaveBtn loading={loading} onClick={save}/>
  </Modal>)
}

function FlightModal({tripId,onClose,onSaved,existing}){
  const empty={airline_code:'',flight_number:'',aircraft:'',service_class:'',from_city:'',from_airport:'',from_country:'',to_city:'',to_airport:'',to_country:'',departure_date:'',departure_time:'',arrival_date:'',arrival_time:'',stops:'nonstop',distance:'',confirmation:''}
  const[form,setForm]=useState(existing||empty)
  const[loading,setLoading]=useState(false)
  const[fetchMsg,setFetchMsg]=useState('')

  function set(k,v){setForm(f=>{const nf={...f,[k]:v};if(k==='departure_date'&&!f.arrival_date)nf.arrival_date=v;return nf})}
  function onFromAirport(code){const up=code.toUpperCase();const info=AIRPORT_INFO[up];setForm(f=>({...f,from_airport:up,...(info?{from_city:info.city,from_country:info.country}:{})}))}
  function onToAirport(code){const up=code.toUpperCase();const info=AIRPORT_INFO[up];setForm(f=>({...f,to_airport:up,...(info?{to_city:info.city,to_country:info.country}:{})}))}

  function fetchFlightInfo(){
    const updates={}
    const filled=[]
    if(form.from_airport){const info=AIRPORT_INFO[form.from_airport.toUpperCase()];if(info){updates.from_city=info.city;updates.from_country=info.country;filled.push(`${form.from_airport}→${info.city}`)}}
    if(form.to_airport){const info=AIRPORT_INFO[form.to_airport.toUpperCase()];if(info){updates.to_city=info.city;updates.to_country=info.country;filled.push(`${form.to_airport}→${info.city}`)}}
    if(form.departure_date&&!form.arrival_date){updates.arrival_date=form.departure_date;filled.push('תאריך נחיתה')}
    if(Object.keys(updates).length>0){setForm(f=>({...f,...updates}));setFetchMsg('✓ '+filled.join(' · '))}
    else setFetchMsg((!form.from_airport&&!form.to_airport)?'הכנס קוד שדה תעופה ולחץ שוב':'קוד שדה לא מוכר')
    setTimeout(()=>setFetchMsg(''),4000)
  }

  async function save(){setLoading(true);if(existing)await supabase.from('flights').update(form).eq('id',existing.id);else await supabase.from('flights').insert({...form,trip_id:tripId});setLoading(false);onSaved();onClose()}

  return(<Modal title={existing?'עריכת טיסה':'הוסף טיסה'} onClose={onClose}>
    <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'8px',padding:'10px 14px',marginBottom:'14px',fontSize:'12px',color:'#92400e'}}>
      💡 קוד IATA: <strong>LY</strong>=אל על · <strong>LH</strong>=לופטהנזה · <strong>KL</strong>=KLM · <strong>SN</strong>=בריסל · <strong>LO</strong>=LOT · <strong>AA</strong>=אמריקן
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:'10px',alignItems:'end',marginBottom:'14px'}}>
      <div><label style={LBL}>חברת תעופה (IATA)</label><input style={inp} value={form.airline_code} onChange={e=>set('airline_code',e.target.value.toUpperCase())}/></div>
      <div><label style={LBL}>מספר טיסה</label><input style={inp} value={form.flight_number} onChange={e=>set('flight_number',e.target.value)}/></div>
      <button type="button" onClick={fetchFlightInfo} style={{padding:'10px 14px',background:'#1d4ed8',border:'none',color:'white',borderRadius:'8px',fontSize:'12px',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>🔍 אתר</button>
    </div>
    {fetchMsg&&<div style={{fontSize:'12px',color:fetchMsg.startsWith('✓')?'#16a34a':'#d97706',padding:'6px 10px',background:fetchMsg.startsWith('✓')?'#f0fdf4':'#fffbeb',borderRadius:'6px',marginBottom:'10px'}}>{fetchMsg}</div>}
    <Field label="תאריך המראה"><input style={inp} type="date" value={form.departure_date} onChange={e=>set('departure_date',e.target.value)}/></Field>
    <div style={{background:'#f8fafc',borderRadius:'10px',padding:'14px',marginBottom:'14px'}}>
      <div style={{fontSize:'11px',fontWeight:700,color:'#64748b',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'1px'}}>מוצא</div>
      <div style={{display:'grid',gridTemplateColumns:'80px 1fr 80px',gap:'10px'}}>
        <div><label style={LBL}>שדה</label><input style={inp} value={form.from_airport} onChange={e=>onFromAirport(e.target.value)} maxLength={3}/></div>
        <div><label style={LBL}>עיר</label><input style={inp} value={form.from_city} onChange={e=>set('from_city',e.target.value)}/></div>
        <div><label style={LBL}>מדינה</label><input style={inp} value={form.from_country} onChange={e=>set('from_country',e.target.value)}/></div>
      </div>
      <div style={{marginTop:'10px'}}><label style={LBL}>שעת המראה</label><input style={inp} value={form.departure_time} onChange={e=>set('departure_time',e.target.value)}/></div>
    </div>
    <div style={{background:'#f8fafc',borderRadius:'10px',padding:'14px',marginBottom:'14px'}}>
      <div style={{fontSize:'11px',fontWeight:700,color:'#64748b',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'1px'}}>יעד</div>
      <div style={{display:'grid',gridTemplateColumns:'80px 1fr 80px',gap:'10px'}}>
        <div><label style={LBL}>שדה</label><input style={inp} value={form.to_airport} onChange={e=>onToAirport(e.target.value)} maxLength={3}/></div>
        <div><label style={LBL}>עיר</label><input style={inp} value={form.to_city} onChange={e=>set('to_city',e.target.value)}/></div>
        <div><label style={LBL}>מדינה</label><input style={inp} value={form.to_country} onChange={e=>set('to_country',e.target.value)}/></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginTop:'10px'}}>
        <div>
          <label style={LBL}>תאריך נחיתה</label>
          <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
            <button type="button" onClick={()=>set('arrival_date',addDays(form.arrival_date,-1))} style={{padding:'9px 10px',border:'1px solid #cbd5e1',borderRadius:'6px',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:700,color:'#334155',flexShrink:0}}>−</button>
            <input style={{...inp,textAlign:'center'}} type="date" value={form.arrival_date} onChange={e=>set('arrival_date',e.target.value)}/>
            <button type="button" onClick={()=>set('arrival_date',addDays(form.arrival_date,1))} style={{padding:'9px 10px',border:'1px solid #cbd5e1',borderRadius:'6px',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:700,color:'#334155',flexShrink:0}}>+</button>
          </div>
        </div>
        <div><label style={LBL}>שעת נחיתה</label><input style={inp} value={form.arrival_time} onChange={e=>set('arrival_time',e.target.value)}/></div>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',marginBottom:'14px'}}>
      <div><label style={LBL}>מחלקה</label><input style={inp} value={form.service_class} onChange={e=>set('service_class',e.target.value)}/></div>
      <div><label style={LBL}>מטוס</label><input style={inp} value={form.aircraft} onChange={e=>set('aircraft',e.target.value)}/></div>
      <div><label style={LBL}>עצירות</label><input style={inp} value={form.stops} onChange={e=>set('stops',e.target.value)}/></div>
    </div>
    <Field label="אישור"><input style={inp} value={form.confirmation} onChange={e=>set('confirmation',e.target.value)}/></Field>
    <SaveBtn loading={loading} onClick={save}/>
  </Modal>)
}

function SegmentModal({seg,allCompanions,onClose,onSaved}){
  const[form,setForm]=useState({date_from:seg.date_from||'',date_to:seg.date_to||'',city:seg.city||'',country:seg.country||'',continent:seg.continent||''})
  const currentComps=seg.segment_companions?.map(sc=>sc.companions?.name).filter(Boolean)||[]
  const[selComps,setSelComps]=useState(currentComps)
  const[localComps,setLocalComps]=useState(allCompanions)
  const[newComp,setNewComp]=useState('')
  const[loading,setLoading]=useState(false)
  function set(k,v){setForm(f=>{const nf={...f,[k]:v};if(k==='country'&&!f.continent)nf.continent=COUNTRY_TO_CONT[v]||'';return nf})}
  function toggleComp(n){setSelComps(p=>p.includes(n)?p.filter(x=>x!==n):[...p,n])}
  async function addNew(){const name=newComp.trim();if(!name)return;const{data}=await supabase.from('companions').insert({name}).select().single();if(data){setLocalComps(p=>[...p,name].sort());setSelComps(p=>[...p,name]);setNewComp('')}}
  async function save(){
    setLoading(true)
    await supabase.from('trip_segments').update({...form,date_from:form.date_from||null,date_to:form.date_to||null}).eq('id',seg.id)
    await supabase.from('segment_companions').delete().eq('segment_id',seg.id)
    if(selComps.length>0){const{data:rows}=await supabase.from('companions').select('id,name').in('name',selComps);if(rows?.length>0)await supabase.from('segment_companions').insert(rows.map(c=>({segment_id:seg.id,companion_id:c.id})))}
    setLoading(false);onSaved();onClose()
  }
  async function deleteSeg(){if(!confirm('למחוק יעד זה?'))return;setLoading(true);await supabase.from('segment_companions').delete().eq('segment_id',seg.id);await supabase.from('trip_segments').delete().eq('id',seg.id);setLoading(false);onSaved();onClose()}
  return(<Modal title="עריכת יעד" onClose={onClose}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
      <Field label="עיר"><input style={inp} value={form.city} onChange={e=>set('city',e.target.value)}/></Field>
      <Field label="מדינה"><input style={inp} value={form.country} onChange={e=>set('country',e.target.value)}/></Field>
    </div>
    <Field label="יבשת">
      <select style={inp} value={form.continent} onChange={e=>set('continent',e.target.value)}>
        <option value="">בחר יבשת</option>
        {['Europe','Asia','USA','America','Australia','Africa'].map(c=><option key={c} value={c}>{CONT_HE[c]}</option>)}
      </select>
    </Field>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
      <Field label="תאריך כניסה"><input style={inp} type="date" value={form.date_from} onChange={e=>set('date_from',e.target.value)}/></Field>
      <Field label="תאריך יציאה"><input style={inp} type="date" value={form.date_to} onChange={e=>set('date_to',e.target.value)}/></Field>
    </div>
    <Field label="נסעתי עם">
      <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'10px'}}>
        {localComps.map(c=><button key={c} onClick={()=>toggleComp(c)} style={{padding:'5px 12px',borderRadius:'20px',border:'1.5px solid',fontSize:'12px',cursor:'pointer',fontFamily:'Open Sans,sans-serif',background:selComps.includes(c)?'#1d4ed8':'white',color:selComps.includes(c)?'white':'#475569',borderColor:selComps.includes(c)?'#1d4ed8':'#cbd5e1'}}>{c}</button>)}
      </div>
      <div style={{display:'flex',gap:'8px'}}>
        <input style={{...inp,flex:1}} value={newComp} onChange={e=>setNewComp(e.target.value)} placeholder="הוסף נוסע חדש..." onKeyDown={e=>e.key==='Enter'&&addNew()}/>
        <button onClick={addNew} style={{background:'#1d4ed8',border:'none',color:'white',padding:'9px 14px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>+</button>
      </div>
    </Field>
    <SaveBtn loading={loading} onClick={save}/>
    <button onClick={deleteSeg} style={{width:'100%',marginTop:'10px',background:'none',border:'1px solid #fca5a5',color:'#dc2626',padding:'10px',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontFamily:'Open Sans,sans-serif'}}>מחק יעד זה</button>
  </Modal>)
}

function NoteModal({seg,onClose,onSaved}){
  const[note,setNote]=useState(seg.notes||'')
  const[loading,setLoading]=useState(false)
  async function save(){setLoading(true);await supabase.from('trip_segments').update({notes:note}).eq('id',seg.id);setLoading(false);onSaved();onClose()}
  return(<Modal title={`הערה — ${heCity(seg.city)}`} onClose={onClose}>
    <textarea style={{...inp,minHeight:'140px',resize:'vertical'}} value={note} onChange={e=>setNote(e.target.value)} placeholder="מה זכור לך מהיעד הזה?"/>
    <SaveBtn loading={loading} onClick={save}/>
  </Modal>)
}

function ImpressionsModal({trip,onClose,onSaved}){
  const[text,setText]=useState(trip.impressions||'')
  const[tripit,setTripit]=useState(trip.tripit_url||'')
  const[loading,setLoading]=useState(false)
  async function save(){setLoading(true);await supabase.from('trips').update({impressions:text,tripit_url:tripit||null}).eq('id',trip.id);setLoading(false);onSaved();onClose()}
  return(<Modal title="רשמים ופרטי טיול" onClose={onClose}>
    <Field label="קישור TripIt"><input style={inp} value={tripit} onChange={e=>setTripit(e.target.value)}/></Field>
    <Field label="רשמים"><textarea style={{...inp,minHeight:'200px',resize:'vertical'}} value={text} onChange={e=>setText(e.target.value)} placeholder="כתוב את הרשמים שלך..."/></Field>
    <SaveBtn loading={loading} onClick={save}/>
  </Modal>)
}

export default function TripDetail(){
  const{id}=useParams()
  const navigate=useNavigate()
  const[trip,setTrip]=useState(null)
  const[flights,setFlights]=useState([])
  const[lodging,setLodging]=useState([])
  const[allCompanions,setAllCompanions]=useState([])
  const[allTrips,setAllTrips]=useState([])
  const[loading,setLoading]=useState(true)
  const[activeTab,setActiveTab]=useState('overview')
  const[editMode,setEditMode]=useState(false)
  const[modal,setModal]=useState(null)

  async function load(){
    const[tripRes,flightsRes,lodgingRes,compRes,allTripsRes]=await Promise.all([
      supabase.from('trips').select(`*,trip_segments(*,segment_companions(companions(name)))`).eq('id',id).single(),
      supabase.from('flights').select('*').eq('trip_id',id).order('departure_date').order('departure_time'),
      supabase.from('lodging').select('*').eq('trip_id',id).order('check_in'),
      supabase.from('companions').select('name').order('name'),
      supabase.from('trips').select(`id,name,name_he,trip_segments(date_from)`),
    ])
    setTrip(tripRes.data)
    setFlights(sortFlights(flightsRes.data||[]))
    setLodging(lodgingRes.data||[])
    setAllCompanions(compRes.data?.map(c=>c.name)||[])
    const sorted=(allTripsRes.data||[]).map(t=>{
      const dates=(t.trip_segments||[]).map(s=>s.date_from).filter(Boolean).sort()
      return{...t,startDate:dates[0]||null}
    }).filter(t=>t.startDate).sort((a,b)=>a.startDate.localeCompare(b.startDate))
    setAllTrips(sorted)
    setLoading(false)
  }
  useEffect(()=>{load()},[id])

  async function delFlight(fid){if(!confirm('למחוק?'))return;await supabase.from('flights').delete().eq('id',fid);load()}
  async function delLodging(lid){if(!confirm('למחוק?'))return;await supabase.from('lodging').delete().eq('id',lid);load()}
  async function deleteTrip(){
    if(!confirm('למחוק את הנסיעה?\nכל הנתונים יימחקו לצמיתות.'))return
    const segIds=(trip.trip_segments||[]).map(s=>s.id)
    if(segIds.length>0)await supabase.from('segment_companions').delete().in('segment_id',segIds)
    await supabase.from('trip_segments').delete().eq('trip_id',id)
    await supabase.from('flights').delete().eq('trip_id',id)
    await supabase.from('lodging').delete().eq('trip_id',id)
    await supabase.from('trips').delete().eq('id',id)
    navigate('/travels')
  }

  if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#64748b'}}>טוען...</div>
  if(!trip)return null

  const segs=trip.trip_segments?.sort((a,b)=>(a.date_from||'').localeCompare(b.date_from||''))||[]
  const startDate=segs[0]?.date_from
  const endDate=segs[segs.length-1]?.date_to
  const totalDays=daysBetween(startDate,endDate)
  const allTripComps=[...new Set(segs.flatMap(s=>s.segment_companions?.map(sc=>sc.companions?.name)||[]).filter(Boolean))]
  const continents=[...new Set(segs.map(s=>s.continent).filter(Boolean))]
  const displayName=trip.name_he||trip.name
  const sortedFlights=sortFlights(flights)

  const curIdx=allTrips.findIndex(t=>t.id===id)
  const prevTrip=curIdx>0?allTrips[curIdx-1]:null
  const nextTrip=curIdx>=0&&curIdx<allTrips.length-1?allTrips[curIdx+1]:null

  const tabs=[{id:'overview',label:'סקירה'},{id:'flights',label:'טיסות',count:flights.length},{id:'lodging',label:'לינה',count:lodging.length}]

  return(
    <div style={P.page}>
      <header style={P.header}>
        <nav style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',color:'#64748b',flexWrap:'wrap'}}>
          <button style={P.crumbBtn} onClick={()=>navigate('/')}>BARONS</button>
          <span style={{color:'#cbd5e1'}}>/</span>
          <button style={P.crumbBtn} onClick={()=>navigate('/travels')}>נסיעות</button>
          <span style={{color:'#cbd5e1'}}>/</span>
          <span style={{color:'#1e293b',fontWeight:600,maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{displayName}</span>
        </nav>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          {editMode&&<button style={{background:'none',border:'1px solid #fca5a5',color:'#dc2626',padding:'6px 12px',borderRadius:'8px',fontSize:'12px',cursor:'pointer',fontWeight:600}} onClick={deleteTrip}>מחק נסיעה</button>}
          <button style={{...P.editBtn,...(editMode?{background:'#1d4ed8',color:'white',borderColor:'#1d4ed8'}:{})}} onClick={()=>setEditMode(e=>!e)}>{editMode?'✓ סיים':'עריכה'}</button>
          <button style={P.logoutBtn} onClick={async()=>{await supabase.auth.signOut();navigate('/')}}>יציאה</button>
        </div>
      </header>

      <div style={P.hero}>
        <div style={P.heroInner}>
          <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
            {continents.map(c=><span key={c} style={{padding:'3px 12px',borderRadius:'20px',fontSize:'11px',fontWeight:700,letterSpacing:'1px',background:contColor(c)+'22',color:contColor(c),border:`1px solid ${contColor(c)}44`}}>{heCont(c)}</span>)}
          </div>
          <h1 style={P.heroTitle}>{displayName}</h1>
          <div style={{display:'flex',alignItems:'center',gap:'24px',flexWrap:'wrap',marginBottom:'16px'}}>
            <div><div style={P.heroDateLbl}>יציאה</div><div style={P.heroDateVal}>{fmtLong(startDate)}</div></div>
            {totalDays&&<div style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.25)',color:'white',padding:'10px 18px',borderRadius:'14px',textAlign:'center',fontSize:'26px',fontWeight:900,lineHeight:1.2}}>{totalDays}<br/><span style={{fontSize:'12px',opacity:.8}}>ימים</span></div>}
            <div><div style={P.heroDateLbl}>חזרה</div><div style={P.heroDateVal}>{fmtLong(endDate)}</div></div>
          </div>
          {allTripComps.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'16px'}}>{allTripComps.map(c=><span key={c} style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.25)',color:'white',padding:'4px 14px',borderRadius:'20px',fontSize:'12px',fontWeight:600}}>{c}</span>)}</div>}
          <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap',marginBottom:'16px'}}>
            {trip.tripit_url&&<a href={trip.tripit_url} target="_blank" rel="noreferrer" style={{display:'inline-block',background:'rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.85)',padding:'6px 16px',borderRadius:'20px',fontSize:'12px',border:'1px solid rgba(255,255,255,0.2)'}}>TripIt ↗</a>}
            <button onClick={()=>setModal('impressions')} style={{background:'rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.85)',padding:'6px 16px',borderRadius:'20px',fontSize:'12px',border:'1px dashed rgba(255,255,255,0.3)',cursor:'pointer',fontFamily:'Open Sans,sans-serif'}}>{editMode?'ערוך פרטים / רשמים':'רשמים'}</button>
          </div>
          <div style={{display:'flex',gap:'10px'}}>
            {prevTrip&&<button onClick={()=>{navigate(`/travels/${prevTrip.id}`);setActiveTab('overview')}} style={P.navBtn}>→ {prevTrip.name_he||prevTrip.name}</button>}
            {nextTrip&&<button onClick={()=>{navigate(`/travels/${nextTrip.id}`);setActiveTab('overview')}} style={P.navBtn}>← {nextTrip.name_he||nextTrip.name}</button>}
          </div>
        </div>
      </div>

      <div style={{background:'#1e40af'}}>
        <div style={{display:'flex',maxWidth:'1000px',margin:'0 auto',padding:'0 32px'}}>
          {tabs.map(t=>(
            <button key={t.id} style={{...P.tab,...(activeTab===t.id?{color:'white',borderBottomColor:'white',background:'rgba(255,255,255,0.1)'}:{})}} onClick={()=>setActiveTab(t.id)}>
              {t.label}
              {t.count>0&&<span style={{padding:'1px 8px',borderRadius:'10px',fontSize:'12px',fontWeight:700,...(activeTab===t.id?{background:'white',color:'#1d4ed8'}:{background:'rgba(255,255,255,0.2)',color:'white'})}}>{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <main style={{maxWidth:'1000px',margin:'0 auto',padding:'28px 32px'}}>
        {activeTab==='overview'&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 290px',gap:'28px'}}>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
                <span style={{fontSize:'11px',fontWeight:700,letterSpacing:'2px',color:'#475569',textTransform:'uppercase'}}>מסלול</span>
                {editMode&&<button style={{background:'#1d4ed8',border:'none',color:'white',padding:'6px 14px',borderRadius:'7px',fontSize:'12px',fontWeight:700,cursor:'pointer'}} onClick={()=>setModal('addSeg')}>+ יעד חדש</button>}
              </div>
              <div style={{position:'relative'}}>
                <div style={{position:'absolute',right:'19px',top:'8px',bottom:'8px',width:'2px',background:'linear-gradient(to bottom,#3b82f6,#8b5cf6)',borderRadius:'1px'}}/>
                {segs.map(seg=>{
                  const segDays=daysBetween(seg.date_from,seg.date_to)
                  const comps=seg.segment_companions?.map(sc=>sc.companions?.name).filter(Boolean)||[]
                  const segHotels=hotelsForSeg(seg,lodging)
                  const cc=contColor(seg.continent)
                  return(
                    <div key={seg.id} style={{display:'flex',gap:'20px',marginBottom:'20px',position:'relative'}}>
                      <div style={{width:'40px',flexShrink:0,display:'flex',justifyContent:'center',paddingTop:'6px',position:'relative',zIndex:1}}>
                        <div style={{width:'14px',height:'14px',borderRadius:'50%',background:cc,border:'3px solid white',boxShadow:`0 0 0 2px ${cc}`}}/>
                      </div>
                      <div style={{flex:1,background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
                        <div style={{height:'4px',background:`linear-gradient(to left,${cc},${cc}66)`}}/>
                        <div style={{padding:'14px 16px'}}>
                          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px'}}>
                            <div>
                              <div style={{fontSize:'19px',fontWeight:800,color:'#1e293b',lineHeight:1.2}}>{heCity(seg.city)}</div>
                              <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'2px',color:cc,textTransform:'uppercase',marginTop:'2px'}}>{heCountry(seg.country)}</div>
                            </div>
                            <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                              {segDays&&<span style={{background:'#f1f5f9',color:'#334155',padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:700,whiteSpace:'nowrap'}}>{segDays} ימים</span>}
                              {editMode&&<button style={{background:'#f1f5f9',border:'none',color:'#475569',padding:'4px 8px',borderRadius:'6px',fontSize:'12px',cursor:'pointer'}} onClick={()=>setModal({type:'editSeg',data:seg})}>✏</button>}
                              {editMode&&<button style={{background:'#f1f5f9',border:'none',color:'#475569',padding:'4px 8px',borderRadius:'6px',fontSize:'12px',cursor:'pointer'}} onClick={()=>setModal({type:'note',data:seg})}>📝</button>}
                            </div>
                          </div>
                          {(seg.date_from||seg.date_to)&&<div style={{fontSize:'13px',color:'#475569',marginTop:'8px',direction:'rtl'}}>{fmtShort(seg.date_from)}{seg.date_to?` — ${fmtShort(seg.date_to)}`:''}</div>}
                          {comps.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:'4px',marginTop:'8px'}}>{comps.map(c=><span key={c} style={{fontSize:'12px',color:'#4338ca',background:'#ede9fe',padding:'2px 8px',borderRadius:'10px',fontWeight:500}}>{c}</span>)}</div>}
                          {segHotels.length>0&&(
                            <div style={{display:'flex',flexDirection:'column',gap:'5px',marginTop:'8px'}}>
                              {segHotels.map(h=>(
                                <button key={h.id} onClick={()=>setActiveTab('lodging')} style={{background:'#f0fdf4',border:'1px solid #86efac',color:'#14532d',padding:'5px 10px',borderRadius:'6px',fontSize:'12px',cursor:'pointer',fontFamily:'Open Sans,sans-serif',fontWeight:500,textAlign:'right',width:'100%'}}>
                                  <div style={{fontWeight:600}}>🏨 {h.hotel_name}</div>
                                  {h.check_in&&h.check_out&&<div style={{fontSize:'11px',color:'#16a34a',marginTop:'2px',direction:'rtl'}}>{fmtShort(h.check_in)} — {fmtShort(h.check_out)}</div>}
                                </button>
                              ))}
                            </div>
                          )}
                          {seg.notes&&<div style={{marginTop:'10px',background:'#fffbeb',borderRight:'3px solid #fbbf24',borderRadius:'6px',padding:'8px 12px',fontSize:'13px',color:'#374151',lineHeight:1.6}}>{seg.notes}</div>}
                          {!seg.notes&&editMode&&<button style={{marginTop:'8px',background:'none',border:'1px dashed #cbd5e1',color:'#94a3b8',padding:'4px 12px',borderRadius:'6px',fontSize:'11px',cursor:'pointer'}} onClick={()=>setModal({type:'note',data:seg})}>+ הוסף הערה</button>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {segs.length===0&&<div style={{padding:'40px',textAlign:'center',color:'#94a3b8'}}>לא הוגדרו יעדים{editMode?' — לחץ + יעד חדש':''}</div>}
              </div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              <div style={P.card}>
                <div style={P.cardHead}><span style={P.cardLbl}>רשמים</span><button style={P.cardBtn} onClick={()=>setModal('impressions')}>{editMode?'ערוך':'TripIt / עריכה'}</button></div>
                {trip.impressions?<p style={{fontSize:'14px',color:'#334155',lineHeight:1.8,margin:0}}>{trip.impressions}</p>:<p style={{fontSize:'13px',color:'#94a3b8',margin:0,fontStyle:'italic'}}>טרם נכתבו רשמים</p>}
              </div>
              <div style={P.card}>
                <div style={P.cardHead}><span style={P.cardLbl}>לינה</span>{editMode&&<button style={P.cardBtn} onClick={()=>setModal('addLodging')}>+ הוסף</button>}</div>
                {lodging.length===0?<p style={{fontSize:'13px',color:'#94a3b8',margin:0,fontStyle:'italic'}}>אין נתוני לינה</p>:lodging.map(l=>(
                  <div key={l.id} style={P.sumRow} onClick={()=>setActiveTab('lodging')}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'13px',fontWeight:600,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.hotel_name}</div>
                      <div style={{fontSize:'11px',color:'#64748b',marginTop:'2px',direction:'rtl'}}>{fmtShort(l.check_in)} — {fmtShort(l.check_out)}{daysBetween(l.check_in,l.check_out)?` · ${daysBetween(l.check_in,l.check_out)} לילות`:''}</div>
                    </div>
                    <span style={{color:'#1d4ed8',fontSize:'14px'}}>←</span>
                  </div>
                ))}
              </div>
              <div style={P.card}>
                <div style={P.cardHead}><span style={P.cardLbl}>טיסות</span>{editMode&&<button style={P.cardBtn} onClick={()=>setModal('addFlight')}>+ הוסף</button>}</div>
                {sortedFlights.length===0?<p style={{fontSize:'13px',color:'#94a3b8',margin:0,fontStyle:'italic'}}>אין נתוני טיסות</p>:sortedFlights.map(f=>(
                  <div key={f.id} style={P.sumRow} onClick={()=>setActiveTab('flights')}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'13px',fontWeight:600,color:'#1e293b',direction:'rtl'}}>{heCity(f.from_city)} → {heCity(f.to_city)}</div>
                      <div style={{fontSize:'11px',color:'#1d4ed8',marginTop:'1px'}}>{f.airline_code} {f.flight_number}</div>
                      <div style={{fontSize:'11px',color:'#64748b',direction:'rtl'}}>{fmtShort(f.departure_date)}{f.departure_time?` · ${f.departure_time.slice(0,5)}`:''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab==='flights'&&(
          <div>
            {editMode&&<button style={{background:'#1d4ed8',border:'none',color:'white',padding:'10px 22px',borderRadius:'8px',fontSize:'14px',fontWeight:700,cursor:'pointer',marginBottom:'20px'}} onClick={()=>setModal('addFlight')}>+ הוסף טיסה</button>}
            {sortedFlights.length===0?<div style={{textAlign:'center',color:'#94a3b8',padding:'64px 0',fontSize:'16px'}}>אין טיסות{editMode?' — לחץ + הוסף':''}</div>
              :sortedFlights.map(f=>(
                <div key={f.id} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'14px',padding:'24px',marginBottom:'14px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
                  {editMode&&<div style={{display:'flex',gap:'8px',justifyContent:'flex-end',marginBottom:'10px'}}>
                    <button style={P.actionBtn} onClick={()=>setModal({type:'editFlight',data:f})}>ערוך</button>
                    <button style={{...P.actionBtn,color:'#dc2626',borderColor:'#fca5a5'}} onClick={()=>delFlight(f.id)}>מחק</button>
                  </div>}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <div style={{background:'#1d4ed8',color:'white',padding:'4px 12px',borderRadius:'6px',fontSize:'14px',fontWeight:800}}>{f.airline_code}</div>
                      <div>
                        <div style={{fontWeight:700,fontSize:'15px',color:'#1e293b'}}>טיסה {f.flight_number}</div>
                        {f.aircraft&&<div style={{fontSize:'12px',color:'#64748b'}}>{f.aircraft}</div>}
                      </div>
                    </div>
                    {f.service_class&&<span style={{background:'#f1f5f9',color:'#334155',padding:'4px 14px',borderRadius:'20px',fontSize:'12px',fontWeight:600}}>{f.service_class}</span>}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 80px 1fr',gap:'16px',alignItems:'center',direction:'ltr'}}>
                    <div style={{textAlign:'left'}}>
                      <div style={{fontSize:'22px',fontWeight:800,color:'#1e293b'}}>{heCity(f.from_city)}</div>
                      <div style={{fontSize:'14px',fontWeight:700,color:'#1d4ed8',letterSpacing:'1px'}}>{f.from_airport}</div>
                      {f.departure_time&&<div style={{fontSize:'20px',fontWeight:600,color:'#475569',marginTop:'2px'}}>{f.departure_time.slice(0,5)}</div>}
                      <div style={{fontSize:'12px',color:'#64748b'}}>{fmtShort(f.departure_date)}</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{height:'1px',background:'#e2e8f0',margin:'0 0 6px'}}/>
                      <div style={{fontSize:'20px',color:'#1d4ed8'}}>✈</div>
                      {f.stops&&<div style={{fontSize:'11px',color:'#64748b',marginTop:'4px'}}>{f.stops==='nonstop'?'ישיר':f.stops}</div>}
                      {f.distance&&<div style={{fontSize:'11px',color:'#64748b'}}>{f.distance}</div>}
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:'22px',fontWeight:800,color:'#1e293b'}}>{heCity(f.to_city)}</div>
                      <div style={{fontSize:'14px',fontWeight:700,color:'#1d4ed8',letterSpacing:'1px'}}>{f.to_airport}</div>
                      {f.arrival_time&&<div style={{fontSize:'20px',fontWeight:600,color:'#475569',marginTop:'2px'}}>{f.arrival_time.slice(0,5)}</div>}
                      <div style={{fontSize:'12px',color:'#64748b'}}>{fmtShort(f.arrival_date)}</div>
                    </div>
                  </div>
                  {f.confirmation&&<div style={{marginTop:'14px',fontSize:'12px',color:'#475569',background:'#f8fafc',padding:'5px 12px',borderRadius:'6px',display:'inline-block',border:'1px solid #e2e8f0'}}>אישור: {f.confirmation}</div>}
                </div>
              ))
            }
          </div>
        )}

        {activeTab==='lodging'&&(
          <div>
            {editMode&&<button style={{background:'#1d4ed8',border:'none',color:'white',padding:'10px 22px',borderRadius:'8px',fontSize:'14px',fontWeight:700,cursor:'pointer',marginBottom:'20px'}} onClick={()=>setModal('addLodging')}>+ הוסף לינה</button>}
            {lodging.length===0?<div style={{textAlign:'center',color:'#94a3b8',padding:'64px 0',fontSize:'16px'}}>אין לינות{editMode?' — לחץ + הוסף':''}</div>
              :lodging.map(l=>(
                <div key={l.id} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'14px',padding:'24px',marginBottom:'14px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
                  {editMode&&<div style={{display:'flex',gap:'8px',justifyContent:'flex-end',marginBottom:'10px'}}>
                    <button style={P.actionBtn} onClick={()=>setModal({type:'editLodging',data:l})}>ערוך</button>
                    <button style={{...P.actionBtn,color:'#dc2626',borderColor:'#fca5a5'}} onClick={()=>delLodging(l.id)}>מחק</button>
                  </div>}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px'}}>
                    <div>
                      <div style={{fontSize:'20px',fontWeight:700,color:'#1e293b',marginBottom:'3px'}}>{l.hotel_name}</div>
                      {l.room_type&&<div style={{fontSize:'13px',color:'#475569'}}>{l.room_type}</div>}
                    </div>
                    {l.cost&&<div style={{fontSize:'16px',fontWeight:700,color:'#1d4ed8'}}>{l.cost}</div>}
                  </div>
                  <div style={{display:'flex',gap:'12px',flexWrap:'wrap',alignItems:'center',marginBottom:'10px',direction:'rtl'}}>
                    <span style={{fontSize:'14px',color:'#334155'}}>{fmtLong(l.check_in)} — {fmtLong(l.check_out)}</span>
                    {daysBetween(l.check_in,l.check_out)&&<span style={{background:'#dbeafe',color:'#1e40af',padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:700}}>{daysBetween(l.check_in,l.check_out)} לילות</span>}
                  </div>
                  {l.address&&<div style={{fontSize:'13px',color:'#64748b',marginBottom:'8px'}}>{l.address}</div>}
                  {l.confirmation&&<span style={{display:'inline-block',fontSize:'12px',color:'#475569',background:'#f8fafc',padding:'4px 10px',borderRadius:'6px',border:'1px solid #e2e8f0'}}>אישור: {l.confirmation}</span>}
                </div>
              ))
            }
          </div>
        )}
      </main>

      {modal==='addSeg'&&<AddSegModal tripId={id} onClose={()=>setModal(null)} onSaved={load}/>}
      {modal==='addLodging'&&<LodgingModal tripId={id} onClose={()=>setModal(null)} onSaved={load}/>}
      {modal==='addFlight'&&<FlightModal tripId={id} onClose={()=>setModal(null)} onSaved={load}/>}
      {modal==='impressions'&&<ImpressionsModal trip={trip} onClose={()=>setModal(null)} onSaved={load}/>}
      {modal?.type==='editLodging'&&<LodgingModal tripId={id} existing={modal.data} onClose={()=>setModal(null)} onSaved={load}/>}
      {modal?.type==='editFlight'&&<FlightModal tripId={id} existing={modal.data} onClose={()=>setModal(null)} onSaved={load}/>}
      {modal?.type==='editSeg'&&<SegmentModal seg={modal.data} allCompanions={allCompanions} onClose={()=>setModal(null)} onSaved={load}/>}
      {modal?.type==='note'&&<NoteModal seg={modal.data} onClose={()=>setModal(null)} onSaved={load}/>}
    </div>
  )
}

const P={
  page:{minHeight:'100vh',background:'#f0f4ff'},
  header:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 24px',background:'white',borderBottom:'1px solid #e2e8f0',position:'sticky',top:0,zIndex:10,boxShadow:'0 1px 6px rgba(0,0,0,0.05)',gap:'12px'},
  crumbBtn:{background:'none',border:'none',color:'#1d4ed8',fontSize:'13px',fontWeight:600,cursor:'pointer',padding:'2px 0'},
  editBtn:{padding:'7px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',border:'1.5px solid #1d4ed8',color:'#1d4ed8',background:'white'},
  logoutBtn:{background:'none',border:'1px solid #cbd5e1',color:'#475569',padding:'6px 12px',borderRadius:'8px',fontSize:'13px',cursor:'pointer'},
  hero:{background:'linear-gradient(155deg,#0b1a3e 0%,#1e3a8a 55%,#2563eb 100%)',padding:'36px 32px 40px'},
  heroInner:{maxWidth:'1000px',margin:'0 auto'},
  heroTitle:{fontSize:'clamp(26px,4vw,48px)',fontWeight:900,color:'white',marginBottom:'24px',lineHeight:1.15},
  heroDateLbl:{fontSize:'11px',fontWeight:700,color:'rgba(255,255,255,0.75)',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'3px'},
  heroDateVal:{fontSize:'15px',color:'white',fontWeight:500},
  navBtn:{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'rgba(255,255,255,0.8)',padding:'6px 14px',borderRadius:'20px',fontSize:'12px',cursor:'pointer',fontFamily:'Open Sans,sans-serif',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},
  tab:{display:'flex',alignItems:'center',gap:'7px',background:'none',border:'none',padding:'14px 22px',fontSize:'14px',fontWeight:600,color:'rgba(255,255,255,0.65)',cursor:'pointer',borderBottom:'3px solid transparent',whiteSpace:'nowrap',fontFamily:'Open Sans,sans-serif'},
  card:{background:'white',border:'1px solid #e2e8f0',borderRadius:'12px',padding:'18px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'},
  cardHead:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'},
  cardLbl:{fontSize:'11px',fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:'1.5px'},
  cardBtn:{background:'#f1f5f9',border:'none',color:'#1d4ed8',padding:'4px 10px',borderRadius:'6px',fontSize:'12px',fontWeight:600,cursor:'pointer'},
  sumRow:{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:'1px solid #f1f5f9',cursor:'pointer'},
  actionBtn:{background:'white',border:'1px solid #cbd5e1',color:'#334155',padding:'5px 12px',borderRadius:'6px',fontSize:'12px',cursor:'pointer'},
}
