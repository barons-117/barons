// src/pages/Cards.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ── Constants ──────────────────────────────────────────────────────────────────

const USER_NAMES = {
  'erez@barons.co.il': 'ארז',
  'roy@barons.co.il': 'רועי',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('he-IL') : '—'
const fmtMoney = (n) => (n == null || n === '') ? null : `₪${Number(n).toLocaleString('he-IL')}`

const expiryInfo = (dateStr) => {
  if (!dateStr) return { color: '#94a3b8', urgent: false }
  const days = Math.ceil((new Date(dateStr) - new Date()) / 86_400_000)
  if (days < 0)   return { color: '#dc2626', urgent: true }
  if (days <= 30)  return { color: '#ef4444', urgent: true }
  if (days <= 90)  return { color: '#f59e0b', urgent: false }
  return { color: '#16a34a', urgent: false }
}

const maskNumber = (num) => {
  if (!num) return '—'
  const clean = num.replace(/[\s-]/g, '')
  if (clean.length <= 4) return num
  return '•••• •••• •••• ' + clean.slice(-4)
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const css = {
  page: {
    minHeight: '100vh',
    background: '#f0f4ff',
    fontFamily: "'Open Sans','Open Sans Hebrew',Arial,sans-serif",
    direction: 'rtl',
  },
  header: {
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '12px 20px',
  },
  navBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#1d4ed8', fontFamily: 'inherit', fontSize: 14,
    padding: 0, fontWeight: 600,
  },
  primaryBtn: {
    background: '#1d4ed8', color: '#fff', border: 'none',
    borderRadius: 8, padding: '8px 16px', fontFamily: 'inherit',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  outlineBtn: {
    background: '#fff', color: '#1d4ed8', border: '1px solid #1d4ed8',
    borderRadius: 8, padding: '6px 12px', fontFamily: 'inherit',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  ghostBtn: {
    background: '#fff', color: '#64748b', border: '1px solid #e2e8f0',
    borderRadius: 8, padding: '6px 12px', fontFamily: 'inherit',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  input: {
    width: '100%', padding: '8px 12px', fontSize: 14,
    fontFamily: 'inherit', border: '1px solid #e2e8f0',
    borderRadius: 8, outline: 'none', boxSizing: 'border-box',
  },
  label: {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: '#334155', marginBottom: 4,
  },
  fieldGroup: { marginBottom: 14 },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16,
  },
  modal: {
    background: '#fff', borderRadius: 16, padding: '20px 24px',
    width: '100%', maxWidth: 480, maxHeight: '90vh',
    display: 'flex', flexDirection: 'column',
    fontFamily: "'Open Sans',Arial,sans-serif", direction: 'rtl',
  },
}

// ── Field ──────────────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div style={css.fieldGroup}>
      <label style={css.label}>{label}</label>
      {children}
    </div>
  )
}

// ── CardItem ───────────────────────────────────────────────────────────────────

function CardItem({ c, expanded, onToggle, onEdit, onDelete }) {
  const exp = expiryInfo(c.expiry_date)
  const [revealed, setRevealed] = useState(false)

  // Card brand color accent
  const brandColor = (() => {
    const n = (c.name || '').toLowerCase()
    if (n.includes('visa'))   return '#1a1f71'
    if (n.includes('master')) return '#eb001b'
    if (n.includes('אמריקן') || n.includes('amex')) return '#007bc1'
    if (n.includes('מקס') || n.includes('max'))   return '#e63946'
    return '#1d4ed8'
  })()

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 12, overflow: 'hidden',
      borderRight: `4px solid ${brandColor}`,
    }}>
      {/* Clickable header */}
      <div style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>
                💳 {c.name}
              </span>
              {fmtMoney(c.balance) && (
                <span style={{
                  background: '#dbeafe', color: '#1d4ed8',
                  borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600,
                }}>
                  {fmtMoney(c.balance)}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#64748b', flexWrap: 'wrap' }}>
              <span>
                מס׳:{' '}
                <code style={{ fontFamily: 'monospace', color: '#334155', letterSpacing: 1 }}>
                  {maskNumber(c.card_number)}
                </code>
              </span>
              {c.expiry_date && (
                <span style={{ color: exp.color, fontWeight: exp.urgent ? 700 : 400 }}>
                  תוקף: {fmtDate(c.expiry_date)}
                </span>
              )}
              {c.received_by && (
                <span>👤 {c.received_by}</span>
              )}
              {c.stores && (
                <span>
                  {c.stores.length > 45 ? c.stores.slice(0, 45) + '...' : c.stores}
                </span>
              )}
            </div>

            {c.notes && (
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, fontStyle: 'italic' }}>
                {c.notes}
              </div>
            )}
          </div>

          <span style={{
            fontSize: 18, color: '#94a3b8', flexShrink: 0,
            transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none',
          }}>▾</span>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '14px 16px' }}>
          {/* Sensitive details */}
          <div style={{
            background: '#f8fafc', borderRadius: 10, padding: '12px 14px',
            marginBottom: 14, fontSize: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>פרטי הכרטיס</span>
              <button
                onClick={() => setRevealed(r => !r)}
                style={{ ...css.outlineBtn, padding: '3px 10px', fontSize: 12 }}
              >
                {revealed ? '🙈 הסתר' : '👁 הצג פרטים'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: 12 }}>מספר כרטיס</span>
                <div>
                  <code style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>
                    {revealed ? (c.card_number || '—') : maskNumber(c.card_number)}
                  </code>
                </div>
              </div>
              {c.cvv && (
                <div>
                  <span style={{ color: '#64748b', fontSize: 12 }}>CVV</span>
                  <div>
                    <code style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>
                      {revealed ? c.cvv : '•••'}
                    </code>
                  </div>
                </div>
              )}
              {c.expiry_date && (
                <div>
                  <span style={{ color: '#64748b', fontSize: 12 }}>תוקף</span>
                  <div style={{ fontWeight: 600, color: exp.color }}>{fmtDate(c.expiry_date)}</div>
                </div>
              )}
              {fmtMoney(c.balance) && (
                <div>
                  <span style={{ color: '#64748b', fontSize: 12 }}>יתרה</span>
                  <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 15 }}>{fmtMoney(c.balance)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Stores */}
          {c.stores && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                📍 חנויות / שימוש:
              </div>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{c.stores}</div>
            </div>
          )}

              {c.added_by && (
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                  הוסיף: {USER_NAMES[c.added_by] || c.added_by}
                  {c.received_by && ` · שייך ל: ${c.received_by}`}
                </div>
              )}
              {!c.added_by && c.received_by && (
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                  שייך ל: {c.received_by}
                </div>
              )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={e => { e.stopPropagation(); onEdit() }} style={css.outlineBtn}>
              ✏️ עריכה
            </button>
            <button
              onClick={e => {
                e.stopPropagation()
                if (window.confirm('למחוק את הכרטיס?')) onDelete()
              }}
              style={css.ghostBtn}
            >
              🗑️ מחק
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Card Modal ─────────────────────────────────────────────────────────────────

function CardModal({ title, initial, onClose, onSave }) {
  const blank = {
    name: '', stores: '', card_number: '', expiry_date: '',
    cvv: '', balance: '', notes: '', received_by: '',
  }
  const [form, setForm] = useState({ ...blank, ...(initial || {}) })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handle() {
    if (!form.name.trim()) return alert('חובה להזין שם כרטיס')
    setSaving(true)
    await onSave({
      ...form,
      balance: form.balance === '' ? null : Number(form.balance),
    })
    setSaving(false)
  }

  return (
    <div style={css.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={css.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <Field label="שם הכרטיס *">
            <input style={css.input} autoFocus value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="מקס / כאל / ויזה / אמריקן אקספרס..." />
          </Field>

          <Field label="חנויות / לאיזה שימוש">
            <textarea
              style={{ ...css.input, resize: 'vertical', minHeight: 64, lineHeight: 1.6 }}
              value={form.stores}
              onChange={e => set('stores', e.target.value)}
              placeholder="פוקס, H&M, כל הקניות בחו״ל..." />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="מספר כרטיס">
              <input style={css.input} value={form.card_number}
                onChange={e => set('card_number', e.target.value)}
                placeholder="1234 5678 9012 3456" />
            </Field>
            <Field label="CVV">
              <input style={css.input} value={form.cvv}
                onChange={e => set('cvv', e.target.value)}
                placeholder="123" maxLength={4} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="תוקף">
              <input type="date" style={css.input} value={form.expiry_date}
                onChange={e => set('expiry_date', e.target.value)} />
            </Field>
            <Field label="יתרה (₪)">
              <input type="number" style={css.input} value={form.balance}
                onChange={e => set('balance', e.target.value)}
                placeholder="500" min="0" />
            </Field>
          </div>

          <Field label="הערות">
            <input style={css.input} value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="אופציונלי" />
          </Field>

          <Field label="שייך ל (אופציונלי)">
            <select style={css.input} value={form.received_by} onChange={e => set('received_by', e.target.value)}>
              <option value="">— משותף —</option>
              <option value="ארז">ארז</option>
              <option value="רועי">רועי</option>
            </select>
          </Field>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
          <button onClick={onClose} style={css.ghostBtn}>ביטול</button>
          <button onClick={handle} style={css.primaryBtn} disabled={saving}>
            {saving ? 'שומר...' : 'שמור כרטיס'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Cards({ session }) {
  const navigate = useNavigate()
  const userEmail = session?.user?.email

  const [cards,    setCards]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [expanded, setExpanded] = useState(null)
  const [showAdd,  setShowAdd]  = useState(false)
  const [editCard, setEditCard] = useState(null)

  useEffect(() => { loadCards() }, [])

  async function loadCards() {
    setLoading(true)
    const { data } = await supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: false })
    setCards(data || [])
    setLoading(false)
  }

  const filtered = cards.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return [c.name, c.stores, c.notes].some(f => f?.toLowerCase().includes(q))
  })

  return (
    <div style={css.page}>
      {/* Header */}
      <header style={css.header}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
          <button onClick={() => navigate('/')} style={css.navBtn}>BARONS</button>
          <span>/</span>
          <span style={{ color: '#1e293b', fontWeight: 600 }}>כרטיסים</span>
        </nav>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>💳 כרטיסים</h1>
          <button onClick={() => setShowAdd(true)} style={css.primaryBtn}>+ הוסף כרטיס</button>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px' }}>
        {/* Search */}
        <input
          style={{
            width: '100%', padding: '10px 14px', fontSize: 15,
            fontFamily: 'inherit', border: '1px solid #e2e8f0',
            borderRadius: 10, marginBottom: 16, outline: 'none',
            boxSizing: 'border-box', background: '#fff',
          }}
          placeholder="🔍  חפש לפי שם, חנות..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#94a3b8' }}>טוען...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#94a3b8' }}>
            {search ? 'לא נמצאו כרטיסים' : 'אין כרטיסים · לחץ + כדי להוסיף'}
          </div>
        ) : (
          filtered.map(c => (
            <CardItem
              key={c.id}
              c={c}
              expanded={expanded === c.id}
              onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
              onEdit={() => setEditCard(c)}
              onDelete={async () => {
                await supabase.from('cards').delete().eq('id', c.id)
                loadCards()
              }}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <CardModal
          title="הוספת כרטיס"
          onClose={() => setShowAdd(false)}
          onSave={async data => {
            await supabase.from('cards').insert({ ...data, added_by: userEmail })
            setShowAdd(false)
            loadCards()
          }}
        />
      )}

      {editCard && (
        <CardModal
          title="עריכת כרטיס"
          initial={editCard}
          onClose={() => setEditCard(null)}
          onSave={async data => {
            await supabase.from('cards').update(data).eq('id', editCard.id)
            setEditCard(null)
            loadCards()
          }}
        />
      )}
    </div>
  )
}
