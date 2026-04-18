/* Variant 2 — Boarding pass inspired cards.
 *
 * Each upcoming trip is a compact horizontal card evoking a ticket stub:
 * perforated divider between info and the countdown "seat", a sequence of
 * meta lines (origin→dest placeholder, dates, companions), and a progress
 * sliver along the bottom edge. Not a copy of any airline — generic stub.
 *
 * Aesthetic: flat, typographic, lots of whitespace. The divider is a row
 * of small circles (the "perforation"). One subtle detail: a thin moving
 * highlight sweeps across the next-up card only.
 */

function BoardingStubs({ trips, today, onPick }) {
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return (
    <section style={{ marginBottom: '48px' }} dir="rtl">
      <SectionLabel>קרובים · כרטיסי עלייה</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {sorted.map((t, i) => (
          <Stub key={t.id} trip={t} today={today} idx={i} onClick={() => onPick && onPick(t)} isNext={i === 0} />
        ))}
      </div>
    </section>
  );
}

function Stub({ trip, today, idx, onClick, isNext }) {
  const dLeft = daysLeftFrom(today, trip.startDate);
  const u = urgencyPalette(dLeft);
  const accent = contColor(trip.continents && trip.continents[0]);
  const tripDays = daysBetween(trip.startDate, trip.endDate);
  const count = useCountUp(dLeft, 800 + idx * 80);

  // IATA-ish fake codes from country name (first 3 letters upper)
  const from = 'TLV';
  const to = ((trip.cities && trip.cities[0]) || (trip.countries && trip.countries[0]) || 'DEST').slice(0, 3).toUpperCase();

  // Progress (booked → departure)
  const booked = trip.bookedOn ? new Date(trip.bookedOn) : new Date(new Date(trip.startDate).getTime() - 180 * 86400000);
  const total = new Date(trip.startDate) - booked;
  const elapsed = Math.max(0, new Date(today) - booked);
  const pct = Math.max(0, Math.min(1, elapsed / total));

  return (
    <div
      onClick={onClick}
      className="tv-card-hover"
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '8px 1fr auto auto',
        gap: 0,
        background: 'rgba(255,255,255,0.035)',
        border: T.glassBorder,
        borderRadius: '14px',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: `0 2px 16px rgba(0,0,0,0.2), ${T.glassInner}`,
        animation: `tv-fade-up 520ms ${EASE.out} ${120 + idx * 80}ms both`,
      }}
    >
      {/* Accent rail */}
      <div style={{
        background: accent,
        boxShadow: `0 0 14px ${accent}66`,
      }} />

      {/* Main info */}
      <div style={{ padding: '18px 22px 20px', minWidth: 0 }}>
        {/* Route line */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          fontSize: '24px', fontWeight: 800, color: T.text, letterSpacing: '1px',
          fontVariantNumeric: 'tabular-nums', marginBottom: '8px',
        }}>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{from}</span>
          <span style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'rgba(255,255,255,0.18)', position: 'relative' }}>
            <span style={{
              position: 'absolute', right: '-4px', top: '-4px',
              width: 0, height: 0,
              borderTop: '4px solid transparent', borderBottom: '4px solid transparent',
              borderRight: `6px solid ${T.textMuted}`,
            }} />
          </span>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{to}</span>
        </div>

        {/* Trip name */}
        <div style={{ fontSize: '15px', fontWeight: 700, color: T.text, lineHeight: 1.25, marginBottom: '10px' }}>
          {trip.name_he || trip.name}
        </div>

        {/* Meta rows — two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px' }}>
          <Meta label="תאריכים" value={`${fmtShort(trip.startDate)} → ${fmtShort(trip.endDate)}`} mono />
          <Meta label="משך" value={tripDays ? `${tripDays} ימים` : '—'} />
          <Meta
            label="נוסעים"
            value={trip.companions && trip.companions.length ? trip.companions.join(', ') : 'לבד'}
            color="#a5b4fc"
          />
        </div>

        {/* Progress sliver */}
        <div style={{ marginTop: '14px', height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            width: (pct * 100) + '%', height: '100%',
            background: `linear-gradient(90deg, transparent 0%, ${u.num} 100%)`,
            animation: `tv-bar-grow 1100ms ${EASE.out} ${280 + idx * 80}ms both`,
            transformOrigin: 'right',
          }} />
        </div>
      </div>

      {/* Perforation */}
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '8px 0', borderRight: '1px dashed rgba(255,255,255,0.12)',
      }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(15,23,42,0.9)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }} />
        ))}
      </div>

      {/* Countdown "seat" */}
      <div style={{
        padding: '0 28px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: u.glow,
        minWidth: '108px',
        position: 'relative',
      }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: u.num, letterSpacing: '1.5px', textTransform: 'uppercase', opacity: 0.7, marginBottom: '2px' }}>
          בעוד
        </div>
        <div style={{
          fontSize: '38px', fontWeight: 900, lineHeight: 1, color: u.num,
          letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums',
          textShadow: `0 0 18px ${u.glow}`,
        }}>
          {count}
        </div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: u.num, letterSpacing: '1.5px', textTransform: 'uppercase', opacity: 0.65, marginTop: '2px' }}>
          ימים
        </div>

        {isNext && (
          <span aria-hidden style={{
            position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
          }}>
            <span style={{
              position: 'absolute', top: 0, right: '-30%', width: '30%', height: '100%',
              background: `linear-gradient(90deg, transparent 0%, ${u.num}22 50%, transparent 100%)`,
              animation: `tv-sweep 3.8s ${EASE.inOut} infinite`,
            }} />
          </span>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value, mono, color }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontSize: '9.5px', fontWeight: 700, color: T.textDim,
        letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '3px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '12.5px', color: color || T.text, fontWeight: 600,
        fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : T.font,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {value}
      </div>
    </div>
  );
}

Object.assign(window, { BoardingStubs });
