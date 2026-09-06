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
  'MXP':{city:'Milan',country:'Italy'},'LIN':{city:'Milan',country:'Italy'},
  'BGY':{city:'Milan',country:'Italy'},'VCE':{city:'Venice',country:'Italy'},
  'NAP':{city:'Naples',country:'Italy'},'FLR':{city:'Florence',country:'Italy'},
  'PSA':{city:'Pisa',country:'Italy'},'BLQ':{city:'Bologna',country:'Italy'},
  'TRN':{city:'Turin',country:'Italy'},'CIA':{city:'Rome',country:'Italy'},
  'CTA':{city:'Catania',country:'Italy'},'PMO':{city:'Palermo',country:'Italy'},
  'PMI':{city:'Palma de Mallorca',country:'Spain'},'AGP':{city:'Malaga',country:'Spain'},
  'VLC':{city:'Valencia',country:'Spain'},'SVQ':{city:'Seville',country:'Spain'},
  'BIO':{city:'Bilbao',country:'Spain'},'ALC':{city:'Alicante',country:'Spain'},
  'IBZ':{city:'Ibiza',country:'Spain'},'TFS':{city:'Tenerife',country:'Spain'},
  'OPO':{city:'Porto',country:'Portugal'},'FAO':{city:'Faro',country:'Portugal'},
  'NCE':{city:'Nice',country:'France'},'LYS':{city:'Lyon',country:'France'},
  'MRS':{city:'Marseille',country:'France'},'TLS':{city:'Toulouse',country:'France'},
  'BOD':{city:'Bordeaux',country:'France'},'BVA':{city:'Paris',country:'France'},
  'HAM':{city:'Hamburg',country:'Germany'},'DUS':{city:'Dusseldorf',country:'Germany'},
  'CGN':{city:'Cologne',country:'Germany'},'STR':{city:'Stuttgart',country:'Germany'},
  'TXL':{city:'Berlin',country:'Germany'},'SXF':{city:'Berlin',country:'Germany'},
  'ZRH':{city:'Zurich',country:'Switzerland'},'GVA':{city:'Geneva',country:'Switzerland'},
  'BSL':{city:'Basel',country:'Switzerland'},
  'CPH':{city:'Copenhagen',country:'Denmark'},'ARN':{city:'Stockholm',country:'Sweden'},
  'OSL':{city:'Oslo',country:'Norway'},'HEL':{city:'Helsinki',country:'Finland'},
  'KEF':{city:'Reykjavik',country:'Iceland'},'DUB':{city:'Dublin',country:'Ireland'},
  'EDI':{city:'Edinburgh',country:'UK'},'MAN':{city:'Manchester',country:'UK'},
  'STN':{city:'London',country:'UK'},'BHX':{city:'Birmingham',country:'UK'},
  'EIN':{city:'Eindhoven',country:'Netherlands'},'RTM':{city:'Rotterdam',country:'Netherlands'},
  'KRK':{city:'Krakow',country:'Poland'},'GDN':{city:'Gdansk',country:'Poland'},
  'OTP':{city:'Bucharest',country:'Romania'},'SOF':{city:'Sofia',country:'Bulgaria'},
  'ZAG':{city:'Zagreb',country:'Croatia'},'SPU':{city:'Split',country:'Croatia'},
  'DBV':{city:'Dubrovnik',country:'Croatia'},'LJU':{city:'Ljubljana',country:'Slovenia'},
  'BTS':{city:'Bratislava',country:'Slovakia'},'TIA':{city:'Tirana',country:'Albania'},
  'MLA':{city:'Valletta',country:'Malta'},'LCA':{city:'Larnaca',country:'Cyprus'},
  'IST':{city:'Istanbul',country:'Turkey'},'SAW':{city:'Istanbul',country:'Turkey'},
  'AYT':{city:'Antalya',country:'Turkey'},'SKG':{city:'Thessaloniki',country:'Greece'},
  'HER':{city:'Heraklion',country:'Greece'},'JTR':{city:'Santorini',country:'Greece'},
  'RHO':{city:'Rhodes',country:'Greece'},'JMK':{city:'Mykonos',country:'Greece'},
  'TBS':{city:'Tbilisi',country:'Georgia (country)'},'SVO':{city:'Moscow',country:'Russia'},
  'DXB':{city:'Dubai',country:'UAE'},'AUH':{city:'Abu Dhabi',country:'UAE'},
  'DOH':{city:'Doha',country:'Qatar'},'AMM':{city:'Amman',country:'Jordan'},
  'CAI':{city:'Cairo',country:'Egypt'},'SSH':{city:'Sharm El Sheikh',country:'Egypt'},
  'RAK':{city:'Marrakesh',country:'Morocco'},'CMN':{city:'Casablanca',country:'Morocco'},
  'JNB':{city:'Johannesburg',country:'South Africa'},'CPT':{city:'Cape Town',country:'South Africa'},
  'DEL':{city:'Delhi',country:'India'},'BOM':{city:'Mumbai',country:'India'},
  'KUL':{city:'Kuala Lumpur',country:'Malaysia'},'DPS':{city:'Bali',country:'Indonesia'},
  'CGK':{city:'Jakarta',country:'Indonesia'},'MNL':{city:'Manila',country:'Philippines'},
  'SGN':{city:'Ho Chi Minh City',country:'Vietnam'},'HAN':{city:'Hanoi',country:'Vietnam'},
  'ICN':{city:'Seoul',country:'South Korea'},'PVG':{city:'Shanghai',country:'China'},
  'PEK':{city:'Beijing',country:'China'},'PKX':{city:'Beijing',country:'China'},
  'TPE':{city:'Taipei',country:'Taiwan'},'HND':{city:'Tokyo',country:'Japan'},
  'KIX':{city:'Osaka',country:'Japan'},'MEL':{city:'Melbourne',country:'Australia'},
  'BNE':{city:'Brisbane',country:'Australia'},'PER':{city:'Perth',country:'Australia'},
  'CUN':{city:'Cancun',country:'Mexico'},'MEX':{city:'Mexico City',country:'Mexico'},
  'NAS':{city:'Nassau',country:'Bahamas'},'SJU':{city:'San Juan',country:'Puerto Rico'},
  'GRU':{city:'Sao Paulo',country:'Brazil'},'GIG':{city:'Rio de Janeiro',country:'Brazil'},
  'EZE':{city:'Buenos Aires',country:'Argentina'},'SCL':{city:'Santiago',country:'Chile'},
  'LIM':{city:'Lima',country:'Peru'},'BOG':{city:'Bogota',country:'Colombia'},
  'YUL':{city:'Montreal',country:'Canada'},'YYC':{city:'Calgary',country:'Canada'},
  'HNL':{city:'Honolulu',country:'Hawaii'},'ANC':{city:'Anchorage',country:'Alaska'},
  'MSP':{city:'Minneapolis',country:'Minnesota'},'DTW':{city:'Detroit',country:'Michigan'},
  'CLT':{city:'Charlotte',country:'North Carolina'},'BNA':{city:'Nashville',country:'Tennessee'},
  'MSY':{city:'New Orleans',country:'Louisiana'},'AUS':{city:'Austin',country:'Texas'},
  'SLC':{city:'Salt Lake City',country:'Utah'},'PHL':{city:'Philadelphia',country:'Pennsylvania'},
  'TPA':{city:'Tampa',country:'Florida'},'FLL':{city:'Fort Lauderdale',country:'Florida'},
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
  // ── cruise ports ──
  'Croatia':'Europe','Slovenia':'Europe','Montenegro':'Europe','Albania':'Europe',
  'Malta':'Europe','Cyprus':'Europe','Turkey':'Europe','Norway':'Europe',
  'Denmark':'Europe','Sweden':'Europe','Finland':'Europe','Estonia':'Europe',
  'Latvia':'Europe','Lithuania':'Europe','Iceland':'Europe','Ireland':'Europe',
  'Monaco':'Europe','Gibraltar':'Europe','Romania':'Europe','Bulgaria':'Europe',
  'Serbia':'Europe','Slovakia':'Europe','Russia':'Europe','Luxembourg':'Europe',
  'Bosnia':'Europe','Georgia (country)':'Europe',
  'China':'Asia','Taiwan':'Asia','Vietnam':'Asia','Cambodia':'Asia','Malaysia':'Asia',
  'Indonesia':'Asia','Philippines':'Asia','India':'Asia','Sri Lanka':'Asia',
  'UAE':'Asia','Oman':'Asia','Qatar':'Asia','Jordan':'Asia','Maldives':'Asia',
  'Morocco':'Africa','Tunisia':'Africa','Egypt':'Africa','South Africa':'Africa',
  'Kenya':'Africa','Tanzania':'Africa','Namibia':'Africa','Senegal':'Africa',
  'Cape Verde':'Africa','Mauritius':'Africa','Seychelles':'Africa',
  'Mexico':'America','Bahamas':'America','Jamaica':'America','Cayman Islands':'America',
  'Puerto Rico':'America','Dominican Republic':'America','Aruba':'America',
  'Curacao':'America','Bonaire':'America','Barbados':'America','Saint Lucia':'America',
  'Sint Maarten':'America','Antigua':'America','Grenada':'America','Belize':'America',
  'Costa Rica':'America','Panama':'America','Colombia':'America','Ecuador':'America',
  'Peru':'America','Chile':'America','Argentina':'America','Brazil':'America',
  'Uruguay':'America','Bermuda':'America','Honduras':'America','Guatemala':'America',
  'Nicaragua':'America','Trinidad and Tobago':'America','Saint Kitts':'America',
  'Fiji':'Australia','French Polynesia':'Australia','New Caledonia':'Australia',
  'Vanuatu':'Australia','Papua New Guinea':'Australia',
  'USA':'USA','UK':'Europe',
}

/* ────────────────────────────────────────────────────────────────────────────
   Cruise ports — "PALMA DE MALLORCA, SPAIN", "ROME (CIVITAVECCHIA), ITALY",
   and TripIt's comma-less "FLORENCE/PISA(LASPEZIA)ITALY".
   ──────────────────────────────────────────────────────────────────────────── */

// Aliases the cruise lines actually print → the canonical name used above
const PORT_COUNTRY_ALIAS = {
  'UNITED KINGDOM':'UK','GREAT BRITAIN':'UK','ENGLAND':'UK','SCOTLAND':'UK','WALES':'UK',
  'UNITED STATES':'USA','UNITED STATES OF AMERICA':'USA','U.S.A.':'USA','US':'USA',
  'ISRAEL':'IL','CZECH REPUBLIC':'Czech','CZECHIA':'Czech','HOLLAND':'Netherlands',
  'BOSNIA AND HERZEGOVINA':'Bosnia','ST LUCIA':'Saint Lucia','ST. LUCIA':'Saint Lucia',
  'ST MAARTEN':'Sint Maarten','ST. MAARTEN':'Sint Maarten','SINT MAARTEN':'Sint Maarten',
  'ST KITTS':'Saint Kitts','ST. KITTS':'Saint Kitts','CURACAO':'Curacao','CURAÇAO':'Curacao',
  'TAHITI':'French Polynesia','KOREA':'South Korea','UNITED ARAB EMIRATES':'UAE',
}


// TripIt's print view puts the word "to" inside its own element, so a plain
// Cmd+A / Cmd+C glues it to the codes: "TLVtoJFK" instead of "TLVJFK".
// Accept every separator we've seen in the wild.
const AIRPORT_PAIR_RE = /^([A-Z]{3})\s*(?:to|To|TO|→|->|-|–|—|\/|\|)?\s*([A-Z]{3})$/

function matchAirportPair(line) {
  const m = line.match(AIRPORT_PAIR_RE)
  if (!m || m[1] === m[2]) return null
  return m
}

// A cruise event is only ever a few lines above its "Ship Name" field.
function looksLikeCruise(lines, i) {
  for (let k = i + 1; k <= i + 6 && k < lines.length; k++) {
    if (lines[k].startsWith('Ship Name')) return true
    if (/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),/.test(lines[k])) return false
  }
  return false
}

// US airports in AIRPORT_INFO carry the state name in `country`, so the
// fallback path (trip name only) has to expand the 2-letter abbreviation.
const US_STATE = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',
  IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
  ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',
  MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',
  NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',
  NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',
  PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
  TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
  WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'Washington DC',
}
const US_STATE_NAMES = new Set(Object.values(US_STATE))

function contOf(country) {
  if (!country) return ''
  if (COUNTRY_TO_CONT[country]) return COUNTRY_TO_CONT[country]
  if (US_STATE_NAMES.has(country)) return 'USA'
  return ''
}

const MONTH_WORD = /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i

// "New York, NY, September 2026" -> { city:'New York', country:'New York' }
// "Budapest, Hungary, April 2026" -> { city:'Budapest', country:'Hungary' }
function guessPlaceFromTripName(name) {
  const parts = String(name || '').split(',').map(p => p.trim()).filter(Boolean)
  const city = parts[0] || ''
  let country = ''
  const second = parts[1] || ''
  if (second && !MONTH_WORD.test(second) && !/^\d{4}$/.test(second)) {
    country = US_STATE[second.toUpperCase()] || second
  }
  return { city, country, continent: contOf(country) }
}

// Every spelling we might see at the end of a port string, longest first so
// "UNITED STATES" wins over "STATES" and "SOUTH AFRICA" over "AFRICA".
const PORT_COUNTRY_LOOKUP = (() => {
  const map = {}
  Object.keys(COUNTRY_TO_CONT).forEach(c => { map[c.toUpperCase()] = c })
  Object.values(US_STATE).forEach(st => { map[st.toUpperCase()] = st })
  Object.entries(US_STATE).forEach(([ab, st]) => { map[ab] = st })
  Object.entries(PORT_COUNTRY_ALIAS).forEach(([k, v]) => { map[k] = v })
  return Object.keys(map).sort((a, b) => b.length - a.length).map(k => [k, map[k]])
})()

const SMALL_WORDS = new Set(['de','del','della','di','da','do','dos','das','la','le','les',
  'las','los','el','al','van','den','der','of','and','on','the','sur','a','y','e','di','au'])

// "PALMA DE MALLORCA" → "Palma de Mallorca"
function titleCasePlace(raw) {
  return String(raw).toLowerCase().split(/\s+/).filter(Boolean).map((w, idx) => {
    if (idx > 0 && SMALL_WORDS.has(w)) return w
    return w.replace(/[a-z\u00e0-\u00ff]/, ch => ch.toUpperCase())
  }).join(' ')
}

const AT_SEA_RE = /\b(at sea|cruising|sea day|day at sea|scenic)\b/i

// "ROME (CIVITAVECCHIA), ITALY" → { city:'Rome', country:'Italy' }
function parsePortName(raw) {
  let str = String(raw || '').trim()
  if (!str) return null
  let country = ''
  const up = str.toUpperCase()
  for (const [needle, canon] of PORT_COUNTRY_LOOKUP) {
    if (!up.endsWith(needle)) continue
    const before = str.slice(0, str.length - needle.length)
    // Require a real boundary so "ITALY" can't be clipped off "VITALY"
    if (before !== '' && /[A-Za-z]$/.test(before)) continue
    country = canon
    str = before
    break
  }
  str = str.replace(/\([^)]*\)/g, ' ')          // drop "(CIVITAVECCHIA)"
  str = str.replace(/[,\-–—/|]+\s*$/, '').trim() // trailing separators
  str = str.split('/')[0].trim()                // "FLORENCE/PISA" → "FLORENCE"
  str = str.replace(/\s{2,}/g, ' ').trim()
  const city = titleCasePlace(str) || titleCasePlace(country)
  if (!city) return null
  return { city, country, continent: contOf(country) }
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
  const result = { tripName: '', flights: [], hotels: [], cruises: [], cruise: null, segments: [], unknownAirports: [] }
  const cruiseEvents = []
  const cruise = { line: '', ship: '', cabinNumber: '', cabinType: '', confirmation: '', cost: '', names: [] }
  
  if (!lines.length) return result
  result.tripName = lines[0]
  
  // Extract year from line 1
  let yearHint = 2026
  const ym = lines[1]?.match(/\d{4}/)
  if (ym) yearHint = parseInt(ym[0])

  let currentDate = null
  let pendingTime = null
  let i = 2

  const FIELD_PREFIXES = ['Flight Number','Confirmation','Arrive ','Aircraft','Stops','Distance','Fare Class','Booking Date','Total Cost','Name','Ticket','Loyalty','Travel Agency','Duration','Terminal ','Seat','Room Description','Number of','Phone','Email','Note','Restriction','GEO:','Check ','PRODID','VERSION','Approx','Ship Name','Cabin ','Dining','Depart:','Onboard']

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

    // ── Cruise block ───────────────────────────────────────────────────────
    // Royal Caribbean / MSC / Celebrity all print the same shape:
    //   [cruise line]            ← embark & disembark only
    //   Embark PORT | PORT       ← ports of call repeat the name twice
    //   PORT
    //   Depart: 23/8/2027 ...    ← ports of call only
    //   Confirmation2259730 / Ship Name... / Cabin Number... / Cabin Type...
    // "Ship Name" a few lines down is the reliable marker.
    if (looksLikeCruise(lines, i)) {
      let kind = null, portRaw = null
      let cm = line.match(/^Embark\s+(.+)/)
      if (cm) { kind = 'embark'; portRaw = cm[1].trim() }
      else if ((cm = line.match(/^Disembark\s+(.+)/))) { kind = 'disembark'; portRaw = cm[1].trim() }
      else if (lines[i + 1] === line) { kind = 'port'; portRaw = line }

      if (!portRaw) {
        // bare cruise-line name sitting above Embark/Disembark
        if (!isField(line) && !cruise.line) cruise.line = line
        i++; continue
      }

      const ev = { kind, portRaw, date: currentDate }
      pendingTime = null
      i++
      if (lines[i] === portRaw || lines[i] === line) i++   // the repeated port line

      while (i < lines.length) {
        const l2 = lines[i]
        if (/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),/.test(l2)) break
        if (/^\d+:\d+\s+(AM|PM)$/.test(l2)) break
        if (matchAirportPair(l2)) break
        const dep = l2.match(/^Depart:\s*(\d+\/\d+\/\d{4})/)
        if (dep) ev.depart_date = parseIsoDate(dep[1])
        const cf = l2.match(/^Confirmation\s*(.+)/)
        if (cf && !cruise.confirmation) cruise.confirmation = cf[1].trim()
        if (l2.startsWith('Ship Name')    && !cruise.ship)        cruise.ship        = l2.replace('Ship Name','').trim()
        if (l2.startsWith('Cabin Number') && !cruise.cabinNumber) cruise.cabinNumber = l2.replace('Cabin Number','').trim()
        if (l2.startsWith('Cabin Type')   && !cruise.cabinType)   cruise.cabinType   = l2.replace('Cabin Type','').trim()
        if (l2.startsWith('Total Cost')   && !cruise.cost)        cruise.cost        = l2.replace('Total Cost','').trim()
        const nm = l2.match(/^Name\s*(.+)/)
        if (nm) cruise.names.push(nm[1].trim())
        i++
      }
      cruiseEvents.push(ev)
      continue
    }

    // Airport pair: "TLVBUD" / "TLVtoJFK" / "TLV to JFK"
    const apM = matchAirportPair(line)
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
      ;[[fromCode, fi], [toCode, ti]].forEach(([code, info]) => {
        if (!info && !result.unknownAirports.includes(code)) result.unknownAirports.push(code)
      })
      pendingTime = null
      i++
      // Collect flight fields
      while (i < lines.length) {
        const l2 = lines[i]
        if (matchAirportPair(l2)) break
        if (l2.match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),/)) break
        const fn = l2.match(/^Flight Number\s+(.+)/)
        if (fn) {
          const parts = fn[1].trim().split(/\s+/)
          if (parts.length >= 2) { flight.airline_code = parts[0]; flight.flight_number = parts[1] }
          else { const mm = fn[1].match(/([A-Z]{2})(\d+)/); if(mm){flight.airline_code=mm[1];flight.flight_number=mm[2]} }
        }
        const conf = l2.match(/^Confirmation\s*(.+)/)
        if (conf && !flight.confirmation) flight.confirmation = conf[1].trim()
        const arr = l2.match(/^Arrive\s+(\d+\/\d+\/\d{4})\s+(\d+:\d+)\s+(AM|PM)/)
        if (arr) { flight.arrival_date = parseIsoDate(arr[1]); flight.arrival_time = parseTime(arr[2], arr[3]) }
        if (l2.startsWith('Aircraft')) flight.aircraft = l2.replace('Aircraft','').trim()
        if (l2.startsWith('Stops')) flight.stops = l2.replace('Stops','').trim()
        if (l2.startsWith('Distance')) flight.distance = l2.replace('Distance','').trim()
        if (l2.startsWith('Fare Class')) flight.service_class = l2.replace('Fare Class','').trim()
        if (l2.startsWith('Total Cost') && !flight.cost) flight.cost = l2.replace('Total Cost','').trim()
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
          if (matchAirportPair(l2)) break
          if (!isField(l2) && l2.length > 10 && (l2.match(/\d/) && !l2.match(/^\d+:\d+/))) {
            if (!hotel.address) hotel.address = l2
          }
          const conf = l2.match(/^Confirmation\s*(.+)/)
          if (conf && !hotel.confirmation) hotel.confirmation = conf[1].trim()
          if (l2.startsWith('Room Description')) hotel.room_type = l2.replace('Room Description','').trim()
          if (l2.startsWith('Number of Guests')) hotel.num_guests = l2.replace('Number of Guests','').trim()
          if (l2.startsWith('Total Cost')) hotel.cost = l2.replace('Total Cost','').trim()
          // Stop at another hotel, airport code, or time (which belongs to next flight)
          const nextL = lines[i+1] || ''
          if (nextL.match(/^\d+:\d+\s+(AM|PM)$/)) { break }
          if (matchAirportPair(nextL)) { break }
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

  // ── Cruise → the ship becomes one lodging row ──────────────────────────
  const cruisePorts = []
  if (cruiseEvents.length) {
    const evDates   = cruiseEvents.map(e => e.date).filter(Boolean).sort()
    const embark    = cruiseEvents.find(e => e.kind === 'embark')
    const disembark = [...cruiseEvents].reverse().find(e => e.kind === 'disembark')
    // "NameRoyal Caribbean" is the supplier, not a passenger
    const guests = [...new Set(cruise.names.filter(n => n && n !== cruise.line))]
    const inPort  = parsePortName(embark?.portRaw || '')
    const outPort = parsePortName(disembark?.portRaw || '')
    const from = embark?.date    || evDates[0] || null
    const to   = disembark?.date || evDates[evDates.length - 1] || null
    const cabin = [cruise.cabinType, cruise.cabinNumber].filter(Boolean).join(' · ')

    result.cruise = {
      line: cruise.line, ship: cruise.ship, cabin, guests,
      confirmation: cruise.confirmation, cost: cruise.cost, from, to,
    }
    result.cruises.push({
      hotel_name: cruise.ship || cruise.line || 'Cruise',
      booking_site: cruise.line || null,
      room_type: cabin || null,
      address: [inPort?.city, outPort?.city].filter(Boolean).join(' → ') || null,
      check_in: from, check_out: to,
      confirmation: cruise.confirmation || null,
      cost: cruise.cost || null,
      num_guests: guests.length ? String(guests.length) : null,
    })

    // Each call is a single day ashore: date_from === date_to.
    cruiseEvents.forEach(e => {
      if (!e.date || AT_SEA_RE.test(e.portRaw)) return
      const pt = parsePortName(e.portRaw)
      if (!pt) return
      cruisePorts.push({
        city: pt.city, country: pt.country, continent: pt.continent,
        date_from: e.date, date_to: e.depart_date || e.date,
      })
    })
  }

  // ── Build trip segments ────────────────────────────────────────────────
  // Every segment MUST end up with a date_from: Travels.jsx drops any trip
  // whose segments have none (`.filter(t => t.startDate)`), so a trip with
  // only lodging would silently disappear from the list.
  const allLodging = [...result.hotels, ...result.cruises]
  const homeward  = [...result.flights].reverse().find(f => f.to_country === 'IL')
  const checkIns  = allLodging.map(h => h.check_in).filter(Boolean).sort()
  const checkOuts = allLodging.map(h => h.check_out).filter(Boolean).sort()
  const tripEnd = homeward?.departure_date || checkOuts[checkOuts.length - 1] || null

  // Flight destinations. A city that is already a cruise port isn't repeated —
  // instead the port's window is pulled back to the day the flight landed.
  const stops = []
  result.flights.forEach(f => {
    if (!f.to_city || f.to_country === 'IL') return
    const when = f.arrival_date || f.departure_date || null
    const port = cruisePorts.find(cp => cp.city === f.to_city)
    if (port) {
      if (when && when < port.date_from) port.date_from = when
      return
    }
    if (stops.some(x => x.city === f.to_city)) return
    stops.push({
      city: f.to_city,
      country: f.to_country || '',
      continent: contOf(f.to_country),
      date_from: when,
    })
  })

  stops.forEach((st, idx) => {
    st.date_to = stops[idx + 1]?.date_from || tripEnd || st.date_from
  })

  // Fallback — nothing datable came out of the flights or the ports. This is
  // the common case for an airport we don't know (the flight parses fine but
  // carries no city), and for a lodging-only paste. Derive the place from the
  // trip name and the dates from whatever we do have, so the trip is never
  // filtered out of /travels for want of a segment.
  if (!stops.length && !cruisePorts.length) {
    const outbound = result.flights.find(f => f.to_country !== 'IL') || result.flights[0]
    const from = outbound?.arrival_date || outbound?.departure_date
      || checkIns[0] || checkOuts[0] || null
    const to = tripEnd || checkOuts[checkOuts.length - 1] || from
    const g = guessPlaceFromTripName(result.tripName)
    if (from && g.city) {
      stops.push({
        city: g.city, country: g.country, continent: g.continent,
        date_from: from, date_to: to || from,
      })
    }
  }

  result.segments = [...cruisePorts, ...stops]
    .filter(sg => sg.date_from)
    .sort((a, b) => a.date_from.localeCompare(b.date_from) || a.city.localeCompare(b.city))

  // The trip shouldn't end before the flight home leaves.
  const last = result.segments[result.segments.length - 1]
  if (last && tripEnd && tripEnd > last.date_to) last.date_to = tripEnd

  return result
}

/* ────────────────────────────────────────────────────────────────────────────
   Duplicate detection — re-importing the same trip after editing it in TripIt
   ──────────────────────────────────────────────────────────────────────────── */

const DAY_MS = 86400000
// T12:00:00 avoids the DST/timezone off-by-one that bites plain `new Date(iso)`
function daysApart(a, b) {
  return Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / DAY_MS)
}

// Full date span of a freshly parsed paste
function parsedRange(parsed) {
  const d = []
  parsed.segments.forEach(s => { if (s.date_from) d.push(s.date_from); if (s.date_to) d.push(s.date_to) })
  parsed.flights.forEach(f => { if (f.departure_date) d.push(f.departure_date); if (f.arrival_date) d.push(f.arrival_date) })
  ;[...parsed.hotels, ...(parsed.cruises || [])].forEach(h => {
    if (h.check_in) d.push(h.check_in); if (h.check_out) d.push(h.check_out)
  })
  if (!d.length) return null
  d.sort()
  return { from: d[0], to: d[d.length - 1] }
}

// Same null-date_to fallback Travels.jsx uses: next segment's date_from
function segmentsRange(segsRaw) {
  const segs = [...(segsRaw || [])].filter(s => s.date_from).sort((a, b) => a.date_from.localeCompare(b.date_from))
  if (!segs.length) return null
  const tos = segs.map((s, i) => s.date_to || segs[i + 1]?.date_from || s.date_from).sort()
  return { from: segs[0].date_from, to: tos[tos.length - 1] }
}

// >0 → number of overlapping days.  <=0 → -gap between the two ranges.
function proximity(a, b) {
  const start = a.from > b.from ? a.from : b.from
  const end   = a.to   < b.to   ? a.to   : b.to
  return daysApart(end, start) + 1
}

// Trips whose dates overlap, or sit within `tolerance` days of, the new paste
async function findSimilarTrips(range, excludeId = null, tolerance = 3) {
  if (!range) return []
  const { data, error } = await supabase
    .from('trips')
    .select('id, name, name_he, trip_segments(date_from, date_to), flights(id, departure_date, arrival_date), lodging(id, check_in, check_out)')
  if (error || !data) return []
  const out = []
  for (const t of data) {
    if (excludeId && t.id === excludeId) continue
    let r = segmentsRange(t.trip_segments)
    // No segments means the trip is hidden from /travels. Fall back to its
    // flight and lodging dates so a re-paste can still find it and replace it,
    // instead of quietly creating a second copy of the same trip.
    let orphan = false
    if (!r) {
      const d = []
      ;(t.flights || []).forEach(f => {
        if (f.departure_date) d.push(f.departure_date)
        if (f.arrival_date) d.push(f.arrival_date)
      })
      ;(t.lodging || []).forEach(l => {
        if (l.check_in) d.push(l.check_in)
        if (l.check_out) d.push(l.check_out)
      })
      if (!d.length) continue
      d.sort()
      r = { from: d[0], to: d[d.length - 1] }
      orphan = true
    }
    const prox = proximity(range, r)
    if (prox < -tolerance) continue
    out.push({
      id: t.id,
      label: t.name_he || t.name || '(ללא שם)',
      from: r.from, to: r.to,
      flights: (t.flights || []).length,
      lodging: (t.lodging || []).length,
      overlap: prox > 0 ? prox : 0,
      gap: prox <= 0 ? -prox : 0,
      prox, orphan,
    })
  }
  return out.sort((a, b) => b.prox - a.prox)
}

// Deletes everything the importer owns for a trip. Returns the companion ids
// that were attached, so they can be re-linked to the fresh segments —
// TripIt doesn't carry them, and losing them on every re-import would hurt.
async function wipeTripContent(tripId) {
  const { data: segs } = await supabase.from('trip_segments').select('id').eq('trip_id', tripId)
  const segIds = (segs || []).map(s => s.id)
  let companionIds = []
  if (segIds.length) {
    const { data: sc } = await supabase.from('segment_companions').select('companion_id').in('segment_id', segIds)
    companionIds = [...new Set((sc || []).map(x => x.companion_id).filter(Boolean))]
    await supabase.from('segment_companions').delete().in('segment_id', segIds)
  }
  await supabase.from('trip_segments').delete().eq('trip_id', tripId)
  await supabase.from('flights').delete().eq('trip_id', tripId)
  await supabase.from('lodging').delete().eq('trip_id', tripId)
  return companionIds
}

// Writes flights / hotels / segments into a trip. Returns a list of problems.
async function writeParsedInto(tripId, parsed, companionIds = []) {
  const problems = []
  for (const f of parsed.flights) {
    const { error } = await supabase.from('flights').insert({ ...f, trip_id: tripId })
    if (error) problems.push(`טיסה ${f.airline_code || ''}${f.flight_number || ''}: ${error.message}`)
  }
  for (const h of [...parsed.hotels, ...(parsed.cruises || [])]) {
    const { error } = await supabase.from('lodging').insert({ ...h, trip_id: tripId })
    if (error) problems.push(`לינה ${h.hotel_name || ''}: ${error.message}`)
  }
  const newSegIds = []
  for (const sg of parsed.segments) {
    const { data, error } = await supabase.from('trip_segments').insert({ ...sg, trip_id: tripId }).select('id').single()
    if (error) problems.push(`קטע ${sg.city || ''}: ${error.message}`)
    else if (data) newSegIds.push(data.id)
  }
  if (companionIds.length && newSegIds.length) {
    const rows = newSegIds.flatMap(sid => companionIds.map(cid => ({ segment_id: sid, companion_id: cid })))
    const { error } = await supabase.from('segment_companions').insert(rows)
    if (error) problems.push(`מלווים: ${error.message}`)
  }
  return problems
}

function fmtRange(from, to) {
  return from === to ? from : `${from} → ${to}`
}


export default function TripItImport({ tripId, onClose, onSaved }) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [replaceAll, setReplaceAll] = useState(false)

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
      let companionIds = []
      let toWrite = parsed

      if (replaceAll) {
        companionIds = await wipeTripContent(tripId)
      } else {
        // Legacy behaviour: only seed segments when the trip has none yet,
        // so importing a second leg doesn't duplicate the itinerary.
        const { data: existing } = await supabase.from('trip_segments').select('id').eq('trip_id', tripId)
        if (existing?.length) toWrite = { ...parsed, segments: [] }
      }

      const problems = await writeParsedInto(tripId, toWrite, companionIds)
      if (problems.length) { setError('נשמר חלקית — ' + problems.join(' | ')); setSaving(false); return }

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

            {parsed.cruise && (
              <div style={{ marginBottom:'14px' }}>
                <div style={{ fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>
                  🚢 שייט
                </div>
                <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#475569', lineHeight:1.8 }}>
                  <span style={{ fontWeight:700, color:'#1d4ed8' }}>{parsed.cruise.ship || parsed.cruise.line}</span>
                  {parsed.cruise.line && parsed.cruise.ship && <span style={{ color:'#64748b' }}> · {parsed.cruise.line}</span>}
                  <br/>
                  <span style={{ color:'#64748b', fontSize:'12px' }}>
                    {parsed.cruise.from} → {parsed.cruise.to}
                    {parsed.cruise.cabin && ` · ${parsed.cruise.cabin}`}
                    {parsed.cruise.guests.length > 0 && ` · ${parsed.cruise.guests.length} נוסעים`}
                  </span>
                  <br/>
                  <span style={{ color:'#94a3b8', fontSize:'11px' }}>נשמר כלינה — הספינה היא המלון</span>
                </div>
              </div>
            )}

            {parsed.segments.length > 0 && (
              <div style={{ marginBottom:'14px' }}>
                <div style={{ fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>
                  📍 {parsed.segments.length} {parsed.cruise ? 'ימי עגינה' : 'קטעי מסלול'}
                </div>
                {parsed.segments.map((sg,i) => (
                  <div key={i} style={{ background:'#fefce8', border:'1px solid #fde68a', borderRadius:'8px', padding:'8px 14px', marginBottom:'5px', fontSize:'13px', color:'#475569' }}>
                    <span style={{ fontWeight:700, color:'#a16207' }}>{sg.city}</span>
                    {sg.country && <span>, {sg.country}</span>}
                    <span style={{ color:'#94a3b8' }}> · {sg.date_from} → {sg.date_to}</span>
                  </div>
                ))}
              </div>
            )}

            {parsed.segments.length === 0 && (parsed.flights.length > 0 || parsed.hotels.length > 0) && (
              <div style={{ color:'#b45309', padding:'12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'8px', fontSize:'12px', marginBottom:'14px' }}>
                ⚠ לא נוצר אף קטע מסלול — הטיול לא יופיע ברשימת הנסיעות עד שתוסיף קטע ידנית.
              </div>
            )}

            {parsed.flights.length === 0 && parsed.hotels.length === 0 && parsed.cruises.length === 0 && (
              <div style={{ color:'#dc2626', padding:'16px', background:'#fef2f2', borderRadius:'8px', fontSize:'13px' }}>
                לא נמצאו טיסות או מלונות. ודא שהטקסט מ-TripIt מכיל מידע על טיסות (קוד שדה כמו TLVBUD) ולינות.
              </div>
            )}
          </div>

          <label style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'12px 14px', marginBottom:'12px', borderRadius:'10px', cursor:'pointer',
            background: replaceAll ? '#fef2f2' : '#f8fafc',
            border: `1px solid ${replaceAll ? '#fecaca' : '#e2e8f0'}`,
            transition:'background 200ms cubic-bezier(0.23,1,0.32,1), border-color 200ms cubic-bezier(0.23,1,0.32,1)' }}>
            <input type="checkbox" checked={replaceAll} onChange={e => setReplaceAll(e.target.checked)} style={{ marginTop:'2px', width:'16px', height:'16px', accentColor:'#dc2626', cursor:'pointer' }} />
            <span style={{ fontSize:'13px', lineHeight:1.6, color: replaceAll ? '#991b1b' : '#475569' }}>
              <strong>החלף את כל התוכן הקיים בטיול</strong><br/>
              <span style={{ fontSize:'11px', color: replaceAll ? '#b91c1c' : '#94a3b8' }}>
                מוחק את כל הטיסות, המלונות וקטעי המסלול הקיימים לפני הייבוא. שם הטיול, ההערות והרשמים נשמרים, והמלווים מועברים לקטעים החדשים.
              </span>
            </span>
          </label>

          {error && <div style={{ color:'#dc2626', fontSize:'12px', marginBottom:'10px', padding:'8px', background:'#fef2f2', borderRadius:'6px' }}>{error}</div>}

          <div style={{ display:'flex', gap:'10px' }}>
            <button onClick={() => setParsed(null)} style={{ flex:1, background:'white', border:'1.5px solid #e2e8f0', color:'#475569', padding:'12px', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
              ← חזור
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (parsed.flights.length === 0 && parsed.hotels.length === 0 && parsed.cruises.length === 0)}
              style={{ flex:2, background: replaceAll ? '#dc2626' : '#1d4ed8', border:'none', color:'white', padding:'12px', borderRadius:'8px', fontSize:'15px', fontWeight:700, cursor:'pointer', opacity:saving?0.7:1, transition:'background 200ms cubic-bezier(0.23,1,0.32,1)' }}
            >
              {saving ? 'שומר...' : `${replaceAll ? '⟳ החלף הכל' : '✓ ייבא הכל'} (${parsed.flights.length} טיסות, ${parsed.hotels.length + parsed.cruises.length} לינות)`}
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
  const [scanning, setScanning] = useState(false)
  const [done, setDone] = useState(false)
  const [doneMode, setDoneMode] = useState('new')
  const [error, setError] = useState('')
  const [candidates, setCandidates] = useState([])
  const [target, setTarget] = useState('new')   // 'new' | <trip id>

  async function handleParse() {
    if (!text.trim()) return
    let result
    try { result = parseTripItText(text) }
    catch(e) { setError('שגיאה: ' + e.message); return }
    setError('')
    setParsed(result)
    setScanning(true)
    try {
      const found = await findSimilarTrips(parsedRange(result))
      setCandidates(found)
      // Force an explicit choice when something overlaps — never guess.
      setTarget(found.length ? '' : 'new')
    } catch(e) {
      setCandidates([]); setTarget('new')
    }
    setScanning(false)
  }

  async function handleSave() {
    if (!parsed) return
    if (!target) { setError('בחר האם להחליף טיול קיים או ליצור חדש'); return }
    setSaving(true)
    setError('')
    try {
      let tripId
      let companionIds = []

      if (target === 'new') {
        const { data: trip, error: te } = await supabase.from('trips')
          .insert({ name: parsed.tripName, name_he: parsed.tripName })
          .select().single()
        if (te || !trip) throw new Error(te?.message || 'שגיאה ביצירת טיול')
        tripId = trip.id
      } else {
        // Replace: wipe flights / lodging / segments, keep the trips row itself
        // so a hand-written name_he, notes and impressions survive.
        tripId = target
        companionIds = await wipeTripContent(tripId)
      }

      const problems = await writeParsedInto(tripId, parsed, companionIds)
      if (problems.length) { setError('נשמר חלקית — ' + problems.join(' | ')); setSaving(false); return }

      setDoneMode(target === 'new' ? 'new' : 'replace')
      setDone(true)
      setTimeout(() => { onCreated(); onClose() }, 1200)
    } catch(e) {
      setError('שגיאה: ' + e.message)
    }
    setSaving(false)
  }

  const inp2 = { width:'100%', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'8px', padding:'10px 12px', fontSize:'13px', fontFamily:'Open Sans,sans-serif', color:'#e2e8f0', outline:'none', boxSizing:'border-box', background:'rgba(255,255,255,0.04)' }

  if (done) return <div style={{ textAlign:'center', padding:'32px', color:'#34d399', fontSize:'18px', fontWeight:700 }}>
    {doneMode === 'replace' ? '✓ הטיול הוחלף בהצלחה!' : '✓ הטיול יובא בהצלחה!'}
  </div>

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
          <button onClick={handleParse} disabled={!text.trim() || scanning}
            style={{ width:'100%', marginTop:'12px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', color:'white', padding:'12px', borderRadius:'10px', fontSize:'15px', fontWeight:700, cursor:'pointer', opacity:(!text.trim()||scanning)?0.4:1 }}>
            {scanning ? 'בודק טיולים קיימים...' : 'נתח טקסט →'}
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
          {parsed.cruise && (
            <div style={{ marginBottom:'12px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>🚢 שייט</div>
              <div style={{ background:'rgba(56,189,248,0.06)', border:'1px solid rgba(56,189,248,0.15)', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#94a3b8', lineHeight:1.8 }}>
                <span style={{ color:'#38bdf8', fontWeight:700 }}>{parsed.cruise.ship || parsed.cruise.line}</span>
                {parsed.cruise.line && parsed.cruise.ship && <span> · {parsed.cruise.line}</span>}
                <br/>
                <span style={{ fontSize:'12px', color:'#64748b' }}>
                  {parsed.cruise.from} → {parsed.cruise.to}
                  {parsed.cruise.cabin && ` · ${parsed.cruise.cabin}`}
                  {parsed.cruise.guests.length > 0 && ` · ${parsed.cruise.guests.length} נוסעים`}
                </span>
                <br/>
                <span style={{ fontSize:'11px', color:'#475569' }}>נשמר כלינה — הספינה היא המלון</span>
              </div>
            </div>
          )}

          {parsed.segments.length > 0 && (
            <div style={{ marginBottom:'16px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>📍 {parsed.segments.length} {parsed.cruise ? 'ימי עגינה' : 'קטעי מסלול'}</div>
              {parsed.segments.map((sg,i) => (
                <div key={i} style={{ background:'rgba(251,191,36,0.05)', border:'1px solid rgba(251,191,36,0.12)', borderRadius:'8px', padding:'8px 14px', marginBottom:'5px', fontSize:'13px', color:'#94a3b8' }}>
                  <span style={{ color:'#fbbf24', fontWeight:700 }}>{sg.city}</span>
                  {sg.country && <span>, {sg.country}</span>}
                  {' · '}{sg.date_from} → {sg.date_to}
                </div>
              ))}
            </div>
          )}
          {parsed.segments.length === 0 && (
            <div style={{ color:'#fbbf24', fontSize:'12px', marginBottom:'12px', padding:'10px 12px', background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.15)', borderRadius:'8px', lineHeight:1.6 }}>
              ⚠ לא זוהה אף קטע מסלול — הטיול ייווצר אבל <strong>לא יופיע ברשימה</strong> עד שתוסיף קטע עם תאריך.
            </div>
          )}

          {parsed.unknownAirports?.length > 0 && (
            <div style={{ fontSize:'11.5px', color:'#94a3b8', marginBottom:'12px', padding:'9px 12px',
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', lineHeight:1.6 }}>
              קודי שדה תעופה שאינם מוכרים: <strong style={{color:'#cbd5e1'}}>{parsed.unknownAirports.join(', ')}</strong> — היעד נגזר משם הטיול.
            </div>
          )}
          {candidates.length > 0 && (
            <div style={{ marginBottom:'16px', padding:'14px', background:'rgba(251,146,60,0.06)', border:'1px solid rgba(251,146,60,0.2)', borderRadius:'12px' }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:'#fb923c', marginBottom:'4px' }}>
                נמצא{candidates.length > 1 ? 'ו' : ''} {candidates.length} טיול{candidates.length > 1 ? 'ים' : ''} בתאריכים דומים
              </div>
              <div style={{ fontSize:'12px', color:'#94a3b8', marginBottom:'12px', lineHeight:1.6 }}>
                האם זה עדכון של טיול קיים, או טיול חדש?
              </div>

              {candidates.map(c => {
                const sel = target === c.id
                return (
                  <button key={c.id} onClick={() => setTarget(c.id)}
                    style={{ display:'block', width:'100%', textAlign:'right', marginBottom:'8px', padding:'11px 14px', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit',
                      background: sel ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${sel ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.08)'}`,
                      transition:'background 200ms cubic-bezier(0.23,1,0.32,1), border-color 200ms cubic-bezier(0.23,1,0.32,1)' }}>
                    <div style={{ fontSize:'13px', fontWeight:700, color: sel ? '#fca5a5' : '#e2e8f0' }}>
                      {sel ? '◉' : '○'} החלף את «{c.label}»
                      {c.orphan && (
                        <span style={{ marginRight:'6px', fontSize:'10px', fontWeight:800, color:'#fbbf24',
                          background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.3)',
                          padding:'1px 7px', borderRadius:'999px' }}>לא מופיע ברשימה</span>
                      )}
                    </div>
                    <div style={{ fontSize:'11px', color:'#64748b', marginTop:'4px', lineHeight:1.6 }}>
                      {fmtRange(c.from, c.to)}
                      {c.overlap > 0 ? ` · חפיפה של ${c.overlap} ימים` : ` · ${c.gap} ימים הפרש`}
                      <br/>
                      יימחקו {c.flights} טיסות ו-{c.lodging} לינות ויוחלפו ב-{parsed.flights.length} טיסות ו-{parsed.hotels.length + parsed.cruises.length} לינות
                    </div>
                  </button>
                )
              })}

              <button onClick={() => setTarget('new')}
                style={{ display:'block', width:'100%', textAlign:'right', padding:'11px 14px', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit',
                  background: target === 'new' ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${target === 'new' ? 'rgba(59,130,246,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  transition:'background 200ms cubic-bezier(0.23,1,0.32,1), border-color 200ms cubic-bezier(0.23,1,0.32,1)' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color: target === 'new' ? '#93c5fd' : '#e2e8f0' }}>
                  {target === 'new' ? '◉' : '○'} צור טיול חדש
                </div>
                <div style={{ fontSize:'11px', color:'#64748b', marginTop:'4px' }}>
                  «{parsed.tripName}» — הטיולים הקיימים לא ייגעו
                </div>
              </button>

              {target && target !== 'new' && (
                <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'10px', lineHeight:1.7, paddingTop:'10px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  שם הטיול, ההערות והרשמים יישמרו. המלווים יועברו לקטעים החדשים.
                </div>
              )}
            </div>
          )}
          {error && <div style={{ color:'#f87171', fontSize:'12px', marginBottom:'10px' }}>{error}</div>}
          <div style={{ display:'flex', gap:'10px' }}>
            <button onClick={() => setParsed(null)} style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#94a3b8', padding:'11px', borderRadius:'8px', fontSize:'14px', cursor:'pointer' }}>← חזור</button>
            <button onClick={handleSave} disabled={saving || !target}
              style={{ flex:2, border:'none', color:'white', padding:'11px', borderRadius:'8px', fontSize:'14px', fontWeight:700, cursor: target ? 'pointer' : 'not-allowed', opacity:(saving||!target)?0.55:1,
                background: target && target !== 'new' ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'linear-gradient(135deg,#2563eb,#3b82f6)' }}>
              {saving ? 'שומר...'
                : !target ? 'בחר החלפה או טיול חדש'
                : target === 'new' ? `✓ צור טיול (${parsed.flights.length} טיסות, ${parsed.hotels.length + parsed.cruises.length} לינות)`
                : `⟳ החלף את הטיול הקיים`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
