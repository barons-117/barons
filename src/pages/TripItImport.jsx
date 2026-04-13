import { useState } from 'react'
import { supabase } from '../lib/supabase'

const AIRPORT_INFO = {
  'TLV':{city:'Tel Aviv-Yafo',country:'IL'},'LHR':{city:'London',country:'UK'},
  'LGW':{city:'London',country:'UK'},'LTN':{city:'London',country:'UK'},
  'CDG':{city:'Paris',country:'France'},'ORY':{city:'Paris',country:'France'},
  'AMS':{city:'Amsterdam',country:'Netherlands'},'FRA':{city:'Frankfurt',country:'Germany'},
  'MUC':{city:'Munich',country:'Germany'},'BER':{city:'Berlin',country:'Germany'},
  'VIE':{city:'Vienna',country:'Austria'},'BCN':{city:'Barcelona',country:'Spain'},
  'MAD':{city:'Madrid',country:'Spain'},'FCO':{city:'Rome',country:'Italy'},
  'BRU':{city:'Brussels',country:'Belgium'},'CRL':{city:'Brussels',country:'Belgium'},
  'LIS':{city:'Lisbon',country:'Portugal'},'ATH':{city:'Athens',country:'Greece'},
  'WAW':{city:'Warsaw',country:'Poland'},'BUD':{city:'Budapest',country:'Hungary'},
  'PRG':{city:'Prague',country:'Czech'},
  'BKK':{city:'Bangkok',country:'Thailand'},'HKT':{city:'Phuket',country:'Thailand'},
  'DMK':{city:'Bangkok',country:'Thailand'},'SIN':{city:'Singapore',country:'Singapore'},
  'JFK':{city:'New York City',country:'New York'},'EWR':{city:'Newark',country:'New York'},
  'LGA':{city:'New York City',country:'New York'},'LAX':{city:'Los Angeles',country:'California'},
  'SFO':{city:'San Francisco',country:'California'},'LAS':{city:'Las Vegas',country:'Nevada'},
  'MIA':{city:'Miami',country:'Florida'},'BOS':{city:'Boston',country:'Massachusetts'},
  'ORD':{city:'Chicago',country:'Illinois'},'SEA':{city:'Seattle',country:'Washington'},
  'IAH':{city:'Houston',country:'Texas'},'DFW':{city:'Dallas',country:'Texas'},
  'DCA':{city:'Washington DC',country:'Washington DC'},'IAD':{city:'Washington DC',country:'Washington DC'},
  'ATL':{city:'Atlanta',country:'Georgia'},'DEN':{city:'Denver',country:'Colorado'},
  'PHX':{city:'Phoenix',country:'Arizona'},'SAN':{city:'San Diego',country:'California'},
  'MCO':{city:'Orlando',country:'Florida'},'PDX':{city:'Portland',country:'Oregon'},
  'YVR':{city:'Vancouver',country:'Canada'},'YYZ':{city:'Toronto',country:'Canada'},
  'SYD':{city:'Sydney',country:'Australia'},'AKL':{city:'Auckland',country:'New Zealand'},
  'NRT':{city:'Tokyo',country:'Japan'},'HKG':{city:'Hong Kong',country:'Hong Kong'},
  'KBP':{city:'Kyiv',country:'Ukraine'},
}

const COUNTRY_TO_CONT = {
  'UK':'Europe','Germany':'Europe','Netherlands':'Europe','Spain':'Europe','France':'Europe',
  'Italy':'Europe','Hungary':'Europe','Czech':'Europe','Austria':'Europe','Belgium':'Europe',
  'Switzerland':'Europe','Poland':'Europe','Portugal':'Europe','Greece':'Europe','Ukraine':'Europe',
  'Thailand':'Asia','Japan':'Asia','Singapore':'Asia','Hong Kong':'Asia','South Korea':'Asia',
  'Australia':'Australia','New Zealand':'Australia',
  'New York':'USA','California':'USA','Oregon':'USA','Nevada':'USA','Florida':'USA',
  'Massachusetts':'USA','Illinois':'USA','Texas':'USA','Georgia':'USA','Colorado':'USA',
  'Washington DC':'USA','Washington':'USA','Arizona':'USA','Canada':'America',
  'IL':'Asia',
}

function parseIsoDate(str, yearHint) {
  if (!str) return null
  const months = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'}
  // "23/4/2026"
  let m = str.match(/^(\d+)\/(\d+)\/(\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  // "Apr 23" or "Apr 23 2026"
  m = str.match(/^(\w+)\s+(\d+)(?:\s+(\d{4}))?/)
  if (m && months[m[1]?.slice(0,3)]) {
    return `${m[3]||yearHint||'2026'}-${months[m[1].slice(0,3)]}-${m[2].padStart(2,'0')}`
  }
  return null
}

function parseTime(timeStr, ampm) {
  if (!timeStr) return null
  let [h, mn] = timeStr.split(':').map(Number)
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}`
}

function parseTripItText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const result = { tripName: '', flights: [], hotels: [], segments: [] }
  
  if (!lines.length) return result
  result.tripName = lines[0]
  
  // Extract year from line 1
  let yearHint = 2026
  const ym = lines[1]?.match(/\d{4}/)
  if (ym) yearHint = parseInt(ym[0])

  let currentDate = null
  let pendingTime = null
  let i = 2

  const FIELD_PREFIXES = ['Flight Number','Confirmation','Arrive ','Aircraft','Stops','Distance','Fare Class','Booking Date','Total Cost','Name','Ticket','Loyalty','Travel Agency','Duration','Terminal ','Seat','Room Description','Number of','Phone','Email','Note','Restriction','GEO:','Check ','PRODID','VERSION','Approx']

  function isField(l) { return FIELD_PREFIXES.some(p => l.startsWith(p)) }

  while (i < lines.length) {
    const line = lines[i]

    // Date header: "Thu, Apr 23" or "Mon, Apr 27 2026"
    const dateM = line.match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+(.+)/)
    if (dateM) {
      currentDate = parseIsoDate(dateM[1].trim(), yearHint)
      pendingTime = null
      i++; continue
    }

    // Time: "5:35 AM" or "12:10 PM"
    const timeM = line.match(/^(\d+:\d+)\s+(AM|PM)$/)
    if (timeM) {
      pendingTime = parseTime(timeM[1], timeM[2])
      i++; continue
    }

    // Skip timezone like "GMT+3"
    if (/^GMT[+-]\d+$/.test(line)) { i++; continue }

    // Airport pair: "TLVBUD"
    const apM = line.match(/^([A-Z]{3})([A-Z]{3})$/)
    if (apM) {
      const [, fromCode, toCode] = apM
      const flight = {
        from_airport: fromCode, to_airport: toCode,
        departure_date: currentDate,
        departure_time: pendingTime,
      }
      // Fill city/country from airport
      const fi = AIRPORT_INFO[fromCode]
      const ti = AIRPORT_INFO[toCode]
      if (fi) { flight.from_city = fi.city; flight.from_country = fi.country }
      if (ti) { flight.to_city = ti.city; flight.to_country = ti.country }
      pendingTime = null
      i++
      // Collect flight fields
      while (i < lines.length) {
        const l2 = lines[i]
        if (l2.match(/^([A-Z]{3})([A-Z]{3})$/)) break
        if (l2.match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),/)) break
        const fn = l2.match(/^Flight Number\s+(.+)/)
        if (fn) {
          const parts = fn[1].trim().split(/\s+/)
          if (parts.length >= 2) { flight.airline_code = parts[0]; flight.flight_number = parts[1] }
          else { const mm = fn[1].match(/([A-Z]{2})(\d+)/); if(mm){flight.airline_code=mm[1];flight.flight_number=mm[2]} }
        }
        const conf = l2.match(/^Confirmation\s+(.+)/)
        if (conf) flight.confirmation = conf[1].trim()
        const arr = l2.match(/^Arrive\s+(\d+\/\d+\/\d{4})\s+(\d+:\d+)\s+(AM|PM)/)
        if (arr) { flight.arrival_date = parseIsoDate(arr[1]); flight.arrival_time = parseTime(arr[2], arr[3]) }
        if (l2.startsWith('Aircraft')) flight.aircraft = l2.replace('Aircraft','').trim()
        if (l2.startsWith('Stops')) flight.stops = l2.replace('Stops','').trim()
        if (l2.startsWith('Distance')) flight.distance = l2.replace('Distance','').trim()
        if (l2.startsWith('Fare Class')) flight.service_class = l2.replace('Fare Class','').trim()
        // Stop at hotel check-in/out
        if (l2.startsWith('Check in') || l2.startsWith('Check out')) { i--; break }
        i++
      }
      result.flights.push(flight)
      continue
    }

    // Hotel: non-field line followed by "Check in" or "Check out"
    if (!isField(line) && line.length > 3 && !line.match(/^\d/) && !line.match(/^GMT/)) {
      const next = lines[i+1] || ''
      const next2 = lines[i+2] || ''
      const isCheckIn = next.startsWith('Check in') || next2.startsWith('Check in')
      const isCheckOut = next.startsWith('Check out') || next2.startsWith('Check out')
      if (isCheckIn || isCheckOut) {
        const hotel = { hotel_name: line }
        if (isCheckIn) hotel.check_in = currentDate
        else hotel.check_out = currentDate
        i += 2
        // Collect hotel fields
        while (i < lines.length) {
          const l2 = lines[i]
          if (l2.match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),/)) break
          if (l2.match(/^([A-Z]{3})([A-Z]{3})$/)) break
          if (!isField(l2) && l2.length > 10 && (l2.match(/\d/) && !l2.match(/^\d+:\d+/))) {
            if (!hotel.address) hotel.address = l2
          }
          const conf = l2.match(/^Confirmation\s+(.+)/)
          if (conf) hotel.confirmation = conf[1].trim()
          if (l2.startsWith('Room Description')) hotel.room_type = l2.replace('Room Description','').trim()
          if (l2.startsWith('Number of Guests')) hotel.num_guests = l2.replace('Number of Guests','').trim()
          if (l2.startsWith('Total Cost')) hotel.cost = l2.replace('Total Cost','').trim()
          // Stop at another hotel, airport code, or time (which belongs to next flight)
          const nextL = lines[i+1] || ''
          if (nextL.match(/^\d+:\d+\s+(AM|PM)$/)) { break }
          if (nextL.match(/^[A-Z]{3}[A-Z]{3}$/)) { break }
          if (nextL.startsWith('Check in') || nextL.startsWith('Check out')) { i++; break }
          i++
        }
        result.hotels.push(hotel)
        continue
      }
    }

    i++
  }

  // Merge check-in/check-out for same hotel (same confirmation)
  const merged = []
  result.hotels.forEach(h => {
    const existing = merged.find(m => m.hotel_name === h.hotel_name && m.confirmation === h.confirmation)
    if (existing) { Object.assign(existing, h) }
    else merged.push({...h})
  })
  result.hotels = merged

  // Build segments from airports
  const cities = new Set()
  result.flights.forEach(f => {
    if (f.to_city && f.to_country && f.arrival_date) cities.add(JSON.stringify({city:f.to_city,country:f.to_country,date:f.arrival_date}))
  })
  // Also from first flight departure
  if (result.flights[0]?.from_city) {
    // skip TLV (origin)
  }
  cities.forEach(s => {
    const {city,country,date} = JSON.parse(s)
    if (country !== 'IL') {
      result.segments.push({city,country,date_from:date,continent:COUNTRY_TO_CONT[country]||''})
    }
  })

  return result
}

export default function TripItImport({ tripId, onClose, onSaved }) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function handleParse() {
    if (!text.trim()) return
    try {
      const result = parseTripItText(text)
      setParsed(result)
      setError('')
    } catch(e) {
      setError('שגיאה בניתוח הטקסט: ' + e.message)
    }
  }

  async function handleSave() {
    if (!parsed) return
    setSaving(true)
    setError('')
    try {
      // Save flights
      for (const f of parsed.flights) {
        const { error: fe } = await supabase.from('flights').insert({ ...f, trip_id: tripId })
        if (fe) console.error('flight error:', fe)
      }
      // Save hotels
      for (const h of parsed.hotels) {
        const { error: he } = await supabase.from('lodging').insert({ ...h, trip_id: tripId })
        if (he) console.error('hotel error:', he)
      }
      // Save segments (if trip has none yet)
      const { data: existing } = await supabase.from('trip_segments').select('id').eq('trip_id', tripId)
      if (!existing?.length && parsed.segments.length > 0) {
        for (const s of parsed.segments) {
          await supabase.from('trip_segments').insert({ ...s, trip_id: tripId })
        }
      }
      setDone(true)
      setTimeout(() => { onSaved(); onClose() }, 1200)
    } catch(e) {
      setError('שגיאה בשמירה: ' + e.message)
    }
    setSaving(false)
  }

  const inp = { width:'100%', border:'1.5px solid #cbd5e1', borderRadius:'8px', padding:'10px 12px', fontSize:'13px', fontFamily:'Open Sans,sans-serif', color:'#1e293b', outline:'none', boxSizing:'border-box' }

  if (done) return (
    <div style={{ textAlign:'center', padding:'32px', color:'#16a34a', fontSize:'18px', fontWeight:700 }}>
      ✓ יובא בהצלחה!
    </div>
  )

  return (
    <div>
      {!parsed ? (
        <>
          <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'10px', padding:'14px', marginBottom:'16px', fontSize:'13px', color:'#1e40af', lineHeight:1.7 }}>
            <strong>הדבק טקסט מ-TripIt:</strong><br/>
            פתח את הטיול ב-TripIt → לחץ על Print Trip → בחר הכל (Cmd+A) → העתק (Cmd+C) → הדבק כאן
          </div>
          <textarea
            style={{ ...inp, minHeight:'280px', resize:'vertical', fontSize:'12px' }}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Budapest, Hungary, April 2026&#10;Budapest, Hungary, Apr 23 - 27, 2026 (5 days)...&#10;&#10;Thu, Apr 23&#10;5:35 AM&#10;GMT+3&#10;TLVBUD&#10;Flight Number LY 2365..."
            autoFocus
          />
          {error && <div style={{ color:'#dc2626', fontSize:'12px', marginTop:'8px' }}>{error}</div>}
          <button
            onClick={handleParse}
            disabled={!text.trim()}
            style={{ width:'100%', marginTop:'12px', background:'#1d4ed8', border:'none', color:'white', padding:'12px', borderRadius:'8px', fontSize:'15px', fontWeight:700, cursor:'pointer', opacity:!text.trim()?0.4:1 }}
          >
            נתח טקסט →
          </button>
        </>
      ) : (
        <>
          <div style={{ marginBottom:'20px' }}>
            <h4 style={{ fontSize:'15px', fontWeight:700, color:'#1e293b', marginBottom:'16px' }}>סיכום מה שנמצא:</h4>
            
            {parsed.flights.length > 0 && (
              <div style={{ marginBottom:'14px' }}>
                <div style={{ fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>
                  ✈ {parsed.flights.length} טיסות
                </div>
                {parsed.flights.map((f,i) => (
                  <div key={i} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'10px 14px', marginBottom:'6px', fontSize:'13px' }}>
                    <span style={{ fontWeight:700, color:'#1d4ed8' }}>{f.airline_code}{f.flight_number}</span>
                    <span style={{ color:'#475569', margin:'0 8px' }}>·</span>
                    <span>{f.from_airport} → {f.to_airport}</span>
                    <span style={{ color:'#94a3b8', margin:'0 8px' }}>·</span>
                    <span style={{ color:'#64748b' }}>{f.departure_date}</span>
                    {f.departure_time && <span style={{ color:'#64748b' }}> {f.departure_time}</span>}
                  </div>
                ))}
              </div>
            )}

            {parsed.hotels.length > 0 && (
              <div style={{ marginBottom:'14px' }}>
                <div style={{ fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>
                  🏨 {parsed.hotels.length} מלונות
                </div>
                {parsed.hotels.map((h,i) => (
                  <div key={i} style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'8px', padding:'10px 14px', marginBottom:'6px', fontSize:'13px' }}>
                    <span style={{ fontWeight:700, color:'#15803d' }}>{h.hotel_name}</span>
                    {(h.check_in||h.check_out) && (
                      <span style={{ color:'#64748b', marginRight:'8px' }}> · {h.check_in||'?'} → {h.check_out||'?'}</span>
                    )}
                    {h.confirmation && <span style={{ color:'#94a3b8', fontSize:'11px' }}>({h.confirmation})</span>}
                  </div>
                ))}
              </div>
            )}

            {parsed.flights.length === 0 && parsed.hotels.length === 0 && (
              <div style={{ color:'#dc2626', padding:'16px', background:'#fef2f2', borderRadius:'8px', fontSize:'13px' }}>
                לא נמצאו טיסות או מלונות. ודא שהטקסט מ-TripIt מכיל מידע על טיסות (קוד שדה כמו TLVBUD) ולינות.
              </div>
            )}
          </div>

          {error && <div style={{ color:'#dc2626', fontSize:'12px', marginBottom:'10px', padding:'8px', background:'#fef2f2', borderRadius:'6px' }}>{error}</div>}

          <div style={{ display:'flex', gap:'10px' }}>
            <button onClick={() => setParsed(null)} style={{ flex:1, background:'white', border:'1.5px solid #e2e8f0', color:'#475569', padding:'12px', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
              ← חזור
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (parsed.flights.length === 0 && parsed.hotels.length === 0)}
              style={{ flex:2, background:'#1d4ed8', border:'none', color:'white', padding:'12px', borderRadius:'8px', fontSize:'15px', fontWeight:700, cursor:'pointer', opacity:saving?0.7:1 }}
            >
              {saving ? 'שומר...' : `✓ ייבא הכל (${parsed.flights.length} טיסות, ${parsed.hotels.length} מלונות)`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}


// ── Used from Travels page — creates a NEW trip then imports into it ──────────
export function TripItImportWithTrip({ onClose, onCreated }) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function handleParse() {
    if (!text.trim()) return
    try { setParsed(parseTripItText(text)); setError('') }
    catch(e) { setError('שגיאה: ' + e.message) }
  }

  async function handleSave() {
    if (!parsed) return
    setSaving(true)
    try {
      // 1. Create trip
      const { data: trip, error: te } = await supabase.from('trips')
        .insert({ name: parsed.tripName, name_he: parsed.tripName })
        .select().single()
      if (te || !trip) throw new Error(te?.message || 'שגיאה ביצירת טיול')

      // 2. Flights
      for (const f of parsed.flights) {
        await supabase.from('flights').insert({ ...f, trip_id: trip.id })
      }
      // 3. Hotels
      for (const h of parsed.hotels) {
        await supabase.from('lodging').insert({ ...h, trip_id: trip.id })
      }
      // 4. Segments from flights (destination airports)
      const seenCities = new Set()
      for (const f of parsed.flights) {
        if (f.to_country && f.to_country !== 'IL' && f.to_city && !seenCities.has(f.to_city)) {
          seenCities.add(f.to_city)
          await supabase.from('trip_segments').insert({
            trip_id: trip.id,
            city: f.to_city,
            country: f.to_country,
            continent: COUNTRY_TO_CONT[f.to_country] || '',
            date_from: f.arrival_date || null,
          })
        }
      }

      setDone(true)
      setTimeout(() => { onCreated(); onClose() }, 1200)
    } catch(e) {
      setError('שגיאה: ' + e.message)
    }
    setSaving(false)
  }

  const inp2 = { width:'100%', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'8px', padding:'10px 12px', fontSize:'13px', fontFamily:'Open Sans,sans-serif', color:'#e2e8f0', outline:'none', boxSizing:'border-box', background:'rgba(255,255,255,0.04)' }

  if (done) return <div style={{ textAlign:'center', padding:'32px', color:'#34d399', fontSize:'18px', fontWeight:700 }}>✓ הטיול יובא בהצלחה!</div>

  return (
    <div>
      {!parsed ? (
        <>
          <textarea
            style={{ ...inp2, minHeight:'260px', resize:'vertical', fontSize:'12px' }}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={"Budapest, Hungary, April 2026\nBudapest, Hungary, Apr 23 - 27, 2026...\n\nThu, Apr 23\n5:35 AM\nGMT+3\nTLVBUD\nFlight Number LY 2365..."}
            autoFocus
          />
          {error && <div style={{ color:'#f87171', fontSize:'12px', marginTop:'8px' }}>{error}</div>}
          <button onClick={handleParse} disabled={!text.trim()}
            style={{ width:'100%', marginTop:'12px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', color:'white', padding:'12px', borderRadius:'10px', fontSize:'15px', fontWeight:700, cursor:'pointer', opacity:!text.trim()?0.4:1 }}>
            נתח טקסט →
          </button>
        </>
      ) : (
        <>
          <div style={{ marginBottom:'16px', fontSize:'15px', fontWeight:700, color:'#e2e8f0' }}>
            יוצר טיול: <span style={{ color:'#60a5fa' }}>{parsed.tripName}</span>
          </div>
          {parsed.flights.length > 0 && (
            <div style={{ marginBottom:'12px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>✈ {parsed.flights.length} טיסות</div>
              {parsed.flights.map((f,i) => (
                <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'8px 14px', marginBottom:'5px', fontSize:'13px', color:'#94a3b8' }}>
                  <span style={{ color:'#60a5fa', fontWeight:700 }}>{f.airline_code}{f.flight_number}</span>
                  {' · '}{f.from_airport} → {f.to_airport}{' · '}{f.departure_date}
                </div>
              ))}
            </div>
          )}
          {parsed.hotels.length > 0 && (
            <div style={{ marginBottom:'16px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>🏨 {parsed.hotels.length} מלונות</div>
              {parsed.hotels.map((h,i) => (
                <div key={i} style={{ background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.1)', borderRadius:'8px', padding:'8px 14px', marginBottom:'5px', fontSize:'13px', color:'#94a3b8' }}>
                  <span style={{ color:'#34d399', fontWeight:700 }}>{h.hotel_name}</span>
                  {h.check_in && <span> · {h.check_in} → {h.check_out||'?'}</span>}
                </div>
              ))}
            </div>
          )}
          {error && <div style={{ color:'#f87171', fontSize:'12px', marginBottom:'10px' }}>{error}</div>}
          <div style={{ display:'flex', gap:'10px' }}>
            <button onClick={() => setParsed(null)} style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#94a3b8', padding:'11px', borderRadius:'8px', fontSize:'14px', cursor:'pointer' }}>← חזור</button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex:2, background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', color:'white', padding:'11px', borderRadius:'8px', fontSize:'14px', fontWeight:700, cursor:'pointer', opacity:saving?0.7:1 }}>
              {saving ? 'שומר...' : `✓ צור טיול (${parsed.flights.length} טיסות, ${parsed.hotels.length} מלונות)`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
