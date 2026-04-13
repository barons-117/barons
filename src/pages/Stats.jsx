import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'
import { supabase } from '../lib/supabase'

const COUNTRY_HE = {'UK':'בריטניה','Germany':'גרמניה','Netherlands':'הולנד','Spain':'ספרד','France':'צרפת','Italy':'איטליה','Hungary':'הונגריה','Czech':'צ׳כיה','Austria':'אוסטריה','Belgium':'בלגיה','Switzerland':'שווייץ','Poland':'פולין','Ukraine':'אוקראינה','Moldova':'מולדובה','Romania':'רומניה','Cyprus':'קפריסין','Jordan':'ירדן','Portugal':'פורטוגל','Greece':'יוון','Thailand':'תאילנד','Australia':'אוסטרליה','New Zealand':'ניו זילנד','Hong Kong':'הונג קונג','Canada':'קנדה','New York':'ניו יורק','California':'קליפורניה','Oregon':'אורגון','Nevada':'נבדה','Florida':'פלורידה','Massachusetts':'מסצ׳וסטס','Illinois':'אילינוי','Washington':'וושינגטון','Texas':'טקסס','Washington DC':'וושינגטון DC','Colorado':'קולורדו','Georgia':'ג׳ורג׳יה','Arizona':'אריזונה'}
function heCountry(c){return COUNTRY_HE[c]||c}
function daysBetween(a,b){if(!a||!b)return 0;return Math.round((new Date(b)-new Date(a))/(1000*60*60*24))}

const FF = 'Open Sans Hebrew, Open Sans, sans-serif'

/* ── Emil Kowalski — centralized easing system ── */
const EASE = {
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
}

const WORLD = {
  'אירופה': ['France','Spain','Italy','Germany','UK','Netherlands','Belgium','Switzerland','Austria','Portugal','Poland','Czech','Hungary','Greece','Romania','Ukraine','Sweden','Norway','Denmark','Finland','Ireland','Croatia','Slovenia','Slovakia','Bulgaria','Serbia','Bosnia','Albania','North Macedonia','Montenegro','Malta','Luxembourg','Iceland','Estonia','Latvia','Lithuania','Moldova','Cyprus','Belarus','Kosovo','Andorra','Liechtenstein','Monaco','San Marino','Vatican'],
  'אסיה': ['Thailand','Japan','China','India','Vietnam','Cambodia','Indonesia','Malaysia','Singapore','South Korea','Taiwan','Hong Kong','Philippines','Myanmar','Laos','Nepal','Sri Lanka','Jordan','UAE','Turkey','Georgia','Armenia','Azerbaijan','Uzbekistan','Kazakhstan','Bahrain','Kuwait','Qatar','Oman','Saudi Arabia','Lebanon','Iraq','Iran','Israel','Maldives','Bhutan','Mongolia','Bangladesh'],
  'ארה״ב — מדינות': ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming','Washington DC'],
  'אמריקה': ['Canada','Mexico','Brazil','Argentina','Colombia','Peru','Chile','Costa Rica','Panama','Cuba','Jamaica','Bahamas','Uruguay','Ecuador','Bolivia','Paraguay','Guatemala','Honduras','El Salvador','Nicaragua','Dominican Republic','Trinidad and Tobago','Belize'],
  'אפריקה': ['Morocco','Egypt','South Africa','Kenya','Tanzania','Ethiopia','Tunisia','Ghana','Nigeria','Senegal','Madagascar','Mozambique','Zimbabwe','Botswana','Namibia','Rwanda','Uganda'],
  'אוקיינוסיה': ['Australia','New Zealand','Fiji','Hawaii'],
}

/* ── Animation CSS — Emil Kowalski design engineering ── */
const ANIM_CSS = `
  :root {
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
    --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  }

  /* Tactile feedback — everywhere */
  .st-press {
    transition: transform 160ms var(--ease-out);
  }
  .st-press:active {
    transform: scale(0.97);
  }

  @media (prefers-reduced-motion: no-preference) {
    /* Tab content crossfade */
    .st-tab-enter {
      animation: stTabEnter 260ms var(--ease-out) both;
    }
    .st-tab-exit {
      animation: stTabExit 180ms var(--ease-out) both;
    }
    @keyframes stTabEnter {
      from { opacity: 0; filter: blur(4px); transform: translateY(8px); }
      to   { opacity: 1; filter: blur(0);   transform: translateY(0); }
    }
    @keyframes stTabExit {
      from { opacity: 1; filter: blur(0);   transform: translateY(0); }
      to   { opacity: 0; filter: blur(4px); transform: translateY(-4px); }
    }

    /* Card + row entrance */
    .st-fade-up {
      animation: stFadeUp 280ms var(--ease-out) both;
    }
    @keyframes stFadeUp {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }

    .st-row-in {
      animation: stRowIn 240ms var(--ease-out) both;
    }
    @keyframes stRowIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .st-pill-in {
      animation: stPillIn 220ms var(--ease-out) both;
    }
    @keyframes stPillIn {
      from { opacity: 0; transform: scale(0.96) translateY(4px); }
      to   { opacity: 1; transform: scale(1)    translateY(0); }
    }

    .st-count-in {
      animation: stCountIn 260ms var(--ease-out) both;
    }
    @keyframes stCountIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Bar fills — width transition on the inner fill */
    .st-bar-fill {
      transition: width 900ms var(--ease-out), box-shadow 300ms var(--ease-out), filter 220ms var(--ease-out);
    }
    .st-progress-fill {
      transition: width 1100ms var(--ease-out), box-shadow 300ms var(--ease-out);
    }

    /* Traveling shimmer on filled bars */
    .st-bar-shine::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg,
        rgba(255,255,255,0) 0%,
        rgba(255,255,255,0.28) 50%,
        rgba(255,255,255,0) 100%);
      transform: translateX(-100%);
      animation: stBarShine 1.8s var(--ease-in-out) infinite;
    }
    @keyframes stBarShine {
      0%   { transform: translateX(-100%); }
      60%  { transform: translateX(100%); }
      100% { transform: translateX(100%); }
    }
    .st-progress-shine::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg,
        rgba(255,255,255,0) 0%,
        rgba(255,255,255,0.22) 50%,
        rgba(255,255,255,0) 100%);
      transform: translateX(-100%);
      animation: stBarShine 2.2s var(--ease-in-out) infinite;
    }

    /* Celebratory glow on 100% */
    .st-complete {
      animation: stComplete 2.4s var(--ease-in-out) infinite;
    }
    @keyframes stComplete {
      0%, 100% { box-shadow: 0 0 8px rgba(16,185,129,0.35); }
      50%      { box-shadow: 0 0 18px rgba(16,185,129,0.65); }
    }

    /* Year header subtle glow pulse */
    .st-year-head {
      position: relative;
      overflow: hidden;
    }
    .st-year-head::before {
      content: '';
      position: absolute;
      inset: -40%;
      background: radial-gradient(circle at 70% 50%, rgba(96,165,250,0.18), transparent 55%);
      animation: stYearPulse 6s var(--ease-in-out) infinite;
      pointer-events: none;
    }
    @keyframes stYearPulse {
      0%, 100% { opacity: 0.55; transform: scale(1); }
      50%      { opacity: 1;    transform: scale(1.04); }
    }

    /* Skeleton shimmer — faster, smoother */
    .st-shimmer {
      position: relative;
      overflow: hidden;
      background: rgba(255,255,255,0.04);
    }
    .st-shimmer::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg,
        rgba(255,255,255,0) 0%,
        rgba(255,255,255,0.08) 50%,
        rgba(255,255,255,0) 100%);
      transform: translateX(-100%);
      animation: stShimmer 1.2s var(--ease-in-out) infinite;
    }
    @keyframes stShimmer {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  }

  /* Hover — only on real hover devices */
  @media (hover: hover) and (pointer: fine) {
    .st-year-card {
      transition: transform 220ms var(--ease-out), box-shadow 220ms var(--ease-out), border-color 220ms var(--ease-out);
    }
    .st-year-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 14px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(96,165,250,0.22), inset 0 1px 0 rgba(255,255,255,0.08);
      border-color: rgba(96,165,250,0.25);
    }

    .st-rank-row {
      transition: background 180ms var(--ease-out), transform 180ms var(--ease-out), box-shadow 180ms var(--ease-out);
    }
    .st-rank-row:hover {
      background: rgba(96,165,250,0.06);
      transform: translateX(-2px);
      box-shadow: inset 0 0 0 1px rgba(96,165,250,0.14);
    }
    .st-rank-row:hover .st-bar-fill {
      filter: brightness(1.18);
    }

    .st-pill {
      transition: transform 180ms var(--ease-out), box-shadow 180ms var(--ease-out), background 180ms var(--ease-out);
    }
    .st-pill:hover {
      transform: scale(1.05);
      box-shadow: 0 0 0 1px rgba(96,165,250,0.28), 0 4px 14px rgba(0,0,0,0.28);
    }

    .st-pill-visited:hover {
      box-shadow: 0 0 0 1px rgba(16,185,129,0.38), 0 4px 14px rgba(16,185,129,0.18);
    }

    .st-trip-link {
      transition: color 180ms var(--ease-out), transform 180ms var(--ease-out);
    }
    .st-trip-link:hover {
      color: #93c5fd;
      transform: translateX(-2px);
    }

    .st-comp-row:hover {
      background: rgba(96,165,250,0.06);
    }
  }

  .st-press:active,
  .st-pill:active,
  .st-rank-row:active,
  .st-year-card:active {
    transform: scale(0.99);
  }
  .st-pill:active {
    transform: scale(0.95);
  }

  @media (prefers-reduced-motion: reduce) {
    .st-tab-enter, .st-tab-exit, .st-fade-up, .st-row-in, .st-pill-in, .st-count-in {
      animation: none !important;
    }
    .st-bar-fill, .st-progress-fill { transition: none !important; }
    .st-bar-shine::after, .st-progress-shine::after, .st-complete, .st-year-head::before, .st-shimmer::after {
      animation: none !important;
    }
    .st-year-card:hover, .st-rank-row:hover, .st-pill:hover, .st-trip-link:hover {
      transform: none !important;
    }
  }
`

/* ── Dark glass card base ── */
const GLASS_CARD = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '18px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
}

/* ── Animated counter hook ── */
function useCountUp(target, duration = 900, trigger = true) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!trigger || target === 0) { setVal(target); return }
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setVal(target); return }
    const start = performance.now()
    const raf = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 5)
      setVal(Math.round(eased * target))
      if (t < 1) requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }, [target, trigger])
  return val
}

/* ── Intersection observer hook ── */
function useInView(threshold = 0.1) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, inView]
}

/* ── Animated bar component ── */
function AnimBar({ pct, color = '#3b82f6', delay = 0 }) {
  const [ref, inView] = useInView()
  return (
    <div
      ref={ref}
      style={{
        width: '90px',
        height: '5px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '3px',
        overflow: 'hidden',
        margin: '0 8px',
        position: 'relative',
      }}
    >
      <div
        className={`st-bar-fill ${inView && pct > 4 ? 'st-bar-shine' : ''}`}
        style={{
          position: 'relative',
          height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}dd)`,
          width: inView ? `${Math.max(4, pct)}%` : '0%',
          borderRadius: '3px',
          transitionDelay: `${delay}ms`,
          boxShadow: inView ? `0 0 6px ${color}66` : 'none',
          overflow: 'hidden',
        }}
      />
    </div>
  )
}

/* ── Progress bar component ── */
function ProgressBar({ pct, color }) {
  const [ref, inView] = useInView()
  const complete = pct === 100
  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '5px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '3px',
        marginBottom: '14px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        className={`st-progress-fill ${inView && pct > 2 ? 'st-progress-shine' : ''} ${complete ? 'st-complete' : ''}`}
        style={{
          position: 'relative',
          height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          width: inView ? `${pct}%` : '0%',
          borderRadius: '3px',
          boxShadow: inView ? `0 0 8px ${color}55` : 'none',
          overflow: 'hidden',
        }}
      />
    </div>
  )
}

/* ── Animated stat number ── */
function StatNum({ value, label, color = 'white', delay = 0, resetKey = 0 }) {
  const [ref, inView] = useInView(0.2)
  // resetKey bumps trigger so count-up re-runs on tab switch
  const animated = useCountUp(value, 800, inView || resetKey > 0)
  return (
    <div
      ref={ref}
      className="st-count-in"
      key={resetKey}
      style={{ textAlign: 'center', animationDelay: `${delay}ms` }}
    >
      <div style={{ fontSize: '26px', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{animated}</div>
      <div style={{ fontSize: '11px', color: color === 'white' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)', marginTop: '3px', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  )
}

/* ── Days badge with count-up ── */
function DaysBadge({ days, delay = 0, resetKey = 0 }) {
  const [ref, inView] = useInView(0.2)
  const animated = useCountUp(days, 800, inView || resetKey > 0)
  return (
    <span
      ref={ref}
      style={{
        background: 'rgba(59,130,246,0.15)',
        color: '#60a5fa',
        padding: '4px 14px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 700,
        minWidth: '72px',
        textAlign: 'center',
        border: '1px solid rgba(59,130,246,0.2)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {animated} ימים
    </span>
  )
}

export default function Stats({ session }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('years')
  /* Emil: crossfade pattern — keep previous content visible until fade-out completes */
  const [displayTab, setDisplayTab] = useState('years')
  const [tabPhase, setTabPhase] = useState('enter') // 'enter' | 'exit'
  const [tabNonce, setTabNonce] = useState(0) // bumps to force re-mount on tab change

  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  /* Handle tab change with exit/enter crossfade */
  useEffect(() => {
    if (tab === displayTab) return
    setTabPhase('exit')
    const t = setTimeout(() => {
      setDisplayTab(tab)
      setTabPhase('enter')
      setTabNonce(n => n + 1)
    }, 180)
    return () => clearTimeout(t)
  }, [tab, displayTab])

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('trips').select(`id, name, name_he, trip_segments(date_from, date_to, city, country, continent, segment_companions(companions(name)))`)
      if (data) {
        const enriched = data.map(t => {
          const segs = t.trip_segments || []
          const dates = segs.map(s => s.date_from).filter(Boolean).sort()
          const endDates = segs.map(s => s.date_to).filter(Boolean).sort()
          return {
            ...t,
            startDate: dates[0] || null,
            endDate: endDates[endDates.length - 1] || null,
            days: daysBetween(dates[0], endDates[endDates.length - 1]),
            cities: [...new Set(segs.map(s => s.city).filter(Boolean))],
            countries: [...new Set(segs.map(s => s.country).filter(Boolean))],
            continents: [...new Set(segs.map(s => s.continent).filter(Boolean))],
            companions: [...new Set(segs.flatMap(s => s.segment_companions?.map(sc => sc.companions?.name) || []).filter(Boolean))],
            segs,
          }
        }).filter(t => t.startDate && t.endDate < today)
        setTrips(enriched)
      }
      setLoading(false)
    }
    load()
  }, [])

  /* Derived stats */
  const byYear = {}
  trips.forEach(t => {
    const y = t.startDate?.slice(0, 4)
    if (!y) return
    if (!byYear[y]) byYear[y] = { trips: [], countries: new Set(), cities: new Set(), continents: new Set() }
    byYear[y].trips.push(t)
    t.countries.forEach(c => byYear[y].countries.add(c))
    t.cities.forEach(c => byYear[y].cities.add(c))
    t.continents.forEach(c => byYear[y].continents.add(c))
  })
  const years = Object.keys(byYear).sort().reverse()

  const countryCounts = {}, countryDays = {}, cityCounts = {}, cityDays = {}
  trips.forEach(t => {
    t.countries.forEach(c => { countryCounts[c] = (countryCounts[c] || 0) + 1; countryDays[c] = (countryDays[c] || 0) + t.days })
    t.cities.forEach(c => { cityCounts[c] = (cityCounts[c] || 0) + 1; cityDays[c] = (cityDays[c] || 0) + t.days })
  })
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])
  const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])
  const maxCDays = Math.max(...Object.values(countryDays), 1)
  const maxCityDays = Math.max(...Object.values(cityDays), 1)

  const compStats = {}
  trips.forEach(t => t.companions.forEach(c => { if (!compStats[c]) compStats[c] = { trips: 0, days: 0 }; compStats[c].trips++; compStats[c].days += t.days }))
  const topComps = Object.entries(compStats).sort((a, b) => b[1].days - a[1].days)

  const visitedCountries = new Set(trips.flatMap(t => t.countries))

  /* Stagger caps (Emil: 30-80ms) */
  const rowDelay = (i, step = 30, cap = 300) => Math.min(i * step, cap)
  const pillDelay = (i, step = 20, cap = 260) => Math.min(i * step, cap)
  const compDelay = (i, step = 50, cap = 400) => Math.min(i * step, cap)

  const tabAnimClass = tabPhase === 'enter' ? 'st-tab-enter' : 'st-tab-exit'

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: FF }}>
      <style>{ANIM_CSS}</style>

      <BaronsHeader
        title="סטטיסטיקות"
        subtitle="נתוני נסיעות"
        breadcrumbs={[{ label: 'נסיעות', path: '/travels' }, { label: 'סטטיסטיקות' }]}
        tabs={[{ id: 'years', label: 'לפי שנים' }, { id: 'destinations', label: 'יעדים' }, { id: 'companions', label: 'שותפים' }, { id: 'remaining', label: 'נשאר עוד' }]}
        activeTab={tab}
        onTab={setTab}
        actions={[]}
      />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 24px' }}>

        {/* Loading skeleton */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ borderRadius: '18px', overflow: 'hidden' }}>
                <div className="st-shimmer" style={{ height: '90px', borderRadius: '18px 18px 0 0' }} />
                <div style={{ background: 'rgba(255,255,255,0.03)', height: '80px', borderRadius: '0 0 18px 18px', border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none' }} />
              </div>
            ))}
          </div>
        ) : (
          <div
            key={`tab-${displayTab}-${tabNonce}`}
            className={tabAnimClass}
            style={{ willChange: 'transform, opacity, filter' }}
          >
            {/* ── YEARS TAB ── */}
            {displayTab === 'years' && years.map((y, yi) => {
              const yd = byYear[y]
              const totalDays = yd.trips.reduce((a, t) => a + t.days, 0)
              const ycDays = {}, ycVis = {}
              yd.trips.forEach(t => {
                t.countries.forEach(c => ycDays[c] = (ycDays[c] || 0) + t.days)
                t.cities.forEach(c => ycVis[c] = (ycVis[c] || 0) + 1)
              })
              const topCDays = Object.entries(ycDays).sort((a, b) => b[1] - a[1]).slice(0, 3)
              const topCVis = Object.entries(ycVis).sort((a, b) => b[1] - a[1]).slice(0, 3)
              return (
                <div
                  key={y}
                  className="st-fade-up st-year-card st-press"
                  style={{
                    ...GLASS_CARD,
                    marginBottom: '16px',
                    overflow: 'hidden',
                    animationDelay: `${Math.min(yi * 60, 240)}ms`,
                  }}
                >
                  {/* Year header */}
                  <div
                    className="st-year-head"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '40px',
                      padding: '22px 28px',
                      background: 'linear-gradient(135deg, #1e293b 0%, #1e3a8a 60%, #2563eb 100%)',
                      flexWrap: 'wrap',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div style={{ position: 'relative', fontSize: '38px', fontWeight: 900, color: 'white', minWidth: '64px', letterSpacing: '-1px', lineHeight: 1, zIndex: 1 }}>{y}</div>
                    <div style={{ position: 'relative', display: 'flex', gap: '28px', flexWrap: 'wrap', zIndex: 1 }}>
                      {[
                        { n: yd.trips.length, l: 'טיולים' },
                        { n: yd.continents.size, l: 'יבשות' },
                        { n: yd.countries.size, l: 'מדינות' },
                        { n: yd.cities.size, l: 'ערים' },
                        { n: totalDays, l: 'ימים' },
                      ].map(({ n, l }, i) => (
                        <StatNum
                          key={l}
                          value={n}
                          label={l}
                          delay={Math.min(yi * 60 + i * 50, 500)}
                          resetKey={tabNonce}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Year body */}
                  <div style={{ display: 'flex', gap: '24px', padding: '20px 28px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px', textTransform: 'uppercase' }}>מדינות — ימים</div>
                      {topCDays.map(([c, d], i) => (
                        <div
                          key={c}
                          className="st-rank-row st-row-in st-press"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '13px',
                            color: 'rgba(255,255,255,0.75)',
                            padding: '4px 6px',
                            borderRadius: '6px',
                            animationDelay: `${160 + rowDelay(i, 40)}ms`,
                          }}
                        >
                          <span>{heCountry(c)}</span>
                          <span style={{ fontWeight: 700, color: '#60a5fa', fontVariantNumeric: 'tabular-nums' }}>{d}י</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px', textTransform: 'uppercase' }}>ערים — ביקורים</div>
                      {topCVis.map(([c, n], i) => (
                        <div
                          key={c}
                          className="st-rank-row st-row-in st-press"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '13px',
                            color: 'rgba(255,255,255,0.75)',
                            padding: '4px 6px',
                            borderRadius: '6px',
                            animationDelay: `${160 + rowDelay(i, 40)}ms`,
                          }}
                        >
                          <span>{c}</span>
                          <span style={{ fontWeight: 700, color: '#60a5fa', fontVariantNumeric: 'tabular-nums' }}>{n}×</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px', textTransform: 'uppercase' }}>טיולים</div>
                      {yd.trips.map((t, i) => (
                        <div
                          key={t.id}
                          className="st-trip-link st-row-in st-press"
                          style={{
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.5)',
                            padding: '3px 0',
                            cursor: 'pointer',
                            animationDelay: `${180 + rowDelay(i, 30)}ms`,
                          }}
                          onClick={() => navigate(`/travels/${t.id}`)}
                        >
                          {t.name_he || t.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* ── DESTINATIONS TAB ── */}
            {displayTab === 'destinations' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {[
                  { title: 'מדינות — ביקורים', data: topCountries.slice(0, 15), maxV: topCountries[0]?.[1] || 1, fmt: (c, n) => ({ label: heCountry(c), val: `${n}×` }), barMax: topCountries[0]?.[1] || 1 },
                  { title: 'מדינות — ימים', data: Object.entries(countryDays).sort((a, b) => b[1] - a[1]).slice(0, 15), maxV: maxCDays, fmt: (c, d) => ({ label: heCountry(c), val: `${d}י` }), barMax: maxCDays },
                  { title: 'ערים — ביקורים', data: topCities.slice(0, 15), maxV: topCities[0]?.[1] || 1, fmt: (c, n) => ({ label: c, val: `${n}×` }), barMax: topCities[0]?.[1] || 1 },
                  { title: 'ערים — ימים', data: Object.entries(cityDays).sort((a, b) => b[1] - a[1]).slice(0, 15), maxV: maxCityDays, fmt: (c, d) => ({ label: c, val: `${d}י` }), barMax: maxCityDays },
                ].map(({ title, data, fmt, barMax }, ci) => (
                  <div
                    key={title}
                    className="st-fade-up st-year-card st-press"
                    style={{ ...GLASS_CARD, padding: '22px', animationDelay: `${ci * 60}ms` }}
                  >
                    <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '18px', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)' }}>{title}</h3>
                    {data.map(([c, v], i) => {
                      const { label, val } = fmt(c, v)
                      return (
                        <div
                          key={c}
                          className="st-rank-row st-row-in st-press"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '7px 6px',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            borderRadius: '6px',
                            animationDelay: `${120 + rowDelay(i, 30)}ms`,
                          }}
                        >
                          <span style={{ fontSize: '11px', fontWeight: 700, color: i < 3 ? '#60a5fa' : 'rgba(255,255,255,0.2)', minWidth: '20px', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                          <span style={{ flex: 1, fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{label}</span>
                          <AnimBar pct={v / barMax * 100} delay={rowDelay(i, 30)} />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', minWidth: '36px', textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* ── COMPANIONS TAB ── */}
            {displayTab === 'companions' && (
              <div className="st-fade-up st-year-card" style={{ ...GLASS_CARD, padding: '22px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>שותפים לדרך — לפי ימים</h3>
                {topComps.length === 0 && (
                  <p style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '40px 0', fontSize: '14px' }}>אין נתוני שותפים</p>
                )}
                {topComps.map(([name, stat], i) => {
                  const maxDays = topComps[0]?.[1]?.days || 1
                  return (
                    <div
                      key={name}
                      className="st-rank-row st-comp-row st-row-in st-press"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '13px 8px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '8px',
                        animationDelay: `${compDelay(i)}ms`,
                      }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: 800, color: i < 3 ? '#60a5fa' : 'rgba(255,255,255,0.2)', minWidth: '26px', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '15px', color: 'rgba(255,255,255,0.9)' }}>{name}</span>
                      <AnimBar pct={stat.days / maxDays * 100} delay={compDelay(i)} />
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', minWidth: '64px', textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>{stat.trips} טיולים</span>
                      <DaysBadge days={stat.days} delay={compDelay(i)} resetKey={tabNonce} />
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── REMAINING TAB ── */}
            {displayTab === 'remaining' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(WORLD).map(([cont, countries], ci) => {
                  const remaining = countries.filter(c => !visitedCountries.has(c))
                  const visited = countries.filter(c => visitedCountries.has(c))
                  const pct = Math.round(visited.length / countries.length * 100)
                  const accentColor = pct === 100 ? '#10b981' : pct > 50 ? '#3b82f6' : 'rgba(255,255,255,0.12)'
                  return (
                    <div
                      key={cont}
                      className="st-fade-up st-year-card st-press"
                      style={{
                        ...GLASS_CARD,
                        padding: '22px 24px',
                        borderRight: `4px solid ${accentColor}`,
                        animationDelay: `${ci * 60}ms`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: 0 }}>{cont}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>{visited.length}/{countries.length} מדינות</span>
                          <span style={{
                            fontSize: '13px', fontWeight: 700,
                            color: pct === 100 ? '#34d399' : pct > 50 ? '#60a5fa' : 'rgba(255,255,255,0.45)',
                            background: pct === 100 ? 'rgba(16,185,129,0.15)' : pct > 50 ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)',
                            padding: '3px 10px', borderRadius: '20px',
                            border: `1px solid ${pct === 100 ? 'rgba(16,185,129,0.25)' : pct > 50 ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.08)'}`,
                            fontVariantNumeric: 'tabular-nums',
                          }}>{pct}%</span>
                        </div>
                      </div>

                      <ProgressBar pct={pct} color={pct === 100 ? '#10b981' : '#3b82f6'} />

                      {visited.length > 0 && (
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '7px', textTransform: 'uppercase' }}>ביקרת</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {visited.map((c, i) => (
                              <span
                                key={c}
                                className="st-pill st-pill-visited st-pill-in st-press"
                                style={{
                                  background: 'rgba(16,185,129,0.12)',
                                  color: '#34d399',
                                  padding: '2px 9px',
                                  borderRadius: '20px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  border: '1px solid rgba(16,185,129,0.2)',
                                  animationDelay: `${140 + pillDelay(i)}ms`,
                                  cursor: 'default',
                                }}
                              >
                                {heCountry(c)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {remaining.length === 0
                        ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
                            <p style={{ color: '#34d399', fontWeight: 700, fontSize: '13px', margin: 0 }}>ביקרת בכולן!</p>
                          </div>
                        )
                        : (
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '7px', textTransform: 'uppercase' }}>נשאר עוד</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                              {remaining.map((c, i) => (
                                <span
                                  key={c}
                                  className="st-pill st-pill-in st-press"
                                  style={{
                                    background: 'rgba(245,158,11,0.1)',
                                    color: '#fbbf24',
                                    padding: '2px 9px',
                                    borderRadius: '20px',
                                    fontSize: '11px',
                                    border: '1px solid rgba(245,158,11,0.2)',
                                    animationDelay: `${160 + pillDelay(i)}ms`,
                                    cursor: 'default',
                                  }}
                                >
                                  {heCountry(c)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      }
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
