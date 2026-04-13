import { useState, useEffect, useRef } from 'react'

import BaronsHeader from './BaronsHeader'
import { supabase } from '../lib/supabase'

const FONT = "'Open Sans Hebrew','Open Sans',Arial,sans-serif"

// ─── Quick parser (from ShoppingQuick) ────────────────────────────────────────
const UNIT_WORDS = ['קג', 'ק"ג', 'גרם', 'גר', 'ליטר', 'מ"ל', 'מל', 'יח', "יח'", 'חבילה', 'קופסה', 'בקבוק', 'שקית']
const NUMBERS_HEB = { 'אחד': 1, 'אחת': 1, 'שניים': 2, 'שתיים': 2, 'שני': 2, 'שתי': 2, 'שלושה': 3, 'שלוש': 3, 'ארבעה': 4, 'ארבע': 4, 'חמישה': 5, 'חמש': 5 }
const QUICK_SEPARATORS = /[,،؛;\/\n]+|(?:\s+ו(?:גם)?\s+)|(?:\s+עם\s+)/
const STORE_ROOTS = [
  { roots: ['טמבוריה', 'טמבור'],          store: 'טמבוריה' },
  { roots: ['קצב', 'קצביה'],              store: 'קצב' },
  { roots: ['ירקן', 'ירקניה', 'ירקנות'], store: 'ירקן' },
  { roots: ['פארם', 'סופר ?פארם', 'סופרפארם', 'בית ?מרקחת'], store: 'פארם' },
  { roots: ['רמי ?לוי', 'שופרסל', 'ויקטורי', 'מגא', 'יינות ?ביתן', 'חצי ?חינם', 'סופר'], store: 'סופר' },
]
function buildStoreRegex(root) {
  return new RegExp(`(?:אצל\\s+ה?|ב|מה?|ה)?${root}(?=\\s|$)`, 'i')
}
function detectStore(text) {
  for (const { roots, store } of STORE_ROOTS) {
    for (const root of roots) {
      if (buildStoreRegex(root).test(text)) {
        const cleanRe = new RegExp(`(?:אצל\\s+ה?|ב|מה?|ה)?${root}`, 'gi')
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
function qParseQuantity(tokens) {
  for (let i = 0; i < Math.min(3, tokens.length); i++) {
    const t = tokens[i]
    const num = parseFloat(t)
    if (!isNaN(num)) return { qty: num, consumedIdx: i }
    if (NUMBERS_HEB[t]) return { qty: NUMBERS_HEB[t], consumedIdx: i }
  }
  return { qty: 1, consumedIdx: -1 }
}
function qParseUnit(tokens, startIdx) {
  const t = (tokens[startIdx] || '').toLowerCase().replace(/['"״]/g, '"')
  const match = UNIT_WORDS.find(u => t.startsWith(u.toLowerCase()))
  if (match) return { unit: match, consumedIdx: startIdx }
  return { unit: '', consumedIdx: startIdx - 1 }
}
function qIsPriority(tokens) {
  return tokens.some(t => ['דחוף', 'דחופה', 'דחוף!', 'חשוב', 'חשובה'].includes(t))
}
function qGuessDept(name, departments) {
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
    { keys: ['שמפו', 'סבון', 'קרם', 'לוציון', 'אמבטיה', 'מגבת', 'נייר טואלט', 'ממחטות', 'דאודורנט', 'אפטר', 'ג\'ל', 'מסכה', 'טונר', 'בושם', 'קרם גוף', 'תחליב', 'מברשת שיניים', 'משחת שיניים', 'חוט דנטלי', 'שמן שיער'], dept: 'טיפוח' },
    { keys: ['חומר ניקוי', 'אקונומיקה', 'פיירי', 'סקוץ', 'מטאטא', 'שקיות אשפה', 'ניקוי', 'דטרגנט', 'מרכך כביסה', 'אבקת כביסה', 'ספוג', 'נייר מטבח', 'נרות', 'ניר כסף', 'ניר אפייה'], dept: 'ניקיון' },
    { keys: ['ביסקוויט', 'שוקולד', 'חטיף', 'קרקר', 'וופל', 'עוגיה', 'ממתק', 'גומי', 'סוכריה', 'פצפוצים', 'אגוזים', 'שקדים', 'פיסטוק', 'בוטנים', 'דלעת', 'צימוקים', 'חמוציות', 'מרציפן'], dept: 'חטיפים ומתוקים' },
    { keys: ['קפה', 'תה', 'מיץ', 'שתיה', 'קולה', 'בירה', 'יין', 'מים', 'גאז', 'ספרייט', 'פאנטה', 'אנרגי', 'קקאו', 'שוקו', 'נס קפה', 'קפוצינו', 'חלב שיבולת'], dept: 'שתייה' },
  ]
  for (const rule of rules) {
    if (rule.keys.some(k => n.includes(k))) {
      const found = departments.find(d => d.name === rule.dept)
      if (found) return found
    }
  }
  return departments.find(d => d.name === 'אחר') || departments[0] || null
}
function quickParseItems(rawText, departments) {
  const segments = rawText.split(QUICK_SEPARATORS).map(s => s.trim()).filter(Boolean)
  return segments.map(seg => {
    const { storeName, cleanText } = detectStore(seg)
    const tokens = cleanText.split(/\s+/).filter(Boolean)
    let idx = 0
    const urgent = qIsPriority(tokens)
    const cleanTokens = tokens.filter(t => !['דחוף', 'דחופה', 'דחוף!', 'חשוב', 'חשובה'].includes(t))
    const { qty, consumedIdx } = qParseQuantity(cleanTokens)
    if (consumedIdx >= 0) idx = consumedIdx + 1
    const { unit, consumedIdx: unitIdx } = qParseUnit(cleanTokens, idx)
    if (unit) idx = unitIdx + 1
    const name = cleanTokens.slice(idx).join(' ') || cleanText
    const dept = qGuessDept(name, departments)
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
const SPRING = 'cubic-bezier(0.23,1,0.32,1)'
const PRIORITY_COLORS = { urgent: '#ef4444', regular: '#3b82f6', daily: '#64748b' }
const PRIORITY_ORDER  = { urgent: 0, regular: 1, daily: 2 }

// ─── AI parser ────────────────────────────────────────────────────────────────
async function parseItemsWithAI(text, departments, storeId) {
  const deptList = departments.map(d => d.id + ':' + d.name).join(', ')
  const systemPrompt = 'You are a shopping list parser. You ONLY output valid JSON arrays, never text or explanation. Split compound inputs into separate items.'
  const userPrompt = [
    'Parse this Hebrew shopping list input into separate items.',
    'Input: ' + text,
    '',
    'Rules:',
    '- Split into individual items (comma or Hebrew "ו" = separate items)',
    '- Extract quantity (number before item name)',
    '- Extract unit if present (kg, gram, liter, pack)',
    '- Match department_id from this list: ' + deptList,
    '- priority = urgent only if input says דחוף',
    '',
    'Output ONLY a JSON array:',
    '[{"name":"item","quantity":1,"unit":"","department_id":2,"priority":"regular"}]',
    'If input has 3 items output 3 objects. Never merge items into one.',
  ].join('\n')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  const rawText = data.content?.find(b => b.type === 'text')?.text || '[]'
  const clean = rawText.replace(/^```[\w]*\n?/m, '').replace(/```$/m, '').trim()
  let parsed
  try {
    parsed = JSON.parse(clean)
  } catch {
    const match = clean.match(/\[[\s\S]*\]/)
    if (match) parsed = JSON.parse(match[0])
    else throw new Error('bad json')
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('empty')
  return parsed.map(item => ({
    name: item.name || text,
    quantity: Number(item.quantity) || 1,
    unit: item.unit || '',
    priority: item.priority || 'regular',
    department_id: item.department_id || null,
    store_id: storeId,
  }))
}

// ─── Department colors for dark mode ─────────────────────────────────────────
const DEPT_COLORS = {
  'מוצרי חלב': '#e0f2fe', 'ירקות': '#dcfce7', 'פירות': '#fee2e2',
  'בשר ועוף': '#fef3c7', 'דגים': '#dbeafe', 'מאפים': '#fef9c3',
  'יבש': '#f1f5f9', 'קפואים': '#e0f2fe', 'שתייה': '#ede9fe',
  'חטיפים ומתוקים': '#fce7f3', 'ניקיון': '#f0fdf4', 'טיפוח': '#fdf4ff',
}
const DEPT_TEXT_COLORS = {
  'מוצרי חלב': '#7dd3fc', 'ירקות': '#4ade80', 'פירות': '#fca5a5',
  'בשר ועוף': '#fbbf24', 'דגים': '#60a5fa', 'מאפים': '#fde68a',
  'יבש': '#94a3b8', 'קפואים': '#7dd3fc', 'שתייה': '#a78bfa',
  'חטיפים ומתוקים': '#f9a8d4', 'ניקיון': '#4ade80', 'טיפוח': '#c084fc',
}
const DEPT_GLOW_COLORS = {
  'מוצרי חלב': 'rgba(56,189,248,0.15)', 'ירקות': 'rgba(74,222,128,0.15)', 'פירות': 'rgba(248,113,113,0.15)',
  'בשר ועוף': 'rgba(251,191,36,0.15)', 'דגים': 'rgba(96,165,250,0.15)', 'מאפים': 'rgba(253,224,71,0.15)',
  'יבש': 'rgba(148,163,184,0.1)', 'קפואים': 'rgba(56,189,248,0.15)', 'שתייה': 'rgba(167,139,250,0.15)',
  'חטיפים ומתוקים': 'rgba(249,168,212,0.15)', 'ניקיון': 'rgba(74,222,128,0.15)', 'טיפוח': 'rgba(192,132,252,0.15)',
}

// ─── CSS Keyframes (injected once) ───────────────────────────────────────────
const KEYFRAMES = `
@keyframes shoppingFadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes shoppingFadeIn{from{opacity:0}to{opacity:1}}
@keyframes shoppingScaleIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
@keyframes shoppingSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes shoppingShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes shoppingPulseGlow{0%,100%{opacity:0.6}50%{opacity:1}}
@keyframes shoppingBlobFloat{0%{transform:translate(0,0) scale(1)}50%{transform:translate(-30px,20px) scale(1.1)}100%{transform:translate(0,0) scale(1)}}
@keyframes shoppingBlobFloat2{0%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,-25px) scale(1.05)}100%{transform:translate(0,0) scale(1)}}
@keyframes shoppingCheckPop{0%{transform:scale(0.5);opacity:0}50%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}
@media(max-width:640px){.shopping-header-add-btn{display:none!important}}
`

// ─── Main component ───────────────────────────────────────────────────────────
export default function Shopping({ session }) {
  const isAdmin  = ['erez@barons.co.il', 'user@barons.co.il'].includes(session?.user?.email)

  const [items,       setItems]       = useState([])
  const [stores,      setStores]      = useState([])
  const [departments, setDepartments] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [activeStore, setActiveStore] = useState(null)
  const [showDone,    setShowDone]    = useState(true)

  // add
  const [addMode,   setAddMode]   = useState(null) // null | 'quick' | 'ai' | 'manual'
  const [aiText,    setAiText]    = useState('')
  const [aiParsed,  setAiParsed]  = useState([])
  const [aiStep,    setAiStep]    = useState('input')
  const [aiLoading, setAiLoading] = useState(false)
  const [form,      setForm]      = useState({ name: '', quantity: 1, unit: '', priority: 'regular', store_id: 1, department_id: '', notes: '' })
  const [saving,    setSaving]    = useState(false)

  // quick add state
  const [quickText,         setQuickText]         = useState('')
  const [quickParsed,       setQuickParsed]       = useState([])
  const [quickMerge,        setQuickMerge]        = useState({})
  const [quickStep,         setQuickStep]         = useState('input') // 'input' | 'preview' | 'done'
  const [quickLoading,      setQuickLoading]      = useState(false)
  const [quickAddedCount,   setQuickAddedCount]   = useState(0)
  const [quickUpdatedCount, setQuickUpdatedCount] = useState(0)
  const [quickFocused,      setQuickFocused]      = useState(false)
  const quickRef = useRef()

  // edit / qty
  const [editItem, setEditItem] = useState(null)
  const [qtyModal, setQtyModal] = useState(null)

  const aiRef = useRef()
  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    const ch = supabase
      .channel('shopping_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shopping_items' }, () => loadItems())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shopping_items' }, () => loadItems())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'shopping_items' }, () => loadItems())
      .subscribe()
    const poll = setInterval(loadItems, 8000)
    return () => { supabase.removeChannel(ch); clearInterval(poll) }
  }, [])

  async function loadAll() {
    setLoading(true)
    const [sr, dr] = await Promise.all([
      supabase.from('shopping_stores').select('*').order('sort_order'),
      supabase.from('shopping_departments').select('*').order('sort_order'),
    ])
    if (sr.data) setStores(sr.data)
    if (dr.data) setDepartments(dr.data)
    await loadItems()
    setLoading(false)
  }

  async function loadItems() {
    const { data } = await supabase
      .from('shopping_items')
      .select('*, shopping_stores(name), shopping_departments(name)')
      .order('is_done',    { ascending: true })
      .order('created_at', { ascending: false })
    if (data) setItems(data)
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = items.filter(i => !activeStore || i.store_id === activeStore)
  const pending  = filtered.filter(i => !i.is_done)
  const done     = filtered.filter(i =>  i.is_done)

  const byDept = {}
  pending.forEach(item => {
    const key = item.department_id || 0
    if (!byDept[key]) byDept[key] = []
    byDept[key].push(item)
  })
  Object.values(byDept).forEach(arr => arr.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]))

  const deptKeys = Object.keys(byDept).sort((a, b) => {
    const da = departments.find(d => d.id === parseInt(a))
    const db = departments.find(d => d.id === parseInt(b))
    return (da?.sort_order || 99) - (db?.sort_order || 99)
  })

  function storePendingCount(storeId) {
    return items.filter(i => !i.is_done && i.store_id === storeId).length
  }
  const totalPending = items.filter(i => !i.is_done).length

  // ── Actions ───────────────────────────────────────────────────────────────
  async function toggleDone(item) {
    if (!item.is_done) {
      await supabase.from('shopping_items').update({
        is_done: true, quantity_bought: item.quantity, done_at: new Date().toISOString(),
      }).eq('id', item.id)
    } else {
      await supabase.from('shopping_items').update({ is_done: false, quantity_bought: 0, done_at: null }).eq('id', item.id)
    }
    loadItems()
  }

  async function setPartialBought(item, bought) {
    const isDone = bought >= item.quantity
    await supabase.from('shopping_items').update({
      quantity_bought: bought,
      is_done: isDone,
      done_at: isDone ? new Date().toISOString() : null,
    }).eq('id', item.id)
    setQtyModal(null)
    loadItems()
  }

  async function deleteItem(id) {
    if (!confirm('למחוק?')) return
    await supabase.from('shopping_items').delete().eq('id', id)
    loadItems()
  }

  async function clearDone() {
    if (!confirm('למחוק את כל הפריטים שנקנו?')) return
    await supabase.from('shopping_items').delete().eq('is_done', true)
    loadItems()
  }

  // ── Add manual ────────────────────────────────────────────────────────────
  async function addManual(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('shopping_items').insert({
      ...form,
      store_id: parseInt(form.store_id),
      department_id: form.department_id ? parseInt(form.department_id) : null,
      quantity: parseFloat(form.quantity) || 1,
      added_by: session?.user?.email,
    })
    setForm({ name: '', quantity: 1, unit: '', priority: 'regular', store_id: form.store_id, department_id: '', notes: '' })
    setAddMode(null)
    setSaving(false)
    loadItems()
  }

  // ── Add AI ────────────────────────────────────────────────────────────────
  async function handleAiParse() {
    if (!aiText.trim()) return
    setAiLoading(true)
    try {
      const storeId = activeStore || 1
      const depts = departments.filter(d => d.store_id === storeId || !d.store_id)
      const parsed = await parseItemsWithAI(aiText, depts.length ? depts : departments, storeId)
      setAiParsed(parsed)
      setAiStep('preview')
    } catch {
      // smart fallback: split by comma or ו
      const parts = aiText.split(/,|،|\sו\s/i).map(s => s.trim()).filter(Boolean)
      const fallback = parts.map(part => {
        const match = part.match(/^(\d+(?:\.\d+)?)\s*(.+)$/)
        return {
          name: match ? match[2].trim() : part,
          quantity: match ? parseFloat(match[1]) : 1,
          unit: '', priority: 'regular', department_id: null, store_id: activeStore || 1,
        }
      })
      setAiParsed(fallback)
      setAiStep('preview')
    }
    setAiLoading(false)
  }

  async function handleAiConfirm() {
    setSaving(true)
    await supabase.from('shopping_items').insert(
      aiParsed.map(item => ({
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || '',
        priority: item.priority || 'regular',
        store_id: item.store_id || 1,
        department_id: item.department_id || null,
        added_by: session?.user?.email,
      }))
    )
    setAiText(''); setAiParsed([]); setAiStep('input'); setAddMode(null)
    setSaving(false)
    loadItems()
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  async function saveEdit(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('shopping_items').update({
      name: editItem.name,
      quantity: parseFloat(editItem.quantity) || 1,
      unit: editItem.unit,
      priority: editItem.priority,
      store_id: parseInt(editItem.store_id),
      department_id: editItem.department_id ? parseInt(editItem.department_id) : null,
      notes: editItem.notes,
    }).eq('id', editItem.id)
    setEditItem(null)
    setSaving(false)
    loadItems()
  }

  const formDepts = departments.filter(d => d.store_id === parseInt(form.store_id) || !d.store_id)
  const editDepts = editItem ? departments.filter(d => d.store_id === parseInt(editItem.store_id) || !d.store_id) : []

  // ── Quick Add ─────────────────────────────────────────────────────────────
  async function handleQuickParse() {
    if (!quickText.trim()) return
    const items = quickParseItems(quickText, departments)
    if (items.length === 0) return
    const { data: existing } = await supabase
      .from('shopping_items').select('id, name, quantity').eq('is_done', false)
    const enriched = items.map(item => {
      const dup = (existing || []).find(e => e.name.trim() === item.name.trim())
      return { ...item, duplicate: dup ? { id: dup.id, existingQty: dup.quantity } : null }
    })
    const defaults = {}
    enriched.forEach((item, i) => { defaults[i] = item.duplicate ? 'merge' : 'add' })
    setQuickParsed(enriched)
    setQuickMerge(defaults)
    setQuickStep('preview')
  }

  async function handleQuickConfirm() {
    setQuickLoading(true)
    let added = 0, updated = 0
    for (let i = 0; i < quickParsed.length; i++) {
      const item = quickParsed[i]
      const decision = quickMerge[i]
      const storeRow = stores.find(s => s.name === item.storeName)
      if (decision === 'skip') continue
      if (decision === 'merge' && item.duplicate) {
        await supabase.from('shopping_items')
          .update({ quantity: item.duplicate.existingQty + item.quantity })
          .eq('id', item.duplicate.id)
        updated++
      } else {
        await supabase.from('shopping_items').insert({
          name: item.name, quantity: item.quantity,
          unit: item.unit || null, priority: item.priority,
          department_id: item.department_id,
          store_id: storeRow?.id || null,
          is_done: false,
          added_by: session?.user?.email,
        })
        added++
      }
    }
    setQuickLoading(false)
    setQuickAddedCount(added)
    setQuickUpdatedCount(updated)
    setQuickStep('done')
    loadItems()
  }

  function toggleQuickDecision(i) {
    setQuickMerge(prev => ({ ...prev, [i]: prev[i] === 'merge' ? 'skip' : 'merge' }))
  }

  function closeQuickModal() {
    setAddMode(null)
    setQuickText('')
    setQuickParsed([])
    setQuickMerge({})
    setQuickStep('input')
  }

  const quickActiveCount = Object.values(quickMerge).filter(d => d !== 'skip').length

  let rowIndex = 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ direction: 'rtl', fontFamily: FONT, background: '#0f172a', minHeight: '100vh', paddingBottom: 100, position: 'relative', overflow: 'hidden' }}>
      <style>{KEYFRAMES}</style>

      {/* Ambient floating blobs */}
      <div style={{ position: 'fixed', top: -120, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', animation: 'shoppingBlobFloat 20s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: -100, left: -60, width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', animation: 'shoppingBlobFloat2 25s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header */}
      <BaronsHeader
        title="קניות"
        subtitle="רשימת קניות משפחתית"
        breadcrumbs={[{ label: 'קניות', path: '/shopping' }]}
        actions={[{ label: '+ פריט', onClick: () => setAddMode('quick'), primary: true, className: 'shopping-header-add-btn' }]}
      />

      {/* Store tabs — glassmorphism bar */}
      <div style={{
        background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '10px 12px', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none',
        position: 'relative', zIndex: 1,
      }}>
        <StoreTab label="הכל" count={totalPending} active={activeStore === null} onClick={() => setActiveStore(null)} />
        {stores.map(s => (
          <StoreTab key={s.id} label={s.name} count={storePendingCount(s.id)} active={activeStore === s.id} onClick={() => setActiveStore(activeStore === s.id ? null : s.id)} />
        ))}
      </div>

      {/* Remaining items counter */}
      {!loading && pending.length > 0 && (
        <div style={{
          maxWidth: 680, margin: '0 auto', padding: '12px 16px 0',
          position: 'relative', zIndex: 1,
          animation: `shoppingFadeUp 0.4s ${SPRING} both`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 10,
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.12)',
          }}>
            <span style={{ fontSize: 13, color: '#93c5fd', fontWeight: 600 }}>
              נשאר {pending.length} פריטים
            </span>
            {done.length > 0 && (
              <span style={{ fontSize: 12, color: '#64748b', marginRight: 'auto', fontWeight: 500 }}>
                ✓ {done.length} נקנו
              </span>
            )}
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <SkeletonLoader />
      ) : (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '12px 12px', position: 'relative', zIndex: 1 }}>

          {deptKeys.length === 0 && done.length === 0 && (
            <EmptyState />
          )}

          {deptKeys.map((deptId, deptIdx) => {
            const deptObj = departments.find(d => d.id === parseInt(deptId))
            const deptName = deptObj?.name || 'כללי'
            const deptColor = DEPT_TEXT_COLORS[deptName] || '#94a3b8'
            const deptGlow = DEPT_GLOW_COLORS[deptName] || 'rgba(148,163,184,0.1)'

            return (
              <div key={deptId} style={{ marginBottom: 20, animation: `shoppingFadeUp 0.5s ${SPRING} ${deptIdx * 0.08}s both` }}>
                {/* Department header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '0 4px 8px',
                }}>
                  <div style={{
                    width: 3, height: 16, borderRadius: 2,
                    background: deptColor,
                    boxShadow: `0 0 8px ${deptColor}40`,
                  }} />
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: deptColor,
                    letterSpacing: '0.04em',
                  }}>
                    {deptName}
                  </span>
                  <span style={{
                    fontSize: 11, color: 'rgba(203,213,225,0.55)', fontWeight: 600,
                  }}>
                    ({byDept[deptId].length})
                  </span>
                </div>

                {/* Item rows — single column list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {byDept[deptId].map(item => {
                    const idx = rowIndex++
                    return (
                      <ItemRow key={item.id} item={item} isAdmin={isAdmin}
                        deptName={deptName} deptColor={deptColor} deptGlow={deptGlow}
                        isDone={false}
                        animDelay={idx * 0.03}
                        onToggle={() => toggleDone(item)}
                        onEdit={() => setEditItem({ ...item })}
                        onDelete={() => deleteItem(item.id)}
                        onPartial={() => setQtyModal(item)}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Done items section */}
          {done.length > 0 && (
            <div style={{ marginTop: 24, animation: `shoppingFadeUp 0.5s ${SPRING} 0.3s both` }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 4px 12px',
              }}>
                <button onClick={() => setShowDone(v => !v)} style={{
                  fontSize: 13, fontWeight: 600, color: '#94a3b8',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                  fontFamily: FONT,
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: `all 0.25s ${SPRING}`,
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: showDone ? 'rotate(90deg)' : 'rotate(0deg)', transition: `transform 0.25s ${SPRING}` }}>
                    <path d="M4 2L8 6L4 10" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>נקנו ({done.length})</span>
                </button>
                {isAdmin && (
                  <button onClick={clearDone} style={{
                    fontSize: 11, color: '#f87171', background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.15)', borderRadius: 6,
                    padding: '5px 12px', cursor: 'pointer', fontFamily: FONT, fontWeight: 600,
                    transition: `all 0.2s ${SPRING}`,
                  }}>
                    נקה הכל
                  </button>
                )}
              </div>
              {showDone && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {done.map((item, i) => (
                    <ItemRow key={item.id} item={item} isAdmin={isAdmin} isDone
                      animDelay={i * 0.03}
                      onToggle={() => toggleDone(item)}
                      onEdit={() => setEditItem({ ...item })}
                      onDelete={() => deleteItem(item.id)}
                      onPartial={() => setQtyModal(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FAB buttons */}
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 10, zIndex: 100,
        animation: `shoppingFadeUp 0.6s ${SPRING} 0.4s both`,
      }}>
        <FABButton onClick={() => setAddMode('quick')} primary>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          <span>הוסף</span>
        </FABButton>
      </div>

      {/* Quick Add Modal */}
      {addMode === 'quick' && (
        <Modal onClose={closeQuickModal}>
          {quickStep === 'input' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 17, color: '#f1f5f9' }}>מה צריך לקנות?</div>
                <button onClick={() => setAddMode('manual')} style={{
                  fontSize: 12, color: '#60a5fa', background: 'none', border: 'none',
                  cursor: 'pointer', textDecoration: 'underline', fontFamily: FONT,
                }}>טופס ידני</button>
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 14 }}>
                כתוב כמה דברים ביחד — מופרדים בפסיק או שורה חדשה
              </div>
              <textarea
                ref={quickRef}
                autoFocus
                value={quickText}
                onChange={e => setQuickText(e.target.value)}
                onFocus={() => setQuickFocused(true)}
                onBlur={() => setQuickFocused(false)}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleQuickParse() }}
                placeholder={'2 קמח, קוטג אחד\nביצים וחמאה\nשמפו דחוף\nסלמון מהקצב'}
                rows={4}
                style={{
                  ...darkInputStyle, resize: 'none', lineHeight: 1.7,
                  border: `1.5px solid ${quickFocused ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: quickFocused ? '0 0 0 3px rgba(16,185,129,0.1)' : 'none',
                  transition: `border-color 0.2s ${SPRING}, box-shadow 0.2s ${SPRING}`,
                }}
              />
              {/* Shortcuts hint */}
              <div style={{ fontSize: 11, color: '#334155', marginTop: 8, lineHeight: 1.6 }}>
                קיצורים: <span style={{ color: '#475569' }}>בסופר / בקצב / בירקן / בפארם / בטמבוריה</span>
              </div>
              <button
                onClick={handleQuickParse}
                disabled={!quickText.trim()}
                style={{
                  ...darkBtnPrimary, width: '100%', marginTop: 14,
                  background: quickText.trim() ? 'linear-gradient(135deg,#059669,#047857)' : undefined,
                  opacity: !quickText.trim() ? 0.5 : 1,
                }}
              >
                נתח והוסף
              </button>
            </>
          )}

          {quickStep === 'preview' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 17, color: '#f1f5f9' }}>זוהו</div>
                <span style={{
                  background: 'rgba(16,185,129,0.15)', color: '#34d399',
                  borderRadius: 8, padding: '2px 10px', fontSize: 13, fontWeight: 700,
                }}>{quickParsed.length}</span>
                <div style={{ fontSize: 14, color: '#94a3b8' }}>פריטים — בדוק ואשר:</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {quickParsed.map((item, i) => {
                  const decision = quickMerge[i]
                  const isDup = !!item.duplicate
                  const isSkipped = decision === 'skip'

                  if (isDup) {
                    const newTotal = item.duplicate.existingQty + item.quantity
                    return (
                      <div key={i} style={{
                        background: isSkipped ? 'rgba(30,27,15,0.4)' : 'rgba(45,35,15,0.5)',
                        borderRadius: 12, padding: '12px 14px',
                        border: `1px solid ${isSkipped ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.3)'}`,
                        opacity: isSkipped ? 0.5 : 1,
                        transition: `all 0.3s ${SPRING}`,
                        animation: `shoppingFadeUp 0.3s ${SPRING} ${i * 0.05}s both`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, flex: 1, fontSize: 14, color: '#f1f5f9' }}>{item.name}</span>
                          <span style={{
                            background: 'rgba(245,158,11,0.15)', color: '#fbbf24',
                            borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                          }}>כבר ברשימה</span>
                        </div>
                        {!isSkipped && (
                          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, paddingRight: 16 }}>
                            יש {item.duplicate.existingQty}, מוסיפים {item.quantity}{' → '}
                            <span style={{ color: '#fbbf24', fontWeight: 700 }}>סה״כ {newTotal}</span>
                          </div>
                        )}
                        <div style={{ paddingRight: 16 }}>
                          <button
                            onClick={() => toggleQuickDecision(i)}
                            style={{
                              background: isSkipped ? 'rgba(51,65,85,0.4)' : 'rgba(120,53,15,0.4)',
                              color: isSkipped ? '#94a3b8' : '#fbbf24',
                              border: `1px solid ${isSkipped ? 'rgba(255,255,255,0.06)' : 'rgba(245,158,11,0.2)'}`,
                              borderRadius: 8, fontSize: 12, padding: '6px 14px',
                              fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
                            }}
                          >
                            {isSkipped ? 'כן, עדכן כמות' : 'דלג על פריט זה'}
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={i} style={{
                      background: 'rgba(15,23,42,0.5)', borderRadius: 12,
                      padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                      border: '1px solid rgba(255,255,255,0.06)',
                      animation: `shoppingFadeUp 0.3s ${SPRING} ${i * 0.05}s both`,
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: item.priority === 'urgent' ? '#ef4444' : '#10b981',
                        boxShadow: item.priority === 'urgent' ? '0 0 8px rgba(239,68,68,0.5)' : '0 0 6px rgba(16,185,129,0.3)',
                      }} />
                      <span style={{ fontWeight: 600, fontSize: 14, flex: 1, color: '#f1f5f9' }}>{item.name}</span>
                      {(item.quantity > 1 || item.unit) && (
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          x{item.quantity}{item.unit ? ` ${item.unit}` : ''}
                        </span>
                      )}
                      <span style={{
                        background: 'rgba(16,185,129,0.1)', color: '#6ee7b7',
                        borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                      }}>{item.departmentName}</span>
                      {item.storeName !== 'סופר' && (
                        <span style={{
                          background: 'rgba(16,185,129,0.15)', color: '#4ade80',
                          borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                        }}>{item.storeName}</span>
                      )}
                      {item.priority === 'urgent' && (
                        <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 700 }}>דחוף</span>
                      )}
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setQuickStep('input')} style={{ ...darkBtnSecondary, flex: 1 }}>חזור</button>
                <button
                  onClick={handleQuickConfirm}
                  disabled={quickLoading || quickActiveCount === 0}
                  style={{
                    ...darkBtnPrimary, flex: 2,
                    background: (quickLoading || quickActiveCount === 0)
                      ? '#475569'
                      : 'linear-gradient(135deg,#059669,#047857)',
                  }}
                >
                  {quickLoading ? 'שומר...' : `אשר (${quickActiveCount})`}
                </button>
              </div>
            </>
          )}

          {quickStep === 'done' && (
            <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9', marginBottom: 6 }}>
                {[
                  quickAddedCount > 0 && `${quickAddedCount} פריטים נוספו`,
                  quickUpdatedCount > 0 && `${quickUpdatedCount} עודכנו`,
                ].filter(Boolean).join(' · ')}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>יופיע מיד אצל כולם</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={closeQuickModal} style={{ ...darkBtnSecondary, flex: 1 }}>סגור</button>
                <button
                  onClick={() => { setQuickText(''); setQuickParsed([]); setQuickMerge({}); setQuickStep('input'); setTimeout(() => quickRef.current?.focus(), 100) }}
                  style={{ ...darkBtnPrimary, flex: 1, background: 'linear-gradient(135deg,#059669,#047857)' }}
                >
                  הוסף עוד
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* AI Add Modal */}
      {addMode === 'ai' && (
        <Modal onClose={() => { setAddMode(null); setAiStep('input'); setAiText('') }}>
          {aiStep === 'input' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 17, color: '#f1f5f9' }}>מה צריך לקנות?</div>
                <button onClick={() => setAddMode('manual')} style={{
                  fontSize: 12, color: '#60a5fa', background: 'none', border: 'none',
                  cursor: 'pointer', textDecoration: 'underline', fontFamily: FONT,
                }}>טופס ידני</button>
              </div>
              <textarea
                ref={aiRef}
                value={aiText}
                onChange={e => setAiText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiParse() } }}
                placeholder={'למשל: "2 קמח, קוטג\' אחד, ביצים דחוף"'}
                rows={3}
                style={{ ...darkInputStyle, resize: 'none', lineHeight: 1.6 }}
              />
              <button onClick={handleAiParse} disabled={aiLoading || !aiText.trim()}
                style={{ ...darkBtnPrimary, width: '100%', marginTop: 12, opacity: aiLoading ? 0.6 : 1 }}>
                {aiLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'shoppingPulseGlow 1s linear infinite' }} />
                    מנתח...
                  </span>
                ) : 'המשך'}
              </button>
            </>
          )}
          {aiStep === 'preview' && (
            <>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4, color: '#f1f5f9' }}>הבנתי {aiParsed.length} פריטים</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>בדוק לפני שליחה:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {aiParsed.map((item, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    animation: `shoppingFadeUp 0.3s ${SPRING} ${i * 0.05}s both`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0' }}>{item.name}</span>
                      {(item.quantity !== 1 || item.unit) && (
                        <span style={{ fontSize: 12, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', borderRadius: 5, padding: '2px 8px' }}>
                          {item.quantity}{item.unit ? ' ' + item.unit : ''}
                        </span>
                      )}
                      {item.priority === 'urgent' && <span style={{ fontSize: 11, color: '#f87171', fontWeight: 700 }}>דחוף</span>}
                      <span style={{ fontSize: 11, color: '#64748b', marginRight: 'auto' }}>
                        {departments.find(d => d.id === item.department_id)?.name || 'כללי'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setAiStep('input')} style={{ ...darkBtnSecondary, flex: 1 }}>תקן</button>
                <button onClick={handleAiConfirm} disabled={saving} style={{
                  ...darkBtnPrimary, flex: 2,
                  background: saving ? '#475569' : 'linear-gradient(135deg,#22c55e,#16a34a)',
                }}>
                  {saving ? 'שולח...' : 'הוסף לרשימה'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Manual Add Modal */}
      {addMode === 'manual' && (
        <Modal onClose={() => setAddMode(null)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#f1f5f9' }}>פריט חדש</div>
            <button onClick={() => { setAddMode('ai'); setAiStep('input') }} style={{
              fontSize: 12, color: '#60a5fa', background: 'none', border: 'none',
              cursor: 'pointer', textDecoration: 'underline', fontFamily: FONT,
            }}>הוספה חכמה</button>
          </div>
          <form onSubmit={addManual} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input required placeholder="שם הפריט" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={darkInputStyle} autoFocus />
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" min="0" step="0.5" placeholder="כמות" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} style={{ ...darkInputStyle, width: 80 }} />
              <input placeholder="יחידה" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={{ ...darkInputStyle, flex: 1 }} />
            </div>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={darkInputStyle}>
              <option value="urgent">דחוף</option>
              <option value="regular">רגיל</option>
              <option value="daily">יום-יום</option>
            </select>
            <select value={form.store_id} onChange={e => setForm(f => ({ ...f, store_id: e.target.value, department_id: '' }))} style={darkInputStyle}>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {formDepts.length > 0 && (
              <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} style={darkInputStyle}>
                <option value="">-- מחלקה --</option>
                {formDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
            <input placeholder="הערות (אופציונלי)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={darkInputStyle} />
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" onClick={() => setAddMode(null)} style={{ ...darkBtnSecondary, flex: 1 }}>ביטול</button>
              <button type="submit" disabled={saving} style={{ ...darkBtnPrimary, flex: 1 }}>{saving ? 'שומר...' : 'הוסף'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editItem && (
        <Modal onClose={() => setEditItem(null)}>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 16, color: '#f1f5f9' }}>עריכת פריט</div>
          <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input required value={editItem.name} onChange={e => setEditItem(i => ({ ...i, name: e.target.value }))} style={darkInputStyle} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" min="0" step="0.5" value={editItem.quantity} onChange={e => setEditItem(i => ({ ...i, quantity: e.target.value }))} style={{ ...darkInputStyle, width: 80 }} />
              <input placeholder="יחידה" value={editItem.unit || ''} onChange={e => setEditItem(i => ({ ...i, unit: e.target.value }))} style={{ ...darkInputStyle, flex: 1 }} />
            </div>
            <select value={editItem.priority} onChange={e => setEditItem(i => ({ ...i, priority: e.target.value }))} style={darkInputStyle}>
              <option value="urgent">דחוף</option>
              <option value="regular">רגיל</option>
              <option value="daily">יום-יום</option>
            </select>
            <select value={editItem.store_id} onChange={e => setEditItem(i => ({ ...i, store_id: e.target.value, department_id: '' }))} style={darkInputStyle}>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {editDepts.length > 0 && (
              <select value={editItem.department_id || ''} onChange={e => setEditItem(i => ({ ...i, department_id: e.target.value }))} style={darkInputStyle}>
                <option value="">-- מחלקה --</option>
                {editDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
            <input placeholder="הערות" value={editItem.notes || ''} onChange={e => setEditItem(i => ({ ...i, notes: e.target.value }))} style={darkInputStyle} />
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" onClick={() => setEditItem(null)} style={{ ...darkBtnSecondary, flex: 1 }}>ביטול</button>
              <button type="submit" disabled={saving} style={{ ...darkBtnPrimary, flex: 1 }}>{saving ? 'שומר...' : 'שמור'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Partial Qty Modal */}
      {qtyModal && (
        <Modal onClose={() => setQtyModal(null)}>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6, color: '#f1f5f9' }}>כמה קנית?</div>
          <div style={{ color: '#94a3b8', fontSize: 14, marginBottom: 22 }}>{qtyModal.name} — סה״כ: {qtyModal.quantity} {qtyModal.unit}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {Array.from({ length: Math.ceil(qtyModal.quantity) + 1 }, (_, i) => i).map(n => (
              <button key={n} onClick={() => setPartialBought(qtyModal, n)}
                style={{
                  width: 54, height: 54, borderRadius: 12, fontSize: 17, fontWeight: 700, cursor: 'pointer',
                  background: n === 0
                    ? 'rgba(255,255,255,0.04)'
                    : n >= qtyModal.quantity
                      ? 'rgba(74,222,128,0.15)'
                      : 'rgba(251,191,36,0.15)',
                  border: '1px solid ' + (n === 0
                    ? 'rgba(255,255,255,0.08)'
                    : n >= qtyModal.quantity
                      ? 'rgba(74,222,128,0.3)'
                      : 'rgba(251,191,36,0.3)'),
                  color: n === 0 ? '#64748b' : n >= qtyModal.quantity ? '#4ade80' : '#fbbf24',
                  fontFamily: FONT,
                  transition: `all 0.2s ${SPRING}`,
                }}>
                {n}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── StoreTab ─────────────────────────────────────────────────────────────────
function StoreTab({ label, count, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 18px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
      fontFamily: FONT,
      display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
      borderRadius: 20,
      border: active ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.1)',
      background: active
        ? 'rgba(59,130,246,0.18)'
        : 'rgba(255,255,255,0.06)',
      color: active ? '#93c5fd' : '#cbd5e1',
      fontWeight: active ? 700 : 500,
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      boxShadow: active ? '0 0 20px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
      transition: `all 0.25s ${SPRING}`,
    }}>
      {label}
      {count > 0 && (
        <span style={{
          background: active ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.15)',
          color: active ? '#bfdbfe' : '#e2e8f0',
          fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '2px 8px', lineHeight: 1.5,
          minWidth: 20, textAlign: 'center',
        }}>{count}</span>
      )}
    </button>
  )
}

// ─── ItemRow (shopping-optimized checklist row) ─────────────────────────────
function ItemRow({ item, isAdmin, isDone, deptName, deptColor, deptGlow, animDelay, onToggle, onEdit, onDelete, onPartial }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isUrgent = item.priority === 'urgent'
  const hasPart = item.quantity_bought > 0 && !item.is_done
  const pct = item.quantity > 0 ? (item.quantity_bought / item.quantity) * 100 : 0
  const rowDeptName = deptName || item.shopping_departments?.name
  const rowDeptColor = deptColor || DEPT_TEXT_COLORS[rowDeptName] || '#94a3b8'
  const accentColor = isUrgent ? '#ef4444' : rowDeptColor

  return (
    <>
      <div
        onClick={(e) => {
          // Don't toggle if clicking menu button
          if (e.target.closest('[data-menu-btn]')) return
          onToggle()
        }}
        style={{
          background: isDone ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 14, padding: '12px 14px',
          minHeight: 56,
          display: 'flex', alignItems: 'center', gap: 12,
          border: isUrgent && !isDone
            ? '1px solid rgba(239,68,68,0.3)'
            : '1px solid rgba(255,255,255,0.06)',
          boxShadow: isUrgent && !isDone
            ? '0 2px 12px rgba(239,68,68,0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
            : 'inset 0 1px 0 rgba(255,255,255,0.04)',
          position: 'relative', overflow: 'hidden',
          cursor: 'pointer',
          animation: `shoppingFadeUp 0.35s ${SPRING} ${animDelay || 0}s both`,
          transition: `all 0.25s ${SPRING}`,
          opacity: isDone ? 0.55 : 1,
        }}
      >
        {/* Department accent bar on the right edge */}
        {!isDone && (
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 3,
            background: accentColor,
            borderRadius: '0 14px 14px 0',
            opacity: 0.7,
            boxShadow: `0 0 8px ${accentColor}40`,
          }} />
        )}

        {/* Content area — name, badges, tags */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Item name — large, bold, high contrast */}
            <span style={{
              fontWeight: 700, fontSize: isDone ? 15 : 16,
              color: isDone ? '#475569' : '#f1f5f9',
              textDecoration: isDone ? 'line-through' : 'none',
              lineHeight: 1.3,
            }}>
              {item.name}
            </span>

            {/* Quantity badge */}
            {(item.quantity !== 1 || item.unit) && (
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: isDone ? '#475569' : '#93c5fd',
                background: isDone ? 'rgba(255,255,255,0.04)' : 'rgba(59,130,246,0.12)',
                borderRadius: 6, padding: '2px 8px',
                border: isDone ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(59,130,246,0.15)',
                textDecoration: isDone ? 'line-through' : 'none',
              }}>
                {hasPart ? `${item.quantity_bought}/${item.quantity}` : item.quantity}{item.unit ? ' ' + item.unit : ''}
              </span>
            )}

            {/* Urgent badge */}
            {isUrgent && !isDone && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#fca5a5',
                background: 'rgba(239,68,68,0.15)',
                borderRadius: 5, padding: '2px 7px',
                border: '1px solid rgba(239,68,68,0.2)',
                letterSpacing: '0.04em',
              }}>
                דחוף
              </span>
            )}

            {/* Store tag (only if not default) */}
            {item.shopping_stores?.name && item.shopping_stores.name !== 'סופר' && (
              <span style={{
                fontSize: 11, color: '#a78bfa',
                background: 'rgba(139,92,246,0.1)',
                borderRadius: 5, padding: '1px 7px',
                border: '1px solid rgba(139,92,246,0.15)',
              }}>
                {item.shopping_stores.name}
              </span>
            )}
          </div>

          {/* Notes */}
          {item.notes && !isDone && (
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.3 }}>{item.notes}</div>
          )}

          {/* Partial progress bar */}
          {hasPart && (
            <div style={{ marginTop: 6, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: pct + '%',
                background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                borderRadius: 2,
                boxShadow: '0 0 6px rgba(251,191,36,0.4)',
                transition: `width 0.4s ${SPRING}`,
              }} />
            </div>
          )}
        </div>

        {/* Menu button ("...") */}
        <button
          data-menu-btn="true"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(true) }}
          style={{
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.06)', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: `all 0.2s ${SPRING}`,
            padding: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="3" r="1.2" fill="#94a3b8"/>
            <circle cx="7" cy="7" r="1.2" fill="#94a3b8"/>
            <circle cx="7" cy="11" r="1.2" fill="#94a3b8"/>
          </svg>
        </button>

        {/* Big circular checkbox on the left (appears on the left in RTL = visual right) */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          border: isDone
            ? '2.5px solid rgba(74,222,128,0.6)'
            : '2px solid rgba(148,163,184,0.45)',
          background: isDone
            ? 'rgba(74,222,128,0.15)'
            : 'rgba(148,163,184,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: `all 0.25s ${SPRING}`,
          boxShadow: isDone ? '0 0 12px rgba(74,222,128,0.25)' : '0 0 0 1px rgba(255,255,255,0.05)',
        }}>
          {isDone && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'shoppingCheckPop 0.3s ease-out both' }}>
              <path d="M3 8L6.5 11.5L13 4.5" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>

      {/* Action sheet */}
      {menuOpen && (
        <ActionSheet onClose={() => setMenuOpen(false)} title={item.name}>
          {!isDone && (
            <ActionBtn onClick={() => { setMenuOpen(false); onPartial() }}>
              כמה קנית?{item.quantity_bought > 0 ? ` (${item.quantity_bought}/${item.quantity})` : ''}
            </ActionBtn>
          )}
          <ActionBtn onClick={() => { setMenuOpen(false); onToggle() }}>
            {isDone ? 'בטל סימון — לא נקנה' : 'סמן כנקנה'}
          </ActionBtn>
          {isAdmin && (
            <ActionBtn onClick={() => { setMenuOpen(false); onEdit() }}>ערוך פריט</ActionBtn>
          )}
          {isAdmin && (
            <ActionBtn onClick={() => { setMenuOpen(false); onDelete() }} danger>מחק פריט</ActionBtn>
          )}
        </ActionSheet>
      )}
    </>
  )
}

// ─── ActionSheet ─────────────────────────────────────────────────────────────
function ActionSheet({ children, onClose, title }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: `shoppingFadeIn 0.2s ${SPRING} both`,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(30,41,59,0.95)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480,
          padding: '8px 0 32px', direction: 'rtl',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
          animation: `shoppingSlideUp 0.35s ${SPRING} both`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '10px auto 16px' }} />
        <div style={{
          padding: '0 20px 12px', fontWeight: 700, fontSize: 15, color: '#e2e8f0',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {title}
        </div>
        <div style={{ padding: '8px 0' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── ActionBtn ────────────────────────────────────────────────────────────────
function ActionBtn({ children, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      display: 'block', width: '100%', padding: '14px 20px', textAlign: 'right',
      background: 'none', border: 'none', cursor: 'pointer', fontSize: 15,
      color: danger ? '#f87171' : '#e2e8f0',
      fontFamily: FONT,
      fontWeight: danger ? 600 : 400,
      transition: `background 0.15s ${SPRING}`,
    }}>
      {children}
    </button>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ children, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
        animation: `shoppingFadeIn 0.2s ${SPRING} both`,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(30,41,59,0.95)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 18, padding: 24, width: '100%', maxWidth: 440,
          maxHeight: '90vh', overflowY: 'auto', direction: 'rtl',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          animation: `shoppingScaleIn 0.3s ${SPRING} both`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// ─── FAB Button ──────────────────────────────────────────────────────────────
function FABButton({ children, onClick, primary }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: primary ? '12px 22px' : '12px 18px',
      borderRadius: 50,
      background: primary
        ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
        : 'rgba(30,41,59,0.9)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      border: primary ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.1)',
      color: primary ? '#fff' : '#94a3b8',
      fontWeight: 700, fontSize: 14, fontFamily: FONT,
      cursor: 'pointer',
      boxShadow: primary
        ? '0 8px 30px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.15)'
        : '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      transition: `all 0.25s ${SPRING}`,
    }}>
      {children}
    </button>
  )
}

// ─── Skeleton Loader (list rows instead of card grid) ───────────────────────
function SkeletonLoader() {
  const shimmerBg = 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)'
  const shimmerStyle = {
    backgroundImage: shimmerBg,
    backgroundSize: '200% 100%',
    animation: 'shoppingShimmer 1.5s infinite',
    borderRadius: 8,
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 12px' }}>
      {/* Fake department header */}
      <div style={{ ...shimmerStyle, width: 80, height: 14, marginBottom: 12, borderRadius: 4 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            borderRadius: 14, overflow: 'hidden',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            padding: '14px',
            display: 'flex', alignItems: 'center', gap: 12,
            minHeight: 56,
            animation: `shoppingFadeUp 0.4s ${SPRING} ${i * 0.06}s both`,
          }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ ...shimmerStyle, width: '55%', height: 16 }} />
              <div style={{ ...shimmerStyle, width: '30%', height: 12 }} />
            </div>
            <div style={{ ...shimmerStyle, width: 32, height: 32, borderRadius: 8 }} />
            <div style={{ ...shimmerStyle, width: 36, height: 36, borderRadius: '50%' }} />
          </div>
        ))}
      </div>
      {/* Second section */}
      <div style={{ ...shimmerStyle, width: 60, height: 14, marginBottom: 12, borderRadius: 4 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            borderRadius: 14, overflow: 'hidden',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            padding: '14px',
            display: 'flex', alignItems: 'center', gap: 12,
            minHeight: 56,
            animation: `shoppingFadeUp 0.4s ${SPRING} ${(i + 4) * 0.06}s both`,
          }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ ...shimmerStyle, width: '50%', height: 16 }} />
            </div>
            <div style={{ ...shimmerStyle, width: 32, height: 32, borderRadius: 8 }} />
            <div style={{ ...shimmerStyle, width: 36, height: 36, borderRadius: '50%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 20px',
      animation: `shoppingFadeUp 0.5s ${SPRING} both`,
    }}>
      <div style={{ margin: '0 auto 20px', width: 80, height: 80, opacity: 0.5 }}>
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="18" y="24" width="44" height="40" rx="6" stroke="#475569" strokeWidth="2" fill="none"/>
          <path d="M18 32h44" stroke="#475569" strokeWidth="2"/>
          <path d="M30 16v8M50 16v8" stroke="#475569" strokeWidth="2" strokeLinecap="round"/>
          <path d="M32 44h16M40 36v16" stroke="#334155" strokeWidth="2" strokeLinecap="round"/>
          <rect x="24" y="38" width="32" height="20" rx="3" fill="rgba(59,130,246,0.06)" stroke="none"/>
        </svg>
      </div>
      <div style={{ fontWeight: 700, fontSize: 17, color: '#64748b', marginBottom: 6 }}>
        הרשימה ריקה
      </div>
      <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
        לחץ על "הוסף" כדי להתחיל
      </div>
    </div>
  )
}

// ─── Shared dark mode styles ─────────────────────────────────────────────────
const darkInputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  fontSize: 14, fontFamily: FONT, color: '#e2e8f0',
  boxSizing: 'border-box', direction: 'rtl', outline: 'none',
  transition: `border-color 0.2s ${SPRING}`,
}
const darkBtnPrimary = {
  padding: '11px', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: 'white',
  border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10,
  cursor: 'pointer', fontWeight: 700, fontSize: 14,
  fontFamily: FONT,
  boxShadow: '0 4px 16px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
  transition: `all 0.2s ${SPRING}`,
}
const darkBtnSecondary = {
  padding: '11px', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14,
  fontFamily: FONT, color: '#94a3b8',
  transition: `all 0.2s ${SPRING}`,
}
