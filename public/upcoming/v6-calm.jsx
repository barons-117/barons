/* Variant 6 — Calm list (default baseline, close to original but refined).
 *
 * Kept here as an explicit option so the user can compare other variants
 * against a calmer, less-decorated baseline. Same cards as the current
 * UpcomingCard but with a gentler palette, a thin progress bar under each
 * row, and a single label instead of a big number block.
 */

function CalmList({ trips, today, onPick }) {
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return (
    <section style={{ marginBottom: '48px' }} dir="rtl">
      <SectionLabel>קרובים</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sorted.map((t, i) => (
          <CalmRow key={t.id} trip={t} today={today} idx={i} onClick={() => onPick && onPick(t)} />
        ))}
      </div>
    </section>
  );
}

function CalmRow({ trip, today, idx, onClick }) {
  const dLeft = daysLeftFrom(today, trip.startDate);
  const u = urgencyPalette(dLeft);
  const accent = contColor(trip.continents && trip.continents[0]);
  const tripDays = daysBetween(trip.startDate, trip.endDate);
  const count = useCountUp(dLeft, 800 + idx * 60);

  const booked = trip.bookedOn ? new Date(trip.bookedOn) : new Date(new Date(trip.startDate).getTime() - 180 * 86400000);
  const total = new Date(trip.startDate) - booked;
  const elapsed = Math.max(0, new Date(today) - booked);
  const pct = Math.max(0, Math.min(1, elapsed / total));

  return (
    <div
      onClick={onClick}
      className="tv-card-hover"
      style={{
        display: 'flex', alignItems: 'stretch', borderRadius: '14px',
        border: T.glassBorder, overflow: 'hidden', cursor: 'pointer',
        background: 'rgba(255,255,255,0.035)',
        boxShadow: `0 2px 12px rgba(0,0,0,0.18), ${T.glassInner}`,
        animation: `tv-fade-up 460ms ${EASE.out} ${120 + idx * 70}ms both`,
      }}
    >
      <div style={{ width: '4px', background: accent, boxShadow: `0 0 10px ${accent}66` }} />
      <div style={{ flex: 1, padding: '14px 18px 12px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: T.text, letterSpacing: '-0.1px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {trip.name_he || trip.name}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: u.num, letterSpacing: '0.5px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            בעוד {count} ימים
          </div>
        </div>
        <div style={{ fontSize: '12px', color: T.textMuted, marginTop: '3px', marginBottom: '10px' }}>
          {fmtShort(trip.startDate)} → {fmtShort(trip.endDate)}
          {tripDays && <span style={{ marginRight: '6px' }}>· {tripDays} ימים</span>}
          {trip.companions && trip.companions.length > 0 && (
            <span style={{ marginRight: '6px', color: '#a5b4fc' }}>· {trip.companions.join(', ')}</span>
          )}
        </div>
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            width: (pct * 100) + '%', height: '100%',
            background: `linear-gradient(90deg, ${accent}55, ${u.num})`,
            animation: `tv-bar-grow 1000ms ${EASE.out} ${260 + idx * 70}ms both`,
            transformOrigin: 'right',
          }} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CalmList });
