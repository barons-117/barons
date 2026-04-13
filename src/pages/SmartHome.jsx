import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'

const FONT = "'Open Sans Hebrew','Open Sans',Arial,sans-serif"

// ── Data ────────────────────────────────────────────────────────────────────────
const ROOM_MAP = {
  'Entrance':'כניסה','Kitchen':'מטבח','Living Room':'סלון',
  'South Balcony':'מרפסת דרום','West Balcony':'מרפסת מערב',
  'Hallway':'מסדרון','Office':'משרד','Master Bedroom':'חדר שינה ראשי',
  'Master Bathroom':'חדר אמבטיה ראשי',"Danielle's Room":'דניאל',
  "Daphna's Room":'דפנה','Guest Toilet':'שירותי אורחים',
  'Kids Bathroom':'חדר ילדים - אמבטיה','Laundry Room':'כביסה',
  'All Rooms':'כל הבית','Building Gate':'שער הבניין'
}

const SYSTEMS = [
  {
    id:'net', icon:'🌐', name:'Internet & WiFi', desc:'רשת ביתית',
    accent:'#0284c7', accentLight:'#e0f2fe',
    devices:[
      {name:'Partner Fiber 1000/250', room:'All Rooms'},
      {name:'BE5000 — ארון תקשורת', room:'Hallway'},
      {name:'BE5000 — סלון', room:'Living Room'},
      {name:'BE5000 — תקרה חבויה', room:'Hallway'},
      {name:'AX1800 — Deco Node', room:'South Balcony'},
    ]
  },
  {
    id:'apple', icon:'', name:'Apple Ecosystem', desc:'Apple Home · AirPlay',
    accent:'#64748b', accentLight:'#f1f5f9',
    devices:[
      {name:'HomePod + Apple TV', room:'Living Room'},
      {name:'HomePod Mini + Apple TV', room:'Master Bedroom'},
      {name:'HomePod Mini + Apple TV', room:"Danielle's Room"},
      {name:'HomePod Mini + Apple TV', room:"Daphna's Room"},
      {name:'Apple TV', room:'South Balcony'},
      {name:'HomePod Mini + iMac', room:'Office'},
    ]
  },
  {
    id:'poe', icon:'📷', name:'PoE Cameras', desc:'מצלמות אבטחה',
    accent:'#ea580c', accentLight:'#fff7ed',
    devices:[
      {name:'Aqara G5 Pro', room:'South Balcony'},
      {name:'Aqara G5 Pro', room:'West Balcony'},
    ]
  },
  {
    id:'ha', icon:'🏠', name:'Home Assistant', desc:'מרכז אוטומציה',
    accent:'#0891b2', accentLight:'#ecfeff',
    devices:[
      {name:'BroadLink RM3 Mini', room:'Kids Bathroom'},
      {name:'BroadLink RM Pro', room:'West Balcony'},
      {name:'Sundance Hamilton 780 Jacuzzi', room:'South Balcony'},
      {name:'Water Boiler Switch', room:'Hallway'},
      {name:'Heater Switch', room:'Kids Bathroom'},
      {name:'Heater Switch', room:'Master Bathroom'},
      {name:'PAL — Building Gate', room:'Building Gate'},
      {name:'POE Master', room:'Living Room'},
      {name:'Living Room Cam Master', room:'Living Room'},
      {name:'Door Cam & Bell Master', room:'Entrance'},
      {name:'Hallway Shelf', room:'Hallway'},
      {name:'Master Bathroom Sub-Heat', room:'Master Bathroom'},
      {name:'Kitchen Water Heater', room:'Kitchen'},
    ]
  },
  {
    id:'tuya', icon:'🔌', name:'Tuya', desc:'שקעים חכמים · LED',
    accent:'#dc2626', accentLight:'#fef2f2',
    devices:[
      {name:'Towel Warmer', room:'Kids Bathroom'},
      {name:'Towel Warmer', room:'Master Bathroom'},
      {name:'LED Strip (Kitchen)', room:'West Balcony'},
    ]
  },
  {
    id:'bond', icon:'🌀', name:'Bond Bridge (RF)', desc:'מאווררי תקרה · תריסים',
    accent:'#7c3aed', accentLight:'#f5f3ff',
    devices:[
      {name:'Ceiling Fan', room:'Office'},
      {name:'Ceiling Fan', room:"Daphna's Room"},
      {name:'Ceiling Fan', room:"Danielle's Room"},
      {name:'Ceiling Fan', room:'Master Bedroom'},
      {name:'Ceiling Fan', room:'West Balcony'},
      {name:'Outside Shades (Ziptrak)', room:'West Balcony'},
    ]
  },
  {
    id:'ir', icon:'📡', name:'BroadLink (IR)', desc:'שלט אינפרא-אדום',
    accent:'#e11d48', accentLight:'#fff1f2',
    devices:[
      {name:'Heater', room:'Kids Bathroom'},
      {name:'Outdoor Heater', room:'West Balcony'},
    ]
  },
  {
    id:'wifi', icon:'📶', name:'WiFi Devices', desc:'מכשירי WiFi ישירים',
    accent:'#059669', accentLight:'#ecfdf5',
    devices:[
      {name:'BTicino Switches & Hub', room:'All Rooms'},
      {name:'Bond Bridge', room:'Living Room'},
      {name:'Aqara Doorbell + Cam', room:'Entrance'},
      {name:'Aqara Cam G100', room:'Entrance'},
      {name:'Aqara Cam E1', room:'Living Room'},
      {name:'WiiM Amp', room:'South Balcony'},
      {name:'WiiM Amp', room:'West Balcony'},
      {name:'WiiM Amp', room:'Living Room'},
      {name:'Aqara Wireless Switches', room:'All Rooms'},
      {name:'Qrevo Edge 5v1', room:'All Rooms'},
      {name:'Balcony South Neon & LED', room:'South Balcony'},
    ]
  },
  {
    id:'nuki', icon:'🔐', name:'NUKI + Matter', desc:'מנעול חכם',
    accent:'#a21caf', accentLight:'#fdf4ff',
    devices:[
      {name:'NUKI Pro 4', room:'Entrance'},
      {name:'Matter Hub', room:'Living Room'},
    ]
  },
  {
    id:'bticino', icon:'💡', name:'BTicino', desc:'תאורה · תריסים · וילונות',
    accent:'#b45309', accentLight:'#fffbeb',
    wide: true,
    devices:[
      {name:'Entrance Light', room:'Entrance'},
      {name:'Main Light', room:'Kitchen'},
      {name:'Island Light', room:'Kitchen'},
      {name:'Service Light', room:'Kitchen'},
      {name:'Light Strip 1', room:'Living Room'},
      {name:'Light Strip 2', room:'Living Room'},
      {name:'Light Strip 3', room:'Living Room'},
      {name:'Dining Table Light', room:'Living Room'},
      {name:'South Shutters', room:'Living Room'},
      {name:'West Shutters', room:'Living Room'},
      {name:'South Curtain', room:'Living Room'},
      {name:'West Curtain', room:'Living Room'},
      {name:'South Wall Light', room:'South Balcony'},
      {name:'West Wall Light', room:'West Balcony'},
      {name:'Surround LED Light', room:'West Balcony'},
      {name:'Poles Light', room:'West Balcony'},
      {name:'Ceiling Fan Main', room:'West Balcony'},
      {name:'Spot Lights', room:'Hallway'},
      {name:'Wall Fixtures', room:'Hallway'},
      {name:'Table Light', room:'Office'},
      {name:'Ceiling Fan Main', room:'Office'},
      {name:'Shutters', room:'Office'},
      {name:'Closet Light', room:'Master Bedroom'},
      {name:'Ceiling Fan Main', room:'Master Bedroom'},
      {name:'Erez Reading Light', room:'Master Bedroom'},
      {name:'Roy Reading Light', room:'Master Bedroom'},
      {name:'Shutters', room:'Master Bedroom'},
      {name:'Main Light', room:'Master Bathroom'},
      {name:'Ceiling Fan Main', room:"Danielle's Room"},
      {name:'Shutters', room:"Danielle's Room"},
      {name:'Ceiling Fan Main', room:"Daphna's Room"},
      {name:'Light + Ventilation Fan', room:'Guest Toilet'},
      {name:'Main Light', room:'Kids Bathroom'},
      {name:'Above Mirror Light', room:'Kids Bathroom'},
      {name:'Ventilation Fan', room:'Kids Bathroom'},
      {name:'Mirror Light', room:'Kids Bathroom'},
      {name:'Main Light', room:'Laundry Room'},
    ]
  },
]

const TOPO_NODES = [
  {icon:'🌐', name:'Partner Fiber', sub:'1000 / 250 Mbps'},
  {icon:'📡', name:'Deco Mesh', sub:'4 Nodes · WiFi 6'},
  {icon:'🏠', name:'בית חכם', sub:'כל המכשירים'},
]

const FLOOR_ROOMS = [
  {room:"Daphna's Room",   label:'דפנה',            x:0,   y:0,   w:148, h:118, color:'#7c3aed'},
  {room:"Danielle's Room", label:'דניאל',           x:148, y:0,   w:142, h:118, color:'#6366f1'},
  {room:'Kids Bathroom',   label:'אמבטיה\nילדים',   x:290, y:0,   w:92,  h:118, color:'#0891b2'},
  {room:'Guest Toilet',    label:'שירותי\nאורחים',  x:382, y:0,   w:63,  h:118, color:'#0e7490'},
  {room:'Laundry Room',    label:'כביסה',            x:445, y:0,   w:75,  h:118, color:'#64748b'},
  {room:'Entrance',        label:'כניסה',            x:520, y:0,   w:240, h:118, color:'#b45309'},
  {room:'Master Bathroom', label:'אמבטיה\nראשי',    x:0,   y:118, w:148, h:152, color:'#0891b2'},
  {room:'Hallway',         label:'מסדרון',           x:148, y:118, w:142, h:282, color:'#475569'},
  {room:'Office',          label:'משרד',             x:290, y:118, w:230, h:152, color:'#059669'},
  {room:'Kitchen',         label:'מטבח',             x:520, y:118, w:240, h:152, color:'#dc2626'},
  {room:'Master Bedroom',  label:'חדר שינה\nראשי',  x:0,   y:270, w:290, h:130, color:'#1d4ed8'},
  {room:'Living Room',     label:'סלון',             x:290, y:270, w:470, h:130, color:'#15803d'},
  {room:'West Balcony',    label:'מרפסת מערב',       x:0,   y:400, w:470, h:120, color:'#0284c7'},
  {room:'South Balcony',   label:'מרפסת דרום',       x:470, y:400, w:290, h:120, color:'#0369a1'},
]

const LEGEND = [
  { label:'רשת', color:'#0284c7' },
  { label:'Apple', color:'#64748b' },
  { label:'Home Assistant', color:'#0891b2' },
  { label:'Bond (RF)', color:'#7c3aed' },
  { label:'BroadLink (IR)', color:'#e11d48' },
  { label:'Tuya', color:'#dc2626' },
  { label:'BTicino', color:'#b45309' },
  { label:'PoE', color:'#ea580c' },
  { label:'WiFi', color:'#059669' },
  { label:'NUKI / Matter', color:'#a21caf' },
]

// ── Styles ──────────────────────────────────────────────────────────────────────
const STYLE_ID = 'smarthome-v3-styles'
const CSS = `
  .sh {
    --ease: cubic-bezier(0.23, 1, 0.32, 1);
    --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    font-family: ${FONT};
    background: linear-gradient(160deg, #f0f4ff 0%, #faf8ff 40%, #f0fffe 100%);
    min-height: 100vh;
    color: #1e293b;
  }
  .sh-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px 64px;
  }

  /* ── Hero banner ── */
  .sh-hero {
    background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 60%, #1a1a2e 100%);
    border-radius: 20px;
    padding: 32px 36px;
    margin-bottom: 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    color: #fff;
    position: relative;
    overflow: hidden;
    animation: sh-hero-in 0.7s var(--ease) both;
  }
  .sh-hero::before {
    content: '';
    position: absolute;
    top: -60%; right: -10%;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .sh-hero::after {
    content: '';
    position: absolute;
    bottom: -40%; left: 10%;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%);
    pointer-events: none;
  }
  @keyframes sh-hero-in {
    from { opacity: 0; transform: translateY(-16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .sh-hero-text { position: relative; z-index: 1; }
  .sh-hero-badge {
    display: inline-block;
    background: rgba(56,189,248,0.15);
    border: 1px solid rgba(56,189,248,0.3);
    border-radius: 8px;
    padding: 4px 14px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    color: #38bdf8;
    margin-bottom: 12px;
  }
  .sh-hero h1 {
    font-size: clamp(24px, 3.5vw, 34px);
    font-weight: 800;
    line-height: 1.2;
    margin: 0 0 6px;
  }
  .sh-hero h1 span { color: #38bdf8; }
  .sh-hero-sub { font-size: 13px; color: #94a3b8; margin: 0; }
  .sh-stats {
    position: relative; z-index: 1;
    display: flex; gap: 24px;
  }
  .sh-stat { text-align: center; }
  .sh-stat-num {
    font-size: 28px; font-weight: 800;
    background: linear-gradient(135deg, #38bdf8, #818cf8);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .sh-stat-label {
    font-size: 11px; color: #94a3b8;
    letter-spacing: 0.5px; margin-top: 2px;
  }

  /* ── Section titles ── */
  .sh-section-title {
    font-size: 13px;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 0.5px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sh-section-title::before {
    content: '';
    width: 3px; height: 16px;
    border-radius: 2px;
    background: linear-gradient(180deg, #38bdf8, #818cf8);
  }

  /* ── Topology ── */
  .sh-topo {
    background: #fff;
    border: 1px solid rgba(0,0,0,0.06);
    border-radius: 16px;
    padding: 20px 28px;
    margin-bottom: 20px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.03);
    animation: sh-up 0.5s 0.1s var(--ease) both;
  }
  @keyframes sh-up {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .sh-topo-flow {
    display: flex; align-items: center; justify-content: center;
    flex-wrap: wrap; gap: 0;
  }
  .sh-topo-node {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 14px 22px;
    background: #f8fafc;
    border: 1px solid rgba(0,0,0,0.06);
    border-radius: 12px;
    min-width: 120px;
    text-align: center;
    transition: all 0.3s var(--ease);
  }
  .sh-topo-node:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.06);
    border-color: #38bdf8;
  }
  .sh-topo-icon { font-size: 24px; }
  .sh-topo-name { font-size: 13px; font-weight: 700; color: #1e293b; }
  .sh-topo-sub { font-size: 11px; color: #94a3b8; }
  .sh-topo-arrow {
    padding: 0 14px;
    font-size: 20px;
    color: #cbd5e1;
    display: flex; align-items: center;
  }

  /* ── Legend ── */
  .sh-legend {
    display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
    margin-bottom: 20px;
    padding: 14px 20px;
    background: #fff;
    border: 1px solid rgba(0,0,0,0.06);
    border-radius: 14px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.03);
    animation: sh-up 0.5s 0.15s var(--ease) both;
  }
  .sh-legend-label {
    font-size: 12px; font-weight: 700; color: #64748b;
    margin-left: 8px;
  }
  .sh-legend-item {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: #475569;
  }
  .sh-legend-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  }

  /* ── Filter pills ── */
  .sh-filters {
    display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
    margin-bottom: 20px;
    animation: sh-up 0.5s 0.2s var(--ease) both;
  }
  .sh-filter-label {
    font-size: 12px; font-weight: 700; color: #64748b;
    margin-left: 8px;
  }
  .sh-pill {
    padding: 6px 16px;
    border-radius: 100px;
    border: 1px solid rgba(0,0,0,0.08);
    background: #fff;
    color: #64748b;
    font-size: 12px;
    font-family: ${FONT};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.25s var(--ease);
    user-select: none;
  }
  .sh-pill:hover { border-color: #818cf8; color: #4f46e5; background: #f5f3ff; }
  .sh-pill:active { transform: scale(0.96); }
  .sh-pill.active {
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    border-color: transparent;
    color: #fff;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(99,102,241,0.3);
  }

  /* ── Floor plan ── */
  .sh-floor {
    background: #fff;
    border: 1px solid rgba(0,0,0,0.06);
    border-radius: 16px;
    padding: 20px 24px;
    margin-bottom: 24px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.03);
    animation: sh-up 0.5s 0.25s var(--ease) both;
  }

  /* ── Cards grid ── */
  .sh-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }

  /* ── System card ── */
  .sh-card {
    background: #fff;
    border: 1px solid rgba(0,0,0,0.06);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(0,0,0,0.03);
    transition: all 0.35s var(--ease);
    animation: sh-card-in 0.5s var(--ease) both;
  }
  @keyframes sh-card-in {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .sh-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.08);
  }
  .sh-card.hidden {
    opacity: 0.12;
    pointer-events: none;
    transform: scale(0.97);
  }
  .sh-card.wide { grid-column: span 2; }
  @media (max-width: 720px) { .sh-card.wide { grid-column: span 1; } }

  .sh-card-header {
    padding: 16px 20px 14px;
    display: flex; align-items: center; gap: 14px;
    border-bottom: 1px solid rgba(0,0,0,0.04);
  }
  .sh-card-icon {
    width: 42px; height: 42px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
    transition: transform 0.35s var(--spring);
  }
  .sh-card:hover .sh-card-icon { transform: scale(1.12) rotate(-4deg); }
  .sh-card-info { flex: 1; min-width: 0; }
  .sh-card-name {
    font-size: 15px; font-weight: 700;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sh-card-desc { font-size: 11px; color: #94a3b8; margin-top: 1px; }
  .sh-card-count {
    font-size: 12px; font-weight: 700;
    padding: 3px 10px;
    border-radius: 100px;
    background: #f1f5f9;
    color: #64748b;
    flex-shrink: 0;
  }

  .sh-devices { padding: 8px 12px 14px; }
  .sh-device {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    transition: all 0.2s var(--ease);
  }
  .sh-device:hover { background: #f8fafc; transform: translateX(-2px); }
  .sh-device.hl { background: #eff6ff; }
  .sh-device.dim { opacity: 0.3; }
  .sh-device-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    box-shadow: 0 0 0 3px rgba(0,0,0,0.04);
  }
  .sh-device-name {
    font-size: 13px; flex: 1;
    color: #334155;
  }
  .sh-device-room {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 6px;
    background: #f1f5f9;
    color: #64748b;
    white-space: nowrap;
  }

  /* ── Footer ── */
  .sh-footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid rgba(0,0,0,0.06);
    display: flex; justify-content: space-between; align-items: center;
    font-size: 12px; color: #94a3b8;
  }
  .sh-footer-dot {
    display: inline-block; width: 6px; height: 6px;
    background: #22c55e; border-radius: 50%;
    margin-left: 6px;
    animation: sh-blink 1.5s ease-in-out infinite;
  }
  @keyframes sh-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .sh-hero { flex-direction: column; align-items: flex-start; padding: 24px; }
    .sh-stats { align-self: stretch; justify-content: space-around; }
    .sh-footer { flex-direction: column; gap: 8px; text-align: center; }
    .sh-grid { grid-template-columns: 1fr; }
  }
`

// ── Components ──────────────────────────────────────────────────────────────────

function Hero({ totalDevices }) {
  return (
    <div className="sh-hero">
      <div className="sh-hero-text">
        <div className="sh-hero-badge">HOME 117</div>
        <h1><span>Smart Home</span> Architecture</h1>
        <p className="sh-hero-sub">מפת מערכות הבית החכם — גרסה אינטראקטיבית</p>
      </div>
      <div className="sh-stats">
        <div className="sh-stat"><div className="sh-stat-num">{totalDevices}</div><div className="sh-stat-label">מכשירים</div></div>
        <div className="sh-stat"><div className="sh-stat-num">10</div><div className="sh-stat-label">מערכות</div></div>
        <div className="sh-stat"><div className="sh-stat-num">14</div><div className="sh-stat-label">חדרים</div></div>
        <div className="sh-stat"><div className="sh-stat-num">1G</div><div className="sh-stat-label">סיב</div></div>
      </div>
    </div>
  )
}

function Topology() {
  return (
    <div className="sh-topo">
      <div className="sh-section-title">Network Topology</div>
      <div className="sh-topo-flow">
        {TOPO_NODES.map((n, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && <div className="sh-topo-arrow">←</div>}
            <div className="sh-topo-node">
              <div className="sh-topo-icon">{n.icon}</div>
              <div className="sh-topo-name">{n.name}</div>
              <div className="sh-topo-sub">{n.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FilterBar({ activeRoom, onToggle, orderedRooms }) {
  return (
    <div className="sh-filters">
      <span className="sh-filter-label">סנן לפי חדר:</span>
      <div className={`sh-pill${!activeRoom ? ' active' : ''}`} onClick={() => onToggle('')}>הכל</div>
      {orderedRooms.map(room => (
        <div key={room} className={`sh-pill${activeRoom === room ? ' active' : ''}`}
          onClick={() => onToggle(room)}
        >{ROOM_MAP[room] || room}</div>
      ))}
    </div>
  )
}

function FloorPlan({ activeRoom, onToggle, roomDevCount }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div className="sh-floor">
      <div className="sh-section-title">מפת הבית — לחצו על חדר לסינון</div>
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox="0 0 760 520" style={{ width: '100%', maxWidth: 860, display: 'block', fontFamily: FONT }}>
          <defs>
            <pattern id="sh-grid2" patternUnits="userSpaceOnUse" width="20" height="20">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(99,102,241,0.06)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="760" height="520" fill="#f8fafc" rx="8" />
          <rect width="760" height="520" fill="url(#sh-grid2)" rx="8" />
          <rect x="1" y="1" width="758" height="518" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="1.5" rx="8" />

          {FLOOR_ROOMS.map(r => {
            const isActive = activeRoom === r.room
            const isNone = !activeRoom
            const isHov = hovered === r.room && !isActive
            const fillOpacity = isNone ? 0.12 : isActive ? 0.25 : 0.04
            const strokeColor = isActive ? r.color : isHov ? r.color : 'rgba(148,163,184,0.35)'
            const strokeW = isActive ? 2.5 : 1.2
            const strokeOpacity = isActive ? 1 : isHov ? 0.6 : 1
            const cnt = roomDevCount[r.room] || 0
            const lines = r.label.split('\n')
            const lineH = 15
            const totalH = lines.length * lineH
            const lx = r.x + r.w / 2
            const ly = r.y + r.h / 2 - totalH / 2 + 11
            const fontSize = r.w < 80 ? 8.5 : r.w < 120 ? 10 : 12

            return (
              <g key={r.room} style={{ cursor: 'pointer' }}
                onClick={() => onToggle(r.room)}
                onMouseEnter={() => setHovered(r.room)}
                onMouseLeave={() => setHovered(null)}
              >
                <rect x={r.x} y={r.y} width={r.w} height={r.h}
                  fill={r.color} fillOpacity={isHov ? 0.18 : fillOpacity}
                  style={{ transition: 'fill-opacity 0.3s' }}
                />
                <rect x={r.x} y={r.y} width={r.w} height={r.h}
                  fill="none" stroke={strokeColor} strokeWidth={strokeW}
                  strokeOpacity={strokeOpacity}
                  style={{ transition: 'all 0.3s' }}
                />
                {/* device count badge */}
                <circle cx={r.x + r.w - 14} cy={r.y + 14} r="10"
                  fill="#fff" stroke={r.color} strokeWidth="1" strokeOpacity="0.4"
                />
                <text x={r.x + r.w - 14} y={r.y + 17.5} textAnchor="middle"
                  fontSize="9" fontWeight="700" fill={r.color} pointerEvents="none"
                >{cnt}</text>
                {/* room label */}
                {lines.map((line, li) => (
                  <text key={li} x={lx} y={ly + li * lineH} textAnchor="middle"
                    fontSize={fontSize} fontWeight="700"
                    fill={isActive ? r.color : '#475569'}
                    fillOpacity={isNone ? 0.85 : isActive ? 1 : 0.35}
                    pointerEvents="none"
                    style={{ transition: 'fill 0.3s, fill-opacity 0.3s' }}
                  >{line}</text>
                ))}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function SystemCard({ sys, activeRoom, delay }) {
  const hasMatch = !activeRoom || sys.devices.some(d => d.room === activeRoom)

  return (
    <div
      className={`sh-card${sys.wide ? ' wide' : ''}${!hasMatch ? ' hidden' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="sh-card-header">
        <div className="sh-card-icon" style={{ background: sys.accentLight }}>
          {sys.icon}
        </div>
        <div className="sh-card-info">
          <div className="sh-card-name" style={{ color: sys.accent }}>{sys.name}</div>
          <div className="sh-card-desc">{sys.desc}</div>
        </div>
        <div className="sh-card-count">{sys.devices.length}</div>
      </div>
      <div className="sh-devices">
        {sys.devices.map((d, i) => {
          const match = !activeRoom || d.room === activeRoom
          return (
            <div key={i}
              className={`sh-device${activeRoom && match ? ' hl' : ''}${activeRoom && !match ? ' dim' : ''}`}
            >
              <div className="sh-device-dot" style={{ background: sys.accent }} />
              <div className="sh-device-name">{d.name}</div>
              <div className="sh-device-room">{ROOM_MAP[d.room] || d.room}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────────
export default function SmartHome({ session }) {
  const navigate = useNavigate()
  const styleInjected = useRef(false)
  const [activeRoom, setActiveRoom] = useState('')

  useEffect(() => {
    if (styleInjected.current) return
    if (!document.getElementById(STYLE_ID)) {
      const el = document.createElement('style')
      el.id = STYLE_ID
      el.textContent = CSS
      document.head.appendChild(el)
    }
    styleInjected.current = true
    return () => { const el = document.getElementById(STYLE_ID); if (el) el.remove() }
  }, [])

  const totalDevices = useMemo(() => SYSTEMS.reduce((s, sys) => s + sys.devices.length, 0), [])

  const roomDevCount = useMemo(() => {
    const c = {}
    SYSTEMS.forEach(sys => sys.devices.forEach(d => { c[d.room] = (c[d.room] || 0) + 1 }))
    return c
  }, [])

  const orderedRooms = useMemo(() => {
    const floorKeys = FLOOR_ROOMS.map(r => r.room)
    const allData = [...new Set(SYSTEMS.flatMap(s => s.devices.map(d => d.room)))]
    return [...floorKeys.filter(r => allData.includes(r)), ...allData.filter(r => !floorKeys.includes(r))]
  }, [])

  const toggleRoom = (room) => setActiveRoom(prev => prev === room ? '' : room)

  return (
    <div className="sh" dir="rtl">
      <BaronsHeader session={session} title="בית חכם" subtitle="HOME117 Smart Home" />
      <div className="sh-inner">
        <Hero totalDevices={totalDevices} />
        <Topology />

        {/* Legend */}
        <div className="sh-legend">
          <span className="sh-legend-label">מערכות:</span>
          {LEGEND.map((it, i) => (
            <div className="sh-legend-item" key={i}>
              <div className="sh-legend-dot" style={{ background: it.color }} />
              {it.label}
            </div>
          ))}
        </div>

        <FilterBar activeRoom={activeRoom} onToggle={toggleRoom} orderedRooms={orderedRooms} />
        <FloorPlan activeRoom={activeRoom} onToggle={toggleRoom} roomDevCount={roomDevCount} />

        {/* Systems grid */}
        <div className="sh-grid">
          {SYSTEMS.map((sys, i) => (
            <SystemCard key={sys.id} sys={sys} activeRoom={activeRoom} delay={350 + i * 50} />
          ))}
        </div>

        <footer className="sh-footer">
          <div><span className="sh-footer-dot" />HOME117 Smart Home · Architecture Map</div>
          <div>Partner Fiber 1000/250 · tp-link Deco Mesh · Apple Home</div>
        </footer>
      </div>
    </div>
  )
}
