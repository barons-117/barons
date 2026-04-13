import { useEffect, useState, useRef } from 'react'
import TripItImport from './TripItImport'
import BaronsHeader from './BaronsHeader'
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

const FF = 'Open Sans Hebrew, Open Sans, sans-serif'

/* ── Emil's easing curves ── */
const EASE = {
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',          // strong ease-out for entrances
  inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',       // strong for movement
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',       // iOS-like for modals
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',    // subtle spring for micro-interactions
}

/* ── Dark theme tokens ── */
const DK = {
  bg: '#0f172a',
  surface: 'rgba(255,255,255,0.04)',
  surfaceBorder: 'rgba(255,255,255,0.08)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  glass: 'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(255,255,255,0.1)',
  glassHover: 'rgba(255,255,255,0.1)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.12)',
  inputFocusBorder: '#3b82f6',
  inputFocusGlow: 'rgba(59,130,246,0.25)',
  danger: '#f87171',
  dangerBg: 'rgba(248,113,113,0.08)',
  dangerBorder: 'rgba(248,113,113,0.2)',
}

const inp = {
  width:'100%',border:`1.5px solid ${DK.inputBorder}`,borderRadius:'10px',
  padding:'10px 12px',fontSize:'14px',fontFamily:FF,color:DK.text,
  outline:'none',boxSizing:'border-box',background:DK.inputBg,
  transition:`border-color 220ms ${EASE.out}, box-shadow 220ms ${EASE.out}, background 220ms ${EASE.out}`,
}
const LBL = {display:'block',fontSize:'11px',fontWeight:700,color:DK.textDim,marginBottom:'5px',textTransform:'uppercase',letterSpacing:'1px'}

const focusInp = e => { e.target.style.borderColor = DK.inputFocusBorder; e.target.style.boxShadow = `0 0 0 4px ${DK.inputFocusGlow}`; e.target.style.background = 'rgba(255,255,255,0.08)' }
const blurInp  = e => { e.target.style.borderColor = DK.inputBorder; e.target.style.boxShadow = 'none'; e.target.style.background = DK.inputBg }

/* ── SVG Icons ── */
const PlaneIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5 0 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.3.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
  </svg>
)
const BedIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v11"/><path d="M21 7v11"/><path d="M3 18h18"/><path d="M3 11h18"/><path d="M7 11V7h10v4"/><circle cx="7.5" cy="9" r="1"/>
  </svg>
)
const NoteIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const PinIcon = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
)

/* ── CSS keyframes & global motion rules ── */
const KEYFRAMES = `
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes td-spin { to { transform: rotate(360deg) } }

@keyframes td-pulse-text {
  0%, 100% { opacity: 0.65; }
  50% { opacity: 1; }
}

@keyframes td-modal-in {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes td-backdrop-in {
  from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
  to   { opacity: 1; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
}

@keyframes td-seg-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes td-fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes td-card-in {
  from { opacity: 0; transform: translateY(10px); filter: blur(3px); }
  to   { opacity: 1; transform: translateY(0); filter: blur(0); }
}

@keyframes td-tab-enter {
  from { opacity: 0; transform: translateY(8px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0); filter: blur(0); }
}

@keyframes td-glow-pulse {
  0%, 100% { box-shadow: 0 0 0 2px var(--glow-c), 0 0 10px var(--glow-c-soft); }
  50%      { box-shadow: 0 0 0 2px var(--glow-c), 0 0 22px var(--glow-c-strong); }
}

@keyframes td-line-shimmer {
  0%   { transform: translateY(-40%); opacity: 0; }
  20%  { opacity: 0.9; }
  80%  { opacity: 0.9; }
  100% { transform: translateY(140%); opacity: 0; }
}

@keyframes td-hero-glow {
  0%, 100% { opacity: 0.55; transform: translate3d(0,0,0) scale(1); }
  50%      { opacity: 0.85; transform: translate3d(0,-6px,0) scale(1.04); }
}

@keyframes td-plane-float {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(3px); }
}

@keyframes td-comp-in {
  from { opacity: 0; transform: translateY(6px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Hero dates row — single line on mobile via responsive sizing */
.td-dates-row { display: flex; align-items: center; gap: 10px; flex-wrap: nowrap; justify-content: center; }
.td-dates-divider { width: 24px; height: 1px; background: rgba(255,255,255,0.15); flex-shrink: 0; }
.td-date-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.35); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 2px; }
.td-date-value { font-size: 14px; font-weight: 600; color: white; white-space: nowrap; font-variant-numeric: tabular-nums; }
.td-date-value-long { display: inline; }
.td-date-value-short { display: none; }
.td-days-pill { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; padding: 5px 16px; text-align: center; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); box-shadow: 0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08); flex-shrink: 0; }
.td-days-num { font-size: 15px; font-weight: 800; color: white; }
.td-days-suf { font-size: 11px; color: rgba(255,255,255,0.5); margin-right: 4px; }

@media (max-width: 640px) {
  .td-dates-row { gap: 7px; }
  .td-dates-divider { width: 12px; }
  .td-date-label { font-size: 9px; letter-spacing: 1.5px; margin-bottom: 1px; }
  .td-date-value-long { display: none; }
  .td-date-value-short { display: inline; }
  .td-date-value { font-size: 12px; }
  .td-days-pill { padding: 4px 10px; border-radius: 16px; }
  .td-days-num { font-size: 13px; }
  .td-days-suf { font-size: 10px; margin-right: 3px; }
}

/* Tactile press feedback — applies globally to interactive elements with .td-press */
.td-press { transition: transform 160ms var(--ease-out); }
.td-press:active { transform: scale(0.97); }

/* Hover-only (pointer:fine) elevation hooks */
@media (hover: hover) and (pointer: fine) {
  .td-card-hover {
    transition: transform 260ms var(--ease-out), box-shadow 260ms var(--ease-out), border-color 260ms var(--ease-out);
  }
  .td-card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 34px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.14);
  }
  .td-card-hover:active {
    transform: translateY(-1px) scale(0.995);
  }
  .td-nav-arrow {
    transition: transform 320ms var(--ease-spring), background 260ms var(--ease-out), box-shadow 260ms var(--ease-out);
  }
  .td-nav-arrow[data-dir="prev"]:hover { transform: translateY(-50%) translateX(3px); }
  .td-nav-arrow[data-dir="next"]:hover { transform: translateY(-50%) translateX(-3px); }
  .td-nav-arrow .td-nav-label {
    transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out);
  }
  .td-nav-arrow:hover .td-nav-label {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
  .td-flight-card:hover .td-airport-code {
    text-shadow: 0 0 18px rgba(96,165,250,0.55);
  }
  .td-hotel-name {
    position: relative;
    display: inline-block;
  }
  .td-hotel-name::after {
    content: '';
    position: absolute;
    right: 0; left: 0; bottom: -3px;
    height: 1.5px;
    background: linear-gradient(to left, rgba(96,165,250,0.9), rgba(96,165,250,0.3));
    transform: scaleX(0);
    transform-origin: right center;
    transition: transform 320ms var(--ease-out);
  }
  .td-lodge-card:hover .td-hotel-name::after { transform: scaleX(1); }
}

/* Touch devices — suppress hover animations */
@media (hover: none) or (pointer: coarse) {
  .td-card-hover:hover, .td-nav-arrow:hover, .td-flight-card:hover, .td-lodge-card:hover { transform: none !important; }
}

/* Reduced motion — keep opacity, remove transforms/filters */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 120ms !important;
  }
}
`

/* ── Generic Modal wrapper (drawer-curve entrance) ── */
function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position:'fixed',inset:0,background:'rgba(3,7,18,0.6)',
        display:'flex',alignItems:'center',justifyContent:'center',
        backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',
        zIndex:200,
        animation:`td-backdrop-in 240ms ${EASE.out} both`,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background:'rgba(30,41,59,0.92)',
          backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',
          borderRadius:'24px',padding:'36px',width:'520px',maxWidth:'95vw',maxHeight:'88vh',overflowY:'auto',
          boxShadow:'0 32px 80px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)',
          direction:'rtl',
          animation:`td-modal-in 280ms ${EASE.drawer} both`,
          willChange:'transform, opacity',
        }}
        onClick={e=>e.stopPropagation()}
      >
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'28px' }}>
          <h3 style={{ fontSize:'18px',fontWeight:700,color:DK.text,margin:0,letterSpacing:'-0.3px' }}>{title}</h3>
          <button
            className="td-press"
            style={{ background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',width:'32px',height:'32px',borderRadius:'50%',fontSize:'16px',color:DK.textMuted,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:`background 220ms ${EASE.out}, transform 160ms ${EASE.out}`,flexShrink:0 }}
            onClick={onClose}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
          >&#10005;</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:'16px' }}>
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
        background: 'linear-gradient(135deg, #2563eb, #3b82f6)', border:'none', color:'white', padding:'13px',
        borderRadius:'12px', fontSize:'15px', fontWeight:700, cursor:'pointer',
        fontFamily:FF, marginTop:'8px', width:'100%',
        boxShadow:'0 4px 20px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
        transition:`transform 220ms ${EASE.out}, box-shadow 220ms ${EASE.out}`,
        willChange:'transform',
      }}
      onMouseEnter={e=>{ if(!e.currentTarget.disabled){ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 10px 30px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}}
      onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 20px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' }}
    >
      {loading ? 'שומר...' : 'שמור'}
    </button>
  )
}

/* ── Modal components ── */
function AddSegModal({ tripId, onClose, onSaved }) {
  const [form, setForm] = useState({ city:'', country:'', continent:'', date_from:'', date_to:'' })
  const [loading, setLoading] = useState(false)
  function set(k,v){ setForm(f=>{ const nf={...f,[k]:v}; if(k==='country'&&!f.continent) nf.continent=COUNTRY_TO_CONT[v]||''; return nf }) }
  async function save(){ setLoading(true); await supabase.from('trip_segments').insert({...form,trip_id:tripId,date_from:form.date_from||null,date_to:form.date_to||null}); setLoading(false); onSaved(); onClose() }
  return (
    <Modal title="הוסף יעד" onClose={onClose}>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="עיר"><input style={inp} value={form.city} onChange={e=>set('city',e.target.value)} autoFocus onFocus={focusInp} onBlur={blurInp}/></Field>
        <Field label="מדינה"><input style={inp} value={form.country} onChange={e=>set('country',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      </div>
      <Field label="יבשת">
        <select style={inp} value={form.continent} onChange={e=>set('continent',e.target.value)} onFocus={focusInp} onBlur={blurInp}>
          <option value="">בחר יבשת</option>
          {['Europe','Asia','USA','America','Australia','Africa'].map(c=><option key={c} value={c}>{CONT_HE[c]}</option>)}
        </select>
      </Field>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="תאריך כניסה"><input style={inp} type="date" value={form.date_from} onChange={e=>set('date_from',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
        <Field label="תאריך יציאה"><input style={inp} type="date" value={form.date_to} onChange={e=>set('date_to',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      </div>
      <SaveBtn loading={loading} onClick={save}/>
    </Modal>
  )
}

function LodgingModal({ tripId, onClose, onSaved, existing }) {
  const [form, setForm] = useState(existing || { hotel_name:'',address:'',room_type:'',check_in:'',check_out:'',num_guests:'1',confirmation:'',booking_site:'' })
  const [loading, setLoading] = useState(false)
  function set(k,v){ setForm(f=>({...f,[k]:v})) }
  async function save(){ setLoading(true); if(existing) await supabase.from('lodging').update(form).eq('id',existing.id); else await supabase.from('lodging').insert({...form,trip_id:tripId}); setLoading(false); onSaved(); onClose() }
  return (
    <Modal title={existing ? 'עריכת לינה' : 'הוסף לינה'} onClose={onClose}>
      <Field label="שם המלון"><input style={inp} value={form.hotel_name} onChange={e=>set('hotel_name',e.target.value)} autoFocus onFocus={focusInp} onBlur={blurInp}/></Field>
      <Field label="כתובת"><input style={inp} value={form.address} onChange={e=>set('address',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="צ׳ק-אין"><input style={inp} type="date" value={form.check_in} onChange={e=>set('check_in',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
        <Field label="צ׳ק-אאוט"><input style={inp} type="date" value={form.check_out} onChange={e=>set('check_out',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      </div>
      <Field label="סוג חדר"><input style={inp} value={form.room_type} onChange={e=>set('room_type',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      <Field label="אישור"><input style={inp} value={form.confirmation} onChange={e=>set('confirmation',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      <Field label="אתר הזמנה"><input style={inp} value={form.booking_site} onChange={e=>set('booking_site',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
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
      <div style={{ background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:'10px',padding:'10px 14px',marginBottom:'16px',fontSize:'12px',color:'#fbbf24' }}>
        קוד IATA: <strong>LY</strong>=אל על &middot; <strong>LH</strong>=לופטהנזה &middot; <strong>KL</strong>=KLM &middot; <strong>SN</strong>=בריסל &middot; <strong>LO</strong>=LOT &middot; <strong>AA</strong>=אמריקן
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:'10px',alignItems:'end',marginBottom:'16px' }}>
        <Field label="קוד חברה">
          <input style={inp} value={form.airline_code} onChange={e=>set('airline_code',e.target.value.toUpperCase())} placeholder="LY" onFocus={focusInp} onBlur={blurInp}/>
        </Field>
        <Field label="מספר טיסה">
          <input style={inp} value={form.flight_number} onChange={e=>set('flight_number',e.target.value)} placeholder="316" onFocus={focusInp} onBlur={blurInp}/>
        </Field>
        <Field label=" ">
          <button className="td-press" onClick={fetchFlightInfo} style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',color:DK.text,padding:'10px 14px',borderRadius:'10px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:FF,whiteSpace:'nowrap',transition:`background 220ms ${EASE.out}, transform 160ms ${EASE.out}` }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.12)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}>
            מלא אוטו
          </button>
        </Field>
      </div>
      {fetchMsg && <div style={{ fontSize:'12px',color:'#34d399',background:'rgba(52,211,153,0.08)',border:'1px solid rgba(52,211,153,0.2)',borderRadius:'8px',padding:'8px 12px',marginBottom:'14px',animation:`td-fade-up 260ms ${EASE.out} both` }}>{fetchMsg}</div>}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="מ — שדה תעופה">
          <input style={inp} value={form.from_airport} onChange={e=>onFromAirport(e.target.value)} placeholder="TLV" onFocus={focusInp} onBlur={blurInp}/>
        </Field>
        <Field label="אל — שדה תעופה">
          <input style={inp} value={form.to_airport} onChange={e=>onToAirport(e.target.value)} placeholder="BKK" onFocus={focusInp} onBlur={blurInp}/>
        </Field>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="תאריך יציאה"><input style={inp} type="date" value={form.departure_date} onChange={e=>set('departure_date',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
        <Field label="שעת יציאה"><input style={inp} type="time" value={form.departure_time} onChange={e=>set('departure_time',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="תאריך נחיתה"><input style={inp} type="date" value={form.arrival_date} onChange={e=>set('arrival_date',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
        <Field label="שעת נחיתה"><input style={inp} type="time" value={form.arrival_time} onChange={e=>set('arrival_time',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="עצירות">
          <select style={inp} value={form.stops} onChange={e=>set('stops',e.target.value)} onFocus={focusInp} onBlur={blurInp}>
            <option value="nonstop">ישיר</option>
            <option value="1 stop">עצירה אחת</option>
            <option value="2 stops">שתי עצירות</option>
          </select>
        </Field>
        <Field label="מחלקה">
          <input style={inp} value={form.service_class} onChange={e=>set('service_class',e.target.value)} placeholder="Economy" onFocus={focusInp} onBlur={blurInp}/>
        </Field>
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
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
        <Field label="עיר"><input style={inp} value={form.city} onChange={e=>set('city',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
        <Field label="מדינה"><input style={inp} value={form.country} onChange={e=>set('country',e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      </div>
      <Field label="יבשת">
        <select style={inp} value={form.continent} onChange={e=>set('continent',e.target.value)} onFocus={focusInp} onBlur={blurInp}>
          <option value="">בחר יבשת</option>
          {['Europe','Asia','USA','America','Australia','Africa'].map(c=><option key={c} value={c}>{CONT_HE[c]}</option>)}
        </select>
      </Field>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
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
                background: on ? 'linear-gradient(135deg,#2563eb,#3b82f6)' : 'rgba(255,255,255,0.06)',
                color: on ? 'white' : DK.textMuted,
                borderColor: on ? 'transparent' : 'rgba(255,255,255,0.12)',
                boxShadow: on ? '0 4px 14px rgba(37,99,235,0.35)' : 'none',
                transition:`background 220ms ${EASE.out}, color 220ms ${EASE.out}, border-color 220ms ${EASE.out}, box-shadow 220ms ${EASE.out}, transform 160ms ${EASE.out}`,
              }}>{c}</button>
            )
          })}
        </div>
        <div style={{ display:'flex',gap:'8px' }}>
          <input style={{...inp,flex:1}} value={newComp} onChange={e=>setNewComp(e.target.value)} placeholder="הוסף נוסע חדש..." onKeyDown={e=>e.key==='Enter'&&addNew()} onFocus={focusInp} onBlur={blurInp}/>
          <button className="td-press" onClick={addNew} style={{ background:'linear-gradient(135deg,#2563eb,#3b82f6)',border:'none',color:'white',padding:'10px 16px',borderRadius:'10px',fontSize:'14px',fontWeight:700,cursor:'pointer',transition:`transform 160ms ${EASE.out}, box-shadow 220ms ${EASE.out}`,boxShadow:'0 4px 14px rgba(37,99,235,0.35)' }}
            onMouseEnter={e=>{ e.currentTarget.style.boxShadow='0 8px 22px rgba(37,99,235,0.5)' }} onMouseLeave={e=>{ e.currentTarget.style.boxShadow='0 4px 14px rgba(37,99,235,0.35)' }}>+</button>
        </div>
      </Field>
      <SaveBtn loading={loading} onClick={save}/>
      <button className="td-press" onClick={deleteSeg} style={{ width:'100%',marginTop:'10px',background:DK.dangerBg,border:`1px solid ${DK.dangerBorder}`,color:DK.danger,padding:'11px',borderRadius:'10px',fontSize:'13px',cursor:'pointer',fontFamily:FF,transition:`background 220ms ${EASE.out}, transform 160ms ${EASE.out}` }}
        onMouseEnter={e=>e.currentTarget.style.background='rgba(248,113,113,0.15)'} onMouseLeave={e=>e.currentTarget.style.background=DK.dangerBg}>
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

function ImpressionsModal({ trip, onClose, onSaved }) {
  const [text, setText] = useState(trip.impressions || '')
  const [tripit, setTripit] = useState(trip.tripit_url || '')
  const [loading, setLoading] = useState(false)
  async function save(){ setLoading(true); await supabase.from('trips').update({impressions:text,tripit_url:tripit||null}).eq('id',trip.id); setLoading(false); onSaved(); onClose() }
  return (
    <Modal title="רשמים ופרטי טיול" onClose={onClose}>
      <Field label="קישור TripIt"><input style={inp} value={tripit} onChange={e=>setTripit(e.target.value)} onFocus={focusInp} onBlur={blurInp}/></Field>
      <Field label="רשמים"><textarea style={{...inp,minHeight:'200px',resize:'vertical'}} value={text} onChange={e=>setText(e.target.value)} placeholder="כתוב את הרשמים שלך..." onFocus={focusInp} onBlur={blurInp}/></Field>
      <SaveBtn loading={loading} onClick={save}/>
    </Modal>
  )
}

/* ── Dark glass card helper ── */
const glassCard = (extra = {}) => ({
  background: DK.glass,
  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
  borderRadius: '16px',
  border: `1px solid ${DK.glassBorder}`,
  boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
  ...extra,
})

/* ── Main TripDetail ── */
export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [flights, setFlights] = useState([])
  const [lodging, setLodging] = useState([])
  const [allCompanions, setAllCompanions] = useState([])
  const [allTrips, setAllTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [editMode, setEditMode] = useState(false)
  const [modal, setModal] = useState(null)

  // Tab transition state — used to crossfade/blur between tabs
  const [displayTab, setDisplayTab] = useState('overview')
  const [tabPhase, setTabPhase] = useState('in') // 'in' | 'out'

  // Sliding tab indicator
  const tabsBarRef = useRef(null)
  const tabBtnRefs = useRef({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false })

  async function load() {
    const [tripRes, flightsRes, lodgingRes, compRes, allTripsRes] = await Promise.all([
      supabase.from('trips').select(`*,trip_segments(*,segment_companions(companions(name)))`).eq('id', id).single(),
      supabase.from('flights').select('*').eq('trip_id', id).order('departure_date').order('departure_time'),
      supabase.from('lodging').select('*').eq('trip_id', id).order('check_in'),
      supabase.from('companions').select('name').order('name'),
      supabase.from('trips').select(`id,name,name_he,trip_segments(date_from)`),
    ])
    setTrip(tripRes.data)
    setFlights(sortFlights(flightsRes.data || []))
    setLodging(lodgingRes.data || [])
    setAllCompanions(compRes.data?.map(c => c.name) || [])
    const sorted = (allTripsRes.data || []).map(t => {
      const dates = (t.trip_segments || []).map(s => s.date_from).filter(Boolean).sort()
      return { ...t, startDate: dates[0] || null }
    }).filter(t => t.startDate).sort((a, b) => a.startDate.localeCompare(b.startDate))
    setAllTrips(sorted)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  // Handle tab switching with crossfade/blur
  useEffect(() => {
    if (activeTab === displayTab) return
    setTabPhase('out')
    const t = setTimeout(() => {
      setDisplayTab(activeTab)
      setTabPhase('in')
    }, 160)
    return () => clearTimeout(t)
  }, [activeTab, displayTab])

  // Measure active tab for sliding indicator
  useEffect(() => {
    const el = tabBtnRefs.current[activeTab]
    const bar = tabsBarRef.current
    if (!el || !bar) return
    const elRect = el.getBoundingClientRect()
    const barRect = bar.getBoundingClientRect()
    setIndicator({ left: elRect.left - barRect.left, width: elRect.width, ready: true })
  }, [activeTab, flights.length, lodging.length, trip])

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

  /* Loading state — fast spinner for perceived performance */
  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:DK.bg,fontFamily:FF }}>
      <style>{KEYFRAMES}</style>
      <div style={{ textAlign:'center' }}>
        <div style={{
          width:'36px',height:'36px',
          border:`2.5px solid ${DK.surfaceBorder}`,
          borderTopColor:'#3b82f6',
          borderRadius:'50%',
          animation:`td-spin 700ms linear infinite`,
          margin:'0 auto 14px',
        }}/>
        <div style={{
          color:DK.textMuted,fontSize:'13px',fontWeight:500,
          animation:'td-pulse-text 1.4s ease-in-out infinite',
          letterSpacing:'0.5px',
        }}>טוען...</div>
      </div>
    </div>
  )
  if (!trip) return null

  const segs = trip.trip_segments?.sort((a, b) => (a.date_from || '').localeCompare(b.date_from || '')) || []
  const startDate = segs[0]?.date_from
  const endDate = segs[segs.length - 1]?.date_to
  const totalDays = daysBetween(startDate, endDate)
  const allTripComps = [...new Set(segs.flatMap(s => s.segment_companions?.map(sc => sc.companions?.name) || []).filter(Boolean))]
  const continents = [...new Set(segs.map(s => s.continent).filter(Boolean))]
  const displayName = trip.name_he || trip.name
  const sortedFlightsArr = sortFlights(flights)

  const curIdx = allTrips.findIndex(t => t.id === id)
  const prevTrip = curIdx > 0 ? allTrips[curIdx - 1] : null
  const nextTrip = curIdx >= 0 && curIdx < allTrips.length - 1 ? allTrips[curIdx + 1] : null

  const tabs = [
    { id: 'overview', label: 'סקירה' },
    { id: 'flights', label: 'טיסות', count: flights.length },
    { id: 'lodging', label: 'לינה', count: lodging.length },
  ]

  const navBtnBase = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 20, cursor: 'pointer',
    padding: '8px 12px', lineHeight: 1,
    fontFamily: FF, borderRadius: '12px',
    boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 2,
    willChange: 'transform',
  }

  return (
    <div style={{ minHeight: '100vh', background: DK.bg, fontFamily: FF }}>
      <style>{KEYFRAMES}</style>
      <BaronsHeader
        subtitle={trip?.countries?.slice(0, 3).join(' \u00b7 ') || ''}
        breadcrumbs={[{ label: 'נסיעות', path: '/travels' }, { label: displayName }]}
        actions={[
          { label: '\u270e עריכה', onClick: () => setEditMode(e => !e) },
          { label: '📋 TripIt', onClick: () => setModal('tripit') },
          { label: '+ סגמנט', onClick: () => setModal('addSeg'), primary: true }
        ]}
      />

      {/* ── Hero / Trip info strip ── */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle noise texture overlay */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', pointerEvents: 'none' }} />
        {/* Softly pulsing radial glow behind title */}
        <div
          style={{
            position: 'absolute', top: '-40%', left: '20%', width: '60%', height: '180%',
            background: 'radial-gradient(ellipse, rgba(59,130,246,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
            animation: `td-hero-glow 8s ${EASE.inOut} infinite`,
            willChange: 'transform, opacity',
          }}
        />

        {/* Prev arrow — RTL: prev on right, nudges right on hover */}
        {prevTrip && (
          <button
            className="td-nav-arrow td-press"
            data-dir="prev"
            title={prevTrip.name_he || prevTrip.name}
            onClick={() => { navigate(`/travels/${prevTrip.id}`); setActiveTab('overview') }}
            style={{ ...navBtnBase, right: 12 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(0,0,0,0.32)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.22)' }}
          >
            <span>&lsaquo;</span>
            <span
              className="td-nav-label"
              style={{
                position: 'absolute', top: '50%', right: 'calc(100% + 8px)',
                transform: 'translateY(-50%) translateX(4px)',
                opacity: 0,
                background: 'rgba(15,23,42,0.92)', color: 'white',
                fontSize: '11px', fontWeight: 600, padding: '5px 10px',
                borderRadius: '8px', whiteSpace: 'nowrap', pointerEvents: 'none',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
              }}
            >{prevTrip.name_he || prevTrip.name}</span>
          </button>
        )}

        {/* Next arrow — RTL: next on left, nudges left on hover */}
        {nextTrip && (
          <button
            className="td-nav-arrow td-press"
            data-dir="next"
            title={nextTrip.name_he || nextTrip.name}
            onClick={() => { navigate(`/travels/${nextTrip.id}`); setActiveTab('overview') }}
            style={{ ...navBtnBase, left: 12 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(0,0,0,0.32)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.22)' }}
          >
            <span>&rsaquo;</span>
            <span
              className="td-nav-label"
              style={{
                position: 'absolute', top: '50%', left: 'calc(100% + 8px)',
                transform: 'translateY(-50%) translateX(-4px)',
                opacity: 0,
                background: 'rgba(15,23,42,0.92)', color: 'white',
                fontSize: '11px', fontWeight: 600, padding: '5px 10px',
                borderRadius: '8px', whiteSpace: 'nowrap', pointerEvents: 'none',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
              }}
            >{nextTrip.name_he || nextTrip.name}</span>
          </button>
        )}

        {/* Center content */}
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 56px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          {/* Dates row */}
          <div className="td-dates-row" style={{ animation: `td-fade-up 420ms ${EASE.out} both` }}>
            <div style={{ textAlign: 'center' }}>
              <div className="td-date-label">יציאה</div>
              <div className="td-date-value">
                <span className="td-date-value-long">{fmtLong(startDate)}</span>
                <span className="td-date-value-short">{fmtShort(startDate)}</span>
              </div>
            </div>
            <div className="td-dates-divider" />
            {totalDays && (
              <div className="td-days-pill">
                <span className="td-days-num">{totalDays}</span>
                <span className="td-days-suf"> ימים</span>
              </div>
            )}
            <div className="td-dates-divider" />
            <div style={{ textAlign: 'center' }}>
              <div className="td-date-label">חזרה</div>
              <div className="td-date-value">
                <span className="td-date-value-long">{fmtLong(endDate)}</span>
                <span className="td-date-value-short">{fmtShort(endDate)}</span>
              </div>
            </div>
            {trip.tripit_url && (
              <a href={trip.tripit_url} target="_blank" rel="noreferrer" className="td-press"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '30px', height: '30px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '10px', color: 'white', textDecoration: 'none',
                  fontSize: '14px', flexShrink: 0,
                  backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
                  transition: `background 220ms ${EASE.out}, transform 160ms ${EASE.out}, box-shadow 220ms ${EASE.out}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <PlaneIcon size={14} color="white" />
              </a>
            )}
          </div>

          {/* Companions row — staggered entry */}
          {allTripComps.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{
                fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)',
                letterSpacing: '1px', textTransform: 'uppercase',
                animation: `td-fade-up 380ms ${EASE.out} both`,
              }}>עם</span>
              {allTripComps.map((c, i) => (
                <span key={c} style={{
                  fontSize: '12px', color: 'rgba(255,255,255,0.9)',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '20px', padding: '4px 13px',
                  backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                  animation: `td-comp-in 420ms ${EASE.out} both`,
                  animationDelay: `${120 + i * 40}ms`,
                }}>{c}</span>
              ))}
            </div>
          )}
        </div>

        {/* Tab bar — with sliding pill indicator */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 1 }}>
          <div
            ref={tabsBarRef}
            style={{ display: 'flex', maxWidth: '1000px', margin: '0 auto', padding: '0 32px', position: 'relative' }}
          >
            {/* Sliding pill — uses transform for buttery smooth motion */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: '6px', bottom: '6px',
                left: 0,
                width: indicator.width ? `${indicator.width}px` : '0px',
                transform: `translateX(${indicator.left}px)`,
                background: 'rgba(255,255,255,0.09)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                opacity: indicator.ready ? 1 : 0,
                transition: `transform 360ms ${EASE.inOut}, width 360ms ${EASE.inOut}, opacity 220ms ${EASE.out}`,
                pointerEvents: 'none',
                willChange: 'transform, width',
              }}
            />
            {/* Underline indicator */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: indicator.width ? `${indicator.width}px` : '0px',
                transform: `translateX(${indicator.left}px)`,
                height: '2px',
                background: 'linear-gradient(to left, rgba(255,255,255,0.95), rgba(255,255,255,0.7))',
                borderRadius: '2px 2px 0 0',
                opacity: indicator.ready ? 1 : 0,
                transition: `transform 360ms ${EASE.inOut}, width 360ms ${EASE.inOut}, opacity 220ms ${EASE.out}`,
                pointerEvents: 'none',
                willChange: 'transform, width',
              }}
            />
            {tabs.map(t => {
              const on = activeTab === t.id
              return (
                <button
                  key={t.id}
                  ref={el => { if (el) tabBtnRefs.current[t.id] = el }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    background: 'none',
                    border: 'none',
                    padding: '14px 22px',
                    fontSize: '14px', fontWeight: 600,
                    color: on ? 'white' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontFamily: FF,
                    position: 'relative',
                    zIndex: 1,
                    transition: `color 260ms ${EASE.out}, transform 160ms ${EASE.out}`,
                  }}
                  onClick={() => setActiveTab(t.id)}
                  onMouseEnter={e => { if (!on) e.currentTarget.style.color = 'rgba(255,255,255,0.85)' }}
                  onMouseLeave={e => { if (!on) e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'none' }}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span style={{
                      padding: '1px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                      transition: `background 260ms ${EASE.out}, color 260ms ${EASE.out}`,
                      ...(on
                        ? { background: 'rgba(255,255,255,0.92)', color: '#1e3a8a' }
                        : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' })
                    }}>{t.count}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Main content — crossfade with blur between tabs ── */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '28px 32px' }}>
        <div
          key={displayTab}
          style={{
            opacity: tabPhase === 'in' ? 1 : 0,
            filter: tabPhase === 'in' ? 'blur(0)' : 'blur(4px)',
            transform: tabPhase === 'in' ? 'translateY(0)' : 'translateY(-4px)',
            transition: `opacity 220ms ${EASE.out}, filter 220ms ${EASE.out}, transform 220ms ${EASE.out}`,
            willChange: 'opacity, filter, transform',
          }}
        >

        {/* OVERVIEW TAB */}
        {displayTab === 'overview' && (
          <>
            <style>{`@media(max-width:700px){.trip-overview-grid{grid-template-columns:1fr!important}.trip-right-col{display:none!important}}`}</style>
            <div className="trip-overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: '28px' }}>

              {/* Left column: route */}
              <div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px',
                  animation: `td-fade-up 320ms ${EASE.out} both`,
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: DK.textDim, textTransform: 'uppercase' }}>מסלול</span>
                  {editMode && (
                    <button
                      className="td-press"
                      style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)', border: 'none', color: 'white', padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: FF, transition: `transform 220ms ${EASE.out}, box-shadow 220ms ${EASE.out}`, boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
                      onClick={() => setModal('addSeg')}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(37,99,235,0.45)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.3)' }}
                    >
                      + יעד חדש
                    </button>
                  )}
                </div>

                {/* Timeline */}
                <div style={{ position: 'relative' }}>
                  {/* Gradient timeline line */}
                  <div style={{ position: 'absolute', right: '19px', top: '8px', bottom: '8px', width: '2px', background: 'linear-gradient(to bottom, #3b82f6, #8b5cf6, #3b82f6)', borderRadius: '1px', opacity: 0.75 }} />
                  {/* Soft blurred halo under line */}
                  <div style={{ position: 'absolute', right: '16px', top: '8px', bottom: '8px', width: '8px', background: 'linear-gradient(to bottom, rgba(59,130,246,0.15), rgba(139,92,246,0.15), rgba(59,130,246,0.15))', borderRadius: '4px', filter: 'blur(4px)', pointerEvents: 'none' }} />
                  {/* Slow traveling shimmer down the line */}
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute', right: '17px', top: '8px', bottom: '8px',
                      width: '6px', borderRadius: '3px',
                      background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
                      filter: 'blur(2px)',
                      pointerEvents: 'none',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to bottom, transparent 40%, rgba(147,197,253,0.9) 50%, transparent 60%)',
                      animation: `td-line-shimmer 6s ${EASE.inOut} infinite`,
                      willChange: 'transform, opacity',
                    }} />
                  </div>

                  {segs.map((seg, segIdx) => {
                    const segDays = daysBetween(seg.date_from, seg.date_to)
                    const comps = seg.segment_companions?.map(sc => sc.companions?.name).filter(Boolean) || []
                    const segHotels = hotelsForSeg(seg, lodging)
                    const cc = contColor(seg.continent)
                    return (
                      <div key={seg.id} style={{
                        display: 'flex', gap: '20px', marginBottom: '20px', position: 'relative',
                        animation: `td-seg-in 420ms ${EASE.out} both`,
                        animationDelay: `${segIdx * 60}ms`,
                        willChange: 'transform, opacity',
                      }}>
                        {/* Timeline dot with refined glow pulse */}
                        <div style={{ width: '40px', flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: '8px', position: 'relative', zIndex: 1 }}>
                          <div style={{
                            width: '14px', height: '14px', borderRadius: '50%',
                            background: cc,
                            border: `3px solid ${DK.bg}`,
                            '--glow-c': cc,
                            '--glow-c-soft': `${cc}55`,
                            '--glow-c-strong': `${cc}aa`,
                            animation: `td-glow-pulse 3.2s ${EASE.inOut} infinite`,
                            animationDelay: `${segIdx * 240}ms`,
                          }} />
                        </div>
                        {/* Segment card */}
                        <div
                          className="td-card-hover"
                          style={{
                            flex: 1,
                            ...glassCard(),
                            overflow: 'hidden',
                            cursor: editMode ? 'default' : 'default',
                          }}
                          onMouseDown={e => { e.currentTarget.style.transform = 'translateY(-1px) scale(0.99)' }}
                          onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                        >
                          {/* Continent accent bar */}
                          <div style={{ height: '3px', background: `linear-gradient(to left, ${cc}, ${cc}33)` }} />
                          <div style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                              <div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: DK.text, lineHeight: 1.2 }}>{heCity(seg.city)}</div>
                                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: cc, textTransform: 'uppercase', marginTop: '2px' }}>{heCountry(seg.country)}</div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                {segDays && <span style={{ background: 'rgba(255,255,255,0.06)', color: DK.textMuted, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', border: `1px solid ${DK.glassBorder}` }}>{segDays} ימים</span>}
                                {editMode && (
                                  <>
                                    <button
                                      className="td-press"
                                      style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${DK.glassBorder}`, color: DK.textMuted, padding: '4px 9px', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', transition: `background 220ms ${EASE.out}, transform 160ms ${EASE.out}` }}
                                      onClick={() => setModal({ type: 'editSeg', data: seg })}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                                    >&#9998;</button>
                                    <button
                                      className="td-press"
                                      style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${DK.glassBorder}`, color: DK.textMuted, padding: '4px 9px', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', transition: `background 220ms ${EASE.out}, transform 160ms ${EASE.out}` }}
                                      onClick={() => setModal({ type: 'note', data: seg })}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                                    ><NoteIcon size={13} color={DK.textMuted} /></button>
                                  </>
                                )}
                              </div>
                            </div>
                            {(seg.date_from || seg.date_to) && (
                              <div style={{ fontSize: '13px', color: DK.textDim, marginTop: '8px', direction: 'rtl' }}>
                                {fmtShort(seg.date_from)}{seg.date_to ? ` — ${fmtShort(seg.date_to)}` : ''}
                              </div>
                            )}
                            {/* Companion tags — staggered fade-in */}
                            {comps.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                                {comps.map((c, ci) => (
                                  <span key={c} style={{
                                    fontSize: '12px', color: '#a5b4fc',
                                    background: 'rgba(99,102,241,0.12)',
                                    border: '1px solid rgba(99,102,241,0.2)',
                                    padding: '2px 10px', borderRadius: '20px', fontWeight: 500,
                                    animation: `td-comp-in 360ms ${EASE.out} both`,
                                    animationDelay: `${segIdx * 60 + 160 + ci * 40}ms`,
                                  }}>{c}</span>
                                ))}
                              </div>
                            )}
                            {/* Hotel buttons */}
                            {segHotels.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
                                {segHotels.map(h => (
                                  <button key={h.id} onClick={() => setActiveTab('lodging')}
                                    className="td-press"
                                    style={{
                                      background: 'rgba(16,185,129,0.08)',
                                      border: '1px solid rgba(16,185,129,0.2)',
                                      color: '#6ee7b7', padding: '6px 12px', borderRadius: '8px',
                                      fontSize: '12px', cursor: 'pointer', fontFamily: FF,
                                      fontWeight: 500, textAlign: 'right', width: '100%',
                                      transition: `background 220ms ${EASE.out}, transform 260ms ${EASE.out}, box-shadow 220ms ${EASE.out}`,
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; e.currentTarget.style.transform = 'translateX(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(16,185,129,0.18)' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                                  >
                                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <BedIcon size={12} color="#6ee7b7" />
                                      {h.hotel_name}
                                    </div>
                                    {h.check_in && h.check_out && (
                                      <div style={{ fontSize: '11px', color: '#34d399', marginTop: '2px', direction: 'rtl' }}>{fmtShort(h.check_in)} — {fmtShort(h.check_out)}</div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            {/* Notes */}
                            {seg.notes && (
                              <div style={{
                                marginTop: '10px',
                                background: 'rgba(251,191,36,0.06)',
                                borderRight: '3px solid rgba(251,191,36,0.4)',
                                borderRadius: '8px', padding: '8px 12px',
                                fontSize: '13px', color: '#fcd34d', lineHeight: 1.6,
                                border: '1px solid rgba(251,191,36,0.12)',
                                borderRightWidth: '3px',
                              }}>
                                {seg.notes}
                              </div>
                            )}
                            {!seg.notes && editMode && (
                              <button className="td-press" style={{ marginTop: '8px', background: 'none', border: `1px dashed ${DK.surfaceBorder}`, color: DK.textDim, padding: '4px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: FF, transition: `border-color 220ms ${EASE.out}, color 220ms ${EASE.out}, transform 160ms ${EASE.out}` }}
                                onClick={() => setModal({ type: 'note', data: seg })}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = DK.textMuted }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = DK.surfaceBorder; e.currentTarget.style.color = DK.textDim }}
                              >
                                + הוסף הערה
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {segs.length === 0 && (
                    <div style={{ padding: '50px', textAlign: 'center', color: DK.textDim, animation: `td-fade-up 420ms ${EASE.out} both` }}>
                      <div style={{ marginBottom: '10px', opacity: 0.4 }}><PinIcon size={36} color={DK.textDim} /></div>
                      <div style={{ fontSize: '14px' }}>לא הוגדרו יעדים{editMode ? ' — לחץ + יעד חדש' : ''}</div>
                    </div>
                  )}
                </div>

                {/* Impressions card */}
                <div
                  className="td-card-hover"
                  style={{
                    ...glassCard({ padding: '18px', marginTop: '16px' }),
                    animation: `td-card-in 480ms ${EASE.out} both`,
                    animationDelay: `${segs.length * 60 + 120}ms`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: DK.textDim, textTransform: 'uppercase', letterSpacing: '1.5px' }}>רשמים</span>
                    <button
                      className="td-press"
                      style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${DK.glassBorder}`, color: '#60a5fa', padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: FF, transition: `background 220ms ${EASE.out}, transform 260ms ${EASE.out}, box-shadow 220ms ${EASE.out}` }}
                      onClick={() => setModal('impressions')}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(59,130,246,0.2)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      {editMode ? 'ערוך' : 'TripIt / עריכה'}
                    </button>
                  </div>
                  {trip.impressions
                    ? <p style={{ fontSize: '14px', color: DK.textMuted, lineHeight: 1.8, margin: 0 }}>{trip.impressions}</p>
                    : <p style={{ fontSize: '13px', color: DK.textDim, margin: 0, fontStyle: 'italic' }}>טרם נכתבו רשמים</p>
                  }
                </div>
              </div>

              {/* Right column: sidebar */}
              <div className="trip-right-col" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Lodging summary */}
                <div
                  className="td-card-hover"
                  style={{
                    ...glassCard({ padding: '18px' }),
                    animation: `td-card-in 420ms ${EASE.out} both`,
                    animationDelay: '140ms',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: DK.textDim, textTransform: 'uppercase', letterSpacing: '1.5px' }}>לינה</span>
                    {editMode && (
                      <button className="td-press" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${DK.glassBorder}`, color: '#60a5fa', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: FF, transition: `background 220ms ${EASE.out}, transform 160ms ${EASE.out}` }}
                        onClick={() => setModal('addLodging')}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      >+ הוסף</button>
                    )}
                  </div>
                  {lodging.length === 0
                    ? <p style={{ fontSize: '13px', color: DK.textDim, margin: 0, fontStyle: 'italic' }}>אין נתוני לינה</p>
                    : lodging.map((l, li) => (
                      <div key={l.id} style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0',
                        borderBottom: `1px solid ${DK.surfaceBorder}`, cursor: 'pointer',
                        transition: `background 220ms ${EASE.out}, transform 220ms ${EASE.out}`,
                        borderRadius: '6px',
                        animation: `td-fade-up 360ms ${EASE.out} both`,
                        animationDelay: `${200 + li * 40}ms`,
                      }}
                        onClick={() => setActiveTab('lodging')}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'translateX(-2px)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none' }}
                        onMouseDown={e => { e.currentTarget.style.transform = 'translateX(-2px) scale(0.99)' }}
                        onMouseUp={e => { e.currentTarget.style.transform = 'translateX(-2px)' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: DK.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.hotel_name}</div>
                          <div style={{ fontSize: '11px', color: DK.textDim, marginTop: '2px', direction: 'rtl' }}>
                            {fmtShort(l.check_in)} — {fmtShort(l.check_out)}{daysBetween(l.check_in, l.check_out) ? ` \u00b7 ${daysBetween(l.check_in, l.check_out)} לילות` : ''}
                          </div>
                        </div>
                        <span style={{ color: '#60a5fa', fontSize: '16px' }}>&larr;</span>
                      </div>
                    ))
                  }
                </div>

                {/* Flights summary */}
                <div
                  className="td-card-hover"
                  style={{
                    ...glassCard({ padding: '18px' }),
                    animation: `td-card-in 420ms ${EASE.out} both`,
                    animationDelay: '220ms',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: DK.textDim, textTransform: 'uppercase', letterSpacing: '1.5px' }}>טיסות</span>
                    {editMode && (
                      <button className="td-press" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${DK.glassBorder}`, color: '#60a5fa', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: FF, transition: `background 220ms ${EASE.out}, transform 160ms ${EASE.out}` }}
                        onClick={() => setModal('addFlight')}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      >+ הוסף</button>
                    )}
                  </div>
                  {sortedFlightsArr.length === 0
                    ? <p style={{ fontSize: '13px', color: DK.textDim, margin: 0, fontStyle: 'italic' }}>אין נתוני טיסות</p>
                    : sortedFlightsArr.map((f, fi) => (
                      <div key={f.id} style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0',
                        borderBottom: `1px solid ${DK.surfaceBorder}`, cursor: 'pointer',
                        transition: `background 220ms ${EASE.out}, transform 220ms ${EASE.out}`,
                        borderRadius: '6px',
                        animation: `td-fade-up 360ms ${EASE.out} both`,
                        animationDelay: `${280 + fi * 40}ms`,
                      }}
                        onClick={() => setActiveTab('flights')}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'translateX(-2px)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none' }}
                        onMouseDown={e => { e.currentTarget.style.transform = 'translateX(-2px) scale(0.99)' }}
                        onMouseUp={e => { e.currentTarget.style.transform = 'translateX(-2px)' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: DK.text, direction: 'rtl' }}>{heCity(f.from_city)} &rarr; {heCity(f.to_city)}</div>
                          <div style={{ fontSize: '11px', color: '#60a5fa', marginTop: '1px' }}>{f.airline_code} {f.flight_number}</div>
                          <div style={{ fontSize: '11px', color: DK.textDim, direction: 'rtl' }}>{fmtShort(f.departure_date)}{f.departure_time ? ` \u00b7 ${f.departure_time.slice(0, 5)}` : ''}</div>
                        </div>
                      </div>
                    ))
                  }
                </div>

                {/* Danger zone */}
                {editMode && (
                  <button
                    className="td-press"
                    onClick={deleteTrip}
                    style={{ background: DK.dangerBg, border: `1px solid ${DK.dangerBorder}`, color: DK.danger, padding: '10px', borderRadius: '12px', fontSize: '13px', cursor: 'pointer', fontFamily: FF, transition: `background 220ms ${EASE.out}, transform 160ms ${EASE.out}, box-shadow 220ms ${EASE.out}`, width: '100%' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(248,113,113,0.2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = DK.dangerBg; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    מחק נסיעה זו
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* FLIGHTS TAB */}
        {displayTab === 'flights' && (
          <div>
            {editMode && (
              <button
                className="td-press"
                style={{
                  background: 'linear-gradient(135deg,#2563eb,#3b82f6)', border: 'none', color: 'white',
                  padding: '10px 22px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', marginBottom: '20px', fontFamily: FF,
                  transition: `transform 220ms ${EASE.out}, box-shadow 220ms ${EASE.out}`,
                  boxShadow: '0 4px 20px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
                onClick={() => setModal('addFlight')}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' }}
              >
                + הוסף טיסה
              </button>
            )}
            {sortedFlightsArr.length === 0
              ? (
                <div style={{ textAlign: 'center', padding: '80px 0', animation: `td-fade-up 480ms ${EASE.out} both` }}>
                  <div style={{ marginBottom: '12px', opacity: 0.3 }}><PlaneIcon size={48} color={DK.textDim} /></div>
                  <div style={{ color: DK.textDim, fontSize: '15px', fontWeight: 500 }}>אין טיסות{editMode ? ' — לחץ + הוסף' : ''}</div>
                </div>
              )
              : sortedFlightsArr.map((f, fIdx) => (
                <div key={f.id}
                  className="td-flight-card td-card-hover"
                  style={{
                    ...glassCard({ padding: '26px', marginBottom: '14px' }),
                    animation: `td-card-in 460ms ${EASE.out} both`,
                    animationDelay: `${fIdx * 50}ms`,
                    willChange: 'transform, opacity, filter',
                  }}
                >
                  {editMode && (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginBottom: '12px' }}>
                      <button className="td-press" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${DK.glassBorder}`, color: DK.textMuted, padding: '5px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: FF, transition: `background 220ms ${EASE.out}, transform 160ms ${EASE.out}` }}
                        onClick={() => setModal({ type: 'editFlight', data: f })}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      >ערוך</button>
                      <button className="td-press" style={{ background: DK.dangerBg, border: `1px solid ${DK.dangerBorder}`, color: DK.danger, padding: '5px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: FF, transition: `background 220ms ${EASE.out}, transform 160ms ${EASE.out}` }}
                        onClick={() => delFlight(f.id)}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = DK.dangerBg}
                      >מחק</button>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Airline code badge */}
                      <div
                        className="td-press"
                        style={{
                          background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                          color: 'white', padding: '5px 14px', borderRadius: '8px',
                          fontSize: '14px', fontWeight: 800, letterSpacing: '0.5px',
                          boxShadow: '0 4px 14px rgba(37,99,235,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                          cursor: 'pointer',
                        }}
                      >{f.airline_code}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: DK.text }}>טיסה {f.flight_number}</div>
                        {f.aircraft && <div style={{ fontSize: '12px', color: DK.textDim }}>{f.aircraft}</div>}
                      </div>
                    </div>
                    {f.service_class && (
                      <span style={{ background: 'rgba(255,255,255,0.06)', color: DK.textMuted, padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: `1px solid ${DK.glassBorder}` }}>{f.service_class}</span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: '16px', alignItems: 'center', direction: 'ltr' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: DK.text }}>{heCity(f.from_city)}</div>
                      <div className="td-airport-code" style={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa', letterSpacing: '2px', fontFamily: 'SF Mono, Menlo, monospace', transition: `text-shadow 320ms ${EASE.out}` }}>{f.from_airport}</div>
                      {f.departure_time && <div style={{ fontSize: '20px', fontWeight: 600, color: DK.textMuted, marginTop: '2px' }}>{f.departure_time.slice(0, 5)}</div>}
                      <div style={{ fontSize: '12px', color: DK.textDim }}>{fmtShort(f.departure_date)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ height: '1px', background: `linear-gradient(to right, transparent, ${DK.glassBorder}, transparent)`, margin: '0 0 8px' }} />
                      <div style={{
                        color: '#60a5fa',
                        display: 'inline-block',
                        animation: `td-plane-float 4s ${EASE.inOut} infinite`,
                        willChange: 'transform',
                      }}><PlaneIcon size={22} color="#60a5fa" /></div>
                      {f.stops && <div style={{ fontSize: '11px', color: DK.textDim, marginTop: '4px' }}>{f.stops === 'nonstop' ? 'ישיר' : f.stops}</div>}
                      {f.distance && <div style={{ fontSize: '11px', color: DK.textDim }}>{f.distance}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: DK.text }}>{heCity(f.to_city)}</div>
                      <div className="td-airport-code" style={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa', letterSpacing: '2px', fontFamily: 'SF Mono, Menlo, monospace', transition: `text-shadow 320ms ${EASE.out}` }}>{f.to_airport}</div>
                      {f.arrival_time && <div style={{ fontSize: '20px', fontWeight: 600, color: DK.textMuted, marginTop: '2px' }}>{f.arrival_time.slice(0, 5)}</div>}
                      <div style={{ fontSize: '12px', color: DK.textDim }}>{fmtShort(f.arrival_date)}</div>
                    </div>
                  </div>
                  {f.confirmation && (
                    <div style={{ marginTop: '16px', fontSize: '12px', color: DK.textMuted, background: 'rgba(255,255,255,0.04)', padding: '5px 14px', borderRadius: '8px', display: 'inline-block', border: `1px solid ${DK.surfaceBorder}` }}>
                      אישור: {f.confirmation}
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}

        {/* LODGING TAB */}
        {displayTab === 'lodging' && (
          <div>
            {editMode && (
              <button
                className="td-press"
                style={{
                  background: 'linear-gradient(135deg,#2563eb,#3b82f6)', border: 'none', color: 'white',
                  padding: '10px 22px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', marginBottom: '20px', fontFamily: FF,
                  transition: `transform 220ms ${EASE.out}, box-shadow 220ms ${EASE.out}`,
                  boxShadow: '0 4px 20px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
                onClick={() => setModal('addLodging')}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' }}
              >
                + הוסף לינה
              </button>
            )}
            {lodging.length === 0
              ? (
                <div style={{ textAlign: 'center', padding: '80px 0', animation: `td-fade-up 480ms ${EASE.out} both` }}>
                  <div style={{ marginBottom: '12px', opacity: 0.3 }}><BedIcon size={48} color={DK.textDim} /></div>
                  <div style={{ color: DK.textDim, fontSize: '15px', fontWeight: 500 }}>אין לינות{editMode ? ' — לחץ + הוסף' : ''}</div>
                </div>
              )
              : lodging.map((l, lIdx) => (
                <div key={l.id}
                  className="td-lodge-card td-card-hover"
                  style={{
                    ...glassCard({ padding: '26px', marginBottom: '14px' }),
                    borderRight: '3px solid rgba(16,185,129,0.3)',
                    animation: `td-card-in 460ms ${EASE.out} both`,
                    animationDelay: `${lIdx * 50}ms`,
                    willChange: 'transform, opacity, filter',
                  }}
                >
                  {editMode && (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginBottom: '12px' }}>
                      <button className="td-press" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${DK.glassBorder}`, color: DK.textMuted, padding: '5px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: FF, transition: `background 220ms ${EASE.out}, transform 160ms ${EASE.out}` }}
                        onClick={() => setModal({ type: 'editLodging', data: l })}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      >ערוך</button>
                      <button className="td-press" style={{ background: DK.dangerBg, border: `1px solid ${DK.dangerBorder}`, color: DK.danger, padding: '5px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: FF, transition: `background 220ms ${EASE.out}, transform 160ms ${EASE.out}` }}
                        onClick={() => delLodging(l.id)}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = DK.dangerBg}
                      >מחק</button>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div>
                      <div className="td-hotel-name" style={{ fontSize: '20px', fontWeight: 700, color: DK.text, marginBottom: '3px' }}>{l.hotel_name}</div>
                      {l.room_type && <div style={{ fontSize: '13px', color: DK.textDim }}>{l.room_type}</div>}
                    </div>
                    {l.cost && <div style={{ fontSize: '16px', fontWeight: 700, color: '#60a5fa' }}>{l.cost}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px', direction: 'rtl' }}>
                    <span style={{ fontSize: '14px', color: DK.textMuted }}>{fmtLong(l.check_in)} — {fmtLong(l.check_out)}</span>
                    {daysBetween(l.check_in, l.check_out) && (
                      <span style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, border: '1px solid rgba(59,130,246,0.2)' }}>
                        {daysBetween(l.check_in, l.check_out)} לילות
                      </span>
                    )}
                  </div>
                  {l.address && <div style={{ fontSize: '13px', color: DK.textDim, marginBottom: '8px' }}>{l.address}</div>}
                  {l.confirmation && (
                    <span style={{ display: 'inline-block', fontSize: '12px', color: DK.textMuted, background: 'rgba(255,255,255,0.04)', padding: '4px 12px', borderRadius: '8px', border: `1px solid ${DK.surfaceBorder}` }}>
                      אישור: {l.confirmation}
                    </span>
                  )}
                </div>
              ))
            }
          </div>
        )}

        </div>
      </main>

      {/* Modals */}
      {modal === 'addSeg' && <AddSegModal tripId={id} onClose={() => setModal(null)} onSaved={load} />}
      {modal === 'addLodging' && <LodgingModal tripId={id} onClose={() => setModal(null)} onSaved={load} />}
      {modal === 'addFlight' && <FlightModal tripId={id} onClose={() => setModal(null)} onSaved={load} />}
      {modal === 'impressions' && <ImpressionsModal trip={trip} onClose={() => setModal(null)} onSaved={load} />}
      {modal?.type === 'editLodging' && <LodgingModal tripId={id} existing={modal.data} onClose={() => setModal(null)} onSaved={load} />}
      {modal?.type === 'editFlight' && <FlightModal tripId={id} existing={modal.data} onClose={() => setModal(null)} onSaved={load} />}
      {modal?.type === 'editSeg' && <SegmentModal seg={modal.data} allCompanions={allCompanions} onClose={() => setModal(null)} onSaved={load} />}
      {modal?.type === 'note' && <NoteModal seg={modal.data} onClose={() => setModal(null)} onSaved={load} />}
      {modal === 'tripit' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', zIndex: 200 }} onClick={() => setModal(null)}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', width: '540px', maxWidth: '95vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#e2e8f0' }}>ייבא מ-TripIt</h3>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }} onClick={() => setModal(null)}>✕</button>
            </div>
            <TripItImport tripId={id} onClose={() => setModal(null)} onSaved={load} />
          </div>
        </div>
      )}
    </div>
  )
}
