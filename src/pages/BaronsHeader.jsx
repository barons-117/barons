import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const FONT = "'Open Sans Hebrew', 'Open Sans', sans-serif"

/* ── Emil Kowalski-inspired style sheet ──
   Injected once into <head>. Contains:
   - Custom easing tokens
   - Keyframes for subtle border glow pulse
   - Tactile :active feedback for every interactive element
   - Hover effects gated to (hover:hover) and (pointer:fine)
   - Motion gated to prefers-reduced-motion: no-preference
*/
const BH_STYLE_ID = 'barons-header-emil-styles'
const BH_CSS = `
:root {
  --bh-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --bh-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --bh-ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}

@keyframes bh-border-pulse {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 0.9;  }
}

.bh-header {
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: saturate(140%) blur(10px);
  -webkit-backdrop-filter: saturate(140%) blur(10px);
  transition: box-shadow 260ms var(--bh-ease-out);
}
.bh-header::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: -1px;
  height: 1px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent 0%, var(--bh-glow) 50%, transparent 100%);
}
@media (prefers-reduced-motion: no-preference) {
  .bh-header::after {
    animation: bh-border-pulse 6s ease-in-out infinite;
  }
}

/* ── Buttons: base tactile response ── */
.bh-btn {
  -webkit-tap-highlight-color: transparent;
  will-change: transform;
  transition:
    transform 160ms var(--bh-ease-out),
    background 200ms var(--bh-ease-out),
    border-color 200ms var(--bh-ease-out),
    color 200ms var(--bh-ease-out),
    box-shadow 220ms var(--bh-ease-out);
}
.bh-btn:active {
  transform: scale(0.97);
  transition-duration: 120ms;
}

/* ── Action buttons ── */
.bh-action:active { box-shadow: none; }
@media (hover: hover) and (pointer: fine) {
  .bh-action-regular-dark:hover {
    background: rgba(255,255,255,0.13);
    border-color: rgba(255,255,255,0.22);
    color: rgba(255,255,255,0.95);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px -6px rgba(0,0,0,0.4);
  }
  .bh-action-regular-light:hover {
    background: #eaecf1;
    border-color: #cbd5e1;
    color: #0f172a;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px -8px rgba(15,23,42,0.2);
  }
  .bh-action-gold-dark:hover {
    background: rgba(245,158,11,0.22);
    border-color: rgba(245,158,11,0.5);
    color: #fcd34d;
    transform: translateY(-1px);
    box-shadow: 0 4px 18px -6px rgba(245,158,11,0.45);
  }
  .bh-action-gold-light:hover {
    background: #fef9c3;
    border-color: #fcd34d;
    color: #78350f;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px -6px rgba(245,158,11,0.3);
  }
  .bh-action-primary-dark:hover {
    background: rgba(37,99,235,0.5);
    border-color: rgba(96,165,250,0.7);
    color: #dbeafe;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px -6px rgba(37,99,235,0.7);
  }
  .bh-action-primary-light:hover {
    background: #dbeafe;
    border-color: #93c5fd;
    color: #1e3a8a;
    transform: translateY(-1px);
    box-shadow: 0 6px 18px -6px rgba(37,99,235,0.35);
  }
  .bh-logout-dark:hover {
    background: rgba(239,68,68,0.15);
    border-color: rgba(239,68,68,0.4);
    color: #fca5a5;
    transform: translateY(-1px);
  }
  .bh-logout-light:hover {
    background: #fef2f2;
    border-color: #fecaca;
    color: #b91c1c;
    transform: translateY(-1px);
  }
}

/* ── Breadcrumb buttons ── */
.bh-crumb {
  -webkit-tap-highlight-color: transparent;
  transition:
    color 200ms var(--bh-ease-out),
    transform 160ms var(--bh-ease-out);
}
.bh-crumb:active { transform: scale(0.97); }
@media (hover: hover) and (pointer: fine) {
  .bh-crumb-dark:hover  { color: rgba(255,255,255,0.92); transform: translateY(-1px); }
  .bh-crumb-light:hover { color: #0f172a; transform: translateY(-1px); }
}

/* ── Hamburger ── */
.bh-ham {
  -webkit-tap-highlight-color: transparent;
  transition: transform 200ms var(--bh-ease-out);
}
.bh-ham:active { transform: scale(0.95) rotate(-3deg); }
.bh-ham-line {
  transition:
    transform 260ms var(--bh-ease-in-out),
    background 220ms var(--bh-ease-out),
    width 260ms var(--bh-ease-in-out);
  transform-origin: center;
}
@media (hover: hover) and (pointer: fine) {
  .bh-ham:hover .bh-ham-line:nth-child(1) { transform: translateX(-2px) scaleX(1.15); }
  .bh-ham:hover .bh-ham-line:nth-child(2) { transform: scaleX(1.25); }
  .bh-ham:hover .bh-ham-line:nth-child(3) { transform: translateX(2px) scaleX(1.15); }
  .bh-ham-dark:hover .bh-ham-line  { background: rgba(255,255,255,0.85); }
  .bh-ham-light:hover .bh-ham-line { background: #0f172a; }
}

/* ── Tabs ── */
.bh-tabs-wrap {
  position: relative;
  display: flex;
  gap: 0;
  padding: 0 14px;
  overflow-x: auto;
  scrollbar-width: none;
}
.bh-tabs-wrap::-webkit-scrollbar { display: none; }

.bh-tab {
  position: relative;
  -webkit-tap-highlight-color: transparent;
  transition:
    color 220ms var(--bh-ease-out),
    background 220ms var(--bh-ease-out),
    transform 160ms var(--bh-ease-out);
  border-radius: 6px 6px 0 0;
}
.bh-tab:active { transform: scale(0.97); }
@media (hover: hover) and (pointer: fine) {
  .bh-tab-dark:not(.is-active):hover {
    color: rgba(255,255,255,0.78);
    background: rgba(255,255,255,0.04);
    transform: translateY(-1px);
  }
  .bh-tab-light:not(.is-active):hover {
    color: #1e293b;
    background: rgba(15,23,42,0.035);
    transform: translateY(-1px);
  }
}

.bh-tab-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  border-radius: 2px 2px 0 0;
  transform: translateX(0);
  transition:
    transform 260ms var(--bh-ease-in-out),
    width 260ms var(--bh-ease-in-out),
    opacity 220ms var(--bh-ease-out),
    background 220ms var(--bh-ease-out);
  pointer-events: none;
  will-change: transform, width;
}
@media (prefers-reduced-motion: reduce) {
  .bh-tab-indicator { transition: opacity 0ms, background 0ms; }
}

/* ── Title ── */
.bh-title-dark {
  background: linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.82) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 40px rgba(255,255,255,0.06);
}
`

function ensureStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(BH_STYLE_ID)) return
  const el = document.createElement('style')
  el.id = BH_STYLE_ID
  el.textContent = BH_CSS
  document.head.appendChild(el)
}

export default function BaronsHeader({
  title,
  subtitle,
  breadcrumbs = [],
  tabs = [],
  activeTab,
  onTab,
  actions = [],
  onDrawer,
  variant = 'dark',
  session,
}) {
  const navigate = useNavigate()
  const isLight = variant === 'light'

  /* Inject styles once */
  ensureStyles()

  /* ── Design tokens (preserved structure) ── */
  const dark = {
    wrap:          { background:'rgba(11,22,40,0.88)', fontFamily:FONT, borderBottom:'1px solid rgba(255,255,255,0.07)', '--bh-glow':'rgba(245,158,11,0.35)' },
    topRow:        { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 18px 7px' },
    crumb:         { fontSize:12, color:'rgba(255,255,255,0.5)', fontWeight:500, background:'none', border:'none', cursor:'pointer', fontFamily:FONT, padding:'2px 2px', letterSpacing:'0.1px' },
    crumbSep:      { fontSize:11, color:'rgba(255,255,255,0.2)', margin:'0 5px' },
    crumbActive:   { fontSize:12, color:'rgba(255,255,255,0.9)', fontWeight:600 },
    titleRow:      { padding:'8px 18px 10px', display:'flex', alignItems:'center', gap:10 },
    titleText:     { fontSize:18, fontWeight:800, color:'#ffffff', lineHeight:1.15, letterSpacing:'-0.3px' },
    subtitle:      { fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:2, fontWeight:400, letterSpacing:'0.2px' },
    actionBtn:     { background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.8)', fontSize:11, borderRadius:20, padding:'5px 13px', cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap', fontWeight:600, letterSpacing:'0.1px' },
    actionGold:    { background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.35)', color:'#fbbf24', fontSize:11, borderRadius:20, padding:'5px 13px', cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap', fontWeight:600 },
    actionPrimary: { background:'rgba(37,99,235,0.35)', border:'1px solid rgba(37,99,235,0.55)', color:'#93c5fd', fontSize:11, borderRadius:20, padding:'5px 13px', cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap', fontWeight:600, boxShadow:'0 2px 10px -4px rgba(37,99,235,0.4)' },
    tabsWrap:      { borderTop:'1px solid rgba(255,255,255,0.06)' },
    tab:           { fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.45)', padding:'9px 15px', whiteSpace:'nowrap', cursor:'pointer', background:'none', border:'none', fontFamily:FONT, letterSpacing:'0.1px' },
    tabActiveColor:'rgba(255,255,255,0.95)',
    indicatorColor:'#f59e0b',
    ham:           { display:'flex', flexDirection:'column', gap:4, cursor:'pointer', padding:'4px', background:'none', border:'none' },
    hamLine:       { display:'block', width:16, height:1.5, background:'rgba(255,255,255,0.45)', borderRadius:2 },
  }

  const light = {
    wrap:          { background:'rgba(255,255,255,0.9)', fontFamily:FONT, borderBottom:'1px solid #e8ecf2', '--bh-glow':'rgba(37,99,235,0.22)' },
    topRow:        { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 18px 7px', borderBottom:'1px solid #f4f6f9' },
    crumb:         { fontSize:12, color:'#94a3b8', fontWeight:500, background:'none', border:'none', cursor:'pointer', fontFamily:FONT, padding:'2px 2px', letterSpacing:'0.1px' },
    crumbSep:      { fontSize:11, color:'#d1d9e6', margin:'0 5px' },
    crumbActive:   { fontSize:12, color:'#18181b', fontWeight:600 },
    titleRow:      { padding:'8px 18px 10px', display:'flex', alignItems:'center', gap:10 },
    titleText:     { fontSize:18, fontWeight:800, color:'#0b1628', lineHeight:1.15, letterSpacing:'-0.3px' },
    subtitle:      { fontSize:11, color:'#94a3b8', marginTop:2, fontWeight:400, letterSpacing:'0.2px' },
    actionBtn:     { background:'#f4f6f9', border:'1px solid #e2e8f0', color:'#475569', fontSize:11, borderRadius:20, padding:'5px 13px', cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap', fontWeight:600, letterSpacing:'0.1px' },
    actionGold:    { background:'#fefce8', border:'1px solid #fde68a', color:'#92400e', fontSize:11, borderRadius:20, padding:'5px 13px', cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap', fontWeight:600 },
    actionPrimary: { background:'#eff6ff', border:'1px solid #bfdbfe', color:'#1d4ed8', fontSize:11, borderRadius:20, padding:'5px 13px', cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap', fontWeight:600, boxShadow:'0 2px 10px -6px rgba(37,99,235,0.3)' },
    tabsWrap:      { borderTop:'1px solid #f4f6f9' },
    tab:           { fontSize:12, fontWeight:600, color:'#94a3b8', padding:'9px 15px', whiteSpace:'nowrap', cursor:'pointer', background:'none', border:'none', fontFamily:FONT, letterSpacing:'0.1px' },
    tabActiveColor:'#0b1628',
    indicatorColor:'#2563eb',
    ham:           { display:'flex', flexDirection:'column', gap:4, cursor:'pointer', padding:'4px', background:'none', border:'none' },
    hamLine:       { display:'block', width:16, height:1.5, background:'#94a3b8', borderRadius:2 },
  }

  const st = isLight ? light : dark

  /* ── Tab indicator measurement (sliding underline) ── */
  const tabsWrapRef = useRef(null)
  const tabRefs = useRef({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false })

  useEffect(() => {
    if (!tabs.length) return
    const wrap = tabsWrapRef.current
    const node = tabRefs.current[activeTab]
    if (!wrap || !node) {
      setIndicator(prev => ({ ...prev, visible: false }))
      return
    }
    const wrapRect = wrap.getBoundingClientRect()
    const nodeRect = node.getBoundingClientRect()
    // account for horizontal scroll inside wrap
    const left = (nodeRect.left - wrapRect.left) + wrap.scrollLeft
    setIndicator({ left, width: nodeRect.width, visible: true })
  }, [activeTab, tabs, isLight])

  function getActionStyle(a) {
    if (a.gold)    return st.actionGold
    if (a.primary) return st.actionPrimary
    return st.actionBtn
  }
  function getActionClass(a) {
    const variantKey = isLight ? 'light' : 'dark'
    if (a.gold)    return `bh-btn bh-action bh-action-gold-${variantKey}`
    if (a.primary) return `bh-btn bh-action bh-action-primary-${variantKey}`
    return `bh-btn bh-action bh-action-regular-${variantKey}`
  }

  return (
    <header className="bh-header" style={st.wrap}>

      {/* Top row: breadcrumbs + actions */}
      <div style={st.topRow}>
        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
          {onDrawer && (
            <button
              type="button"
              className={`bh-ham ${isLight ? 'bh-ham-light' : 'bh-ham-dark'}`}
              style={st.ham}
              onClick={onDrawer}
              aria-label="תפריט"
            >
              <span className="bh-ham-line" style={st.hamLine} />
              <span className="bh-ham-line" style={st.hamLine} />
              <span className="bh-ham-line" style={st.hamLine} />
            </button>
          )}
          <nav style={{ display:'flex', alignItems:'center', flexWrap:'nowrap', overflow:'hidden' }}>
            <button
              type="button"
              className={`bh-crumb ${isLight ? 'bh-crumb-light' : 'bh-crumb-dark'}`}
              style={st.crumb}
              onClick={() => navigate('/')}
            >
              BARONS
            </button>
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1
              return (
                <span key={i} style={{ display:'flex', alignItems:'center' }}>
                  <span style={st.crumbSep}>›</span>
                  {isLast ? (
                    <span style={st.crumbActive}>{crumb.label}</span>
                  ) : (
                    <button
                      type="button"
                      className={`bh-crumb ${isLight ? 'bh-crumb-light' : 'bh-crumb-dark'}`}
                      style={st.crumb}
                      onClick={() => crumb.path && navigate(crumb.path)}
                    >
                      {crumb.label}
                    </button>
                  )}
                </span>
              )
            })}
          </nav>
        </div>

        <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
          {actions.map((a, i) => (
            <button
              key={i}
              type="button"
              className={getActionClass(a)}
              style={getActionStyle(a)}
              onClick={e => { e.preventDefault(); e.stopPropagation(); a.onClick && a.onClick(e) }}
            >
              {a.label}
            </button>
          ))}
          {session && (
            <button
              type="button"
              className={`bh-btn bh-action ${isLight ? 'bh-logout-light' : 'bh-logout-dark'}`}
              style={st.actionBtn}
              onClick={async () => { await supabase.auth.signOut() }}
            >
              יציאה
            </button>
          )}
        </div>
      </div>

      {/* Title row */}
      {(title || subtitle) && (
        <div style={st.titleRow}>
          <div style={{ flex:1, minWidth:0 }}>
            {title && (
              <div
                className={isLight ? '' : 'bh-title-dark'}
                style={st.titleText}
              >
                {title}
              </div>
            )}
            {subtitle && <div style={st.subtitle}>{subtitle}</div>}
          </div>
        </div>
      )}

      {/* Tabs with sliding underline indicator */}
      {tabs.length > 0 && (
        <div ref={tabsWrapRef} className="bh-tabs-wrap" style={st.tabsWrap}>
          {tabs.map(t => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                ref={el => { if (el) tabRefs.current[t.id] = el; else delete tabRefs.current[t.id] }}
                type="button"
                className={`bh-btn bh-tab ${isLight ? 'bh-tab-light' : 'bh-tab-dark'} ${active ? 'is-active' : ''}`}
                style={{
                  ...st.tab,
                  color: active ? st.tabActiveColor : st.tab.color,
                }}
                onClick={() => onTab && onTab(t.id)}
              >
                {t.label}
              </button>
            )
          })}
          <span
            className="bh-tab-indicator"
            style={{
              background: st.indicatorColor,
              transform: `translateX(${indicator.left}px)`,
              width: indicator.width,
              opacity: indicator.visible ? 1 : 0,
            }}
          />
        </div>
      )}
    </header>
  )
}
