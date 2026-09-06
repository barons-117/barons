// ─── Expiry module — shared constants & helpers ───────────────────────────────
// Used by Expiry.jsx, ExpiryDetail.jsx (and later by the digest Edge Function
// through a copy — keep this file dependency-free).

export const SITE_URL = 'https://barons.co.il'

export const OWNERS = [
  { key: 'erez',     label: 'ארז',   color: '#1d4ed8', bg: '#E4ECFB' },
  { key: 'roy',      label: 'רועי',  color: '#0F766E', bg: '#DDF3F0' },
  { key: 'daphna',   label: 'דפנה',  color: '#BE185D', bg: '#FBE4EE' },
  { key: 'danielle', label: 'דניאל', color: '#B45309', bg: '#FBEBD9' },
  { key: 'family',   label: 'משפחה', color: '#4B5563', bg: '#E9EBEE' },
  { key: 'other',    label: 'אחר',   color: '#6B7280', bg: '#ECEEF0' },
]

// Face photos live in public/faces/<key>.jpg — square crops. Missing file → initial letter.
export const FACE_DIR = '/faces'
export function ownerFace(item) {
  const k = item?.owner
  if (!k || k === 'family' || k === 'other') return null
  return `${FACE_DIR}/${k}.jpg`
}

export function ownerStyle(item) {
  const o = OWNERS.find(o => o.key === item?.owner) || OWNERS[OWNERS.length - 1]
  return { color: o.color, bg: o.bg }
}

// How much of the item's lifetime has elapsed, 0..1 (null if unknown)
export function lifeProgress(item, today = todayISO()) {
  if (!item?.expires_on) return null
  let start = item.issued_on
  if (!start && item.type?.renewal_months) start = addMonths(item.expires_on, -item.type.renewal_months)
  if (!start) return null
  const total = daysLeft(item.expires_on, start)
  const gone = daysLeft(today, start)
  if (total <= 0) return null
  return Math.min(1, Math.max(0, gone / total))
}

export function ownerLabel(item) {
  if (!item) return ''
  if (item.owner === 'other' && item.owner_other) return item.owner_other
  return OWNERS.find(o => o.key === item.owner)?.label || item.owner || ''
}

// ─── Dates ───────────────────────────────────────────────────────────────────
export function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(iso, n) {
  const dt = new Date(iso + 'T12:00:00')
  dt.setDate(dt.getDate() + n)
  return dt.toISOString().split('T')[0]
}

export function addMonths(iso, n) {
  const dt = new Date(iso + 'T12:00:00')
  dt.setMonth(dt.getMonth() + n)
  return dt.toISOString().split('T')[0]
}

export function daysLeft(iso, today = todayISO()) {
  if (!iso) return null
  const a = new Date(iso + 'T12:00:00')
  const b = new Date(today + 'T12:00:00')
  return Math.round((a - b) / 86400000)
}

export function fmtDate(iso, opts) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('he-IL', opts || { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateShort(iso) {
  return fmtDate(iso, { day: 'numeric', month: 'short' })
}

// Hebrew relative phrase: "בעוד 14 ימים" / "היום" / "פג לפני 9 ימים"
export function relativeLabel(days) {
  if (days === null || days === undefined) return ''
  if (days === 0) return 'פג היום'
  if (days === 1) return 'מחר'
  if (days === -1) return 'פג אתמול'
  if (days > 0) {
    if (days < 60) return `בעוד ${days} ימים`
    const months = Math.round(days / 30)
    if (months < 24) return `בעוד ${months} חודשים`
    const years = (days / 365).toFixed(1).replace('.0', '')
    return `בעוד ${years} שנים`
  }
  const ago = -days
  if (ago < 60) return `פג לפני ${ago} ימים`
  return `פג לפני ${Math.round(ago / 30)} חודשים`
}

// Big number + unit for the list/detail: days up to 60, then months, then years
export function bigUnit(days) {
  if (days === null || days === undefined) return { n: '—', unit: '' }
  const a = Math.abs(days)
  if (a < 60) return { n: String(a), unit: a === 1 ? 'יום' : 'ימים' }
  if (a < 365) return { n: String(Math.round(a / 30)), unit: 'חודשים' }
  const y = a / 365
  return { n: (y < 10 ? y.toFixed(1) : Math.round(y).toString()).replace('.0', ''), unit: 'שנים' }
}

// ─── Urgency ─────────────────────────────────────────────────────────────────
// Four bands, mirrored in the daily digest. Colors are intentionally quiet —
// they appear only as a thin side rule and in the days numeral.
export const URGENCY = {
  expired:  { key: 'expired',  label: 'פג תוקף',  color: '#B42318', bg: '#FCEBE8', order: 0 },
  urgent:   { key: 'urgent',   label: 'תוך שבוע',    color: '#C2410C', bg: '#FDEEE3', order: 1 },
  soon:     { key: 'soon',     label: 'תוך חודש',    color: '#A16207', bg: '#FBF3DB', order: 2 },
  quarter:  { key: 'quarter',  label: 'תוך 3 חודשים', color: '#3F5F8F', bg: '#E8EEF8', order: 3 },
  later:    { key: 'later',    label: 'מאוחר יותר', color: '#5B6470', bg: '#EEF0EC', order: 4 },
}

export function urgencyOf(days) {
  if (days === null || days === undefined) return URGENCY.later
  if (days < 0) return URGENCY.expired
  if (days <= 7) return URGENCY.urgent
  if (days <= 30) return URGENCY.soon
  if (days <= 90) return URGENCY.quarter
  return URGENCY.later
}

// ─── Reminders ───────────────────────────────────────────────────────────────
export function effectiveOffsets(item) {
  if (Array.isArray(item?.offsets_override) && item.offsets_override.length) return [...item.offsets_override].sort((a, b) => b - a)
  const def = item?.type?.default_offsets
  return Array.isArray(def) ? [...def].sort((a, b) => b - a) : [30, 7, 0]
}

export function effectivePostExpiry(item) {
  if (item?.post_expiry_override !== null && item?.post_expiry_override !== undefined) return item.post_expiry_override
  return item?.type?.post_expiry_every ?? 14
}

export function isCustomReminders(item) {
  return Array.isArray(item?.offsets_override) && item.offsets_override.length > 0
}

export function offsetLabel(n) {
  if (n === 0) return 'ביום'
  if (n === 1) return 'יום לפני'
  if (n < 30) return `${n} ימים לפני`
  if (n % 30 === 0 && n < 365) return `${n / 30} חודשים לפני`
  if (n === 365) return 'שנה לפני'
  return `${n} ימים לפני`
}

// ─── Titles ──────────────────────────────────────────────────────────────────
export function itemTitle(item) {
  const type = item?.type?.label_he || 'פריט'
  return item?.title ? `${type} · ${item.title}` : type
}

// ─── Calendar export ─────────────────────────────────────────────────────────
function icsDate(iso) { return iso.replace(/-/g, '') }
function icsEscape(s = '') {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

export function buildICS(item) {
  const start = icsDate(item.expires_on)
  const end = icsDate(addDays(item.expires_on, 1))
  const link = `${SITE_URL}/#/expiry/${item.id}`
  const descParts = []
  if (item.notes) descParts.push(item.notes)
  if (item.reference) descParts.push(`מספר: ${item.reference}`)
  if (item.vendor) descParts.push(`ספק: ${item.vendor}`)
  descParts.push(link)
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const alarms = effectiveOffsets(item).filter(o => o >= 0).map(o => [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(itemTitle(item))}`,
    `TRIGGER:-P${o}D`,
    'END:VALARM',
  ].join('\r\n'))
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BARONS//Expiry//HE',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:expiry-${item.id}@barons.co.il`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${icsEscape('⏳ פג תוקף: ' + itemTitle(item) + ' (' + ownerLabel(item) + ')')}`,
    `DESCRIPTION:${icsEscape(descParts.join('\n'))}`,
    `URL:${link}`,
    ...alarms,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadICS(item) {
  const blob = new Blob([buildICS(item)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `expiry-${(item.type?.key || 'item')}-${item.expires_on}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function googleCalendarURL(item) {
  const start = icsDate(item.expires_on)
  const end = icsDate(addDays(item.expires_on, 1))
  const link = `${SITE_URL}/#/expiry/${item.id}`
  const details = [item.notes, item.reference && `מספר: ${item.reference}`, item.vendor && `ספק: ${item.vendor}`, link].filter(Boolean).join('\n')
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `⏳ פג תוקף: ${itemTitle(item)} (${ownerLabel(item)})`,
    dates: `${start}/${end}`,
    details,
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}
