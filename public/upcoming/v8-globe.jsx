/* Variant 8 — Globe / polar map.
 *
 * Each upcoming trip is a line drawn from a TLV origin point to a
 * destination on a stylized, abstract hemisphere. The hemisphere is just
 * two concentric ellipses + a faint grid — deliberately loose so it feels
 * editorial, not cartographic. Distance on the map maps roughly to actual
 * distance from Israel, using rough (cos lat, sin lat-offset) placement.
 *
 * The line animates in as a dash. A small plane sits partway along the
 * route according to "% of wait elapsed". Side panel lists the trips.
 */

const DEST_COORDS = {
  // [x, y] in -1..1 with TLV at (0, 0.1). Loose approximations, not cartographic.
  Paris:       [-0.28, -0.45],
  Bangkok:     [ 0.62,  0.25],
  Phuket:      [ 0.58,  0.32],
  'New York City': [-0.78, -0.28],
  London:      [-0.35, -0.55],
  Amsterdam:   [-0.22, -0.55],
  Rome:        [-0.14, -0.28],
  Barcelona:   [-0.30, -0.32],
  Berlin:      [-0.10, -0.55],
  Budapest:    [-0.02, -0.42],
};

function GlobeMap({ trips, today, onPick }) {
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const W = 560, H = 360;
  const cx = W / 2, cy = H * 0.62;
  const rx = W * 0.46, ry = H * 0.4;

  const TLV = { x: cx + 0.04 * rx, y: cy + 0.1 * ry };

  function pt(trip) {
    const city = (trip.cities && trip.cities[0]) || '';
    const c = DEST_COORDS[city] || [(Math.random() - 0.5) * 0.6, -0.3];
    return { x: cx + c[0] * rx, y: cy + c[1] * ry };
  }

  return (
    <section style={{ marginBottom: '48px' }} dir="rtl">
      <SectionLabel>קרובים · מפת יעדים</SectionLabel>

      <div style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(220px, 1fr)',
        gap: '20px',
        animation: `tv-fade-up 540ms ${EASE.out} 120ms both`,
      }}>
        {/* Map */}
        <div style={{
          position: 'relative',
          background: 'radial-gradient(ellipse at 50% 95%, rgba(59,130,246,0.08) 0%, transparent 60%), rgba(255,255,255,0.025)',
          border: T.glassBorder,
          borderRadius: '18px',
          overflow: 'hidden',
          padding: '14px',
          boxShadow: `0 4px 24px rgba(0,0,0,0.25), ${T.glassInner}`,
        }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <radialGradient id="globeFill" cx="50%" cy="60%" r="60%">
                <stop offset="0%" stopColor="rgba(59,130,246,0.10)" />
                <stop offset="80%" stopColor="rgba(59,130,246,0.0)" />
              </radialGradient>
              {sorted.map(t => {
                const u = urgencyPalette(daysLeftFrom(today, t.startDate));
                const accent = contColor(t.continents && t.continents[0]);
                return (
                  <linearGradient key={t.id} id={`rt-${t.id}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={accent} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={u.num} stopOpacity="1" />
                  </linearGradient>
                );
              })}
            </defs>

            {/* Hemisphere */}
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#globeFill)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            <ellipse cx={cx} cy={cy} rx={rx * 0.7} ry={ry * 0.7} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 4" />
            <ellipse cx={cx} cy={cy} rx={rx * 0.4} ry={ry * 0.4} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 4" />
            {/* Meridians */}
            {[-0.7, -0.35, 0, 0.35, 0.7].map(f => (
              <line key={f} x1={cx + f * rx} y1={cy - ry * Math.sqrt(1 - f * f)} x2={cx + f * rx} y2={cy + ry * Math.sqrt(1 - f * f)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            ))}

            {/* TLV origin */}
            <g>
              <circle cx={TLV.x} cy={TLV.y} r="5" fill="#e2e8f0" />
              <circle cx={TLV.x} cy={TLV.y} r="10" fill="none" stroke="rgba(226,232,240,0.3)" strokeWidth="1">
                <animate attributeName="r" values="6;14;6" dur="2.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="2.8s" repeatCount="indefinite" />
              </circle>
              <text x={TLV.x + 8} y={TLV.y + 4} fill={T.textMuted} fontSize="10" fontWeight="700" fontFamily="ui-monospace, monospace">TLV</text>
            </g>

            {/* Routes */}
            {sorted.map((t, i) => {
              const dLeft = daysLeftFrom(today, t.startDate);
              const u = urgencyPalette(dLeft);
              const accent = contColor(t.continents && t.continents[0]);
              const dest = pt(t);
              // Control point above both for nice arc
              const midX = (TLV.x + dest.x) / 2;
              const midY = Math.min(TLV.y, dest.y) - 70 - i * 10;
              const d = `M ${TLV.x} ${TLV.y} Q ${midX} ${midY} ${dest.x} ${dest.y}`;

              // Plane progress
              const booked = t.bookedOn ? new Date(t.bookedOn) : new Date(new Date(t.startDate).getTime() - 180 * 86400000);
              const total = new Date(t.startDate) - booked;
              const elapsed = Math.max(0, new Date(today) - booked);
              const progress = Math.max(0.04, Math.min(0.96, elapsed / total));

              return (
                <g key={t.id} style={{ cursor: 'pointer' }} onClick={() => onPick && onPick(t)}>
                  {/* Dashed preview */}
                  <path d={d} fill="none" stroke={`${accent}33`} strokeWidth="1" strokeDasharray="3 4" />
                  {/* Solid (animated) */}
                  <path
                    d={d} fill="none" stroke={`url(#rt-${t.id})`} strokeWidth="2" strokeLinecap="round"
                    style={{
                      strokeDasharray: 1200, strokeDashoffset: 1200,
                      animation: `tv-dash 1400ms ${EASE.out} ${400 + i * 240}ms forwards`,
                      filter: `drop-shadow(0 0 6px ${u.num}55)`,
                    }}
                  />
                  {/* Destination dot */}
                  <circle cx={dest.x} cy={dest.y} r="6" fill={accent} style={{
                    filter: `drop-shadow(0 0 10px ${accent})`,
                    animation: `tv-pop 420ms ${EASE.out} ${1400 + i * 240}ms both`,
                    transformOrigin: `${dest.x}px ${dest.y}px`,
                  }} />
                  {/* Destination label */}
                  <text
                    x={dest.x} y={dest.y - 12} fill={T.text} fontSize="12" fontWeight="700"
                    textAnchor="middle" fontFamily={T.font}
                    style={{ animation: `tv-fade-up 500ms ${EASE.out} ${1500 + i * 240}ms both` }}
                  >
                    {heCountry((t.countries && t.countries[0]) || '')}
                  </text>
                  <text
                    x={dest.x} y={dest.y + 20} fill={u.num} fontSize="10" fontWeight="800"
                    textAnchor="middle" fontFamily="ui-monospace, monospace"
                    style={{ animation: `tv-fade-up 500ms ${EASE.out} ${1600 + i * 240}ms both` }}
                  >
                    {dLeft}d
                  </text>

                  {/* Plane along arc */}
                  <PlaneOnArc
                    TLV={TLV} dest={{ x: dest.x, y: dest.y }} midX={midX} midY={midY}
                    progress={progress}
                    color={u.num}
                    delay={1200 + i * 240}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Side list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sorted.map((t, i) => {
            const dLeft = daysLeftFrom(today, t.startDate);
            const u = urgencyPalette(dLeft);
            const accent = contColor(t.continents && t.continents[0]);
            const tripDays = daysBetween(t.startDate, t.endDate);
            return (
              <button
                key={t.id}
                onClick={() => onPick && onPick(t)}
                className="tv-press"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.035)',
                  border: T.glassBorder,
                  borderRadius: '14px',
                  textAlign: 'right', cursor: 'pointer',
                  fontFamily: T.font, color: T.text,
                  animation: `tv-fade-up 460ms ${EASE.out} ${280 + i * 120}ms both`,
                }}
              >
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: accent, boxShadow: `0 0 10px ${accent}`, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '13px', fontWeight: 700 }}>{t.name_he || t.name}</span>
                  <span style={{ display: 'block', fontSize: '11px', color: T.textMuted, marginTop: '2px' }}>
                    {fmtShort(t.startDate)} → {fmtShort(t.endDate)}{tripDays ? ` · ${tripDays}י׳` : ''}
                  </span>
                </span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: u.num, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
                  {dLeft}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PlaneOnArc({ TLV, dest, midX, midY, progress, color, delay }) {
  // Sample the quadratic bezier at t=progress
  const t = progress;
  const x = (1 - t) * (1 - t) * TLV.x + 2 * (1 - t) * t * midX + t * t * dest.x;
  const y = (1 - t) * (1 - t) * TLV.y + 2 * (1 - t) * t * midY + t * t * dest.y;

  // Tangent for rotation
  const dx = 2 * (1 - t) * (midX - TLV.x) + 2 * t * (dest.x - midX);
  const dy = 2 * (1 - t) * (midY - TLV.y) + 2 * t * (dest.y - midY);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${angle})`}
      style={{ animation: `tv-fade-up 500ms ${EASE.out} ${delay}ms both`, transformBox: 'fill-box' }}
    >
      <path d="M -7 0 L 6 -3 L 8 0 L 6 3 Z" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </g>
  );
}

Object.assign(window, { GlobeMap });
