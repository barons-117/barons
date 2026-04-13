import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─── Local parser (ללא API — ללא CORS) ────────────────────────────────────────
const UNIT_WORDS = ['קג', 'ק"ג', 'גרם', 'גר', 'ליטר', 'מ"ל', 'מל', 'יח', "יח'", 'חבילה', 'קופסה', 'בקבוק', 'שקית']
const NUMBERS_HEB = { 'אחד': 1, 'אחת': 1, 'שניים': 2, 'שתיים': 2, 'שני': 2, 'שתי': 2, 'שלושה': 3, 'שלוש': 3, 'ארבעה': 4, 'ארבע': 4, 'חמישה': 5, 'חמש': 5 }
const SEPARATORS = /[,،؛;\/\n]+|(?:\s+ו(?:גם)?\s+)|(?:\s+עם\s+)/

// זיהוי חנויות — regex חכם שמטפל ב/אצל/מ/מה + כל שם חנות
// כל entry: שם לתצוגה + רשימת שורשים (ללא קידומות)
const STORE_ROOTS = [
  { roots: ['טמבוריה', 'טמבור'],          store: 'טמבוריה' },
  { roots: ['קצב', 'קצביה'],              store: 'קצב' },
  { roots: ['ירקן', 'ירקניה', 'ירקנות'], store: 'ירקן' },
  { roots: ['פארם', 'סופר ?פארם', 'סופרפארם', 'בית ?מרקחת'], store: 'פארם' },
  { roots: ['רמי ?לוי', 'שופרסל', 'ויקטורי', 'מגא', 'יינות ?ביתן', 'חצי ?חינם', 'סופר'], store: 'סופר' },
]

// בונה regex אחד לכל שורש שמטפל בקידומות ב/מ/מה/ה + "אצל ה?"
function buildStoreRegex(root) {
  return new RegExp(
    `(?:אצל\\s+ה?|ב|מה?|ה)?${root}(?=\\s|$)`,
    'i'
  )
}

// מזהה חנות מתוך הטקסט של הפריט, מחזיר { storeName, cleanText }
function detectStore(text) {
  for (const { roots, store } of STORE_ROOTS) {
    for (const root of roots) {
      const re = buildStoreRegex(root)
      if (re.test(text)) {
        // מנקה את ביטוי החנות מהטקסט (כולל קידומת)
        const cleanRe = new RegExp(
          `(?:אצל\\s+ה?|ב|מה?|ה)?${root}`,
          'gi'
        )
        const stripSupermarket = store !== 'סופר'
        const clean = text.replace(cleanRe, '')
          .replace(/\bאצל\b/gi, '')
          .replace(stripSupermarket ? /\bסופר\b/gi : /(?!)/g, '')
          .replace(/\s+/g, ' ').trim()
        return { storeName: store, cleanText: clean }
      }
    }
  }
  return { storeName: 'סופר', cleanText: text }
}

function parseQuantity(tokens) {
  for (let i = 0; i < Math.min(3, tokens.length); i++) {
    const t = tokens[i]
    const num = parseFloat(t)
    if (!isNaN(num)) return { qty: num, consumedIdx: i }
    if (NUMBERS_HEB[t]) return { qty: NUMBERS_HEB[t], consumedIdx: i }
  }
  return { qty: 1, consumedIdx: -1 }
}

function parseUnit(tokens, startIdx) {
  const t = (tokens[startIdx] || '').toLowerCase().replace(/['"״]/g, '"')
  const match = UNIT_WORDS.find(u => t.startsWith(u.toLowerCase()))
  if (match) return { unit: match, consumedIdx: startIdx }
  return { unit: '', consumedIdx: startIdx - 1 }
}

function isPriority(tokens) {
  return tokens.some(t => ['דחוף', 'דחופה', 'דחוף!', 'חשוב', 'חשובה'].includes(t))
}

function guessDepartment(name, departments) {
  const n = name.toLowerCase()
  const rules = [
    { keys: ['חלב', 'גבינה', 'קוטג', 'יוגורט', 'שמנת', 'חמאה', 'ביצ', 'לבן', 'מוצרלה', 'פטה', 'ריקוטה', 'קשקבל', 'בולגרי', 'צהוב'], dept: 'מוצרי חלב' },
    { keys: ['לחם', 'פיתה', 'בגט', 'חלה', 'לחמניה', 'קרואסון', 'לאפה', 'טורטיה', 'פוקצ'], dept: 'מאפים' },
    { keys: ['עגבניה', 'מלפפון', 'גזר', 'בצל', 'תפוח אדמה', 'ירק', 'חסה', 'פלפל', 'קישוא', 'חציל', 'שום', 'פטרוזיליה', 'כוסברה', 'סלרי', 'ברוקולי', 'כרובית', 'תרד', 'אפונה', 'תירס', 'אבוקדו', 'צנון', 'שומר', 'כרוב', 'כרישה'], dept: 'ירקות' },
    { keys: ['תפוח', 'בננה', 'תות', 'ענב', 'אבטיח', 'מלון', 'אגס', 'שזיף', 'אפרסק', 'פרי', 'מנגו', 'קיווי', 'אננס', 'דובדבן', 'רימון', 'תמר', 'ליים', 'לימון', 'תפוז', 'קלמנטינה', 'גויאבה'], dept: 'פירות' },
    { keys: ['עוף', 'כבש', 'טלה', 'הודו', 'פרגית', 'קבב', 'סטייק', 'אנטריקוט', 'צלעות', 'חזה', 'שוק', 'כנף', 'טחון', 'בקר', 'וואגיו', 'ורד הצלע'], dept: 'בשר ועוף' },
    { keys: ['דג', 'סלמון', 'טונה', 'בורי', 'דניס', 'אמנון', 'פורל', 'קלמרי', 'שרימפס', 'אנשובי', 'הרינג', 'מוסר ים'], dept: 'דגים' },
    { keys: ['קפוא', 'גלידה', 'אדממה', 'שניצל קפוא', 'ירק קפוא', 'פיצה קפואה', 'וופל קפוא'], dept: 'קפואים' },
    { keys: ['קמח', 'סוכר', 'שמן', 'אורז', 'פסטה', 'מקרוני', 'ספגטי', 'קטניות', 'עדשים', 'שעועית', 'חומוס יבש', 'שיבולת שועל', 'דגני', 'קורנפלקס', 'מוזלי', 'גריסים', 'כוסמת', 'קינואה', 'פולנטה', 'מלח', 'פלפל שחור', 'פפריקה', 'כמון', 'כורכום', 'רוטב', 'שמרים', 'אבקת אפייה', 'וניל', 'דבש', 'ריבה', 'טחינה', 'חרדל', 'מיונז', 'קטשופ'], dept: 'יבש' },
    { keys: ['שמפו', 'סבון', 'קרם', 'לוציון', 'אמבטיה', 'מגבת', 'נייר טואלט', 'ממחטות', 'דאודורנט', 'אפטר', 'ג\'ל', 'מסכה', 'טונר', 'בושם', 'קרם גוף', 'תחליב', 'צלחת', 'מברשת שיניים', 'משחת שיניים', 'חוט דנטלי', 'שמן שיער'], dept: 'טיפוח' },
    { keys: ['חומר ניקוי', 'אקונומיקה', 'פיירי', 'סקוץ', 'מטאטא', 'שקיות אשפה', 'ניקוי', 'דטרגנט', 'מרכך כביסה', 'אבקת כביסה', 'ספוג', 'נייר מטבח', 'נרות', 'ניר כסף', 'ניר אפייה'], dept: 'ניקיון' },
    { keys: ['ביסקוויט', 'שוקולד', 'חטיף', 'קרקר', 'וופל', 'עוגיה', 'ממתק', 'גומי', 'סוכריה', 'פצפוצים', 'אגוזים', 'שקדים', 'פיסטוק', 'בוטנים', 'דלעת', 'צימוקים', 'חמוציות', 'מרציפן'], dept: 'חטיפים ומתוקים' },
    { keys: ['קפה', 'תה', 'מיץ', 'שתיה', 'קולה', 'בירה', 'יין', 'מים', 'גאז', 'ספרייט', 'פאנטה', 'ред бול', 'אנרגי', 'קקאו', 'שוקו', 'נס קפה', 'קפוצינו', 'חלב שיבולת'], dept: 'שתייה' },
  ]

  for (const rule of rules) {
    if (rule.keys.some(k => n.includes(k))) {
      const found = departments.find(d => d.name === rule.dept)
      if (found) return found
    }
  }
  return departments.find(d => d.name === 'אחר') || departments[0] || null
}

function parseItems(rawText, departments) {
  const segments = rawText.split(SEPARATORS).map(s => s.trim()).filter(Boolean)
  return segments.map(seg => {
    // זיהוי חנות ראשון — לפני שאר הניתוח
    const { storeName, cleanText } = detectStore(seg)

    const tokens = cleanText.split(/\s+/).filter(Boolean)
    let idx = 0

    // priority
    const urgent = isPriority(tokens)
    const cleanTokens = tokens.filter(t => !['דחוף', 'דחופה', 'דחוף!', 'חשוב', 'חשובה'].includes(t))

    // quantity
    const { qty, consumedIdx } = parseQuantity(cleanTokens)
    if (consumedIdx >= 0) idx = consumedIdx + 1

    // unit
    const { unit, consumedIdx: unitIdx } = parseUnit(cleanTokens, idx)
    if (unit) idx = unitIdx + 1

    // name = שאר הטוקנים
    const name = cleanTokens.slice(idx).join(' ') || cleanText

    const dept = guessDepartment(name, departments)

    return {
      name: name.trim(),
      quantity: qty,
      unit,
      priority: urgent ? 'urgent' : 'regular',
      department_id: dept?.id || null,
      departmentName: dept?.name || 'אחר',
      storeName,
    }
  }).filter(item => item.name.length > 0)
}

// ─── CSS Keyframes (injected once) ────────────────────────────────────────────
const KEYFRAMES_ID = '__shopping-quick-keyframes__'
function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return
  const style = document.createElement('style')
  style.id = KEYFRAMES_ID
  style.textContent = `
    @keyframes sqFloat1 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(30px, -40px) scale(1.05); }
      66% { transform: translate(-20px, 20px) scale(0.95); }
    }
    @keyframes sqFloat2 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(-40px, 30px) scale(1.08); }
      66% { transform: translate(25px, -15px) scale(0.92); }
    }
    @keyframes sqFloat3 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(20px, 25px) scale(0.97); }
      66% { transform: translate(-30px, -35px) scale(1.03); }
    }
    @keyframes sqFadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes sqFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes sqCheckCircle {
      from { stroke-dashoffset: 166; }
      to { stroke-dashoffset: 0; }
    }
    @keyframes sqCheckMark {
      from { stroke-dashoffset: 48; }
      to { stroke-dashoffset: 0; }
    }
    @keyframes sqPulseGlow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.3); }
      50% { box-shadow: 0 0 20px 4px rgba(16,185,129,0.15); }
    }
    @keyframes sqShimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes sqConfettiDot {
      0% { opacity: 0; transform: translateY(10px) scale(0); }
      50% { opacity: 1; transform: translateY(-8px) scale(1.2); }
      100% { opacity: 0.6; transform: translateY(0) scale(1); }
    }
  `
  document.head.appendChild(style)
}

// ─── Style helpers ─────────────────────────────────────────────────────────────
const PRIORITY_COLORS = { urgent: '#ef4444', regular: '#10b981' }
const SPRING = 'cubic-bezier(0.23,1,0.32,1)'

// ─── Component ─────────────────────────────────────────────────────────────────
export default function ShoppingQuick() {
  const [departments, setDepartments] = useState([])
  const [stores, setStores] = useState([])
  const [text, setText] = useState('')
  // parsed: מערך של פריטים, כל אחד עם שדה duplicate: null | { id, existingQty }
  const [parsed, setParsed] = useState([])
  // mergeDecision: { [index]: 'merge' | 'skip' | 'add' }
  const [mergeDecision, setMergeDecision] = useState({})
  const [step, setStep] = useState('input')
  const [loading, setLoading] = useState(false)
  const [addedCount, setAddedCount] = useState(0)
  const [updatedCount, setUpdatedCount] = useState(0)
  const [textFocused, setTextFocused] = useState(false)
  const textRef = useRef()

  useEffect(() => {
    injectKeyframes()
    loadDepartments()
    loadStores()
    setTimeout(() => textRef.current?.focus(), 300)
  }, [])

  async function loadDepartments() {
    const { data } = await supabase.from('shopping_departments').select('*').order('sort_order')
    if (data) setDepartments(data)
  }

  async function loadStores() {
    const { data } = await supabase.from('shopping_stores').select('*')
    if (data) setStores(data)
  }

  async function handleParse() {
    if (!text.trim()) return
    const items = parseItems(text, departments)
    if (items.length === 0) return

    // בדיקת כפילויות מול הרשימה הפעילה
    const { data: existing } = await supabase
      .from('shopping_items')
      .select('id, name, quantity')
      .eq('is_done', false)

    const enriched = items.map(item => {
      const dup = (existing || []).find(
        e => e.name.trim() === item.name.trim()
      )
      return { ...item, duplicate: dup ? { id: dup.id, existingQty: dup.quantity } : null }
    })

    // החלטת ברירת מחדל: כפילות → merge, חדש → add
    const defaults = {}
    enriched.forEach((item, i) => {
      defaults[i] = item.duplicate ? 'merge' : 'add'
    })

    setParsed(enriched)
    setMergeDecision(defaults)
    setStep('preview')
  }

  async function handleConfirm() {
    setLoading(true)
    let added = 0, updated = 0

    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i]
      const decision = mergeDecision[i]
      const storeRow = stores.find(s => s.name === item.storeName)

      if (decision === 'skip') continue

      if (decision === 'merge' && item.duplicate) {
        const newQty = item.duplicate.existingQty + item.quantity
        await supabase.from('shopping_items')
          .update({ quantity: newQty })
          .eq('id', item.duplicate.id)
        updated++
      } else {
        // add — פריט חדש
        await supabase.from('shopping_items').insert({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit || null,
          priority: item.priority,
          department_id: item.department_id,
          store_id: storeRow?.id || null,
          is_done: false,
        })
        added++
      }
    }

    setLoading(false)
    setAddedCount(added)
    setUpdatedCount(updated)
    setStep('done')
    setText('')
    setParsed([])
    setMergeDecision({})
  }

  function toggleDecision(i) {
    setMergeDecision(prev => {
      const cur = prev[i]
      // סייקל: merge → skip → merge
      return { ...prev, [i]: cur === 'merge' ? 'skip' : 'merge' }
    })
  }

  function handleAgain() {
    setStep('input')
    setTimeout(() => textRef.current?.focus(), 200)
  }

  const activeCount = Object.values(mergeDecision).filter(d => d !== 'skip').length

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: '#f1f5f9',
      fontFamily: "'Open Sans Hebrew', sans-serif",
      direction: 'rtl',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Animated background blobs ── */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
      }}>
        <div style={{
          position: 'absolute',
          top: '-10%', right: '-15%',
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
          animation: 'sqFloat1 20s ease-in-out infinite',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-5%', left: '-10%',
          width: 350, height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
          animation: 'sqFloat2 25s ease-in-out infinite',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute',
          top: '40%', left: '50%',
          width: 300, height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)',
          animation: 'sqFloat3 18s ease-in-out infinite',
          filter: 'blur(40px)',
        }} />
      </div>

      {/* ── Noise texture overlay ── */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
        opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '128px 128px',
      }} />

      {/* ── Main card ── */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: 'rgba(30,41,59,0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 20,
        padding: '28px 22px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        position: 'relative',
        zIndex: 2,
        animation: 'sqFadeUp 0.5s ease-out',
      }}>

        {/* Header */}
        <div style={{
          fontSize: 24,
          fontWeight: 800,
          marginBottom: 4,
          color: '#f1f5f9',
          letterSpacing: '-0.02em',
        }}>
          הוספה מהירה
        </div>
        <div style={{
          fontSize: 13,
          color: '#64748b',
          marginBottom: 22,
          letterSpacing: '0.01em',
        }}>
          כתוב מה צריך לקנות — גם כמה דברים ביחד
        </div>

        {/* ── Step 1: Input ── */}
        {step === 'input' && (
          <div style={{ animation: 'sqFadeIn 0.35s ease-out' }}>
            <textarea
              ref={textRef}
              style={{
                width: '100%',
                minHeight: 110,
                background: 'rgba(15,23,42,0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: `1.5px solid ${textFocused ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 14,
                color: '#f1f5f9',
                fontSize: 16,
                padding: '14px 16px',
                resize: 'vertical',
                direction: 'rtl',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                outline: 'none',
                transition: `border-color 0.3s ${SPRING}, box-shadow 0.3s ${SPRING}`,
                boxShadow: textFocused
                  ? '0 0 0 3px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.03)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                lineHeight: 1.6,
              }}
              value={text}
              onChange={e => setText(e.target.value)}
              onFocus={() => setTextFocused(true)}
              onBlur={() => setTextFocused(false)}
              placeholder={'2 קמח, קוטג אחד\nביצים וחמאה\nשמפו דחוף'}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleParse() }}
            />

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <ParseButton
                disabled={!text.trim() || loading}
                loading={loading}
                onClick={handleParse}
              />
            </div>

            <div style={{
              fontSize: 12,
              color: '#475569',
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 4,
                padding: '1px 5px',
                fontSize: 11,
                color: '#64748b',
                fontFamily: 'monospace',
              }}>
                {'⌘↵'}
              </span>
              <span>לשליחה מהירה</span>
            </div>
          </div>
        )}

        {/* ── Step 2: Preview ── */}
        {step === 'preview' && (
          <div style={{ animation: 'sqFadeIn 0.35s ease-out' }}>
            <div style={{
              fontSize: 14,
              color: '#94a3b8',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>זוהו</span>
              <span style={{
                background: 'rgba(16,185,129,0.15)',
                color: '#34d399',
                borderRadius: 8,
                padding: '2px 10px',
                fontSize: 13,
                fontWeight: 700,
              }}>
                {parsed.length}
              </span>
              <span>פריטים — בדוק ואשר:</span>
            </div>

            {parsed.map((item, i) => {
              const decision = mergeDecision[i]
              const isDup = !!item.duplicate
              const isSkipped = decision === 'skip'

              if (isDup) {
                // ─── Duplicate card ───
                const newTotal = item.duplicate.existingQty + item.quantity
                return (
                  <div key={i} style={{
                    background: isSkipped ? 'rgba(30,27,15,0.4)' : 'rgba(45,35,15,0.5)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    marginBottom: 10,
                    border: `1px solid ${isSkipped ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.25)'}`,
                    boxShadow: isSkipped ? 'none' : '0 4px 20px rgba(245,158,11,0.06)',
                    opacity: isSkipped ? 0.5 : 1,
                    transition: `all 0.4s ${SPRING}`,
                    animation: `sqFadeUp 0.45s ${SPRING} ${i * 0.06}s both`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}>
                    {/* Top row: name + tags */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#f59e0b', flexShrink: 0,
                        boxShadow: '0 0 8px rgba(245,158,11,0.4)',
                      }} />
                      <span style={{ fontWeight: 700, flex: 1, fontSize: 15 }}>{item.name}</span>
                      <div style={{
                        background: 'rgba(245,158,11,0.15)',
                        color: '#fbbf24',
                        borderRadius: 8,
                        padding: '3px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        backdropFilter: 'blur(8px)',
                      }}>
                        כבר ברשימה
                      </div>
                    </div>
                    {/* Bottom row: explanation + button */}
                    {!isSkipped && (
                      <div style={{
                        fontSize: 13, color: '#94a3b8', paddingRight: 16,
                        lineHeight: 1.5,
                      }}>
                        יש {item.duplicate.existingQty}, מוסיפים {item.quantity} {' → '}
                        <span style={{
                          color: '#fbbf24',
                          fontWeight: 700,
                          fontSize: 14,
                        }}>סה״כ {newTotal}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, paddingRight: 16 }}>
                      <DupToggleButton
                        isSkipped={isSkipped}
                        onClick={() => toggleDecision(i)}
                      />
                    </div>
                  </div>
                )
              }

              // ─── Regular item card ───
              return (
                <div key={i} style={{
                  background: 'rgba(15,23,42,0.5)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  borderRadius: 14,
                  padding: '12px 16px',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: '1px solid rgba(255,255,255,0.05)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                  animation: `sqFadeUp 0.45s ${SPRING} ${i * 0.06}s both`,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: PRIORITY_COLORS[item.priority] || '#10b981',
                    flexShrink: 0,
                    boxShadow: item.priority === 'urgent'
                      ? '0 0 10px rgba(239,68,68,0.5)'
                      : '0 0 6px rgba(16,185,129,0.3)',
                  }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{item.name}</span>
                    {item.quantity > 1 || item.unit
                      ? <span style={{ color: '#64748b', fontSize: 13, marginRight: 8 }}>
                          x {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                        </span>
                      : null}
                  </div>
                  <div style={{
                    background: 'rgba(16,185,129,0.1)',
                    color: '#6ee7b7',
                    borderRadius: 8,
                    padding: '3px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    backdropFilter: 'blur(8px)',
                  }}>{item.departmentName}</div>
                  {item.storeName !== 'סופר' && (
                    <div style={{
                      background: 'rgba(16,185,129,0.15)',
                      color: '#4ade80',
                      borderRadius: 8,
                      padding: '3px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                    }}>{item.storeName}</div>
                  )}
                  {item.priority === 'urgent' && (
                    <span style={{
                      color: '#ef4444',
                      fontSize: 12,
                      fontWeight: 700,
                      textShadow: '0 0 10px rgba(239,68,68,0.4)',
                    }}>דחוף</span>
                  )}
                </div>
              )
            })}

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <ConfirmButton
                disabled={loading || activeCount === 0}
                loading={loading}
                activeCount={activeCount}
                onClick={handleConfirm}
              />
              <BackButton onClick={() => setStep('input')} />
            </div>
          </div>
        )}

        {/* ── Step 3: Success ── */}
        {step === 'done' && (
          <div style={{
            textAlign: 'center',
            padding: '36px 0 20px',
            animation: 'sqFadeIn 0.4s ease-out',
          }}>
            {/* Animated checkmark */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
              {/* Confetti dots */}
              {[0, 1, 2, 3, 4, 5].map(j => {
                const angle = (j / 6) * 360
                const rad = angle * Math.PI / 180
                const cx = Math.cos(rad) * 44
                const cy = Math.sin(rad) * 44
                return (
                  <div key={j} style={{
                    position: 'absolute',
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'][j],
                    top: '50%', left: '50%',
                    transform: `translate(${cx}px, ${cy}px) translate(-50%, -50%)`,
                    animation: `sqConfettiDot 0.6s ${SPRING} ${0.5 + j * 0.08}s both`,
                  }} />
                )
              })}
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle
                  cx="36" cy="36" r="26"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="166"
                  strokeDashoffset="166"
                  style={{
                    animation: `sqCheckCircle 0.6s ${SPRING} 0.1s forwards`,
                  }}
                />
                <path
                  d="M24 36 L32 44 L48 28"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="48"
                  strokeDashoffset="48"
                  style={{
                    animation: `sqCheckMark 0.4s ${SPRING} 0.55s forwards`,
                  }}
                />
              </svg>
            </div>

            <div style={{
              fontSize: 20,
              fontWeight: 800,
              marginBottom: 6,
              letterSpacing: '-0.02em',
              animation: `sqFadeUp 0.5s ${SPRING} 0.3s both`,
            }}>
              {[
                addedCount > 0 && `${addedCount} פריטים נוספו`,
                updatedCount > 0 && `${updatedCount} עודכנו`,
              ].filter(Boolean).join(' \u00b7 ')}
            </div>
            <div style={{
              fontSize: 14,
              color: '#64748b',
              marginBottom: 28,
              animation: `sqFadeUp 0.5s ${SPRING} 0.45s both`,
            }}>
              יופיע מיד אצל כולם
            </div>
            <AgainButton onClick={handleAgain} />
          </div>
        )}

      </div>
    </div>
  )
}


// ─── Button sub-components (hover/active via state) ──────────────────────────

function ParseButton({ disabled, loading, onClick }) {
  const [hover, setHover] = useState(false)
  const [active, setActive] = useState(false)
  return (
    <button
      style={{
        background: disabled
          ? 'rgba(51,65,85,0.6)'
          : hover
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        color: disabled ? '#475569' : '#fff',
        border: 'none',
        borderRadius: 12,
        padding: '13px 26px',
        fontSize: 15,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        transition: `all 0.35s ${SPRING}`,
        transform: active && !disabled ? 'scale(0.97)' : hover && !disabled ? 'translateY(-1px)' : 'none',
        boxShadow: disabled
          ? 'none'
          : hover
            ? '0 8px 24px rgba(16,185,129,0.3)'
            : '0 4px 16px rgba(16,185,129,0.2)',
      }}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false) }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
    >
      {loading ? 'בודק...' : 'נתח והוסף'}
    </button>
  )
}

function ConfirmButton({ disabled, loading, activeCount, onClick }) {
  const [hover, setHover] = useState(false)
  const [active, setActive] = useState(false)
  return (
    <button
      style={{
        background: disabled
          ? 'rgba(51,65,85,0.6)'
          : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        color: disabled ? '#475569' : '#fff',
        border: 'none',
        borderRadius: 12,
        padding: '13px 26px',
        fontSize: 15,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        transition: `all 0.35s ${SPRING}`,
        transform: active && !disabled ? 'scale(0.97)' : hover && !disabled ? 'translateY(-1px)' : 'none',
        boxShadow: disabled
          ? 'none'
          : hover
            ? '0 8px 24px rgba(16,185,129,0.3)'
            : '0 4px 16px rgba(16,185,129,0.2)',
      }}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false) }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
    >
      {loading ? 'שומר...' : `אשר (${activeCount})`}
    </button>
  )
}

function BackButton({ onClick }) {
  const [hover, setHover] = useState(false)
  const [active, setActive] = useState(false)
  return (
    <button
      style={{
        background: hover ? 'rgba(51,65,85,0.8)' : 'rgba(51,65,85,0.5)',
        color: '#94a3b8',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '13px 22px',
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: `all 0.35s ${SPRING}`,
        transform: active ? 'scale(0.97)' : 'none',
        backdropFilter: 'blur(10px)',
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false) }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
    >
      חזור
    </button>
  )
}

function DupToggleButton({ isSkipped, onClick }) {
  const [hover, setHover] = useState(false)
  const [active, setActive] = useState(false)
  return (
    <button
      style={{
        background: isSkipped
          ? hover ? 'rgba(51,65,85,0.7)' : 'rgba(51,65,85,0.4)'
          : hover ? 'rgba(120,53,15,0.6)' : 'rgba(120,53,15,0.4)',
        color: isSkipped ? '#94a3b8' : '#fbbf24',
        border: `1px solid ${isSkipped ? 'rgba(255,255,255,0.06)' : 'rgba(245,158,11,0.2)'}`,
        borderRadius: 10,
        fontSize: 12,
        padding: '7px 16px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: `all 0.35s ${SPRING}`,
        transform: active ? 'scale(0.96)' : 'none',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false) }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
    >
      {isSkipped ? 'כן, עדכן כמות' : 'דלג על פריט זה'}
    </button>
  )
}

function AgainButton({ onClick }) {
  const [hover, setHover] = useState(false)
  const [active, setActive] = useState(false)
  return (
    <button
      style={{
        background: hover
          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
          : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: 12,
        padding: '13px 28px',
        fontSize: 15,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: `all 0.35s ${SPRING}`,
        transform: active ? 'scale(0.97)' : hover ? 'translateY(-1px)' : 'none',
        boxShadow: hover
          ? '0 8px 24px rgba(16,185,129,0.3)'
          : '0 4px 16px rgba(16,185,129,0.2)',
        animation: `sqFadeUp 0.5s ${SPRING} 0.55s both`,
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false) }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
    >
      הוסף עוד
    </button>
  )
}
