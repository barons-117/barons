/* Shared tokens, helpers, and CSS keyframes used by all upcoming-section variants. */

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
  font: 'Heebo, "Open Sans", sans-serif',
};

const EASE = {
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
};

const CONT_COLORS = {
  'אירופה': '#3b82f6', 'אסיה': '#f59e0b', 'צפון אמריקה': '#10b981',
  'דרום אמריקה': '#14b8a6', 'אפריקה': '#ef4444', 'אוקיאניה': '#8b5cf6',
  'מזרח התיכון': '#f97316',
};
function contColor(c) { return CONT_COLORS[c] || '#64748b'; }

const COUNTRY_HE = { 'UK':'בריטניה','Germany':'גרמניה','Netherlands':'הולנד','Spain':'ספרד','France':'צרפת','Italy':'איטליה','Thailand':'תאילנד','New York':'ניו יורק' };
function heCountry(c){ return COUNTRY_HE[c] || c; }

function fmtDate(d, opts) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('he-IL', opts || { day:'numeric', month:'short', year:'numeric' });
}
function fmtShort(d) { return fmtDate(d, { day:'numeric', month:'short' }); }
function daysBetween(a, b) {
  if (!a || !b) return null;
  return Math.round((new Date(b) - new Date(a)) / (1000*60*60*24));
}

function daysLeftFrom(today, startDate) {
  return Math.ceil((new Date(startDate) - new Date(today)) / 86400000);
}

/** Urgency palette — shared across variants for visual consistency. */
function urgencyPalette(daysLeft) {
  if (daysLeft <= 7) return { num: '#f87171', glow: 'rgba(248,113,113,0.15)', ring: 'rgba(248,113,113,0.32)', label: 'כבר פה' };
  if (daysLeft <= 30) return { num: '#fbbf24', glow: 'rgba(251,191,36,0.12)', ring: 'rgba(251,191,36,0.28)', label: 'ממש בקרוב' };
  if (daysLeft <= 90) return { num: '#38bdf8', glow: 'rgba(56,189,248,0.10)', ring: 'rgba(56,189,248,0.25)', label: 'בדרך' };
  return { num: '#818cf8', glow: 'rgba(129,140,248,0.10)', ring: 'rgba(129,140,248,0.22)', label: 'בהמשך' };
}

/** Count-up hook. */
function useCountUp(target, duration) {
  duration = duration || 900;
  const [value, setValue] = React.useState(0);
  const startRef = React.useRef(null);
  const rafRef = React.useRef(null);

  React.useEffect(() => {
    if (typeof target !== 'number' || Number.isNaN(target)) { setValue(target); return; }
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setValue(target); return; }
    startRef.current = null;
    const tick = (ts) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);
  return value;
}

/** Live ticking clock — returns a Date that re-renders every `tickMs`. */
function useNow(tickMs) {
  tickMs = tickMs || 1000;
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return now;
}

/** Section label — small, uppercase caption above each variant. */
function SectionLabel({ children, idx }) {
  idx = idx || 0;
  return (
    <div style={{
      fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: T.textDim,
      marginBottom: '18px', textTransform: 'uppercase',
      animation: `tv-fade-up 440ms ${EASE.out} ${80 + idx * 40}ms both`,
    }}>
      {children}
    </div>
  );
}

/* Share to window for other script files. */
Object.assign(window, {
  T, EASE, contColor, heCountry, fmtDate, fmtShort, daysBetween,
  daysLeftFrom, urgencyPalette, useCountUp, useNow, SectionLabel,
});
