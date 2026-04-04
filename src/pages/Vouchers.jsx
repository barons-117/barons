// src/pages/Vouchers.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ── Constants ──────────────────────────────────────────────────────────────────

const VOUCHER_TYPES = [
  'כרטיס מתנה', 'זיכוי', 'ואוצ׳ר',
  'נופשונית', 'נופשונית פלוס',
  'BUYME CHEF', 'BUYME ALL', 'ChefZone',
  'ישראכרט Gift Card', 'אחר',
]

// רשימות חנויות מדויקות לפי סוג
const TYPE_STORES = {
  'נופשונית': [
    'דן', 'לאונרדו', 'פתאל', 'ישרוטל', 'קיסר', 'רימונים',
    'פסגות', 'אורבי', 'הרודס', 'יו (U Hotels)', 'אסטרל',
    'נוף גינוסר', 'קיבוצים נבחרים', 'בוטיקים נבחרים',
  ],
  'נופשונית פלוס': [
    // אופנה ולייף סטייל
    'פוקס', 'פוקס הום', 'מנגו', 'גולף', 'גולף קידס', 'גולף אנד קו',
    'אינטימה', 'פולגת', 'כיתן', 'ללין', 'שילב', 'אמריקן איגל', 'Aerie',
    'JUMP & ONOT', 'מייקל קורס', 'טומי הילפיגר', 'פקטורי 54',
    'ארמני אקסצ׳יינג׳', 'אמפוריו ארמאני', 'DKNY', 'GUESS', 'BOSS',
    'לקוסט', 'ראלף לורן', 'קלווין קליין', 'ליוויס', 'דיזל',
    'אדידס', 'פומה', 'אנדר ארמור', 'The North Face', 'קולומביה',
    'טימברלנד', 'VANS', 'קונברס', 'Foot Locker', 'סקצ׳רס', 'ניין ווסט',
    'סטיב מאדן', 'אלדו', 'לי קופר', 'H&O', 'The Childrens Place',
    'אפרודיטה', 'גלי', 'סולוג', 'SABON', 'בודי שופ', 'אופטיקנה',
    'סאן גלס', 'Sunglass Hut', 'בילבונג', 'Rip Curl', 'Ruby Bay',
    'ARMANI EXCHANGE', 'BOGART', "Carter's",
    // הכל לבית
    'הום סנטר', 'המשביר לצרכן', 'ורדינון', 'נעמן', 'כיתן',
    'Flying Tiger', 'Homestyle', 'צומת ספרים', 'סטימצקי',
    'טרקלין חשמל', 'שקם אלקטריק', 'קאזה בלה',
    // מסעדות ובתי קפה
    'קפה קפה', 'מקס ברנר', 'קפה גרג', 'רשת Greenz',
    'רשת וניליה', 'בן אנד ג׳ריס',
    // בריאות וכושר
    'הולמס פלייס', 'רשת הקאנטרי', 'קאנטרי 360', 'ספורטר',
    // אירוח ונופש
    'מלון בראון', 'מלון בראון ביץ׳ האוס', 'מלון פרימה', 'מלון מטרופוליטן',
    'מלון גרנד ביץ תל אביב', 'מלון ליר סנס', 'מלון PLAY',
    'מלון איילנד נתניה', 'מלונות רוקסון', 'רשת דומוס',
    // ספא
    'share spa הרודס', 'share spa לאונרדו', 'share spa דיוויד ים המלח',
    'הולמס פלייס ספא', 'זאוס ספא', 'ספא ויה לומה דן תל אביב',
    'Okoa spa קמפינסקי', 'JAH SPA דן קיסריה',
    // בילוי ופנאי
    'סינמה סיטי', 'סינמטק תל אביב', 'תאטרון הבימה', 'תיאטרון הקאמרי',
    // יקבים
    'יקב ברקן', 'יקב בן נון',
    // צרכנות
    'פלאפון',
  ],
  'BUYME CHEF': [
    'מסעדות שף נבחרות', 'בתי קפה גורמה', 'ChefZone', 'סדנאות בישול',
  ],
  'BUYME ALL': [
    'פוקס', 'פוקס הום', "The Children's Place", 'מנגו', 'גולף',
    'גולף אנד קו', 'גולף קידס', 'פולגת', 'אינטימה', 'כיתן',
    'JUMP & ONOT', 'MAC', 'SABON', 'לאליין', 'Foot Locker',
    'קונברס', 'American Eagle', 'Aerie', 'גולברי', 'שילב',
    'Sunglass Hut', 'Homestyle', 'בורגראנץ׳', 'Flying Tiger',
    'אופטיקנה', 'ESTEE LAUDER', 'בילבונג', 'קוויקסילבר',
    'תיק התיקים', 'א.ל.מ חשמל', 'טרקלין חשמל',
    'מסעדות שף', 'נופש ומלונות', 'סדנאות', '+ אלפי עסקים נוספים',
  ],
  'ChefZone': [
    'ChefZone', 'מסעדות שף נבחרות', 'בתי קפה', 'אירועי קולינריה', 'סדנאות בישול',
  ],
  'ישראכרט Gift Card': [
    'פוקס', 'פוקס הום', 'מנגו', 'גולף', 'גולף אנד קו', 'גולף קידס',
    'אינטימה', 'פולגת', 'כיתן', 'SABON', 'גולברי', 'לאליין',
    'American Eagle', 'Aerie', 'JUMP', 'ONOT', 'שילב',
    'Michael Kors', 'Factory54', 'Tommy Hilfiger', 'Originals',
    'ארמני אקסצ׳יינג׳', 'The Body Shop', "The Children's Place",
    'Desigual', 'Tous', 'LONGCHAMP', 'ורדינון', 'נעמן',
    'ACE', 'צומת ספרים', 'המשביר לצרכן', 'H&O',
    'אופטיקנה', 'קפה קפה', 'הבורסה לתכשיטים', 'אפרודיטה',
    'גלי', 'לי קופר', 'ניין ווסט', 'ESTEE LAUDER',
  ],
}

const TYPE_LINKS = {
  'נופשונית':           'https://www.nofshonit.co.il',
  'נופשונית פלוס':      'https://www.swishgifts.co.il/brands',
  'BUYME CHEF':         'https://buyme.co.il/brands/752649',
  'BUYME ALL':          'https://buyme.co.il/brands/13438757',
  'ChefZone':           'https://www.htzone.co.il/voucher-zone/1',
  'ישראכרט Gift Card':  'https://business.isracard.co.il/promotion_gifts/Gift_Card',
}

const TYPE_COLORS = {
  'נופשונית':           { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  'נופשונית פלוס':      { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
  'BUYME CHEF':         { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  'BUYME ALL':          { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
  'ChefZone':           { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  'ישראכרט Gift Card':  { bg: '#fff7ed', text: '#9a3412', border: '#fdba74' },
  'כרטיס מתנה':         { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4' },
  'זיכוי':              { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  'ואוצ׳ר':             { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' },
  'אחר':                { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
}

const RECEIVED_BY_OPTIONS = ['ארז', 'רועי', 'שניהם', 'אחר']

const USER_NAMES = {
  'erez@barons.co.il': 'ארז',
  'roy@barons.co.il':  'רועי',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const expiryStatus = (dateStr) => {
  if (!dateStr) return { color: '#94a3b8', bg: '#f8fafc', label: 'ללא תוקף', urgent: false }
  const days = Math.ceil((new Date(dateStr) - new Date()) / 86_400_000)
  if (days < 0)  return { color: '#dc2626', bg: '#fef2f2', label: `פג תוקף לפני ${-days} ימים`, urgent: true }
  if (days === 0) return { color: '#dc2626', bg: '#fef2f2', label: 'פג תוקף היום!', urgent: true }
  if (days <= 14) return { color: '#dc2626', bg: '#fef2f2', label: `⚠️ ${days} ימים נותרו`, urgent: true }
  if (days <= 60) return { color: '#d97706', bg: '#fffbeb', label: `${days} ימים · ${fmtDate(dateStr)}`, urgent: true }
  return { color: '#059669', bg: '#f0fdf4', label: fmtDate(dateStr), urgent: false }
}

const fmtDate = (s) =>
  s ? new Date(s).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

const fmtMoney = (n, currency) => {
  if (n == null || n === '') return null
  const num = Number(n).toLocaleString('he-IL')
  if (currency === 'USD') return `$${num}`
  return `₪${num}`
}

const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('he-IL', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }) : '—'

const storesToArr = (s) =>
  Array.isArray(s) ? s : (s || '').split(',').map(x => x.trim()).filter(Boolean)
const arrToStores = (a) => a.join(', ')

// ── Design tokens ──────────────────────────────────────────────────────────────

const F = "'Open Sans','Open Sans Hebrew',Arial,sans-serif"

const css = {
  page: { minHeight: '100vh', background: '#f0f4ff', fontFamily: F, direction: 'rtl' },
  header: { background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100, padding: '12px 20px' },
  navBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', fontFamily: F, fontSize: 14, padding: 0, fontWeight: 600 },
  primaryBtn: { background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  outlineBtn: { background: '#fff', color: '#1d4ed8', border: '1px solid #1d4ed8', borderRadius: 8, padding: '6px 14px', fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  ghostBtn: { background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 14px', fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  input: { width: '100%', padding: '9px 12px', fontSize: 14, fontFamily: F, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#1e293b' },
  label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.6px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' },
  modal: { background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 560, height: '90vh', display: 'flex', flexDirection: 'column', fontFamily: F, direction: 'rtl', paddingBottom: 'env(safe-area-inset-bottom)' },
}

// ── TypeBadge ──────────────────────────────────────────────────────────────────

function TypeBadge({ type, small }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS['אחר']
  return (
    <span style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: 20, padding: small ? '2px 8px' : '3px 10px',
      fontSize: small ? 11 : 12, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {type || 'אחר'}
    </span>
  )
}

// ── StoreChips ─────────────────────────────────────────────────────────────────

function StoreChips({ stores, type, editable, onChange }) {
  const [input, setInput] = useState('')
  const arr = storesToArr(stores)

  function add(val) {
    const t = val.trim()
    if (!t || arr.includes(t)) return
    onChange(arrToStores([...arr, t]))
    setInput('')
  }
  function remove(i) {
    onChange(arrToStores(arr.filter((_, idx) => idx !== i)))
  }
  function fillDefaults() {
    const defaults = TYPE_STORES[type] || []
    onChange(arrToStores([...new Set([...arr, ...defaults])]))
  }

  const link = TYPE_LINKS[type]

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {arr.length === 0 && !editable && (
          <span style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>לא הוגדרו חנויות</span>
        )}
        {arr.map((s, i) => (
          <span key={i} style={{
            background: '#f1f5f9', color: '#334155', borderRadius: 20,
            padding: '4px 10px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            {s}
            {editable && (
              <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
            )}
          </span>
        ))}
      </div>

      {editable && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            style={{ ...css.input, flex: '1 1 150px', padding: '7px 10px', fontSize: 13 }}
            placeholder="הוסף חנות..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add(input))}
          />
          <button onClick={() => add(input)} style={{ ...css.outlineBtn, padding: '7px 12px' }}>+ הוסף</button>
          {TYPE_STORES[type] && (
            <button onClick={fillDefaults} style={{ ...css.ghostBtn, padding: '7px 12px', fontSize: 12 }}>✨ מלא אוטומטית</button>
          )}
          {link && <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1d4ed8', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>🔗 אתר רשמי</a>}
        </div>
      )}
      {!editable && link && (
        <a href={link} target="_blank" rel="noreferrer"
          style={{ fontSize: 12, color: '#1d4ed8', textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: 4 }}>
          🔗 רשימה מלאה באתר הרשמי ↗
        </a>
      )}
    </div>
  )
}

// ── ImageUpload ────────────────────────────────────────────────────────────────

function ImageUpload({ url, onChange }) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef()

  async function handle(file) {
    if (!file) return
    if (file.size > 15 * 1024 * 1024) return alert('הקובץ גדול מדי (מקסימום 15MB)')
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('voucher-scans').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('voucher-scans').getPublicUrl(data.path)
      onChange(publicUrl)
    } catch (err) {
      alert('שגיאה בהעלאה: ' + err.message)
    }
    setUploading(false)
  }

  if (url) {
    return (
      <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
        <img src={url} alt="סריקת שובר"
          onClick={() => window.open(url, '_blank')}
          style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 10, border: '1px solid #e2e8f0', display: 'block', objectFit: 'contain', cursor: 'zoom-in' }} />
        <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', gap: 5 }}>
          <button onClick={() => ref.current?.click()}
            style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer', fontFamily: F }}>
            החלף
          </button>
          <button onClick={() => onChange('')}
            style={{ background: 'rgba(220,38,38,0.85)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer', fontFamily: F }}>
            הסר
          </button>
        </div>
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handle(e.target.files[0])} />
      </div>
    )
  }

  return (
    <label
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, border: '2px dashed #cbd5e1', borderRadius: 12, padding: '24px 16px',
        cursor: uploading ? 'wait' : 'pointer', color: '#94a3b8', background: '#f8fafc',
      }}
      onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#1d4ed8' }}
      onDragLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1' }}
      onDrop={e => { e.preventDefault(); handle(e.dataTransfer.files[0]) }}
    >
      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handle(e.target.files[0])} />
      <span style={{ fontSize: 32 }}>{uploading ? '⏳' : '📷'}</span>
      <span style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
        {uploading ? 'מעלה תמונה...' : 'גרור תמונה לכאן\nאו לחץ לצירוף / צילום שובר'}
      </span>
    </label>
  )
}

// ── VoucherCard ────────────────────────────────────────────────────────────────

function VoucherCard({ v, expanded, redemptions, onToggle, onRedeem, onEdit, onArchive, onUnarchive, tab }) {
  const exp = expiryStatus(v.expiry_date)
  const tc  = TYPE_COLORS[v.type] || TYPE_COLORS['אחר']
  const cur = v.currency || 'ILS'
  const hasOriginal  = v.original_amount != null
  const hasRemaining = v.remaining_amount != null
  const remaining = Number(v.remaining_amount) || 0
  const original  = Number(v.original_amount) || 0
  const pct = hasOriginal && original > 0 ? Math.round((remaining / original) * 100) : null
  const barColor = pct == null ? '#1d4ed8' : pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{
      background: '#fff', borderRadius: 14, overflow: 'hidden',
      border: '1px solid #e2e8f0', marginBottom: 10,
      boxShadow: expanded ? '0 4px 20px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Color stripe */}
      <div style={{ height: 4, background: tc.border }} />

      {/* Clickable summary */}
      <div style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Name + badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 7 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{v.name}</span>
              <TypeBadge type={v.type} small />
              {v.is_physical && <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', borderRadius: 10, padding: '2px 7px' }}>פיזי</span>}
              {v.scan_url && <span title="יש סריקה" style={{ fontSize: 13 }}>📷</span>}
            </div>

            {/* Amount + bar */}
            {hasRemaining && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8', letterSpacing: '-0.5px' }}>
                    {fmtMoney(remaining, cur)}
                  </span>
                  {hasOriginal && (
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>מתוך {fmtMoney(original, cur)}</span>
                  )}
                </div>
                {hasOriginal && (
                  <div style={{ height: 4, background: '#f1f5f9', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct ?? 100))}%`, background: barColor, borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                )}
              </div>
            )}

            {/* Expiry + who */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: exp.color, background: exp.bg, padding: '2px 8px', borderRadius: 8, fontWeight: exp.urgent ? 700 : 500 }}>
                📅 {exp.label}
              </span>
              {v.received_by && <span style={{ fontSize: 12, color: '#64748b' }}>👤 {v.received_by}</span>}
              {v.notes && <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>{v.notes.length > 45 ? v.notes.slice(0, 45) + '...' : v.notes}</span>}
            </div>
          </div>

          <span style={{ fontSize: 16, color: '#cbd5e1', flexShrink: 0, marginTop: 2, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9' }}>
          {/* Number + CVV row */}
          {(v.voucher_number || v.cvv || v.added_by) && (
            <div style={{ padding: '12px 16px', background: '#f8fafc', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {v.voucher_number && (
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>מספר שובר</div>
                  <code style={{ fontSize: 15, fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', letterSpacing: 1 }}>{v.voucher_number}</code>
                </div>
              )}
              {v.cvv && (
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>CVV</div>
                  <code style={{ fontSize: 15, fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>{v.cvv}</code>
                </div>
              )}
              {v.added_by && (
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>הוסיף</div>
                  <div style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>{USER_NAMES[v.added_by] || v.added_by}</div>
                </div>
              )}
            </div>
          )}

          {/* Scan image */}
          {v.scan_url && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>📷 סריקת שובר</div>
              <a href={v.scan_url} target="_blank" rel="noreferrer">
                <img src={v.scan_url} alt="סריקת שובר"
                  style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 8, border: '1px solid #e2e8f0', display: 'block', objectFit: 'contain', cursor: 'zoom-in' }} />
              </a>
            </div>
          )}

          {/* Stores */}
          {v.stores && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>📍 חנויות שניתן לממש</div>
              <StoreChips stores={v.stores} type={v.type} editable={false} />
            </div>
          )}

          {/* Redemption log */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>היסטוריית מימושים</div>
            {!redemptions ? (
              <div style={{ fontSize: 13, color: '#94a3b8' }}>טוען...</div>
            ) : redemptions.length === 0 ? (
              <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>טרם בוצע מימוש</div>
            ) : redemptions.map(r => (
              <div key={r.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                background: '#fef2f2', borderRadius: 10, padding: '10px 12px', marginBottom: 6, gap: 8,
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 15 }}>−{fmtMoney(r.amount)}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {r.store && <span>📍 {r.store} · </span>}
                    <span>👤 {r.redeemed_by}</span>
                    {r.notes && <span> · {r.notes}</span>}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'left', flexShrink: 0 }}>{fmtDateTime(r.redeemed_at)}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tab === 'active' ? (
              <>
                <button onClick={e => { e.stopPropagation(); onRedeem() }} style={css.primaryBtn}>💳 מימוש</button>
                <button onClick={e => { e.stopPropagation(); onEdit() }} style={css.outlineBtn}>✏️ עריכה</button>
                <button onClick={e => { e.stopPropagation(); onArchive() }} style={css.ghostBtn}>📦 ארכיון</button>
              </>
            ) : (
              <>
                <button onClick={e => { e.stopPropagation(); onEdit() }} style={css.outlineBtn}>✏️ עריכה</button>
                <button onClick={e => { e.stopPropagation(); onUnarchive() }} style={css.outlineBtn}>🔄 שחזר</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── VoucherFormModal ───────────────────────────────────────────────────────────

function VoucherFormModal({ title, initial, onClose, onSave }) {
  const blank = {
    name: '', voucher_number: '', expiry_date: '', cvv: '',
    is_physical: false, has_physical_card: false,
    type: 'כרטיס מתנה', original_amount: '', remaining_amount: '',
    received_by: 'ארז', stores: '', notes: '', scan_url: '', currency: 'ILS',
  }
  const [form, setForm]    = useState({ ...blank, ...(initial || {}) })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('info')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleTypeChange(t) {
    set('type', t)
    if (!initial && !form.stores && TYPE_STORES[t])
      set('stores', arrToStores(TYPE_STORES[t]))
  }

  async function handleSave() {
    if (!form.name.trim()) { setActiveTab('info'); return alert('חובה להזין שם שובר') }
    setSaving(true)
    await onSave({
      ...form,
      original_amount:  form.original_amount  === '' ? null : Number(form.original_amount),
      remaining_amount: form.remaining_amount === '' ? null : Number(form.remaining_amount),
    })
    setSaving(false)
  }

  const storeCount = storesToArr(form.stores).length

  return (
    <div style={css.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={css.modal}>
        {/* Drag handle */}
        <div style={{ padding: '10px 0 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div style={{ padding: '10px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#94a3b8', lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '10px 20px 0', borderBottom: '1px solid #f1f5f9', gap: 0 }}>
          {[
            { key: 'info',   label: 'פרטים' },
            { key: 'stores', label: `חנויות${storeCount ? ` (${storeCount})` : ''}` },
            { key: 'image',  label: `סריקה${form.scan_url ? ' ✓' : ''}` },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: F, fontSize: 13, fontWeight: 600,
              color: activeTab === t.key ? '#1d4ed8' : '#94a3b8',
              borderBottom: activeTab === t.key ? '2px solid #1d4ed8' : '2px solid transparent',
              marginBottom: -1,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '18px 20px' }}>

          {/* ── INFO ── */}
          {activeTab === 'info' && <>
            <div style={{ marginBottom: 14 }}>
              <label style={css.label}>שם השובר *</label>
              <input style={css.input} autoFocus value={form.name}
                onChange={e => set('name', e.target.value)} placeholder="פוקס – ₪200 מתנה" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={css.label}>סוג שובר</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {VOUCHER_TYPES.map(t => {
                  const c = TYPE_COLORS[t] || TYPE_COLORS['אחר']
                  const sel = form.type === t
                  return (
                    <button key={t} onClick={() => handleTypeChange(t)} style={{
                      padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                      fontFamily: F, fontSize: 12, fontWeight: 600,
                      background: sel ? c.bg : '#f8fafc',
                      color: sel ? c.text : '#64748b',
                      border: `2px solid ${sel ? c.border : '#e2e8f0'}`,
                      transition: 'all 0.15s',
                    }}>
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={css.label}>סכום מקורי</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select style={{ ...css.input, width: 64, padding: '9px 6px', flexShrink: 0 }}
                    value={form.currency} onChange={e => set('currency', e.target.value)}>
                    <option value="ILS">₪</option>
                    <option value="USD">$</option>
                    <option value="EUR">€</option>
                  </select>
                  <input type="number" style={css.input} value={form.original_amount}
                    onChange={e => { set('original_amount', e.target.value); if (!initial && !form.remaining_amount) set('remaining_amount', e.target.value) }}
                    placeholder="200" min="0" />
                </div>
              </div>
              <div>
                <label style={css.label}>יתרה נוכחית</label>
                <input type="number" style={css.input} value={form.remaining_amount}
                  onChange={e => set('remaining_amount', e.target.value)} placeholder="200" min="0" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={css.label}>מספר שובר</label>
                <input style={css.input} value={form.voucher_number}
                  onChange={e => set('voucher_number', e.target.value)} placeholder="1234-5678" />
              </div>
              <div>
                <label style={css.label}>CVV</label>
                <input style={css.input} value={form.cvv}
                  onChange={e => set('cvv', e.target.value)} placeholder="123" maxLength={6} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={css.label}>תוקף</label>
                <input type="date" style={css.input} value={form.expiry_date}
                  onChange={e => set('expiry_date', e.target.value)} />
              </div>
              <div>
                <label style={css.label}>מי קיבל</label>
                <select style={css.input} value={form.received_by} onChange={e => set('received_by', e.target.value)}>
                  {RECEIVED_BY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={css.label}>הערות</label>
              <textarea style={{ ...css.input, resize: 'vertical', minHeight: 56, lineHeight: 1.6 }}
                value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="שובר מתנה מדנה ליומולדת..." />
            </div>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[['is_physical', 'שובר פיזי'], ['has_physical_card', 'יש כרטיס מתנה פיזי']].map(([k, l]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, cursor: 'pointer', color: '#334155' }}>
                  <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#1d4ed8' }} />
                  {l}
                </label>
              ))}
            </div>
          </>}

          {/* ── STORES ── */}
          {activeTab === 'stores' && <>
            <div style={{ marginBottom: 14, padding: '10px 14px', background: '#f0f4ff', borderRadius: 10, fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
              💡 לחץ <strong>מלא אוטומטית</strong> לטעינת רשימת הרשתות המכבדות את <strong>{form.type}</strong>.
              ניתן להוסיף ולהסיר ידנית.
            </div>
            <StoreChips stores={form.stores} type={form.type} editable onChange={v => set('stores', v)} />
          </>}

          {/* ── IMAGE ── */}
          {activeTab === 'image' && <>
            <div style={{ marginBottom: 14, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              צרף צילום של השובר הפיזי. ניתן לגרור קובץ, לבחור תמונה, או לצלם ישירות מהנייד.
            </div>
            <ImageUpload url={form.scan_url} onChange={v => set('scan_url', v)} />
          </>}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={onClose} style={css.ghostBtn}>ביטול</button>
          <button onClick={handleSave} style={css.primaryBtn} disabled={saving}>
            {saving ? 'שומר...' : '✓ שמור שובר'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── RedeemModal ────────────────────────────────────────────────────────────────

function RedeemModal({ voucher, userName, onClose, onSave }) {
  const [form, setForm]   = useState({ amount: '', store: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handle() {
    const amt = Number(form.amount)
    if (!form.amount || isNaN(amt) || amt <= 0) return alert('הזן סכום תקף')
    if (voucher.remaining_amount != null && amt > voucher.remaining_amount)
      if (!window.confirm(`הסכום (${fmtMoney(amt, voucher.currency)}) גדול מהיתרה (${fmtMoney(voucher.remaining_amount, voucher.currency)}). להמשיך?`)) return
    setSaving(true)
    await onSave({ amount: amt, store: form.store, notes: form.notes })
    setSaving(false)
  }

  const stores = storesToArr(voucher.stores)

  return (
    <div style={css.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...css.modal, maxWidth: 420 }}>
        <div style={{ padding: '10px 0 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2 }} />
        </div>

        <div style={{ padding: '10px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>💳 מימוש שובר</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#94a3b8', lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
          {/* Voucher summary */}
          <div style={{ background: '#f0f4ff', borderRadius: 12, padding: '12px 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 15, marginBottom: 4 }}>{voucher.name}</div>
              <TypeBadge type={voucher.type} small />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8' }}>{fmtMoney(voucher.remaining_amount, voucher.currency)}</div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={css.label}>סכום מימוש (₪) *</label>
            <input type="number" style={{ ...css.input, fontSize: 20, fontWeight: 700, textAlign: 'center' }} autoFocus
              value={form.amount} onChange={e => set('amount', e.target.value)}
              placeholder="0" min="0.01" step="0.01" />
          </div>

          {/* Store picker */}
          <div style={{ marginBottom: 14 }}>
            <label style={css.label}>איפה מומש</label>
            {stores.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                {stores.slice(0, 14).map((s, i) => (
                  <button key={i} onClick={() => set('store', s)} style={{
                    padding: '4px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: F, fontSize: 12,
                    background: form.store === s ? '#dbeafe' : '#f1f5f9',
                    color: form.store === s ? '#1d4ed8' : '#334155',
                    border: `1px solid ${form.store === s ? '#93c5fd' : '#e2e8f0'}`,
                    transition: 'all 0.1s',
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <input style={css.input} value={form.store}
              onChange={e => set('store', e.target.value)} placeholder="שם המקום" />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={css.label}>הערה</label>
            <input style={css.input} value={form.notes}
              onChange={e => set('notes', e.target.value)} placeholder="אופציונלי" />
          </div>

          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            ממש ע״י <strong style={{ color: '#334155' }}>{userName}</strong> ·{' '}
            {new Date().toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={css.ghostBtn}>ביטול</button>
          <button onClick={handle} style={css.primaryBtn} disabled={saving}>{saving ? 'שומר...' : '✓ אשר מימוש'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function Vouchers({ session }) {
  const navigate  = useNavigate()
  const userEmail = session?.user?.email
  const userName  = USER_NAMES[userEmail] || userEmail

  const [vouchers,      setVouchers]      = useState([])
  const [redemptions,   setRedemptions]   = useState({})
  const [search,        setSearch]        = useState('')
  const [tab,           setTab]           = useState('active')
  const [loading,       setLoading]       = useState(true)
  const [expanded,      setExpanded]      = useState(null)
  const [showAdd,       setShowAdd]       = useState(false)
  const [editVoucher,   setEditVoucher]   = useState(null)
  const [redeemVoucher, setRedeemVoucher] = useState(null)

  useEffect(() => { loadVouchers() }, [tab])

  async function loadVouchers() {
    setLoading(true)
    const { data } = await supabase
      .from('vouchers').select('*')
      .eq('is_archived', tab === 'archive')
      .order('expiry_date', { ascending: true, nullsFirst: false })
    setVouchers(data || [])
    setLoading(false)
  }

  async function loadRedemptions(id) {
    const { data } = await supabase
      .from('voucher_redemptions').select('*')
      .eq('voucher_id', id).order('redeemed_at', { ascending: false })
    setRedemptions(p => ({ ...p, [id]: data || [] }))
  }

  function toggleExpand(id) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!redemptions[id]) loadRedemptions(id)
  }

  const filtered = vouchers.filter(v => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return [v.name, v.stores, v.type, v.notes, v.received_by, v.voucher_number]
      .some(f => f?.toLowerCase().includes(q))
  })

  const totalBalance = vouchers.reduce((s, v) => s + (Number(v.remaining_amount) || 0), 0)
  const urgentCount  = vouchers.filter(v => {
    const days = Math.ceil((new Date(v.expiry_date) - new Date()) / 86_400_000)
    return v.expiry_date && days >= 0 && days <= 30
  }).length

  return (
    <div style={css.page}>
      <header style={css.header}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
          <button onClick={() => navigate('/')} style={css.navBtn}>BARONS</button>
          <span>/</span>
          <span style={{ color: '#1e293b', fontWeight: 600 }}>שוברים</span>
        </nav>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: '#0f172a' }}>🎁 שוברים</h1>
          <button onClick={() => setShowAdd(true)} style={css.primaryBtn}>+ הוסף</button>
        </div>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 14px' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
          <input style={{ ...css.input, paddingRight: 36, fontSize: 15, borderRadius: 12 }}
            placeholder="חפש לפי שם, חנות, סוג, מי קיבל..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[['active', 'פעילים'], ['archive', 'ארכיון']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: '7px 18px', borderRadius: 20, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 600,
              background: tab === k ? '#1d4ed8' : '#fff',
              color: tab === k ? '#fff' : '#64748b',
              border: tab === k ? 'none' : '1px solid #e2e8f0',
            }}>{l}</button>
          ))}
        </div>

        {/* Stats */}
        {tab === 'active' && !loading && vouchers.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '11px 16px', marginBottom: 12, display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, alignItems: 'center' }}>
            <span style={{ color: '#64748b' }}>{vouchers.length} שוברים</span>
            <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 16 }}>יתרה: {fmtMoney(totalBalance)}</span>
            {urgentCount > 0 && (
              <span style={{ color: '#dc2626', fontWeight: 700, background: '#fef2f2', padding: '3px 10px', borderRadius: 8 }}>
                ⚠️ {urgentCount} פגים בקרוב
              </span>
            )}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 15 }}>טוען...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 15 }}>
            {search ? 'לא נמצאו שוברים תואמים' : tab === 'active' ? 'אין שוברים פעילים · לחץ + להוספה' : 'הארכיון ריק'}
          </div>
        ) : filtered.map(v => (
          <VoucherCard key={v.id} v={v}
            expanded={expanded === v.id}
            redemptions={redemptions[v.id]}
            onToggle={() => toggleExpand(v.id)}
            onRedeem={() => setRedeemVoucher(v)}
            onEdit={() => setEditVoucher(v)}
            onArchive={async () => { await supabase.from('vouchers').update({ is_archived: true }).eq('id', v.id); loadVouchers() }}
            onUnarchive={async () => { await supabase.from('vouchers').update({ is_archived: false }).eq('id', v.id); loadVouchers() }}
            tab={tab}
          />
        ))}
      </div>

      {showAdd && (
        <VoucherFormModal title="שובר חדש" onClose={() => setShowAdd(false)}
          onSave={async data => {
            await supabase.from('vouchers').insert({ ...data, added_by: userEmail, is_archived: false })
            setShowAdd(false); loadVouchers()
          }} />
      )}

      {editVoucher && (
        <VoucherFormModal title="עריכת שובר" initial={editVoucher} onClose={() => setEditVoucher(null)}
          onSave={async data => {
            await supabase.from('vouchers').update(data).eq('id', editVoucher.id)
            setEditVoucher(null); loadVouchers()
          }} />
      )}

      {redeemVoucher && (
        <RedeemModal voucher={redeemVoucher} userName={userName} onClose={() => setRedeemVoucher(null)}
          onSave={async ({ amount, store, notes }) => {
            await supabase.from('voucher_redemptions').insert({
              voucher_id: redeemVoucher.id, redeemed_by: userName,
              amount, store, notes, redeemed_at: new Date().toISOString(),
            })
            const newRem = Math.max(0, (Number(redeemVoucher.remaining_amount) || 0) - amount)
            await supabase.from('vouchers').update({ remaining_amount: newRem, is_archived: newRem === 0 }).eq('id', redeemVoucher.id)
            setRedeemVoucher(null); loadVouchers()
            if (expanded === redeemVoucher.id) loadRedemptions(redeemVoucher.id)
          }} />
      )}
    </div>
  )
}
