/*
 * v11 — Grid + profile + hover chat
 *
 * Tiles behave like profile cards: destination "skybox" background
 * (colored gradient suggesting the place) + a cutout photo of the user
 * standing on it, plus profile-style metadata on top.
 *
 * Hovering a tile pops open a chat-style conversation between the trip
 * and the user — orange user bubbles, sky-blue trip bubbles, black text,
 * like a classic messaging UI.
 */

const PEOPLE = [
  'upcoming/assets/person.png',
  'upcoming/assets/person-2.png',
  'upcoming/assets/person-3.png',
  'upcoming/assets/person-4.png',
  'upcoming/assets/person-5.png',
  'upcoming/assets/person-6.png',
  'upcoming/assets/person-7.png',
  'upcoming/assets/person-8.png',
  'upcoming/assets/person-9.png',
];

// ---------- Per-destination background photo ---------------------------

/** Maps a city/country key to a real background image path.
 *  Lookup order: exact city → country-level fallback. */
function destImage(trip) {
  const city    = ((trip.cities && trip.cities[0]) || '').toLowerCase();
  const country = ((trip.countries && trip.countries[0]) || '').toLowerCase();

  // City-level matches (checked first; most specific).
  const CITIES = [
    ['paris',        'upcoming/assets/dest/paris.avif'],
    ['london',       'upcoming/assets/dest/london.avif'],
    ['berlin',       'upcoming/assets/dest/berlin.webp'],
    ['amsterdam',    'upcoming/assets/dest/amsterdam.webp'],
    ['barcelona',    'upcoming/assets/dest/barcelona.jpg'],
    ['madrid',       'upcoming/assets/dest/madrid.webp'],
    ['budapest',     'upcoming/assets/dest/budapest.jpg'],
    ['new york',     'upcoming/assets/dest/newyork.jpg'],
    ['nyc',          'upcoming/assets/dest/newyork.jpg'],
    ['bangkok',      'upcoming/assets/dest/bangkok.jpg'],
    ['phuket',       'upcoming/assets/dest/bangkok.jpg'],
    ['sydney',       'upcoming/assets/dest/sydney.jpeg'],
    ['las vegas',    'upcoming/assets/dest/lasvegas.jpg'],
    ['vegas',        'upcoming/assets/dest/lasvegas.jpg'],
    ['los angeles',  'upcoming/assets/dest/losangeles.jpg'],
    ['la',           'upcoming/assets/dest/losangeles.jpg'],
    ['warsaw',       'upcoming/assets/dest/warsaw.jpg'],
    ['prague',       'upcoming/assets/dest/prague.webp'],
    ['bucharest',    'upcoming/assets/dest/bucharest.jpg'],
    ['vienna',       'upcoming/assets/dest/vienna.jpg'],
    ['lisbon',       'upcoming/assets/dest/lisbon.jpeg'],
    ['brussels',     'upcoming/assets/dest/brussels.jpg'],
    ['hanoi',        'upcoming/assets/dest/vietnam.jpg'],
    ['ho chi minh',  'upcoming/assets/dest/vietnam.jpg'],
    ['saigon',       'upcoming/assets/dest/vietnam.jpg'],
    ['hoi an',       'upcoming/assets/dest/vietnam.jpg'],
  ];
  for (const [k, src] of CITIES) {
    if (city.includes(k)) return src;
  }

  // Country-level fallback — "if no London, show England" etc.
  const COUNTRIES = [
    ['france',       'upcoming/assets/dest/paris.avif'],
    ['uk',           'upcoming/assets/dest/london.avif'],
    ['england',      'upcoming/assets/dest/london.avif'],
    ['united kingdom','upcoming/assets/dest/london.avif'],
    ['germany',      'upcoming/assets/dest/berlin.webp'],
    ['netherlands',  'upcoming/assets/dest/amsterdam.webp'],
    ['holland',      'upcoming/assets/dest/amsterdam.webp'],
    ['spain',        'upcoming/assets/dest/barcelona.jpg'],
    ['hungary',      'upcoming/assets/dest/budapest.jpg'],
    ['usa',          'upcoming/assets/dest/newyork.jpg'],
    ['united states','upcoming/assets/dest/newyork.jpg'],
    ['new york',     'upcoming/assets/dest/newyork.jpg'],
    ['thailand',     'upcoming/assets/dest/bangkok.jpg'],
    ['australia',    'upcoming/assets/dest/sydney.jpeg'],
    ['poland',       'upcoming/assets/dest/warsaw.jpg'],
    ['czech',        'upcoming/assets/dest/prague.webp'],
    ['czechia',      'upcoming/assets/dest/prague.webp'],
    ['romania',      'upcoming/assets/dest/bucharest.jpg'],
    ['austria',      'upcoming/assets/dest/vienna.jpg'],
    ['portugal',     'upcoming/assets/dest/lisbon.jpeg'],
    ['belgium',      'upcoming/assets/dest/brussels.jpg'],
    ['vietnam',      'upcoming/assets/dest/vietnam.jpg'],
  ];
  for (const [k, src] of COUNTRIES) {
    if (country.includes(k)) return src;
  }

  return null;
}

// ---------- Per-destination "skybox" (gradient fallback) --------------

/** Paint a destination-flavored background for a tile. Returns CSS props.
 *  We use city/country as a cheap key so tiles feel distinct without
 *  needing real photos yet. */
function destBackdrop(trip) {
  const city    = (trip.cities && trip.cities[0]) || '';
  const country = (trip.countries && trip.countries[0]) || '';
  const key = (city + country).toLowerCase();

  // Hand-tuned gradients per well-known destination.
  const MAP = {
    paris:    ['#f4c9b5', '#c88a9a', '#6b4a6b'],  // warm rose dusk
    london:   ['#aec4d2', '#6a7f93', '#2f3d4f'],
    berlin:   ['#d9d4c7', '#8a8a7a', '#3b3d3a'],
    amsterdam:['#c7d8cf', '#7aa38c', '#2f4b42'],
    barcelona:['#f7d49a', '#e08a5a', '#7b3a2f'],
    madrid:   ['#f3c27a', '#c46a3a', '#5a2a22'],
    rome:     ['#e8c48a', '#b77a4a', '#5a3626'],
    milan:    ['#dcd5c4', '#9a8f70', '#4a4030'],
    bangkok:  ['#f0c48a', '#d46a5a', '#3e2a4a'],   // sunset + purple
    phuket:   ['#a7e0d0', '#3aa08a', '#1a4a5a'],
    'new york': ['#2a3d66', '#4a6aa0', '#c0d4ea'], // cool night→dawn
    nyc:      ['#2a3d66', '#4a6aa0', '#c0d4ea'],
    tokyo:    ['#e8b2c0', '#8a6aa0', '#2f2a4a'],
    dubai:    ['#f4d9a0', '#d49a5a', '#6a4a3a'],
  };

  let stops = null;
  for (const k of Object.keys(MAP)) {
    if (key.includes(k)) { stops = MAP[k]; break; }
  }
  // Fallback: derive a gradient from continent color
  if (!stops) {
    const c = contColor(trip.continents && trip.continents[0]);
    stops = [lighten(c, 0.35), c, darken(c, 0.35)];
  }

  return {
    background: `linear-gradient(180deg, ${stops[0]} 0%, ${stops[1]} 55%, ${stops[2]} 100%)`,
    destStops: stops,
  };
}

function lighten(hex, amt) { return shade(hex, amt); }
function darken(hex, amt)  { return shade(hex, -amt); }
function shade(hex, amt) {
  const h = hex.replace('#','');
  const full = h.length === 3 ? h.split('').map(x => x+x).join('') : h;
  const r = parseInt(full.slice(0,2),16);
  const g = parseInt(full.slice(2,4),16);
  const b = parseInt(full.slice(4,6),16);
  const mix = (v) => Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt));
  const toHex = (v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2,'0');
  return '#' + toHex(mix(r)) + toHex(mix(g)) + toHex(mix(b));
}

// Profile handles/taglines
function handleFor(trip) {
  const city = (trip.cities && trip.cities[0]) || 'trip';
  const slug = city.toLowerCase().replace(/[^a-z]/g,'');
  const d = daysBetween(trip.startDate, trip.endDate) || 1;
  return `@${slug}_${d}d`;
}

// ---------- Main component ---------------------------------------------

function GridReveal({ trips, today }) {
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const [hoverId, setHoverId] = React.useState(null);

  // Pick N distinct random people on mount — fresh each refresh, but
  // guaranteed no repeats within a single render.
  const peoplePick = React.useMemo(() => {
    const pool = [...PEOPLE];
    const out = [];
    const n = Math.min(sorted.length, pool.length);
    for (let i = 0; i < n; i++) {
      const j = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(j, 1)[0]);
    }
    // If somehow we need more tiles than we have unique photos, repeat.
    while (out.length < sorted.length) out.push(PEOPLE[out.length % PEOPLE.length]);
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted.length]);

  return (
    <section style={{ marginBottom: '48px' }} dir="rtl">
      <SectionLabel>קרובים · הטיולים על הרשת</SectionLabel>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px',
        animation: `tv-fade-up 520ms ${EASE.out} 120ms both`,
      }}>
        {sorted.map((t, i) => (
          <GridTile
            key={t.id}
            trip={t}
            today={today}
            idx={i}
            personSrc={peoplePick[i]}
            hovered={hoverId === t.id}
            onEnter={() => setHoverId(t.id)}
            onLeave={() => setHoverId(prev => prev === t.id ? null : prev)}
          />
        ))}
      </div>

      <div style={{
        fontSize: '11px', color: T.textDim, marginTop: '14px',
        textAlign: 'center', letterSpacing: '0.4px',
      }}>
        רחף מעל יעד כדי לפתוח שיחה
      </div>
    </section>
  );
}

// ---------- Tile --------------------------------------------------------

function GridTile({ trip, today, idx, personSrc, hovered, onEnter, onLeave }) {
  const dLeft = daysLeftFrom(today, trip.startDate);
  const u = urgencyPalette(dLeft);
  const city    = (trip.cities && trip.cities[0]) || '';
  const country = (trip.countries && trip.countries[0]) || '';
  const back = destBackdrop(trip);
  const photo = destImage(trip);

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      tabIndex={0}
      style={{
        position: 'relative',
        aspectRatio: '3 / 4',
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'pointer',
        outline: 'none',
        background: photo ? '#0b1222' : back.background,
        boxShadow: hovered
          ? `0 14px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.12)`
          : `0 2px 10px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)`,
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: `transform 240ms ${EASE.out}, box-shadow 240ms ${EASE.out}`,
        animation: `tv-fade-up 480ms ${EASE.out} ${160 + idx * 60}ms both`,
        isolation: 'isolate',
        zIndex: hovered ? 20 : 1,
      }}
    >
      {/* Destination photo */}
      {photo && (
        <img
          src={photo}
          alt=""
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            transform: hovered ? 'scale(1.06)' : 'scale(1.01)',
            transition: `transform 600ms ${EASE.out}`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Sun / horizon glow (only if no photo) */}
      {!photo && (
        <div aria-hidden style={{
          position: 'absolute', left: '50%', bottom: '32%',
          transform: 'translateX(-50%)',
          width: '70%', height: '70%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${back.destStops[0]}aa 0%, ${back.destStops[0]}00 60%)`,
          filter: 'blur(6px)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Person cutout */}
      <img
        src={personSrc}
        alt=""
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: `translateX(-50%) scale(${hovered ? 1.03 : 1})`,
          transition: `transform 500ms ${EASE.out}`,
          height: '82%',
          width: 'auto',
          objectFit: 'contain',
          objectPosition: 'bottom center',
          pointerEvents: 'none',
          filter: 'drop-shadow(0 10px 14px rgba(0,0,0,0.45))',
        }}
      />

      {/* Top gradient for header legibility */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.55) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Header — profile-style */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '10px 12px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '8px',
        color: '#fff',
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: 700,
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}>
            <VerifiedDot />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {city || heCountry(country)}
            </span>
          </div>
          <div style={{
            fontSize: '10.5px', color: 'rgba(255,255,255,0.78)',
            letterSpacing: '0.2px', marginTop: '2px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}>
            {handleFor(trip)}
          </div>
        </div>

        <div style={{
          padding: '3px 7px',
          borderRadius: '999px',
          background: u.num,
          color: '#0f172a',
          fontSize: '10px', fontWeight: 800,
          letterSpacing: '0.3px',
          boxShadow: `0 2px 8px ${u.glow}`,
        }}>
          {dLeft > 0 ? `-${dLeft}ד` : u.label}
        </div>
      </div>

      {/* Footer — dates + duration */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '10px 12px',
        color: '#fff',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: '8px',
      }}>
        <div style={{
          fontSize: '11px', fontWeight: 600,
          textShadow: '0 1px 3px rgba(0,0,0,0.6)',
          lineHeight: 1.3,
        }}>
          {fmtShort(trip.startDate)} – {fmtShort(trip.endDate)}
          <div style={{
            fontSize: '10px', fontWeight: 500,
            color: 'rgba(255,255,255,0.78)',
            marginTop: '2px',
          }}>
            {daysBetween(trip.startDate, trip.endDate)} ימים
          </div>
        </div>
        <ChatIcon />
      </div>

      {/* Hover chat popover */}
      {hovered && (
        <ChatPopover trip={trip} today={today} />
      )}
    </div>
  );
}

function VerifiedDot() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '13px', height: '13px', borderRadius: '50%',
      background: '#38bdf8', color: '#fff',
      fontSize: '9px', fontWeight: 900,
      boxShadow: '0 0 0 1.5px rgba(255,255,255,0.6)',
    }}>✓</span>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>
      <path d="M4 5h16v10H8l-4 4V5z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  );
}

// ---------- Chat popover -----------------------------------------------

const CHAT_USER_BG = '#ff9a3c';     // orange bubble
const CHAT_TRIP_BG = '#7bc6e8';     // sky-blue bubble
const CHAT_TEXT    = '#0a0a0a';

function ChatPopover({ trip, today }) {
  const dLeft = daysLeftFrom(today, trip.startDate);
  const tripDays = daysBetween(trip.startDate, trip.endDate);
  const city = (trip.cities && trip.cities[0]) || '';

  const lines = [
    { side: 'trip', text: `היי! ${trip.name_he || trip.name} מדבר`, time: 'עכשיו' },
    { side: 'user', text: 'מתי אנחנו נפגשים?', time: '' },
    { side: 'trip', text: `${fmtDate(trip.startDate)} — עוד ${dLeft} ימים בדיוק 🛫`, time: '' },
    { side: 'user', text: `וכמה זמן ננשאר ב־${city}?` },
    { side: 'trip', text: `${tripDays} ימים. חזרה ב־${fmtShort(trip.endDate)}.` },
    { side: 'user', text: 'מי עוד מגיע?' },
    { side: 'trip', text: trip.companions && trip.companions.length
        ? `${trip.companions.join(' · ')} 👋` : 'רק אתה. חבילה שקטה.' },
  ];

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: '10px', bottom: '10px', left: '10px', right: '10px',
        borderRadius: '12px',
        background: 'rgba(8, 14, 28, 0.72)',
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
        padding: '10px 10px 8px',
        display: 'flex', flexDirection: 'column',
        gap: '6px',
        animation: `gridchat-pop 220ms ${EASE.out} both`,
        overflow: 'hidden',
      }}
    >
      {/* Popover header — mimics a chat title bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          width: '22px', height: '22px', borderRadius: '50%',
          background: CHAT_TRIP_BG,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', fontWeight: 900, color: CHAT_TEXT,
        }}>
          {city.slice(0,1) || 'T'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: '#fff',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{city}</div>
          <div style={{
            fontSize: '9px', color: '#7bc6e8',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <span style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: '#4ade80', display: 'inline-block',
            }} />
            פעיל
          </div>
        </div>
        <div style={{
          fontSize: '9px', color: T.textDim,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}>hover</div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        gap: '4px',
      }}>
        {lines.map((l, i) => (
          <Bubble key={i} side={l.side} text={l.text} time={l.time} delay={60 + i * 70} />
        ))}
      </div>
    </div>
  );
}

function Bubble({ side, text, time, delay }) {
  // side === 'user'  → orange, align to the START of the reading flow (user speaks)
  // side === 'trip'  → sky-blue, align to the opposite side
  // In RTL, "start" = right, "end" = left.
  const isUser = side === 'user';
  const bg = isUser ? CHAT_USER_BG : CHAT_TRIP_BG;

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-start' : 'flex-end',
      animation: `gridchat-bubble-in 260ms ${EASE.out} ${delay}ms both`,
    }}>
      <div style={{
        maxWidth: '82%',
        position: 'relative',
        padding: '6px 10px',
        borderRadius: '14px',
        background: bg,
        color: CHAT_TEXT,
        fontSize: '11.5px',
        lineHeight: 1.35,
        fontWeight: 500,
        boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        // Chat-tail corner: flatten the bottom corner on the speaker's side
        borderBottomRightRadius: isUser ? '14px' : '4px',
        borderBottomLeftRadius:  isUser ? '4px'  : '14px',
      }}>
        {text}
        {time && (
          <span style={{
            display: 'block',
            fontSize: '8.5px',
            color: 'rgba(0,0,0,0.5)',
            marginTop: '1px',
            textAlign: isUser ? 'left' : 'right',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}>
            {time}
          </span>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { GridReveal });
