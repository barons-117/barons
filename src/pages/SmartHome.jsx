import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'

const FONT = "'Open Sans Hebrew','Open Sans',Arial,sans-serif"

const HA_URL = 'https://ginnie-pc-erez-baron.hass.ginnie.co.il'
const TOKEN  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI1YzEzY2FhZTNhNDM0NDI5ODkyZTY5MWFjN2E0ZmJhMyIsImlhdCI6MTc3NDYzNzUwNiwiZXhwIjoyMDg5OTk3NTA2fQ.GXXo59P-oaeVVWJqshhmIv8DS6T1hLox1w5hRfIMapc'

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  bg:      '#0f0e0c',
  panel:   '#1a1814',
  border:  '#2a2620',
  on:      '#f5a623',
  off:     '#2e2b27',
  offText: '#6b6560',
  text:    '#f0ebe3',
  muted:   '#8a8278',
  dafna:   '#e8916a',
  daniel:  '#7eb8d4',
  green:   '#9bc46a',
}

// ── Room / light definitions ──────────────────────────────────────────────────
const KIDS_ROOMS = [
  { name:'חדר דפנה', icon:'🌸', sub:'תאורה ראשית + מאוורר', color:C.dafna, colorKey:'dafna',
    entities:['switch.daphna_light','light.daphna_ceiling_fan_daphna'] },
  { name:'חדר דניאל', icon:'⭐', sub:'תאורה ראשית + מאוורר', color:C.daniel, colorKey:'daniel',
    entities:['switch.danielle_light','light.danielle_ceiling_fan_light'] },
]

const KIDS_COMMON = [
  { name:'סלון', icon:'🛋️', entities:['switch.living_room_light_1','switch.living_room_light_2','switch.living_room_light_3'] },
  { name:'מטבח', icon:'🍳', entities:['switch.kitchen_main_light','switch.island_light'] },
  { name:'שולחן אוכל', icon:'🍽️', entities:['switch.dining_light'] },
  { name:'מקלחת ילדים', icon:'🚿', entities:['switch.kids_bathroom_main_light','switch.kids_bathroom_above_mirror_light'] },
]

const KIDS_BALCONY = [
  { name:'תאורה הקפית', icon:'🌿', sub:'עמודים + סראונד', color:C.green,
    entities:['switch.balcony_poles_light','switch.balcony_surround_light'] },
  { name:'תאורה ראשית', icon:'💡', sub:'קיר מרפסת', color:C.green,
    entities:['switch.balcony_wall_light'] },
]

const ALL_ROOMS = [
  { name:'מסדרון', icon:'🚪', lights:[
    { name:'תאורת קיר', entity:'switch.hallway_wall_light' },
    { name:'ספוטים', entity:'switch.hallway_spot_lights' },
  ]},
  { name:'סלון', icon:'🛋️', lights:[
    { name:'תאורה 1', entity:'switch.living_room_light_1' },
    { name:'תאורה 2', entity:'switch.living_room_light_2' },
    { name:'תאורה 3', entity:'switch.living_room_light_3' },
  ]},
  { name:'פינת אוכל', icon:'🍽️', lights:[
    { name:'תאורת שולחן', entity:'switch.dining_light' },
  ]},
  { name:'מטבח', icon:'🍳', lights:[
    { name:'תאורה ראשית', entity:'switch.kitchen_main_light' },
    { name:'איילנד', entity:'switch.island_light' },
    { name:'תאורת שירות', entity:'switch.kitchen_service_light' },
  ]},
  { name:'חדר דפנה', icon:'🌸', accent:C.dafna, lights:[
    { name:'תאורה ראשית', entity:'switch.daphna_light' },
    { name:'תאורת מאוורר', entity:'light.daphna_ceiling_fan_daphna' },
  ]},
  { name:'חדר דניאל', icon:'⭐', accent:C.daniel, lights:[
    { name:'תאורה ראשית', entity:'switch.danielle_light' },
    { name:'תאורת מאוורר', entity:'light.danielle_ceiling_fan_light' },
  ]},
  { name:'מקלחת ילדים', icon:'🚿', lights:[
    { name:'תאורה ראשית', entity:'switch.kids_bathroom_main_light' },
    { name:'מעל מראה', entity:'switch.kids_bathroom_above_mirror_light' },
    { name:'מראה', entity:'switch.kids_bathroom_mirror_switch' },
  ]},
  { name:'חדר הורים', icon:'🛏️', lights:[
    { name:'תאורת מאוורר', entity:'light.master_fan' },
    { name:'חדר אמבטיה', entity:'switch.master_bathroom_light' },
    { name:'ארון', entity:'switch.master_bedroom_closet_light' },
    { name:'אור קריאה — רוי', entity:'switch.roy_reading_light' },
    { name:'אור קריאה — ארז', entity:'switch.erez_reading_light' },
  ]},
  { name:'משרד', icon:'💻', lights:[
    { name:'תאורת מאוורר', entity:'light.office_fan' },
    { name:'תאורת שולחן', entity:'switch.office_table_light' },
  ]},
  { name:'מרפסת', icon:'🌿', accent:C.green, lights:[
    { name:'פס LED מטבח חוץ', entity:'light.led_outdoor_kitchen' },
    { name:'תאורת מאוורר', entity:'light.balcony_ceiling_fan' },
    { name:'עמודים', entity:'switch.balcony_poles_light' },
    { name:'תאורה הקפית', entity:'switch.balcony_surround_light' },
    { name:'תאורת קיר', entity:'switch.balcony_wall_light' },
    { name:'קיר ג׳קוזי', entity:'switch.jacuzzi_wall_light' },
  ]},
  { name:'כביסה', icon:'🫧', lights:[
    { name:'תאורת חדר כביסה', entity:'switch.laundry_room_light' },
  ]},
]

// ── Stylesheet ────────────────────────────────────────────────────────────────
const STYLE_ID = 'sh-styles'
const CSS = `
:root {
  --sh-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --sh-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --sh-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes sh-fade-up {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes sh-scale-in {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes sh-pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245,166,35,0); }
  50%      { box-shadow: 0 0 16px 2px rgba(245,166,35,0.15); }
}
@keyframes sh-dot-on {
  from { transform: scale(0); }
  to   { transform: scale(1); }
}
@keyframes sh-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.sh-tab {
  flex: 1;
  padding: 11px 0;
  border: 1px solid ${C.border};
  border-radius: 12px;
  background: ${C.panel};
  color: ${C.muted};
  font-family: 'Heebo', ${FONT};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s var(--sh-ease-out);
  letter-spacing: 1px;
  position: relative;
  overflow: hidden;
}
.sh-tab::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.25s var(--sh-ease-out);
}
.sh-tab.active {
  background: ${C.on};
  color: #1a1200;
  border-color: ${C.on};
  box-shadow: 0 4px 20px rgba(245,166,35,0.25);
}
.sh-tab.active::after { opacity: 1; }
.sh-tab:active { transform: scale(0.96); }

@media (hover: hover) and (pointer: fine) {
  .sh-tab:not(.active):hover {
    background: ${C.off};
    color: ${C.text};
    border-color: ${C.muted}44;
  }
}

.sh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0;
  border-radius: 11px;
  font-family: 'Heebo', ${FONT};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.18s var(--sh-ease-out);
  line-height: 1;
  position: relative;
  overflow: hidden;
}
.sh-btn:active { transform: scale(0.92); }
.sh-btn-on { background: ${C.on}; color: #1a1200; }
.sh-btn-off { background: ${C.off}; color: ${C.offText}; border: 1px solid ${C.border}; }

@media (hover: hover) and (pointer: fine) {
  .sh-btn-on:hover { filter: brightness(1.08); box-shadow: 0 2px 12px rgba(245,166,35,0.3); }
  .sh-btn-off:hover { background: ${C.border}; color: ${C.muted}; }
}

.sh-kcard {
  background: ${C.panel};
  border: 1px solid ${C.border};
  border-radius: 18px;
  padding: 16px 14px;
  display: flex;
  gap: 10px;
  transition: all 0.25s var(--sh-ease-out);
  position: relative;
  overflow: hidden;
}
.sh-kcard::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%);
  pointer-events: none;
}
.sh-kcard:active { transform: scale(0.98); }

.sh-room-card {
  margin: 0 14px 12px;
  background: ${C.panel};
  border: 1px solid ${C.border};
  border-radius: 18px;
  overflow: hidden;
  transition: all 0.3s var(--sh-ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .sh-room-card:hover {
    border-color: ${C.muted}33;
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
  }
}

.sh-light-row {
  display: flex;
  align-items: center;
  padding: 11px 16px;
  border-bottom: 1px solid ${C.border};
  gap: 10px;
  transition: background 0.2s var(--sh-ease-out);
}
.sh-light-row:last-child { border-bottom: none; }

@media (hover: hover) and (pointer: fine) {
  .sh-light-row:hover { background: rgba(255,255,255,0.02); }
}

.sh-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${C.off};
  flex-shrink: 0;
  transition: all 0.35s var(--sh-spring);
}
.sh-dot.on {
  background: ${C.on};
  box-shadow: 0 0 8px ${C.on};
  animation: sh-dot-on 0.35s var(--sh-spring);
}

.sh-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(16px);
  background: ${C.on};
  color: #1a1200;
  padding: 9px 20px;
  border-radius: 30px;
  font-size: 13px;
  font-weight: 600;
  opacity: 0;
  transition: all 0.3s var(--sh-spring);
  pointer-events: none;
  white-space: nowrap;
  z-index: 99;
  backdrop-filter: blur(8px);
}
.sh-toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
`

function ShStyles() {
  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const s = document.createElement('style')
      s.id = STYLE_ID
      s.textContent = CSS
      document.head.appendChild(s)
    }
  }, [])
  return null
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SmartHome({ session }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('kids')
  const [dots, setDots] = useState({})
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setClock(String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0'))
    }
    tick()
    const iv = setInterval(tick, 10000)
    return () => clearInterval(iv)
  }, [])

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }, [])

  const ctrl = useCallback(async (entities, action, label) => {
    // Optimistic UI
    setDots(prev => {
      const next = { ...prev }
      entities.forEach(e => { next[e] = action === 'on' })
      return next
    })
    if (label) showToast((action === 'on' ? '💡 ' : '🌑 ') + label)

    const groups = {}
    entities.forEach(e => { const dm = e.split('.')[0]; (groups[dm] = groups[dm] || []).push(e) })

    for (const [domain, ids] of Object.entries(groups)) {
      try {
        await fetch(`${HA_URL}/api/services/${domain}/turn_${action}`, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity_id: ids })
        })
      } catch { showToast('⚠️ שגיאת חיבור') }
    }
  }, [showToast])

  const BtnRow = ({ entities, label, onColor }) => (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
      <button className="sh-btn sh-btn-on" style={onColor ? { background:onColor } : undefined}
        onClick={() => ctrl(entities, 'on', label)}>הדלק</button>
      <button className="sh-btn sh-btn-off"
        onClick={() => ctrl(entities, 'off', label)}>כבה</button>
    </div>
  )

  // ── Kids view ─────────────────────────────────────────────────────────────
  const kidsView = (
    <div style={{ animation:'sh-fade-up 0.4s var(--sh-ease-out) both' }}>
      {/* Kids rooms */}
      <div style={{ fontSize:10, fontWeight:600, letterSpacing:'2.5px', color:C.muted, textTransform:'uppercase', padding:'22px 20px 10px' }}>
        חדרי הילדות
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:10, padding:'0 14px' }}>
        {KIDS_ROOMS.map((room, i) => (
          <div key={room.name} className="sh-kcard" style={{
            flexDirection:'row', alignItems:'center', gap:14,
            borderColor: `${room.color}25`,
            animation: `sh-scale-in 0.4s ${0.1 + i * 0.08}s var(--sh-ease-out) both`, opacity:0,
          }}>
            <div style={{ fontSize:20 }}>{room.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:room.color }}>{room.name}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{room.sub}</div>
            </div>
            <div style={{ width:136, flexShrink:0 }}>
              <BtnRow entities={room.entities} label={room.name} onColor={room.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Common spaces */}
      <div style={{ fontSize:10, fontWeight:600, letterSpacing:'2.5px', color:C.muted, textTransform:'uppercase', padding:'22px 20px 10px' }}>
        חללים משותפים
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, padding:'0 14px' }}>
        {KIDS_COMMON.map((room, i) => (
          <div key={room.name} className="sh-kcard" style={{
            flexDirection:'column',
            animation: `sh-scale-in 0.4s ${0.25 + i * 0.06}s var(--sh-ease-out) both`, opacity:0,
          }}>
            <div style={{ fontSize:20 }}>{room.icon}</div>
            <div style={{ fontSize:14, fontWeight:600 }}>{room.name}</div>
            <BtnRow entities={room.entities} label={room.name} />
          </div>
        ))}
      </div>

      {/* Balcony */}
      <div style={{ fontSize:10, fontWeight:600, letterSpacing:'2.5px', color:C.muted, textTransform:'uppercase', padding:'22px 20px 10px' }}>
        מרפסת
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:10, padding:'0 14px' }}>
        {KIDS_BALCONY.map((room, i) => (
          <div key={room.name} className="sh-kcard" style={{
            flexDirection:'row', alignItems:'center', gap:14,
            borderColor: `${room.color}25`,
            animation: `sh-scale-in 0.4s ${0.45 + i * 0.08}s var(--sh-ease-out) both`, opacity:0,
          }}>
            <div style={{ fontSize:20 }}>{room.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:room.color }}>{room.name}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{room.sub}</div>
            </div>
            <div style={{ width:136, flexShrink:0 }}>
              <BtnRow entities={room.entities} label={room.name} onColor={room.color} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── All rooms view ────────────────────────────────────────────────────────
  const allView = (
    <div style={{ animation:'sh-fade-up 0.4s var(--sh-ease-out) both' }}>
      <div style={{ fontSize:10, fontWeight:600, letterSpacing:'2.5px', color:C.muted, textTransform:'uppercase', padding:'22px 20px 10px' }}>
        כל האורות
      </div>
      {ALL_ROOMS.map((room, ri) => {
        const allEntities = room.lights.map(l => l.entity)
        const accent = room.accent
        return (
          <div key={room.name} className="sh-room-card" style={{
            borderColor: accent ? `${accent}40` : undefined,
            animation: `sh-scale-in 0.4s ${0.08 + ri * 0.06}s var(--sh-ease-out) both`, opacity:0,
          }}>
            {/* Room header */}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 16px', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:18 }}>{room.icon}</span>
              <span style={{ fontSize:15, fontWeight:700, flex:1, color: accent || C.text }}>{room.name}</span>
              <div style={{ display:'flex', gap:6 }}>
                <button className="sh-btn sh-btn-on" style={{ padding:'7px 12px', fontSize:12, borderRadius:9, ...(accent ? { background:accent } : {}) }}
                  onClick={() => ctrl(allEntities, 'on', room.name)}>
                  {room.lights.length > 1 ? 'הכל' : 'הדלק'}
                </button>
                <button className="sh-btn sh-btn-off" style={{ padding:'7px 12px', fontSize:12, borderRadius:9 }}
                  onClick={() => ctrl(allEntities, 'off', room.name)}>כבה</button>
              </div>
            </div>
            {/* Individual lights */}
            {room.lights.map(light => (
              <div key={light.entity} className="sh-light-row">
                <div className={`sh-dot${dots[light.entity] ? ' on' : ''}`}
                  style={accent && dots[light.entity] ? { background:accent, boxShadow:`0 0 8px ${accent}` } : undefined} />
                <div style={{ flex:1, fontSize:13, color:C.muted }}>{light.name}</div>
                <div style={{ width:120, flexShrink:0 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    <button className="sh-btn sh-btn-on" style={{ padding:'8px 0', fontSize:12, ...(accent ? { background:accent } : {}) }}
                      onClick={() => ctrl([light.entity], 'on')}>הדלק</button>
                    <button className="sh-btn sh-btn-off" style={{ padding:'8px 0', fontSize:12 }}
                      onClick={() => ctrl([light.entity], 'off')}>כבה</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )

  return (
    <div style={{ minHeight:'100dvh', background:C.bg, color:C.text, fontFamily:`'Heebo',${FONT}`, direction:'rtl', paddingBottom:60 }}>
      <ShStyles />
      <BaronsHeader session={session} title="בית חכם" onBack={() => navigate('/')} />

      {/* Top bar with clock */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 12px' }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, letterSpacing:3, color:C.on }}>
            BARONS<span style={{ color:C.text }}>.</span>
          </div>
          <div style={{ fontSize:11, color:C.muted, letterSpacing:1, marginTop:1 }}>בית חכם</div>
        </div>
        <div style={{ fontSize:26, fontWeight:300, letterSpacing:2 }}>{clock}</div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', padding:'14px 16px 0', gap:8 }}>
        <button className={`sh-tab${tab === 'kids' ? ' active' : ''}`} onClick={() => setTab('kids')}>
          👧 ילדות
        </button>
        <button className={`sh-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
          🏠 הכל
        </button>
      </div>

      {/* Views */}
      {tab === 'kids' ? kidsView : allView}

      {/* Toast */}
      <div className={`sh-toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  )
}
