import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// This page has no auth — it's a public quick-add interface
// Anyone with the link can add items via natural language

const DEPARTMENTS_MAP = {
  'ירקות ופירות': ['עגבניה', 'מלפפון', 'בצל', 'שום', 'גזר', 'תפוח', 'בננה', 'לימון', 'פלפל', 'ברוקולי', 'חסה', 'תפוז', 'אבוקדו', 'תפוח אדמה', 'בטטה', 'עירית', 'כוסברה', 'פטרוזיליה', 'נענע', 'ירק', 'פרי', 'סלט', 'אנשוב'],
  'מוצרי חלב וביצים': ['חלב', 'קוטג', 'גבינה', 'יוגורט', 'שמנת', 'חמאה', 'ביצה', 'ביצים', 'לבן', 'קשקבל', 'ברי', 'מוצרלה', 'פטה'],
  'בשר ודגים': ['עוף', 'בשר', 'פרגית', 'שניצל', 'סלמון', 'דג', 'טונה', 'קציצה', 'המבורגר', 'נקניק', 'שיפוד'],
  'לחם ומאפים': ['לחם', 'פיתה', 'לחמנייה', 'קרואסון', 'בגט', 'חלה'],
  'קפואים': ['פיצה', 'שניצל קפוא', 'ירקות קפואים', 'גלידה', 'שוקו'],
  'יבש ושימורים': ['פסטה', 'אורז', 'קמח', 'סוכר', 'שמן', 'רוטב', 'שימור', 'עדשים', 'חומוס', 'טחינה', 'דגנים', 'שיבולת', 'קוואקר', 'מוזלי', 'קורנפלקס', 'קפה', 'תה', 'קקאו', 'נס', 'עוגיות', 'חטיף', 'שוקולד', 'ריבה', 'דבש', 'חומץ', 'סויה', 'מלח', 'פלפל', 'כורכום', 'פפריקה', 'קינמון'],
  'משקאות': ['מים', 'מיץ', 'סודה', 'קולה', 'ספרייט', 'שתייה', 'בירה', 'יין'],
  'ניקיון ובית': ['סבון', 'שמפו', 'נייר', 'מגבת', 'ספוג', 'אבקת כביסה', 'מרכך', 'אקונומיקה', 'ניקוי', 'שקית', 'נייר טואלט', 'ממחטות', 'מטליות'],
}

function guessDepartment(itemName) {
  const lower = itemName.toLowerCase()
  for (const [dept, keywords] of Object.entries(DEPARTMENTS_MAP)) {
    if (keywords.some(k => lower.includes(k.toLowerCase()))) return dept
  }
  return 'אחר'
}

function guessDepartmentId(itemName, departments) {
  const deptName = guessDepartment(itemName)
  const dept = departments.find(d => d.name === deptName)
  return dept?.id || null
}

async function parseItemsWithAI(text, departments) {
  const deptNames = departments.map(d => d.name).join(', ')

  const prompt = `אתה עוזר לרשימת קניות בעברית.
המשתמש כתב: "${text}"

המשימה שלך:
1. פצל לפריטים נפרדים
2. לכל פריט זהה: שם, כמות, יחידה (אם יש), מחלקה בסופר

המחלקות האפשריות: ${deptNames}

חזור רק ב-JSON תקני, בלי markdown ובלי הסברים:
[
  {
    "name": "שם הפריט",
    "quantity": 1,
    "unit": "",
    "department": "שם המחלקה",
    "priority": "regular"
  }
]

כללים:
- כמות = מספר (אם לא צוין, 1)
- יחידה = ק"ג / גרם / ליטר / יח' / חבילה וכד'
- priority: אם כתוב "דחוף" = "urgent", אחרת "regular"
- אם כתב "2 קמח וקוטג' אחד" → שני פריטים נפרדים
- אם לא ברור מחלקה, שים "אחר"`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()
  const rawText = data.content?.find(b => b.type === 'text')?.text || '[]'
  const clean = rawText.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)

  // attach department_id
  return parsed.map(item => ({
    ...item,
    department_id: guessDepartmentId(item.name, departments) ||
      departments.find(d => d.name === item.department)?.id || null,
  }))
}

export default function ShoppingQuick() {
  const [departments, setDepartments] = useState([])
  const [recentItems, setRecentItems] = useState([])
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState([]) // preview before confirm
  const [step, setStep] = useState('input') // 'input' | 'preview' | 'done'
  const [loading, setLoading] = useState(false)
  const [addedCount, setAddedCount] = useState(0)
  const textRef = useRef()

  useEffect(() => {
    loadDepartments()
    loadRecent()
    setTimeout(() => textRef.current?.focus(), 300)
  }, [])

  async function loadDepartments() {
    const { data } = await supabase.from('shopping_departments').select('*').order('sort_order')
    if (data) setDepartments(data)
  }

  async function loadRecent() {
    const { data } = await supabase
      .from('shopping_items')
      .select('name, quantity, unit, shopping_departments(name)')
      .eq('is_done', false)
      .order('created_at', { ascending: false })
      .limit(5)
    if (data) setRecentItems(data)
  }

  async function handleParse() {
    if (!text.trim()) return
    setLoading(true)
    try {
      const items = await parseItemsWithAI(text, departments)
      setParsed(items)
      setStep('preview')
    } catch (err) {
      // fallback: treat whole text as single item
      setParsed([{
        name: text.trim(),
        quantity: 1,
        unit: '',
        department: 'אחר',
        department_id: null,
        priority: 'regular',
      }])
      setStep('preview')
    }
    setLoading(false)
  }

  async function handleConfirm() {
    setLoading(true)
    await supabase.from('shopping_items').insert(
      parsed.map(item => ({
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || '',
        priority: item.priority || 'regular',
        store_id: 1, // assume supermarket for quick-add
        department_id: item.department_id,
        added_by: 'quick-add',
      }))
    )
    setAddedCount(parsed.length)
    setStep('done')
    setLoading(false)
  }

  function handleAgain() {
    setText('')
    setParsed([])
    setStep('input')
    setTimeout(() => textRef.current?.focus(), 100)
    loadRecent()
  }

  return (
    <div style={{
      direction: 'rtl',
      fontFamily: "'Open Sans Hebrew','Open Sans',Arial,sans-serif",
      minHeight: '100vh',
      background: '#0b1a3e',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>

      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ color: '#1d4ed8', fontWeight: 900, fontSize: 22, letterSpacing: 3, marginBottom: 4 }}>BARONS</div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>הוספה מהירה לרשימת קניות</div>
        </div>

        {step === 'input' && (
          <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: '#0f172a' }}>מה צריך לקנות? 🛒</div>

            <textarea
              ref={textRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleParse() }
              }}
              placeholder={'למשל:\n"2 קמח, קוטג\' אחד, ביצים דחוף"'}
              rows={4}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                fontSize: 15, fontFamily: "'Open Sans Hebrew','Open Sans',Arial,sans-serif",
                resize: 'none', direction: 'rtl', outline: 'none', boxSizing: 'border-box',
                lineHeight: 1.6,
              }}
            />

            <button
              onClick={handleParse}
              disabled={loading || !text.trim()}
              style={{
                width: '100%', marginTop: 12, padding: '13px', borderRadius: 10,
                background: loading ? '#94a3b8' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                color: 'white', border: 'none', fontWeight: 700, fontSize: 15,
                cursor: loading ? 'default' : 'pointer', fontFamily: "'Open Sans Hebrew','Open Sans',Arial,sans-serif",
                transition: 'opacity 0.2s',
              }}
            >
              {loading ? '🤔 מנתח...' : '✨ שלח'}
            </button>

            <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 10 }}>
              Enter = שלח · Shift+Enter = שורה חדשה
            </div>

            {/* Recent items on the list */}
            {recentItems.length > 0 && (
              <div style={{ marginTop: 20, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>ברשימה כרגע:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {recentItems.map((item, i) => (
                    <span key={i} style={{ fontSize: 12, background: '#f1f5f9', borderRadius: 20, padding: '3px 10px', color: '#475569' }}>
                      {item.name}{item.quantity !== 1 ? ` ×${item.quantity}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: '#0f172a' }}>הבנתי {parsed.length} פריט{parsed.length !== 1 ? 'ים' : ''} 🎯</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>בדוק שהכל נכון לפני שליחה:</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {parsed.map((item, i) => (
                <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</span>
                    {(item.quantity !== 1 || item.unit) && (
                      <span style={{ fontSize: 12, background: '#e2e8f0', borderRadius: 4, padding: '1px 7px', color: '#475569' }}>
                        {item.quantity}{item.unit ? ' ' + item.unit : ''}
                      </span>
                    )}
                    {item.priority === 'urgent' && (
                      <span style={{ fontSize: 11, background: '#fee2e2', color: '#ef4444', borderRadius: 4, padding: '1px 7px', fontWeight: 700 }}>דחוף</span>
                    )}
                    <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 'auto' }}>
                      {departments.find(d => d.id === item.department_id)?.icon || '📦'} {item.department || 'כללי'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep('input')} style={{ flex: 1, padding: '11px', borderRadius: 10, background: '#f1f5f9', border: '1px solid #e2e8f0', fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: "'Open Sans Hebrew','Open Sans',Arial,sans-serif" }}>
                ← תקן
              </button>
              <button onClick={handleConfirm} disabled={loading} style={{ flex: 2, padding: '11px', borderRadius: 10, background: loading ? '#94a3b8' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: 'white', border: 'none', fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontSize: 14, fontFamily: "'Open Sans Hebrew','Open Sans',Arial,sans-serif" }}>
                {loading ? 'שולח...' : `✓ הוסף לרשימה`}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', marginBottom: 6 }}>נוסף לרשימה!</div>
            <div style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>
              {addedCount} פריט{addedCount !== 1 ? 'ים' : ''} נוספו בהצלחה
            </div>
            <button
              onClick={handleAgain}
              style={{ width: '100%', padding: '13px', borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: 'white', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: "'Open Sans Hebrew','Open Sans',Arial,sans-serif" }}
            >
              + הוסף עוד
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
