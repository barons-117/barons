import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import FlightAnimation from './FlightAnimation'
import TripItImport from './TripItImport'
import BaronsHeader from './BaronsHeader'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/* ═══════════════════════════════════════════════════════════════════
   DICTIONARIES — Hebrew translations (kept intact from original)
   ═══════════════════════════════════════════════════════════════════ */
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

/* Light theme continent colors matching v3 tokens */
const CONT_COLORS = {
  'Europe':'#3b82f6','Asia':'#f59e0b','USA':'#10b981',
  'America':'#8b5cf6','Australia':'#f97316','Africa':'#ef4444','':'#6366f1'
}
const CONT_TINTS = {
  'Europe':'#eaf1ff','Asia':'#fff4dc','USA':'#e4faf0',
  'America':'#efe9ff','Australia':'#ffece0','Africa':'#fde4e4','':'#eef1ff'
}
const CONT_BORDERS = {
  'Europe':'rgba(59,130,246,0.22)','Asia':'rgba(245,158,11,0.22)','USA':'rgba(16,185,129,0.22)',
  'America':'rgba(139,92,246,0.22)','Australia':'rgba(249,115,22,0.22)','Africa':'rgba(239,68,68,0.22)','':'rgba(99,102,241,0.22)'
}

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

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */
function heCity(c){return CITY_HE[c]||c}
function heCountry(c){return COUNTRY_HE[c]||c}
function heCont(c){return CONT_HE[c]||c}
function contColor(c){return CONT_COLORS[c]||'#6366f1'}
function contTint(c){return CONT_TINTS[c]||'#eef1ff'}
function contBorder(c){return CONT_BORDERS[c]||'rgba(99,102,241,0.22)'}
function fmtLong(d){if(!d)return'';return new Date(d+'T12:00:00').toLocaleDateString('he-IL',{day:'numeric',month:'long',year:'numeric'})}
function fmtShort(d){if(!d)return'';return new Date(d+'T12:00:00').toLocaleDateString('he-IL',{day:'numeric',month:'short'})}
function fmtShortY(d){if(!d)return'';return new Date(d+'T12:00:00').toLocaleDateString('he-IL',{day:'numeric',month:'short',year:'numeric'})}
function fmtNum(d){if(!d)return'';const dt=new Date(d+'T12:00:00');return `${dt.getDate()}/${dt.getMonth()+1}`}
function fmtNumY(d){if(!d)return'';const dt=new Date(d+'T12:00:00');return `${dt.getDate()}/${dt.getMonth()+1}/${String(dt.getFullYear()).slice(2)}`}
function daysBetween(a,b){if(!a||!b)return null;return Math.round((new Date(b)-new Date(a))/(1000*60*60*24))}
function addDays(d,n){if(!d)return d;const dt=new Date(d+'T12:00:00');dt.setDate(dt.getDate()+n);return dt.toISOString().split('T')[0]}
function sortFlights(fs){return[...fs].sort((a,b)=>((a.departure_date||'')+(a.departure_time||'00:00')).localeCompare((b.departure_date||'')+(b.departure_time||'00:00')))}
function hotelsForSeg(seg,lodging){
  if(!seg.date_from)return[]
  const sf=seg.date_from,st=seg.date_to
  return lodging.filter(l=>{if(!l.check_in)return false;if(!st)return l.check_in>=sf;return l.check_in>=sf&&l.check_in<st})
}
function daysUntil(d){
  if(!d)return null
  const now=new Date(); now.setHours(0,0,0,0)
  const target=new Date(d+'T12:00:00'); target.setHours(0,0,0,0)
  return Math.round((target-now)/(1000*60*60*24))
}

/* ═══════════════════════════════════════════════════════════════════
   DESTINATION IMAGES — same set used in Travels.jsx GridReveal.
   Match by city first (more specific), then fall back to country.
   ═══════════════════════════════════════════════════════════════════ */
function segImage(city, country) {
  const c = (city || '').toLowerCase()
  const cn = (country || '').toLowerCase()
  const CITIES = [
    ['paris','/upcoming/assets/dest/paris.avif'],['london','/upcoming/assets/dest/london.avif'],
    ['berlin','/upcoming/assets/dest/berlin.webp'],['amsterdam','/upcoming/assets/dest/amsterdam.webp'],
    ['barcelona','/upcoming/assets/dest/barcelona.jpg'],['madrid','/upcoming/assets/dest/madrid.webp'],
    ['budapest','/upcoming/assets/dest/budapest.jpg'],['new york','/upcoming/assets/dest/newyork.jpg'],
    ['bangkok','/upcoming/assets/dest/bangkok.jpg'],['phuket','/upcoming/assets/dest/bangkok.jpg'],
    ['sydney','/upcoming/assets/dest/sydney.jpeg'],['las vegas','/upcoming/assets/dest/lasvegas.jpg'],
    ['los angeles','/upcoming/assets/dest/losangeles.jpg'],['warsaw','/upcoming/assets/dest/warsaw.jpg'],
    ['prague','/upcoming/assets/dest/prague.webp'],['bucharest','/upcoming/assets/dest/bucharest.jpg'],
    ['vienna','/upcoming/assets/dest/vienna.jpg'],['lisbon','/upcoming/assets/dest/lisbon.jpeg'],
    ['brussels','/upcoming/assets/dest/brussels.jpg'],
    ['utah','/upcoming/assets/dest/utah.jpg'],['salt lake','/upcoming/assets/dest/utah.jpg'],
  ]
  for (const [k, src] of CITIES) { if (c.includes(k)) return src }
  const COUNTRIES = [
    ['france','/upcoming/assets/dest/paris.avif'],['uk','/upcoming/assets/dest/london.avif'],
    ['england','/upcoming/assets/dest/london.avif'],['germany','/upcoming/assets/dest/berlin.webp'],
    ['netherlands','/upcoming/assets/dest/amsterdam.webp'],['spain','/upcoming/assets/dest/barcelona.jpg'],
    ['hungary','/upcoming/assets/dest/budapest.jpg'],['new york','/upcoming/assets/dest/newyork.jpg'],
    ['thailand','/upcoming/assets/dest/bangkok.jpg'],['australia','/upcoming/assets/dest/sydney.jpeg'],
    ['poland','/upcoming/assets/dest/warsaw.jpg'],['czech','/upcoming/assets/dest/prague.webp'],
    ['romania','/upcoming/assets/dest/bucharest.jpg'],['austria','/upcoming/assets/dest/vienna.jpg'],
    ['portugal','/upcoming/assets/dest/lisbon.jpeg'],['belgium','/upcoming/assets/dest/brussels.jpg'],
    ['utah','/upcoming/assets/dest/utah.jpg'],
  ]
  for (const [k, src] of COUNTRIES) { if (cn.includes(k)) return src }
  return null
}

/* ═══════════════════════════════════════════════════════════════════
   LIGHT THEME TOKENS (LT) — ported from v3 CSS :root
   ═══════════════════════════════════════════════════════════════════ */
const FF = "'Open Sans Hebrew', 'Open Sans', 'Assistant', system-ui, -apple-system, sans-serif"
// FF_MONO — for code blocks (kept JetBrains Mono only for kbd-like elements if any)
// FF_NUM — for all numbers throughout the page: Open Sans Hebrew with tabular figures
const FF_MONO = "'Open Sans Hebrew', 'Open Sans', 'Assistant', system-ui, -apple-system, sans-serif"
const FF_NUM = "'Open Sans Hebrew', 'Open Sans', 'Assistant', system-ui, sans-serif"

const LT = {
  ink: '#0f1a2e',
  ink2: '#2b3647',
  muted: '#64748b',
  muted2: '#94a3b8',
  line: 'rgba(37,99,235,0.08)',
  line2: 'rgba(37,99,235,0.14)',
  accent: '#2563eb',
  accentD: '#1e40af',
  bg: '#ffffff',
  pageBg: 'linear-gradient(180deg, #e8f1ff 0%, #f6f9ff 45%, #fff 100%)',
  surface: '#ffffff',
  surfaceSoft: 'rgba(255,255,255,0.8)',
  inputBg: '#ffffff',
  inputBorder: 'rgba(37,99,235,0.14)',
  inputFocusBorder: '#2563eb',
  inputFocusGlow: 'rgba(37,99,235,0.18)',
  danger: '#dc2626',
  dangerBg: 'rgba(220,38,38,0.06)',
  dangerBorder: 'rgba(220,38,38,0.2)',
}

const EASE = {
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
}

const inp = {
  width:'100%',border:`1.5px solid ${LT.inputBorder}`,borderRadius:'10px',
  padding:'10px 12px',fontSize:'14px',fontFamily:FF,color:LT.ink,
  outline:'none',boxSizing:'border-box',background:LT.inputBg,
  transition:`border-color 220ms ${EASE.out}, box-shadow 220ms ${EASE.out}, background 220ms ${EASE.out}`,
}
const LBL = {display:'block',fontSize:'11px',fontWeight:700,color:LT.muted,marginBottom:'5px',textTransform:'uppercase',letterSpacing:'1px'}

const focusInp = e => { e.target.style.borderColor = LT.inputFocusBorder; e.target.style.boxShadow = `0 0 0 4px ${LT.inputFocusGlow}`; e.target.style.background = '#fff' }
const blurInp  = e => { e.target.style.borderColor = LT.inputBorder; e.target.style.boxShadow = 'none'; e.target.style.background = LT.inputBg }

/* ═══════════════════════════════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════════════════════════════ */
const PlaneIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5 0 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.3.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
  </svg>
)
const BedIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v11"/><path d="M21 7v11"/><path d="M3 18h18"/><path d="M3 11h18"/><path d="M7 11V7h10v4"/>
  </svg>
)
const NoteIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const LockIcon = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
  </svg>
)
const ChevLeft = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
)
const EditIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
  </svg>
)
const MoreIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
  </svg>
)
const ExtIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
  </svg>
)
const ImportIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const ChevRight = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
)
const HomeIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const PlusIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
)

/* ═══════════════════════════════════════════════════════════════════
   KEYFRAMES + GLOBAL STYLES (light theme)
   ═══════════════════════════════════════════════════════════════════ */
const KEYFRAMES = `
@keyframes td-spin { to { transform: rotate(360deg) } }
@keyframes td-pulse-text { 0%,100%{opacity:.65} 50%{opacity:1} }
@keyframes td-modal-in { from{opacity:0;transform:scale(.96) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
@keyframes td-backdrop-in { from{opacity:0} to{opacity:1} }
@keyframes td-seg-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes td-fade-up { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes td-card-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes fabMenuIn { from{opacity:0;transform:translateY(-8px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes pinShake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }

.td-press { transition: transform 160ms ${EASE.out}; }
.td-press:active { transform: scale(0.97); }

.td-stop:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(37,99,235,0.1) !important; }
.td-stop:hover .td-chev { transform: translateX(-3px); opacity: 1 !important; color: ${LT.accent} !important; }

.td-iconbtn:hover { background:#fff !important; box-shadow:0 4px 12px rgba(37,99,235,0.12); }

.td-tab:hover { color: ${LT.ink} !important; }
.td-tab.on { background:#fff !important; color:${LT.accent} !important; box-shadow:0 2px 8px rgba(37,99,235,0.12) !important; }

.td-hero-cta:hover { background: ${LT.accentD} !important; }

.td-flt:hover, .td-hotel-mini:hover { background:#f5f8ff !important; border-color:${LT.line2} !important; }

.td-pin-k:hover { background:#f5f8ff !important; }
.td-pin-k:active { transform: scale(0.95); background: rgba(37,99,235,0.1); }

@keyframes td-panel-fade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }

/* ═══════════════════════════════════════════════════════════════════
   MOBILE LAYOUT — ≤ 768px
   Uses class hooks attached to grid elements; collapses everything to
   single-column flow without breaking the desktop inline styles.
   ═══════════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .td-page { padding: 12px 10px 100px !important; }
  .td-shell { padding: 10px 10px 16px !important; border-radius: 18px !important; }

  /* Header bar — let it wrap nicely, hide the action labels */
  .td-header { flex-wrap: wrap; gap: 8px !important; padding: 4px 0 12px !important; }
  .td-breadcrumbs { font-size: 12px !important; padding: 6px 12px !important; max-width: 100%; flex: 1 1 auto; }
  .td-breadcrumbs b { max-width: 140px; }
  .td-actions { gap: 4px !important; }
  .td-iconbtn { width: 32px !important; height: 32px !important; }

  /* Hero — stack title above the meta strip */
  .td-hero { grid-template-columns: 1fr !important; gap: 10px !important; padding: 14px 16px !important; border-radius: 18px !important; }
  .td-hero-route { font-size: 22px !important; gap: 6px !important; }
  .td-hero-route .td-arrow { font-size: 16px !important; }
  .td-hero-meta { font-size: 12px !important; gap: 6px !important; }
  .td-companions-pill { width: 100%; justify-content: flex-start; }

  /* Tabs — keep horizontal, smaller */
  .td-tabs { padding: 3px !important; margin: 14px 0 12px !important; max-width: 100% !important; }
  .td-tabs .td-tab { padding: 9px 4px !important; font-size: 11.5px !important; gap: 4px !important; }
  .td-tabs .td-tab .td-tab-count { padding: 1px 6px !important; font-size: 10px !important; }

  /* Overview — stack stops over the aside */
  .td-overview-grid { grid-template-columns: 1fr !important; gap: 14px !important; }

  /* Stop cards — vertical stack, hotels below body, meta inline */
  .td-stop {
    grid-template-columns: 48px 1fr !important;
    grid-template-areas: "code body" "hotels hotels" "meta meta" !important;
    gap: 10px !important;
    padding: 12px 14px !important;
  }
  .td-stop .td-stop-code { grid-area: code; width: 48px !important; height: 48px !important; }
  .td-stop .td-stop-body { grid-area: body; min-width: 0; }
  .td-stop .td-stop-hotels { grid-area: hotels; max-width: 100% !important; padding-top: 4px; border-top: 1px dashed rgba(37,99,235,0.1); }
  .td-stop .td-stop-meta { grid-area: meta; flex-direction: row !important; align-items: center !important; justify-content: space-between !important; }
  .td-stop .td-stop-meta .td-stop-days { font-size: 18px !important; }
  .td-stop .td-stop-meta .td-stop-days-label { font-size: 10px !important; }
  .td-stop .td-chev { display: none !important; }

  /* Aside cards (flights/lodging) — keep but tighter */
  .td-aside { gap: 10px !important; }

  /* Flight tab — stack airline / journey / extras */
  .td-flight-row {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
    padding: 14px 16px !important;
  }
  .td-flight-airline { flex-direction: row !important; justify-content: center; min-width: 0 !important; gap: 8px !important; }
  .td-flight-journey { grid-template-columns: 1fr !important; gap: 8px !important; }
  .td-flight-globe { width: 100% !important; max-width: 220px; margin: 0 auto !important; }
  .td-flight-globe .flight-anim { width: 220px !important; max-width: 100%; }
  .td-flight-extras { align-items: center !important; flex-direction: row !important; flex-wrap: wrap; justify-content: center; gap: 8px !important; }

  /* Lodging tab cards */
  .td-lodging-row {
    grid-template-columns: 56px 1fr !important;
    gap: 12px !important;
    padding: 14px 14px !important;
  }
  .td-lodging-icon { width: 56px !important; height: 56px !important; }
  .td-lodging-meta { grid-column: 1 / -1; text-align: right !important; direction: rtl !important; padding-top: 6px; border-top: 1px dashed rgba(37,99,235,0.1); }

  /* Modals — full-width, less padding */
  .td-modal-box { width: 100% !important; max-width: calc(100vw - 24px) !important; padding: 22px 18px !important; border-radius: 18px !important; max-height: 92vh !important; }
  .td-modal-grid-2 { grid-template-columns: 1fr !important; }

  /* Rashamim panel */
  .td-rashamim-card { max-width: 100% !important; padding: 32px 18px !important; }
  .td-rashamim-content { padding: 18px 16px !important; }
}

@media (max-width: 480px) {
  .td-hero-route { font-size: 19px !important; }
  .td-breadcrumbs { font-size: 11.5px !important; padding: 5px 10px !important; }
  .td-breadcrumbs b { max-width: 100px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 120ms !important;
  }
}
`

/* ═══════════════════════════════════════════════════════════════════
   MODAL (light)
   ═══════════════════════════════════════════════════════════════════ */
function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position:'fixed',inset:0,background:'rgba(15,26,46,0.35)',
        display:'flex',alignItems:'center',justifyContent:'center',
        backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',
        zIndex:200,
        animation:`td-backdrop-in 240ms ${EASE.out} both`,
      }}
      onClick={onClose}
    >
      <div
        className="td-modal-box"
        style={{
          background:'#fff',
          borderRadius:'20px',padding:'32px',width:'520px',maxWidth:'95vw',maxHeight:'88vh',overflowY:'auto',
          boxShadow:'0 32px 80px rgba(15,26,46,0.18), 0 0 0 1px rgba(37,99,235,0.08)',
          direction:'rtl',
          animation:`td-modal-in 280ms ${EASE.drawer} both`,
        }}
        onClick={e=>e.stopPropagation()}
      >
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px' }}>
          <h3 style={{ fontSize:'18px',fontWeight:800,color:LT.ink,margin:0,letterSpacing:'-0.3px' }}>{title}</h3>
          <button
            className="td-press"
            style={{ background:'#f5f8ff',border:`1px solid ${LT.line2}`,width:'32px',height:'32px',borderRadius:'50%',fontSize:'16px',color:LT.muted,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}
            onClick={onClose}
          >&#10005;</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:'14px' }}>
      <label style={LBL}>{label}</label>
      {children}
    </div>
  )
}

function SaveBtn({ loading, onClick }) {
  return (
    <button
      className="td-press"
      onClick={onClick}
      disabled={loading}
      style={{
        background: LT.accent, border:'none', color:'white', padding:'12px',
        borderRadius:'12px', fontSize:'15px', fontWeight:700, cursor:'pointer',
        fontFamily:FF, marginTop:'8px', width:'100%',
        boxShadow:'0 4px 14px rgba(37,99,235,0.28)',
        transition:`transform 220ms ${EASE.out}, box-shadow 220ms ${EASE.out}, background 220ms ${EASE.out}`,
      }}
      onMouseEnter={e=>{ if(!e.currentTarget.disabled){ e.currentTarget.style.background=LT.accentD; e.currentTarget.style.boxShadow='0 8px 22px rgba(37,99,235,0.4)' }}}
      onMouseLeave={e=>{ e.currentTarget.style.background=LT.accent; e.currentTarget.style.boxShadow='0 4px 14px rgba(37,99,235,0.28)' }}
    >
      {loading ? 'שומר...' : 'שמור'}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   DATA-EDIT MODALS (logic unchanged — only visual tokens changed)
   ═══════════════════════════════════════════════════════════════════ */
function AddSegModal({ tripId, onClose, onSaved }) {
  const [form, setForm] = useState({ city:'', country:'', continent:'', date_from:'', date_to:'' })
  const [loading, setLoading] = useState(false)
  function set(k,v){ setForm(f=>{ const nf={...f,[k]:v}; if(k==='country'&&!f.continent) nf.continent=COUNTRY_TO_CONT[v]||''; return nf }) }
  async function save(){ setLoading(true); await supabase.from('trip_segments').insert({...form,trip_id:tripId,date_from:form.date_from||null,date_to:form.date_to||null}); setLoading(false); onSaved(); onClose() }
  return (
    <Modal title="הוסף יעד" onClose={onClose}>
      <div className="td-modal-grid-2" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="עיר"><input style={inp} value={form.city} onChange={e=>set('city',e.target.value)} autoFocus onFocus={focusInp} onBlur={blurInp}/></Field>
        <Field label="מדינה"><input style={inp} value={form.country} onChange={e=>set('country',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      </div>
      <Field label="יבשת">
        <select style={inp} value={form.continent} onChange={e=>set('continent',e.target.value)} onFocus={focusInp} onBlur={blurInp}>
          <option value="">בחר יבשת</option>
          {['Europe','Asia','USA','America','Australia','Africa'].map(c=><option key={c} value={c}>{CONT_HE[c]}</option>)}
        </select>
      </Field>
      <div className="td-modal-grid-2" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="תאריך כניסה"><input style={inp} type="date" value={form.date_from} onChange={e=>set('date_from',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
        <Field label="תאריך יציאה"><input style={inp} type="date" value={form.date_to} onChange={e=>set('date_to',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      </div>
      <SaveBtn loading={loading} onClick={save}/>
    </Modal>
  )
}

function LodgingModal({ tripId, onClose, onSaved, existing }) {
  const [form, setForm] = useState(existing || { hotel_name:'',address:'',room_type:'',check_in:'',check_out:'',num_guests:'1',confirmation:'',booking_site:'',notes:'' })
  const [loading, setLoading] = useState(false)
  function set(k,v){ setForm(f=>({...f,[k]:v})) }
  async function save(){ setLoading(true); if(existing) await supabase.from('lodging').update(form).eq('id',existing.id); else await supabase.from('lodging').insert({...form,trip_id:tripId}); setLoading(false); onSaved(); onClose() }
  return (
    <Modal title={existing ? 'עריכת לינה' : 'הוסף לינה'} onClose={onClose}>
      <Field label="שם המלון"><input style={inp} value={form.hotel_name} onChange={e=>set('hotel_name',e.target.value)} autoFocus onFocus={focusInp} onBlur={blurInp}/></Field>
      <Field label="כתובת"><input style={inp} value={form.address} onChange={e=>set('address',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      <div className="td-modal-grid-2" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="צ׳ק-אין"><input style={inp} type="date" value={form.check_in} onChange={e=>set('check_in',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
        <Field label="צ׳ק-אאוט"><input style={inp} type="date" value={form.check_out} onChange={e=>set('check_out',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      </div>
      <Field label="סוג חדר"><input style={inp} value={form.room_type} onChange={e=>set('room_type',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      <Field label="אישור"><input style={inp} value={form.confirmation} onChange={e=>set('confirmation',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      <Field label="אתר הזמנה"><input style={inp} value={form.booking_site} onChange={e=>set('booking_site',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      <Field label="הערות על המלון">
        <textarea style={{...inp,minHeight:'90px',resize:'vertical',lineHeight:'1.6'}} value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="חוויה, דירוג, טיפים לפעם הבאה..." onFocus={focusInp} onBlur={blurInp}/>
      </Field>
      <SaveBtn loading={loading} onClick={save}/>
    </Modal>
  )
}

function FlightModal({ tripId, onClose, onSaved, existing }) {
  const empty = { airline_code:'',flight_number:'',aircraft:'',service_class:'',from_city:'',from_airport:'',from_country:'',to_city:'',to_airport:'',to_country:'',departure_date:'',departure_time:'',arrival_date:'',arrival_time:'',stops:'nonstop',distance:'',confirmation:'' }
  const [form, setForm] = useState(existing || empty)
  const [loading, setLoading] = useState(false)
  const [fetchMsg, setFetchMsg] = useState('')

  function set(k,v){ setForm(f=>{ const nf={...f,[k]:v}; if(k==='departure_date'&&!f.arrival_date) nf.arrival_date=v; return nf }) }
  function onFromAirport(code){ const up=code.toUpperCase(); const info=AIRPORT_INFO[up]; setForm(f=>({...f,from_airport:up,...(info?{from_city:info.city,from_country:info.country}:{})})) }
  function onToAirport(code){ const up=code.toUpperCase(); const info=AIRPORT_INFO[up]; setForm(f=>({...f,to_airport:up,...(info?{to_city:info.city,to_country:info.country}:{})})) }

  function fetchFlightInfo(){
    const updates={}; const filled=[]
    if(form.from_airport){ const info=AIRPORT_INFO[form.from_airport.toUpperCase()]; if(info){ updates.from_city=info.city; updates.from_country=info.country; filled.push(`${form.from_airport}\u2192${info.city}`) } }
    if(form.to_airport){ const info=AIRPORT_INFO[form.to_airport.toUpperCase()]; if(info){ updates.to_city=info.city; updates.to_country=info.country; filled.push(`${form.to_airport}\u2192${info.city}`) } }
    if(form.departure_date&&!form.arrival_date){ updates.arrival_date=form.departure_date; filled.push('תאריך נחיתה') }
    if(Object.keys(updates).length>0){ setForm(f=>({...f,...updates})); setFetchMsg('\u2713 '+filled.join(' \u00b7 ')) }
    else setFetchMsg((!form.from_airport&&!form.to_airport)?'הכנס קוד שדה תעופה ולחץ שוב':'קוד שדה לא מוכר')
    setTimeout(()=>setFetchMsg(''),4000)
  }

  async function save(){ setLoading(true); if(existing) await supabase.from('flights').update(form).eq('id',existing.id); else await supabase.from('flights').insert({...form,trip_id:tripId}); setLoading(false); onSaved(); onClose() }

  return (
    <Modal title={existing ? 'עריכת טיסה' : 'הוסף טיסה'} onClose={onClose}>
      <div style={{ background:'#fff7e8',border:'1px solid rgba(245,158,11,0.25)',borderRadius:'10px',padding:'10px 14px',marginBottom:'16px',fontSize:'12px',color:'#92400e' }}>
        קוד IATA: <strong>LY</strong>=אל על &middot; <strong>LH</strong>=לופטהנזה &middot; <strong>KL</strong>=KLM &middot; <strong>SN</strong>=בריסל &middot; <strong>LO</strong>=LOT &middot; <strong>AA</strong>=אמריקן
      </div>
      <div className="td-modal-grid-2" style={{ display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:'10px',alignItems:'end',marginBottom:'10px' }}>
        <Field label="קוד חברה">
          <input style={inp} value={form.airline_code} onChange={e=>set('airline_code',e.target.value.toUpperCase())} placeholder="LY" onFocus={focusInp} onBlur={blurInp}/>
        </Field>
        <Field label="מספר טיסה">
          <input style={inp} value={form.flight_number} onChange={e=>set('flight_number',e.target.value)} placeholder="316" onFocus={focusInp} onBlur={blurInp}/>
        </Field>
        <Field label=" ">
          <button className="td-press" onClick={fetchFlightInfo} style={{ background:'#f5f8ff',border:`1px solid ${LT.line2}`,color:LT.ink2,padding:'10px 14px',borderRadius:'10px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:FF,whiteSpace:'nowrap' }}>
            מלא אוטו
          </button>
        </Field>
      </div>
      {fetchMsg && <div style={{ fontSize:'12px',color:'#059669',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'8px',padding:'8px 12px',marginBottom:'14px' }}>{fetchMsg}</div>}
      <div className="td-modal-grid-2" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="מ — שדה תעופה"><input style={inp} value={form.from_airport} onChange={e=>onFromAirport(e.target.value)} placeholder="TLV" onFocus={focusInp} onBlur={blurInp}/></Field>
        <Field label="אל — שדה תעופה"><input style={inp} value={form.to_airport} onChange={e=>onToAirport(e.target.value)} placeholder="BKK" onFocus={focusInp} onBlur={blurInp}/></Field>
      </div>
      <div className="td-modal-grid-2" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="תאריך יציאה"><input style={inp} type="date" value={form.departure_date} onChange={e=>set('departure_date',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
        <Field label="שעת יציאה"><input style={inp} type="time" value={form.departure_time} onChange={e=>set('departure_time',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      </div>
      <div className="td-modal-grid-2" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="תאריך נחיתה"><input style={inp} type="date" value={form.arrival_date} onChange={e=>set('arrival_date',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
        <Field label="שעת נחיתה"><input style={inp} type="time" value={form.arrival_time} onChange={e=>set('arrival_time',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      </div>
      <div className="td-modal-grid-2" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="עצירות">
          <select style={inp} value={form.stops} onChange={e=>set('stops',e.target.value)} onFocus={focusInp} onBlur={blurInp}>
            <option value="nonstop">ישיר</option>
            <option value="1 stop">עצירה אחת</option>
            <option value="2 stops">שתי עצירות</option>
          </select>
        </Field>
        <Field label="מחלקה"><input style={inp} value={form.service_class} onChange={e=>set('service_class',e.target.value)} placeholder="Economy" onFocus={focusInp} onBlur={blurInp}/></Field>
      </div>
      <Field label="מטוס"><input style={inp} value={form.aircraft} onChange={e=>set('aircraft',e.target.value)} placeholder="Boeing 787" onFocus={focusInp} onBlur={blurInp}/></Field>
      <Field label="אישור"><input style={inp} value={form.confirmation} onChange={e=>set('confirmation',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      <SaveBtn loading={loading} onClick={save}/>
    </Modal>
  )
}

function SegmentModal({ seg, allCompanions, onClose, onSaved }) {
  const [form, setForm] = useState({ date_from:seg.date_from||'',date_to:seg.date_to||'',city:seg.city||'',country:seg.country||'',continent:seg.continent||'' })
  const currentComps = seg.segment_companions?.map(sc=>sc.companions?.name).filter(Boolean) || []
  const [selComps, setSelComps] = useState(currentComps)
  const [localComps, setLocalComps] = useState(allCompanions)
  const [newComp, setNewComp] = useState('')
  const [loading, setLoading] = useState(false)
  function set(k,v){ setForm(f=>{ const nf={...f,[k]:v}; if(k==='country'&&!f.continent) nf.continent=COUNTRY_TO_CONT[v]||''; return nf }) }
  function toggleComp(n){ setSelComps(p=>p.includes(n)?p.filter(x=>x!==n):[...p,n]) }
  async function addNew(){ const name=newComp.trim(); if(!name)return; const{data}=await supabase.from('companions').insert({name}).select().single(); if(data){ setLocalComps(p=>[...p,name].sort()); setSelComps(p=>[...p,name]); setNewComp('') } }
  async function save(){
    setLoading(true)
    await supabase.from('trip_segments').update({...form,date_from:form.date_from||null,date_to:form.date_to||null}).eq('id',seg.id)
    await supabase.from('segment_companions').delete().eq('segment_id',seg.id)
    if(selComps.length>0){ const{data:rows}=await supabase.from('companions').select('id,name').in('name',selComps); if(rows?.length>0) await supabase.from('segment_companions').insert(rows.map(c=>({segment_id:seg.id,companion_id:c.id}))) }
    setLoading(false); onSaved(); onClose()
  }
  async function deleteSeg(){
    if(!confirm('למחוק יעד זה?'))return
    setLoading(true)
    await supabase.from('segment_companions').delete().eq('segment_id',seg.id)
    await supabase.from('trip_segments').delete().eq('id',seg.id)
    setLoading(false); onSaved(); onClose()
  }
  return (
    <Modal title="עריכת יעד" onClose={onClose}>
      <div className="td-modal-grid-2" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="עיר"><input style={inp} value={form.city} onChange={e=>set('city',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
        <Field label="מדינה"><input style={inp} value={form.country} onChange={e=>set('country',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      </div>
      <Field label="יבשת">
        <select style={inp} value={form.continent} onChange={e=>set('continent',e.target.value)} onFocus={focusInp} onBlur={blurInp}>
          <option value="">בחר יבשת</option>
          {['Europe','Asia','USA','America','Australia','Africa'].map(c=><option key={c} value={c}>{CONT_HE[c]}</option>)}
        </select>
      </Field>
      <div className="td-modal-grid-2" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="תאריך כניסה"><input style={inp} type="date" value={form.date_from} onChange={e=>set('date_from',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
        <Field label="תאריך יציאה"><input style={inp} type="date" value={form.date_to} onChange={e=>set('date_to',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      </div>
      <Field label="נסעתי עם">
        <div style={{ display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'12px' }}>
          {localComps.map(c => {
            const on = selComps.includes(c)
            return (
              <button key={c} className="td-press" onClick={()=>toggleComp(c)} style={{
                padding:'6px 14px', borderRadius:'20px', border:'1.5px solid',
                fontSize:'12px', cursor:'pointer', fontFamily:FF,
                background: on ? LT.accent : '#fff',
                color: on ? 'white' : LT.muted,
                borderColor: on ? 'transparent' : LT.line2,
                boxShadow: on ? '0 3px 10px rgba(37,99,235,0.25)' : 'none',
              }}>{c}</button>
            )
          })}
        </div>
        <div style={{ display:'flex',gap:'8px' }}>
          <input style={{...inp,flex:1}} value={newComp} onChange={e=>setNewComp(e.target.value)} placeholder="הוסף נוסע חדש..." onKeyDown={e=>e.key==='Enter'&&addNew()} onFocus={focusInp} onBlur={blurInp}/>
          <button className="td-press" onClick={addNew} style={{ background:LT.accent,border:'none',color:'white',padding:'10px 16px',borderRadius:'10px',fontSize:'14px',fontWeight:700,cursor:'pointer',boxShadow:'0 3px 10px rgba(37,99,235,0.25)' }}>+</button>
        </div>
      </Field>
      <SaveBtn loading={loading} onClick={save}/>
      <button className="td-press" onClick={deleteSeg} style={{ width:'100%',marginTop:'10px',background:LT.dangerBg,border:`1px solid ${LT.dangerBorder}`,color:LT.danger,padding:'11px',borderRadius:'10px',fontSize:'13px',cursor:'pointer',fontFamily:FF }}>
        מחק יעד זה
      </button>
    </Modal>
  )
}

function NoteModal({ seg, onClose, onSaved }) {
  const [note, setNote] = useState(seg.notes || '')
  const [loading, setLoading] = useState(false)
  async function save(){ setLoading(true); await supabase.from('trip_segments').update({notes:note}).eq('id',seg.id); setLoading(false); onSaved(); onClose() }
  return (
    <Modal title={`הערה — ${heCity(seg.city)}`} onClose={onClose}>
      <textarea style={{...inp,minHeight:'140px',resize:'vertical'}} value={note} onChange={e=>setNote(e.target.value)} placeholder="מה זכור לך מהיעד הזה?" onFocus={focusInp} onBlur={blurInp}/>
      <SaveBtn loading={loading} onClick={save}/>
    </Modal>
  )
}

function TripNameModal({ trip, onClose, onSaved }) {
  const [nameHe, setNameHe] = useState(trip.name_he || '')
  const [name, setName] = useState(trip.name || '')
  const [tripit, setTripit] = useState(trip.tripit_url || '')
  const [loading, setLoading] = useState(false)
  async function save(){
    setLoading(true)
    await supabase.from('trips').update({
      name_he: nameHe.trim() || null,
      name: name.trim() || trip.name,
      tripit_url: tripit.trim() || null,
    }).eq('id', trip.id)
    setLoading(false); onSaved(); onClose()
  }
  return (
    <Modal title="עריכת פרטי טיול" onClose={onClose}>
      <div className="td-modal-grid-2" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="שם בעברית">
          <input style={inp} value={nameHe} onChange={e=>setNameHe(e.target.value)} placeholder="טיול לפריז" autoFocus onFocus={focusInp} onBlur={blurInp}/>
        </Field>
        <Field label="שם באנגלית">
          <input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="Paris Trip" onFocus={focusInp} onBlur={blurInp}/>
        </Field>
      </div>
      <Field label="קישור TripIt"><input style={inp} value={tripit} onChange={e=>setTripit(e.target.value)} placeholder="https://www.tripit.com/trip/show/..." onFocus={focusInp} onBlur={blurInp}/></Field>
      <SaveBtn loading={loading} onClick={save}/>
    </Modal>
  )
}

function ImpressionsModal({ trip, onClose, onSaved }) {
  const [text, setText] = useState(trip.impressions || '')
  const [loading, setLoading] = useState(false)
  async function save(){
    setLoading(true)
    await supabase.from('trips').update({ impressions: text }).eq('id', trip.id)
    setLoading(false); onSaved(); onClose()
  }
  return (
    <Modal title="רשמים" onClose={onClose}>
      <Field label="רשמים מהנסיעה">
        <textarea style={{...inp,minHeight:'260px',resize:'vertical',lineHeight:'1.7'}} value={text} onChange={e=>setText(e.target.value)} placeholder="כתוב את הרשמים שלך..." autoFocus onFocus={focusInp} onBlur={blurInp}/>
      </Field>
      <SaveBtn loading={loading} onClick={save}/>
    </Modal>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   TRIP HEADER — breadcrumbs + desktop actions
   ═══════════════════════════════════════════════════════════════════ */
function TripHeader({ displayName, editMode, setEditMode, setModal, navigate, prevTrip, nextTrip }) {
  return (
    <div className="td-header" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
      padding: '4px 2px 16px',
    }}>
      <div className="td-breadcrumbs" style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        fontSize: '12.5px', color: LT.muted,
        background: 'rgba(255,255,255,0.7)', padding: '7px 14px', borderRadius: '999px',
        border: `1px solid ${LT.line2}`, backdropFilter: 'blur(8px)',
        minWidth: 0, overflow: 'hidden',
      }}>
        <button
          onClick={() => navigate('/')}
          title="עמוד הבית"
          style={{
            background:'none', border:'none', cursor:'pointer', padding: 0,
            display:'inline-flex', alignItems:'center', gap:'5px',
            color: LT.accent, fontFamily: FF, fontSize:'12.5px', fontWeight: 800,
            letterSpacing:'0.04em',
          }}
        >
          <HomeIcon size={13} />
          <span>BARONS</span>
        </button>
        <span style={{ color: LT.muted2 }}>/</span>
        <button
          onClick={() => navigate('/travels')}
          style={{ background:'none', border:'none', color: LT.muted, cursor:'pointer', padding: 0, fontFamily: FF, fontSize: '12.5px', fontWeight: 600 }}
        >
          נסיעות
        </button>
        <span style={{ color: LT.muted2 }}>/</span>
        {editMode ? (
          <button
            onClick={() => setModal('tripName')}
            title="ערוך שם ופרטי טיול"
            style={{
              background: 'rgba(37,99,235,0.08)', border: `1px solid ${LT.line2}`,
              color: LT.accent, cursor: 'pointer', padding: '2px 10px', borderRadius: '999px',
              fontFamily: FF, fontSize: '12.5px', fontWeight: 700,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              display: 'inline-flex', alignItems: 'center', gap: '5px',
            }}
          >
            <EditIcon size={11} color={LT.accent}/>
            {displayName}
          </button>
        ) : (
          <b style={{ color: LT.ink, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</b>
        )}
      </div>

      <div className="td-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
        {prevTrip && (
          <button
            className="td-iconbtn td-press"
            title={`הקודם · ${prevTrip.name_he || prevTrip.name}`}
            onClick={() => navigate(`/travels/${prevTrip.id}`)}
            style={iconBtn}
          >
            {/* RTL: previous = arrow pointing right (›) */}
            <ChevRight size={14} />
          </button>
        )}
        {nextTrip && (
          <button
            className="td-iconbtn td-press"
            title={`הבא · ${nextTrip.name_he || nextTrip.name}`}
            onClick={() => navigate(`/travels/${nextTrip.id}`)}
            style={iconBtn}
          >
            {/* RTL: next = arrow pointing left (‹) */}
            <ChevLeft size={14} />
          </button>
        )}
        <button className="td-iconbtn td-press" title="ייבא מ-TripIt" onClick={() => setModal('tripit')} style={iconBtn}>
          <ImportIcon size={14} />
        </button>
        <button className="td-iconbtn td-press" title={editMode ? 'סיים עריכה' : 'עריכה'} onClick={() => setEditMode(e => !e)}
          style={{ ...iconBtn, ...(editMode ? { background: LT.accent, color: '#fff', borderColor: 'transparent' } : {}) }}>
          <EditIcon size={14} />
        </button>
      </div>
    </div>
  )
}

const iconBtn = {
  width: '34px', height: '34px', borderRadius: '50%',
  border: `1px solid ${LT.line2}`,
  background: 'rgba(255,255,255,0.7)', cursor: 'pointer', backdropFilter: 'blur(8px)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: LT.ink2,
  transition: 'all .15s ease',
}

/* ═══════════════════════════════════════════════════════════════════
   IMPRESSIONS VIEWER — PIN 1212 (light theme)
   ═══════════════════════════════════════════════════════════════════ */
const SECRET_PIN = '1212'

function ImpressionsViewer({ trip, onClose, onEdit }) {
  const hasContent = !!(trip.impressions && trip.impressions.trim())
  const [stage, setStage] = useState(hasContent ? 'pin' : 'empty')
  const [pin, setPin] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [shake, setShake] = useState(false)
  const pinInputRef = useRef(null)

  function tryPin(val) {
    if (val === SECRET_PIN) {
      setStage('open'); setPin('')
    } else {
      const next = attempts + 1
      setAttempts(next); setShake(true); setPin('')
      // haptic feedback on supported devices (mobile)
      try { if (navigator.vibrate) navigator.vibrate([60, 40, 60]) } catch (_) {}
      setTimeout(() => { setShake(false); pinInputRef.current?.focus() }, 500)
      if (next >= 3) {
        setStage('blocked')
        try { if (navigator.vibrate) navigator.vibrate([180]) } catch (_) {}
        setTimeout(() => onClose(), 2600)
      }
    }
  }

  return createPortal(
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:300,background:'rgba(15,26,46,0.35)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:'520px',maxHeight:'90vh',background:'#fff',borderRadius:'20px',overflow:'hidden',boxShadow:'0 32px 80px rgba(15,26,46,0.18)',display:'flex',flexDirection:'column',direction:'rtl'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 22px',borderBottom:`1px solid ${LT.line}`,flexShrink:0}}>
          <span style={{fontSize:'14px',fontWeight:700,color:LT.ink,letterSpacing:'0.02em'}}>רשמים</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:LT.muted,fontSize:'18px',cursor:'pointer',lineHeight:1}}>✕</button>
        </div>

        {stage === 'empty' && (
          <div style={{padding:'44px 24px',textAlign:'center'}}>
            <div style={{width:'64px',height:'64px',borderRadius:'50%',background:'linear-gradient(135deg,#eff6ff,#dbeafe)',margin:'0 auto 16px',display:'flex',alignItems:'center',justifyContent:'center',color:LT.accent,border:`1px solid ${LT.line2}`}}>
              <LockIcon size={28} color={LT.accent}/>
            </div>
            <div style={{color:LT.ink,fontSize:'16px',fontWeight:700,marginBottom:'6px'}}>אין רשמים עדיין</div>
            <div style={{color:LT.muted,fontSize:'13px',marginBottom:'20px'}}>כתוב את הרשמים שלך מהנסיעה</div>
            <button onClick={onEdit} style={{background:LT.accent,border:'none',color:'white',padding:'10px 22px',borderRadius:'10px',fontSize:'13.5px',fontWeight:700,cursor:'pointer',fontFamily:FF}}>+ כתוב רשמים</button>
          </div>
        )}

        {stage === 'pin' && (
          <div style={{padding:'40px 24px 36px'}}>
            <div style={{textAlign:'center',marginBottom:'26px'}}>
              <div style={{width:'64px',height:'64px',borderRadius:'50%',background:'linear-gradient(135deg,#eff6ff,#dbeafe)',margin:'0 auto 14px',display:'flex',alignItems:'center',justifyContent:'center',color:LT.accent,border:`1px solid ${LT.line2}`}}>
                <LockIcon size={28} color={LT.accent}/>
              </div>
              <div style={{color:LT.ink,fontSize:'16px',fontWeight:800}}>רשמים מוגנים</div>
              {attempts > 0 && attempts < 3 && (
                <div style={{color:LT.danger,fontSize:'12px',marginTop:'10px',fontWeight:600}}>קוד שגוי · נותרו {3 - attempts} נסיונות</div>
              )}
            </div>

            {/* Hidden input that captures keyboard / mobile keypad. Safe sr-only positioning. */}
            <input
              ref={pinInputRef}
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              maxLength={4}
              value={pin}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                setPin(v)
                if (v.length === 4) setTimeout(() => tryPin(v), 100)
              }}
              style={{
                position:'absolute',
                width:'1px', height:'1px',
                padding:0, margin:'-1px',
                overflow:'hidden',
                clip:'rect(0,0,0,0)',
                whiteSpace:'nowrap',
                border:0,
                opacity:0,
              }}
            />

            <div
              onClick={() => pinInputRef.current?.focus()}
              style={{
                display:'flex', justifyContent:'center', gap:'14px',
                animation: shake ? `pinShake 0.4s cubic-bezier(0.36,0.07,0.19,0.97)` : 'none',
                cursor:'text',
              }}
            >
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  width:'18px', height:'18px', borderRadius:'50%',
                  background: i < pin.length ? LT.accent : 'transparent',
                  border: `2px solid ${i < pin.length ? LT.accent : 'rgba(37,99,235,0.28)'}`,
                  boxShadow: i < pin.length ? '0 0 0 5px rgba(37,99,235,0.14)' : 'none',
                  transition:'all .18s ease',
                }}/>
              ))}
            </div>
          </div>
        )}

        {stage === 'open' && (
          <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden',padding:'18px 20px 20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px',fontSize:'11px',letterSpacing:'0.14em',textTransform:'uppercase',color:LT.muted,fontWeight:700}}>
              <span>רשמים · {trip.name_he || trip.name}</span>
              <button onClick={onEdit} style={{background:'rgba(255,255,255,0.8)',border:'1px solid #e8d894',padding:'5px 12px',borderRadius:'8px',fontSize:'11px',color:'#92400e',fontWeight:700,cursor:'pointer',letterSpacing:0,fontFamily:FF}}>ערוך</button>
            </div>
            <div style={{
              flex:1,overflowY:'auto',
              background:'#fffbf0',
              border:'1px solid #f3e5b8',
              borderRadius:'14px',
              padding:'22px 24px',
            }}>
              <p style={{fontSize:'14.5px',lineHeight:'28px',color:'#1c1917',margin:0,whiteSpace:'pre-wrap',direction:'rtl',fontFamily:FF}}>
                {trip.impressions}
              </p>
            </div>
          </div>
        )}

        {stage === 'blocked' && (
          <div style={{padding:'48px 24px',textAlign:'center'}}>
            <div style={{width:'64px',height:'64px',borderRadius:'50%',background:'rgba(220,38,38,0.08)',margin:'0 auto 14px',display:'flex',alignItems:'center',justifyContent:'center',color:LT.danger,border:'1px solid rgba(220,38,38,0.2)'}}>
              <LockIcon size={28} color={LT.danger}/>
            </div>
            <div style={{color:LT.danger,fontSize:'15px',fontWeight:800,marginBottom:'8px'}}>מצטער, מידע רגיש</div>
            <div style={{color:LT.muted,fontSize:'13px'}}>אתה מוחזר למסך הקודם...</div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

const pinBtn = {
  padding:'13px', borderRadius:'12px', border:`1px solid ${LT.line2}`,
  background:'#fff', fontFamily:FF_MONO, fontSize:'17px', fontWeight:700,
  color:LT.ink, cursor:'pointer', transition:'all .12s ease',
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN — TripDetail
   ═══════════════════════════════════════════════════════════════════ */
export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [flights, setFlights] = useState([])
  const [lodging, setLodging] = useState([])
  const [allCompanions, setAllCompanions] = useState([])
  const [allTrips, setAllTrips] = useState([])
  const [countriesWithNotes, setCountriesWithNotes] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [editMode, setEditMode] = useState(false)
  const [modal, setModal] = useState(null)

  async function load() {
    const [tripRes, flightsRes, lodgingRes, compRes, allTripsRes, notesRes] = await Promise.all([
      supabase.from('trips').select(`*,trip_segments(*,segment_companions(companions(name)))`).eq('id', id).single(),
      supabase.from('flights').select('*').eq('trip_id', id).order('departure_date').order('departure_time'),
      supabase.from('lodging').select('*').eq('trip_id', id).order('check_in'),
      supabase.from('companions').select('name').order('name'),
      supabase.from('trips').select(`id,name,name_he,trip_segments(date_from)`),
      supabase.from('country_notes').select('country'),
    ])
    setTrip(tripRes.data)
    setFlights(sortFlights(flightsRes.data || []))
    setLodging(lodgingRes.data || [])
    setAllCompanions(compRes.data?.map(c => c.name) || [])
    setCountriesWithNotes(new Set((notesRes.data || []).map(n => n.country)))
    const sorted = (allTripsRes.data || []).map(t => {
      const dates = (t.trip_segments || []).map(s => s.date_from).filter(Boolean).sort()
      return { ...t, startDate: dates[0] || null }
    }).filter(t => t.startDate).sort((a, b) => a.startDate.localeCompare(b.startDate))
    setAllTrips(sorted)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function delFlight(fid) { if (!confirm('למחוק?')) return; await supabase.from('flights').delete().eq('id', fid); load() }
  async function delLodging(lid) { if (!confirm('למחוק?')) return; await supabase.from('lodging').delete().eq('id', lid); load() }
  async function deleteTrip() {
    if (!confirm('למחוק את הנסיעה?\nכל הנתונים יימחקו לצמיתות.')) return
    const segIds = (trip.trip_segments || []).map(s => s.id)
    if (segIds.length > 0) await supabase.from('segment_companions').delete().in('segment_id', segIds)
    await supabase.from('trip_segments').delete().eq('trip_id', id)
    await supabase.from('flights').delete().eq('trip_id', id)
    await supabase.from('lodging').delete().eq('trip_id', id)
    await supabase.from('trips').delete().eq('id', id)
    navigate('/travels')
  }

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:LT.pageBg,fontFamily:FF }}>
      <style>{KEYFRAMES}</style>
      <div style={{ textAlign:'center' }}>
        <div style={{
          width:'36px',height:'36px',
          border:`2.5px solid ${LT.line2}`,
          borderTopColor: LT.accent,
          borderRadius:'50%',
          animation:`td-spin 700ms linear infinite`,
          margin:'0 auto 14px',
        }}/>
        <div style={{ color:LT.muted,fontSize:'13px',fontWeight:500,animation:'td-pulse-text 1.4s ease-in-out infinite',letterSpacing:'0.5px' }}>טוען...</div>
      </div>
    </div>
  )
  if (!trip) return null

  const segs = trip.trip_segments?.sort((a, b) => (a.date_from || '').localeCompare(b.date_from || '')) || []
  const startDate = segs[0]?.date_from
  const endDate = segs[segs.length - 1]?.date_to
  const totalDays = daysBetween(startDate, endDate)
  const allTripComps = [...new Set(segs.flatMap(s => s.segment_companions?.map(sc => sc.companions?.name) || []).filter(Boolean))]
  const displayName = trip.name_he || trip.name
  const sortedFlightsArr = sortFlights(flights)
  const daysToGo = daysUntil(startDate)

  const curIdx = allTrips.findIndex(t => t.id === id)
  const prevTrip = curIdx > 0 ? allTrips[curIdx - 1] : null
  const nextTrip = curIdx >= 0 && curIdx < allTrips.length - 1 ? allTrips[curIdx + 1] : null

  /* hero route string: TLV → CDG → BCN → TLV (airport codes from flights, or city initials) */
  const routeCodes = (() => {
    if (sortedFlightsArr.length > 0) {
      const codes = []
      sortedFlightsArr.forEach(f => {
        if (f.from_airport && codes[codes.length-1] !== f.from_airport) codes.push(f.from_airport)
        if (f.to_airport) codes.push(f.to_airport)
      })
      return codes
    }
    return segs.map(s => (s.city || '').slice(0,3).toUpperCase()).filter(Boolean)
  })()

  const continents = [...new Set(segs.map(s => s.continent).filter(Boolean))]
  const primaryCont = continents[0] || ''

  const tabs = [
    { id: 'overview', label: 'סקירה' },
    { id: 'flights', label: 'טיסות', count: flights.length },
    { id: 'lodging', label: 'לינה', count: lodging.length },
    { id: 'rashamim', label: 'רשמים', locked: true },
  ]

  return (
    <div style={{ minHeight: '100dvh', background: LT.pageBg, fontFamily: FF, color: LT.ink, direction: 'rtl' }}>
      <style>{KEYFRAMES}</style>

      <div className="td-page" style={{ maxWidth: '1120px', margin: '0 auto', padding: '18px 16px 120px' }}>
        <div className="td-shell" style={{
          background: 'linear-gradient(180deg, rgba(232,241,255,0.6), transparent 80%)',
          borderRadius: '24px', padding: '14px 16px 22px',
          border: '1px solid rgba(37,99,235,0.08)',
          position: 'relative', overflow: 'hidden',
        }}>

          <TripHeader
            displayName={displayName}
            editMode={editMode}
            setEditMode={setEditMode}
            setModal={setModal}
            navigate={navigate}
            prevTrip={prevTrip}
            nextTrip={nextTrip}
          />

          {/* ═══ HERO ═══ */}
          <div className="td-hero" style={{
            background: '#fff', border: `1px solid ${LT.line2}`,
            borderRadius: '22px', padding: '16px 20px',
            boxShadow: '0 6px 24px rgba(37,99,235,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
            display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'center',
            animation: `td-fade-up 420ms ${EASE.out} both`,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
              <div className="td-hero-route" style={{
                display: 'inline-flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap',
                fontSize: '30px', fontWeight: 800, letterSpacing: '-0.03em', color: LT.ink, lineHeight: 1.05,
                fontFamily: FF_MONO,
              }}>
                {routeCodes.slice(0, 5).map((c, i) => (
                  <React.Fragment key={i}>
                    <span>{c}</span>
                    {i < Math.min(routeCodes.length, 5) - 1 && <span className="td-arrow" style={{ color: LT.muted2, fontWeight: 400, fontSize: '22px' }}>←</span>}
                  </React.Fragment>
                ))}
                {primaryCont && (
                  <span style={{ fontFamily: FF, fontSize: '15px', color: LT.muted, fontWeight: 500, letterSpacing: 0, marginRight: '-4px' }}>
                    · {heCont(primaryCont)}
                  </span>
                )}
              </div>
              <div className="td-hero-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: LT.muted, flexWrap: 'wrap' }}>
                {daysToGo != null && daysToGo > 0 && (
                  <span style={{
                    color: LT.accent, fontWeight: 700, fontSize: '11.5px',
                    background: 'rgba(37,99,235,0.08)', padding: '3px 10px', borderRadius: '999px',
                    border: '1px solid rgba(37,99,235,0.15)',
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                  }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 0 3px rgba(59,130,246,0.22)' }}/>
                    בעוד {daysToGo} ימים
                  </span>
                )}
                {startDate && <>
                  <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: LT.muted2 }}/>
                  <b style={{ color: LT.ink, fontWeight: 700 }}>{fmtShort(startDate)}{endDate ? ` — ${fmtShortY(endDate)}` : ''}</b>
                </>}
                {totalDays && <>
                  <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: LT.muted2 }}/>
                  <b style={{ color: LT.ink, fontWeight: 700 }}>{totalDays} ימים</b>
                </>}
                {segs.length > 0 && <>
                  <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: LT.muted2 }}/>
                  <b style={{ color: LT.ink, fontWeight: 700 }}>{segs.length} ערים</b>
                </>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
              {allTripComps.length > 0 && (
                <div className="td-companions-pill" style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px', fontSize: '13px', color: LT.muted }}>
                  <span style={{ fontSize: '11px', color: LT.muted2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>עם</span>
                  <span style={{ color: LT.ink2, fontWeight: 600 }}>{allTripComps.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* ═══ TABS ═══ */}
          <div className="td-tabs" style={{
            display: 'flex', background: 'rgba(255,255,255,0.7)', border: `1px solid ${LT.line2}`,
            borderRadius: '14px', padding: '4px', margin: '18px 0 16px',
            backdropFilter: 'blur(8px)', maxWidth: '640px',
          }}>
            {tabs.map(t => {
              const on = activeTab === t.id
              return (
                <button
                  key={t.id}
                  className={`td-tab ${on ? 'on' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    flex: 1, padding: '10px', border: 0, background: 'transparent',
                    fontFamily: FF, fontSize: '12.5px', fontWeight: 700,
                    color: on ? LT.accent : LT.muted,
                    borderRadius: '10px', cursor: 'pointer',
                    transition: 'all .18s ease',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  {t.locked && <span style={{ fontSize: '12px', opacity: 0.6 }}>🔒</span>}
                  {t.label}
                  {t.count > 0 && (
                    <span className="td-tab-count" style={{
                      fontSize: '11px',
                      background: 'rgba(37,99,235,0.1)', color: LT.accent,
                      padding: '1px 8px', borderRadius: '999px', fontWeight: 800,
                    }}>{t.count}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* ═══ PANELS ═══ */}
          <div key={activeTab} style={{ animation: `td-panel-fade 300ms ${EASE.out} both` }}>

            {/* ─── OVERVIEW ─── */}
            {activeTab === 'overview' && (
              <div className="td-overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>

                {/* Stops column */}
                <div>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',margin:'0 2px 10px' }}>
                    <h3 style={{ fontSize:'11px',letterSpacing:'0.16em',textTransform:'uppercase',color:LT.muted,fontWeight:700,margin:0 }}>מסלול הטיול</h3>
                    <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
                      {trip.tripit_url && (
                        <a
                          href={trip.tripit_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display:'inline-flex',alignItems:'center',gap:'5px',
                            fontSize:'11px',fontWeight:700,color:LT.muted,
                            background:'#f5f8ff',border:`1px solid ${LT.line2}`,
                            padding:'3px 10px',borderRadius:'999px',
                            textDecoration:'none',letterSpacing:'0.04em',
                            transition:'all .15s ease',
                          }}
                          onMouseEnter={e=>{ e.currentTarget.style.color=LT.accent; e.currentTarget.style.borderColor=LT.accent; e.currentTarget.style.background='rgba(37,99,235,0.06)' }}
                          onMouseLeave={e=>{ e.currentTarget.style.color=LT.muted; e.currentTarget.style.borderColor=LT.line2; e.currentTarget.style.background='#f5f8ff' }}
                        >
                          <PlaneIcon size={11} color="currentColor"/>
                          TripIt
                        </a>
                      )}
                      {editMode && (
                        <button className="td-press" onClick={() => setModal('addSeg')} style={{ fontSize:'12px',color:LT.accent,fontWeight:700,cursor:'pointer',background:'none',border:'none',fontFamily:FF }}>+ יעד חדש</button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {segs.map((seg, segIdx) => {
                      const segDays = daysBetween(seg.date_from, seg.date_to)
                      const comps = seg.segment_companions?.map(sc => sc.companions?.name).filter(Boolean) || []
                      const segHotels = hotelsForSeg(seg, lodging)
                      const cc = contColor(seg.continent)
                      const ct = contTint(seg.continent)
                      const cb = contBorder(seg.continent)
                      const airportCode = (seg.city || '').slice(0,3).toUpperCase()
                      const segImg = segImage(seg.city, seg.country)
                      return (
                        <div key={seg.id} className="td-stop" onClick={() => editMode && setModal({ type: 'editSeg', data: seg })}
                          style={{
                            background: '#fff', border: `1px solid ${LT.line2}`,
                            borderRadius: '16px', padding: '14px 16px',
                            boxShadow: '0 2px 10px rgba(37,99,235,0.05)',
                            display: 'grid', gridTemplateColumns: '56px 1fr auto auto', gap: '16px', alignItems: 'center',
                            position: 'relative', overflow: 'hidden',
                            cursor: editMode ? 'pointer' : 'default',
                            transition: 'transform .15s ease, box-shadow .15s ease',
                            animation: `td-seg-in 420ms ${EASE.out} both`,
                            animationDelay: `${segIdx * 60}ms`,
                          }}>
                          {/* right side color stripe */}
                          <div style={{ position:'absolute',right:0,top:0,bottom:0,width:'3px',background:cc }}/>
                          {/* code block — shows city image when available, falls back to airport code */}
                          <div className="td-stop-code" style={{
                            width:'56px',height:'56px',borderRadius:'14px',
                            background: segImg ? '#0b1222' : ct,
                            color: cc,
                            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                            border: `1px solid ${cb}`,
                            fontFamily: FF_MONO, lineHeight: 1,
                            position:'relative', overflow:'hidden',
                          }}>
                            {segImg ? (
                              <>
                                <img
                                  src={segImg}
                                  alt={seg.city || ''}
                                  style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center' }}
                                />
                                {/* small index pill on top-right corner */}
                                <div style={{
                                  position:'absolute', top:3, right:3,
                                  fontSize:'9px', fontWeight:700,
                                  background:'rgba(0,0,0,0.55)', color:'#fff',
                                  padding:'2px 5px', borderRadius:'6px',
                                  letterSpacing:'0.04em', lineHeight:1,
                                  backdropFilter:'blur(2px)',
                                }}>{String(segIdx + 1).padStart(2, '0')}</div>
                              </>
                            ) : (
                              <>
                                <div style={{ fontSize:'15px',fontWeight:700,letterSpacing:'0.04em' }}>{airportCode}</div>
                                <div style={{ fontSize:'9px',opacity:0.65,marginTop:'4px',fontWeight:600 }}>{String(segIdx + 1).padStart(2, '0')}</div>
                              </>
                            )}
                          </div>
                          {/* body */}
                          <div className="td-stop-body">
                            <div style={{ display:'flex',alignItems:'baseline',gap:'8px',flexWrap:'wrap' }}>
                              <span style={{ fontSize:'17px',fontWeight:800,color:LT.ink,letterSpacing:'-0.01em' }}>{heCity(seg.city)}</span>
                              <button
                                onClick={e => { e.stopPropagation(); navigate(`/country/${encodeURIComponent(seg.country)}`) }}
                                title={countriesWithNotes.has(seg.country) ? `יש הערות על ${heCountry(seg.country)}` : `אין הערות עדיין על ${heCountry(seg.country)}`}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                  fontFamily: FF, fontSize: '11px', fontWeight: 600,
                                  color: countriesWithNotes.has(seg.country) ? LT.accent : LT.muted2,
                                  textDecoration: countriesWithNotes.has(seg.country) ? 'underline' : 'underline dotted',
                                  textDecorationColor: countriesWithNotes.has(seg.country) ? LT.accent : LT.muted2,
                                  textUnderlineOffset: '3px',
                                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                                }}
                              >
                                {countriesWithNotes.has(seg.country) && (
                                  <span style={{ display:'inline-block',width:'5px',height:'5px',borderRadius:'50%',background:LT.accent,flexShrink:0 }}/>
                                )}
                                · {heCountry(seg.country)}
                              </button>
                            </div>
                            {(seg.date_from || seg.date_to) && (
                              <div style={{ fontSize:'12.5px',color:LT.muted,marginTop:'3px',fontVariantNumeric:'tabular-nums' }}>
                                {fmtShort(seg.date_from)}{seg.date_to ? ` — ${fmtShort(seg.date_to)}` : ''}
                              </div>
                            )}
                            {comps.length > 0 && (
                              <div style={{ display:'flex',gap:'5px',marginTop:'8px',flexWrap:'wrap' }}>
                                {comps.map(c => (
                                  <span key={c} style={{
                                    display:'inline-flex',alignItems:'center',gap:'5px',fontSize:'11.5px',
                                    color: LT.ink2, background: '#f5f8ff', padding: '3px 9px', borderRadius: '999px',
                                    fontWeight: 600, border: `1px solid ${LT.line}`,
                                  }}>{c}</span>
                                ))}
                              </div>
                            )}
                            {seg.notes && (
                              <div style={{
                                marginTop:'8px',
                                background:'#fffbf0',
                                borderRight:'3px solid rgba(245,158,11,0.5)',
                                borderRadius:'8px',padding:'6px 10px',
                                fontSize:'12.5px',color:'#92400e',lineHeight:1.6,
                                border:'1px solid rgba(245,158,11,0.15)',
                                borderRightWidth:'3px',
                              }}>{seg.notes}</div>
                            )}
                          </div>
                          {/* hotels */}
                          <div className="td-stop-hotels" style={{ display:'flex',flexDirection:'column',gap:'4px',minWidth:0,maxWidth:'220px' }}>
                            {segHotels.map(h => (
                              <div key={h.id} style={{ display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',color:LT.ink2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                                <BedIcon size={12} color={LT.accent}/>
                                <span style={{ overflow:'hidden',textOverflow:'ellipsis' }}>{h.hotel_name}</span>
                              </div>
                            ))}
                          </div>
                          {/* meta */}
                          <div className="td-stop-meta" style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'2px' }}>
                            <div className="td-stop-days" style={{ fontSize:'22px',fontWeight:800,color:LT.ink,lineHeight:1,fontVariantNumeric:'tabular-nums' }}>{segDays ?? '—'}</div>
                            <div className="td-stop-days-label" style={{ fontSize:'10.5px',color:LT.muted,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em' }}>ימים</div>
                            <div className="td-chev" style={{ color:LT.muted2,marginTop:'8px',opacity:0.6,transition:'transform .2s ease',fontSize:'16px' }}>‹</div>
                          </div>
                        </div>
                      )
                    })}

                    {segs.length === 0 && (
                      <div style={{ padding:'40px',textAlign:'center',color:LT.muted,background:'#fff',border:`1px solid ${LT.line2}`,borderRadius:'16px' }}>
                        <div style={{ fontSize:'14px' }}>לא הוגדרו יעדים{editMode ? ' — לחץ + יעד חדש' : ''}</div>
                      </div>
                    )}
                  </div>

                  {/* danger zone + impressions access in overview */}
                  {editMode && (
                    <button
                      className="td-press"
                      onClick={deleteTrip}
                      style={{ marginTop:'16px',background:LT.dangerBg,border:`1px solid ${LT.dangerBorder}`,color:LT.danger,padding:'10px 14px',borderRadius:'12px',fontSize:'13px',cursor:'pointer',fontFamily:FF,width:'100%' }}
                    >מחק נסיעה זו</button>
                  )}
                </div>

                {/* Aside */}
                <aside className="td-aside" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Flights card */}
                  <div style={{
                    background: 'rgba(255,255,255,0.8)', border: `1px solid ${LT.line2}`,
                    borderRadius: '16px', padding: '14px 16px', backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 10px rgba(37,99,235,0.04)',
                    animation: `td-card-in 420ms ${EASE.out} both`, animationDelay:'120ms',
                  }}>
                    <h4 style={{
                      margin: '0 0 10px', fontSize: '11px', letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: LT.muted, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span>טיסות <span style={{ fontFamily:FF_MONO,color:LT.accent,fontSize:'11px' }}>· {sortedFlightsArr.length}</span></span>
                      {editMode && <span style={{ fontSize: '18px', color: LT.muted, cursor: 'pointer', lineHeight: 1 }} onClick={() => setModal('addFlight')}>＋</span>}
                    </h4>
                    {sortedFlightsArr.length === 0
                      ? <p style={{ fontSize:'12px',color:LT.muted,margin:0,fontStyle:'italic' }}>אין נתוני טיסות</p>
                      : sortedFlightsArr.map(f => (
                        <div key={f.id} className="td-flt" onClick={() => setActiveTab('flights')} style={{
                          display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px', alignItems: 'center',
                          padding: '8px 10px', borderRadius: '10px', background: '#fff',
                          border: `1px solid ${LT.line}`, cursor: 'pointer', transition: 'all .15s ease',
                          marginBottom: '6px',
                        }}>
                          <span style={{
                            fontFamily:FF_MONO,fontSize:'11px',fontWeight:700,color:LT.accent,
                            background:'rgba(37,99,235,0.08)',padding:'3px 8px',borderRadius:'6px',letterSpacing:'0.04em',
                          }}>{f.airline_code} {f.flight_number}</span>
                          <div>
                            <div style={{ fontFamily:FF_MONO,fontSize:'13px',fontWeight:700,color:LT.ink,display:'flex',alignItems:'center',gap:'4px',direction:'ltr' }}>
                              {f.from_airport} <span style={{ color:LT.muted2,fontWeight:400 }}>→</span> {f.to_airport}
                            </div>
                            <div style={{ fontSize:'11px',color:LT.muted,marginTop:'2px',fontVariantNumeric:'tabular-nums' }}>
                              {fmtNumY(f.departure_date)}{f.service_class ? ` · ${f.service_class}` : ''}
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>

                  {/* Lodging card */}
                  <div style={{
                    background: 'rgba(255,255,255,0.8)', border: `1px solid ${LT.line2}`,
                    borderRadius: '16px', padding: '14px 16px', backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 10px rgba(37,99,235,0.04)',
                    animation: `td-card-in 420ms ${EASE.out} both`, animationDelay:'180ms',
                  }}>
                    <h4 style={{
                      margin: '0 0 10px', fontSize: '11px', letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: LT.muted, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span>לינה <span style={{ fontFamily:FF_MONO,color:LT.accent,fontSize:'11px' }}>· {lodging.length}</span></span>
                      {editMode && <span style={{ fontSize: '18px', color: LT.muted, cursor: 'pointer', lineHeight: 1 }} onClick={() => setModal('addLodging')}>＋</span>}
                    </h4>
                    {lodging.length === 0
                      ? <p style={{ fontSize:'12px',color:LT.muted,margin:0,fontStyle:'italic' }}>אין נתוני לינה</p>
                      : lodging.map(l => {
                        const nights = daysBetween(l.check_in, l.check_out)
                        return (
                          <div key={l.id} className="td-hotel-mini" onClick={() => setActiveTab('lodging')} style={{
                            display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: '10px', alignItems: 'center',
                            padding: '8px 10px', borderRadius: '10px', background: '#fff',
                            border: `1px solid ${LT.line}`, cursor: 'pointer', transition: 'all .15s ease',
                            marginBottom: '6px',
                          }}>
                            <div style={{
                              width:'36px',height:'36px',borderRadius:'8px',
                              background:'linear-gradient(135deg,#dbeafe,#eff6ff)',
                              display:'flex',alignItems:'center',justifyContent:'center',
                              color:LT.accent,border:`1px solid ${LT.line}`,
                            }}><BedIcon size={16} color={LT.accent}/></div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize:'13px',fontWeight:700,color:LT.ink,lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{l.hotel_name}</div>
                              <div style={{ fontSize:'11px',color:LT.muted,marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{l.address || ''}</div>
                            </div>
                            {nights != null && (
                              <div style={{ fontSize:'11px',color:LT.muted,fontVariantNumeric:'tabular-nums',textAlign:'left' }}>
                                <b style={{ display:'block',color:LT.ink,fontSize:'14px',fontWeight:800 }}>{nights}</b>
                                לילות
                              </div>
                            )}
                          </div>
                        )
                      })
                    }
                  </div>
                </aside>
              </div>
            )}

            {/* ─── FLIGHTS ─── */}
            {activeTab === 'flights' && (
              <div>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',margin:'4px 2px 10px' }}>
                  <h3 style={{ fontSize:'11px',letterSpacing:'0.16em',textTransform:'uppercase',color:LT.muted,fontWeight:700,margin:0 }}>טיסות בנסיעה</h3>
                  {editMode && (
                    <button className="td-press" onClick={() => setModal('addFlight')} style={{ fontSize:'12px',color:LT.accent,fontWeight:700,cursor:'pointer',background:'none',border:'none',fontFamily:FF }}>+ הוסף טיסה</button>
                  )}
                </div>
                {sortedFlightsArr.length === 0
                  ? <div style={{ textAlign: 'center', padding: '60px 0', color: LT.muted }}>
                      <div style={{ marginBottom: '10px', opacity: 0.4 }}><PlaneIcon size={40} color={LT.muted2}/></div>
                      <div style={{ fontSize: '14px' }}>אין טיסות{editMode ? ' — לחץ + הוסף' : ''}</div>
                    </div>
                  : sortedFlightsArr.map((f, fIdx) => (
                    <div key={f.id} className="td-flight-row" style={{
                      background: '#fff', border: `1px solid ${LT.line2}`,
                      borderRadius: '16px', padding: '16px 18px', marginBottom: '10px',
                      display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '18px', alignItems: 'center',
                      boxShadow: '0 2px 10px rgba(37,99,235,0.05)',
                      animation: `td-card-in 460ms ${EASE.out} both`, animationDelay:`${fIdx*50}ms`,
                      direction: 'ltr',
                    }}>
                      {/* Airline */}
                      <div className="td-flight-airline" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',minWidth:'60px' }}>
                        <span style={{
                          fontFamily:FF_MONO,fontSize:'18px',fontWeight:700,color:LT.accent,
                          background:'rgba(37,99,235,0.08)',padding:'6px 10px',borderRadius:'8px',
                        }}>{f.airline_code}</span>
                        <span style={{ fontSize:'11px',color:LT.muted,fontFamily:FF_MONO }}>{f.flight_number}</span>
                      </div>

                      {/* Journey */}
                      {/* Journey — direction:ltr כי הגלובוס מכוון LTR; from=שמאל, to=ימין */}
                      <div className="td-flight-journey" style={{ display:'grid',gridTemplateColumns:'1fr 200px 1fr',alignItems:'center',gap:'12px',direction:'ltr' }}>
                        {/* מקור — שמאל */}
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontFamily:FF_MONO,fontSize:'22px',fontWeight:800,color:LT.ink,letterSpacing:'0.02em' }}>{f.from_airport}</div>
                          <div style={{ fontSize:'11.5px',color:LT.muted,marginTop:'2px' }}>{f.from_city}</div>
                          {f.departure_time && <div style={{ fontFamily:FF_MONO,fontSize:'13px',color:LT.ink2,marginTop:'6px',fontVariantNumeric:'tabular-nums' }}>{f.departure_time.slice(0,5)}</div>}
                          <div style={{ fontSize:'11px',color:LT.muted,marginTop:'1px' }}>{fmtShortY(f.departure_date)}</div>
                        </div>
                        {/* גלובוס — אמצע */}
                        <div className="td-flight-globe" style={{ textAlign:'center',position:'relative' }}>
                          <div style={{ display:'flex',justifyContent:'center',alignItems:'center',margin:'-4px auto 4px',direction:'ltr' }}>
                            <FlightAnimation
                              from={f.from_airport || 'TLV'}
                              to={f.to_airport || 'CDG'}
                              size={200}
                              duration={2800}
                              palette="white"
                              accent={LT.accent}
                              showLabels={false}
                            />
                          </div>
                          {f.stops && f.stops !== 'nonstop'
                            ? <div style={{ fontSize:'10.5px',color:LT.muted,fontWeight:600 }}>{f.stops}</div>
                            : <div style={{ fontSize:'10.5px',color:LT.muted,fontWeight:600 }}>ישיר{f.distance ? ` · ${f.distance}` : ''}</div>
                          }
                        </div>
                        {/* יעד — ימין */}
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontFamily:FF_MONO,fontSize:'22px',fontWeight:800,color:LT.ink,letterSpacing:'0.02em' }}>{f.to_airport}</div>
                          <div style={{ fontSize:'11.5px',color:LT.muted,marginTop:'2px' }}>{f.to_city}</div>
                          {f.arrival_time && <div style={{ fontFamily:FF_MONO,fontSize:'13px',color:LT.ink2,marginTop:'6px',fontVariantNumeric:'tabular-nums' }}>{f.arrival_time.slice(0,5)}</div>}
                          <div style={{ fontSize:'11px',color:LT.muted,marginTop:'1px' }}>{fmtShortY(f.arrival_date)}</div>
                        </div>
                      </div>

                      {/* Xtra */}
                      <div className="td-flight-extras" style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'4px',fontSize:'11px',color:LT.muted,direction:'rtl' }}>
                        {f.service_class && <span style={{ background:'#f5f8ff',padding:'3px 10px',borderRadius:'999px',fontWeight:700,color:LT.ink2,border:`1px solid ${LT.line}` }}>{f.service_class}</span>}
                        {f.aircraft && <span>{f.aircraft}</span>}
                        {f.confirmation && <span style={{ fontSize:'10.5px' }}>אישור: {f.confirmation}</span>}
                        {editMode && (
                          <div style={{ display:'flex',gap:'6px',marginTop:'4px' }}>
                            <button className="td-press" onClick={() => setModal({ type: 'editFlight', data: f })} style={editSmallBtn}>ערוך</button>
                            <button className="td-press" onClick={() => delFlight(f.id)} style={{ ...editSmallBtn, background: LT.dangerBg, borderColor: LT.dangerBorder, color: LT.danger }}>מחק</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ─── LODGING ─── */}
            {activeTab === 'lodging' && (
              <div>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',margin:'4px 2px 10px' }}>
                  <h3 style={{ fontSize:'11px',letterSpacing:'0.16em',textTransform:'uppercase',color:LT.muted,fontWeight:700,margin:0 }}>לינה בנסיעה</h3>
                  {editMode && (
                    <button className="td-press" onClick={() => setModal('addLodging')} style={{ fontSize:'12px',color:LT.accent,fontWeight:700,cursor:'pointer',background:'none',border:'none',fontFamily:FF }}>+ הוסף לינה</button>
                  )}
                </div>
                {lodging.length === 0
                  ? <div style={{ textAlign: 'center', padding: '60px 0', color: LT.muted }}>
                      <div style={{ marginBottom: '10px', opacity: 0.4 }}><BedIcon size={40} color={LT.muted2}/></div>
                      <div style={{ fontSize: '14px' }}>אין לינות{editMode ? ' — לחץ + הוסף' : ''}</div>
                    </div>
                  : lodging.map((l, lIdx) => {
                    const nights = daysBetween(l.check_in, l.check_out)
                    return (
                      <div key={l.id} className="td-lodging-row" style={{
                        background: '#fff', border: `1px solid ${LT.line2}`,
                        borderRadius: '16px', padding: '16px 18px', marginBottom: '10px',
                        display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: '16px', alignItems: 'center',
                        boxShadow: '0 2px 10px rgba(37,99,235,0.05)',
                        animation: `td-card-in 460ms ${EASE.out} both`, animationDelay:`${lIdx*50}ms`,
                      }}>
                        <div className="td-lodging-icon" style={{
                          width:'72px',height:'72px',borderRadius:'12px',
                          background:'linear-gradient(135deg,#dbeafe,#eff6ff)',border:`1px solid ${LT.line}`,
                          display:'flex',alignItems:'center',justifyContent:'center',color:LT.accent,
                        }}><BedIcon size={28} color={LT.accent}/></div>
                        <div>
                          <div style={{ fontSize:'16px',fontWeight:800,color:LT.ink,letterSpacing:'-0.01em' }}>{l.hotel_name}</div>
                          {l.address && <div style={{ fontSize:'12px',color:LT.muted,marginTop:'3px' }}>{l.address}</div>}
                          <div style={{ display:'flex',gap:'5px',marginTop:'8px',flexWrap:'wrap' }}>
                            {l.room_type && <span style={bitStyle}>{l.room_type}</span>}
                            {l.confirmation && <span style={bitStyle}>אישור: {l.confirmation}</span>}
                            {l.booking_site && <span style={bitStyle}>{l.booking_site}</span>}
                          </div>
                          {/* Hotel notes */}
                          {l.notes && (
                            <div style={{
                              marginTop:'10px',
                              background:'#fffbf0',border:'1px solid #f3e5b8',
                              borderRadius:'10px',padding:'8px 12px',
                              fontSize:'13px',color:'#92400e',lineHeight:1.65,
                              whiteSpace:'pre-wrap',
                            }}>{l.notes}</div>
                          )}
                          {editMode && (
                            <div style={{ display:'flex',gap:'6px',marginTop:'8px' }}>
                              <button className="td-press" onClick={() => setModal({ type: 'editLodging', data: l })} style={editSmallBtn}>ערוך</button>
                              <button className="td-press" onClick={() => delLodging(l.id)} style={{ ...editSmallBtn, background: LT.dangerBg, borderColor: LT.dangerBorder, color: LT.danger }}>מחק</button>
                            </div>
                          )}
                        </div>
                        <div className="td-lodging-meta" style={{ textAlign:'left',fontFamily:FF_MONO,fontSize:'11.5px',color:LT.muted,direction:'ltr' }}>
                          {nights != null && <b style={{ display:'block',color:LT.ink,fontSize:'17px',fontWeight:800,fontFamily:FF,letterSpacing:'-0.01em' }}>{nights} לילות</b>}
                          {l.check_in && l.check_out && <>{fmtNumY(l.check_in)} — {fmtNumY(l.check_out)}</>}
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            )}

            {/* ─── RASHAMIM ─── */}
            {activeTab === 'rashamim' && (
              <RashamimPanel trip={trip} editMode={editMode} setModal={setModal}/>
            )}

          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === 'addSeg' && <AddSegModal tripId={id} onClose={() => setModal(null)} onSaved={load} />}
      {modal === 'addLodging' && <LodgingModal tripId={id} onClose={() => setModal(null)} onSaved={load} />}
      {modal === 'addFlight' && <FlightModal tripId={id} onClose={() => setModal(null)} onSaved={load} />}
      {modal === 'tripName' && <TripNameModal trip={trip} onClose={() => setModal(null)} onSaved={load} />}
      {modal === 'impressions' && <ImpressionsModal trip={trip} onClose={() => setModal(null)} onSaved={load} />}
      {modal === 'viewImpressions' && <ImpressionsViewer trip={trip} onClose={() => setModal(null)} onEdit={() => setModal('impressions')} />}
      {modal?.type === 'editLodging' && <LodgingModal tripId={id} existing={modal.data} onClose={() => setModal(null)} onSaved={load} />}
      {modal?.type === 'editFlight' && <FlightModal tripId={id} existing={modal.data} onClose={() => setModal(null)} onSaved={load} />}
      {modal?.type === 'editSeg' && <SegmentModal seg={modal.data} allCompanions={allCompanions} onClose={() => setModal(null)} onSaved={load} />}
      {modal?.type === 'note' && <NoteModal seg={modal.data} onClose={() => setModal(null)} onSaved={load} />}
      {modal === 'tripit' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,26,46,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', zIndex: 200 }} onClick={() => setModal(null)}>
          <div className="td-modal-box" style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: '540px', maxWidth: '95vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(15,26,46,0.18), 0 0 0 1px rgba(37,99,235,0.08)', direction:'rtl' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: LT.ink, margin: 0 }}>ייבא מ-TripIt</h3>
              <button style={{ background:'#f5f8ff',border:`1px solid ${LT.line2}`,width:'32px',height:'32px',borderRadius:'50%',fontSize:'16px',color:LT.muted,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }} onClick={() => setModal(null)}>✕</button>
            </div>
            <TripItImport tripId={id} onClose={() => setModal(null)} onSaved={load} />
          </div>
        </div>
      )}
    </div>
  )
}

const bitStyle = {
  display:'inline-flex',alignItems:'center',gap:'5px',fontSize:'11.5px',
  color:LT.ink2,background:'#f5f8ff',padding:'3px 9px',borderRadius:'999px',
  fontWeight:600,border:`1px solid ${LT.line}`,
}

const editSmallBtn = {
  background:'#f5f8ff',border:`1px solid ${LT.line2}`,color:LT.ink2,
  padding:'4px 12px',borderRadius:'8px',fontSize:'11.5px',cursor:'pointer',fontFamily:FF,fontWeight:600,
}

/* ═══════════════════════════════════════════════════════════════════
   RASHAMIM PANEL — keyboard-direct PIN, no on-screen keypad, 3 attempts
   ═══════════════════════════════════════════════════════════════════ */
function RashamimPanel({ trip, editMode, setModal }) {
  const hasContent = !!(trip.impressions && trip.impressions.trim())
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [shake, setShake] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const pinInputRef = useRef(null)

  // Focus the hidden input when entering pin stage (safer than autoFocus on negatively-positioned inputs)
  useEffect(() => {
    if (hasContent && !unlocked && !blocked) {
      const t = setTimeout(() => { pinInputRef.current?.focus({ preventScroll: true }) }, 80)
      return () => clearTimeout(t)
    }
  }, [hasContent, unlocked, blocked])

  function tryPin(val) {
    if (val === SECRET_PIN) {
      setTimeout(() => { setUnlocked(true); setPin('') }, 120)
    } else {
      const next = attempts + 1
      setAttempts(next); setShake(true); setPin('')
      try { if (navigator.vibrate) navigator.vibrate([60, 40, 60]) } catch (_) {}
      setTimeout(() => {
        setShake(false)
        if (next < 3) pinInputRef.current?.focus({ preventScroll: true })
      }, 500)
      if (next >= 3) {
        setBlocked(true)
        try { if (navigator.vibrate) navigator.vibrate([180]) } catch (_) {}
      }
    }
  }

  if (!hasContent) {
    return (
      <div className="td-rashamim-card" style={{
        background:'#fff',border:`1px solid ${LT.line2}`,borderRadius:'20px',
        padding:'40px 24px',textAlign:'center',maxWidth:'420px',margin:'20px auto',
        boxShadow:'0 4px 20px rgba(37,99,235,0.08)',
      }}>
        <div style={{
          width:'64px',height:'64px',borderRadius:'50%',
          background:'linear-gradient(135deg,#eff6ff,#dbeafe)',
          margin:'0 auto 14px',display:'flex',alignItems:'center',justifyContent:'center',
          color:LT.accent,border:`1px solid ${LT.line2}`,
        }}><NoteIcon size={26} color={LT.accent}/></div>
        <h3 style={{ margin:'0 0 6px',fontSize:'18px',fontWeight:800,color:LT.ink }}>אין רשמים עדיין</h3>
        <p style={{ margin:'0 0 20px',fontSize:'13px',color:LT.muted }}>כתוב את הרשמים שלך מהנסיעה</p>
        {editMode && (
          <button onClick={() => setModal('impressions')} style={{ background:LT.accent,border:'none',color:'white',padding:'10px 24px',borderRadius:'10px',fontSize:'14px',fontWeight:700,cursor:'pointer',fontFamily:FF }}>+ כתוב רשמים</button>
        )}
      </div>
    )
  }

  if (blocked) {
    return (
      <div className="td-rashamim-card" style={{
        background:'#fff',border:`1px solid ${LT.line2}`,borderRadius:'20px',
        padding:'48px 24px',textAlign:'center',maxWidth:'420px',margin:'20px auto',
        boxShadow:'0 4px 20px rgba(37,99,235,0.08)',
      }}>
        <div style={{
          width:'64px',height:'64px',borderRadius:'50%',
          background:'rgba(220,38,38,0.08)',
          margin:'0 auto 14px',display:'flex',alignItems:'center',justifyContent:'center',
          color:LT.danger,border:'1px solid rgba(220,38,38,0.2)',
        }}><LockIcon size={28} color={LT.danger}/></div>
        <h3 style={{ margin:'0 0 6px',fontSize:'16px',fontWeight:800,color:LT.danger }}>מצטער, מידע רגיש</h3>
        <p style={{ margin:'0',fontSize:'13px',color:LT.muted }}>חרגת ממספר הנסיונות המותר</p>
      </div>
    )
  }

  if (!unlocked) {
    return (
      <div
        className="td-rashamim-card"
        onClick={() => pinInputRef.current?.focus()}
        style={{
          background:'#fff',border:`1px solid ${LT.line2}`,borderRadius:'20px',
          padding:'44px 24px 40px',textAlign:'center',maxWidth:'420px',margin:'20px auto',
          boxShadow:'0 4px 20px rgba(37,99,235,0.08)',
          cursor:'text',
        }}
      >
        <div style={{
          width:'64px',height:'64px',borderRadius:'50%',
          background:'linear-gradient(135deg,#eff6ff,#dbeafe)',
          margin:'0 auto 16px',display:'flex',alignItems:'center',justifyContent:'center',
          color:LT.accent,border:`1px solid ${LT.line2}`,
        }}><LockIcon size={28} color={LT.accent}/></div>
        <h3 style={{ margin:'0 0 22px',fontSize:'18px',fontWeight:800,color:LT.ink }}>רשמים מוגנים</h3>
        {attempts > 0 && attempts < 3 && (
          <p style={{ color:LT.danger,fontSize:'12px',marginBottom:'12px',fontWeight:600 }}>קוד שגוי · נותרו {3 - attempts} נסיונות</p>
        )}

        {/* Hidden input — captures real keyboard / mobile keypad. Safe sr-only positioning. */}
        <input
          ref={pinInputRef}
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={pin}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 4)
            setPin(v)
            if (v.length === 4) setTimeout(() => tryPin(v), 100)
          }}
          style={{
            position:'absolute',
            width:'1px', height:'1px',
            padding:0, margin:'-1px',
            overflow:'hidden',
            clip:'rect(0,0,0,0)',
            whiteSpace:'nowrap',
            border:0,
            opacity:0,
          }}
        />

        <div style={{
          display:'flex',justifyContent:'center',gap:'14px',marginTop:'4px',
          animation: shake ? `pinShake 0.4s cubic-bezier(0.36,0.07,0.19,0.97)` : 'none',
        }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width:'18px',height:'18px',borderRadius:'50%',
              background: i < pin.length ? LT.accent : 'transparent',
              border: `2px solid ${i < pin.length ? LT.accent : 'rgba(37,99,235,0.28)'}`,
              boxShadow: i < pin.length ? '0 0 0 5px rgba(37,99,235,0.14)' : 'none',
              transition:'all .18s ease',
            }}/>
          ))}
        </div>
      </div>
    )
  }

  // unlocked view — warm yellow background, NO lines
  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',margin:'4px 2px 10px' }}>
        <h3 style={{ fontSize:'11px',letterSpacing:'0.16em',textTransform:'uppercase',color:LT.muted,fontWeight:700,margin:0 }}>
          רשמים · {trip.name_he || trip.name}
        </h3>
        <button onClick={() => setUnlocked(false)} style={{ fontSize:'12px',color:LT.accent,fontWeight:700,cursor:'pointer',background:'none',border:'none',fontFamily:FF,display:'inline-flex',alignItems:'center',gap:'5px' }}>
          <LockIcon size={12} color={LT.accent}/> נעל
        </button>
      </div>
      <div className="td-rashamim-content" style={{
        background:'#fffbf0',
        border:'1px solid #f3e5b8',borderRadius:'16px',
        padding:'22px 24px',maxWidth:'620px',margin:'10px auto',
      }}>
        <div style={{
          display:'flex',justifyContent:'space-between',alignItems:'center',
          marginBottom:'14px',fontSize:'11px',letterSpacing:'0.14em',
          textTransform:'uppercase',color:LT.muted,fontWeight:700,
        }}>
          <span style={{ display:'inline-flex',alignItems:'center',gap:'6px' }}>
            <NoteIcon size={12} color={LT.muted}/> רשמים
          </span>
          {editMode && (
            <button onClick={() => setModal('impressions')} style={{
              background:'rgba(255,255,255,0.8)',border:'1px solid #e8d894',
              padding:'4px 10px',borderRadius:'8px',fontSize:'11px',
              color:'#92400e',fontWeight:700,cursor:'pointer',letterSpacing:0,fontFamily:FF,
            }}>ערוך</button>
          )}
        </div>
        <div style={{ fontSize:'14.5px',lineHeight:'28px',color:'#1c1917',whiteSpace:'pre-wrap',fontFamily:FF }}>
          {trip.impressions}
        </div>
      </div>
    </div>
  )
}
