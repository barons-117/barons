---
name: barons-project
description: סקיל מלא לפרויקט BARONS — אתר משפחתי עם יומן נסיעות, שוברים וכושר. כולל design system, ארכיטקטורה, חוקיות, ו-patterns. השתמש בסקיל הזה בכל שיחה חדשה על הפרויקט.
---

# BARONS Project Skill

## 1. פרטי פרויקט

```
Domain:     barons.co.il
Repo:       git@github.com:barons-117/barons.git
Local:      /Users/erezblt/Library/CloudStorage/Dropbox/Barons Site/barons/
Stack:      React + Vite → GitHub Pages
Routing:    HashRouter (#/travels, #/stats וכו׳)
Font:       Open Sans (Google Fonts) — חובה בכל מקום
Direction:  RTL לכל דבר
Commands:   npm run dev | npm run deploy
```

### Supabase
```
URL:     https://cwewsfuswiiliritikvh.supabase.co
Region:  eu-central-1
Project: cwewsfuswiiliritikvh
Auth:    Email + Password, RLS מופעל
```

### Users
| אימייל | שם | תפקיד |
|--------|-----|--------|
| erez@barons.co.il | ארז | SUPER_ADMIN |
| roy@barons.co.il | רועי | USER |

---

## 2. מבנה קבצים

```
src/
├── lib/supabase.js          ← Supabase client
├── pages/
│   ├── Home.jsx             ← דף כניסה + תפריט per user
│   ├── Travels.jsx          ← רשימת נסיעות
│   ├── TripDetail.jsx       ← עמוד נסיעה בודד
│   ├── TripItImport.jsx     ← ייבוא מ-TripIt (paste)
│   ├── Search.jsx           ← חיפוש מתקדם + ייצוא
│   ├── Stats.jsx            ← סטטיסטיקות
│   └── BaronsHeader.jsx     ← header משותף
public/
├── favicon.ico
├── logo-circle.png          ← לוגו על עיגול כחול כהה
├── logo-white.png
├── logo-dark.png
├── apple-touch-icon.png
└── upcoming/
    └── assets/
        ├── person.png       ← בובות אנשים לגריד הנסיעות הקרובות (1-9)
        ├── person-2.png
        ├── ...person-9.png
        └── dest/            ← תמונות רקע ליעדים
            ├── paris.avif
            ├── london.avif
            ├── budapest.jpg
            └── ... (ראה סעיף 16)
index.html                   ← Open Sans Hebrew מ-Google Fonts
index.css                    ← CSS variables + global animations
```

---

## 3. DB Schema

```sql
trips (id uuid PK, name, name_he, notes, tripit_url, impressions, created_at)

trip_segments (
  id uuid PK, trip_id FK,
  date_from date, date_to date,
  city, country, continent, notes
)

companions (id uuid PK, name UNIQUE)
segment_companions (segment_id FK, companion_id FK)

flights (
  id uuid PK, trip_id FK,
  airline_code, flight_number, aircraft, service_class,
  from_city, from_airport, from_country,
  to_city,   to_airport,   to_country,
  departure_date, departure_time,
  arrival_date,   arrival_time,
  stops, distance, confirmation, cost,
  created_at
)

lodging (
  id uuid PK, trip_id FK,
  hotel_name, address, room_type,
  check_in date, check_out date,
  num_guests, cost, confirmation, booking_site,
  created_at
)
```

---

## 4. Design System — Dark Theme (TripDetail + Travels)

בנוי על **Emil Kowalski easing system** + dark glass aesthetic.

### Tokens
```js
const DK = {
  bg:           '#0f172a',          // רקע ראשי
  surface:      'rgba(255,255,255,0.04)',
  surfaceBorder:'rgba(255,255,255,0.08)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  text:         '#e2e8f0',
  textMuted:    '#94a3b8',
  textDim:      '#64748b',
  accent:       '#3b82f6',
  glass:        'rgba(255,255,255,0.05)',
  glassBorder:  '1px solid rgba(255,255,255,0.08)',
  glassInner:   'inset 0 1px 0 rgba(255,255,255,0.06)',
  danger:       '#f87171',
  dangerBg:     'rgba(248,113,113,0.08)',
  dangerBorder: 'rgba(248,113,113,0.2)',
  font:         'Open Sans Hebrew, Open Sans, sans-serif',
}
```

### Easing (Emil Kowalski)
```js
const EASE = {
  out:    'cubic-bezier(0.23, 1, 0.32, 1)',
  inOut:  'cubic-bezier(0.77, 0, 0.175, 1)',
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
}
```

### Glass Card Helper
```js
function glassCard(extra = {}) {
  return {
    background: DK.surface,
    border: `1px solid ${DK.surfaceBorder}`,
    borderRadius: '16px',
    boxShadow: `0 4px 24px rgba(0,0,0,0.3), ${DK.glassInner}`,
    backdropFilter: 'blur(12px)',
    ...extra,
  }
}
```

### Animations (CSS keyframes)
```css
@keyframes td-fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes td-card-in {
  from { opacity: 0; transform: translateY(12px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
}
@keyframes td-hero-glow {
  0%,100% { transform: translate(0,0)   scale(1);    opacity: .18; }
  33%     { transform: translate(3%,-2%) scale(1.04); opacity: .22; }
  66%     { transform: translate(-2%,3%) scale(.97);  opacity: .15; }
}
```

### Continent Colors
```js
const CONT_COLORS = {
  'Europe':'#3b82f6', 'Asia':'#f59e0b', 'USA':'#10b981',
  'America':'#8b5cf6', 'Australia':'#f97316', 'Africa':'#ef4444',
}
```

---

## 5. Design System — Home Page

Dark editorial — Creativity 8, Variance 8.

```js
// Palette
bg:       '#0f1623'       // כחול כהה מאוד
accent:   '#B45309'       // amber
accentLt: '#F59E0B'
surface:  'rgba(255,255,255,0.04)'

// Typography
heroTitle: clamp(60px,8vw,120px), fontWeight:900, letterSpacing:'-0.04em'
tagline:   'לנהל משפחה זה חתיכת עסק'  // ← זה הטקסט הקבוע

// Animations
fadeUp: 'from opacity:0 translateY(18px)'
grain:  SVG noise overlay, opacity:0.025, mixBlendMode:overlay
blob:   radial amber gradient, animation floatUp 8s
```

### תפריט per User
```js
USER_MENUS = {
  'erez@barons.co.il': [נסיעות, כושר],
  'roy@barons.co.il':  [נסיעות, מרתון],
  // שוברים — מתווסף לשניהם כשהמודול יהיה מוכן
}
```

---

## 6. App Routes

```jsx
// App.jsx — HashRouter
/           → Home
/travels    → Travels
/travels/:id → TripDetail
/search     → Search
/stats      → Stats
/vouchers   → Vouchers (עתידי)
```

---

## 7. Patterns & Rules

### עברית
- **כל** העמודים RTL (`direction: 'rtl'`)
- תאריכים: `toLocaleDateString('he-IL', {day:'numeric', month:'short'})`
- `direction:'rtl'` בשדות תאריך ברשימות כדי שלא יתבלגנו עם אנגלית

### חיפוש עברית←אנגלית
```js
// HE_TO_EN map — מאפשר חיפוש "בנגקוק" למצוא Bangkok
const HE_TO_EN = {}
Object.entries(CITY_HE).forEach(([en,he])=>{HE_TO_EN[he]=en})
Object.entries(COUNTRY_HE).forEach(([en,he])=>{HE_TO_EN[he]=en})
```

### מלון לפי קטע — לוגיקה קריטית
```js
// STRICT: check_in < date_to (לא <=)
// כי יום עזיבה פריז = יום הגעה ניו יורק
function hotelsForSeg(seg, lodging) {
  return lodging.filter(l => {
    if (!l.check_in) return false
    if (!seg.date_to) return l.check_in >= seg.date_from
    return l.check_in >= seg.date_from && l.check_in < seg.date_to
  })
}
```

### מיון טיסות
```js
// לפי תאריך + שעה (לא רק תאריך)
function sortFlights(fs) {
  return [...fs].sort((a,b) =>
    ((a.departure_date||'') + (a.departure_time||'00:00'))
    .localeCompare((b.departure_date||'') + (b.departure_time||'00:00'))
  )
}
```

### יבשת אוטומטית
```js
const COUNTRY_TO_CONT = {
  'UK':'Europe', 'Thailand':'Asia', 'New York':'USA',
  'Canada':'America', 'Australia':'Australia', ...
}
// כשמוסיפים יעד — continent מחושב אוטומטית מהמדינה
```

### Airport Auto-fill
```js
const AIRPORT_INFO = {
  'TLV':{city:'Tel Aviv-Yafo',country:'IL'},
  'JFK':{city:'New York City',country:'New York'},
  'BKK':{city:'Bangkok',country:'Thailand'},
  // 80+ שדות תעופה...
}
// כשמקלידים קוד שדה → עיר ומדינה מתמלאים אוטומטית
```

---

## 8. TripItImport — ייבוא מ-TripIt

### איך עובד
1. TripIt → Print Trip → Cmd+A → Cmd+C → הדבק
2. פרסר מזהה: `TLVBUD` = airport pair → flight, `Check in` → hotel
3. מציג תצוגה מקדימה → שומר ל-Supabase

### שני מודים
- `TripItImport` (default) — מייבא לתוך טיול קיים (מ-TripDetail)
- `TripItImportWithTrip` (named export) — יוצר טיול חדש + מייבא (מ-Travels)

### מגבלות ידועות
- ICS של TripIt — בסיסי מאוד, **לא** מכיל טיסות/מלונות
- טיסה עם stopover מפוצלת לשתי טיסות נפרדות (נכון)

---

## 9. FlightAnimation — אנימציית גלובוס בכרטיסי טיסה

### קבצים
```
src/pages/FlightAnimation.jsx   ← קומפוננט הגלובוס SVG
src/pages/airports.js           ← 186 שדות תעופה: IATA → { city, lon, lat }
src/pages/continentsLoader.js   ← טוען geometria יבשות מ-CDN (cached)
```

### שימוש בטאב טיסות (TripDetail.jsx)
```jsx
import FlightAnimation from './FlightAnimation'

// בתוך כרטיס טיסה — grid 1fr auto 1fr, direction ltr
<FlightAnimation
  from={f.from_airport || 'TLV'}
  to={f.to_airport || 'CDG'}
  size={220}
  duration={2800}
  palette="dark"
  accent="#60a5fa"
  showLabels={false}
/>
```

### הוספת שדה תעופה חסר
ב-`airports.js`, בסוף האובייקט AIRPORTS:
```js
XYZ: { city: "שם העיר", lon: 34.89, lat: 32.01 },
```

---

## 10. GridReveal — נסיעות קרובות (Travels.jsx)

קומפוננט v11-gridchat — גריד 3 עמודות עם תמונות יעד, בובות אנשים, ספירה לאחור, ופופאובר צ׳אט בהובר.

### מבנה Assets
```
public/upcoming/assets/
├── person.png            ← בובות PNG (רקע שקוף) לגריד
├── person-2.png
├── ...
└── dest/
    ├── paris.avif
    ├── budapest.jpg
    └── ...
```

### הוספת בובת אדם חדשה
**צעד 1** — שמור קובץ PNG עם רקע שקוף:
```
public/upcoming/assets/person-10.png
```
**צעד 2** — הוסף שורה למערך PEOPLE ב-`Travels.jsx`:
```js
const PEOPLE = [
  '/upcoming/assets/person.png',
  ...
  '/upcoming/assets/person-10.png',  // ← מוסיף כאן
]
```

### הוספת יעד חדש
**צעד 1** — שמור תמונת יעד (WEBP עדיף, portrait 3:4 אידיאלי):
```
public/upcoming/assets/dest/tokyo.jpg
```
**צעד 2** — הוסף שורה ל-`destImage()` ב-`Travels.jsx`:
```js
// ברמת עיר (מדויק יותר):
const CITIES = [
  ...
  ['tokyo', '/upcoming/assets/dest/tokyo.jpg'],
]

// ברמת מדינה (fallback):
const COUNTRIES = [
  ...
  ['japan', '/upcoming/assets/dest/tokyo.jpg'],
]
```

### כשמישהו אומר "הוספתי יעד / אדם" — מה לעדכן
כשהמשתמש כותב משהו כמו:
- "הוספתי `tokyo.jpg` ליעד טוקיו"
- "הוספתי `person-10.png`"

→ לעדכן את `Travels.jsx` עם השורות הנכונות בתוך `destImage()` / `PEOPLE`.

### צבעי ספירה לאחור (urgencyPalette)
```js
dLeft <= 7  → '#f87171' אדום   — "כבר פה"
dLeft <= 30 → '#fbbf24' צהוב   — "ממש בקרוב"
dLeft <= 90 → '#38bdf8' כחול   — "בדרך"
dLeft > 90  → '#818cf8' סגול   — "בהמשך"
```

### יעדים קיימים עם תמונות (dest/)
```
paris.avif, london.avif, berlin.webp, amsterdam.webp,
barcelona.jpg, madrid.webp, budapest.jpg, newyork.jpg,
bangkok.jpg, sydney.jpeg, lasvegas.jpg, losangeles.jpg,
warsaw.jpg, prague.webp, bucharest.jpg, vienna.jpg,
lisbon.jpeg, brussels.jpg, vietnam.jpg
```

---

## 11. SQL Patterns

### ניקוי כפילויות
```sql
-- מחק כפילויות עם ROW_NUMBER (UUID ids)
DELETE FROM flights WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY trip_id, departure_date, flight_number, airline_code
      ORDER BY created_at
    ) AS rn FROM flights
  ) t WHERE rn > 1
);
```

### מחיקת companions ללא טיולים
```sql
DELETE FROM companions
WHERE id NOT IN (SELECT DISTINCT companion_id FROM segment_companions);
```

### יציאות/כניסות מישראל
```sql
SELECT t.name, t.name_he,
  MIN(f_out.departure_date) AS יציאה,
  MAX(f_in.arrival_date)    AS חזרה
FROM trips t
LEFT JOIN flights f_out ON f_out.trip_id = t.id
  AND (f_out.from_country = 'IL' OR f_out.from_airport = 'TLV')
LEFT JOIN flights f_in ON f_in.trip_id = t.id
  AND (f_in.to_country = 'IL' OR f_in.to_airport = 'TLV')
GROUP BY t.id, t.name, t.name_he
HAVING MIN(f_out.departure_date) IS NOT NULL
ORDER BY MIN(f_out.departure_date) DESC;
```

### ביקורת מלאה
```sql
-- טיולים ללא קטעים (לא יוצגו)
SELECT name FROM trips WHERE NOT EXISTS
  (SELECT 1 FROM trip_segments WHERE trip_id=trips.id);

-- קטעים ללא date_to
SELECT t.name, s.city, s.date_from FROM trip_segments s
JOIN trips t ON t.id=s.trip_id WHERE s.date_to IS NULL;
```

---

## 12. Supabase Notes — דברים שלמדנו

| נושא | כלל |
|------|-----|
| Storage RLS | לא דרך SQL — רק Dashboard → Storage → Policies |
| Table permissions | טבלאות חדשות צריכות `GRANT SELECT,INSERT,UPDATE,DELETE TO anon,authenticated` |
| UUID בshops | `MIN(id)` לא עובד עם UUID — השתמש ב-`ROW_NUMBER()` |
| Service role key | אסור ב-git! רק ב-.env. Publishable key: `sb_publishable_...` |
| Shopping RLS | בכוונה פתוח ל-anon (ShoppingQuick) — לא לשנות |

---

## 13. Component Patterns

### Breadcrumbs — כל עמוד
```jsx
<nav style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px'}}>
  <button onClick={()=>navigate('/')}>BARONS</button>
  <span>/</span>
  <button onClick={()=>navigate('/travels')}>נסיעות</button>
  <span>/</span>
  <span>שם הדף</span>
</nav>
```

### Tabs — dark blue bar
```jsx
// background: '#1e40af'
// tab active: color white, borderBottom '3px solid white'
// badge on active: background white, color '#1d4ed8'
```

### Modal Shell
```jsx
// overlay: rgba(0,0,0,0.7) + backdropFilter:blur(8px)
// box: background '#1e293b', border '1px solid rgba(255,255,255,0.1)'
// width: 540px, borderRadius: 20px
```

### Arrival Date — כפתורי ±
```jsx
// תאריך נחיתה = תאריך המראה כברירת מחדל
// כפתורי − ו-+ לשינוי יום אחד (לא date picker מלא)
function addDays(d, n) {
  const dt = new Date(d + 'T12:00:00')
  dt.setDate(dt.getDate() + n)
  return dt.toISOString().split('T')[0]
}
```

---

## 14. Skills שהופעלו בפרויקט

| Skill | שימוש |
|-------|-------|
| Emil Kowalski easing | כל ה-animations ב-Travels + TripDetail |
| Dark glass aesthetic | TripDetail hero, cards, modals |
| Industrial brutalist (Taste) | Home page — grain, blobs, editorial typography |
| Full-output enforcement | כתיבת קבצים שלמים בלי קיצורים |

### עקרון מרכזי מ-Emil
- **אף פעם** לא `linear` או `ease-in-out`
- תמיד `cubic-bezier(0.23, 1, 0.32, 1)` לאנימציות
- Animate רק `transform` ו-`opacity` — לא `top/left/width/height`
- `will-change: transform` רק על אלמנטים שמתנועעים בפועל

---

## 15. Known Pitfalls

1. **JSX truncation** — אף פעם לא לקצר קבצים באמצע. קובץ שנכתב חלקית = קובץ שבור
2. **date comparison** — תמיד `date + 'T12:00:00'` ל-`new Date()` כדי להימנע מבעיות timezone
3. **direction RTL + LTR mix** — כרטיסי טיסה: `direction:'ltr'` על הגריד, `direction:'rtl'` על תאריכים
4. **hotel date logic** — `<` (strict) ולא `<=` לבדיקת check_in < date_to
5. **companions cleanup** — תמיד להריץ `DELETE FROM companions WHERE id NOT IN...` אחרי עריכות
6. **UUID** — אין `MIN(id)` על UUID, להשתמש ב-`ROW_NUMBER() OVER (...ORDER BY created_at)`

---

## 16. Git Workflow

```bash
cd "/Users/erezblt/Library/CloudStorage/Dropbox/Barons Site/barons"
# פיתוח
npm run dev
# העתק קבצים שנוצרו → src/pages/
# ואז:
git add -A
git commit -m "description"
git push
npm run deploy
```

---

## 17. עתידי — Sub-projects מתוכננים

| מודול | סטטוס | route |
|-------|--------|-------|
| שוברים (Vouchers) | בפיתוח | `/vouchers` |
| כושר | קיים (static HTML) | `/gym/gym-tracker.html` |
| מרתון | קיים (static HTML) | `/roy/marathon.html` |

### הוספת מודול חדש — צ׳קליסט
1. `src/pages/NewModule.jsx`
2. Route ב-`App.jsx`
3. תפריט ב-`Home.jsx` → `USER_MENUS` (לאיזה users)
4. טבלה ב-Supabase + RLS
5. `npm run deploy`
