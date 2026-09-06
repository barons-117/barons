import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import {
  OWNERS, todayISO, addDays, addMonths, fmtDate, offsetLabel,
  effectiveOffsets, effectivePostExpiry, itemTitle, downloadICS, googleCalendarURL,
} from './expiryLib'

// ─── Modal shell (portal — parent may have transform/will-change) ─────────────
export function Modal({ onClose, children, small }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])
  return createPortal(
    <div className="xp-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className={'xp-modal' + (small ? ' sm' : '')} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>,
    document.body
  )
}

const ICON = {
  apple: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  google: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>,
  renew: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/></svg>,
  off: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 5l14 14M19 5L5 19"/></svg>,
  snooze: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  archive: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/></svg>,
}

// ─── Add / Edit form ──────────────────────────────────────────────────────────
// props: types (with .category), item (null = new), onClose, onSaved(item, { isNew })
export function ItemForm({ types, item, onClose, onSaved, session }) {
  const isNew = !item
  const [f, setF] = useState(() => ({
    owner: item?.owner || 'erez',
    owner_other: item?.owner_other || '',
    type_id: item?.type_id || types.find(t => t.key === 'passport')?.id || types[0]?.id || '',
    title: item?.title || '',
    notes: item?.notes || '',
    expires_on: item?.expires_on || '',
    issued_on: item?.issued_on || '',
    reference: item?.reference || '',
    vendor: item?.vendor || '',
    amount: item?.amount ?? '',
    url: item?.url || '',
    notify_emails: (item?.notify_emails || []).join(', '),
    offsets: item?.offsets_override?.length ? [...item.offsets_override] : null,   // null = inherit
    post_expiry: item?.post_expiry_override ?? null,
  }))
  const [newType, setNewType] = useState(null)     // { label_he, category_key }
  const [more, setMore] = useState(Boolean(item?.reference || item?.vendor || item?.amount || item?.url))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [newOff, setNewOff] = useState('')

  const type = useMemo(() => types.find(t => t.id === f.type_id), [types, f.type_id])
  const inherited = useMemo(() => (type?.default_offsets || [30, 7, 0]).slice().sort((a, b) => b - a), [type])
  const shownOffsets = f.offsets ? [...f.offsets].sort((a, b) => b - a) : inherited
  const isCustom = f.offsets !== null
  const postExpiry = f.post_expiry ?? type?.post_expiry_every ?? 14

  const byCat = useMemo(() => {
    const m = new Map()
    for (const t of types.filter(t => t.is_active !== false)) {
      const c = t.category?.label_he || 'אחר'
      if (!m.has(c)) m.set(c, [])
      m.get(c).push(t)
    }
    return [...m.entries()]
  }, [types])

  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  function suggestExpiry() {
    if (!type?.renewal_months) return
    const base = f.issued_on || todayISO()
    set('expires_on', addMonths(base, type.renewal_months))
  }

  function toggleOffset(n) {
    const cur = new Set(shownOffsets)
    cur.has(n) ? cur.delete(n) : cur.add(n)
    set('offsets', [...cur].sort((a, b) => b - a))
  }
  function addOffset() {
    const n = parseInt(newOff, 10)
    if (Number.isNaN(n) || n < 0 || n > 3650) return
    toggleOffset(n); setNewOff('')
  }

  async function save() {
    setErr('')
    if (!f.expires_on) return setErr('חסר תאריך תוקף.')
    if (f.owner === 'other' && !f.owner_other.trim()) return setErr('מי זה "אחר"? כתוב שם.')
    setSaving(true)
    try {
      let typeId = f.type_id
      if (newType) {
        if (!newType.label_he.trim()) throw new Error('שם הסוג החדש ריק.')
        const key = 'custom_' + Date.now().toString(36)
        const { data, error } = await supabase.from('expiry_types').insert({
          key, label_he: newType.label_he.trim(), category_key: newType.category_key || 'other',
          default_offsets: f.offsets || [30, 7, 0], post_expiry_every: 14, is_builtin: false, sort_order: 500,
        }).select('*, category:expiry_categories(*)').single()
        if (error) throw error
        typeId = data.id
        onSaved?.(null, { newType: data })  // let parent refresh types
      }
      const emails = f.notify_emails.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
      const payload = {
        type_id: typeId,
        owner: f.owner,
        owner_other: f.owner === 'other' ? f.owner_other.trim() : null,
        title: f.title.trim() || null,
        notes: f.notes.trim() || null,
        expires_on: f.expires_on,
        issued_on: f.issued_on || null,
        reference: f.reference.trim() || null,
        vendor: f.vendor.trim() || null,
        amount: f.amount === '' ? null : Number(f.amount),
        url: f.url.trim() || null,
        notify_emails: emails.length ? emails : null,
        offsets_override: f.offsets && f.offsets.length ? f.offsets : null,
        post_expiry_override: f.post_expiry,
      }
      let res
      if (isNew) {
        res = await supabase.from('expiry_items').insert({ ...payload, created_by: session?.user?.email || null })
          .select('*, type:expiry_types(*, category:expiry_categories(*))').single()
      } else {
        res = await supabase.from('expiry_items').update(payload).eq('id', item.id)
          .select('*, type:expiry_types(*, category:expiry_categories(*))').single()
      }
      if (res.error) throw res.error
      onSaved?.(res.data, { isNew, dateChanged: !isNew && item.expires_on !== f.expires_on })
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>{isNew ? 'פריט חדש' : 'עריכה'}</h2>
      <p className="lead">{isNew ? 'מי, מה, ומתי זה נגמר. השאר אופציונלי.' : itemTitle(item)}</p>
      {err && <div className="xp-err">{err}</div>}

      <div className="xp-f">
        <label>מי?</label>
        <div className="xp-seg">
          {OWNERS.map(o => (
            <button key={o.key} type="button" className={f.owner === o.key ? 'on' : ''} onClick={() => set('owner', o.key)}>{o.label}</button>
          ))}
        </div>
        {f.owner === 'other' && (
          <input type="text" placeholder="שם" value={f.owner_other} onChange={e => set('owner_other', e.target.value)} style={{ marginTop: 6 }} />
        )}
      </div>

      <div className="xp-f">
        <label>מה? {type?.category && <span className="opt">· {type.category.label_he}</span>}</label>
        {!newType ? (
          <select value={f.type_id} onChange={e => {
            if (e.target.value === '__new') { setNewType({ label_he: '', category_key: 'other' }); return }
            set('type_id', e.target.value)
          }}>
            {byCat.map(([cat, list]) => (
              <optgroup key={cat} label={cat}>
                {list.map(t => <option key={t.id} value={t.id}>{t.label_he}</option>)}
              </optgroup>
            ))}
            <option value="__new">+ סוג חדש…</option>
          </select>
        ) : (
          <div className="xp-grid2">
            <input type="text" autoFocus placeholder="שם הסוג החדש" value={newType.label_he} onChange={e => setNewType(p => ({ ...p, label_he: e.target.value }))} />
            <select value={newType.category_key} onChange={e => setNewType(p => ({ ...p, category_key: e.target.value }))}>
              {[...new Map(types.map(t => [t.category_key, t.category?.label_he || t.category_key])).entries()]
                .map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <button type="button" className="xp-btn link" style={{ justifySelf: 'start' }} onClick={() => setNewType(null)}>ביטול — בחר מהרשימה</button>
          </div>
        )}
      </div>

      <div className="xp-f">
        <label>תיאור <span className="opt">· מה בדיוק</span></label>
        <input type="text" placeholder={type?.placeholder_he || 'למשל: ישראלי / ויזה עסקי 2344'} value={f.title} onChange={e => set('title', e.target.value)} />
      </div>

      <div className="xp-f">
        <label>הערות <span className="opt">· מה לזכור כשזה יגיע</span></label>
        <textarea placeholder='למשל: "תכנית לשנה ב-9 ₪/חודש, עולה אוטומטית אם לא מעדכנים. החבילה כוללת חו"ל."' value={f.notes} onChange={e => set('notes', e.target.value)} />
        <div className="xp-help">ההערות יופיעו ברשימה, במייל התזכורת וביומן.</div>
      </div>

      <div className="xp-grid2">
        <div className="xp-f">
          <label>תוקף עד</label>
          <input type="date" value={f.expires_on} onChange={e => set('expires_on', e.target.value)} />
          {type?.renewal_months && (
            <button type="button" className="xp-off-reset" style={{ alignSelf: 'flex-start' }} onClick={suggestExpiry}>
              חשב: {f.issued_on ? 'הנפקה' : 'היום'} + {type.renewal_months} חודשים
            </button>
          )}
        </div>
        <div className="xp-f">
          <label>הונפק <span className="opt">· אופציונלי</span></label>
          <input type="date" value={f.issued_on} onChange={e => set('issued_on', e.target.value)} />
        </div>
      </div>

      <div className="xp-f">
        <label>
          תזכורות
          {isCustom
            ? <> <span className="xp-tag">CUSTOM</span> <button type="button" className="xp-off-reset" onClick={() => set('offsets', null)}>אפס לברירת מחדל</button></>
            : <span className="opt"> · ברירת מחדל של {type?.label_he || 'הסוג'}</span>}
        </label>
        <div className="xp-offsets">
          {shownOffsets.map(n => (
            <span key={n} className="xp-off">{offsetLabel(n)}<button type="button" onClick={() => toggleOffset(n)} aria-label="הסר">×</button></span>
          ))}
          <span className="xp-off-add">
            <input type="number" min="0" placeholder="ימים" value={newOff} onChange={e => setNewOff(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOffset())} />
            <button type="button" className="xp-off-reset" onClick={addOffset}>הוסף</button>
          </span>
        </div>
        <div className="xp-help" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          אחרי שפג:
          <select className="xp-select" value={postExpiry} onChange={e => set('post_expiry', Number(e.target.value))}>
            <option value={0}>שקט</option>
            <option value={1}>כל יום</option>
            <option value={3}>כל 3 ימים</option>
            <option value={7}>כל שבוע</option>
            <option value={14}>כל שבועיים</option>
            <option value={30}>כל חודש</option>
          </select>
          עד שתסמן "חידשתי".
        </div>
      </div>

      <div className="xp-f">
        <label>נמענים <span className="opt">· ריק = לפי הבעלים</span></label>
        <input type="text" dir="ltr" style={{ textAlign: 'left' }} placeholder="erez@barons.co.il, roy@barons.co.il" value={f.notify_emails} onChange={e => set('notify_emails', e.target.value)} />
      </div>

      <div className="xp-more">
        <button type="button" className="hd" onClick={() => setMore(m => !m)}>
          <span>פרטים נוספים</span><span style={{ fontSize: 18, lineHeight: 1 }}>{more ? '−' : '+'}</span>
        </button>
        {more && (
          <div className="body">
            <div className="xp-grid2">
              <div className="xp-f"><label>מספר / reference</label><input type="text" value={f.reference} onChange={e => set('reference', e.target.value)} /></div>
              <div className="xp-f"><label>ספק / גוף</label><input type="text" placeholder="הראל, משרד הפנים, כאל" value={f.vendor} onChange={e => set('vendor', e.target.value)} /></div>
              <div className="xp-f"><label>עלות חידוש (₪)</label><input type="number" inputMode="decimal" value={f.amount} onChange={e => set('amount', e.target.value)} /></div>
              <div className="xp-f"><label>קישור</label><input type="url" dir="ltr" style={{ textAlign: 'left' }} placeholder="https://" value={f.url} onChange={e => set('url', e.target.value)} /></div>
            </div>
          </div>
        )}
      </div>

      <div className="xp-mfoot">
        <button type="button" className="xp-btn link" onClick={onClose}>ביטול</button>
        <div className="grp">
          <button type="button" className="xp-btn primary" disabled={saving} onClick={save}>{saving ? 'שומר…' : (isNew ? 'שמור פריט' : 'שמור שינויים')}</button>
        </div>
      </div>
    </Modal>
  )
}

// ─── "What happened?" — renew / not relevant / snooze / archive ───────────────
// props: item, onClose, onDone(updatedOrNewItem, action)
export function ResolveModal({ item, onClose, onDone, session, initial }) {
  const [step, setStep] = useState(initial || 'choose')  // choose | renew | not_relevant | snooze
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const suggested = item.type?.renewal_months ? addMonths(item.expires_on, item.type.renewal_months) : addMonths(item.expires_on, 12)
  const [r, setR] = useState({ expires_on: suggested, reference: '', notes: item.notes || '', issued_on: todayISO() })
  const [note, setNote] = useState('')
  const [snooze, setSnooze] = useState(addDays(todayISO(), 14))

  async function run(fn) {
    setErr(''); setBusy(true)
    try { await fn() } catch (e) { setErr(e.message || String(e)) } finally { setBusy(false) }
  }

  const doRenew = () => run(async () => {
    if (!r.expires_on) throw new Error('חסר תאריך תוקף חדש.')
    const { data: created, error } = await supabase.from('expiry_items').insert({
      type_id: item.type_id, owner: item.owner, owner_other: item.owner_other, title: item.title,
      expires_on: r.expires_on, issued_on: r.issued_on || null,
      reference: r.reference.trim() || null, vendor: item.vendor, amount: item.amount, currency: item.currency, url: item.url,
      notes: r.notes.trim() || null,
      offsets_override: item.offsets_override, post_expiry_override: item.post_expiry_override, notify_emails: item.notify_emails,
      renewed_from_id: item.id, created_by: session?.user?.email || null,
    }).select('*, type:expiry_types(*, category:expiry_categories(*))').single()
    if (error) throw error
    const { error: e2 } = await supabase.from('expiry_items').update({ status: 'renewed', resolved_at: new Date().toISOString() }).eq('id', item.id)
    if (e2) throw e2
    onDone?.(created, 'renew')
  })

  const doArchive = (reason) => run(async () => {
    const { data, error } = await supabase.from('expiry_items').update({
      status: 'archived', archive_reason: reason, resolved_at: new Date().toISOString(), resolved_note: note.trim() || null,
    }).eq('id', item.id).select('*, type:expiry_types(*, category:expiry_categories(*))').single()
    if (error) throw error
    onDone?.(data, 'archive')
  })

  const doSnooze = () => run(async () => {
    const { data, error } = await supabase.from('expiry_items').update({ snoozed_until: snooze }).eq('id', item.id)
      .select('*, type:expiry_types(*, category:expiry_categories(*))').single()
    if (error) throw error
    onDone?.(data, 'snooze')
  })

  return (
    <Modal onClose={onClose} small>
      {step === 'choose' && (
        <>
          <h2>מה קרה עם זה?</h2>
          <p className="lead">{itemTitle(item)} · {fmtDate(item.expires_on)}</p>
          {err && <div className="xp-err">{err}</div>}
          <div className="xp-choices">
            <button className="xp-choice" onClick={() => setStep('renew')}>
              <span className="ic">{ICON.renew}</span>
              <span><b>חידשתי</b><small>נפתח פריט חדש עם תאריך חדש. הישן נשמר בהיסטוריה.</small></span>
            </button>
            <button className="xp-choice" onClick={() => setStep('not_relevant')}>
              <span className="ic">{ICON.off}</span>
              <span><b>לא רלוונטי, אפשר להסיר</b><small>עובר לארכיון. אפשר לשחזר.</small></span>
            </button>
            <button className="xp-choice" onClick={() => setStep('snooze')}>
              <span className="ic">{ICON.snooze}</span>
              <span><b>הזכר לי שוב ב-…</b><small>משתיק תזכורות עד תאריך.</small></span>
            </button>
            <button className="xp-choice" onClick={() => doArchive('manual')}>
              <span className="ic">{ICON.archive}</span>
              <span><b>ארכיון</b><small>בלי סיבה מיוחדת.</small></span>
            </button>
          </div>
          <div className="xp-mfoot"><button className="xp-btn link" onClick={onClose}>סגור</button><span /></div>
        </>
      )}

      {step === 'renew' && (
        <>
          <h2>חידשתי</h2>
          <p className="lead">{itemTitle(item)} — הפרטים של החדש</p>
          {err && <div className="xp-err">{err}</div>}
          <div className="xp-grid2">
            <div className="xp-f"><label>תוקף חדש עד</label><input type="date" value={r.expires_on} onChange={e => setR(p => ({ ...p, expires_on: e.target.value }))} /></div>
            <div className="xp-f"><label>הונפק</label><input type="date" value={r.issued_on} onChange={e => setR(p => ({ ...p, issued_on: e.target.value }))} /></div>
          </div>
          <div className="xp-f"><label>מספר חדש <span className="opt">· אופציונלי</span></label><input type="text" value={r.reference} onChange={e => setR(p => ({ ...p, reference: e.target.value }))} /></div>
          <div className="xp-f"><label>הערות <span className="opt">· הועתקו מהקודם</span></label><textarea value={r.notes} onChange={e => setR(p => ({ ...p, notes: e.target.value }))} /></div>
          <div className="xp-mfoot">
            <button className="xp-btn link" onClick={() => setStep('choose')}>חזרה</button>
            <button className="xp-btn primary" disabled={busy} onClick={doRenew}>{busy ? 'שומר…' : 'צור פריט מחודש'}</button>
          </div>
        </>
      )}

      {step === 'not_relevant' && (
        <>
          <h2>לא רלוונטי</h2>
          <p className="lead">{itemTitle(item)} יעבור לארכיון ויפסיק להזכיר.</p>
          {err && <div className="xp-err">{err}</div>}
          <div className="xp-f"><label>למה? <span className="opt">· אופציונלי</span></label><input type="text" placeholder="מכרתי את הרכב / ביטלתי את הפוליסה" value={note} onChange={e => setNote(e.target.value)} /></div>
          <div className="xp-mfoot">
            <button className="xp-btn link" onClick={() => setStep('choose')}>חזרה</button>
            <button className="xp-btn danger" disabled={busy} onClick={() => doArchive('not_relevant')}>{busy ? 'מעביר…' : 'העבר לארכיון'}</button>
          </div>
        </>
      )}

      {step === 'snooze' && (
        <>
          <h2>הזכר לי שוב</h2>
          <p className="lead">עד התאריך הזה לא יישלחו תזכורות על {itemTitle(item)}.</p>
          {err && <div className="xp-err">{err}</div>}
          <div className="xp-seg" style={{ marginBottom: 12 }}>
            {[[3, '3 ימים'], [7, 'שבוע'], [14, 'שבועיים'], [30, 'חודש']].map(([d, l]) => (
              <button key={d} type="button" className={snooze === addDays(todayISO(), d) ? 'on' : ''} onClick={() => setSnooze(addDays(todayISO(), d))}>{l}</button>
            ))}
          </div>
          <div className="xp-f"><label>או תאריך</label><input type="date" value={snooze} onChange={e => setSnooze(e.target.value)} /></div>
          <div className="xp-mfoot">
            <button className="xp-btn link" onClick={() => setStep('choose')}>חזרה</button>
            <button className="xp-btn primary" disabled={busy} onClick={doSnooze}>{busy ? 'שומר…' : 'השתק עד אז'}</button>
          </div>
        </>
      )}
    </Modal>
  )
}

// ─── Add to calendar popup ────────────────────────────────────────────────────
export function CalendarPopup({ item, onClose, saved }) {
  const offs = effectiveOffsets(item).filter(o => o >= 0)
  return (
    <Modal onClose={onClose} small>
      <h2>{saved ? 'נשמר' : 'הוסף ללוח שנה'}</h2>
      <p className="lead">{itemTitle(item)} · {fmtDate(item.expires_on)}{saved ? ' — להוסיף גם ליומן?' : ''}</p>
      <div className="xp-choices">
        <button className="xp-choice" onClick={() => { downloadICS(item); onClose?.() }}>
          <span className="ic">{ICON.apple}</span>
          <span><b>Apple / Outlook</b><small>קובץ יומן עם התראות: {offs.map(offsetLabel).join(', ')}.</small></span>
        </button>
        <a className="xp-choice" href={googleCalendarURL(item)} target="_blank" rel="noreferrer" onClick={() => onClose?.()} style={{ textDecoration: 'none' }}>
          <span className="ic">{ICON.google}</span>
          <span><b>Google Calendar</b><small>אירוע יום-שלם. התראות מוגדרות ב-Google עצמו.</small></span>
        </a>
      </div>
      <div className="xp-mfoot"><button className="xp-btn link" onClick={onClose}>{saved ? 'לא עכשיו' : 'סגור'}</button><span /></div>
    </Modal>
  )
}
