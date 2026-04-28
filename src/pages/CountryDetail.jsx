import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/* ─── Design tokens (matches TripDetail) ─── */
const FF = "'Open Sans Hebrew', 'Open Sans', 'Assistant', system-ui, -apple-system, sans-serif"
const LT = {
  ink:'#0f1a2e', ink2:'#2b3647', muted:'#64748b', muted2:'#94a3b8',
  line:'rgba(37,99,235,0.08)', line2:'rgba(37,99,235,0.14)',
  accent:'#2563eb', accentD:'#1e40af',
  pageBg:'linear-gradient(180deg, #e8f1ff 0%, #f6f9ff 45%, #fff 100%)',
  inputBg:'#ffffff', inputBorder:'rgba(37,99,235,0.14)', inputFocusBorder:'#2563eb',
  danger:'#dc2626', dangerBg:'rgba(220,38,38,0.06)', dangerBorder:'rgba(220,38,38,0.2)',
}
const EASE = {
  out:'cubic-bezier(0.23, 1, 0.32, 1)',
  drawer:'cubic-bezier(0.32, 0.72, 0, 1)',
}

const COUNTRY_HE = {
  'UK':'בריטניה','Germany':'גרמניה','Netherlands':'הולנד','Spain':'ספרד','France':'צרפת',
  'Italy':'איטליה','Hungary':'הונגריה','Czech':'צ׳כיה','Austria':'אוסטריה','Belgium':'בלגיה',
  'Switzerland':'שווייץ','Poland':'פולין','Thailand':'תאילנד','Australia':'אוסטרליה',
  'Jordan':'ירדן','Portugal':'פורטוגל','Greece':'יוון','Canada':'קנדה','IL':'ישראל',
  'New York':'ניו יורק','California':'קליפורניה','Oregon':'אורגון','Nevada':'נבדה',
  'Florida':'פלורידה','Washington DC':'וושינגטון DC','Massachusetts':'מסצ׳וסטס',
  'Illinois':'אילינוי','Texas':'טקסס','Washington':'וושינגטון','Utah':'יוטה',
  'Maryland':'מרילנד','New Jersey':'ניו ג׳רזי','Louisiana':'לואיזיאנה','Hawaii':'הוואי',
  'Ukraine':'אוקראינה','Romania':'רומניה','Moldova':'מולדובה',
  'New Zealand':'ניו זילנד','Singapore':'סינגפור','Japan':'יפן',
  'Hong Kong':'הונג קונג','Cyprus':'קפריסין','North Carolina':'צפון קרוליינה',
}
const heCountry = c => COUNTRY_HE[c] || c

/* ─── Country flag emoji ─── */
const FLAG = {
  'UK':'🇬🇧','Germany':'🇩🇪','Netherlands':'🇳🇱','Spain':'🇪🇸','France':'🇫🇷',
  'Italy':'🇮🇹','Hungary':'🇭🇺','Czech':'🇨🇿','Austria':'🇦🇹','Belgium':'🇧🇪',
  'Switzerland':'🇨🇭','Poland':'🇵🇱','Thailand':'🇹🇭','Australia':'🇦🇺',
  'Jordan':'🇯🇴','Portugal':'🇵🇹','Greece':'🇬🇷','Canada':'🇨🇦','IL':'🇮🇱',
  'New York':'🇺🇸','California':'🇺🇸','Oregon':'🇺🇸','Nevada':'🇺🇸','Florida':'🇺🇸',
  'Washington DC':'🇺🇸','Massachusetts':'🇺🇸','Illinois':'🇺🇸','Texas':'🇺🇸',
  'Washington':'🇺🇸','Utah':'🇺🇸','Maryland':'🇺🇸','New Jersey':'🇺🇸',
  'Louisiana':'🇺🇸','Hawaii':'🇺🇸','Ukraine':'🇺🇦','Romania':'🇷🇴','Moldova':'🇲🇩',
  'New Zealand':'🇳🇿','Singapore':'🇸🇬','Japan':'🇯🇵','Hong Kong':'🇭🇰',
  'Cyprus':'🇨🇾','Netherlands':'🇳🇱',
}

/* ─── CSS ─── */
const STYLES = `
@keyframes cd-fade-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
@keyframes cd-card-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
.cd-press:active { transform:scale(0.97) }
.cd-hotel:hover { background:#f5f8ff !important; border-color:rgba(37,99,235,0.2) !important; }
.cd-trip:hover { background:#f5f8ff !important; }
.cd-iconbtn:hover { background:#fff !important; box-shadow:0 4px 12px rgba(37,99,235,0.12); }
@media(max-width:768px){
  .cd-page { padding:12px 10px 80px !important; }
  .cd-shell { padding:12px 12px 18px !important; border-radius:18px !important; }
  .cd-header { flex-wrap:wrap; gap:8px !important; }
  .cd-content { padding:16px !important; }
  .cd-notes-box { padding:18px !important; }
}
`

/* ─── Small shared components ─── */
const inp = {
  width:'100%', border:`1.5px solid ${LT.inputBorder}`, borderRadius:'10px',
  padding:'10px 12px', fontSize:'14px', fontFamily:FF, color:LT.ink,
  outline:'none', boxSizing:'border-box', background:LT.inputBg, transition:'border-color .15s,box-shadow .15s',
}
function focusInp(e){ e.target.style.borderColor=LT.inputFocusBorder; e.target.style.boxShadow=`0 0 0 3px rgba(37,99,235,0.14)` }
function blurInp(e){ e.target.style.borderColor=LT.inputBorder; e.target.style.boxShadow='none' }

function iconBtn(extra={}){ return { display:'inline-flex',alignItems:'center',justifyContent:'center', width:'36px',height:'36px',borderRadius:'10px',border:`1px solid ${LT.line2}`, background:'rgba(255,255,255,0.8)',color:LT.muted,cursor:'pointer',transition:'all .15s ease',...extra } }

function HomeIcon(){ return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function EditIcon(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function SaveIcon(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> }
function ChevRight(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg> }
function BedIcon(){ return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg> }
function NoteIcon(){ return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> }
function PlaneIcon(){ return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4c-1 0-1.5.5-3.5 2.5L8 7l-8.2 1.8c-.6.2-.6 1 0 1.2L4 11 7 14l-3.2 3.2c-.4.4-.4 1 0 1.4l1.6 1.6c.4.4 1 .4 1.4 0L11 17l4 3 1.2 3.8c.2.6 1 .6 1.2 0l1.8-8.2z"/></svg> }

function fmtDate(d){ if(!d) return ''; const dt=new Date(d+'T12:00:00'); return dt.toLocaleDateString('he-IL',{day:'numeric',month:'short',year:'numeric'}) }
function fmtYear(d){ if(!d) return ''; return new Date(d+'T12:00:00').getFullYear() }

/* ═══════════════════════════════════════════════════════════
   NOTES EDITOR — rich textarea matching Impressions style
   ═══════════════════════════════════════════════════════════ */
function NotesEditor({ country, notes, onSaved, onCancel }) {
  const [text, setText] = useState(notes || '')
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    await supabase.from('country_notes').upsert({
      country,
      notes: text,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'country' })
    setLoading(false)
    onSaved(text)
  }

  return (
    <div style={{
      background:'#fff', border:`1px solid ${LT.line2}`,
      borderRadius:'18px', padding:'22px', marginBottom:'20px',
      boxShadow:'0 4px 20px rgba(37,99,235,0.08)',
    }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px' }}>
        <span style={{ fontSize:'11px',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:LT.muted }}>עריכת הערות</span>
        <button onClick={onCancel} style={{ background:'none',border:'none',color:LT.muted,cursor:'pointer',fontSize:'20px',lineHeight:1,padding:'0 2px',fontFamily:FF }}>×</button>
      </div>

      <textarea
        autoFocus
        value={text}
        onChange={e=>setText(e.target.value)}
        onFocus={focusInp}
        onBlur={blurInp}
        placeholder={`הערות, טיפים וכל מה שכדאי לדעת על ${heCountry(country)}...`}
        style={{
          ...inp,
          minHeight:'260px',
          resize:'vertical',
          lineHeight:'1.75',
          fontSize:'14.5px',
          display:'block',
          marginBottom:'14px',
        }}
      />

      <div style={{ display:'flex',gap:'8px',justifyContent:'flex-start' }}>
        <button
          onClick={save}
          disabled={loading}
          className="cd-press"
          style={{
            display:'inline-flex',alignItems:'center',gap:'7px',
            background:LT.accent,color:'#fff',border:'none',
            padding:'10px 20px',borderRadius:'10px',fontSize:'13.5px',
            fontWeight:700,cursor:'pointer',fontFamily:FF,
            opacity:loading?0.7:1,
          }}
        >
          <SaveIcon/>{loading?'שומר...':'שמור הערות'}
        </button>
        <button onClick={onCancel} className="cd-press" style={{ background:'none',border:`1px solid ${LT.line2}`,color:LT.muted,padding:'10px 16px',borderRadius:'10px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:FF }}>
          ביטול
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   HOTEL NOTES EDITOR — inline small editor per hotel
   ═══════════════════════════════════════════════════════════ */
function HotelNotesEditor({ hotel, onSaved, onCancel }) {
  const [text, setText] = useState(hotel.notes || '')
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    await supabase.from('lodging').update({ notes: text }).eq('id', hotel.id)
    setLoading(false)
    onSaved(hotel.id, text)
  }

  return (
    <div style={{ marginTop:'10px',padding:'12px',background:'#f8faff',borderRadius:'10px',border:`1px solid ${LT.line2}` }}>
      <textarea
        autoFocus
        value={text}
        onChange={e=>setText(e.target.value)}
        onFocus={focusInp}
        onBlur={blurInp}
        placeholder="הוסף הערה על המלון..."
        style={{ ...inp,minHeight:'80px',resize:'vertical',lineHeight:'1.6',fontSize:'13px',marginBottom:'8px',display:'block' }}
      />
      <div style={{ display:'flex',gap:'6px' }}>
        <button onClick={save} disabled={loading} className="cd-press" style={{ background:LT.accent,color:'#fff',border:'none',padding:'6px 14px',borderRadius:'8px',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:FF }}>
          {loading?'...':'שמור'}
        </button>
        <button onClick={onCancel} className="cd-press" style={{ background:'none',border:`1px solid ${LT.line2}`,color:LT.muted,padding:'6px 12px',borderRadius:'8px',fontSize:'12px',cursor:'pointer',fontFamily:FF }}>
          ביטול
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function CountryDetail({ session }) {
  const { country } = useParams()
  const navigate = useNavigate()

  const [notes, setNotes] = useState(null)           // country_notes row
  const [hotels, setHotels] = useState([])           // lodging with trip info
  const [trips, setTrips] = useState([])             // past trips to this country
  const [loading, setLoading] = useState(true)
  const [editingNotes, setEditingNotes] = useState(false)
  const [editingHotelId, setEditingHotelId] = useState(null)

  const heC = heCountry(country)
  const flag = FLAG[country] || '📍'

  useEffect(() => { load() }, [country])

  async function load() {
    setLoading(true)
    const [notesRes, segsRes] = await Promise.all([
      supabase.from('country_notes').select('*').eq('country', country).maybeSingle(),
      supabase.from('trip_segments')
        .select(`id, date_from, date_to, city, trip_id, trips(id, name, name_he)`)
        .eq('country', country)
        .order('date_from', { ascending: false }),
    ])

    setNotes(notesRes.data?.notes || null)

    const segs = segsRes.data || []

    // Unique trips from segments
    const tripMap = new Map()
    for (const s of segs) {
      if (s.trips && !tripMap.has(s.trip_id)) {
        tripMap.set(s.trip_id, {
          id: s.trip_id,
          name: s.trips.name,
          name_he: s.trips.name_he,
          date_from: s.date_from,
        })
      }
    }
    setTrips([...tripMap.values()])

    // Load lodging for all those trips, filtered by date overlap with this country's segments
    if (tripMap.size > 0) {
      const tripIds = [...tripMap.keys()]
      const { data: lodgingData } = await supabase
        .from('lodging')
        .select('*')
        .in('trip_id', tripIds)
        .order('check_in', { ascending: false })

      // For each lodging, figure out if it belongs to this country
      // by checking if check_in falls within any segment of this country
      const segsByTrip = {}
      for (const s of segs) {
        if (!segsByTrip[s.trip_id]) segsByTrip[s.trip_id] = []
        segsByTrip[s.trip_id].push(s)
      }

      const filtered = (lodgingData || []).filter(l => {
        if (!l.check_in) return false
        const relevant = segsByTrip[l.trip_id] || []
        return relevant.some(s => {
          if (!s.date_from) return false
          if (!s.date_to) return l.check_in >= s.date_from
          return l.check_in >= s.date_from && l.check_in < s.date_to
        })
      })

      // Attach trip name to each hotel
      const withTrip = filtered.map(l => ({
        ...l,
        tripName: tripMap.get(l.trip_id)?.name_he || tripMap.get(l.trip_id)?.name || '',
      }))
      setHotels(withTrip)
    }

    setLoading(false)
  }

  function onNotesSaved(text) {
    setNotes(text)
    setEditingNotes(false)
  }

  function onHotelNoteSaved(id, text) {
    setHotels(prev => prev.map(h => h.id === id ? { ...h, notes: text } : h))
    setEditingHotelId(null)
  }

  if (loading) return (
    <div style={{ minHeight:'100dvh', background:LT.pageBg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FF, color:LT.muted }}>
      טוען...
    </div>
  )

  return (
    <div style={{ minHeight:'100dvh', background:LT.pageBg, fontFamily:FF, color:LT.ink, direction:'rtl' }}>
      <style>{STYLES}</style>

      <div className="cd-page" style={{ maxWidth:'860px', margin:'0 auto', padding:'18px 16px 80px' }}>

        {/* ── Shell ── */}
        <div className="cd-shell" style={{
          background:'linear-gradient(180deg,rgba(232,241,255,0.6),transparent 80%)',
          borderRadius:'24px', padding:'14px 16px 22px',
          border:`1px solid rgba(37,99,235,0.08)`,
        }}>

          {/* ── Breadcrumbs ── */}
          <div className="cd-header" style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:'10px',padding:'4px 2px 16px' }}>
            <div style={{
              display:'inline-flex',alignItems:'center',gap:'8px',
              fontSize:'12.5px',color:LT.muted,
              background:'rgba(255,255,255,0.7)',padding:'7px 14px',borderRadius:'999px',
              border:`1px solid ${LT.line2}`,backdropFilter:'blur(8px)',
              minWidth:0,overflow:'hidden',
            }}>
              <button onClick={()=>navigate('/')} style={{ background:'none',border:'none',cursor:'pointer',padding:0,display:'inline-flex',alignItems:'center',gap:'5px',color:LT.accent,fontFamily:FF,fontSize:'12.5px',fontWeight:800,letterSpacing:'0.04em' }}>
                <HomeIcon/><span>BARONS</span>
              </button>
              <span style={{ color:LT.muted2 }}>/</span>
              <button onClick={()=>navigate('/countries')} style={{ background:'none',border:'none',color:LT.muted,cursor:'pointer',padding:0,fontFamily:FF,fontSize:'12.5px',fontWeight:600 }}>יעדים</button>
              <span style={{ color:LT.muted2 }}>/</span>
              <b style={{ color:LT.ink,fontWeight:700 }}>{heC}</b>
            </div>

            {/* Edit button */}
            <button
              className="cd-iconbtn cd-press"
              title={editingNotes ? 'סגור עריכה' : 'ערוך הערות'}
              onClick={() => setEditingNotes(e => !e)}
              style={{
                ...iconBtn(),
                ...(editingNotes ? { background:LT.accent,color:'#fff',borderColor:'transparent' } : {}),
              }}
            >
              <EditIcon/>
            </button>
          </div>

          {/* ── Hero ── */}
          <div style={{
            background:'#fff',border:`1px solid ${LT.line2}`,borderRadius:'20px',
            padding:'20px 24px',marginBottom:'20px',
            boxShadow:'0 6px 24px rgba(37,99,235,0.07)',
            animation:`cd-fade-up 400ms ${EASE.out} both`,
          }}>
            <div style={{ display:'flex',alignItems:'center',gap:'14px' }}>
              <div style={{ fontSize:'48px',lineHeight:1 }}>{flag}</div>
              <div>
                <h1 style={{ margin:0,fontSize:'28px',fontWeight:900,letterSpacing:'-0.02em',color:LT.ink,lineHeight:1.1 }}>{heC}</h1>
                <div style={{ marginTop:'5px',fontSize:'12px',color:LT.muted,fontWeight:600 }}>
                  {trips.length} {trips.length === 1 ? 'ביקור' : 'ביקורים'} · {hotels.length} {hotels.length === 1 ? 'מלון' : 'מלונות'}
                </div>
              </div>
            </div>
          </div>

          <div className="cd-content" style={{ padding:'0 2px' }}>

            {/* ── Notes editor ── */}
            {editingNotes && (
              <NotesEditor
                country={country}
                notes={notes}
                onSaved={onNotesSaved}
                onCancel={() => setEditingNotes(false)}
              />
            )}

            {/* ── Notes display ── */}
            {!editingNotes && (
              <div style={{ marginBottom:'28px' }}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px' }}>
                  <h2 style={{ margin:0,fontSize:'11px',fontWeight:700,letterSpacing:'0.16em',textTransform:'uppercase',color:LT.muted }}>
                    הערות וטיפים
                  </h2>
                  <button
                    onClick={() => setEditingNotes(true)}
                    style={{ background:'none',border:'none',color:LT.accent,fontWeight:700,fontSize:'12px',cursor:'pointer',fontFamily:FF,display:'inline-flex',alignItems:'center',gap:'5px' }}
                  >
                    <EditIcon/>{notes ? 'ערוך' : '+ הוסף הערות'}
                  </button>
                </div>

                {notes ? (
                  <div className="cd-notes-box" style={{
                    background:'#fffbf0',border:'1px solid #f3e5b8',borderRadius:'16px',
                    padding:'20px 24px',
                  }}>
                    <p style={{ margin:0,fontSize:'14.5px',lineHeight:'1.85',color:LT.ink,whiteSpace:'pre-wrap',fontFamily:FF }}>
                      {notes}
                    </p>
                  </div>
                ) : (
                  <div style={{
                    background:'rgba(255,255,255,0.6)',border:`1px dashed ${LT.line2}`,
                    borderRadius:'16px',padding:'24px',textAlign:'center',
                  }}>
                    <div style={{ fontSize:'13px',color:LT.muted2 }}>אין הערות עדיין · לחץ "הוסף הערות" כדי לכתוב</div>
                  </div>
                )}
              </div>
            )}

            {/* ── Hotels ── */}
            {hotels.length > 0 && (
              <div style={{ marginBottom:'28px' }}>
                <h2 style={{ margin:'0 0 12px',fontSize:'11px',fontWeight:700,letterSpacing:'0.16em',textTransform:'uppercase',color:LT.muted }}>
                  מלונות · {hotels.length}
                </h2>
                <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
                  {hotels.map((h, i) => (
                    <div key={h.id} style={{ animation:`cd-card-in 380ms ${EASE.out} both`,animationDelay:`${i*40}ms` }}>
                      <div className="cd-hotel" style={{
                        background:'#fff',border:`1px solid ${LT.line2}`,borderRadius:'14px',
                        padding:'14px 16px',transition:'all .15s ease',
                      }}>
                        <div style={{ display:'flex',alignItems:'flex-start',gap:'12px' }}>
                          {/* Icon */}
                          <div style={{
                            width:'40px',height:'40px',borderRadius:'10px',flexShrink:0,
                            background:'linear-gradient(135deg,#dbeafe,#eff6ff)',
                            display:'flex',alignItems:'center',justifyContent:'center',color:LT.accent,
                          }}><BedIcon/></div>

                          {/* Info */}
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:'15px',fontWeight:800,color:LT.ink,letterSpacing:'-0.01em' }}>{h.hotel_name}</div>
                            <div style={{ display:'flex',gap:'8px',marginTop:'4px',flexWrap:'wrap',alignItems:'center' }}>
                              {h.check_in && (
                                <span style={{ fontSize:'11.5px',color:LT.muted,fontVariantNumeric:'tabular-nums' }}>
                                  {fmtDate(h.check_in)}
                                </span>
                              )}
                              {h.tripName && (
                                <span style={{ fontSize:'11px',background:'#f5f8ff',color:LT.accent,padding:'2px 8px',borderRadius:'999px',fontWeight:600,border:`1px solid ${LT.line}` }}>
                                  {h.tripName}
                                </span>
                              )}
                            </div>

                            {/* Hotel notes */}
                            {h.notes && editingHotelId !== h.id && (
                              <div style={{
                                marginTop:'10px',background:'#f8faff',borderRadius:'8px',
                                padding:'8px 12px',fontSize:'13px',color:LT.ink2,lineHeight:1.6,
                                border:`1px solid ${LT.line}`,
                              }}>
                                <NoteIcon/>{' '}
                                <span style={{ whiteSpace:'pre-wrap' }}>{h.notes}</span>
                              </div>
                            )}

                            {editingHotelId === h.id && (
                              <HotelNotesEditor
                                hotel={h}
                                onSaved={onHotelNoteSaved}
                                onCancel={() => setEditingHotelId(null)}
                              />
                            )}
                          </div>

                          {/* Edit note button */}
                          {editingHotelId !== h.id && (
                            <button
                              onClick={() => setEditingHotelId(h.id)}
                              title={h.notes ? 'ערוך הערה' : 'הוסף הערה'}
                              style={{ background:'none',border:`1px solid ${LT.line2}`,borderRadius:'8px',padding:'4px 10px',fontSize:'11px',color:LT.muted,cursor:'pointer',fontFamily:FF,fontWeight:600,whiteSpace:'nowrap',flexShrink:0 }}
                            >
                              {h.notes ? 'ערוך' : '+ הערה'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Past trips ── */}
            {trips.length > 0 && (
              <div>
                <h2 style={{ margin:'0 0 12px',fontSize:'11px',fontWeight:700,letterSpacing:'0.16em',textTransform:'uppercase',color:LT.muted }}>
                  טיולים · {trips.length}
                </h2>
                <div style={{
                  background:'#fff',border:`1px solid ${LT.line2}`,borderRadius:'16px',
                  overflow:'hidden',
                }}>
                  {trips.map((t, i) => (
                    <button
                      key={t.id}
                      className="cd-trip cd-press"
                      onClick={() => navigate(`/travels/${t.id}`)}
                      style={{
                        width:'100%',background:'none',border:'none',
                        borderTop: i===0 ? 'none' : `1px solid ${LT.line}`,
                        padding:'13px 16px',cursor:'pointer',fontFamily:FF,
                        display:'flex',alignItems:'center',justifyContent:'space-between',
                        gap:'12px',textAlign:'right',transition:'background .12s ease',
                      }}
                    >
                      <div style={{ display:'flex',alignItems:'center',gap:'12px',minWidth:0 }}>
                        <div style={{
                          fontSize:'13px',fontWeight:800,color:LT.accent,
                          background:'rgba(37,99,235,0.07)',padding:'3px 9px',
                          borderRadius:'8px',flexShrink:0,fontVariantNumeric:'tabular-nums',
                        }}>
                          {fmtYear(t.date_from)}
                        </div>
                        <div style={{ fontSize:'14px',fontWeight:700,color:LT.ink,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                          {t.name_he || t.name}
                        </div>
                      </div>
                      <div style={{ color:LT.muted2,flexShrink:0 }}><ChevRight/></div>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
