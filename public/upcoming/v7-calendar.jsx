/* Variant 7 — Mini calendar heat-grid.
 *
 * The whole upcoming section becomes a calendar: a compact 4-month grid of
 * day cells, today highlighted, departure/return days lit per trip in each
 * trip's accent color, and the days between them rendered as a subtle
 * "trip stretch" (soft tint) so you can literally see the waiting period
 * vs the trip itself. Below each month: trip strips with names aligned to
 * the date range they span. Clicking a trip strip scrolls it into focus.
 */

function MiniCalendar({ trips, today, onPick }) {
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const todayD = new Date(today); todayD.setHours(0, 0, 0, 0);

  // Determine months to show: today + 5 months forward, or through last trip + 1
  const lastEnd = sorted.length ? new Date(sorted[sorted.length - 1].endDate) : todayD;
  const endMonth = new Date(lastEnd.getFullYear(), lastEnd.getMonth() + 1, 1);
  const startMonth = new Date(todayD.getFullYear(), todayD.getMonth(), 1);

  const months = [];
  for (let d = new Date(startMonth); d <= endMonth; d.setMonth(d.getMonth() + 1)) {
    months.push(new Date(d));
  }

  // Map each day (YYYY-MM-DD) → {trip, role: 'start'|'end'|'mid'}
  const dayMap = new Map();
  sorted.forEach(t => {
    const s = new Date(t.startDate); s.setHours(0, 0, 0, 0);
    const e = new Date(t.endDate); e.setHours(0, 0, 0, 0);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      const role = d.getTime() === s.getTime() ? 'start' : d.getTime() === e.getTime() ? 'end' : 'mid';
      dayMap.set(key, { trip: t, role });
    }
  });

  return (
    <section style={{ marginBottom: '48px' }} dir="rtl">
      <SectionLabel>קרובים · לוח שנה</SectionLabel>

      {/* Trip legend */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '10px 18px',
        marginBottom: '20px',
        animation: `tv-fade-up 440ms ${EASE.out} 80ms both`,
      }}>
        {sorted.map((t, i) => {
          const dLeft = daysLeftFrom(today, t.startDate);
          const u = urgencyPalette(dLeft);
          const accent = contColor(t.continents && t.continents[0]);
          return (
            <button
              key={t.id}
              onClick={() => onPick && onPick(t)}
              className="tv-press"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.035)',
                border: `1px solid ${accent}55`,
                padding: '6px 12px 6px 14px', borderRadius: '999px',
                cursor: 'pointer', color: T.text, fontFamily: T.font,
                fontSize: '12px', fontWeight: 600,
                animation: `tv-fade-up 420ms ${EASE.out} ${120 + i * 70}ms both`,
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent, boxShadow: `0 0 10px ${accent}` }} />
              <span>{t.name_he || t.name}</span>
              <span style={{ color: u.num, fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>{dLeft}י׳</span>
            </button>
          );
        })}
      </div>

      {/* Calendar grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        animation: `tv-fade-up 540ms ${EASE.out} 200ms both`,
      }}>
        {months.map((m, mi) => (
          <Month
            key={mi}
            month={m}
            todayD={todayD}
            dayMap={dayMap}
            onPick={onPick}
            delay={240 + mi * 60}
          />
        ))}
      </div>
    </section>
  );
}

function Month({ month, todayD, dayMap, onPick, delay }) {
  const year = month.getFullYear();
  const mo = month.getMonth();
  const first = new Date(year, mo, 1);
  const last = new Date(year, mo + 1, 0);
  const daysInMonth = last.getDate();

  // Hebrew: Sunday = 0 is first column (matches how Israelis read calendars)
  const leadBlanks = first.getDay(); // 0 Sun .. 6 Sat

  const cells = [];
  for (let i = 0; i < leadBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, mo, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = month.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  const weekDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: T.glassBorder,
      borderRadius: '14px',
      padding: '14px 14px 10px',
      animation: `tv-fade-up 500ms ${EASE.out} ${delay}ms both`,
      boxShadow: `0 2px 16px rgba(0,0,0,0.18), ${T.glassInner}`,
    }}>
      <div style={{
        fontSize: '12px', fontWeight: 800, color: T.text, letterSpacing: '0.2px',
        marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <span>{monthLabel}</span>
      </div>

      {/* Week header — note: RTL flips columns so Sunday ends up on right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '4px' }}>
        {weekDays.map(w => (
          <div key={w} style={{ fontSize: '9.5px', fontWeight: 700, color: T.textDim, textAlign: 'center', letterSpacing: '0.3px' }}>
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} style={{ aspectRatio: '1 / 1' }} />;
          const key = d.toISOString().split('T')[0];
          const entry = dayMap.get(key);
          const isToday = d.getTime() === todayD.getTime();
          const isPast = d < todayD;
          const t = entry && entry.trip;
          const accent = t ? contColor(t.continents && t.continents[0]) : null;

          let bg = 'transparent';
          let border = '1px solid transparent';
          let color = isPast ? 'rgba(148,163,184,0.35)' : T.textMuted;
          let fontWeight = 500;
          let shadow = 'none';

          if (entry) {
            color = T.text;
            fontWeight = 700;
            if (entry.role === 'mid') {
              bg = `${accent}1f`;
            } else {
              bg = accent;
              color = '#0f172a';
              shadow = `0 0 14px ${accent}88`;
            }
          }

          if (isToday) {
            border = `1.5px solid ${T.text}`;
            if (!entry) { color = T.text; fontWeight = 800; }
          }

          return (
            <button
              key={i}
              onClick={() => t && onPick && onPick(t)}
              disabled={!t}
              title={t ? (t.name_he || t.name) : ''}
              style={{
                aspectRatio: '1 / 1',
                border, background: bg, color, fontWeight,
                borderRadius: entry && entry.role !== 'mid' ? '8px' : '6px',
                fontSize: '11px',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: T.font,
                cursor: t ? 'pointer' : 'default',
                boxShadow: shadow,
                transition: `transform 160ms ${EASE.out}, box-shadow 160ms ${EASE.out}`,
                padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                outline: 'none',
              }}
              onMouseEnter={(e) => { if (t) e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={(e) => { if (t) e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { MiniCalendar });
