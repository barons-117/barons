import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import BaronsHeader from './BaronsHeader'

const FONT = "'Open Sans Hebrew','Open Sans',Arial,sans-serif"

// ── Static data (system metadata — doesn't change) ──────────────────────────
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
  { id:'net',     icon:'🌐', name:'Internet & WiFi',    desc:'רשת ביתית',              accent:'#0284c7', accentLight:'#e0f2fe' },
  { id:'apple',   icon:'', name:'Apple Ecosystem',    desc:'Apple Home · AirPlay',    accent:'#64748b', accentLight:'#f1f5f9' },
  { id:'poe',     icon:'📷', name:'PoE Cameras',        desc:'מצלמות אבטחה',            accent:'#ea580c', accentLight:'#fff7ed' },
  { id:'ha',      icon:'🏠', name:'Home Assistant',     desc:'מרכז אוטומציה',           accent:'#0891b2', accentLight:'#ecfeff' },
  { id:'tuya',    icon:'🔌', name:'Tuya',               desc:'שקעים חכמים · LED',       accent:'#dc2626', accentLight:'#fef2f2' },
  { id:'bond',    icon:'🌀', name:'Bond Bridge (RF)',   desc:'מאווררי תקרה · תריסים',  accent:'#7c3aed', accentLight:'#f5f3ff' },
  { id:'ir',      icon:'📡', name:'BroadLink (IR)',     desc:'שלט אינפרא-אדום',         accent:'#e11d48', accentLight:'#fff1f2' },
  { id:'wifi',    icon:'📶', name:'WiFi Devices',       desc:'מכשירי WiFi ישירים',      accent:'#059669', accentLight:'#ecfdf5' },
  { id:'nuki',    icon:'🔐', name:'NUKI + Matter',      desc:'מנעול חכם',               accent:'#a21caf', accentLight:'#fdf4ff' },
  { id:'bticino', icon:'💡', name:'BTicino',            desc:'תאורה · תריסים · וילונות',accent:'#b45309', accentLight:'#fffbeb', wide:true },
]

const LEGEND = [
  { label:'רשת',          color:'#0284c7' },
  { label:'Apple',        color:'#64748b' },
  { label:'Home Assistant',color:'#0891b2' },
  { label:'Bond (RF)',    color:'#7c3aed' },
  { label:'BroadLink (IR)',color:'#e11d48' },
  { label:'Tuya',         color:'#dc2626' },
  { label:'BTicino',      color:'#b45309' },
  { label:'PoE',          color:'#ea580c' },
  { label:'WiFi',         color:'#059669' },
  { label:'NUKI / Matter',color:'#a21caf' },
]

const TOPO_NODES = [
  {icon:'🌐', name:'Partner Fiber', sub:'1000 / 250 Mbps'},
  {icon:'📡', name:'Deco Mesh',     sub:'4 Nodes · WiFi 6'},
  {icon:'🏠', name:'בית חכם',       sub:'כל המכשירים'},
]

// כל room יכול להיות מורכב ממספר מלבנים (label='' על מלבנים נוספים)
const FLOOR_ROOMS_RAW = [
  { room:'Laundry Room',    label:'כביסה',          x:0.0943, y:0.0218, w:0.0922, h:0.0991 },
  { room:'Kids Bathroom',   label:'אמבטיה\nילדים',  x:0.1906, y:0.0773, w:0.1432, h:0.1056 },
  { room:'Kids Bathroom',   label:'',               x:0.2448, y:0.1828, w:0.0901, h:0.0826 },
  { room:'Guest Toilet',    label:'שירותי\nאורחים', x:0.2453, y:0.2778, w:0.0859, h:0.0548 },
  { room:"Daphna's Room",   label:'דפנה',            x:0.0255, y:0.1380, w:0.1542, h:0.1575 },
  { room:"Danielle's Room", label:'דניאל',           x:0.0214, y:0.3102, w:0.1625, h:0.1510 },
  { room:'Master Bathroom', label:'אמבטיה\nראשי',   x:0.0229, y:0.4742, w:0.1573, h:0.0684 },
  { room:'Master Bedroom',  label:'חדר שינה\nראשי', x:0.0208, y:0.5550, w:0.1661, h:0.2400 },
  { room:'Master Bedroom',  label:'',               x:0.1880, y:0.6139, w:0.0281, h:0.1799 },
  { room:'Office',          label:'משרד',            x:0.2786, y:0.5791, w:0.0797, h:0.0324 },
  { room:'Office',          label:'',               x:0.2234, y:0.6122, w:0.1344, h:0.1769 },
  { room:'Hallway',         label:'מסדרון',          x:0.1917, y:0.1864, w:0.0495, h:0.4193 },
  { room:'Hallway',         label:'',               x:0.2422, y:0.4919, w:0.1172, h:0.0837 },
  { room:'Hallway',         label:'',               x:0.2432, y:0.5756, w:0.0292, h:0.0271 },
  { room:'Entrance',        label:'כניסה',           x:0.3615, y:0.4158, w:0.0797, h:0.0814 },
  { room:'Kitchen',         label:'מטבח',            x:0.4432, y:0.4069, w:0.2552, h:0.1581 },
  { room:'Living Room',     label:'סלון',            x:0.3620, y:0.4989, w:0.0792, h:0.0666 },
  { room:'Living Room',     label:'',               x:0.3630, y:0.5662, w:0.3365, h:0.2259 },
  { room:'South Balcony',   label:'מרפסת\nדרום',    x:0.7135, y:0.4075, w:0.2547, h:0.2495 },
  { room:'South Balcony',   label:'',               x:0.7135, y:0.6588, w:0.1073, h:0.1610 },
  { room:'West Balcony',    label:'מרפסת\nמערב',    x:0.2974, y:0.8207, w:0.5234, h:0.1710 },
]
const FLOOR_ROOM_KEYS = [...new Set(FLOOR_ROOMS_RAW.map(r => r.room))]

// ── Styles ──────────────────────────────────────────────────────────────────
const STYLE_ID = 'smarthome-v4-styles'
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

  /* ── Hero ── */
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
    to   { opacity: 1; transform: translateY(0); }
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
  .sh-stat-label { font-size: 11px; color: #94a3b8; letter-spacing: 0.5px; margin-top: 2px; }

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
  .sh-topo-sub  { font-size: 11px; color: #94a3b8; }
  .sh-topo-arrow {
    padding: 0 14px; font-size: 20px; color: #cbd5e1;
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
  .sh-legend-label { font-size: 12px; font-weight: 700; color: #64748b; margin-left: 8px; }
  .sh-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #475569; }
  .sh-legend-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

  /* ── Filter pills ── */
  .sh-filters {
    display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
    margin-bottom: 20px;
    animation: sh-up 0.5s 0.2s var(--ease) both;
  }
  .sh-filter-label { font-size: 12px; font-weight: 700; color: #64748b; margin-left: 8px; }
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
  .sh-pill:hover  { border-color: #818cf8; color: #4f46e5; background: #f5f3ff; }
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
  .sh-fp-wrap {
    position: relative;
    display: inline-block;
    width: 100%;
    user-select: none;
  }
  .sh-fp-wrap img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 8px;
  }
  .sh-fp-zone {
    position: absolute;
    background: transparent;
    border: 2px solid transparent;
    cursor: pointer;
    border-radius: 2px;
    transition: background 0.18s, border-color 0.18s;
  }
  .sh-fp-zone.sh-fp-hover {
    background: rgba(99,102,241,0.22);
    border-color: rgba(99,102,241,0.7);
  }
  .sh-fp-zone.sh-fp-active {
    background: rgba(99,102,241,0.35);
    border-color: #4f46e5;
  }
  .sh-fp-zone.sh-fp-inactive {
    background: rgba(0,0,0,0.22);
  }
  .sh-fp-label {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 10px;
    font-weight: 800;
    color: #fff;
    text-shadow: 0 1px 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.7);
    text-align: center;
    white-space: pre-line;
    line-height: 1.25;
    pointer-events: none;
  }
  .sh-fp-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    min-width: 17px;
    height: 17px;
    border-radius: 9px;
    background: rgba(255,255,255,0.95);
    color: #4f46e5;
    font-size: 9px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    pointer-events: none;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
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
  .sh-card.hidden { display: none; }
  .sh-card.wide   { grid-column: span 2; }
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
    font-size: 20px; flex-shrink: 0;
    transition: transform 0.35s var(--spring);
  }
  .sh-card:hover .sh-card-icon { transform: scale(1.12) rotate(-4deg); }
  .sh-card-info  { flex: 1; min-width: 0; }
  .sh-card-name  { font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sh-card-desc  { font-size: 11px; color: #94a3b8; margin-top: 1px; }
  .sh-card-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .sh-card-count {
    font-size: 12px; font-weight: 700;
    padding: 3px 10px;
    border-radius: 100px;
    background: #f1f5f9;
    color: #64748b;
  }
  .sh-edit-btn {
    width: 30px; height: 30px;
    border-radius: 8px;
    border: 1px solid rgba(0,0,0,0.08);
    background: #f8fafc;
    color: #64748b;
    font-size: 14px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s var(--ease);
    font-family: ${FONT};
  }
  .sh-edit-btn:hover { background: #e0f2fe; border-color: #0284c7; color: #0284c7; }

  .sh-devices { padding: 8px 12px 14px; }
  .sh-device {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    transition: all 0.2s var(--ease);
  }
  .sh-device:hover { background: #f8fafc; transform: translateX(-2px); }
  .sh-device-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 0 3px rgba(0,0,0,0.04); }
  .sh-device-name { font-size: 13px; flex: 1; color: #334155; }
  .sh-device-room {
    font-size: 11px; padding: 2px 8px;
    border-radius: 6px; background: #f1f5f9; color: #64748b; white-space: nowrap;
  }

  /* ── Empty state (system has no devices in this room) ── */
  .sh-empty {
    padding: 18px 12px;
    text-align: center;
    font-size: 12px;
    color: #cbd5e1;
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
    background: #22c55e; border-radius: 50%; margin-left: 6px;
    animation: sh-blink 1.5s ease-in-out infinite;
  }
  @keyframes sh-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

  /* ── Loading ── */
  .sh-loading {
    display: flex; align-items: center; justify-content: center;
    padding: 48px 0; font-size: 13px; color: #94a3b8; gap: 10px;
  }
  .sh-spinner {
    width: 18px; height: 18px;
    border: 2px solid #e2e8f0;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: sh-spin 0.7s linear infinite;
  }
  @keyframes sh-spin { to { transform: rotate(360deg); } }

  /* ══════════════════════════════════════════════════════
     EDIT MODAL
  ══════════════════════════════════════════════════════ */
  .sh-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(6px);
    z-index: 1000;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: sh-fade-in 0.2s ease both;
  }
  @keyframes sh-fade-in { from { opacity: 0; } to { opacity: 1; } }

  .sh-modal {
    background: #fff;
    border-radius: 20px;
    width: 100%;
    max-width: 560px;
    max-height: 85vh;
    display: flex; flex-direction: column;
    box-shadow: 0 24px 80px rgba(0,0,0,0.18);
    animation: sh-modal-in 0.3s var(--ease) both;
    direction: rtl;
  }
  @keyframes sh-modal-in {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .sh-modal-head {
    padding: 20px 24px 16px;
    border-bottom: 1px solid rgba(0,0,0,0.06);
    display: flex; align-items: center; gap: 12px;
  }
  .sh-modal-icon {
    width: 42px; height: 42px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center; font-size: 20px;
  }
  .sh-modal-title { flex: 1; }
  .sh-modal-title h3 { font-size: 16px; font-weight: 700; margin: 0 0 2px; }
  .sh-modal-title p  { font-size: 12px; color: #94a3b8; margin: 0; }
  .sh-modal-close {
    width: 32px; height: 32px;
    border-radius: 8px;
    border: 1px solid rgba(0,0,0,0.08);
    background: #f8fafc;
    cursor: pointer;
    font-size: 18px; color: #64748b;
    display: flex; align-items: center; justify-content: center;
    font-family: ${FONT};
    transition: all 0.2s;
  }
  .sh-modal-close:hover { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }

  .sh-modal-body {
    flex: 1; overflow-y: auto;
    padding: 16px 24px;
  }

  /* device list in modal */
  .sh-modal-device {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    transition: background 0.15s;
  }
  .sh-modal-device:hover { background: #f8fafc; }
  .sh-modal-device-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .sh-modal-device-name { font-size: 13px; flex: 1; color: #334155; }
  .sh-modal-device-room {
    font-size: 11px; padding: 2px 8px;
    border-radius: 6px; background: #f1f5f9; color: #64748b; white-space: nowrap;
  }
  .sh-modal-del {
    width: 26px; height: 26px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    color: #cbd5e1;
    font-size: 15px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-family: ${FONT};
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .sh-modal-del:hover { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }

  /* add form */
  .sh-modal-add {
    border-top: 1px solid rgba(0,0,0,0.06);
    padding: 16px 24px;
    display: flex; flex-direction: column; gap: 10px;
  }
  .sh-modal-add-title {
    font-size: 12px; font-weight: 700; color: #64748b;
    margin-bottom: 2px;
  }
  .sh-modal-row { display: flex; gap: 8px; }
  .sh-input {
    flex: 1;
    height: 36px;
    border: 1px solid rgba(0,0,0,0.12);
    border-radius: 8px;
    padding: 0 12px;
    font-size: 13px;
    font-family: ${FONT};
    color: #1e293b;
    background: #f8fafc;
    outline: none;
    transition: border-color 0.2s;
    direction: rtl;
  }
  .sh-input:focus { border-color: #6366f1; background: #fff; }
  .sh-select {
    height: 36px;
    border: 1px solid rgba(0,0,0,0.12);
    border-radius: 8px;
    padding: 0 10px;
    font-size: 13px;
    font-family: ${FONT};
    color: #1e293b;
    background: #f8fafc;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s;
  }
  .sh-select:focus { border-color: #6366f1; }
  .sh-add-btn {
    height: 36px;
    padding: 0 18px;
    border-radius: 8px;
    border: none;
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    font-family: ${FONT};
    cursor: pointer;
    transition: all 0.2s var(--ease);
    white-space: nowrap;
  }
  .sh-add-btn:hover   { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.35); }
  .sh-add-btn:active  { transform: scale(0.97); }
  .sh-add-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .sh-hero    { flex-direction: column; align-items: flex-start; padding: 24px; }
    .sh-stats   { align-self: stretch; justify-content: space-around; }
    .sh-footer  { flex-direction: column; gap: 8px; text-align: center; }
    .sh-grid    { grid-template-columns: 1fr; }
    .sh-modal-row { flex-direction: column; }
  }
`

// ── Sub-components ───────────────────────────────────────────────────────────

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
        <div className="sh-stat"><div className="sh-stat-num">{SYSTEMS.length}</div><div className="sh-stat-label">מערכות</div></div>
        <div className="sh-stat"><div className="sh-stat-num">{FLOOR_ROOM_KEYS.length}</div><div className="sh-stat-label">חדרים</div></div>
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
          <div key={i} style={{ display:'flex', alignItems:'center' }}>
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
        <div key={room}
          className={`sh-pill${activeRoom === room ? ' active' : ''}`}
          onClick={() => onToggle(room)}
        >{ROOM_MAP[room] || room}</div>
      ))}
    </div>
  )
}

function FloorPlan({ activeRoom, onToggle, roomDevCount }) {
  const [hoveredRoom, setHoveredRoom] = useState(null)

  return (
    <div className="sh-floor">
      <div className="sh-section-title">מפת הבית — לחצו על חדר לסינון</div>
      <div className="sh-fp-wrap">
        <img src="/floorplan.png" alt="מפת הבית" draggable={false} />
        {FLOOR_ROOMS_RAW.map((r, i) => {
          const isActive   = activeRoom === r.room
          const isInactive = activeRoom && activeRoom !== r.room
          const isHovered  = hoveredRoom === r.room && !isActive
          const cnt = r.label ? (roomDevCount[r.room] || 0) : 0
          return (
            <div
              key={i}
              className={
                'sh-fp-zone' +
                (isActive  ? ' sh-fp-active'   : '') +
                (isInactive ? ' sh-fp-inactive' : '') +
                (isHovered  ? ' sh-fp-hover'    : '')
              }
              style={{
                left:   (r.x * 100) + '%',
                top:    (r.y * 100) + '%',
                width:  (r.w * 100) + '%',
                height: (r.h * 100) + '%',
              }}
              onClick={() => onToggle(r.room)}
              onMouseEnter={() => setHoveredRoom(r.room)}
              onMouseLeave={() => setHoveredRoom(null)}
              title={r.room}
            >
              {r.label && <span className="sh-fp-label">{r.label}</span>}
              {r.label && cnt > 0 && <span className="sh-fp-badge">{cnt}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ sys, devices, onClose, onSave }) {
  const [items, setItems] = useState(devices)
  const [newName, setNewName] = useState('')
  const [newRoom, setNewRoom] = useState('Living Room')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const handleAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('smart_home_devices')
      .insert({ system_id: sys.id, name: newName.trim(), room: newRoom, sort_order: items.length + 1 })
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      setItems(prev => [...prev, data])
      onSave(sys.id, [...items, data])
      setNewName('')
    }
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    const { error } = await supabase.from('smart_home_devices').delete().eq('id', id)
    setDeleting(null)
    if (!error) {
      const updated = items.filter(d => d.id !== id)
      setItems(updated)
      onSave(sys.id, updated)
    }
  }

  // close on overlay click
  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div className="sh-overlay" onClick={handleOverlay}>
      <div className="sh-modal">
        {/* Header */}
        <div className="sh-modal-head">
          <div className="sh-modal-icon" style={{ background: sys.accentLight }}>
            {sys.icon}
          </div>
          <div className="sh-modal-title">
            <h3 style={{ color: sys.accent }}>{sys.name}</h3>
            <p>{items.length} מכשירים</p>
          </div>
          <button className="sh-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Device list */}
        <div className="sh-modal-body">
          {items.length === 0 && (
            <div className="sh-empty">אין מכשירים — הוסף למטה</div>
          )}
          {items.map(d => (
            <div key={d.id} className="sh-modal-device">
              <div className="sh-modal-device-dot" style={{ background: sys.accent }} />
              <div className="sh-modal-device-name">{d.name}</div>
              <div className="sh-modal-device-room">{ROOM_MAP[d.room] || d.room}</div>
              <button
                className="sh-modal-del"
                onClick={() => handleDelete(d.id)}
                disabled={deleting === d.id}
                title="מחק"
              >
                {deleting === d.id ? '…' : '✕'}
              </button>
            </div>
          ))}
        </div>

        {/* Add form */}
        <div className="sh-modal-add">
          <div className="sh-modal-add-title">הוסף מכשיר</div>
          <div className="sh-modal-row">
            <input
              className="sh-input"
              placeholder="שם המכשיר"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <select
              className="sh-select"
              value={newRoom}
              onChange={e => setNewRoom(e.target.value)}
            >
              {Object.entries(ROOM_MAP).map(([en, he]) => (
                <option key={en} value={en}>{he}</option>
              ))}
            </select>
          </div>
          <button
            className="sh-add-btn"
            onClick={handleAdd}
            disabled={saving || !newName.trim()}
          >
            {saving ? 'שומר…' : '+ הוסף'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── System Card ──────────────────────────────────────────────────────────────

function SystemCard({ sys, devices, activeRoom, delay, onEdit }) {
  // devices for this system from DB
  const visibleDevices = activeRoom
    ? devices.filter(d => d.room === activeRoom || d.room === 'All Rooms')
    : devices

  // hide the whole card when filtering and no devices match
  const hidden = activeRoom && visibleDevices.length === 0

  return (
    <div
      className={`sh-card${sys.wide ? ' wide' : ''}${hidden ? ' hidden' : ''}`}
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
        <div className="sh-card-actions">
          <div className="sh-card-count">{devices.length}</div>
          <button className="sh-edit-btn" onClick={() => onEdit(sys)} title="ערוך">✏️</button>
        </div>
      </div>

      <div className="sh-devices">
        {visibleDevices.length === 0 && !hidden && (
          <div className="sh-empty">אין מכשירים בחדר זה</div>
        )}
        {visibleDevices.map(d => (
          <div key={d.id} className="sh-device">
            <div className="sh-device-dot" style={{ background: sys.accent }} />
            <div className="sh-device-name">{d.name}</div>
            <div className="sh-device-room">{ROOM_MAP[d.room] || d.room}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function SmartHome({ session }) {
  const styleInjected = useRef(false)
  const [activeRoom, setActiveRoom] = useState('')
  const [loading, setLoading] = useState(true)
  // devicesBySystem: { [system_id]: device[] }
  const [devicesBySystem, setDevicesBySystem] = useState({})
  const [editingSys, setEditingSys] = useState(null) // system object being edited

  // inject styles
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

  // fetch all devices once
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('smart_home_devices')
        .select('*')
        .order('sort_order', { ascending: true })
      if (!error && data) {
        const bySystem = {}
        data.forEach(d => {
          if (!bySystem[d.system_id]) bySystem[d.system_id] = []
          bySystem[d.system_id].push(d)
        })
        setDevicesBySystem(bySystem)
      }
      setLoading(false)
    }
    load()
  }, [])

  // update local state after edit modal saves
  const handleModalSave = (systemId, updatedDevices) => {
    setDevicesBySystem(prev => ({ ...prev, [systemId]: updatedDevices }))
  }

  const totalDevices = useMemo(
    () => Object.values(devicesBySystem).reduce((s, arr) => s + arr.length, 0),
    [devicesBySystem]
  )

  const roomDevCount = useMemo(() => {
    const c = {}
    Object.values(devicesBySystem).flat().forEach(d => {
      c[d.room] = (c[d.room] || 0) + 1
    })
    return c
  }, [devicesBySystem])

  const orderedRooms = useMemo(() => {
    const allRooms = [...new Set(Object.values(devicesBySystem).flat().map(d => d.room))]
    return [...FLOOR_ROOM_KEYS.filter(r => allRooms.includes(r)), ...allRooms.filter(r => !FLOOR_ROOM_KEYS.includes(r))]
  }, [devicesBySystem])

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

        {loading ? (
          <div className="sh-loading">
            <div className="sh-spinner" />
            טוען מכשירים…
          </div>
        ) : (
          <>
            <FilterBar activeRoom={activeRoom} onToggle={toggleRoom} orderedRooms={orderedRooms} />
            <FloorPlan activeRoom={activeRoom} onToggle={toggleRoom} roomDevCount={roomDevCount} />

            <div className="sh-grid">
              {SYSTEMS.map((sys, i) => (
                <SystemCard
                  key={sys.id}
                  sys={sys}
                  devices={devicesBySystem[sys.id] || []}
                  activeRoom={activeRoom}
                  delay={350 + i * 50}
                  onEdit={setEditingSys}
                />
              ))}
            </div>
          </>
        )}

        <footer className="sh-footer">
          <div><span className="sh-footer-dot" />HOME117 Smart Home · Architecture Map</div>
          <div>Partner Fiber 1000/250 · tp-link Deco Mesh · Apple Home</div>
        </footer>
      </div>

      {/* Edit Modal */}
      {editingSys && (
        <EditModal
          sys={editingSys}
          devices={devicesBySystem[editingSys.id] || []}
          onClose={() => setEditingSys(null)}
          onSave={handleModalSave}
        />
      )}
    </div>
  )
}
