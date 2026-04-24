/* Variant 10 — Suitcase filling up.
 *
 * A deliberately weird, delightful visual: each trip is a "suitcase" drawn
 * as a tall rectangle. As the departure date nears, the suitcase fills
 * up from the bottom with the trip's accent color — like water in a
 * vessel. The % fill = % of wait elapsed. When it fills to the brim,
 * the trip is here. Each suitcase has a handle and a luggage tag with
 * destination + countdown. Cluster of 3 suitcases side-by-side.
 */

function Suitcases({ trips, today, onPick }) {
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return (
    <section style={{ marginBottom: '48px' }} dir="rtl">
      <SectionLabel>קרובים · המזוודות מתמלאות</SectionLabel>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`,
        gap: '18px',
        animation: `tv-fade-up 540ms ${EASE.out} 120ms both`,
      }}>
        {sorted.map((t, i) => (
          <Suitcase key={t.id} trip={t} today={today} idx={i} onClick={() => onPick && onPick(t)} />
        ))}
      </div>
    </section>
  );
}

function Suitcase({ trip, today, idx, onClick }) {
  const dLeft = daysLeftFrom(today, trip.startDate);
  const u = urgencyPalette(dLeft);
  const accent = contColor(trip.continents && trip.continents[0]);
  const tripDays = daysBetween(trip.startDate, trip.endDate);

  const booked = trip.bookedOn ? new Date(trip.bookedOn) : new Date(new Date(trip.startDate).getTime() - 180 * 86400000);
  const total = new Date(trip.startDate) - booked;
  const elapsed = Math.max(0, new Date(today) - booked);
  const pct = Math.max(0, Math.min(1, elapsed / total));

  return (
    <button
      onClick={onClick}
      className="tv-press"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '18px 16px 20px',
        background: 'rgba(255,255,255,0.025)',
        border: T.glassBorder,
        borderRadius: '16px', cursor: 'pointer', fontFamily: T.font, color: T.text,
        boxShadow: `0 2px 18px rgba(0,0,0,0.22), ${T.glassInner}`,
        animation: `tv-fade-up 520ms ${EASE.out} ${140 + idx * 110}ms both`,
      }}
    >
      {/* Handle */}
      <div style={{
        width: '44px', height: '10px',
        borderTopLeftRadius: '6px', borderTopRightRadius: '6px',
        border: `2px solid ${accent}`, borderBottom: 'none',
        background: 'transparent',
        marginBottom: '-2px',
      }} />

      {/* Suitcase body */}
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '3 / 4',
        background: 'rgba(255,255,255,0.04)',
        border: `2px solid ${accent}aa`,
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: `inset 0 0 0 2px rgba(255,255,255,0.03), 0 0 28px ${accent}22`,
      }}>
        {/* Fill */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          height: (pct * 100) + '%',
          background: `linear-gradient(180deg, ${accent}99 0%, ${u.num} 100%)`,
          transition: `height 1200ms ${EASE.out}`,
          transformOrigin: 'bottom',
          animation: `tv-fill-up 1200ms ${EASE.out} ${300 + idx * 110}ms both`,
          ['--fill']: (pct * 100) + '%',
        }} />

        {/* Shimmer "liquid surface" */}
        <div aria-hidden style={{
          position: 'absolute', left: 0, right: 0, height: '4px',
          bottom: (pct * 100) + '%',
          background: `linear-gradient(90deg, transparent 0%, ${u.num}, transparent 100%)`,
          opacity: 0.6,
          filter: 'blur(1.5px)',
          animation: `tv-surface 2.8s ${EASE.inOut} infinite`,
          transition: `bottom 1200ms ${EASE.out}`,
        }} />

        {/* Horizontal strap */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '36%',
          height: '10px', background: 'rgba(255,255,255,0.08)',
          borderTop: '1px solid rgba(0,0,0,0.25)',
          borderBottom: '1px solid rgba(0,0,0,0.25)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.05)',
        }}>
          <div style={{
            position: 'absolute', top: '-2px', bottom: '-2px', left: '50%', transform: 'translateX(-50%)',
            width: '14px', background: 'rgba(255,255,255,0.12)',
            borderRadius: '3px',
            border: '1px solid rgba(0,0,0,0.25)',
          }} />
        </div>

        {/* % label floating in center */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', fontWeight: 900, color: '#fff',
          letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums',
          textShadow: '0 2px 12px rgba(0,0,0,0.5)',
          mixBlendMode: 'plus-lighter',
        }}>
          {Math.round(pct * 100)}%
        </div>
      </div>

      {/* Luggage tag */}
      <div style={{
        marginTop: '14px', width: '100%',
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 10px',
        background: 'rgba(255,255,255,0.04)',
        border: `1px dashed ${accent}66`,
        borderRadius: '8px',
        position: 'relative',
      }}>
        <span style={{
          position: 'absolute', top: '-6px', right: '14px',
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'rgba(15,23,42,1)',
          border: `1px solid ${accent}aa`,
        }} />
        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {trip.name_he || trip.name}
          </div>
          <div style={{ fontSize: '10px', color: T.textMuted, marginTop: '1px' }}>
            {fmtShort(trip.startDate)}{tripDays ? ` · ${tripDays}י׳` : ''}
          </div>
        </div>
        <div style={{
          fontSize: '18px', fontWeight: 900, color: u.num,
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px',
          textShadow: `0 0 10px ${u.glow}`,
        }}>
          {dLeft}<span style={{ fontSize: '9px', fontWeight: 700, color: T.textDim, marginRight: '3px', letterSpacing: '1px' }}>י׳</span>
        </div>
      </div>
    </button>
  );
}

Object.assign(window, { Suitcases });
