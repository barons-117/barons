import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const PRIORITY_LABELS = { urgent: 'דחוף', regular: 'רגיל', daily: 'יום-יום' }
const PRIORITY_COLORS = { urgent: '#ef4444', regular: '#1d4ed8', daily: '#64748b' }
const PRIORITY_ORDER = { urgent: 0, regular: 1, daily: 2 }

export default function Shopping({ session }) {
  const navigate = useNavigate()
  const isAdmin = ['erez@barons.co.il', 'user@barons.co.il'].includes(session?.user?.email)

  const [items, setItems] = useState([])
  const [stores, setStores] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  // filters
  const [activeStore, setActiveStore] = useState(null) // null = all
  const [showDone, setShowDone] = useState(true)

  // add form
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: 1, unit: '', priority: 'regular', store_id: 1, department_id: '', notes: '' })
  const [saving, setSaving] = useState(false)

  // edit
  const [editItem, setEditItem] = useState(null)

  // quick qty modal
  const [qtyModal, setQtyModal] = useState(null) // { item }

  useEffect(() => { loadAll() }, [])

  // realtime
  useEffect(() => {
    const channel = supabase
      .channel('shopping_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, () => loadItems())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadAll() {
    setLoading(true)
    const [storesRes, depsRes] = await Promise.all([
      supabase.from('shopping_stores').select('*').order('sort_order'),
      supabase.from('shopping_departments').select('*').order('sort_order'),
    ])
    if (storesRes.data) setStores(storesRes.data)
    if (depsRes.data) setDepartments(depsRes.data)
    await loadItems()
    setLoading(false)
  }

  async function loadItems() {
    const { data } = await supabase
      .from('shopping_items')
      .select('*, shopping_stores(name,icon), shopping_departments(name,icon)')
      .order('is_done', { ascending: true })
      .order('created_at', { ascending: false })
    if (data) setItems(data)
  }

  function filteredItems() {
    return items.filter(i => {
      if (activeStore && i.store_id !== activeStore) return false
      return true
    })
  }

  function groupedItems() {
    const filtered = filteredItems()
    const pending = filtered.filter(i => !i.is_done)
    const done = filtered.filter(i => i.is_done)

    // group pending by department
    const byDept = {}
    pending.forEach(item => {
      const key = item.department_id || 0
      if (!byDept[key]) byDept[key] = []
      byDept[key].push(item)
    })

    // sort within each dept by priority
    Object.values(byDept).forEach(arr => arr.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]))

    return { byDept, done }
  }

  function getDeptName(id) {
    const d = departments.find(d => d.id === id)
    return d ? `${d.icon} ${d.name}` : '📦 כללי'
  }

  async function addItem(e) {
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
    setForm({ name: '', quantity: 1, unit: '', priority: 'regular', store_id: 1, department_id: '', notes: '' })
    setAddOpen(false)
    setSaving(false)
  }

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
  }

  async function toggleDone(item) {
    if (!item.is_done) {
      // mark done — set quantity_bought to full quantity
      await supabase.from('shopping_items').update({
        is_done: true,
        quantity_bought: item.quantity,
        done_at: new Date().toISOString(),
      }).eq('id', item.id)
    } else {
      await supabase.from('shopping_items').update({ is_done: false, quantity_bought: 0, done_at: null }).eq('id', item.id)
    }
  }

  async function setPartialBought(item, bought) {
    const isDone = bought >= item.quantity
    await supabase.from('shopping_items').update({
      quantity_bought: bought,
      is_done: isDone,
      done_at: isDone ? new Date().toISOString() : null,
    }).eq('id', item.id)
    setQtyModal(null)
  }

  async function deleteItem(id) {
    if (!confirm('למחוק?')) return
    await supabase.from('shopping_items').delete().eq('id', id)
  }

  async function clearDone() {
    if (!confirm('למחוק את כל הפריטים שנקנו?')) return
    await supabase.from('shopping_items').delete().eq('is_done', true)
  }

  const { byDept, done } = groupedItems()
  const deptKeys = Object.keys(byDept).sort((a, b) => {
    const da = departments.find(d => d.id === parseInt(a))
    const db = departments.find(d => d.id === parseInt(b))
    return (da?.sort_order || 99) - (db?.sort_order || 99)
  })

  const formDepts = departments.filter(d => d.store_id === parseInt(form.store_id) || !d.store_id)
  const editDepts = editItem ? departments.filter(d => d.store_id === parseInt(editItem.store_id) || !d.store_id) : []

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Open Sans Hebrew','Open Sans',Arial,sans-serif", background: '#f0f4ff', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 16px', height: 52, position: 'sticky', top: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button style={{ color: '#1d4ed8', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }} onClick={() => navigate('/')}>BARONS</button>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span style={{ fontWeight: 600, fontSize: 15 }}>קניות</span>
        </nav>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Quick-add link button */}
          <button
            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/shopping-quick`) }}
            style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
            title="העתק קישור מהיר"
          >🔗 קישור מהיר</button>
          <button
            onClick={() => setAddOpen(true)}
            style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
          >+ הוסף</button>
        </div>
      </header>

      {/* Store tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 16px', display: 'flex', gap: 4, overflowX: 'auto' }}>
        <button
          onClick={() => setActiveStore(null)}
          style={{ padding: '10px 14px', fontSize: 13, fontWeight: activeStore === null ? 700 : 400, color: activeStore === null ? '#1d4ed8' : '#64748b', background: 'none', border: 'none', borderBottom: activeStore === null ? '2px solid #1d4ed8' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >הכל</button>
        {stores.map(s => (
          <button key={s.id}
            onClick={() => setActiveStore(activeStore === s.id ? null : s.id)}
            style={{ padding: '10px 14px', fontSize: 13, fontWeight: activeStore === s.id ? 700 : 400, color: activeStore === s.id ? '#1d4ed8' : '#64748b', background: 'none', border: 'none', borderBottom: activeStore === s.id ? '2px solid #1d4ed8' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >{s.icon} {s.name}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>טוען...</div>
      ) : (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 12px' }}>

          {/* Pending items grouped by department */}
          {deptKeys.length === 0 && done.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
              <div style={{ fontWeight: 600 }}>הרשימה ריקה</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>לחץ "+ הוסף" כדי להתחיל</div>
            </div>
          )}

          {deptKeys.map(deptId => (
            <div key={deptId} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', padding: '8px 4px 4px', letterSpacing: '0.05em' }}>
                {getDeptName(parseInt(deptId))}
              </div>
              {byDept[deptId].map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  isAdmin={isAdmin}
                  onToggle={() => toggleDone(item)}
                  onEdit={() => setEditItem({ ...item })}
                  onDelete={() => deleteItem(item.id)}
                  onPartial={() => setQtyModal(item)}
                />
              ))}
            </div>
          ))}

          {/* Done items */}
          {done.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 8px' }}>
                <button onClick={() => setShowDone(v => !v)} style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showDone ? '▾' : '▸'} נקנו ({done.length})
                </button>
                {isAdmin && (
                  <button onClick={clearDone} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>נקה הכל</button>
                )}
              </div>
              {showDone && done.map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  isAdmin={isAdmin}
                  isDone
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

      {/* Add Modal */}
      {addOpen && (
        <Modal onClose={() => setAddOpen(false)}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>פריט חדש</div>
          <form onSubmit={addItem} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input required placeholder="שם הפריט" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" min="0" step="0.5" placeholder="כמות" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} style={{ ...inputStyle, width: 80 }} />
              <input placeholder="יחידה (ק״ג, יח׳...)" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inputStyle}>
              <option value="urgent">🔴 דחוף</option>
              <option value="regular">🔵 רגיל</option>
              <option value="daily">⚪ יום-יום</option>
            </select>
            <select value={form.store_id} onChange={e => setForm(f => ({ ...f, store_id: e.target.value, department_id: '' }))} style={inputStyle}>
              {stores.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
            {parseInt(form.store_id) === 1 && (
              <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} style={inputStyle}>
                <option value="">-- מחלקה --</option>
                {formDepts.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
              </select>
            )}
            <input placeholder="הערות (אופציונלי)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} />
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" onClick={() => setAddOpen(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>ביטול</button>
              <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
                {saving ? 'שומר...' : 'הוסף'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editItem && (
        <Modal onClose={() => setEditItem(null)}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>עריכת פריט</div>
          <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input required value={editItem.name} onChange={e => setEditItem(i => ({ ...i, name: e.target.value }))} style={inputStyle} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" min="0" step="0.5" value={editItem.quantity} onChange={e => setEditItem(i => ({ ...i, quantity: e.target.value }))} style={{ ...inputStyle, width: 80 }} />
              <input placeholder="יחידה" value={editItem.unit || ''} onChange={e => setEditItem(i => ({ ...i, unit: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <select value={editItem.priority} onChange={e => setEditItem(i => ({ ...i, priority: e.target.value }))} style={inputStyle}>
              <option value="urgent">🔴 דחוף</option>
              <option value="regular">🔵 רגיל</option>
              <option value="daily">⚪ יום-יום</option>
            </select>
            <select value={editItem.store_id} onChange={e => setEditItem(i => ({ ...i, store_id: e.target.value, department_id: '' }))} style={inputStyle}>
              {stores.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
            {parseInt(editItem.store_id) === 1 && (
              <select value={editItem.department_id || ''} onChange={e => setEditItem(i => ({ ...i, department_id: e.target.value }))} style={inputStyle}>
                <option value="">-- מחלקה --</option>
                {editDepts.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
              </select>
            )}
            <input placeholder="הערות" value={editItem.notes || ''} onChange={e => setEditItem(i => ({ ...i, notes: e.target.value }))} style={inputStyle} />
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" onClick={() => setEditItem(null)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>ביטול</button>
              <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
                {saving ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Partial qty modal */}
      {qtyModal && (
        <Modal onClose={() => setQtyModal(null)}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>כמה קנית?</div>
          <div style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>{qtyModal.name} — סה״כ: {qtyModal.quantity} {qtyModal.unit}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {Array.from({ length: Math.ceil(qtyModal.quantity) + 1 }, (_, i) => i).map(n => (
              <button key={n} onClick={() => setPartialBought(qtyModal, n)}
                style={{
                  width: 52, height: 52, borderRadius: 8, fontSize: 16, fontWeight: 700,
                  background: n === 0 ? '#f1f5f9' : n >= qtyModal.quantity ? '#dcfce7' : '#fef9c3',
                  border: `2px solid ${n === 0 ? '#e2e8f0' : n >= qtyModal.quantity ? '#86efac' : '#fde68a'}`,
                  cursor: 'pointer', color: '#0f172a'
                }}>{n}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>0 = לא קנית כלום · {qtyModal.quantity} = קנית הכל</div>
        </Modal>
      )}
    </div>
  )
}

function ItemRow({ item, isAdmin, isDone, onToggle, onEdit, onDelete, onPartial }) {
  const hasPart = item.quantity_bought > 0 && !item.is_done
  const pct = item.quantity > 0 ? (item.quantity_bought / item.quantity) * 100 : 0

  return (
    <div style={{
      background: 'white',
      borderRadius: 10,
      padding: '10px 12px',
      marginBottom: 6,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      opacity: isDone ? 0.55 : 1,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      border: item.priority === 'urgent' && !isDone ? '1px solid #fca5a5' : '1px solid #f1f5f9',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Priority stripe */}
      {!isDone && (
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: PRIORITY_COLORS[item.priority], borderRadius: '0 10px 10px 0' }} />
      )}

      {/* Checkbox */}
      <button onClick={onToggle} style={{
        width: 24, height: 24, borderRadius: 6, border: `2px solid ${isDone ? '#86efac' : '#cbd5e1'}`,
        background: isDone ? '#dcfce7' : 'white', cursor: 'pointer', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
      }}>{isDone ? '✓' : ''}</button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 14, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? '#94a3b8' : '#0f172a' }}>
            {item.name}
          </span>
          {item.quantity !== 1 && (
            <span style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', borderRadius: 4, padding: '1px 6px' }}>
              {isDone || !hasPart
                ? `${item.quantity}${item.unit ? ' ' + item.unit : ''}`
                : `${item.quantity_bought}/${item.quantity}${item.unit ? ' ' + item.unit : ''}`}
            </span>
          )}
          {item.quantity === 1 && item.unit && (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{item.unit}</span>
          )}
          {item.priority === 'urgent' && !isDone && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>דחוף!</span>}
          {item.shopping_stores?.name && item.shopping_stores.name !== 'סופר' && (
            <span style={{ fontSize: 11, color: '#7c3aed', background: '#ede9fe', borderRadius: 4, padding: '1px 6px' }}>{item.shopping_stores.icon} {item.shopping_stores.name}</span>
          )}
        </div>
        {item.notes && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{item.notes}</div>}

        {/* Partial progress bar */}
        {hasPart && (
          <div style={{ marginTop: 5, height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#fbbf24', borderRadius: 2 }} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {!isDone && (
          <button onClick={onPartial} title="כמות חלקית" style={{ width: 28, height: 28, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14 }}>±</button>
        )}
        {isAdmin && (
          <>
            <button onClick={onEdit} style={{ width: 28, height: 28, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}>✏️</button>
            <button onClick={onDelete} style={{ width: 28, height: 28, border: '1px solid #fee2e2', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}>🗑️</button>
          </>
        )}
      </div>
    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', direction: 'rtl' }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
  fontSize: 14, fontFamily: "'Open Sans Hebrew','Open Sans',Arial,sans-serif",
  boxSizing: 'border-box', direction: 'rtl', outline: 'none',
}
