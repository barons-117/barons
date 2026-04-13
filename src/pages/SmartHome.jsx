import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'

// ── Data ────────────────────────────────────────────────────────────────────────
const ROOMS = [
  'כניסה','מטבח','סלון','מרפסת דרום','מרפסת מערב','מסדרון','משרד',
  'חדר שינה ראשי','חדר אמבטיה ראשי','דניאל','דפנה','שירותי אורחים','חדר ילדים - אמבטיה','כביסה'
]

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
    id:'net', cls:'c-net', icon:'🌐', name:'Internet & WiFi', desc:'NETWORK BACKBONE',
    devices:[
      {name:'Partner Fiber 1000/250', room:'All Rooms'},
      {name:'BE5000 — ארון תקשורת', room:'Hallway'},
      {name:'BE5000 — סלון', room:'Living Room'},
      {name:'BE5000 — תקרה חבויה', room:'Hallway'},
      {name:'AX1800 — Deco Node', room:'South Balcony'},
    ]
  },
  {
    id:'apple', cls:'c-apple', icon:'', name:'Apple Ecosystem', desc:'APPLE HOME · AIRPLAY',
    devices:[
      {name:'HomePod + Apple TV', room:'Living Room'},
      {name:'HomePod Mini + Apple TV', room:"Master Bedroom"},
      {name:'HomePod Mini + Apple TV', room:"Danielle's Room"},
      {name:'HomePod Mini + Apple TV', room:"Daphna's Room"},
      {name:'Apple TV', room:'South Balcony'},
      {name:'HomePod Mini + iMac', room:'Office'},
    ]
  },
  {
    id:'poe', cls:'c-poe', icon:'📷', name:'PoE Cameras', desc:'POWER OVER ETHERNET',
    devices:[
      {name:'Aqara G5 Pro', room:'South Balcony'},
      {name:'Aqara G5 Pro', room:'West Balcony'},
    ]
  },
  {
    id:'ha', cls:'c-ha', icon:'🏠', name:'Home Assistant', desc:'AUTOMATION HUB',
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
    id:'tuya', cls:'c-tuya', icon:'🔌', name:'Tuya', desc:'SMART PLUG / HEAT / LED',
    devices:[
      {name:'Towel Warmer', room:'Kids Bathroom'},
      {name:'Towel Warmer', room:'Master Bathroom'},
      {name:'LED Strip (Kitchen)', room:'West Balcony'},
    ]
  },
  {
    id:'bond', cls:'c-bond', icon:'🌀', name:'Bond Bridge (RF)', desc:'CEILING FANS · SHADES',
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
    id:'ir', cls:'c-ir', icon:'📡', name:'BroadLink (IR)', desc:'INFRARED CONTROL',
    devices:[
      {name:'Heater', room:'Kids Bathroom'},
      {name:'Outdoor Heater', room:'West Balcony'},
    ]
  },
  {
    id:'wifi', cls:'c-wifi', icon:'📶', name:'WiFi Devices', desc:'DIRECT WIFI',
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
    id:'nuki', cls:'c-nuki', icon:'🔐', name:'NUKI + Matter', desc:'SMART LOCK · PROTOCOL',
    devices:[
      {name:'NUKI Pro 4', room:'Entrance'},
      {name:'Matter Hub', room:'Living Room'},
    ]
  },
  {
    id:'bticino', cls:'c-bticino', icon:'💡', name:'BTicino', desc:'LIGHTS · SHUTTERS · CURTAINS',
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
  {icon:'🌐', name:'Partner Fiber', sub:'1000/250 Mbps'},
  {icon:'📡', name:'Deco Mesh', sub:'4 Nodes · WiFi 6'},
  {icon:'🏠', name:'בית חכם', sub:'כל המכשירים'},
]

const FLOOR_ROOMS = [
  {room:"Daphna's Room",   label:"דפנה",            x:0,   y:0,   w:148, h:118},
  {room:"Danielle's Room", label:"דניאל",           x:148, y:0,   w:142, h:118},
  {room:'Kids Bathroom',   label:"אמבטיה\nילדים",   x:290, y:0,   w:92,  h:118},
  {room:'Guest Toilet',    label:"שירותי\nאורחים",  x:382, y:0,   w:63,  h:118},
  {room:'Laundry Room',    label:"כביסה",            x:445, y:0,   w:75,  h:118},
  {room:'Entrance',        label:"כניסה",            x:520, y:0,   w:240, h:118},
  {room:'Master Bathroom', label:"אמבטיה\nראשי",    x:0,   y:118, w:148, h:152},
  {room:'Hallway',         label:"מסדרון",           x:148, y:118, w:142, h:282},
  {room:'Office',          label:"משרד",             x:290, y:118, w:230, h:152},
  {room:'Kitchen',         label:"מטבח",             x:520, y:118, w:240, h:152},
  {room:'Master Bedroom',  label:"חדר שינה\nראשי",  x:0,   y:270, w:290, h:130},
  {room:'Living Room',     label:"סלון",             x:290, y:270, w:470, h:130},
  {room:'West Balcony',    label:"מרפסת מערב",       x:0,   y:400, w:470, h:120},
  {room:'South Balcony',   label:"מרפסת דרום",       x:470, y:400, w:290, h:120},
]

const ROOM_COLORS = {
  "Daphna's Room":'#4338ca', "Danielle's Room":'#6d28d9',
  'Kids Bathroom':'#0e7490', 'Guest Toilet':'#155e75',
  'Laundry Room':'#374151', 'Entrance':'#92400e',
  'Master Bathroom':'#065f71', 'Hallway':'#1e293b',
  'Office':'#064e3b', 'Kitchen':'#78350f',
  'Master Bedroom':'#1e3a5f', 'Living Room':'#14532d',
  'West Balcony':'#1a2030', 'South Balcony':'#102010',
}

const ACCENT_VARS = {
  'c-net':'#00c9ff', 'c-apple':'#a8b8d0', 'c-poe':'#f97316',
  'c-ha':'#41bdf5', 'c-tuya':'#ff6b2b', 'c-bond':'#c084fc',
  'c-ir':'#f87171', 'c-bticino':'#fbbf24', 'c-wifi':'#4ade80',
  'c-nuki':'#e879f9',
}

// ── Styles (injected once) ──────────────────────────────────────────────────────
const STYLE_ID = 'smarthome-styles'
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap');

  .sh-wrap {
    --bg: #070b14; --bg2: #0d1220; --bg3: #111827;
    --border: rgba(255,255,255,0.07); --text: #e2e8f0; --dim: #64748b;
    --net: #00c9ff;
    font-family: 'Syne', sans-serif;
    color: var(--text);
    min-height: 100vh;
    background: var(--bg);
    position: relative;
    overflow-x: hidden;
  }

  /* Grid background */
  .sh-wrap::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(0,201,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,201,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  .sh-inner { position: relative; z-index: 1; max-width: 1600px; margin: 0 auto; padding: 0 24px 60px; }

  /* Emil-style easing tokens */
  .sh-wrap { --ease-out: cubic-bezier(0.23, 1, 0.32, 1); --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); }

  /* ── Header ── */
  .sh-header {
    padding: 32px 0 24px;
    display: flex; align-items: flex-end; justify-content: space-between;
    border-bottom: 1px solid var(--border);
    margin-bottom: 28px;
    animation: sh-fade-down 0.6s var(--ease-out) both;
  }
  @keyframes sh-fade-down { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }

  .sh-logo-area { display: flex; align-items: center; gap: 16px; }
  .sh-logo-badge {
    background: linear-gradient(135deg, #00c9ff22, #00c9ff44);
    border: 1px solid var(--net);
    border-radius: 10px;
    padding: 8px 16px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--net);
    letter-spacing: 2px;
    animation: sh-badge-glow 3s ease-in-out infinite;
  }
  @keyframes sh-badge-glow {
    0%, 100% { box-shadow: 0 0 6px rgba(0,201,255,0.15); }
    50% { box-shadow: 0 0 18px rgba(0,201,255,0.35); }
  }
  .sh-title { font-size: clamp(22px, 3vw, 36px); font-weight: 800; line-height: 1; letter-spacing: -1px; }
  .sh-title span { color: var(--net); }
  .sh-subtitle { font-size: 13px; color: var(--dim); margin-top: 4px; font-family: 'Space Mono', monospace; }
  .sh-stats-row { display: flex; gap: 20px; }
  .sh-stat { text-align: center; }
  .sh-stat-num { font-family: 'Space Mono', monospace; font-size: 22px; font-weight: 700; color: var(--net); }
  .sh-stat-label { font-size: 10px; color: var(--dim); letter-spacing: 1px; text-transform: uppercase; }

  /* ── Topology ── */
  .sh-topo-section {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px 24px;
    margin-bottom: 16px;
    animation: sh-fade-up 0.5s 0.15s var(--ease-out) both;
  }
  @keyframes sh-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .sh-topo-title {
    font-size: 11px; color: var(--dim); letter-spacing: 2px;
    text-transform: uppercase; margin-bottom: 16px;
    font-family: 'Space Mono', monospace;
  }
  .sh-topo-flow { display: flex; align-items: center; flex-wrap: wrap; }
  .sh-topo-node {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 12px 18px;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 10px;
    min-width: 110px;
    text-align: center;
    transition: all 0.3s var(--ease-out);
  }
  .sh-topo-node:hover { border-color: var(--net); transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,201,255,0.1); }
  .sh-topo-node-icon { font-size: 22px; }
  .sh-topo-node-name { font-size: 11px; font-weight: 700; color: var(--net); }
  .sh-topo-node-sub { font-size: 10px; color: var(--dim); font-family: 'Space Mono', monospace; }
  .sh-topo-arrow {
    padding: 0 16px; color: rgba(0,201,255,0.6); font-size: 26px;
    display: flex; align-items: center; line-height: 1;
    animation: sh-flow-pulse 1.5s linear infinite;
  }
  @keyframes sh-flow-pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }

  /* ── Legend ── */
  .sh-legend {
    display: flex; flex-wrap: wrap; gap: 10px;
    margin-bottom: 24px; padding: 14px 18px;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 12px;
    animation: sh-fade-up 0.5s 0.25s var(--ease-out) both;
  }
  .sh-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--dim); }
  .sh-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .sh-legend-title { font-size: 11px; color: var(--dim); letter-spacing: 1px; text-transform: uppercase; margin-left: 8px; font-family: 'Space Mono', monospace; }

  /* ── Room filter pills ── */
  .sh-filter-bar {
    display: flex; flex-wrap: wrap; gap: 8px;
    margin-bottom: 28px; align-items: center;
    animation: sh-fade-up 0.5s 0.3s var(--ease-out) both;
  }
  .sh-filter-label { font-size: 11px; color: var(--dim); letter-spacing: 1px; text-transform: uppercase; margin-left: 8px; white-space: nowrap; }
  .sh-room-pill {
    padding: 5px 14px;
    border-radius: 20px;
    border: 1px solid var(--border);
    background: var(--bg2);
    color: var(--dim);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.25s var(--ease-out);
    white-space: nowrap;
    user-select: none;
  }
  .sh-room-pill:hover { border-color: var(--net); color: var(--net); }
  .sh-room-pill:active { transform: scale(0.95); }
  .sh-room-pill.active { background: var(--net); border-color: var(--net); color: #000; font-weight: 600; }

  /* ── Floor plan section ── */
  .sh-rooms-section {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px 24px;
    margin-bottom: 16px;
    animation: sh-fade-up 0.5s 0.35s var(--ease-out) both;
  }

  /* ── Live dot ── */
  .sh-live-dot {
    display: inline-block;
    width: 6px; height: 6px;
    background: var(--net);
    border-radius: 50%;
    margin-right: 6px;
    animation: sh-blink 1.2s ease-in-out infinite;
    vertical-align: middle;
  }
  @keyframes sh-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }

  /* ── System card grid ── */
  .sh-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  /* ── System card ── */
  .sh-sys-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    transition: transform 0.35s var(--ease-out), box-shadow 0.35s var(--ease-out), opacity 0.35s var(--ease-out), border-color 0.35s var(--ease-out);
    animation: sh-card-in 0.5s var(--ease-out) both;
  }
  @keyframes sh-card-in { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .sh-sys-card.hidden { opacity: 0.15; pointer-events: none; transform: scale(0.97); }
  .sh-sys-card:hover { transform: translateY(-3px); }
  .sh-sys-card.card-wide { grid-column: span 2; }
  @media (max-width: 700px) { .sh-sys-card.card-wide { grid-column: span 1; } }

  .sh-sys-header {
    padding: 14px 18px 12px;
    display: flex; align-items: center; gap: 12px;
    border-bottom: 1px solid var(--border);
    position: relative;
    overflow: hidden;
  }
  .sh-sys-header::before {
    content: '';
    position: absolute;
    inset: 0;
    opacity: 0.06;
  }
  .sh-sys-icon {
    width: 36px; height: 36px;
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
    transition: transform 0.3s var(--ease-spring);
  }
  .sh-sys-card:hover .sh-sys-icon { transform: scale(1.1) rotate(-3deg); }
  .sh-sys-title-area { position: relative; z-index: 1; flex: 1; }
  .sh-sys-name { font-size: 14px; font-weight: 700; letter-spacing: 0.3px; }
  .sh-sys-desc { font-size: 10px; color: var(--dim); margin-top: 1px; font-family: 'Space Mono', monospace; }
  .sh-sys-count {
    position: relative; z-index: 1;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(255,255,255,0.05);
    color: var(--dim);
  }

  .sh-device-list { padding: 10px 14px 14px; }
  .sh-device-item {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 8px;
    border-radius: 8px;
    cursor: default;
    transition: background 0.2s var(--ease-out), transform 0.2s var(--ease-out);
  }
  .sh-device-item:hover { background: rgba(255,255,255,0.04); transform: translateX(-2px); }
  .sh-device-item.highlighted { background: rgba(0,201,255,0.08); }
  .sh-device-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    position: relative;
  }
  .sh-device-dot::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    opacity: 0;
    animation: sh-pulse-ring 2s ease-out infinite;
  }
  @keyframes sh-pulse-ring { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(2.2); opacity: 0; } }
  .sh-device-name { font-size: 12px; flex: 1; }
  .sh-device-room {
    font-size: 10px;
    padding: 1px 7px;
    border-radius: 8px;
    background: rgba(255,255,255,0.05);
    color: var(--dim);
    font-family: 'Space Mono', monospace;
    white-space: nowrap;
  }

  /* ── Footer ── */
  .sh-footer {
    border-top: 1px solid var(--border);
    margin-top: 40px;
    padding-top: 20px;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 11px;
    color: var(--dim);
    font-family: 'Space Mono', monospace;
  }

  /* ── Responsive header ── */
  @media (max-width: 600px) {
    .sh-header { flex-direction: column; align-items: flex-start; gap: 16px; }
    .sh-stats-row { align-self: flex-start; }
    .sh-footer { flex-direction: column; gap: 8px; text-align: center; }
  }
`

// ── Components ──────────────────────────────────────────────────────────────────

function LiveDot() {
  return <span className="sh-live-dot" />
}

function Topology() {
  return (
    <div className="sh-topo-section">
      <div className="sh-topo-title"><LiveDot />Network Topology — Internet Flow</div>
      <div className="sh-topo-flow">
        {TOPO_NODES.map((n, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && <div className="sh-topo-arrow">←</div>}
            <div className="sh-topo-node">
              <div className="sh-topo-node-icon">{n.icon}</div>
              <div className="sh-topo-node-name">{n.name}</div>
              <div className="sh-topo-node-sub">{n.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Legend() {
  const items = [
    { label: 'רשת', color: '#00c9ff' },
    { label: 'Apple', color: '#a8b8d0' },
    { label: 'Home Assistant', color: '#41bdf5' },
    { label: 'Bond (RF)', color: '#c084fc' },
    { label: 'BroadLink (IR)', color: '#f87171' },
    { label: 'Tuya', color: '#ff6b2b' },
    { label: 'BTicino', color: '#fbbf24' },
    { label: 'PoE', color: '#f97316' },
    { label: 'WiFi Devices', color: '#4ade80' },
    { label: 'NUKI / Matter', color: '#e879f9' },
  ]
  return (
    <div className="sh-legend">
      <span className="sh-legend-title">מערכות:</span>
      {items.map((it, i) => (
        <div className="sh-legend-item" key={i}>
          <div className="sh-legend-dot" style={{ background: it.color }} />
          {it.label}
        </div>
      ))}
    </div>
  )
}

function FilterBar({ activeRoom, onToggle, orderedRooms }) {
  return (
    <div className="sh-filter-bar">
      <span className="sh-filter-label">סנן לפי חדר:</span>
      <div
        className={`sh-room-pill${!activeRoom ? ' active' : ''}`}
        onClick={() => onToggle('')}
      >הכל</div>
      {orderedRooms.map(room => (
        <div
          key={room}
          className={`sh-room-pill${activeRoom === room ? ' active' : ''}`}
          onClick={() => onToggle(room)}
        >{ROOM_MAP[room] || room}</div>
      ))}
    </div>
  )
}

function FloorPlan({ activeRoom, onToggle, roomDevCount }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div className="sh-rooms-section">
      <div className="sh-topo-title"><LiveDot />מפת הבית — לחץ על חדר לסינון</div>
      <div style={{ width: '100%', overflowX: 'auto', padding: '4px 0 8px' }}>
        <svg viewBox="0 0 760 520" style={{ width: '100%', maxWidth: 860, display: 'block', fontFamily: "'Syne', sans-serif" }}>
          <defs>
            <pattern id="sh-grid" patternUnits="userSpaceOnUse" width="20" height="20">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(100,180,255,0.07)" strokeWidth="0.5" />
            </pattern>
            <filter id="sh-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <rect width="760" height="520" fill="#071628" />
          <rect width="760" height="520" fill="url(#sh-grid)" />
          <rect x="1" y="1" width="758" height="518" fill="none" stroke="rgba(126,184,212,0.3)" strokeWidth="1.5" rx="2" />

          {FLOOR_ROOMS.map(r => {
            const isActive = activeRoom === r.room
            const isNone = !activeRoom
            const isHov = hovered === r.room && !isActive
            const baseColor = ROOM_COLORS[r.room] || '#1e293b'
            const fillOpacity = isNone ? 0.55 : isActive ? 0.9 : 0.2
            const strokeColor = isActive ? '#00c9ff' : isHov ? 'rgba(0,201,255,0.7)' : 'rgba(160,210,235,0.55)'
            const strokeW = isActive ? 2.5 : 1.5
            const cnt = roomDevCount[r.room] || 0
            const lines = r.label.split('\n')
            const lineH = 15
            const totalH = lines.length * lineH
            const lx = r.x + r.w / 2
            const ly = r.y + r.h / 2 - totalH / 2 + 11
            const fontSize = r.w < 80 ? 8.5 : r.w < 120 ? 10 : 11.5

            return (
              <g
                key={r.room}
                style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                onClick={() => onToggle(r.room)}
                onMouseEnter={() => setHovered(r.room)}
                onMouseLeave={() => setHovered(null)}
              >
                <rect x={r.x} y={r.y} width={r.w} height={r.h}
                  fill={baseColor} fillOpacity={isHov ? 0.75 : fillOpacity}
                  style={{ transition: 'fill-opacity 0.3s' }}
                />
                <rect x={r.x} y={r.y} width={r.w} height={r.h}
                  fill="none" stroke={strokeColor} strokeWidth={strokeW}
                  style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
                />
                <circle cx={r.x + r.w - 13} cy={r.y + 13} r="10"
                  fill="rgba(0,0,0,0.5)" stroke="rgba(0,201,255,0.3)" strokeWidth="0.8"
                />
                <text x={r.x + r.w - 13} y={r.y + 16.5} textAnchor="middle"
                  fontSize="8.5" fontWeight="700" fill="rgba(0,201,255,0.9)"
                  pointerEvents="none"
                >{cnt}</text>
                {lines.map((line, li) => (
                  <text key={li} x={lx} y={ly + li * lineH} textAnchor="middle"
                    fontSize={fontSize} fontWeight="700"
                    fill="rgba(220,235,255,0.9)" pointerEvents="none"
                    letterSpacing="0.3"
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
  const accent = ACCENT_VARS[sys.cls] || '#00c9ff'
  const hasMatch = !activeRoom || sys.devices.some(d => d.room === activeRoom)

  return (
    <div
      className={`sh-sys-card${sys.wide ? ' card-wide' : ''}${!hasMatch ? ' hidden' : ''}`}
      style={{
        '--accent': accent,
        animationDelay: `${delay}ms`,
        boxShadow: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 4px 30px color-mix(in srgb, ${accent} 12%, transparent)`
        e.currentTarget.style.borderColor = `color-mix(in srgb, ${accent} 30%, transparent)`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.borderColor = ''
      }}
    >
      <div className="sh-sys-header" style={{ '--hdr-accent': accent }}>
        <div style={{ position: 'absolute', inset: 0, background: accent, opacity: 0.06 }} />
        <div className="sh-sys-icon" style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)` }}>
          {sys.icon}
        </div>
        <div className="sh-sys-title-area">
          <div className="sh-sys-name" style={{ color: accent }}>{sys.name}</div>
          <div className="sh-sys-desc">{sys.desc}</div>
        </div>
        <div className="sh-sys-count">{sys.devices.length}</div>
      </div>
      <div className="sh-device-list">
        {sys.devices.map((d, i) => {
          const match = !activeRoom || d.room === activeRoom
          return (
            <div
              key={i}
              className={`sh-device-item${activeRoom && match ? ' highlighted' : ''}`}
              style={{ opacity: activeRoom && !match ? 0.3 : 1, transition: 'opacity 0.25s, background 0.2s' }}
            >
              <div className="sh-device-dot" style={{
                background: accent,
              }}>
                <span style={{
                  position: 'absolute', inset: -3, borderRadius: '50%',
                  border: `1px solid ${accent}`, opacity: 0,
                  animation: 'sh-pulse-ring 2s ease-out infinite',
                }} />
              </div>
              <div className="sh-device-name">{d.name}</div>
              <div className="sh-device-room">{ROOM_MAP[d.room] || d.room}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────────
export default function SmartHome({ session }) {
  const navigate = useNavigate()
  const [activeRoom, setActiveRoom] = useState('')
  const styleInjected = useRef(false)

  // Inject styles once
  useEffect(() => {
    if (styleInjected.current) return
    if (!document.getElementById(STYLE_ID)) {
      const el = document.createElement('style')
      el.id = STYLE_ID
      el.textContent = CSS
      document.head.appendChild(el)
    }
    styleInjected.current = true
    return () => {
      const el = document.getElementById(STYLE_ID)
      if (el) el.remove()
    }
  }, [])

  const totalDevices = useMemo(() => SYSTEMS.reduce((sum, s) => sum + s.devices.length, 0), [])

  const roomDevCount = useMemo(() => {
    const counts = {}
    SYSTEMS.forEach(sys => sys.devices.forEach(d => {
      counts[d.room] = (counts[d.room] || 0) + 1
    }))
    return counts
  }, [])

  const orderedRooms = useMemo(() => {
    const floorRoomKeys = FLOOR_ROOMS.map(r => r.room)
    const allDataRooms = [...new Set(SYSTEMS.flatMap(s => s.devices.map(d => d.room)))]
    return [
      ...floorRoomKeys.filter(r => allDataRooms.includes(r)),
      ...allDataRooms.filter(r => !floorRoomKeys.includes(r)),
    ]
  }, [])

  const toggleRoom = (room) => setActiveRoom(prev => prev === room ? '' : room)

  return (
    <div className="sh-wrap" dir="rtl">
      <BaronsHeader session={session} title="בית חכם" subtitle="HOME117 Smart Home Architecture" />
      <div className="sh-inner">
        {/* Header */}
        <header className="sh-header">
          <div className="sh-logo-area">
            <div className="sh-logo-badge">HOME117</div>
            <div>
              <h1 className="sh-title"><span>Smart Home</span> Architecture</h1>
              <div className="sh-subtitle">SYSTEM MAP · v2.0 · INTERACTIVE</div>
            </div>
          </div>
          <div className="sh-stats-row">
            <div className="sh-stat"><div className="sh-stat-num">{totalDevices}</div><div className="sh-stat-label">מכשירים</div></div>
            <div className="sh-stat"><div className="sh-stat-num">10</div><div className="sh-stat-label">מערכות</div></div>
            <div className="sh-stat"><div className="sh-stat-num">14</div><div className="sh-stat-label">חדרים</div></div>
            <div className="sh-stat"><div className="sh-stat-num">1G</div><div className="sh-stat-label">סיב</div></div>
          </div>
        </header>

        {/* Network Topology */}
        <Topology />

        {/* Legend */}
        <Legend />

        {/* Room filter pills */}
        <FilterBar activeRoom={activeRoom} onToggle={toggleRoom} orderedRooms={orderedRooms} />

        {/* Interactive Floor Plan */}
        <FloorPlan activeRoom={activeRoom} onToggle={toggleRoom} roomDevCount={roomDevCount} />

        {/* Systems Grid */}
        <div className="sh-grid">
          {SYSTEMS.map((sys, i) => (
            <SystemCard key={sys.id} sys={sys} activeRoom={activeRoom} delay={400 + i * 60} />
          ))}
        </div>

        {/* Footer */}
        <footer className="sh-footer">
          <div><LiveDot />HOME117 Smart Home · Architecture Map</div>
          <div>Partner Fiber 1000/250 · tp-link Deco Mesh · Apple Home</div>
        </footer>
      </div>
    </div>
  )
}
