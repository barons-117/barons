/* Variant 5 — Flip board grid (minimal split-flap).
 *
 * A compact 3-col grid of calm "flip" cards: one big number per card with
 * an animated CSS-only flip every time it recalculates (just on mount).
 * Very type-forward — no gradients inside the card; the color only hints
 * via a soft border glow. The "next-up" trip gets a double-wide card.
 */

function FlipGrid({ trips, today, onPick }) {
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return (
    <section style={{ marginBottom: '48px' }} dir="rtl">
      <SectionLabel>קרובים · לוח התראות</SectionLabel>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '14px',
      }}>
        {sorted.map((t, i) => (
          <FlipCard key={t.id} trip={t} today={today} idx={i} featured={i === 0} onClick={() => onPick && onPick(t)} />
        ))}
      </div>
    </section>
  );
}

function FlipCard({ trip, today, idx, featured, onClick }) {
  const dLeft = daysLeftFrom(today, trip.startDate);
  const u = urgencyPalette(dLeft);
  const accent = contColor(trip.continents && trip.continents[0]);
  const tripDays = daysBetween(trip.startDate, trip.endDate);
  const count = useCountUp(dLeft, 1100 + idx * 100);

  return (
    <div
      onClick={onClick}
      className="tv-card-hover"
      style={{
        position: 'relative',
        gridColumn: featured ? 'span 2' : 'auto',
        padding: '22px 22px 20px',
        background: 'rgba(255,255,255,0.035)',
        border: `1px solid ${u.ring}`,
        borderRadius: '16px',
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: `0 2px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.02), ${T.glassInner}, 0 0 30px ${u.glow}`,
        animation: `tv-fade-up 520ms ${EASE.out} ${140 + idx * 90}ms both`,
      }}
    >
      {/* Top row — caption + country tag */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: u.num, letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.85 }}>
          {u.label}
        </div>
        <div style={{
          fontSize: '10px', fontWeight: 700, color: T.textDim,
          letterSpacing: '1.5px', textTransform: 'uppercase',
          padding: '3px 8px', borderRadius: '999px',
          border: `1px solid ${accent}55`, color: accent,
        }}>
          {(trip.countries && trip.countries[0]) || ''}
        </div>
      </div>

      {/* Big number */}
      <div style={{
        fontSize: featured ? '120px' : '88px',
        fontWeight: 200, lineHeight: 0.9, color: T.text,
        letterSpacing: '-4px', fontVariantNumeric: 'tabular-nums',
        marginBottom: '6px',
      }}>
        <FlipNum value={count} delay={idx * 90} />
      </div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: T.textDim, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px' }}>
        ימים עד היציאה
      </div>

      {/* Bottom — name + dates */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: T.text, marginBottom: '2px', letterSpacing: '-0.1px' }}>
          {trip.name_he || trip.name}
        </div>
        <div style={{ fontSize: '12px', color: T.textMuted }}>
          {fmtShort(trip.startDate)} → {fmtShort(trip.endDate)}
          {tripDays && <span style={{ marginRight: '6px' }}>· {tripDays} ימים</span>}
        </div>
        {trip.companions && trip.companions.length > 0 && (
          <div style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: 500, marginTop: '2px' }}>
            {trip.companions.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

function FlipNum({ value, delay }) {
  // Split into digits so each digit "flips" in with its own delay.
  const digits = String(value).split('');
  return (
    <span style={{ display: 'inline-flex', gap: '0.02em', direction: 'ltr', unicodeBidi: 'isolate' }}>
      {digits.map((d, i) => (
        <span key={i} style={{
          display: 'inline-block',
          animation: `tv-flip-in 620ms ${EASE.out} ${delay + i * 80}ms both`,
          transformOrigin: '50% 100%',
          willChange: 'transform, opacity',
        }}>
          {d}
        </span>
      ))}
    </span>
  );
}

Object.assign(window, { FlipGrid });
