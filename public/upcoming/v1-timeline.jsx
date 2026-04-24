/* Variant 1 — Horizontal timeline with dots.
 *
 * A single horizontal rail anchored on "today" runs left→right across the
 * section. Each trip is a labeled dot placed proportionally by days-away
 * (log-ish scale so distant trips don't get crushed). Hovering a dot lifts
 * a small card; the first dot pulses. Below the rail: a single featured
 * card for the next-up trip with a slim progress bar.
 *
 * Aesthetic: quiet, minimal, mostly type — no big numbers unless you earn
 * them (next-up gets the big countdown; the rest are type-only).
 */

function TimelineDots({ trips, today, onPick }) {
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (!sorted.length) return null;

  const next = sorted[0];
  const maxDays = Math.max(90, ...sorted.map(t => daysLeftFrom(today, t.startDate)));

  // Place each dot along the rail: sqrt scale so near-term gets more room.
  function pos(t) {
    const d = Math.max(0, daysLeftFrom(today, t.startDate));
    return Math.min(0.96, Math.max(0.04, Math.sqrt(d / maxDays) * 0.92 + 0.04));
  }

  return (
    <section style={{ marginBottom: '48px' }} dir="rtl">
      <SectionLabel>קרובים · ציר זמן</SectionLabel>

      {/* Rail */}
      <div style={{
        position: 'relative',
        padding: '42px 8px 60px',
        animation: `tv-fade-up 520ms ${EASE.out} 120ms both`,
      }}>
        {/* Track */}
        <div style={{
          position: 'absolute', left: '8px', right: '8px', top: '58px', height: '1px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.18) 12%, rgba(255,255,255,0.18) 88%, rgba(255,255,255,0.02) 100%)',
        }} />
        {/* "Today" tick */}
        <div style={{
          position: 'absolute', right: '8px', top: '38px', display: 'flex',
          flexDirection: 'column', alignItems: 'center', gap: '6px', transform: 'translateX(50%)',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: T.textDim, letterSpacing: '1.5px', textTransform: 'uppercase' }}>היום</div>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.25)' }} />
        </div>

        {/* Dots */}
        {sorted.map((t, i) => {
          const dLeft = daysLeftFrom(today, t.startDate);
          const u = urgencyPalette(dLeft);
          const accent = contColor(t.continents && t.continents[0]);
          const rightPct = pos(t) * 100;

          return (
            <button
              key={t.id}
              onClick={() => onPick && onPick(t)}
              className="tv-press"
              style={{
                position: 'absolute', top: '44px', right: rightPct + '%',
                transform: 'translateX(50%)',
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: 0, fontFamily: T.font,
                animation: `tv-fade-up 520ms ${EASE.out} ${200 + i * 90}ms both`,
              }}
            >
              {/* Label above */}
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
                whiteSpace: 'nowrap', textAlign: 'center',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: T.text, marginBottom: '2px' }}>
                  {t.name_he || t.name}
                </div>
                <div style={{ fontSize: '11px', color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtDate(t.startDate, { day: 'numeric', month: 'short' })}
                </div>
              </div>

              {/* Dot */}
              <span style={{
                position: 'relative', display: 'inline-block',
                width: '12px', height: '12px', borderRadius: '50%',
                background: accent,
                boxShadow: `0 0 0 4px ${u.glow}, 0 0 18px ${accent}55`,
              }}>
                {i === 0 && (
                  <span style={{
                    position: 'absolute', inset: '-6px', borderRadius: '50%',
                    border: `1.5px solid ${u.ring}`,
                    animation: `tv-ring-pulse 2.4s ${EASE.inOut} infinite`,
                  }} />
                )}
              </span>

              {/* Days-left pill below */}
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                fontSize: '11px', fontWeight: 700, color: u.num,
                fontVariantNumeric: 'tabular-nums', letterSpacing: '0.5px',
              }}>
                {dLeft} י׳
              </div>
            </button>
          );
        })}
      </div>

      {/* Featured "next" card — minimal */}
      <NextUpCard trip={next} today={today} onClick={() => onPick && onPick(next)} />
    </section>
  );
}

function NextUpCard({ trip, today, onClick }) {
  const dLeft = daysLeftFrom(today, trip.startDate);
  const tripDays = daysBetween(trip.startDate, trip.endDate);
  const u = urgencyPalette(dLeft);
  const accent = contColor(trip.continents && trip.continents[0]);

  // Progress: % of wait complete between bookedOn (or -180d) and startDate.
  const booked = trip.bookedOn ? new Date(trip.bookedOn) : new Date(new Date(trip.startDate).getTime() - 180 * 86400000);
  const total = new Date(trip.startDate) - booked;
  const elapsed = new Date(today) - booked;
  const pct = Math.max(0, Math.min(1, elapsed / total));

  const count = useCountUp(dLeft, 900);

  return (
    <div
      onClick={onClick}
      className="tv-card-hover"
      style={{
        display: 'grid', gridTemplateColumns: '1fr auto', gap: '32px',
        padding: '24px 28px',
        background: 'rgba(255,255,255,0.03)',
        border: T.glassBorder,
        borderRadius: '18px',
        cursor: 'pointer',
        boxShadow: `0 2px 24px rgba(0,0,0,0.25), ${T.glassInner}`,
        animation: `tv-fade-up 560ms ${EASE.out} 420ms both`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: u.num, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
          הבא בתור · {u.label}
        </div>
        <div style={{ fontSize: '22px', fontWeight: 800, color: T.text, letterSpacing: '-0.3px', lineHeight: 1.2, marginBottom: '6px' }}>
          {trip.name_he || trip.name}
        </div>
        <div style={{ fontSize: '13px', color: T.textMuted, marginBottom: '18px' }}>
          {fmtDate(trip.startDate, { day: 'numeric', month: 'long' })} — {fmtDate(trip.endDate, { day: 'numeric', month: 'long', year: 'numeric' })}
          {tripDays && <span style={{ marginRight: '8px' }}>· {tripDays} ימים</span>}
          {trip.companions && trip.companions.length > 0 && (
            <span style={{ marginRight: '8px', color: '#818cf8' }}>· {trip.companions.join(', ')}</span>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: '4px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            fontSize: '10px', fontWeight: 700, color: T.textDim, letterSpacing: '1.2px',
            textTransform: 'uppercase', marginBottom: '6px',
          }}>
            <span>נסעו לבוק</span>
            <span style={{ color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{Math.round(pct * 100)}%</span>
            <span>יציאה</span>
          </div>
          <div style={{
            height: '4px', borderRadius: '999px', overflow: 'hidden',
            background: 'rgba(255,255,255,0.06)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', inset: 0, right: 0,
              width: (pct * 100) + '%',
              background: `linear-gradient(90deg, ${accent}66, ${u.num})`,
              boxShadow: `0 0 12px ${u.num}55`,
              animation: `tv-bar-grow 1100ms ${EASE.out} 520ms both`,
              transformOrigin: 'right',
            }} />
          </div>
        </div>
      </div>

      {/* Countdown */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: '32px',
      }}>
        <div style={{
          fontSize: '64px', fontWeight: 900, lineHeight: 0.9, color: u.num,
          letterSpacing: '-2px', fontVariantNumeric: 'tabular-nums',
          textShadow: `0 0 24px ${u.glow}`,
        }}>
          {count}
        </div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: u.num, opacity: 0.65, marginTop: '4px', letterSpacing: '1px' }}>
          ימים
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TimelineDots });
