import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TripItImportWithTrip } from './TripItImport'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'
import { supabase } from '../lib/supabase'

const COUNTRY_HE = {'UK':'בריטניה','Germany':'גרמניה','Netherlands':'הולנד','Spain':'ספרד','France':'צרפת','Italy':'איטליה','Hungary':'הונגריה','Czech':'צ׳כיה','Austria':'אוסטריה','Belgium':'בלגיה','Switzerland':'שווייץ','Poland':'פולין','Ukraine':'אוקראינה','Moldova':'מולדובה','Romania':'רומניה','Cyprus':'קפריסין','Jordan':'ירדן','Portugal':'פורטוגל','Greece':'יוון','Thailand':'תאילנד','Australia':'אוסטרליה','New Zealand':'ניו זילנד','Canada':'קנדה','New York':'ניו יורק','California':'קליפורניה','Oregon':'אורגון','Nevada':'נבדה','Florida':'פלורידה','Massachusetts':'מסצ׳וסטס','Illinois':'אילינוי','Washington':'וושינגטון','Texas':'טקסס','Washington DC':'וושינגטון DC'}
const CITY_HE = {'Bangkok':'בנגקוק','London':'לונדון','Paris':'פריז','Berlin':'ברלין','New York City':'ניו יורק','New York':'ניו יורק','Portland':'פורטלנד','San Francisco':'סן פרנסיסקו','Los Angeles':'לוס אנג׳לס','Las Vegas':'לאס וגאס','Amsterdam':'אמסטרדם','Budapest':'בודפשט','Vienna':'וינה','Brussels':'בריסל','Barcelona':'ברצלונה','Madrid':'מדריד','Rome':'רומא','Phuket':'פוקט','Prague':'פראג','Warsaw':'ורשה','Lisbon':'ליסבון','Athens':'אתונה','Bucharest':'בוקרשט','Tel Aviv-Yafo':'תל אביב','Miami':'מיאמי','Chicago':'שיקגו','Boston':'בוסטון','Seattle':'סיאטל','Munich':'מינכן','Zurich':'ציריך','Copenhagen':'קופנהגן','Stockholm':'סטוקהולם','Oslo':'אוסלו','Dublin':'דבלין','Singapore':'סינגפור','Tokyo':'טוקיו','Hong Kong':'הונג קונג','Seoul':'סיאול','Sydney':'סידני','Auckland':'אוקלנד','Kyiv':'קייב','Vancouver':'ונקובר','Toronto':'טורונטו','Montreal':'מונטריאול','Atlanta':'אטלנטה','Dallas':'דאלאס','Denver':'דנוור','Newark':'ניוארק','Salt Lake City':'סולט לייק סיטי'}

const HE_TO_EN = {}
Object.entries(COUNTRY_HE).forEach(([en,he])=>{HE_TO_EN[he]=en})
Object.entries(CITY_HE).forEach(([en,he])=>{HE_TO_EN[he]=en})

function heCountry(c){return COUNTRY_HE[c]||c}
function fmtDate(d,opts){if(!d)return'';return new Date(d).toLocaleDateString('he-IL',opts||{day:'numeric',month:'short',year:'numeric'})}
function fmtShort(d){return fmtDate(d,{day:'numeric',month:'short'})}
function daysBetween(a,b){if(!a||!b)return null;return Math.round((new Date(b)-new Date(a))/(1000*60*60*24))}

const CONT_COLORS = {
  'אירופה': '#3b82f6', 'אסיה': '#f59e0b', 'צפון אמריקה': '#10b981',
  'דרום אמריקה': '#14b8a6', 'אפריקה': '#ef4444', 'אוקיאניה': '#8b5cf6',
  'מזרח התיכון': '#f97316',
}
function contColor(c) { return CONT_COLORS[c] || '#64748b' }

/* -- Emil Kowalski easing system -- */
const EASE = {
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
}

/* -- Dark theme tokens -- */
const T = {
  bg: '#0f172a',
  surface: 'rgba(255,255,255,0.04)',
  surfaceBorder: 'rgba(255,255,255,0.08)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  accent: '#3b82f6',
  glass: 'rgba(255,255,255,0.05)',
  glassBorder: '1px solid rgba(255,255,255,0.08)',
  glassInner: 'inset 0 1px 0 rgba(255,255,255,0.06)',
  font: 'Open Sans Hebrew, Open Sans, sans-serif',
}

/* -- Shared input style -- */
const inp = {
  width: '100%',
  border: '1.5px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  padding: '11px 14px',
  fontSize: '14px',
  fontFamily: T.font,
  color: T.text,
  outline: 'none',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)',
  transition: `border-color 220ms ${EASE.out}, box-shadow 220ms ${EASE.out}, background 220ms ${EASE.out}`,
}
const LBL = { display: 'block', fontSize: '11px', fontWeight: 700, color: T.textMuted, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }

function inputFocus(e) {
  e.target.style.borderColor = 'rgba(59,130,246,0.7)'
  e.target.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.18)'
  e.target.style.background = 'rgba(255,255,255,0.09)'
}
function inputBlur(e) {
  e.target.style.borderColor = 'rgba(255,255,255,0.1)'
  e.target.style.boxShadow = 'none'
  e.target.style.background = 'rgba(255,255,255,0.06)'
}

/* -- CSS keyframes & utilities injected once -- */
const KEYFRAMES = `
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}

@keyframes tv-shimmer {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}
@keyframes tv-blob1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(60px, -40px) scale(1.1); }
  66% { transform: translate(-30px, 30px) scale(0.95); }
}
@keyframes tv-blob2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-50px, 50px) scale(1.05); }
  66% { transform: translate(40px, -20px) scale(0.9); }
}
@keyframes tv-blob3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, 60px) scale(0.95); }
  66% { transform: translate(-60px, -30px) scale(1.08); }
}
@keyframes tv-modal-in {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes tv-backdrop-in {
  from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
  to   { opacity: 1; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
}
@keyframes tv-fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes tv-fade-blur-in {
  from { opacity: 0; filter: blur(4px); transform: translateY(6px); }
  to   { opacity: 1; filter: blur(0px); transform: translateY(0); }
}
@keyframes tv-pulse-amber {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0); }
  50%      { box-shadow: 0 0 28px 2px rgba(251,191,36,0.22); }
}
@keyframes tv-pulse-urgent {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.78; }
}
@keyframes tv-breathe {
  0%, 100% { transform: scale(1); opacity: 0.25; }
  50%      { transform: scale(1.06); opacity: 0.35; }
}

.tv-press { transition: transform 160ms var(--ease-out); }
@media (hover: hover) and (pointer: fine) {
  .tv-press:active { transform: scale(0.97); }
}

.tv-card-hover {
  transition:
    transform 220ms var(--ease-out),
    box-shadow 220ms var(--ease-out);
  will-change: transform;
}
@media (hover: hover) and (pointer: fine) {
  .tv-card-hover:hover { transform: translateY(-3px); }
  .tv-card-hover:active { transform: scale(0.99); }
}

.tv-stat {
  transition: transform 220ms var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .tv-stat:hover { transform: translateY(-2px); }
}

.tv-row {
  transition:
    background-color 180ms var(--ease-out),
    box-shadow 180ms var(--ease-out),
    transform 180ms var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .tv-row:hover { transform: translateX(-2px); }
  .tv-row:active { transform: scale(0.99); }
}

@media (prefers-reduced-motion: reduce) {
  .tv-row, .tv-card-hover, .tv-press, .tv-stat {
    transition: none !important;
    animation: none !important;
  }
}

/* Past trips list — responsive row */
.tv-row-grid {
  display: grid;
  grid-template-columns: 50px 100px 100px 1fr 130px 130px 50px 50px;
  padding: 13px 20px;
  gap: 12px;
  align-items: center;
}
.tv-row-mobile { display: none; }
.tv-row-cell-meta { display: block; }
.tv-row-meta-mobile { display: none; }
.tv-table-header { display: grid; }

@media (max-width: 700px) {
  .tv-row-grid {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 5px;
    padding: 12px 14px;
  }
  .tv-row-grid > .tv-row-cell-meta { display: none; }
  .tv-row-mobile {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
  }
  .tv-row-meta-mobile {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
    font-size: 11.5px;
    color: #94a3b8;
    line-height: 1.4;
  }
  .tv-row-meta-mobile .tv-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: rgba(255,255,255,0.18);
    display: inline-block;
    flex-shrink: 0;
  }
  .tv-row-meta-mobile .tv-meta-year {
    color: #818cf8;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .tv-row-meta-mobile .tv-meta-dates {
    font-variant-numeric: tabular-nums;
    color: #cbd5e1;
  }
  .tv-row-meta-mobile .tv-meta-countries { color: #cbd5e1; }
  .tv-row-meta-mobile .tv-meta-comps { color: #a5b4fc; }
  .tv-mobile-name {
    flex: 1;
    min-width: 0;
    font-size: 15px;
    font-weight: 700;
    color: #f1f5f9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: -0.01em;
  }
  .tv-mobile-days {
    flex-shrink: 0;
    background: rgba(59,130,246,0.14);
    border: 1px solid rgba(59,130,246,0.25);
    color: #93c5fd;
    font-size: 12px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 12px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .tv-mobile-icons {
    display: flex;
    gap: 6px;
    color: rgba(148,163,184,0.55);
    font-size: 11px;
    flex-shrink: 0;
  }
  .tv-table-header { display: none !important; }
  .tv-row:hover { transform: none; }
}
@keyframes gridchat-pop {
  from { opacity: 0; transform: scale(0.88); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes gridchat-bubble-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ============ REDESIGN (Hero + Table) ============ */
@keyframes tv-sheen { 0%{transform:translateX(-120%) skewX(-20deg)} 100%{transform:translateX(220%) skewX(-20deg)} }
@keyframes tv-soft-pulse { 0%,100%{opacity:1} 50%{opacity:0.75} }

/* Hero stats */
.hero-stats {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 14px;
  margin-bottom: 40px;
  animation: tv-fade-up 520ms var(--ease-out) 60ms both;
}
.hero-card {
  position: relative;
  background: rgba(255,255,255,0.035);
  backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 22px;
  padding: 28px 30px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06);
  overflow: hidden;
}
.hero-featured {
  display: flex; flex-direction: column; justify-content: center; gap: 10px;
  min-height: 200px;
  background:
    radial-gradient(ellipse at 85% 10%, rgba(96,165,250,0.18) 0%, transparent 55%),
    radial-gradient(ellipse at 10% 95%, rgba(129,140,248,0.14) 0%, transparent 55%),
    rgba(255,255,255,0.035);
}
.hero-featured::before {
  content: ''; position: absolute; top: 0; bottom: 0; right: 0;
  width: 3px;
  background: linear-gradient(180deg, #60a5fa 0%, #818cf8 50%, transparent 100%);
  border-radius: 3px;
}
.featured-label {
  font-size: 11px; font-weight: 700; color: #94a3b8;
  letter-spacing: 2px; text-transform: uppercase;
  display: flex; align-items: center; gap: 8px;
}
.featured-label::after {
  content: ''; flex: 1; height: 1px;
  background: linear-gradient(90deg, rgba(148,163,184,0.2), transparent);
}
.featured-value { display: flex; align-items: baseline; gap: 12px; }
.featured-num {
  font-size: clamp(58px, 9vw, 96px);
  font-weight: 900; line-height: 1; letter-spacing: -3px;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(180deg, #ffffff 0%, #93c5fd 120%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 40px rgba(147,197,253,0.2);
}
.featured-unit { font-size: 18px; font-weight: 600; color: #94a3b8; }
.featured-caption { font-size: 14px; color: #94a3b8; line-height: 1.6; }
.featured-caption b { color: #e2e8f0; font-weight: 800; font-variant-numeric: tabular-nums; }

.hero-upcoming {
  position: relative;
  display: flex; flex-direction: column;
  background:
    radial-gradient(ellipse at 100% 0%, rgba(251,191,36,0.22) 0%, transparent 60%),
    radial-gradient(ellipse at 0% 100%, rgba(236,72,153,0.12) 0%, transparent 60%),
    rgba(255,255,255,0.04);
  border: 1px solid rgba(251,191,36,0.22);
  border-radius: 22px;
  padding: 24px 26px;
  overflow: hidden;
  min-height: 200px;
  justify-content: space-between;
}
.hero-upcoming::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(120deg, transparent 25%, rgba(251,191,36,0.12) 50%, transparent 75%);
  transform: translateX(-120%) skewX(-20deg);
  animation: tv-sheen 6s var(--ease-in-out) infinite;
  pointer-events: none;
}
.up-head { display: flex; align-items: center; justify-content: space-between; }
.up-label { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #fbbf24; text-transform: uppercase; }
.up-live { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; color: #fbbf24; font-weight: 700; letter-spacing: 0.5px; }
.up-live .dot { width: 6px; height: 6px; border-radius: 50%; background: #fbbf24; box-shadow: 0 0 10px #fbbf24; animation: tv-soft-pulse 1.8s var(--ease-in-out) infinite; }
.up-body { display: flex; align-items: baseline; gap: 10px; }
.up-num { font-size: 78px; font-weight: 900; line-height: 1; color: #fbbf24; letter-spacing: -2.5px; font-variant-numeric: tabular-nums; text-shadow: 0 0 28px rgba(251,191,36,0.4); }
.up-num-label { font-size: 15px; color: #fcd34d; font-weight: 700; opacity: 0.9; }
.up-foot { font-size: 14px; color: #fcd34d; font-weight: 600; line-height: 1.5; }
.up-foot b { color: #fef3c7; font-variant-numeric: tabular-nums; font-weight: 900; }

/* Past trips panel */
.trips-panel {
  position: relative;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 4px 28px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
}
.panel-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: linear-gradient(90deg, rgba(96,165,250,0.05), rgba(139,92,246,0.04));
  gap: 12px; flex-wrap: wrap;
}
.panel-search-wrap { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.panel-search { position: relative; }
.panel-search .icon { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 13px; color: #64748b; pointer-events: none; }
.panel-search input {
  border: 1.5px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 8px 34px 8px 12px;
  font-size: 13px; outline: none; width: 220px;
  background: rgba(255,255,255,0.05);
  color: #e2e8f0; font-family: inherit; direction: rtl;
  transition: border-color 220ms var(--ease-out), box-shadow 220ms var(--ease-out), background 220ms var(--ease-out);
}
.panel-search input::placeholder { color: #64748b; }
.panel-search input:focus { border-color: rgba(59,130,246,0.6); box-shadow: 0 0 0 3px rgba(59,130,246,0.16); background: rgba(255,255,255,0.08); }
.btn-advanced-sm {
  background: rgba(255,255,255,0.04);
  border: 1.5px solid rgba(59,130,246,0.35);
  color: #60a5fa;
  padding: 8px 14px; border-radius: 10px;
  font-size: 12px; font-weight: 600;
  cursor: pointer; font-family: inherit;
  transition: all 180ms var(--ease-out);
  white-space: nowrap;
}
.btn-advanced-sm:hover { background: rgba(59,130,246,0.12); box-shadow: 0 0 0 3px rgba(59,130,246,0.08); }
.panel-head-title { display: flex; align-items: baseline; gap: 12px; }
.panel-head-title h2 { font-size: 17px; font-weight: 800; color: #f1f5f9; margin: 0; letter-spacing: -0.3px; }
.panel-count {
  font-size: 12px; font-weight: 600; color: #cbd5e1; font-variant-numeric: tabular-nums;
  padding: 3px 10px;
  background: rgba(96,165,250,0.12);
  border: 1px solid rgba(96,165,250,0.2);
  border-radius: 999px;
}

.year-divider {
  display: flex; align-items: baseline; gap: 12px;
  padding: 16px 24px 10px;
  background: linear-gradient(90deg, rgba(99,102,241,0.08) 0%, transparent 50%), rgba(0,0,0,0.15);
  border-bottom: 1px solid rgba(255,255,255,0.04);
  position: sticky; top: 0; z-index: 5;
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
}
.year-label {
  font-size: 22px; font-weight: 900;
  letter-spacing: -0.8px; font-variant-numeric: tabular-nums;
  background: linear-gradient(180deg, #e2e8f0, #93c5fd);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.year-meta { font-size: 11.5px; color: #64748b; font-weight: 600; letter-spacing: 0.3px; display: flex; align-items: center; gap: 8px; }
.year-meta .dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(148,163,184,0.35); }
.year-meta strong { color: #cbd5e1; font-weight: 700; font-variant-numeric: tabular-nums; }
.year-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06)); }

/* Desktop trip row */
.trip-row {
  display: grid;
  grid-template-columns: 130px 1.4fr 1.1fr 150px 72px;
  gap: 16px;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
  position: relative;
  transition: background 180ms var(--ease-out);
}
.trip-row:last-child { border-bottom: none; }
.trip-row::before {
  content: ''; position: absolute; top: 16%; bottom: 16%; right: 0;
  width: 3px; background: var(--cont-color, #64748b); opacity: 0.35;
  transition: opacity 200ms var(--ease-out), top 240ms var(--ease-out), bottom 240ms var(--ease-out);
  border-radius: 3px 0 0 3px;
}
.trip-row:hover {
  background: linear-gradient(90deg, color-mix(in srgb, var(--cont-color) 8%, transparent) 0%, rgba(96,165,250,0.05) 100%);
}
.trip-row:hover::before { opacity: 1; top: 6%; bottom: 6%; }
.trip-row.header {
  cursor: default;
  padding: 12px 24px;
  background: rgba(0,0,0,0.18);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  font-size: 10.5px; font-weight: 700; color: #64748b;
  letter-spacing: 1.3px; text-transform: uppercase;
}
.trip-row.header::before { display: none; }
.trip-row.header:hover { background: rgba(0,0,0,0.18); }

.row-dates { display: flex; flex-direction: column; gap: 2px; font-variant-numeric: tabular-nums; }
.row-date-range { font-size: 14px; font-weight: 700; color: #e2e8f0; letter-spacing: -0.2px; display: flex; align-items: baseline; gap: 6px; }
.row-date-range .arrow { color: #64748b; font-size: 10px; }
.row-date-year { font-size: 11px; color: #64748b; font-weight: 600; }

.row-title { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.row-title-main {
  font-size: 15px; font-weight: 700; color: #f1f5f9;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  letter-spacing: -0.2px; display: flex; align-items: center; gap: 8px;
}
.row-title-main .flag {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--cont-color);
  box-shadow: 0 0 8px color-mix(in srgb, var(--cont-color) 60%, transparent);
  flex-shrink: 0;
}
.row-title-sub { font-size: 12px; color: #94a3b8; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.row-countries { display: flex; flex-wrap: wrap; gap: 4px; align-content: center; max-height: 50px; overflow: hidden; }
.country-pill {
  font-size: 11px;
  padding: 3px 9px;
  background: color-mix(in srgb, var(--cont-color) 10%, rgba(255,255,255,0.03));
  border: 1px solid color-mix(in srgb, var(--cont-color) 22%, rgba(255,255,255,0.06));
  border-radius: 999px;
  color: color-mix(in srgb, var(--cont-color) 60%, #cbd5e1);
  font-weight: 600; white-space: nowrap;
}
.country-pill.more { color: #64748b; background: transparent; border-color: rgba(255,255,255,0.06); border-style: dashed; }

.row-comp-names {
  font-size: 12px; color: #a5b4fc; font-weight: 600;
  min-width: 0; letter-spacing: -0.1px; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; word-break: break-word;
}
.row-comp-names.empty { color: #475569; font-weight: 400; font-style: italic; }
.row-comp-names .more { color: #64748b; font-weight: 500; margin-right: 2px; }

.row-days { text-align: center; display: flex; flex-direction: column; gap: 1px; align-items: center; }
.days-num { font-size: 20px; font-weight: 800; color: #e2e8f0; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.5px; }
.days-num.long { color: #fbbf24; text-shadow: 0 0 16px rgba(251,191,36,0.35); }
.days-num.mid { color: #60a5fa; }
.days-label { font-size: 10px; color: #64748b; font-weight: 600; letter-spacing: 0.4px; margin-top: 3px; text-transform: uppercase; }

/* Mobile cards */
.trip-card-mobile { display: none; }
.year-divider-mobile { display: none; }

@media (max-width: 900px) { .hero-stats { grid-template-columns: 1fr; gap: 12px; } }

@media (max-width: 680px) {
  .hero-featured { padding: 22px 24px; min-height: auto; }
  .featured-num { font-size: 68px; letter-spacing: -2.3px; }
  .featured-unit { font-size: 15px; }
  .hero-upcoming { padding: 20px 22px; min-height: auto; }
  .up-num { font-size: 62px; letter-spacing: -2px; }

  .panel-head { padding: 14px 14px; }
  .panel-search input { width: 100%; }
  .panel-search { flex: 1; min-width: 180px; }
  .panel-search-wrap { width: 100%; }

  .year-divider { display: none; }
  .trip-row { display: none; }
  .trip-row.header { display: none; }

  .year-divider-mobile {
    display: flex; align-items: baseline; gap: 10px;
    padding: 16px 16px 8px;
    position: sticky; top: 0; z-index: 4;
    background: rgba(15,23,42,0.92);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .year-divider-mobile .year-label-m {
    font-size: 22px; font-weight: 900;
    font-variant-numeric: tabular-nums; letter-spacing: -0.8px;
    background: linear-gradient(180deg, #e2e8f0, #93c5fd);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .year-divider-mobile .year-meta-m { font-size: 11px; color: #64748b; font-weight: 600; }

  .trip-card-mobile {
    display: block; position: relative;
    padding: 14px 16px 14px 18px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    cursor: pointer;
    transition: background 180ms var(--ease-out);
  }
  .trip-card-mobile:last-child { border-bottom: none; }
  .trip-card-mobile:active { background: rgba(96,165,250,0.05); }
  .trip-card-mobile::before {
    content: ''; position: absolute; top: 14px; bottom: 14px; right: 0;
    width: 3px; background: var(--cont-color, #64748b);
    border-radius: 3px 0 0 3px; opacity: 0.85;
    box-shadow: 0 0 10px color-mix(in srgb, var(--cont-color) 50%, transparent);
  }
  .m-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
  .m-title { flex: 1; min-width: 0; font-size: 15.5px; font-weight: 800; color: #f1f5f9; letter-spacing: -0.3px; line-height: 1.3; }
  .m-days {
    flex-shrink: 0; display: inline-flex; align-items: baseline; gap: 4px;
    background: rgba(96,165,250,0.12);
    border: 1px solid rgba(96,165,250,0.22);
    border-radius: 10px; padding: 4px 10px; color: #93c5fd;
    font-variant-numeric: tabular-nums;
  }
  .m-days.long { background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.22); color: #fcd34d; }
  .m-days .n { font-size: 15px; font-weight: 900; letter-spacing: -0.4px; }
  .m-days .u { font-size: 10px; font-weight: 700; opacity: 0.75; }
  .m-dates { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #cbd5e1; font-weight: 600; font-variant-numeric: tabular-nums; margin-bottom: 8px; }
  .m-dates .arrow { color: #64748b; font-size: 10px; }
  .m-dates .year-tag { margin-right: auto; font-size: 11px; font-weight: 700; color: #818cf8; padding: 1px 7px; background: rgba(129,140,248,0.1); border-radius: 5px; }
  .m-tags { display: flex; flex-wrap: wrap; gap: 5px 6px; align-items: center; }
  .m-tag {
    font-size: 11px; font-weight: 600;
    color: color-mix(in srgb, var(--cont-color) 55%, #cbd5e1);
    background: color-mix(in srgb, var(--cont-color) 10%, rgba(255,255,255,0.03));
    border: 1px solid color-mix(in srgb, var(--cont-color) 22%, rgba(255,255,255,0.06));
    border-radius: 999px; padding: 3px 9px; white-space: nowrap;
  }
  .m-tag.comp { color: #a5b4fc; background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.18); }
  .m-tag.more { color: #64748b; background: transparent; border-style: dashed; }
  .m-tag.warn-flights { color: #fb923c; background: rgba(251,146,60,0.08); border-color: rgba(251,146,60,0.2); }
}

/* Tablet */
@media (min-width: 681px) and (max-width: 1020px) {
  .trip-row { grid-template-columns: 120px 1.2fr 1fr 72px; gap: 12px; padding: 14px 18px; }
  .trip-row .hide-tablet { display: none; }
  .panel-search input { width: 160px; }
}

`

/* -- useCountUp hook -- */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  const startRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (typeof target !== 'number' || Number.isNaN(target)) { setValue(target); return }
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setValue(target); return }

    startRef.current = null
    const tick = (ts) => {
      if (startRef.current == null) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(1, elapsed / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(eased * target))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return value
}

/* -- AddTripModal -- */
function AddTripModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', name_he: '', start_date: '', end_date: '', city: '', country: '' })
  const [loading, setLoading] = useState(false)
  const [closing, setClosing] = useState(false)
  const navigate = useNavigate()
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleClose() {
    setClosing(true)
    setTimeout(() => onClose(), 180)
  }

  async function save() {
    if (!form.name_he && !form.name) return
    setLoading(true)
    const { data: trip } = await supabase.from('trips').insert({
      name: form.name || form.name_he,
      name_he: form.name_he || form.name,
    }).select().single()
    if (trip && form.city) {
      await supabase.from('trip_segments').insert({
        trip_id: trip.id,
        city: form.city,
        country: form.country,
        date_from: form.start_date || null,
        date_to: form.end_date || null,
      })
    }
    setLoading(false)
    onCreated()
    if (trip) navigate(`/travels/${trip.id}`)
  }

  const fieldStagger = (i) => ({
    animation: `tv-fade-up 340ms ${EASE.drawer} ${80 + i * 50}ms both`,
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 200,
        animation: closing
          ? `tv-backdrop-in 180ms ${EASE.out} reverse forwards`
          : `tv-backdrop-in 240ms ${EASE.out} both`,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: 'rgba(30,41,59,0.95)',
          borderRadius: '24px',
          padding: '40px',
          width: '500px',
          maxWidth: '95vw',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
          border: T.glassBorder,
          direction: 'rtl',
          willChange: 'transform, opacity',
          animation: closing
            ? `tv-modal-in 180ms ${EASE.drawer} reverse forwards`
            : `tv-modal-in 280ms ${EASE.drawer} both`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', ...fieldStagger(0) }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: T.text, letterSpacing: '-0.5px' }}>נסיעה חדשה</h2>
          <button
            className="tv-press"
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', width: '32px', height: '32px',
              borderRadius: '50%', fontSize: '16px', color: T.textMuted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: `background 180ms ${EASE.out}, transform 160ms ${EASE.out}`,
            }}
            onClick={handleClose}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={fieldStagger(1)}>
            <label style={LBL}>שם הנסיעה (עברית)</label>
            <input style={inp} value={form.name_he} onChange={e => set('name_he', e.target.value)} placeholder="למשל: בנגקוק עם רועי 2026" autoFocus onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div style={fieldStagger(2)}>
            <label style={LBL}>שם הנסיעה (אנגלית)</label>
            <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Bangkok with Roy 2026" onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', ...fieldStagger(3) }}>
            <div>
              <label style={LBL}>תאריך יציאה</label>
              <input style={{ ...inp, colorScheme: 'dark' }} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} onFocus={inputFocus} onBlur={inputBlur} />
            </div>
            <div>
              <label style={LBL}>תאריך חזרה</label>
              <input style={{ ...inp, colorScheme: 'dark' }} type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} onFocus={inputFocus} onBlur={inputBlur} />
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)', ...fieldStagger(4) }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: T.textDim, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>יעד ראשון -- אפשרי</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={LBL}>עיר</label>
                <input style={inp} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Bangkok" onFocus={inputFocus} onBlur={inputBlur} />
              </div>
              <div>
                <label style={LBL}>מדינה</label>
                <input style={inp} value={form.country} onChange={e => set('country', e.target.value)} placeholder="Thailand" onFocus={inputFocus} onBlur={inputBlur} />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={save}
          disabled={loading || (!form.name_he && !form.name)}
          className="tv-press"
          style={{
            width: '100%', marginTop: '28px', background: '#2563eb', border: 'none', color: 'white',
            padding: '15px', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            fontFamily: T.font,
            opacity: (!form.name_he && !form.name) ? 0.4 : 1,
            transition: `transform 160ms ${EASE.out}, box-shadow 220ms ${EASE.out}, background 180ms ${EASE.out}`,
            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
            ...fieldStagger(5),
          }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(37,99,235,0.45)' } }}
          onMouseLeave={e => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.3)' }}
        >
          {loading ? 'יוצר...' : 'צור נסיעה'}
        </button>
      </div>
    </div>
  )
}

/* -- TripCard (unused but preserved) -- */
function TripCard({ trip, upcoming }) {
  const navigate = useNavigate()
  const days = daysBetween(trip.startDate, trip.endDate)
  const accentColor = upcoming ? '#d97706' : '#3b82f6'

  return (
    <div
      className="tv-card-hover tv-press"
      style={{
        background: T.glass,
        padding: '24px',
        cursor: 'pointer',
        borderRadius: '18px',
        border: T.glassBorder,
        borderTop: `3px solid ${accentColor}`,
        transition: `transform 220ms ${EASE.out}, box-shadow 220ms ${EASE.out}`,
        boxShadow: `0 2px 8px rgba(0,0,0,0.2), ${T.glassInner}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
      onClick={() => navigate(`/travels/${trip.id}`)}
    >
      {upcoming && (
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
          קרוב
        </div>
      )}
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: T.text, lineHeight: 1.3, margin: 0 }}>{trip.name_he || trip.name}</h3>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: T.textMuted }}>
          {fmtDate(trip.startDate, { day: 'numeric', month: 'short', year: 'numeric' })} -- {fmtShort(trip.endDate)}
        </span>
        {days && (
          <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
            {days} ימים
          </span>
        )}
      </div>
      <div style={{ fontSize: '12px', color: T.textMuted }}>{trip.countries.map(heCountry).join(' · ')}</div>
      {trip.companions.length > 0 && (
        <div style={{ fontSize: '12px', color: '#818cf8', fontWeight: 500 }}>{trip.companions.slice(0, 3).join(', ')}</div>
      )}
      {(!trip.hasFlights || !trip.hasLodging) && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
          {!trip.hasFlights && (
            <span style={{ fontSize: '11px', background: 'rgba(251,146,60,0.12)', color: '#fb923c', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(251,146,60,0.2)', fontWeight: 600 }}>
              אין טיסות
            </span>
          )}
          {!trip.hasLodging && (
            <span style={{ fontSize: '11px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(74,222,128,0.15)', fontWeight: 600 }}>
              אין לינה
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/* -- UpcomingCard (extracted for countUp hook) -- */
function UpcomingCard({ trip, idx, today, onClick }) {
  const daysLeft = Math.ceil((new Date(trip.startDate) - new Date(today)) / 86400000)
  const tripDays = daysBetween(trip.startDate, trip.endDate)
  const accent = contColor(trip.continents?.[0])
  const urgency = daysLeft <= 7
    ? { num: '#f87171', glow: 'rgba(248,113,113,0.15)', ring: 'rgba(248,113,113,0.3)' }
    : daysLeft <= 30
    ? { num: '#fbbf24', glow: 'rgba(251,191,36,0.12)', ring: 'rgba(251,191,36,0.25)' }
    : { num: '#38bdf8', glow: 'rgba(56,189,248,0.1)', ring: 'rgba(56,189,248,0.25)' }

  const count = useCountUp(daysLeft, 700 + idx * 80)
  const ref = useRef(null)

  return (
    <div
      ref={ref}
      onClick={onClick}
      className="tv-card-hover"
      style={{
        display: 'flex', alignItems: 'stretch', borderRadius: '16px',
        border: T.glassBorder, overflow: 'hidden', cursor: 'pointer',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: `0 2px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)`,
        transition: `transform 240ms ${EASE.out}, box-shadow 240ms ${EASE.out}`,
        animation: `tv-fade-up 420ms ${EASE.out} ${120 + idx * 60}ms both`,
        willChange: 'transform',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 14px 40px rgba(0,0,0,0.32), 0 0 28px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.08)`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = `0 2px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)`
      }}
    >
      {/* Accent strip with glow */}
      <div style={{
        width: '5px', background: accent, flexShrink: 0,
        boxShadow: `0 0 12px ${accent}40`,
      }} />
      {/* Info */}
      <div style={{ flex: 1, padding: '16px 20px', minWidth: 0 }}>
        <div style={{ fontSize: '17px', fontWeight: 800, color: T.text, marginBottom: '4px', lineHeight: 1.25 }}>
          {trip.name_he || trip.name}
        </div>
        <div style={{ fontSize: '12px', color: T.textMuted, marginBottom: '3px' }}>
          {fmtDate(trip.startDate, { day: 'numeric', month: 'long' })} -- {fmtDate(trip.endDate, { day: 'numeric', month: 'long', year: 'numeric' })}
          {tripDays && <span style={{ marginRight: '6px' }}>· {tripDays} ימים</span>}
        </div>
        {trip.countries.length > 0 && (
          <div style={{ fontSize: '12px', color: T.textMuted }}>{trip.countries.map(heCountry).join(' · ')}</div>
        )}
        {trip.companions.length > 0 && (
          <div style={{ fontSize: '12px', color: '#818cf8', fontWeight: 500, marginTop: '3px' }}>
            {trip.companions.slice(0, 3).join(', ')}{trip.companions.length > 3 ? ` +${trip.companions.length - 3}` : ''}
          </div>
        )}
      </div>
      {/* Countdown */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '16px 24px', background: urgency.glow, flexShrink: 0, minWidth: '90px',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        animation: daysLeft <= 7 ? `tv-pulse-urgent 2.4s ${EASE.inOut} infinite` : 'none',
      }}>
        <div style={{
          fontSize: '38px', fontWeight: 900, lineHeight: 1, color: urgency.num,
          letterSpacing: '-1px',
          textShadow: `0 0 20px ${urgency.glow}`,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {count}
        </div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: urgency.num, opacity: 0.6, marginTop: '3px', letterSpacing: '0.5px' }}>
          ימים
        </div>
      </div>
    </div>
  )
}

/* -- TripRow -- */
function TripRow({ trip, onClick, index }) {
  const days = daysBetween(trip.startDate, trip.endDate)
  const [hovered, setHovered] = useState(false)
  const delay = Math.min(index * 30, 600)
  const countriesStr = trip.countries.map(heCountry).slice(0, 3).join(' · ')
  const compsStr = trip.companions.length > 0
    ? trip.companions.slice(0, 2).join(', ') + (trip.companions.length > 2 ? ` +${trip.companions.length - 2}` : '')
    : ''
  const daysColor = days > 14 ? '#fbbf24' : days > 7 ? '#60a5fa' : T.textMuted

  return (
    <div
      className="tv-row tv-row-grid"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        cursor: 'pointer',
        background: hovered
          ? 'rgba(59,130,246,0.08)'
          : index % 2 === 0
          ? 'transparent'
          : 'rgba(255,255,255,0.02)',
        boxShadow: hovered ? 'inset 0 0 0 1px rgba(59,130,246,0.15)' : 'inset 0 0 0 1px transparent',
        animation: `tv-fade-up 360ms ${EASE.out} ${delay}ms both`,
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Desktop grid cells */}
      <div className="tv-row-cell-meta" style={{ fontSize: '13px', fontWeight: 700, color: '#818cf8', fontVariantNumeric: 'tabular-nums' }}>{trip.startDate?.slice(0, 4)}</div>
      <div className="tv-row-cell-meta" style={{ fontSize: '12px', color: T.textMuted }}>{fmtShort(trip.startDate)}</div>
      <div className="tv-row-cell-meta" style={{ fontSize: '12px', color: T.textMuted }}>{fmtShort(trip.endDate)}</div>
      <div className="tv-row-cell-meta" style={{ fontSize: '14px', fontWeight: 600, color: T.text }}>{trip.name_he || trip.name}</div>
      <div className="tv-row-cell-meta" style={{ fontSize: '12px', color: T.textMuted }}>{trip.countries.map(heCountry).slice(0, 2).join(' · ')}</div>
      <div className="tv-row-cell-meta" style={{ fontSize: '12px', color: '#818cf8', fontWeight: 500 }}>
        {trip.companions.slice(0, 2).join(', ')}{trip.companions.length > 2 ? ` +${trip.companions.length - 2}` : ''}
      </div>
      <div className="tv-row-cell-meta" style={{ textAlign: 'center', fontSize: '13px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: daysColor }}>
        {days || '--'}
      </div>
      <div className="tv-row-cell-meta" style={{ display: 'flex', gap: '4px', justifyContent: 'center', fontSize: '12px', color: T.textDim }}>
        {!trip.hasFlights && <span title="אין טיסות">✈</span>}
        {!trip.hasLodging && <span title="אין לינה">■</span>}
      </div>

      {/* Mobile two-line layout */}
      <div className="tv-row-mobile">
        <div className="tv-mobile-name">{trip.name_he || trip.name}</div>
        <div className="tv-mobile-icons">
          {!trip.hasFlights && <span title="אין טיסות">✈</span>}
          {!trip.hasLodging && <span title="אין לינה">■</span>}
        </div>
        {days != null && (
          <div className="tv-mobile-days" style={{ color: daysColor, borderColor: `${daysColor}40`, background: `${daysColor}1a` }}>
            {days} ימים
          </div>
        )}
      </div>
      <div className="tv-row-meta-mobile">
        <span className="tv-meta-year">{trip.startDate?.slice(0, 4)}</span>
        <span className="tv-dot" />
        <span className="tv-meta-dates">{fmtShort(trip.startDate)} → {fmtShort(trip.endDate)}</span>
        {countriesStr && (<><span className="tv-dot" /><span className="tv-meta-countries">{countriesStr}</span></>)}
        {compsStr && (<><span className="tv-dot" /><span className="tv-meta-comps">{compsStr}</span></>)}
      </div>
    </div>
  )
}

/* -- Empty state SVG -- */
function EmptyIcon() {
  return (
    <svg
      width="64" height="64" viewBox="0 0 64 64" fill="none"
      style={{
        marginBottom: '12px',
        animation: `tv-breathe 4s ${EASE.inOut} infinite`,
        transformOrigin: 'center',
      }}
    >
      <circle cx="32" cy="32" r="28" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M22 38c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      <circle cx="26" cy="28" r="2" fill="#64748b" />
      <circle cx="38" cy="28" r="2" fill="#64748b" />
      <path d="M20 20l4 4M44 20l-4 4" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/* -- StatCell with count-up & stagger -- */
function StatCell({ v, l, accent, idx }) {
  const count = useCountUp(typeof v === 'number' ? v : 0, 900)
  return (
    <div
      className="tv-stat"
      style={{
        flex: 1, textAlign: 'center', padding: '24px 0',
        animation: `tv-fade-up 480ms ${EASE.out} ${120 + idx * 50}ms both`,
        borderRadius: '14px',
        ...(accent ? { animationName: 'tv-fade-up' } : {}),
      }}
    >
      <div
        style={{
          fontSize: '36px', fontWeight: 900,
          color: accent ? '#fbbf24' : '#60a5fa',
          letterSpacing: '-1px', lineHeight: 1,
          textShadow: accent ? '0 0 24px rgba(251,191,36,0.35)' : '0 0 24px rgba(96,165,250,0.3)',
          fontVariantNumeric: 'tabular-nums',
          display: 'inline-block',
          padding: accent ? '2px 10px' : 0,
          borderRadius: accent ? '10px' : 0,
          animation: accent ? `tv-pulse-amber 3.2s ${EASE.inOut} infinite` : 'none',
        }}
      >
        {count}
      </div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: T.textDim, marginTop: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>{l}</div>
    </div>
  )
}

/* -- Main Component -- */
// ── GridReveal — v11 gridchat upcoming trips ─────────────────────────────────
const PEOPLE = [
  '/upcoming/assets/person.png', '/upcoming/assets/person-2.png',
  '/upcoming/assets/person-3.png', '/upcoming/assets/person-4.png',
  '/upcoming/assets/person-5.png', '/upcoming/assets/person-6.png',
  '/upcoming/assets/person-7.png', '/upcoming/assets/person-8.png',
  '/upcoming/assets/person-9.png', '/upcoming/assets/person-10.png',
  '/upcoming/assets/person-11.png', '/upcoming/assets/person-12.png',
  '/upcoming/assets/person-13.png', '/upcoming/assets/person-14.png',
  '/upcoming/assets/person-15.png', '/upcoming/assets/person-16.png',
  '/upcoming/assets/person-17.png', '/upcoming/assets/person-18.png',
  '/upcoming/assets/person-19.png', '/upcoming/assets/person-20.png',
  '/upcoming/assets/person-21.png',
]

function urgencyPalette(dLeft) {
  if (dLeft <= 7)  return { num:'#f87171', glow:'rgba(248,113,113,0.15)', label:'כבר פה' }
  if (dLeft <= 30) return { num:'#fbbf24', glow:'rgba(251,191,36,0.12)',  label:'ממש בקרוב' }
  if (dLeft <= 90) return { num:'#38bdf8', glow:'rgba(56,189,248,0.10)',  label:'בדרך' }
  return { num:'#818cf8', glow:'rgba(129,140,248,0.10)', label:'בהמשך' }
}

function daysLeftFrom(today, startDate) {
  return Math.ceil((new Date(startDate) - new Date(today)) / 86400000)
}

function handleFor(trip) {
  const city = (trip.cities && trip.cities[0]) || 'trip'
  const slug = city.toLowerCase().replace(/[^a-z]/g, '')
  const d = daysBetween(trip.startDate, trip.endDate) || 1
  return `@${slug}_${d}d`
}

function lighten(hex, amt) { return shade(hex, amt) }
function darken(hex, amt)  { return shade(hex, -amt) }
function shade(hex, amt) {
  const h = hex.replace('#','')
  const full = h.length===3 ? h.split('').map(x=>x+x).join('') : h
  const r=parseInt(full.slice(0,2),16), g=parseInt(full.slice(2,4),16), b=parseInt(full.slice(4,6),16)
  const mix = v => Math.round(amt>0 ? v+(255-v)*amt : v*(1+amt))
  const toHex = v => Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')
  return '#'+toHex(mix(r))+toHex(mix(g))+toHex(mix(b))
}

function destImage(trip) {
  const city    = ((trip.cities&&trip.cities[0])||'').toLowerCase()
  const country = ((trip.countries&&trip.countries[0])||'').toLowerCase()
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
  for (const [k,src] of CITIES) { if (city.includes(k)) return src }
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
  for (const [k,src] of COUNTRIES) { if (country.includes(k)) return src }
  return null
}

function destBackdrop(trip) {
  const key = ((trip.cities&&trip.cities[0])||''+(trip.countries&&trip.countries[0])||'').toLowerCase()
  const MAP = {
    paris:['#f4c9b5','#c88a9a','#6b4a6b'],london:['#aec4d2','#6a7f93','#2f3d4f'],
    berlin:['#d9d4c7','#8a8a7a','#3b3d3a'],amsterdam:['#c7d8cf','#7aa38c','#2f4b42'],
    barcelona:['#f7d49a','#e08a5a','#7b3a2f'],madrid:['#f3c27a','#c46a3a','#5a2a22'],
    budapest:['#e8d5b0','#c4935a','#6b4a2f'],warsaw:['#c8d4d8','#7a9aa8','#2f4a5a'],
    prague:['#d4c8c0','#9a8878','#4a3830'],vienna:['#d8cfc0','#a89070','#5a4030'],
    bangkok:['#f0c48a','#d46a5a','#3e2a4a'],phuket:['#a7e0d0','#3aa08a','#1a4a5a'],
    'new york':['#2a3d66','#4a6aa0','#c0d4ea'],sydney:['#9ad0d8','#3a80a0','#1a3050'],
    lisbon:['#f0c890','#d0885a','#703828'],brussels:['#c8d4a8','#7a9a68','#3a5a28'],
  }
  let stops = null
  for (const k of Object.keys(MAP)) { if (key.includes(k)) { stops=MAP[k]; break } }
  if (!stops) {
    const c = contColor(trip.continents&&trip.continents[0])
    stops = [lighten(c,0.35), c, darken(c,0.35)]
  }
  return { background:`linear-gradient(180deg,${stops[0]} 0%,${stops[1]} 55%,${stops[2]} 100%)`, stops }
}

function VerifiedDot() {
  return (
    <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'13px',height:'13px',borderRadius:'50%',background:'#38bdf8',color:'#fff',fontSize:'9px',fontWeight:900,boxShadow:'0 0 0 1.5px rgba(255,255,255,0.6)'}}>✓</span>
  )
}
function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'}}>
      <path d="M4 5h16v10H8l-4 4V5z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  )
}

function Bubble({ side, text, time, delay }) {
  const isUser = side === 'user'
  const bg = isUser ? '#FFCC1D' : '#66CFFE'
  return (
    <div style={{display:'flex',justifyContent:isUser?'flex-start':'flex-end',animation:`gridchat-bubble-in 260ms ${EASE.out} ${delay}ms both`}}>
      <div style={{maxWidth:'82%',position:'relative',padding:'6px 10px',borderRadius:'14px',background:bg,color:'#0a0a0a',fontSize:'11.5px',lineHeight:1.35,fontWeight:500,boxShadow:'0 1px 2px rgba(0,0,0,0.25)',borderBottomRightRadius:isUser?'14px':'4px',borderBottomLeftRadius:isUser?'4px':'14px'}}>
        {text}
        {time&&<span style={{display:'block',fontSize:'8.5px',color:'rgba(0,0,0,0.5)',marginTop:'1px',textAlign:isUser?'left':'right',fontFamily:'ui-monospace,Menlo,monospace'}}>{time}</span>}
      </div>
    </div>
  )
}

function ChatPopover({ trip, today, onNavigate }) {
  const dLeft = daysLeftFrom(today, trip.startDate)
  const tripDays = daysBetween(trip.startDate, trip.endDate)
  const city = (trip.cities&&trip.cities[0]) || ''
  const comps = trip.companions&&trip.companions.length
  const withLine = comps
    ? (trip.companions.length===1 ? `עם ${trip.companions[0]} 😎` : `עם ${trip.companions.join(', ')} — חגיגה 🔥`)
    : 'לבד. חבילה שקטה 🎒'
  const lines = [
    { side:'user', text:'היי אחי' },
    { side:'user', text:'מה הראש?' },
    { side:'trip', text:`היי... ${trip.name_he||trip.name}. תחכה לי? 🍆🍑` },
    { side:'user', text:'וואללה, מתי אתה מגיע?' },
    { side:'trip', text:`אני מגיע ל${CITY_HE[city]||city} בעוד ${dLeft} ימים` },
    { side:'user', text:'אש! כמה זמן תהיה פה?' },
    { side:'trip', text:`${tripDays} ימים. עד ה־${fmtShort(trip.endDate)}.` },
    { side:'user', text:'מגיע לבד או חגיגה?' },
    { side:'trip', text:withLine },
    { side:'user', text:'מחכה לך 🤙' },
  ]
  return (
    <div onMouseDown={e=>e.stopPropagation()} style={{position:'absolute',top:'10px',bottom:'10px',left:'10px',right:'10px',borderRadius:'12px',background:'rgba(8,14,28,0.75)',backdropFilter:'blur(14px) saturate(140%)',WebkitBackdropFilter:'blur(14px) saturate(140%)',border:'1px solid rgba(255,255,255,0.14)',boxShadow:'0 20px 50px rgba(0,0,0,0.55)',padding:'10px 10px 8px',display:'flex',flexDirection:'column',gap:'5px',animation:`gridchat-pop 220ms ${EASE.out} both`,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',paddingBottom:'8px',borderBottom:'1px solid rgba(255,255,255,0.08)',cursor:'pointer'}} onClick={e=>{e.stopPropagation();onNavigate()}}>
        <div style={{width:'22px',height:'22px',borderRadius:'50%',background:'#66CFFE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:900,color:'#0a0a0a'}}>{(CITY_HE[city]||city).slice(0,1)||'T'}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:'11px',fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{CITY_HE[city]||city}</div>
          <div style={{fontSize:'9px',color:'#66CFFE',display:'flex',alignItems:'center',gap:'4px'}}>
            <span style={{width:'5px',height:'5px',borderRadius:'50%',background:'#4ade80',display:'inline-block'}}/>פעיל
          </div>
        </div>
        <div style={{fontSize:'9px',color:'#64748b',fontFamily:'ui-monospace,Menlo,monospace'}}>hover</div>
      </div>
      <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',gap:'4px'}}>
        {lines.map((l,i)=><Bubble key={i} side={l.side} text={l.text} time={l.time} delay={60+i*60}/>)}
      </div>
    </div>
  )
}


// Detect mobile viewport — used to render trimmed GridTile on small screens
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches
  })
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handler = (e) => setIsMobile(e.matches)
    if (mq.addEventListener) mq.addEventListener('change', handler)
    else mq.addListener(handler)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler)
      else mq.removeListener(handler)
    }
  }, [breakpoint])
  return isMobile
}

function GridTile({ trip, today, idx, personSrc, hovered, isNearest, onEnter, onLeave, onTap, onNavigate }) {
  const dLeft = daysLeftFrom(today, trip.startDate)
  const u = urgencyPalette(dLeft)
  const city    = (trip.cities&&trip.cities[0]) || ''
  const country = (trip.countries&&trip.countries[0]) || ''
  const back = destBackdrop(trip)
  const photo = destImage(trip)
  const isMobile = useIsMobile()

  function handleClick(e) {
    if (window.matchMedia('(hover: none)').matches) { e.stopPropagation(); onTap() }
    else onEnter()
  }

  return (
    <div
      onMouseEnter={onEnter} onMouseLeave={onLeave}
      onFocus={onEnter} onBlur={onLeave}
      onClick={handleClick}
      tabIndex={0}
      style={{position:'relative',aspectRatio:'3/4',borderRadius:'16px',overflow:'hidden',cursor:'pointer',outline:'none',background:photo?'#0b1222':back.background,boxShadow:(() => {
        const baseShadow = hovered ? '0 14px 40px rgba(0,0,0,0.5)' : '0 2px 10px rgba(0,0,0,0.4)'
        const innerHairline = hovered ? '0 0 0 1px rgba(255,255,255,0.12)' : '0 0 0 1px rgba(255,255,255,0.05)'
        // Nearest trip — add a 3px yellow ring on top of the hairline + a subtle yellow glow
        if (isNearest) {
          return `${baseShadow}, 0 0 0 3px #FFCC1D, 0 0 18px rgba(255,204,29,0.35)`
        }
        return `${baseShadow}, ${innerHairline}`
      })(),transform:hovered?'translateY(-3px)':'translateY(0)',transition:`transform 240ms ${EASE.out},box-shadow 240ms ${EASE.out}`,animation:`tv-fade-up 480ms ${EASE.out} ${160+idx*60}ms both`,isolation:'isolate',zIndex:hovered?20:1}}
    >
      {photo&&<img src={photo} alt="" aria-hidden style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'center',transform:hovered?'scale(1.06)':'scale(1.01)',transition:`transform 600ms ${EASE.out}`,pointerEvents:'none'}}/>}
      {!photo&&<div aria-hidden style={{position:'absolute',left:'50%',bottom:'32%',transform:'translateX(-50%)',width:'70%',height:'70%',borderRadius:'50%',background:`radial-gradient(circle,${back.stops[0]}aa 0%,${back.stops[0]}00 60%)`,filter:'blur(6px)',pointerEvents:'none'}}/>}
      <img src={personSrc} alt="" style={{position:'absolute',bottom:0,left:'50%',transform:`translateX(-50%) scale(${hovered?1.03:1})`,transition:`transform 500ms ${EASE.out}`,height:'82%',width:'auto',objectFit:'contain',objectPosition:'bottom center',pointerEvents:'none',filter:'drop-shadow(0 10px 14px rgba(0,0,0,0.45))'}}/>
      <div aria-hidden style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,0.45) 0%,rgba(0,0,0,0) 35%,rgba(0,0,0,0) 65%,rgba(0,0,0,0.55) 100%)',pointerEvents:'none'}}/>
      {isMobile ? (
        <>
          {/* MOBILE — header: city on top, days-left badge on its own row below */}
          <div style={{position:'absolute',top:0,left:0,right:0,padding:'10px 12px',color:'#fff'}}>
            <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',fontWeight:700,textShadow:'0 1px 3px rgba(0,0,0,0.5)',minWidth:0}}>
              <VerifiedDot/>
              <span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',flex:1}}>{(CITY_HE[city]||city)||heCountry(country)}</span>
            </div>
            <div style={{marginTop:'6px'}}>
              <span style={{display:'inline-block',padding:'3px 9px',borderRadius:'999px',background:u.num,color:'#0f172a',fontSize:'10.5px',fontWeight:800,letterSpacing:'0.3px',boxShadow:`0 2px 8px ${u.glow}`,whiteSpace:'nowrap'}}>
                {dLeft>0?dLeft:u.label}
              </span>
            </div>
          </div>
          {/* MOBILE — bottom: only dates */}
          <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'10px 12px',color:'#fff',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:'8px'}}>
            <div style={{fontSize:'11px',fontWeight:600,textShadow:'0 1px 3px rgba(0,0,0,0.6)',lineHeight:1.3}}>
              {fmtShort(trip.startDate)} – {fmtShort(trip.endDate)}
            </div>
            <ChatIcon/>
          </div>
        </>
      ) : (
        <>
          {/* DESKTOP — original layout with handle and full meta */}
          <div style={{position:'absolute',top:0,left:0,right:0,padding:'10px 12px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px',color:'#fff'}}>
            <div style={{minWidth:0,flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',fontWeight:700,textShadow:'0 1px 3px rgba(0,0,0,0.5)'}}>
                <VerifiedDot/>
                <span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{(CITY_HE[city]||city)||heCountry(country)}</span>
              </div>
              <div style={{fontSize:'10.5px',color:'rgba(255,255,255,0.78)',letterSpacing:'0.2px',marginTop:'2px',fontFamily:'ui-monospace,Menlo,monospace',textShadow:'0 1px 2px rgba(0,0,0,0.5)'}}>{handleFor(trip)}</div>
            </div>
            <div style={{padding:'3px 7px',borderRadius:'999px',background:u.num,color:'#0f172a',fontSize:'10px',fontWeight:800,letterSpacing:'0.3px',boxShadow:`0 2px 8px ${u.glow}`,whiteSpace:'nowrap'}}>
              {dLeft>0?`-${dLeft}ד`:u.label}
            </div>
          </div>
          <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'10px 12px',color:'#fff',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:'8px'}}>
            <div style={{fontSize:'11px',fontWeight:600,textShadow:'0 1px 3px rgba(0,0,0,0.6)',lineHeight:1.3}}>
              {fmtShort(trip.startDate)} – {fmtShort(trip.endDate)}
              <div style={{fontSize:'10px',fontWeight:500,color:'rgba(255,255,255,0.78)',marginTop:'2px'}}>{daysBetween(trip.startDate,trip.endDate)} ימים</div>
            </div>
            <ChatIcon/>
          </div>
        </>
      )}
      {hovered&&<ChatPopover trip={trip} today={today} onNavigate={()=>onNavigate(trip.id)}/>}
    </div>
  )
}

function ChatLightbox({ trip, today, onClose, onNavigate }) {
  const dLeft = daysLeftFrom(today, trip.startDate)
  const u = urgencyPalette(dLeft)
  const city = (trip.cities&&trip.cities[0]) || ''
  const tripDays = daysBetween(trip.startDate, trip.endDate)

  // Who's coming
  const comps = trip.companions && trip.companions.length
  const withLine = comps
    ? (trip.companions.length === 1
        ? `עם ${trip.companions[0]} 😎`
        : `עם ${trip.companions.join(', ')} — חגיגה 🔥`)
    : 'לבד. חבילה שקטה 🎒'

  const msgLines = [
    { side:'user', text:'היי אחי' },
    { side:'user', text:'מה הראש?' },
    { side:'trip', text:`היי... ${trip.name_he||trip.name}. תחכה לי? 🍆🍑` },
    { side:'user', text:'וואללה, מתי אתה מגיע?' },
    { side:'trip', text:`אני מגיע ל${CITY_HE[city]||heCountry((trip.countries&&trip.countries[0])||'')} בעוד ${dLeft} ימים` },
    { side:'user', text:'אש! כמה זמן תהיה פה?' },
    { side:'trip', text:`אני אהיה שם ${tripDays} ימים` },
    { side:'trip', text:`עד ה־${fmtDate(trip.endDate,{day:'numeric',month:'long'})}` },
    { side:'user', text:'מעולה. מה הראש?' },
    { side:'user', text:'מגיע לבד או חגיגה עם חברים?' },
    { side:'trip', text:withLine },
    { side:'user', text:'מחכה לך 🤙' },
  ]

  const CHAT_USER_BG = '#FFCC1D'
  const CHAT_TRIP_BG = '#66CFFE'
  const CHAT_TEXT    = '#0a0a0a'

  function BubbleLocal({ side, text, delay }) {
    const isUser = side === 'user'
    return (
      <div style={{display:'flex',justifyContent:isUser?'flex-start':'flex-end',animation:`gridchat-bubble-in 260ms ${EASE.out} ${delay}ms both`}}>
        <div style={{maxWidth:'80%',padding:'7px 11px',borderRadius:'14px',background:isUser?CHAT_USER_BG:CHAT_TRIP_BG,color:CHAT_TEXT,fontSize:'13px',lineHeight:1.35,fontWeight:500,borderBottomRightRadius:isUser?'14px':'4px',borderBottomLeftRadius:isUser?'4px':'14px'}}>
          {text}
        </div>
      </div>
    )
  }

  return createPortal(
    <div
      onClick={onClose}
      style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:500,background:'rgba(8,14,28,0.97)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',display:'flex',flexDirection:'column',overflow:'hidden'}}
      dir="rtl"
    >
      {/* Header — click strip navigates to trip */}
      <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'16px 18px 14px',borderBottom:'1px solid rgba(255,255,255,0.08)',flexShrink:0,cursor:'pointer'}} onClick={e=>{e.stopPropagation();onNavigate()}}>
        <div style={{width:'36px',height:'36px',borderRadius:'50%',background:CHAT_TRIP_BG,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:900,color:CHAT_TEXT,flexShrink:0}}>{city.slice(0,1)||'T'}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:'16px',fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{CITY_HE[city]||heCountry((trip.countries&&trip.countries[0])||'')} </div>
          <div style={{fontSize:'11px',color:CHAT_TRIP_BG,display:'flex',alignItems:'center',gap:'4px',marginTop:'1px'}}>
            <span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#4ade80',display:'inline-block'}}/>פעיל
          </div>
        </div>
        <div style={{padding:'3px 10px',borderRadius:'999px',background:u.num,color:'#0f172a',fontSize:'12px',fontWeight:800,flexShrink:0}}>{dLeft>0?`-${dLeft}ד`:u.label}</div>
        <button onClick={e=>{e.stopPropagation();onClose()}} style={{width:'36px',height:'36px',borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'white',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>✕</button>
      </div>

      {/* Bubbles */}
      <div onClick={e=>e.stopPropagation()} style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'flex-end',gap:'6px',padding:'12px 16px',overflow:'hidden'}}>
        {msgLines.map((l,i)=><BubbleLocal key={i} side={l.side} text={l.text} delay={i*60}/>)}
      </div>

      {/* Footer */}
      <div onClick={e=>e.stopPropagation()} style={{padding:'12px 18px',borderTop:'1px solid rgba(255,255,255,0.08)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <div style={{fontSize:'12px',color:'#64748b'}}>{fmtDate(trip.startDate,{day:'numeric',month:'long'})} – {fmtDate(trip.endDate,{day:'numeric',month:'long',year:'numeric'})}</div>
        <div style={{fontSize:'14px',fontWeight:800,color:u.num}}>{tripDays} ימים</div>
      </div>
    </div>,
    document.body
  )
}




// Splash icon from sweat-droplets-svgrepo-com.svg — purple
function SplashIcon({ size = 14, color = '#a855f7' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill={color} d="M22.855.758L7.875 7.024l12.537 9.733c2.633 2.224 6.377 2.937 9.77 1.518c4.826-2.018 7.096-7.576 5.072-12.413C33.232 1.024 27.68-1.261 22.855.758zm-9.962 17.924L2.05 10.284L.137 23.529a7.993 7.993 0 0 0 2.958 7.803a8.001 8.001 0 0 0 9.798-12.65zm15.339 7.015l-8.156-4.69l-.033 9.223c-.088 2 .904 3.98 2.75 5.041a5.462 5.462 0 0 0 7.479-2.051c1.499-2.644.589-6.013-2.04-7.523z"/>
    </svg>
  )
}

function GridReveal({ trips, currentTrip, today, onTripClick }) {
  const sorted = [...trips].sort((a,b)=>a.startDate.localeCompare(b.startDate))
  const [hoverId, setHoverId] = useState(null)
  const [lightboxId, setLightboxId] = useState(null)
  const peoplePick = useState(()=>{
    const pool=[...PEOPLE]; const out=[]
    const n=Math.min(sorted.length,pool.length)
    for(let i=0;i<n;i++){const j=Math.floor(Math.random()*pool.length);out.push(pool.splice(j,1)[0])}
    while(out.length<sorted.length) out.push(PEOPLE[out.length%PEOPLE.length])
    return out
  })[0]
  const lightboxTrip = lightboxId ? sorted.find(t=>t.id===lightboxId) : null

  // Current trip card — navigates directly, no chat
  const CurrentTripTile = currentTrip ? (() => {
    const city    = (currentTrip.cities&&currentTrip.cities[0]) || ''
    const country = (currentTrip.countries&&currentTrip.countries[0]) || ''
    const photo   = destImage(currentTrip)
    const back    = destBackdrop(currentTrip)
    const isMobile = useIsMobile()
    return (
      <div
        onClick={() => onTripClick(currentTrip.id)}
        style={{
          position:'relative', aspectRatio:'3/4', borderRadius:'16px',
          overflow:'hidden', cursor:'pointer',
          background: photo ? '#0b1222' : back.background,
          // Yellow outline — same as isNearest upcoming
          boxShadow: `0 2px 10px rgba(0,0,0,0.4), 0 0 0 3px #FFCC1D, 0 0 18px rgba(255,204,29,0.35)`,
          isolation:'isolate',
        }}
      >
        {/* Background image */}
        {photo && (
          <img src={photo} alt="" style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'center',opacity:0.85 }}/>
        )}
        {!photo && (
          <div style={{ position:'absolute',inset:0,background:back.gradient||back.background }}/>
        )}
        {/* Gradient overlay */}
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,0.45) 0%,rgba(0,0,0,0) 35%,rgba(0,0,0,0) 65%,rgba(0,0,0,0.55) 100%)',pointerEvents:'none' }}/>

        {/* Content */}
        {isMobile ? (
          <>
            <div style={{ position:'absolute',top:0,left:0,right:0,padding:'10px 12px',color:'#fff' }}>
              <div style={{ fontSize:'13px',fontWeight:700,textShadow:'0 1px 3px rgba(0,0,0,0.5)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                {(CITY_HE[city]||city)||heCountry(country)}
              </div>
            </div>
            <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'8px 12px',color:'#fff' }}>
              <div style={{ display:'inline-flex',alignItems:'center',gap:'4px',marginBottom:'4px' }}>
                <SplashIcon size={13} color="#c084fc"/>
                <span style={{ fontSize:'11px',fontWeight:800,color:'#c084fc',textShadow:'0 1px 4px rgba(0,0,0,0.5)',letterSpacing:'0.04em' }}>עכשיו</span>
              </div>
              <div style={{ fontSize:'11px',fontWeight:600,textShadow:'0 1px 3px rgba(0,0,0,0.6)' }}>
                {fmtShort(currentTrip.startDate)} – {fmtShort(currentTrip.endDate)}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ position:'absolute',top:0,left:0,right:0,padding:'10px 12px',color:'#fff' }}>
              <div style={{ display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',fontWeight:700,textShadow:'0 1px 3px rgba(0,0,0,0.5)' }}>
                <span style={{ whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{(CITY_HE[city]||city)||heCountry(country)}</span>
              </div>
              <div style={{ fontSize:'10.5px',color:'rgba(255,255,255,0.78)',marginTop:'2px',fontFamily:'ui-monospace,Menlo,monospace' }}>{handleFor(currentTrip)}</div>
            </div>
            <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'10px 12px',color:'#fff' }}>
              <div style={{ display:'inline-flex',alignItems:'center',gap:'5px',marginBottom:'5px' }}>
                <SplashIcon size={15} color="#c084fc"/>
                <span style={{ fontSize:'12px',fontWeight:800,color:'#c084fc',textShadow:'0 1px 4px rgba(0,0,0,0.6)',letterSpacing:'0.04em' }}>עכשיו</span>
              </div>
              <div style={{ fontSize:'11px',fontWeight:600,textShadow:'0 1px 3px rgba(0,0,0,0.6)',lineHeight:1.3 }}>
                {fmtShort(currentTrip.startDate)} – {fmtShort(currentTrip.endDate)}
                <div style={{ fontSize:'10px',fontWeight:500,color:'rgba(255,255,255,0.78)',marginTop:'2px' }}>{daysBetween(currentTrip.startDate,currentTrip.endDate)} ימים</div>
              </div>
            </div>
          </>
        )}
      </div>
    )
  })() : null

  return (
    <section style={{marginBottom:'48px'}} dir="rtl">
      <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'2px',color:'#64748b',marginBottom:'16px',textTransform:'uppercase',animation:`tv-fade-up 440ms ${EASE.out} 100ms both`}}>
        קרובים
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',animation:`tv-fade-up 520ms ${EASE.out} 120ms both`}}>
        {/* Current trip — always first, direct navigate */}
        {CurrentTripTile}
        {sorted.map((t,i)=>(
          <GridTile key={t.id} trip={t} today={today} idx={i}
            personSrc={peoplePick[i]}
            hovered={hoverId===t.id}
            isNearest={!currentTrip && i===0}
            onEnter={()=>setHoverId(t.id)}
            onLeave={()=>setHoverId(prev=>prev===t.id?null:prev)}
            onTap={()=>setLightboxId(t.id)}
            onNavigate={onTripClick}
          />
        ))}
      </div>
      <div style={{fontSize:'11px',color:'#64748b',marginTop:'14px',textAlign:'center',letterSpacing:'0.4px'}}>
        רחף מעל יעד לשיחה · לחץ בנייד לפתוח
      </div>
      {lightboxTrip&&<ChatLightbox trip={lightboxTrip} today={today} onClose={()=>setLightboxId(null)} onNavigate={()=>{setLightboxId(null);onTripClick(lightboxTrip.id)}}/>}
    </section>
  )
}



export default function Travels({ session }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showTripit, setShowTripit] = useState(false)
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  async function loadTrips() {
    const [tripsRes, flightsRes, lodgingRes] = await Promise.all([
      supabase.from('trips').select(`id, name, name_he, trip_segments(date_from, date_to, city, country, continent, segment_companions(companions(name)))`),
      supabase.from('flights').select('trip_id'),
      supabase.from('lodging').select('trip_id'),
    ])
    const tripsWithFlights = new Set((flightsRes.data || []).map(f => f.trip_id))
    const tripsWithLodging = new Set((lodgingRes.data || []).map(l => l.trip_id))
    if (tripsRes.data) {
      const enriched = tripsRes.data.map(t => {
        const segs = t.trip_segments || []
        const dates = segs.map(s => s.date_from).filter(Boolean).sort()
        const ends = segs.map(s => s.date_to).filter(Boolean).sort()
        return {
          ...t,
          startDate: dates[0] || null,
          endDate: ends[ends.length - 1] || null,
          cities: [...new Set(segs.map(s => s.city).filter(Boolean))],
          countries: [...new Set(segs.map(s => s.country).filter(Boolean))],
          continents: [...new Set(segs.map(s => s.continent).filter(Boolean))],
          companions: [...new Set(segs.flatMap(s => s.segment_companions?.map(sc => sc.companions?.name) || []).filter(Boolean))],
          hasFlights: tripsWithFlights.has(t.id),
          hasLodging: tripsWithLodging.has(t.id),
        }
      }).filter(t => t.startDate).sort((a, b) => a.startDate.localeCompare(b.startDate))
      setTrips(enriched)
    }
    setLoading(false)
  }

  useEffect(() => { loadTrips() }, [])

  const past = trips.filter(t => t.endDate && t.endDate < today)
  const currentTrip = trips.find(t => t.startDate <= today && t.endDate >= today) || null
  const upcoming = trips.filter(t => t.startDate > today)
  const totalDays = past.reduce((acc, t) => acc + (daysBetween(t.startDate, t.endDate) || 0), 0)
  const countries = new Set(trips.flatMap(t => t.countries)).size

  function matchesSearch(t, q) {
    if (!q) return true
    const ql = q.toLowerCase()
    const enTerm = (HE_TO_EN[q] || '').toLowerCase()
    const all = [t.name_he || '', t.name || '', ...t.countries, ...t.countries.map(heCountry), ...t.cities, ...t.cities.map(c => CITY_HE[c] || c), ...t.companions].join(' ').toLowerCase()
    return all.includes(ql) || (enTerm && all.includes(enTerm))
  }

  const q = search.trim()
  const filtered = q ? past.filter(t => matchesSearch(t, q)) : null
  const displayList = (filtered ? [...filtered] : [...past]).reverse()

  const stats = [
    { v: past.length, l: 'טיולים', accent: false },
    { v: countries, l: 'מדינות', accent: false },
    { v: Math.round(totalDays), l: 'ימים בחו״ל', accent: false },
    { v: upcoming.length, l: 'קרובים', accent: true },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      fontFamily: T.font,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{KEYFRAMES}</style>
      {showAdd && <AddTripModal onClose={() => setShowAdd(false)} onCreated={loadTrips} />}
      {showTripit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', zIndex: 200 }} onClick={() => setShowTripit(false)}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', width: '540px', maxWidth: '95vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#e2e8f0' }}>ייבא טיול מ-TripIt</h3>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }} onClick={() => setShowTripit(false)}>✕</button>
            </div>
            <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#93c5fd', lineHeight: 1.6 }}>
              <strong>איך ייבאים?</strong><br/>
              פתח טיול ב-TripIt → לחץ Print → בחר הכל (Cmd+A) → העתק (Cmd+C) → הדבק כאן.<br/>
              <span style={{ color: '#64748b', fontSize: '12px' }}>הטיול ייווצר אוטומטית עם כל הטיסות והמלונות.</span>
            </div>
            <TripItImportWithTrip onClose={() => setShowTripit(false)} onCreated={loadTrips} />
          </div>
        </div>
      )}

      {/* Floating gradient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%', width: '500px', height: '500px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          animation: `tv-blob1 28s ${EASE.inOut} infinite`, filter: 'blur(40px)',
          willChange: 'transform',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-10%', width: '600px', height: '600px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
          animation: `tv-blob2 32s ${EASE.inOut} infinite`, filter: 'blur(40px)',
          willChange: 'transform',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '30%', width: '400px', height: '400px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)',
          animation: `tv-blob3 30s ${EASE.inOut} infinite`, filter: 'blur(40px)',
          willChange: 'transform',
        }} />
        {/* Noise texture overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat', opacity: 0.5,
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <BaronsHeader
          title="נסיעות"
          subtitle="יומן הטיולים שלי"
          breadcrumbs={[{ label: 'נסיעות', path: '/travels' }]}
          actions={[
            { label: 'יעדים', onClick: () => navigate('/countries') },
            { label: 'סטטיסטיקות', onClick: () => navigate('/stats') },
            { label: '📋 TripIt', onClick: () => setShowTripit(true) },
            { label: '+ טיול', onClick: () => setShowAdd(true), primary: true }
          ]}
        />

        <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

          {/* Title */}
          <div className="toolbar" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '28px', flexWrap: 'wrap', gap: '14px',
            animation: `tv-fade-up 480ms ${EASE.out} both`,
          }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: T.text, letterSpacing: '-0.3px', margin: 0 }}>הנסיעות שלי</h1>
          </div>

          {/* STATS HERO — Days + Upcoming */}
          <section className="hero-stats">
            <div className="hero-card hero-featured">
              <div className="featured-label">סה״כ בחו״ל</div>
              <div className="featured-value">
                <span className="featured-num">{Math.round(totalDays)}</span>
                <span className="featured-unit">ימים</span>
              </div>
              <div style={{ fontSize:'11px', color:'#64748b', marginTop:'2px', marginBottom:'4px', letterSpacing:'0.01em' }}>
                מתוך {Math.floor((new Date() - new Date('1980-02-03')) / 86400000).toLocaleString('he-IL')} ימים שאני חי
              </div>
              <div className="featured-caption">
                <b>{past.length}</b> טיולים · <b>{countries}</b> מדינות · <b>{new Set(past.flatMap(t => t.continents)).size}</b> יבשות
              </div>
            </div>

            <div className="hero-upcoming">
              <div className="up-head">
                <span className="up-label">קרובים</span>
                {upcoming.length > 0 && (
                  <span className="up-live"><span className="dot"/>בדרך</span>
                )}
              </div>
              <div className="up-body">
                <span className="up-num">{upcoming.length}</span>
                <span className="up-num-label">טיסות</span>
              </div>
              <div className="up-foot">
                {upcoming.length > 0
                  ? <>הטיסה הבאה — <b>{upcoming[0].name_he || upcoming[0].name}</b> בעוד <b>{Math.max(0, daysBetween(today, upcoming[0].startDate))}</b> ימים</>
                  : <span style={{ color: '#94a3b8', fontWeight: 500 }}>אין טיסות מתוכננות</span>
                }
              </div>
            </div>
          </section>

          {/* Loading skeleton */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  height: '80px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)',
                  border: T.glassBorder, overflow: 'hidden', position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
                    filter: 'blur(0.5px)',
                    animation: `tv-shimmer 1.2s ${EASE.inOut} infinite`,
                  }} />
                </div>
              ))}
            </div>
          ) : (
            <div
              key={q || 'all'}
              style={{ animation: `tv-fade-blur-in 360ms ${EASE.out} both` }}
            >
              {/* Upcoming section — GridReveal v11 */}
              {(upcoming.length > 0 || currentTrip) && !q && (
                <GridReveal trips={upcoming} currentTrip={currentTrip} today={today} onTripClick={id => navigate(`/travels/${id}`)} />
              )}

              {/* Past trips — redesigned year-grouped panel */}
              <section style={{
                marginBottom: '36px',
                animation: `tv-fade-up 480ms ${EASE.out} ${upcoming.length > 0 && !q ? 240 : 100}ms both`,
              }}>
                <div className="trips-panel">
                  <div className="panel-head">
                    <div className="panel-head-title">
                      <h2>{q ? 'תוצאות חיפוש' : 'כל הטיולים'}</h2>
                      <span className="panel-count">{displayList.length}</span>
                    </div>
                    <div className="panel-search-wrap">
                      <div className="panel-search">
                        <span className="icon">&#9740;</span>
                        <input
                          placeholder="חיפוש -- עברית או אנגלית..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                        />
                      </div>
                      <button className="btn-advanced-sm" onClick={() => navigate('/search')}>
                        חיפוש מתקדם
                      </button>
                    </div>
                  </div>

                  {/* Desktop header row */}
                  <div className="trip-row header">
                    <span>תאריכים</span>
                    <span className="hide-tablet">שם הטיול · יעדים</span>
                    <span>מדינות</span>
                    <span className="hide-tablet">נסעו איתי</span>
                    <span style={{ textAlign: 'center' }}>ימים</span>
                  </div>

                  {displayList.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: `tv-fade-up 440ms ${EASE.out} both` }}>
                      <EmptyIcon />
                      <div style={{ fontSize: '15px', color: T.textDim, fontWeight: 500 }}>לא נמצאו תוצאות</div>
                    </div>
                  ) : (
                    (() => {
                      const byYear = {}
                      displayList.forEach(t => {
                        const y = String(t.startDate).slice(0, 4)
                        if (!byYear[y]) byYear[y] = []
                        byYear[y].push(t)
                      })
                      const years = Object.entries(byYear).sort((a, b) => b[0].localeCompare(a[0]))
                      return years.map(([year, yearTrips]) => {
                        const yearDays = yearTrips.reduce((a, t) => a + (daysBetween(t.startDate, t.endDate) || 0), 0)
                        const yearCountries = new Set(yearTrips.flatMap(t => t.countries)).size
                        return (
                          <div key={year}>
                            <div className="year-divider">
                              <span className="year-label">{year}</span>
                              <span className="year-meta">
                                <strong>{yearTrips.length}</strong> טיולים
                                <span className="dot"/>
                                <strong>{yearCountries}</strong> מדינות
                                <span className="dot"/>
                                <strong>{yearDays}</strong> ימים
                              </span>
                              <span className="year-line"/>
                            </div>
                            <div className="year-divider-mobile">
                              <span className="year-label-m">{year}</span>
                              <span className="year-meta-m">{yearTrips.length} טיולים · {yearDays} ימים</span>
                            </div>
                            {yearTrips.map(t => {
                              const days = daysBetween(t.startDate, t.endDate) || 0
                              const cc = contColor(t.continents[0])
                              const cities = t.cities.slice(0, 3).map(c => CITY_HE[c] || c).join(' · ')
                              const daysClass = days > 14 ? 'long' : days > 7 ? 'mid' : ''
                              const compsDisplay = t.companions.slice(0, 3).join(', ')
                              const moreComps = t.companions.length > 3 ? ` +${t.companions.length - 3}` : ''
                              return (
                                <React.Fragment key={t.id}>
                                  {/* DESKTOP */}
                                  <div
                                    className="trip-row"
                                    style={{ '--cont-color': cc }}
                                    onClick={() => navigate(`/travels/${t.id}`)}
                                  >
                                    <div className="row-dates">
                                      <div className="row-date-range">
                                        {fmtShort(t.startDate)}
                                        <span className="arrow">←</span>
                                        {fmtShort(t.endDate)}
                                      </div>
                                      <div className="row-date-year">{String(t.startDate).slice(0, 4)}</div>
                                    </div>
                                    <div className="row-title hide-tablet">
                                      <div className="row-title-main">
                                        <span className="flag"/>
                                        {t.name_he || t.name}
                                      </div>
                                      {cities && <div className="row-title-sub">{cities}</div>}
                                    </div>
                                    <div className="row-countries">
                                      {t.countries.map(c => (
                                        <span key={c} className="country-pill">{heCountry(c)}</span>
                                      ))}
                                    </div>
                                    <div className={`row-comp-names hide-tablet ${t.companions.length === 0 ? 'empty' : ''}`}>
                                      {t.companions.length > 0
                                        ? <>{compsDisplay}{moreComps && <span className="more">{moreComps}</span>}</>
                                        : 'לבד'
                                      }
                                    </div>
                                    <div className="row-days">
                                      <div className={`days-num ${daysClass}`}>{days}</div>
                                      <div className="days-label">ימים</div>
                                    </div>
                                  </div>

                                  {/* MOBILE CARD */}
                                  <div
                                    className="trip-card-mobile"
                                    style={{ '--cont-color': cc }}
                                    onClick={() => navigate(`/travels/${t.id}`)}
                                  >
                                    <div className="m-top">
                                      <div className="m-title">{t.name_he || t.name}</div>
                                      <div className={`m-days ${days > 14 ? 'long' : ''}`}>
                                        <span className="n">{days}</span>
                                        <span className="u">ימים</span>
                                      </div>
                                    </div>
                                    <div className="m-dates">
                                      <span>{fmtShort(t.startDate)}</span>
                                      <span className="arrow">←</span>
                                      <span>{fmtShort(t.endDate)}</span>
                                      <span className="year-tag">{String(t.startDate).slice(0, 4)}</span>
                                    </div>
                                    <div className="m-tags">
                                      {t.countries.slice(0, 3).map(c => (
                                        <span key={c} className="m-tag">{heCountry(c)}</span>
                                      ))}
                                      {t.countries.length > 3 && <span className="m-tag more">+{t.countries.length - 3}</span>}
                                      {t.companions.length > 0 ? (
                                        <span className="m-tag comp">
                                          {t.companions.slice(0, 3).join(', ')}
                                          {t.companions.length > 3 ? ` +${t.companions.length - 3}` : ''}
                                        </span>
                                      ) : (
                                        <span className="m-tag" style={{ color: '#64748b' }}>לבד</span>
                                      )}
                                      {!t.hasFlights && <span className="m-tag warn-flights">אין טיסות</span>}
                                    </div>
                                  </div>
                                </React.Fragment>
                              )
                            })}
                          </div>
                        )
                      })
                    })()
                  )}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
