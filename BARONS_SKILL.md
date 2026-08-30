---
name: barons-project
description: סקיל מלא לפרויקט BARONS — אתר משפחתי עם יומן נסיעות, שוברים וכושר. כולל design system, ארכיטקטורה, חוקיות, ו-patterns. השתמש בסקיל הזה בכל שיחה חדשה על הפרויקט.
---

# BARONS Project Skill

## 1. פרטי פרויקט

```
Domain:     barons.co.il
Repo:       git@github.com:barons-117/barons.git   ← SSH בלבד, ראה §14
Local:      Dropbox/A Sites/barons/
            iMac White:   /Users/erezb/...
            iMac Blue:    /Users/erezbaron/...
            MacBook Air:  /Users/erezblt/...
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
│   ├── Assets.jsx           ← רשימת נכסים + SummaryBlock + EntitySection
│   ├── AssetDetail.jsx      ← עמוד נכס + HierarchySection
│   ├── EinavVouchers.jsx    ← קופונינב
│   └── BaronsHeader.jsx     ← header משותף
public/
├── favicon.ico
├── logo-circle.png          ← לוגו על עיגול כחול כהה
├── logo-white.png
├── logo-dark.png
└── apple-touch-icon.png
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

### מודול נכסים (`/assets`)

```sql
assets (
  id uuid PK,
  parent_asset_id uuid FK → assets(id) ON DELETE SET NULL,   -- היררכיית החזקות, §17
  name, description,
  asset_type,          -- residential | commercial | real_estate_abroad
                       -- | equity | land | investment | income
  status,              -- active | archived | sold
  address_street, address_city, address_country,
  gush, helka,
  estimated_value, estimated_value_currency,
  sold_date, sold_price, sold_price_currency,
  cover_image_path, cover_image_path2, cover_image_path3,
  created_at, updated_at
)

asset_partners (
  id uuid PK, asset_id FK,
  entity,              -- erez | roi | erez_roi | reuven_private | reuven_company | external
  percentage numeric,  -- ⚠️ שבר 0–1, לא 0–100. סכום לכל נכס חייב = 1.0000
  name, notes, created_at
)

asset_income (
  id uuid PK, asset_id FK,
  tenant_name, tenant_phone, tenant_email,
  tenant_name2, tenant_phone2, tenant_email2,
  gross_amount, currency,
  payment_frequency,   -- monthly | quarterly | semi-annual | annual
  vat_type,            -- none | included | excluded
  is_active bool, split_by_ownership bool,   -- ⚠️ nullable — לבדוק !== false
  income_kind, start_date, contract_end_date, vacated_date,
  notes, created_at, updated_at
)

asset_income_splits (id uuid PK, income_id FK, entity, percentage)
asset_purchases     (id uuid PK, asset_id FK, purchase_date, amount, currency, from_whom, notes)
asset_events        (id uuid PK, asset_id FK, event_date, description)
asset_investments   (id uuid PK, asset_id FK, manager_name, amount, currency, balance_date, notes, sort_order)
asset_files         (id uuid PK, asset_id FK, storage_path, caption, sort_order)
contacts            (id uuid PK, asset_id FK, name, role, phone, email, notes)
```

**תמונות:** `cover_image_path*` הוא נתיב ב-Storage bucket `assets`. הקוד קורא ב-`createSignedUrl(path)` לפי הנתיב עצמו, **לא** לפי תיקיית ה-asset — לכן אפשר להעביר מצביע תמונה בין נכסים ב-`UPDATE` בלי להזיז את הקובץ.

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
/vouchers   → Vouchers
/assets     → Assets            ← רשימה + קיבוץ היררכי (§17)
/assets/:id → AssetDetail       ← ⚠️ 'new' = יצירת רשומה ריקה + redirect
/einav      → EinavVouchers
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

## 9. SQL Patterns

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

## 10. Supabase Notes — דברים שלמדנו

| נושא | כלל |
|------|-----|
| Storage RLS | לא דרך SQL — רק Dashboard → Storage → Policies |
| Table permissions | טבלאות חדשות צריכות `GRANT SELECT,INSERT,UPDATE,DELETE TO anon,authenticated` |
| UUID בshops | `MIN(id)` לא עובד עם UUID — השתמש ב-`ROW_NUMBER()` |
| Service role key | אסור ב-git! רק ב-.env. Publishable key: `sb_publishable_...` |
| Shopping RLS | בכוונה פתוח ל-anon (ShoppingQuick) — לא לשנות |
| `parent_asset_id` | נכס-מטרייה לא נושא `estimated_value` ולא `asset_income` — אחרת ספירה כפולה (§17) |
| `asset_partners.percentage` | שבר 0–1. סכום לכל נכס = 1.0000, כולל `external` — החישוב מסתמך על זה |
| מצביעי תמונות | `createSignedUrl` קורא לפי `path` ולא לפי תיקייה — אפשר להעביר בין נכסים ב-`UPDATE` |
| מחרוזות ריקות | להמיר ל-`null` לפני insert בעמודות typed (date וכו') — אחרת כשל שקט. תמיד לבדוק את `error` |

---

## 11. Component Patterns

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

## 12. Skills שהופעלו בפרויקט

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

## 13. Known Pitfalls

1. **JSX truncation** — אף פעם לא לקצר קבצים באמצע. קובץ שנכתב חלקית = קובץ שבור
2. **date comparison** — תמיד `date + 'T12:00:00'` ל-`new Date()` כדי להימנע מבעיות timezone
3. **direction RTL + LTR mix** — כרטיסי טיסה: `direction:'ltr'` על הגריד, `direction:'rtl'` על תאריכים
4. **hotel date logic** — `<` (strict) ולא `<=` לבדיקת check_in < date_to
5. **companions cleanup** — תמיד להריץ `DELETE FROM companions WHERE id NOT IN...` אחרי עריכות
6. **UUID** — אין `MIN(id)` על UUID, להשתמש ב-`ROW_NUMBER() OVER (...ORDER BY created_at)`
7. **node_modules ב-Dropbox** — `mv node_modules /tmp/...` נכשל ב-`Operation timed out` על CloudStorage. להשתמש ב-`rm -rf node_modules`. תמיד לוודא שהמחיקה הצליחה לפני `npm install`, אחרת npm רואה תיקייה קיימת ומוסיף 2 חבילות ב-9 שניות במקום להתקין מאפס — והבינארי הפגום נשאר
8. **`gh-pages` לא יורש את `origin`** — הוא פותח חיבור HTTPS משלו. `git remote set-url` לבדו לא מספיק; צריך גם `url.insteadOf` גלובלי (ראה §16)
9. **`&&` בין build ל-git** — אם מריצים `git` בשורה נפרדת הוא ירוץ גם כשהבילד נכשל, וייווצר קומיט על קוד שבור. תמיד שרשרת אחת: `npm run build && npm run deploy && git push`
10. **עותקים מתנגשים של Dropbox** — `*conflicted copy*` נכנסים ל-git ומזהמים קומיטים. לפני מחיקה תמיד לוודא שהמקור קיים (ייתכן שהמקור נמחק והעותק הוא הקובץ היחיד ששרד)

---

## 14. Git Workflow

```bash
cd "/Users/erezblt/Library/CloudStorage/Dropbox/A Sites/barons"
# פיתוח
npm run dev
# העתק קבצים שנוצרו → src/pages/
# ואז — שרשרת אחת, לא שורות נפרדות:
npm run build && npm run deploy && git push
```

### Remote — SSH בלבד

ה-PAT הקלאסי ("barons") פג ביולי 2026. עברנו ל-SSH. מפתח נפרד לכל מכונה (iMac Blue, iMac White, MacBook Air), Authentication Key ולא Signing Key.

```bash
ssh-keygen -t ed25519 -C "erez@barons.co.il"
pbcopy < ~/.ssh/id_ed25519.pub        # ← להדביק ב-GitHub, השורה המלאה
git remote set-url origin git@github.com:barons-117/barons.git
git config --global url."git@github.com:".insteadOf "https://github.com/"
ssh -T git@github.com                  # ← אמור להחזיר "Hi barons-117!"
```

ה-`insteadOf` הוא הקריטי — בלעדיו `gh-pages` יבקש שם וסיסמה. GitHub לא מקבל סיסמאות מ-2021, ובפרט לא סיסמת Google SSO. אם מופיעה בקשת סיסמה — Ctrl+C, לא להזין כלום.

### `.gitignore` — חובה

```
*conflicted copy*
.claude/
supabase/.temp/
node_modules
```

### זהות git

```bash
git config --global user.name "Erez Baron"
git config --global user.email "erez@barons.co.il"
```

בלי זה git ממציא `erezb@Erezs-iMac-White.local` מה-hostname.

---

## 15. עתידי — Sub-projects מתוכננים

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

---

## 16. Deployment Runbook — פריסה מאפס

הסדר הזה נבדק ב-30/08/2026 אחרי כשל פריסה מלא. לעקוב שלב-שלב, לא לדלג.

### 0. אם הבילד נכשל ב-`Cannot find native binding`

Dropbox סנכרן חלקית את `node_modules` ובלע את הבינארי הנייטיב של rolldown.

```bash
# 1. Quit ל-Dropbox (לא רק Pause — Pause לפעמים לא נתפס)
cd "/Users/erezb/Library/CloudStorage/Dropbox/A Sites/barons"
rm -rf node_modules                    # לא mv! ראה §13.7
ls -d node_modules 2>/dev/null && echo "עדיין קיים — עצור" || echo "נמחק"
rm -f package-lock.json
npm install                            # ← אמור לקחת ~40s ולהוסיף ~300 חבילות
xattr -w com.dropbox.ignored 1 node_modules
# 2. עכשיו לחדש את Dropbox
```

**סימן שההתקנה לא באמת רצה:** "added 2 packages ... in 9s". התקנה אמיתית = מאות חבילות, עשרות שניות.

**אם עדיין נכשל אחרי זה** — זו גרסת Node. v25.x היא אי-זוגית ו-rolldown לא מפרסם עבורה בינאריים. לעבור ל-22 LTS:
```bash
nvm install 22 && nvm use 22 && rm -rf node_modules && npm install
```

### 1. ניקוי לפני קומיט

```bash
find src public supabase -name "*conflicted copy*" -print
```
לוודא שהמקור של כל קובץ קיים לפני מחיקה, ואז:
```bash
find src public supabase -name "*conflicted copy*" -delete
git rm -r --cached supabase/.temp .claude 2>/dev/null
```

### 2. פריסה

```bash
npm run build && npm run deploy && git push
```

### 3. אימות

לפתוח `https://barons.co.il/#/assets` **בחלון פרטי** או Cmd+Shift+R. HashRouter מגיש מ-cache ונראה כאילו הפריסה נכשלה כשהיא עברה.

**אם gh-pages תקוע על Published בלי שהאתר מתעדכן:** Settings → Pages → source ל-None, שמור, וחזרה ל-`gh-pages`.

---

## 17. מודול נכסים — היררכיית חברות החזקות

### הבעיה

נכס אחד (`OKY LLC — קליבלנד ואוהיו`) הכיל בפועל שני נכסים פיזיים באותה רשומה — `address_street` היה `11629 Ravenna Rd / 2023 W 93rd St`. אין איפה לשים כתובת שנייה, שוכר שני, או חוזה נפרד.

### ההכרעה — מודל שטוח + עמודת `parent_asset_id`

נכס נפרד לכל נכס פיזי, ונכס-מטרייה אחד לחברה. הסיבות: כל הסכמה ב-`AssetDetail` היא per-property (כתובת, gush/helka, מפה, 3 תמונות, purchases, income עם שוכרים, contacts, files, events); הסינונים עובדים ברמת נכס; ומכירה של נכס אחד מתוך כמה = `status: 'sold'` במקום מחיקת שורות מרשומה חיה.

```sql
ALTER TABLE assets ADD COLUMN IF NOT EXISTS parent_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets(parent_asset_id);
```

### ⚠️ הכלל הקריטי — חלוקת אחריות

| | החברה (מטרייה) | הנכסים (בנים) |
|---|---|---|
| `estimated_value` | **NULL** | **NULL** |
| `asset_purchases` | ✅ רכישות החלקים ב-LLC | ❌ ריק |
| `asset_income` | ❌ ריק | ✅ שכירות ושוכרים |
| כתובת, תמונות, מסמכים | ❌ | ✅ |
| `asset_partners` | ✅ אחוז אפקטיבי | ✅ אותו אחוז אפקטיבי |

**למה זה עובד בלי שינוי קוד:** כש-`estimated_value = NULL`, ה-fallback ב-`SummaryBlock` וב-`AssetCard` מחשב `_totalPurchasesILS / internalPct × pct`. עם רכישות רק על המטרייה, זה מחזיר בדיוק את סך מה ששולם. הבנים בלי רכישות ובלי `estimated_value` תורמים 0 לשווי. **אין ספירה כפולה.**

לכן **לא צריך** דגל `is_holding` ולא צריך לסנן את המטרייה מהחישוב. נשקל ונדחה — היה מוסיף סיבוכיות בלי תועלת.

**מלכודת:** אם מוסיפים `estimated_value` לנכס בן *וגם* משאירים רכישות על המטרייה — ספירה כפולה מיידית. להחליט אחת: או שווי שוק על הבנים והמטרייה נקייה, או cost basis על המטרייה והבנים נקיים. **בפרויקט זה נבחר cost basis על המטרייה.**

### אחוזים אפקטיביים (look-through)

לא מוסיפים entity חדש ל-`ENTITY_META` עבור כלי החזקה — הישויות שם מייצגות *מי מהמשפחה*, לא *דרך איזה כלי*, וזה מפוצץ את `ENTITIES[].match`. במקום זה: אחוז אפקטיבי ישיר על כל נכס בן.

```sql
INSERT INTO asset_partners (asset_id, entity, percentage, name, notes)
SELECT c.id, v.entity, v.pct, v.pname, 'דרך OKY LLC'
FROM (VALUES ('<child-1>'::uuid), ('<child-2>'::uuid)) AS c(id),
     (VALUES ('erez_roi', 0.1456, NULL::text),
             ('external', 0.3673, 'יובל קליין'),
             ('external', 0.4871, 'מיכל קליין')) AS v(entity, pct, pname);
```

חובה להזין גם את ה-`external` — חישוב `fullValue = _totalPurchasesILS / internalPct` מסתמך על כך שהאחוזים מסתכמים ל-1.0000.

### שינויי קוד שבוצעו

**`Assets.jsx`** — `EntitySection` בונה מפת `childrenOf` מתוך הרשימה המסוננת ומקנן בנים במסגרת ענבר (`.assets-group` / `.assets-group-children`). נכס בן מקונן **רק אם האם עבר את אותם פילטרים** — כך שסינון לפי `real_estate_abroad` (שמעלים את המטרייה, שהיא `equity`) מציג את הבנים עצמאית במקום להעלים אותם. אינדקס ה-stagger רץ דרך `nextIndex()` ונשאר רציף על פני הקינון.

`AssetCard` קיבל שלושה props אופציונליים: `childCount` ("מחזיקה N נכסים"), `heldViaName` ("דרך X"), `isChild` (class לעיצוב). בלעדיהם ההתנהגות זהה לקודם.

**`AssetDetail.jsx`** — קומפוננטת `HierarchySection` חדשה. ⚠️ ה-prop נקרא `items` ולא `children` — `children` הוא prop שמור ב-React. שליפת ההיררכיה עטופה ב-`try/catch` כדי שהעמוד ימשיך לעבוד על סביבה שבה המיגרציה עוד לא רצה. Breadcrumb מדורג: `נכסים ← <חברה> ← <נכס>`.

### מצב נוכחי — OKY Properties LLC

```
a1000000-...-0004  OKY Properties LLC          equity, EIN 36-4901498, 14.5598795%
├─ a1000000-...-0041  טווינסבורג — 6 יח"ד, Ravenna Rd    (ההכנסה $5,700/חודש)
└─ a1000000-...-0042  קליבלנד — 2023 W 93rd St            (2 יחידות, is_active=false)
```

רכישות על המטרייה: $38,990 (2020) + $21,745 (2021) + $9,463 (2026) = **$70,198** = החלק שלנו. שווי חברה משתמע: ~$482,000.

**מקורות נתונים:** K-1 שנתי מ-M. Moretzky LLC (מגיע ~יולי), טופס 8805, Schedule K-3, Ohio IT K-1. מס עירוני ל-RITA עבור Twinsburg בלבד.

**פתוח:** יחידה 2 ב-93rd לא מפורסמת ב-Zillow — לברר עם יובל אם מושכרת ($1,900/חודש). תמונות 93rd עדיין לא הועלו. כששוכר נחתם — להפוך את רשומת ההכנסה ל-`is_active = true`.

### הוספת נכס נוסף לחברה קיימת — צ׳קליסט

1. `INSERT INTO assets` עם `parent_asset_id`, בלי `estimated_value`
2. `INSERT INTO asset_partners` — האחוז האפקטיבי + כל ה-`external`, סכום = 1.0000
3. `INSERT INTO asset_income` — `is_active = false` עד חתימת שוכר
4. אימות: `sum_pct = 1.0000`, `estimated_value IS NULL`, אפס רכישות על הבן
5. תמונות — ידנית דרך ה-UI (לא ניתן דרך SQL)

### שאילתת אימות

```sql
SELECT a.name, a.parent_asset_id IS NOT NULL AS is_child, a.estimated_value,
       (SELECT round(sum(percentage)::numeric,4) FROM asset_partners p WHERE p.asset_id=a.id) AS sum_pct,
       (SELECT count(*) FROM asset_income i WHERE i.asset_id=a.id AND i.is_active) AS active_income,
       (SELECT round(sum(amount)::numeric) FROM asset_purchases u WHERE u.asset_id=a.id) AS purchases
FROM assets a
WHERE a.id = '<holding-uuid>' OR a.parent_asset_id = '<holding-uuid>'
ORDER BY is_child, a.name;
```

### מתי *לא* לפצל

אם מקבלים דיסטריביושן אחד מהחברה ולא עוקבים אחרי שכירות פר-נכס — החברה היא נכס `equity` בודד וההכנסה היא הדיסטריביושן. הפיצול מוצדק רק כשמנהלים שוכרים, הוצאות ומכירה ברמת הנכס.

---

## 18. חוב טכני פתוח

| נושא | פרטים |
|------|--------|
| Chunk > 500kB | אזהרת Vite בבילד. פתרון: code-splitting עם `import()` דינמי על המסלולים |
| `npm audit` | 1 high severity אחרי ההתקנה מחדש. לא חוסם בילד — לטפל בנפרד, לא באמצע פריסה |
| `git remote` פר-מכונה | ה-SSH הוגדר על iMac White בלבד. iMac Blue ו-MacBook Air עדיין על HTTPS עם PAT שפג |
| שערי FX | `FALLBACK_FX` מקודדים בשלושה מקומות (`Assets.jsx`, `AssetDetail.jsx`, `load()`). לאחד |
