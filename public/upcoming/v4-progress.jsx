/* Variant 4 — Progress meter as the hero.
 *
 * Each trip is a chunky horizontal progress meter: "booked → today → going"
 * with the fill visualizing how much of the wait has passed. The fill bar
 * has two layers (base + shimmer). Countdown sits at the end of the bar
 * like a mileage marker. Cards are thin and quiet; the progress bar carries
 * the visual weight.
 */

function ProgressMeters({ trips, today, onPick }) {
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return (
    <section style={{ marginBottom: '48px' }} dir="rtl">
      <SectionLabel>קרובים · מד התקדמות</SectionLabel>
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: T.glassBorder,
        borderRadius: '18px', padding: '8px 0',
        boxShadow: `0 2px 20px rgba(0,0,0,0.2), ${T.glassInner}`,
      }}>
        {sorted.map((t, i) => (
          <Meter key={t.id} trip={t} today={today} idx={i} last={i === sorted.length - 1} onClick={() => onPick && onPick(t)} />
        ))}
      </div>
    </section>
  );
}

function Meter({ trip, today, idx, last, onClick }) {
  const dLeft = daysLeftFrom(today, trip.startDate);
  const u = urgencyPalette(dLeft);
  const accent = contColor(trip.continents && trip.continents[0]);
  const tripDays = daysBetween(trip.startDate, trip.endDate);

  const booked = trip.bookedOn ? new Date(trip.bookedOn) : new Date(new Date(trip.startDate).getTime() - 180 * 86400000);
  const total = new Date(trip.startDate) - booked;
  const elapsed = Math.max(0, new Date(today) - booked);
  const pct = Math.max(0, Math.min(1, elapsed / total));

  return (
    <div
      onClick={onClick}
      className="tv-row"
      style={{
        cursor: 'pointer', padding: '20px 24px',
        borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)',
        animation: `tv-fade-up 500ms ${EASE.out} ${140 + idx * 90}ms both`,
      }}
    >
      {/* Header line */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '14px', gap: '16px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: T.text, letterSpacing: '-0.2px', marginBottom: '2px' }}>
            {trip.name_he || trip.name}
          </div>
          <div style={{ fontSize: '12px', color: T.textMuted }}>
            {fmtShort(trip.startDate)} → {fmtShort(trip.endDate)}
            {tripDays && <span style={{ marginRight: '6px' }}>· {tripDays} ימים</span>}
            {trip.companions && trip.companions.length > 0 && (
              <span style={{ marginRight: '6px', color: '#a5b4fc' }}>· {trip.companions.join(', ')}</span>
            )}
          </div>
        </div>
        <div style={{
          fontSize: '26px', fontWeight: 900, color: u.num, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px',
          textShadow: `0 0 18px ${u.glow}`, whiteSpace: 'nowrap',
        }}>
          {dLeft}<span style={{ fontSize: '11px', fontWeight: 700, color: T.textDim, marginRight: '6px', letterSpacing: '1px', textTransform: 'uppercase' }}>ימים</span>
        </div>
      </div>

      {/* Progress track */}
      <div style={{ position: 'relative', height: '10px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{
          position: 'absolute', inset: 0, right: 0, width: (pct * 100) + '%',
          background: `linear-gradient(90deg, ${accent}aa 0%, ${u.num} 100%)`,
          boxShadow: `0 0 14px ${u.num}55`,
          borderRadius: '999px',
          animation: `tv-bar-grow 1100ms ${EASE.out} ${300 + idx * 90}ms both`,
          transformOrigin: 'right',
        }} />
        {/* Moving shimmer */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, right: 0, width: (pct * 100) + '%',
          overflow: 'hidden', borderRadius: '999px', pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0, right: '-30%', width: '30%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
            animation: `tv-sweep 2.6s ${EASE.inOut} infinite`,
          }} />
        </div>
      </div>

      {/* Scale */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: '6px', fontSize: '10px', color: T.textDim,
        fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase',
      }}>
        <span>הזמנו</span>
        <span style={{ color: u.num, fontVariantNumeric: 'tabular-nums' }}>{Math.round(pct * 100)}%</span>
        <span>יציאה</span>
      </div>
    </div>
  );
}

Object.assign(window, { ProgressMeters });
