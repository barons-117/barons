/* Variant 3 — Horizon hero with a slow plane.
 *
 * A wide, short hero band per trip: horizon line, single tiny plane glyph
 * travelling along it at a rate proportional to "how close we are". As
 * the departure approaches, the plane moves from far-right (far away) to
 * the center (touchdown). The countdown sits as oversized, thin type on
 * the left. Minimal, editorial, quiet.
 */

function HorizonBand({ trips, today, onPick }) {
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return (
    <section style={{ marginBottom: '48px' }} dir="rtl">
      <SectionLabel>קרובים · בדרך אליך</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sorted.map((t, i) => (
          <Horizon key={t.id} trip={t} today={today} idx={i} onClick={() => onPick && onPick(t)} />
        ))}
      </div>
    </section>
  );
}

function Horizon({ trip, today, idx, onClick }) {
  const dLeft = daysLeftFrom(today, trip.startDate);
  const u = urgencyPalette(dLeft);
  const accent = contColor(trip.continents && trip.continents[0]);
  const tripDays = daysBetween(trip.startDate, trip.endDate);

  // Plane position: 0 = destination (center-left), 1 = far horizon (right)
  // Inverted progress so it "arrives" as days get smaller.
  const booked = trip.bookedOn ? new Date(trip.bookedOn) : new Date(new Date(trip.startDate).getTime() - 180 * 86400000);
  const total = new Date(trip.startDate) - booked;
  const elapsed = Math.max(0, new Date(today) - booked);
  const progress = Math.max(0, Math.min(1, elapsed / total));
  const planePct = 92 - (progress * 82); // % from right

  return (
    <div
      onClick={onClick}
      className="tv-card-hover"
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'minmax(180px, 280px) 1fr',
        gap: '28px',
        padding: '28px 30px',
        background: `linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.045) 100%)`,
        border: T.glassBorder,
        borderRadius: '18px',
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: `0 2px 20px rgba(0,0,0,0.2), ${T.glassInner}`,
        animation: `tv-fade-up 560ms ${EASE.out} ${120 + idx * 90}ms both`,
      }}
    >
      {/* Soft accent glow bottom-right */}
      <div aria-hidden style={{
        position: 'absolute', right: '-10%', bottom: '-40%', width: '380px', height: '380px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}22 0%, transparent 65%)`,
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />

      {/* Left: oversized countdown */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: u.num, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px', opacity: 0.8 }}>
          {u.label}
        </div>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: '10px',
          color: T.text, lineHeight: 0.9,
        }}>
          <span style={{
            fontSize: '84px', fontWeight: 200, letterSpacing: '-4px',
            color: u.num, fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 30px ${u.glow}`,
          }}>
            {dLeft}
          </span>
          <span style={{ fontSize: '14px', color: T.textMuted, letterSpacing: '2px', textTransform: 'uppercase' }}>
            ימים
          </span>
        </div>
      </div>

      {/* Right: trip meta + horizon */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: T.text, letterSpacing: '-0.3px', marginBottom: '4px' }}>
            {trip.name_he || trip.name}
          </div>
          <div style={{ fontSize: '13px', color: T.textMuted, marginBottom: '2px' }}>
            {fmtDate(trip.startDate, { day: 'numeric', month: 'long' })} — {fmtDate(trip.endDate, { day: 'numeric', month: 'long', year: 'numeric' })}
            {tripDays && <span style={{ marginRight: '6px' }}>· {tripDays} ימים</span>}
          </div>
          {trip.companions && trip.companions.length > 0 && (
            <div style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: 500 }}>
              עם {trip.companions.join(', ')}
            </div>
          )}
        </div>

        {/* Horizon line */}
        <div style={{ position: 'relative', height: '44px', marginTop: '20px' }}>
          {/* Horizon */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '50%',
            height: '1px',
            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 10%, rgba(255,255,255,0.22) 90%, transparent 100%)`,
          }} />
          {/* Destination marker (left — center-left) */}
          <div style={{
            position: 'absolute', top: '50%', left: '10%', transform: 'translate(-50%, -50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
          }}>
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: accent, boxShadow: `0 0 14px ${accent}` }} />
            <div style={{ fontSize: '10px', fontWeight: 700, color: T.textDim, letterSpacing: '1px', textTransform: 'uppercase' }}>
              {(trip.cities && trip.cities[0]) || (trip.countries && trip.countries[0])}
            </div>
          </div>
          {/* Origin marker (right) */}
          <div style={{
            position: 'absolute', top: '50%', right: '4%', transform: 'translate(50%, -50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }} />
            <div style={{ fontSize: '10px', fontWeight: 700, color: T.textDim, letterSpacing: '1px', textTransform: 'uppercase' }}>
              היום
            </div>
          </div>
          {/* Plane */}
          <div style={{
            position: 'absolute', top: '50%', right: planePct + '%',
            transform: 'translate(50%, -50%)',
            animation: `tv-plane-bob 3.2s ${EASE.inOut} infinite`,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 6px ${u.num}aa)` }}>
              <path d="M22 16.5L14 10.5V3a2 2 0 10-4 0v7.5L2 16.5V19l8-2.5V22l-2 1.5V25l4-1 4 1v-1.5L14 22v-5.5l8 2.5v-2.5z" fill={u.num} />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HorizonBand });
