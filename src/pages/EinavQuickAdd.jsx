// src/pages/EinavQuickAdd.jsx
// ============================================================
// BARONS · הוספת שובר — עמוד פתוח, בלי התחברות
// route: /einav/add
// כותב ל-einav_vouchers עם source='quick'.
// RLS מרשה ל-anon INSERT בלבד — אי אפשר לקרוא שום שובר מכאן.
// ============================================================
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const IMG_BUCKET = 'voucher-images'

const CSS = `
.qa{
  --paper:#F6F5F2; --card:#FFFFFF; --soft:#FAFAF9;
  --ink:#15161A; --ink2:#44484F; --ink3:#666B73;
  --hair:rgba(20,22,28,.14); --hairS:rgba(20,22,28,.08);
  --accent:#A8325A; --ok:#186B43; --okS:#E8F4EE; --danger:#B3243C; --dangerS:#FCEAEE;
  direction:rtl; background:var(--paper); color:var(--ink);
  font-family:'Assistant','Open Sans Hebrew','Open Sans',system-ui,sans-serif;
  font-size:16px; line-height:1.6; min-height:100dvh; -webkit-font-smoothing:antialiased;
}
.qa *{box-sizing:border-box;margin:0;padding:0}
.qa button{background:none;border:none;cursor:pointer;font:inherit;color:inherit}
.qa input,.qa select,.qa textarea{font:inherit;color:inherit}
.qa :focus-visible{outline:3px solid var(--accent);outline-offset:2px;border-radius:8px}

.qa-wrap{max-width:620px;margin:0 auto;padding:28px 18px 80px}
.qa-head{margin-bottom:24px}
.qa-head h1{font-size:34px;font-weight:800;letter-spacing:-.035em;line-height:1.1}
.qa-head p{color:var(--ink2);font-size:16px;margin-top:8px}

.qa-card{background:var(--card);border:1px solid var(--hair);border-radius:18px;
  box-shadow:0 1px 2px rgba(16,24,40,.05), 0 14px 30px -14px rgba(16,24,40,.18);padding:24px}

.qa-form{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.qa-f{display:flex;flex-direction:column;gap:7px}
.qa-f.full{grid-column:1/-1}
.qa-f label{font-size:14px;font-weight:700}
.qa-f input,.qa-f select,.qa-f textarea{background:var(--card);border:1.5px solid var(--hair);
  border-radius:11px;padding:12px 13px;outline:none;font-size:16px;min-height:48px}
.qa-f input:focus,.qa-f select:focus,.qa-f textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(168,50,90,.12)}
.qa-f .hint{font-size:13.5px;color:var(--ink2)}
.qa-sep{grid-column:1/-1;display:flex;align-items:center;gap:11px;margin-top:6px}
.qa-sep span{font-size:13px;font-weight:700;color:var(--ink2);white-space:nowrap}
.qa-sep i{flex:1;height:1px;background:var(--hair)}
.qa-drop{grid-column:1/-1;border:1.5px dashed var(--hair);border-radius:14px;padding:22px;
  text-align:center;color:var(--ink2);font-size:15px;cursor:pointer;background:var(--soft)}
.qa-drop:hover{border-color:var(--accent);color:var(--ink)}
.qa-drop input{display:none}
.qa-drop img{max-height:150px;border-radius:10px;margin-top:12px}
.qa-drop .hint{font-size:13.5px;color:var(--ink3)}

.qa-picks{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px}
.qa-pick{position:relative;height:96px;border-radius:12px;overflow:hidden;border:1px solid var(--hair);background:var(--soft)}
.qa-pick img{width:100%;height:100%;object-fit:cover;display:block}
.qa-pick .rm{position:absolute;top:5px;inset-inline-end:5px;width:28px;height:28px;border-radius:8px;
  background:rgba(20,22,28,.72);color:#fff;display:grid;place-items:center}
.qa-pick .rm:hover{background:var(--danger)}

.qa-catrow{display:flex;align-items:center;gap:11px}
.qa-catrow select{flex:1}
.qa-logo{width:46px;height:46px;border-radius:12px;background:#fff;border:1px solid var(--hair);
  display:grid;place-items:center;flex:none;overflow:hidden}
.qa-logo img{width:100%;height:100%;object-fit:contain;padding:5px}
.qa-logo.empty{border:1.5px dashed #8A5A0E;background:#FBF1DF;color:#8A5A0E;font-size:20px;font-weight:800}

.qa-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 22px;
  border-radius:12px;font-weight:700;font-size:17px;min-height:54px;transition:all .2s cubic-bezier(.23,1,.32,1)}
.qa-btn.dark{background:var(--ink);color:#fff;width:100%;margin-top:22px}
.qa-btn.dark:hover{background:#33363D}
.qa-btn.ghost{background:var(--card);border:1.5px solid var(--hair);color:var(--ink)}
.qa-btn:active{transform:scale(.99)}
.qa-btn:disabled{opacity:.55;cursor:not-allowed}

.qa-err{background:var(--dangerS);border:1.5px solid var(--danger);color:var(--danger);
  border-radius:11px;padding:13px 15px;font-size:15px;font-weight:600;margin-bottom:18px}

.qa-done{text-align:center;padding:24px 8px}
.qa-done .tick{width:66px;height:66px;border-radius:50%;background:var(--okS);color:var(--ok);
  display:grid;place-items:center;margin:0 auto 18px}
.qa-done h2{font-size:26px;font-weight:800;letter-spacing:-.03em}
.qa-done p{color:var(--ink2);font-size:16px;margin-top:10px;margin-bottom:26px}
.qa-done .row{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}

@media (max-width:640px){
  .qa-form{grid-template-columns:1fr}
  .qa-card{padding:20px}
  .qa-head h1{font-size:29px}
}
@media (prefers-reduced-motion:reduce){.qa *{transition-duration:.01ms !important}}
`

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const nullify = obj => Object.fromEntries(
  Object.entries(obj).map(([k, v]) => [k, (typeof v === 'string' && v.trim() === '') ? null : v])
)

const BLANK = {
  category_id: '', place: '', item: '', amount: '', paid: '',
  seller: '', bought_on: '', expires_on: '', code: '', cvv: '', note: '',
}

export default function EinavQuickAdd() {
  const [cats, setCats] = useState([])
  const [form, setForm] = useState({ ...BLANK, bought_on: todayISO() })
  const [shots, setShots] = useState([])   // [{ file, url }]
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.from('voucher_categories').select('*').order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) { setErr('לא הצלחנו לטעון את הקטגוריות. נסו לרענן.'); return }
        setCats(data || [])
      })
  }, [])

  const cat = cats.find(c => c.id === form.category_id)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function pickFiles(e) {
    const picked = Array.from(e.target.files || [])
    if (!picked.length) return
    setShots(s => [...s, ...picked.map(f => ({ file: f, url: URL.createObjectURL(f) }))])
    e.target.value = ''
  }
  const dropShot = i => setShots(s => s.filter((_, j) => j !== i))

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (!form.category_id) {
      setErr('צריך לבחור קטגוריה')
      document.getElementById('q-cat')?.focus()
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const amount = Number(form.amount || 0)
    const item = form.item.trim()
    if (!amount && !item) {
      setErr('צריך למלא סכום, או לכתוב מה השובר כולל')
      return
    }
    setBusy(true)

    const images = []
    for (const s of shots) {
      const ext = (s.file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${new Date().getFullYear()}/quick-${crypto.randomUUID()}.${ext}`
      const up = await supabase.storage.from(IMG_BUCKET).upload(path, s.file)
      if (up.error) {
        setBusy(false)
        setErr('העלאת התמונות נכשלה. אפשר לשמור בלי תמונות ולהוסיף אותן אחר כך.')
        return
      }
      images.push(path)
    }

    const payload = nullify({
      category_id: form.category_id || null,
      place: form.place, item,
      amount, used: 0,
      paid: form.paid === '' ? null : Number(form.paid),
      seller: form.seller,
      bought_on: form.bought_on, expires_on: form.expires_on,
      code: form.code, cvv: form.cvv, note: form.note,
      images,
      image_url: images[0] || null,   // תאימות לאחור
      status: 'active', source: 'quick',
    })

    const { error } = await supabase.from('einav_vouchers').insert(payload)
    setBusy(false)
    if (error) { setErr('השמירה נכשלה: ' + error.message); return }

    setDone(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function again() {
    setForm({ ...BLANK, bought_on: todayISO() })
    setShots([]); setDone(false); setErr('')
  }

  if (done) {
    return (
      <div className="qa">
        <style>{CSS}</style>
        <div className="qa-wrap">
          <div className="qa-card">
            <div className="qa-done">
              <div className="tick">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
                     strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 12 5 5L20 6" /></svg>
              </div>
              <h2>השובר נשמר</h2>
              <p>הוא כבר מופיע ברשימת השוברים.</p>
              <div className="row">
                <button className="qa-btn ghost" onClick={again}>הוספת שובר נוסף</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="qa">
      <style>{CSS}</style>
      <div className="qa-wrap">
        <header className="qa-head">
          <h1>הוספת שובר</h1>
          <p>קופונינב · ממלאים מה שיודעים ושומרים. אפשר להשלים פרטים אחר כך.</p>
        </header>

        <form className="qa-card" onSubmit={submit}>
          {err && <div className="qa-err">{err}</div>}

          <div className="qa-form">
            <div className="qa-f">
              <label htmlFor="q-cat">קטגוריה <span style={{ color: '#B3243C' }}>*</span></label>
              <div className="qa-catrow">
                <span className={'qa-logo' + (cat ? '' : ' empty')}>
                  {cat
                    ? (cat.logo_url
                        ? <img src={cat.logo_url} alt="" />
                        : <span style={{
                            width: 22, height: 22, borderRadius: 6,
                            background: cat.color || '#666B73', display: 'block',
                          }} />)
                    : '?'}
                </span>
                <select id="q-cat" value={form.category_id} required
                        onChange={e => set('category_id', e.target.value)}
                        style={!form.category_id ? { borderColor: '#8A5A0E', color: '#44484F' } : undefined}>
                  <option value="">בחר קטגוריה…</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {!form.category_id && <span className="hint" style={{ color: '#8A5A0E', fontWeight: 700 }}>שדה חובה</span>}
            </div>

            <div className="qa-f">
              <label htmlFor="q-place">שם המקום</label>
              <input id="q-place" value={form.place} onChange={e => set('place', e.target.value)}
                     placeholder={cat?.name || ''} />
              <span className="hint">{cat?.place_label || 'שם המקום או הסניף'}</span>
            </div>

            <div className="qa-f full">
              <label htmlFor="q-item">מה השובר כולל</label>
              <input id="q-item" value={form.item} onChange={e => set('item', e.target.value)}
                     placeholder={cat?.item_example || 'ארוחה זוגית עם קינוח'} />
              <span className="hint">אפשר להשאיר ריק בשובר כספי רגיל</span>
            </div>

            <div className="qa-sep"><span>ערך ותוקף</span><i /></div>

            <div className="qa-f">
              <label htmlFor="q-amount">סכום השובר</label>
              <input id="q-amount" type="number" inputMode="decimal" value={form.amount}
                     onChange={e => set('amount', e.target.value)} placeholder="400" />
              <span className="hint">אפשר להשאיר ריק בשובר הטבה</span>
            </div>
            <div className="qa-f">
              <label htmlFor="q-paid">בכמה נקנה</label>
              <input id="q-paid" type="number" inputMode="decimal" value={form.paid}
                     onChange={e => set('paid', e.target.value)} placeholder="320" />
            </div>
            <div className="qa-f">
              <label htmlFor="q-seller">ממי נקנה</label>
              <input id="q-seller" value={form.seller} onChange={e => set('seller', e.target.value)}
                     placeholder="לאב, ועד עובדים, חברה…" />
            </div>
            <div className="qa-f">
              <label htmlFor="q-bought">תאריך קנייה</label>
              <input id="q-bought" type="date" value={form.bought_on} onChange={e => set('bought_on', e.target.value)} />
            </div>
            <div className="qa-f">
              <label htmlFor="q-exp">בתוקף עד</label>
              <input id="q-exp" type="date" value={form.expires_on} onChange={e => set('expires_on', e.target.value)} />
            </div>
            <div className="qa-f">
              <label htmlFor="q-note">הערות</label>
              <input id="q-note" value={form.note} onChange={e => set('note', e.target.value)}
                     placeholder="סניף אשקלון בלבד" />
            </div>

            <div className="qa-sep"><span>פרטי מימוש</span><i /></div>

            <div className="qa-f">
              <label htmlFor="q-code">מספר שובר</label>
              <input id="q-code" dir="ltr" value={form.code} onChange={e => set('code', e.target.value)}
                     placeholder="6032 9012 4471 8830" />
            </div>
            <div className="qa-f">
              <label htmlFor="q-cvv">CVV</label>
              <input id="q-cvv" dir="ltr" value={form.cvv} onChange={e => set('cvv', e.target.value)} placeholder="482" />
            </div>

            {shots.length > 0 && (
              <div className="qa-picks">
                {shots.map((s, i) => (
                  <div className="qa-pick" key={s.url}>
                    <img src={s.url} alt="תצוגה מקדימה" />
                    <button type="button" className="rm" aria-label="הסרת התמונה" onClick={() => dropShot(i)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                           strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6 6 18" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="qa-drop">
              <input type="file" accept="image/*" multiple onChange={pickFiles} />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                   style={{ color: 'var(--ink2)' }} aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" />
                <path d="m4 18 5-4 4 3 3-2 4 3" /></svg>
              <div style={{ marginTop: 8 }}>
                {shots.length ? 'הוספת עוד תמונות' : 'צילום של השובר או צילום מסך מוואטסאפ'}
              </div>
              <div className="hint" style={{ marginTop: 4 }}>אפשר לבחור כמה קבצים יחד</div>
            </label>
          </div>

          <button className="qa-btn dark" type="submit" disabled={busy}>
            {busy ? 'שומר…' : 'שמירת השובר'}
          </button>
        </form>
      </div>
    </div>
  )
}
