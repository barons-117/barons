/* Variant 9 — Live countdown poster.
 *
 * A single, huge hero-style block for the next trip only, with the
 * countdown expressed as DD : HH : MM : SS, live-ticking. Below: a list
 * of other upcoming trips as small type-only tallies. The big number is
 * deliberately minimal — thin type, generous whitespace, no chrome — so
 * the live seconds ticking is the whole show. Quiet but very alive.
 */

function LiveCountdownPoster({ trips, today, onPick }) {
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const next = sorted[0];
  const rest = sorted.slice(1);
  const now = useNow(1000);

  if (!next) return null;

  const accent = contColor(next.continents && next.continents[0]);
  const dep = new Date(next.startDate);
  dep.setHours(0, 0, 0, 0);
  const msLeft = Math.max(0, dep - now);
  const d = Math.floor(msLeft / 86400000);
  const h = Math.floor((msLeft % 86400000) / 3600000);
  const m = Math.floor((msLeft % 3600000) / 60000);
  const s = Math.floor((msLeft % 60000) / 1000);
  const dLeft = daysLeftFrom(today, next.startDate);
  const u = urgencyPalette(dLeft);
  const tripDays = daysBetween(next.startDate, next.endDate);

  return (
    <section style={{ marginBottom: '48px' }} dir="rtl">
      <SectionLabel>קרובים · שעון יציאה</SectionLabel>

      {/* Hero */}
      <div
        onClick={() => onPick && onPick(next)}
        className="tv-card-hover"
        style={{
          position: 'relative',
          padding: '42px 38px 36px',
          background: `
            radial-gradient(ellipse at 80% -20%, ${accent}20 0%, transparent 60%),
            radial-gradient(ellipse at 20% 120%, ${u.num}1a 0%, transparent 60%),
            rgba(255,255,255,0.025)
          `,
          border: T.glassBorder,
          borderRadius: '22px', overflow: 'hidden', cursor: 'pointer',
          boxShadow: `0 4px 40px rgba(0,0,0,0.3), ${T.glassInner}`,
          animation: `tv-fade-up 560ms ${EASE.out} 120ms both`,
        }}
      >
        {/* Top meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '28px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: u.num, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
              הבא בתור · {u.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: T.text, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
              {next.name_he || next.name}
            </div>
            <div style={{ fontSize: '13px', color: T.textMuted, marginTop: '4px' }}>
              {fmtDate(next.startDate, { day: 'numeric', month: 'long' })} — {fmtDate(next.endDate, { day: 'numeric', month: 'long', year: 'numeric' })}
              {tripDays && <span style={{ marginRight: '6px' }}>· {tripDays} ימים</span>}
              {next.companions && next.companions.length > 0 && (
                <span style={{ marginRight: '6px', color: '#a5b4fc' }}>· {next.companions.join(', ')}</span>
              )}
            </div>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: T.textDim, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            נותרו
          </div>
        </div>

        {/* Clock row (LTR digits inside RTL container) */}
        <div style={{
          direction: 'ltr', unicodeBidi: 'isolate',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px',
          alignItems: 'end',
        }}>
          <ClockCell label="days"    value={d} big color={u.num} />
          <ClockCell label="hours"   value={h} color={T.text} />
          <ClockCell label="minutes" value={m} color={T.text} />
          <ClockCell label="seconds" value={s} color={T.textMuted} ticking />
        </div>
      </div>

      {/* Rest of upcoming — just as a tally */}
      {rest.length > 0 && (
        <div style={{
          marginTop: '16px',
          display: 'grid', gridTemplateColumns: `repeat(${Math.min(rest.length, 3)}, 1fr)`,
          gap: '10px',
          animation: `tv-fade-up 520ms ${EASE.out} 340ms both`,
        }}>
          {rest.map((t, i) => {
            const dLeft = daysLeftFrom(today, t.startDate);
            const u = urgencyPalette(dLeft);
            const accent = contColor(t.continents && t.continents[0]);
            return (
              <button
                key={t.id}
                onClick={() => onPick && onPick(t)}
                className="tv-press"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: T.glassBorder,
                  borderRadius: '14px',
                  textAlign: 'right', cursor: 'pointer',
                  fontFamily: T.font, color: T.text,
                }}
              >
                <span style={{ width: '4px', height: '32px', borderRadius: '2px', background: accent, boxShadow: `0 0 10px ${accent}66` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.name_he || t.name}
                  </div>
                  <div style={{ fontSize: '11px', color: T.textMuted, marginTop: '1px' }}>
                    {fmtShort(t.startDate)}
                  </div>
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: u.num, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
                  {dLeft}<span style={{ fontSize: '10px', fontWeight: 700, marginRight: '4px', letterSpacing: '1px', color: T.textDim }}>ימים</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ClockCell({ label, value, big, color, ticking }) {
  const str = String(value).padStart(2, '0');
  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <div style={{
        fontSize: big ? '120px' : '60px',
        fontWeight: 200,
        lineHeight: 0.9,
        color,
        letterSpacing: '-4px',
        fontVariantNumeric: 'tabular-nums',
        textShadow: big ? `0 0 30px ${color}33` : 'none',
        opacity: ticking ? 0.9 : 1,
      }}>
        {str}
      </div>
      <div style={{
        fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
        color: 'rgba(148,163,184,0.7)', marginTop: '8px',
      }}>
        {label}
      </div>
    </div>
  );
}

Object.assign(window, { LiveCountdownPoster });
