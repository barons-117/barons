import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import BaronsHeader from './BaronsHeader'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useFxRates } from '../lib/useFxRates'

// ─── Constants ────────────────────────────────────────────────────────────────

const ENTITY_META = {
  erez:           { label: 'ארז',          color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  roi:            { label: 'רועי',         color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  erez_roi:       { label: 'ארז ורועי',   color: '#818cf8', bg: 'rgba(129,140,248,0.15)' },
  reuven_private: { label: 'ראובן פרטי',  color: '#22c55e', bg: 'rgba(34,197,94,0.15)'  },
  reuven_company: { label: 'חברה',         color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  external:       { label: 'חיצוני',       color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
}

const TYPE_LABELS = {
  residential:        'מגורים',
  commercial:         'עסקי',
  real_estate_abroad: 'נדל"ן בחו"ל',
  equity:             'מניות/חברה',
  land:               'קרקע',
}

const STATUS_LABELS = { active: 'פעיל', sold: 'נמכר', archived: 'ארכיון' }

const FREQ_DIV  = { monthly: 1, quarterly: 3, 'semi-annual': 6, annual: 12 }
const FREQ_LABELS = { monthly: 'חודשי', quarterly: 'רבעוני', 'semi-annual': 'חצי שנתי', annual: 'שנתי' }
const VAT_LABELS  = { none: 'ללא מעמ', included: 'כולל מעמ', plus: '+ מעמ' }

const CURRENCIES = ['ILS','USD','EUR','HUF','GBP']
const ASSET_TYPES = ['residential','commercial','real_estate_abroad','equity','land']
const STATUSES    = ['active','sold','archived']
const ENTITIES    = ['erez','roi','erez_roi','reuven_private','reuven_company','external']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toILS(amount, currency, fx) {
  const rates = fx || { ILS:1, USD:3.72, EUR:4.05, HUF:0.0096, GBP:4.70 }
  return amount * (rates[currency] || 1)
}

function fmtILS(n) {
  if (!n) return '—'
  return '₪' + Math.round(n).toLocaleString('he-IL')
}

function fmtOrig(n, currency) {
  if (!n) return '—'
  const sym = { ILS:'₪', USD:'$', EUR:'€', HUF:'HUF ', GBP:'£' }[currency] || currency+' '
  return sym + Number(n).toLocaleString()
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('he-IL', { year:'numeric', month:'short', day:'numeric' })
}

function incomeMonthlyILS(inc, fx) {
  const net = inc.vat_type === 'included' ? inc.gross_amount / 1.18 : inc.gross_amount
  return toILS(net / (FREQ_DIV[inc.payment_frequency] || 1), inc.currency || 'ILS', fx)
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function SectionCard({ title, action, children, index = 0 }) {
  return (
    <div
      className="ad-section"
      style={{
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14, padding: '20px 22px', marginBottom: 16,
        animationDelay: `${Math.min(index * 50, 300)}ms`,
      }}
    >
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 16 }}>
        <span style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.7)', letterSpacing:'1px', textTransform:'uppercase' }}>
          {title}
        </span>
        {action}
      </div>
      {children}
    </div>
  )
}

function EditBtn({ onClick, hidden }) {
  if (hidden) return null
  return (
    <button onClick={onClick} className="ad-btn-ghost ad-press" style={{
      fontSize:11, padding:'4px 12px', borderRadius:8,
      border:'1px solid rgba(255,255,255,0.15)', background:'transparent',
      color:'rgba(255,255,255,0.68)', cursor:'pointer', fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif",
    }}>עריכה</button>
  )
}

function SaveBtn({ onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading} className="ad-btn-primary ad-press" style={{
      fontSize:12, padding:'5px 16px', borderRadius:8, border:'none',
      background:'#1d4ed8', color:'white', cursor:'pointer', fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif",
    }}>{loading ? '...' : 'שמור'}</button>
  )
}

function CancelBtn({ onClick }) {
  return (
    <button onClick={onClick} className="ad-btn-ghost ad-press" style={{
      fontSize:12, padding:'5px 12px', borderRadius:8,
      border:'1px solid rgba(255,255,255,0.15)', background:'transparent',
      color:'rgba(255,255,255,0.65)', cursor:'pointer', fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif",
    }}>ביטול</button>
  )
}

function Input({ value, onChange, placeholder, type='text', style={} }) {
  return (
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="ad-input"
      style={{
        background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)',
        borderRadius:8, padding:'8px 12px', fontSize:13, color:'white',
        fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif", outline:'none', width:'100%', boxSizing:'border-box',
        ...style,
      }}
    />
  )
}

function Select({ value, onChange, options, style={} }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      className="ad-input"
      style={{
        background:'#1a2744', border:'1px solid rgba(255,255,255,0.15)',
        borderRadius:8, padding:'8px 12px', fontSize:13, color:'white',
        fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif", outline:'none', ...style,
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function Textarea({ value, onChange, placeholder, rows=4 }) {
  return (
    <textarea value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      className="ad-input"
      style={{
        background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)',
        borderRadius:8, padding:'10px 12px', fontSize:13, color:'white',
        fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif", outline:'none', width:'100%',
        boxSizing:'border-box', resize:'vertical', lineHeight:1.6,
      }}
    />
  )
}

function Row({ label, value, muted }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
      padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize:12, color:'rgba(255,255,255,0.6)', minWidth:100 }}>{label}</span>
      <span style={{ fontSize:13, color: muted ? 'rgba(255,255,255,0.6)' : 'white', textAlign:'left', flex:1, marginRight:12 }}>{value || '—'}</span>
    </div>
  )
}

// ─── Pie chart (SVG) ──────────────────────────────────────────────────────────

function PieChart({ partners }) {
  const COLORS = ['#3b82f6','#22c55e','#f59e0b','#a78bfa','#38bdf8','#f87171','#94a3b8','#fb923c']
  const total = partners.reduce((s,p) => s + p.percentage, 0)
  if (total === 0) return null

  let angle = -Math.PI / 2
  const cx = 60, cy = 60, r = 55

  const slices = partners.map((p, i) => {
    const sweep = (p.percentage / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle)
    const y1 = cy + r * Math.sin(angle)
    angle += sweep
    const x2 = cx + r * Math.cos(angle)
    const y2 = cy + r * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    return { path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,
             color: COLORS[i % COLORS.length] }
  })

  return (
    <svg width={120} height={120} style={{ flexShrink:0 }}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} stroke='rgba(0,0,0,0.3)' strokeWidth={1} />
      ))}
    </svg>
  )
}

// ─── Google Maps embed ────────────────────────────────────────────────────────

function CoverImage({ asset, onSave }) {
  const [urls,      setUrls]      = useState([])   // [{path, url}]
  const [editing,   setEditing]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lightbox,  setLightbox]  = useState(null)

  // טעינת תמונות מהעמודות cover_image_path, cover_image_path2, cover_image_path3
  const PATHS = ['cover_image_path','cover_image_path2','cover_image_path3']

  useEffect(() => {
    async function load() {
      const loaded = []
      for (const key of PATHS) {
        const path = asset[key]
        if (!path) continue
        const { data } = await supabase.storage.from('assets').createSignedUrl(path, 3600)
        if (data?.signedUrl) loaded.push({ key, path, url: data.signedUrl })
      }
      setUrls(loaded)
    }
    load()
  }, [asset.cover_image_path, asset.cover_image_path2, asset.cover_image_path3])

  async function handleUpload(file) {
    if (!file) return
    const filled = PATHS.filter(k => asset[k])
    if (filled.length >= 3) return
    const nextKey = PATHS.find(k => !asset[k])
    setUploading(true)
    const ext  = file.name.split('.').pop().toLowerCase()
    const path = asset.id + '/cover_' + nextKey + '_' + Date.now() + '.' + ext
    const { error } = await supabase.storage.from('assets').upload(path, file)
    if (!error) {
      await supabase.from('assets').update({ [nextKey]: path }).eq('id', asset.id)
      const { data } = await supabase.storage.from('assets').createSignedUrl(path, 3600)
      if (data?.signedUrl) setUrls(u => [...u, { key: nextKey, path, url: data.signedUrl }])
      onSave({ [nextKey]: path })
    }
    setUploading(false)
  }

  async function removeImage(item) {
    await supabase.storage.from('assets').remove([item.path])
    await supabase.from('assets').update({ [item.key]: null }).eq('id', asset.id)
    setUrls(u => u.filter(x => x.key !== item.key))
    onSave({ [item.key]: null })
  }

  const canAdd = urls.length < 3

  // מצב תצוגה רגיל
  if (!editing) return (
    <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
      {urls.length === 0 ? (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:80, height:64, borderRadius:8, flexShrink:0,
            background:'rgba(255,255,255,0.06)', border:'1px dashed rgba(255,255,255,0.1)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
          }}>🏠</div>
          <button onClick={() => setEditing(true)} className="ad-btn-ghost ad-press" style={Cs.editSmall}>+ תמונת נכס</button>
        </div>
      ) : (
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {urls.map((item, i) => (
            <div
              key={item.key}
              onClick={() => setLightbox(item.url)}
              className="ad-thumb ad-press"
              style={{
                width:90, height:70, borderRadius:8, overflow:'hidden', flexShrink:0,
                cursor:'pointer', border:'1px solid rgba(255,255,255,0.08)',
              }}
            >
              <img src={item.url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" />
            </div>
          ))}
          <button onClick={() => setEditing(true)} className="ad-btn-ghost ad-press" style={Cs.editSmall}>עריכה</button>
        </div>
      )}
      {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )

  // מצב עריכה
  return (
    <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
        {urls.map(item => (
          <div key={item.key} style={{ position:'relative' }}>
            <img src={item.url} style={{
              width:90, height:70, objectFit:'cover', borderRadius:8,
              border:'1px solid rgba(255,255,255,0.12)', display:'block',
            }} alt="" />
            <button
              onClick={() => removeImage(item)}
              className="ad-press"
              style={{
                position:'absolute', top:3, left:3, width:20, height:20,
                background:'rgba(0,0,0,0.7)', border:'none', borderRadius:'50%',
                color:'#f87171', cursor:'pointer', fontSize:13, lineHeight:1,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}
            >×</button>
          </div>
        ))}
        {canAdd && (
          <label className="ad-upload-tile ad-press" style={{
            width:90, height:70, borderRadius:8, flexShrink:0,
            border:'1.5px dashed rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.03)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            cursor: uploading ? 'default' : 'pointer', gap:4,
          }}>
            <span style={{ fontSize:20, opacity:0.4 }}>+</span>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.55)' }}>
              {uploading ? 'מעלה...' : `${urls.length}/3`}
            </span>
            <input type="file" accept=".jpg,.jpeg,.png,.webp" disabled={uploading}
              style={{ display:'none' }} onChange={e => handleUpload(e.target.files[0])} />
          </label>
        )}
      </div>
      <button onClick={() => setEditing(false)} className="ad-btn-ghost ad-press" style={Cs.editSmall}>סיום עריכה</button>
    </div>
  )
}

const Cs = {
  editSmall: {
    fontSize:11, padding:'4px 12px', borderRadius:8,
    border:'1px solid rgba(255,255,255,0.15)', background:'transparent',
    color:'rgba(255,255,255,0.68)', cursor:'pointer', fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif",
  }
}


function MapEmbed({ asset }) {
  const addr = [asset.address_street, asset.address_city, asset.address_country]
    .filter(Boolean).join(', ')
  if (!addr || asset.asset_type === 'equity') return null

  const query = encodeURIComponent(addr)
  const src = `https://maps.google.com/maps?q=${query}&output=embed&z=15`

  return (
    <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)', marginTop:12 }}>
      <iframe
        title="map"
        src={src}
        width="100%" height="220"
        style={{ border:0, display:'block' }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}

// ─── Section: General Info ────────────────────────────────────────────────────

function GeneralSection({ asset: assetProp, onSave, readOnly, index = 0 }) {
  const [asset,   setAssetLocal] = useState(assetProp)
  const [editing, setEditing]    = useState(false)
  const [form,    setForm]       = useState({})
  const [saving,  setSaving]     = useState(false)

  useEffect(() => { setAssetLocal(assetProp) }, [assetProp?.id])

  function startEdit() {
    setForm({
      name: asset.name,
      address_street: asset.address_street,
      address_city: asset.address_city,
      address_country: asset.address_country,
      asset_type: asset.asset_type,
      gush: asset.gush,
      helka: asset.helka,
      status: asset.status,
      description: asset.description,
      estimated_value: asset.estimated_value,
      estimated_value_currency: asset.estimated_value_currency || 'ILS',
    })
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('assets').update(form).eq('id', asset.id)
    setSaving(false)
    if (!error) {
      setAssetLocal(a => ({ ...a, ...form }))
      onSave(form)
      setEditing(false)
    }
  }

  if (editing) return (
    <SectionCard index={index} title="מידע כללי" action={
      <div style={{ display:'flex', gap:8 }}>
        <CancelBtn onClick={() => setEditing(false)} />
        <SaveBtn onClick={save} loading={saving} />
      </div>
    }>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={L.label}>שם הנכס</label>
          <Input value={form.name} onChange={v => setForm(f=>({...f, name:v}))} />
        </div>
        <div>
          <label style={L.label}>רחוב</label>
          <Input value={form.address_street} onChange={v => setForm(f=>({...f, address_street:v}))} />
        </div>
        <div>
          <label style={L.label}>עיר</label>
          <Input value={form.address_city} onChange={v => setForm(f=>({...f, address_city:v}))} />
        </div>
        <div>
          <label style={L.label}>מדינה</label>
          <Input value={form.address_country} onChange={v => setForm(f=>({...f, address_country:v}))} />
        </div>
        <div>
          <label style={L.label}>סוג</label>
          <Select value={form.asset_type} onChange={v => setForm(f=>({...f, asset_type:v}))}
            options={ASSET_TYPES.map(t => ({ value:t, label:TYPE_LABELS[t] }))} />
        </div>
        <div>
          <label style={L.label}>גוש</label>
          <Input value={form.gush} onChange={v => setForm(f=>({...f, gush:v}))} />
        </div>
        <div>
          <label style={L.label}>חלקה</label>
          <Input value={form.helka} onChange={v => setForm(f=>({...f, helka:v}))} />
        </div>
        <div>
          <label style={L.label}>סטטוס</label>
          <Select value={form.status} onChange={v => setForm(f=>({...f, status:v}))}
            options={STATUSES.map(s => ({ value:s, label:STATUS_LABELS[s] }))} />
        </div>
        <div>
          <label style={L.label}>שווי מוערך</label>
          <Input type="number" value={form.estimated_value} onChange={v => setForm(f=>({...f, estimated_value:v}))} />
        </div>
        <div>
          <label style={L.label}>מטבע שווי</label>
          <Select value={form.estimated_value_currency} onChange={v => setForm(f=>({...f, estimated_value_currency:v}))}
            options={CURRENCIES.map(c => ({ value:c, label:c }))} />
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={L.label}>תיאור / נרטיב</label>
          <Textarea value={form.description} onChange={v => setForm(f=>({...f, description:v}))} rows={5} />
        </div>
      </div>
    </SectionCard>
  )

  return (
    <SectionCard index={index} title="מידע כללי" action={<EditBtn onClick={startEdit} hidden={readOnly} />}>
      <Row label="סוג"    value={TYPE_LABELS[asset.asset_type]} />
      <Row label="כתובת"  value={[asset.address_street, asset.address_city, asset.address_country].filter(Boolean).join(', ')} />
      <Row label="גוש/חלקה" value={[asset.gush, asset.helka].filter(Boolean).join(' / ')} />
      <Row label="סטטוס"  value={STATUS_LABELS[asset.status]} />
      <Row label="שווי" value={
        asset.estimated_value
          ? fmtOrig(asset.estimated_value, asset.estimated_value_currency || 'ILS')
          : asset._totalPurchasesILS && asset._myPct > 0
            ? `~${fmtILS(asset._totalPurchasesILS / asset._myPct)} (משוער מהשקעה)`
            : '—'
      } />
      {asset.description && (
        <div style={{ marginTop:14, fontSize:13, color:'rgba(255,255,255,0.7)', lineHeight:1.7,
          borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:14, whiteSpace:'pre-wrap' }}>
          {asset.description}
        </div>
      )}
      <CoverImage asset={asset} onSave={onSave} />
      <MapEmbed asset={asset} />
    </SectionCard>
  )
}

// ─── Section: Partners ────────────────────────────────────────────────────────

function PartnersSection({ assetId, partners, onSave, readOnly, index = 0 }) {
  const [editing, setEditing] = useState(false)
  const [rows, setRows]       = useState([])
  const [saving, setSaving]   = useState(false)

  const COLORS = ['#3b82f6','#22c55e','#f59e0b','#a78bfa','#38bdf8','#f87171','#94a3b8','#fb923c']

  function startEdit() {
    setRows(partners.map(p => ({ ...p, pct: Math.round(p.percentage * 10000) / 100 })))
    setEditing(true)
  }

  function addRow() {
    setRows(r => [...r, { id: null, asset_id: assetId, entity:'external', name:'', percentage:0, pct:'', notes:'' }])
  }

  async function save() {
    setSaving(true)
    await supabase.from('asset_partners').delete().eq('asset_id', assetId)
    const toInsert = rows.filter(r => parseFloat(r.pct) > 0).map(({ id, pct, ...r }) => ({
      ...r, asset_id: assetId, percentage: parseFloat(pct) / 100,
    }))
    if (toInsert.length > 0) {
      const { error } = await supabase.from('asset_partners').insert(toInsert)
      if (error) { console.error(error); setSaving(false); return }
    }
    setSaving(false)
    onSave()
    setEditing(false)
  }

  const total = partners.reduce((s,p) => s + p.percentage, 0)

  // סה"כ אחוזים בזמן עריכה
  const editTotal = rows.reduce((s,r) => s + (parseFloat(r.pct) || 0), 0)
  const totalOk   = Math.abs(editTotal - 100) < 0.5

  if (editing) return (
    <SectionCard index={index} title="שותפים" action={
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <span style={{ fontSize:12, fontWeight:700, color: totalOk ? '#22c55e' : '#f59e0b' }}>
          {Math.round(editTotal)}%
        </span>
        <CancelBtn onClick={() => setEditing(false)} />
        <SaveBtn onClick={save} loading={saving} />
      </div>
    }>
      {/* כותרות עמודות */}
      <div style={{ display:'grid', gridTemplateColumns:'160px 1fr 72px 1fr 24px', gap:8, marginBottom:6 }}>
        <span style={{ fontSize:10, color:'rgba(255,255,255,0.55)' }}>ישות</span>
        <span style={{ fontSize:10, color:'rgba(255,255,255,0.55)' }}>שם (לחיצוני)</span>
        <span style={{ fontSize:10, color:'rgba(255,255,255,0.55)' }}>אחוז</span>
        <span style={{ fontSize:10, color:'rgba(255,255,255,0.55)' }}>הערה</span>
        <span />
      </div>
      {rows.map((row, i) => {
        const meta = ENTITY_META[row.entity] || ENTITY_META.external
        return (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'160px 1fr 72px 1fr 24px', gap:8, marginBottom:8, alignItems:'center' }}>
            {/* ישות — Select עם תג צבעוני */}
            <div style={{ position:'relative' }}>
              <select
                value={row.entity}
                onChange={e => setRows(r => r.map((x,j) => j===i ? {...x, entity:e.target.value, name: e.target.value !== 'external' ? '' : x.name} : x))}
                style={{
                  width:'100%', background: meta.bg, border:`1px solid ${meta.color}55`,
                  borderRadius:8, padding:'7px 10px', fontSize:12, color: meta.color,
                  fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif", outline:'none', fontWeight:700, cursor:'pointer',
                }}
              >
                {ENTITIES.map(e => (
                  <option key={e} value={e} style={{ background:'#1a2744', color:'white', fontWeight:400 }}>
                    {ENTITY_META[e]?.label || e}
                  </option>
                ))}
              </select>
            </div>
            <Input
              value={row.entity === 'external' ? row.name : ''}
              onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, name:v} : x))}
              placeholder={row.entity === 'external' ? 'שם השותף' : ENTITY_META[row.entity]?.label}
              style={{ opacity: row.entity === 'external' ? 1 : 0.35 }}
            />
            <div style={{ position:'relative' }}>
              <input
                type="number" min="0" max="100" step="0.1"
                value={row.pct ?? ''}
                placeholder="0"
                onChange={e => setRows(r => r.map((x,j) => j===i ? {...x, pct: e.target.value} : x))}
                style={{
                  width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)',
                  borderRadius:8, padding:'7px 22px 7px 8px', fontSize:13, color:'white',
                  fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif", outline:'none', boxSizing:'border-box',
                }}
              />
              <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'rgba(255,255,255,0.55)' }}>%</span>
            </div>
            <Input value={row.notes} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, notes:v} : x))}
              placeholder="הערה" />
            <button onClick={() => setRows(r => r.filter((_,j) => j!==i))}
              className="ad-x ad-press"
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, padding:0, lineHeight:1 }}
            >×</button>
          </div>
        )
      })}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
        <button onClick={addRow} className="ad-text-btn ad-press"
          style={{ fontSize:12, color:'#60a5fa', background:'none', border:'none', cursor:'pointer', fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif", padding:0 }}>
          + הוסף שותף
        </button>
        {!totalOk && editTotal > 0 && (
          <span style={{ fontSize:11, color:'#f59e0b' }}>
            {editTotal < 100 ? `חסר ${(100-editTotal).toFixed(1)}%` : `עודף ${(editTotal-100).toFixed(1)}%`}
          </span>
        )}
      </div>
    </SectionCard>
  )

  return (
    <SectionCard index={index} title="שותפים" action={<EditBtn onClick={startEdit} hidden={readOnly} />}>
      <div style={{ display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
        <PieChart partners={partners} />
        <div style={{ flex:1, minWidth:180 }}>
          {partners.map((p, i) => {
            const m = ENTITY_META[p.entity] || ENTITY_META.external
            const label = p.entity === 'external' ? (p.name || 'חיצוני') : m.label
            return (
              <div key={p.id || i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background: COLORS[i % COLORS.length], flexShrink:0 }} />
                <span style={{ fontSize:13, color:'white', flex:1 }}>{label}</span>
                <span style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.7)' }}>
                  {(p.percentage * 100).toFixed(2)}%
                </span>
              </div>
            )
          })}
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', marginTop:8, paddingTop:8,
            fontSize:12, color:'rgba(255,255,255,0.55)', display:'flex', justifyContent:'space-between' }}>
            <span>סה"כ</span>
            <span>{(total * 100).toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}


// ─── TenantRow — שוכר פעיל ────────────────────────────────────────────────────

// צבעים לכל ישות
const ENTITY_COLORS = {
  erez:           '#3b82f6',
  roi:            '#a78bfa',
  erez_roi:       '#818cf8',
  reuven_private: '#22c55e',
  reuven_company: '#f59e0b',
}

function TenantRow({ inc, partners, fx }) {
  const names   = [inc.tenant_name, inc.tenant_name2].filter(Boolean).join(' + ')
  const monthly = incomeMonthlyILS(inc, fx)

  // חלק כל ישות פנימית
  const internalShares = partners
    .filter(p => ['erez','roi','erez_roi','reuven_private','reuven_company'].includes(p.entity))
    .filter(p => p.percentage > 0)
    .map(p => ({
      entity: p.entity,
      label:  ENTITY_META[p.entity]?.label || p.entity,
      color:  ENTITY_COLORS[p.entity] || '#94a3b8',
      amount: (() => {
        if (inc.split_by_ownership) return monthly * p.percentage
        const split = (inc.splits || []).find(s => s.entity === p.entity)
        return split ? monthly * (split.percentage || 0) : 0
      })(),
    }))
    .filter(s => s.amount > 0)

  const totalPct = partners
    .filter(p => ['erez','roi','erez_roi','reuven_private','reuven_company'].includes(p.entity))
    .reduce((s,p) => s + p.percentage, 0)
  const isPartial = totalPct > 0 && totalPct < 1

  return (
    <div style={{ padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
        <div>
          <span style={{ fontSize:14, fontWeight:700, color:'white' }}>{names}</span>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginTop:2 }}>
            {[inc.tenant_phone, inc.tenant_email].filter(Boolean).join(' · ')}
          </div>
          {(inc.tenant_phone2 || inc.tenant_email2) && (
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:1 }}>
              {inc.tenant_name2 && <span style={{ color:'rgba(255,255,255,0.48)', marginLeft:4 }}>{inc.tenant_name2}:</span>}
              {[inc.tenant_phone2, inc.tenant_email2].filter(Boolean).join(' · ')}
            </div>
          )}
          {inc.start_date && (
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.52)', marginTop:1 }}>
              מ-{fmtDate(inc.start_date)}
            </div>
          )}
        </div>
        <div style={{ textAlign:'left', minWidth:180 }}>
          {/* סכום כולל */}
          <div style={{ fontSize:15, fontWeight:700, color:'white', marginBottom:2 }}>
            {fmtOrig(inc.gross_amount, inc.currency)}
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.65)', fontWeight:400, marginRight:4 }}>
              {VAT_LABELS[inc.vat_type]} · {FREQ_LABELS[inc.payment_frequency]}
            </span>
          </div>
          {inc.currency !== 'ILS' && (
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', textAlign:'left', marginBottom:2 }}>
              ≈ {fmtILS(monthly)}/חודש
            </div>
          )}
          {/* חלקי הישויות הפנימיות */}
          {isPartial && internalShares.map(s => (
            <div key={s.entity} style={{ fontSize:11, color: s.color, textAlign:'left', marginTop:1 }}>
              {s.label}: {fmtILS(s.amount)}/חודש
            </div>
          ))}
        </div>
      </div>
      {(inc.contract_end_date || inc.notes) && (
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:4 }}>
          {inc.contract_end_date && 'חוזה עד: ' + fmtDate(inc.contract_end_date)}
          {inc.contract_end_date && inc.notes && ' · '}
          {inc.notes}
        </div>
      )}
    </div>
  )
}

// ─── VacatedTenants — שוכרים שעזבו ───────────────────────────────────────────

function VacatedTenants({ income }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(null)

  return (
    <div style={{ marginTop:8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background:'none', border:'none', cursor:'pointer',
          fontSize:12, color:'rgba(255,255,255,0.55)', fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif",
          display:'flex', alignItems:'center', gap:6, padding:0,
        }}
      >
        <span style={{ fontSize:10 }}>{open ? '▲' : '▼'}</span>
        {income.length} שוכר{income.length > 1 ? 'ים' : ''} שעזב{income.length > 1 ? 'ו' : ''}
      </button>

      {open && (
        <div style={{ marginTop:8, paddingRight:12, borderRight:'2px solid rgba(255,255,255,0.06)' }}>
          {income.map((inc, i) => {
            const names = [inc.tenant_name, inc.tenant_name2].filter(Boolean).join(' + ')
            const isExp = expanded === i
            return (
              <div key={inc.id || i} style={{ marginBottom:6 }}>
                <button
                  onClick={() => setExpanded(isExp ? null : i)}
                  style={{
                    background:'none', border:'none', cursor:'pointer',
                    fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif", padding:0, textAlign:'right', width:'100%',
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                  }}
                >
                  <span style={{ fontSize:13, color:'rgba(255,255,255,0.68)', fontWeight:600 }}>{names}</span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.52)' }}>
                    {inc.vacated_date ? `עזב ${fmtDate(inc.vacated_date)}` : 'לא פעיל'}
                    <span style={{ marginRight:6 }}>{isExp ? '▲' : '▼'}</span>
                  </span>
                </button>
                {isExp && (
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginTop:6, lineHeight:1.8 }}>
                    {inc.tenant_phone && <div>📞 {inc.tenant_phone}{inc.tenant_email ? ` · ${inc.tenant_email}` : ''}</div>}
                    {inc.tenant_name2 && (inc.tenant_phone2 || inc.tenant_email2) && (
                      <div>📞 {inc.tenant_name2}: {[inc.tenant_phone2, inc.tenant_email2].filter(Boolean).join(' · ')}</div>
                    )}
                    {inc.start_date && <div>כניסה: {fmtDate(inc.start_date)}</div>}
                    {inc.contract_end_date && <div>חוזה עד: {fmtDate(inc.contract_end_date)}</div>}
                    <div>{fmtOrig(inc.gross_amount, inc.currency)} · {VAT_LABELS[inc.vat_type]} · {FREQ_LABELS[inc.payment_frequency]}</div>
                    {inc.notes && <div>{inc.notes}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Section: Income ──────────────────────────────────────────────────────────

function IncomeSection({ assetId, income, partners, fx, onSave, readOnly, index = 0 }) {
  const [editing, setEditing] = useState(false)
  const [rows, setRows]       = useState([])
  const [saving, setSaving]   = useState(false)

  function startEdit() {
    setRows(income.map(i => ({ ...i })))
    setEditing(true)
  }

  function addRow() {
    setRows(r => [...r, {
      id: null, asset_id: assetId,
      tenant_name:'', tenant_name2:'',
      tenant_phone:'', tenant_email:'',
      tenant_phone2:'', tenant_email2:'',
      gross_amount:0, vat_type:'none', currency:'ILS',
      payment_frequency:'monthly', start_date:'', contract_end_date:'',
      vacated_date:'', split_by_ownership: true, is_active: true, notes:'',
    }])
  }

  async function save() {
    setSaving(true)
    await supabase.from('asset_income').delete().eq('asset_id', assetId)
    // מסנן רק עמודות שקיימות ב-DB
    const ALLOWED = [
      'asset_id','tenant_name','tenant_name2',
      'tenant_phone','tenant_email','tenant_phone2','tenant_email2',
      'gross_amount','vat_type','currency','payment_frequency',
      'start_date','contract_end_date','vacated_date',
      'split_by_ownership','is_active','notes',
    ]
    const toInsert = rows.map(({ id, splits, ...r }) => {
      const row = { asset_id: assetId }
      ALLOWED.forEach(k => { if (k in r) row[k] = r[k] || null })
      row.asset_id = assetId
      return row
    })
    if (toInsert.length > 0) {
      const { error } = await supabase.from('asset_income').insert(toInsert)
      if (error) { console.error('income insert error:', error); setSaving(false); return }
    }
    setSaving(false)
    onSave()
    setEditing(false)
  }

  const totalMonthly = income.filter(i => i.is_active).reduce((s,i) => s + incomeMonthlyILS(i, fx), 0)

  // אחוז "שלנו" — ארז + רועי + ארז_רועי
  const ourPct = partners.reduce((s,p) => {
    if (['erez','roi','erez_roi'].includes(p.entity)) return s + p.percentage
    return s
  }, 0)
  const ourMonthly = income.filter(i => i.is_active).reduce((s,i) => s + incomeMonthlyILS(i, fx) * ourPct, 0)

  if (editing) return (
    <SectionCard index={index} title="הכנסות ושוכרים" action={
      <div style={{ display:'flex', gap:8 }}>
        <CancelBtn onClick={() => setEditing(false)} />
        <SaveBtn onClick={save} loading={saving} />
      </div>
    }>
      {rows.map((row, i) => (
        <div key={i} style={{ background:'rgba(255,255,255,0.03)', borderRadius:10, padding:'14px', marginBottom:12, border:'1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
            <div><label style={L.label}>שם שוכר (ראשי)</label>
              <Input value={row.tenant_name} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, tenant_name:v} : x))} /></div>
            <div><label style={L.label}>שם נוסף (בן/בת זוג)</label>
              <Input value={row.tenant_name2 || ''} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, tenant_name2:v} : x))} placeholder="אופציונלי" /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
            <div><label style={L.label}>טלפון (ראשי)</label>
              <Input value={row.tenant_phone || ''} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, tenant_phone:v} : x))} /></div>
            <div><label style={L.label}>מייל (ראשי)</label>
              <Input value={row.tenant_email || ''} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, tenant_email:v} : x))} /></div>
            <div><label style={L.label}>תאריך עזיבה</label>
              <Input type="date" value={row.vacated_date || ''} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, vacated_date:v, is_active: v ? false : x.is_active} : x))} /></div>
          </div>
          {row.tenant_name2 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              <div><label style={L.label}>טלפון ({row.tenant_name2})</label>
                <Input value={row.tenant_phone2 || ''} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, tenant_phone2:v} : x))} /></div>
              <div><label style={L.label}>מייל ({row.tenant_name2})</label>
                <Input value={row.tenant_email2 || ''} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, tenant_email2:v} : x))} /></div>
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'120px 100px 1fr 1fr', gap:8, marginBottom:8 }}>
            <div><label style={L.label}>סכום גולמי</label>
              <Input type="number" value={row.gross_amount} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, gross_amount:v} : x))} /></div>
            <div><label style={L.label}>מטבע</label>
              <Select value={row.currency} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, currency:v} : x))}
                options={CURRENCIES.map(c => ({ value:c, label:c }))} /></div>
            <div><label style={L.label}>מעמ</label>
              <Select value={row.vat_type} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, vat_type:v} : x))}
                options={[{value:'none',label:'ללא מעמ'},{value:'included',label:'כולל מעמ'},{value:'plus',label:'+ מעמ'}]} /></div>
            <div><label style={L.label}>תדירות</label>
              <Select value={row.payment_frequency} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, payment_frequency:v} : x))}
                options={Object.entries(FREQ_LABELS).map(([v,l]) => ({ value:v, label:l }))} /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
            <div><label style={L.label}>תחילת חוזה</label>
              <Input type="date" value={row.start_date} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, start_date:v} : x))} /></div>
            <div><label style={L.label}>סיום חוזה</label>
              <Input type="date" value={row.contract_end_date} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, contract_end_date:v} : x))} /></div>
            <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end', paddingBottom:2 }}>
              <label style={{ ...L.label, display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                <input type="checkbox" checked={row.is_active}
                  onChange={e => setRows(r => r.map((x,j) => j===i ? {...x, is_active:e.target.checked} : x))} />
                פעיל
              </label>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ flex:1, marginLeft:12 }}>
              <label style={L.label}>הערות</label>
              <Input value={row.notes} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, notes:v} : x))} />
            </div>
            <button onClick={() => setRows(r => r.filter((_,j) => j!==i))}
              className="ad-x-red ad-press"
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, marginTop:16 }}>×</button>
          </div>
        </div>
      ))}
      <button onClick={addRow} className="ad-text-btn ad-press"
          style={{ fontSize:12, color:'#60a5fa', background:'none', border:'none', cursor:'pointer', fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif", padding:0 }}>
        + הוסף שוכר
      </button>
    </SectionCard>
  )

  return (
    <SectionCard index={index} title="הכנסות ושוכרים" action={<EditBtn onClick={startEdit} hidden={readOnly} />}>
      {income.length === 0 && <div style={{ color:'rgba(255,255,255,0.52)', fontSize:13 }}>אין הכנסות רשומות</div>}
      {/* שוכרים פעילים */}
      {income.filter(i => i.is_active).map((inc, i) => (
        <TenantRow key={inc.id || i} inc={inc} partners={partners} fx={fx} />
      ))}
      {/* שוכרים שעזבו — מקופלים */}
      {income.filter(i => !i.is_active).length > 0 && (
        <VacatedTenants income={income.filter(i => !i.is_active)} />
      )}
      {income.length > 0 && (
        <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.6)' }}>סה"כ מהנכס</span>
            <span style={{ fontSize:15, fontWeight:700, color:'rgba(255,255,255,0.6)' }}>{fmtILS(totalMonthly)}</span>
          </div>
          {/* חלקי הישויות הפנימיות בסיכום */}
          {partners.filter(p => ['erez','roi','erez_roi','reuven_private','reuven_company'].includes(p.entity) && p.percentage > 0).map(p => {
            const entityTotal = income.filter(i => i.is_active).reduce((s,i) => s + incomeMonthlyILS(i, fx) * p.percentage, 0)
            if (entityTotal === 0) return null
            return (
              <div key={p.entity} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                <span style={{ fontSize:12, color: ENTITY_COLORS[p.entity] || '#94a3b8' }}>
                  {ENTITY_META[p.entity]?.label} ({(p.percentage*100).toFixed(2)}%)
                </span>
                <span style={{ fontSize:14, fontWeight:700, color:'white' }}>{fmtILS(entityTotal)}</span>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Section: Purchases ───────────────────────────────────────────────────────

function PurchasesSection({ assetId, purchases, onSave, readOnly, index = 0 }) {
  const [editing, setEditing] = useState(false)
  const [rows, setRows]       = useState([])
  const [saving, setSaving]   = useState(false)

  function startEdit() {
    setRows(purchases.map(p => ({ ...p })))
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    await supabase.from('asset_purchases').delete().eq('asset_id', assetId)
    const toInsert = rows.map(({ id, ...r }) => ({ ...r, asset_id: assetId }))
    const { error } = await supabase.from('asset_purchases').insert(toInsert)
    setSaving(false)
    if (!error) { onSave(); setEditing(false) }
  }

  if (editing) return (
    <SectionCard index={index} title="היסטוריית רכישה" action={
      <div style={{ display:'flex', gap:8 }}>
        <CancelBtn onClick={() => setEditing(false)} />
        <SaveBtn onClick={save} loading={saving} />
      </div>
    }>
      {rows.map((row, i) => (
        <div key={i} style={{ display:'grid', gridTemplateColumns:'130px 130px 80px 1fr 1fr 24px', gap:8, marginBottom:8, alignItems:'center' }}>
          <Input type="date" value={row.purchase_date} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, purchase_date:v} : x))} />
          <Input type="number" value={row.amount} placeholder="סכום" onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, amount:v} : x))} />
          <Select value={row.currency} onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, currency:v} : x))}
            options={CURRENCIES.map(c => ({ value:c, label:c }))} />
          <Input value={row.from_whom} placeholder="ממי" onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, from_whom:v} : x))} />
          <Input value={row.notes} placeholder="הערות" onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, notes:v} : x))} />
          <button onClick={() => setRows(r => r.filter((_,j) => j!==i))}
            className="ad-x-red ad-press"
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, padding:0 }}>×</button>
        </div>
      ))}
      <button onClick={() => setRows(r => [...r, { id:null, purchase_date:'', amount:'', currency:'ILS', from_whom:'', notes:'' }])}
        className="ad-text-btn ad-press"
        style={{ fontSize:12, color:'#60a5fa', background:'none', border:'none', cursor:'pointer', fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif", padding:0, marginTop:4 }}>
        + הוסף רכישה
      </button>
    </SectionCard>
  )

  return (
    <SectionCard index={index} title="היסטוריית רכישה" action={<EditBtn onClick={startEdit} hidden={readOnly} />}>
      {purchases.length === 0 && <div style={{ color:'rgba(255,255,255,0.52)', fontSize:13 }}>אין נתוני רכישה</div>}
      {purchases.map((p, i) => (
        <div key={p.id || i} style={{ padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <div>
              <span style={{ fontSize:13, color:'white', fontWeight:600 }}>{fmtOrig(p.amount, p.currency || 'ILS')}</span>
              {p.from_whom && <span style={{ fontSize:12, color:'rgba(255,255,255,0.65)', marginRight:8 }}>מ: {p.from_whom}</span>}
            </div>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.6)' }}>{fmtDate(p.purchase_date)}</span>
          </div>
          {p.notes && <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:3 }}>{p.notes}</div>}
        </div>
      ))}
    </SectionCard>
  )
}

// ─── Section: Events ──────────────────────────────────────────────────────────

function EventsSection({ assetId, events, onSave, readOnly, index = 0 }) {
  const [newText, setNewText] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [adding, setAdding]   = useState(false)
  const [saving, setSaving]   = useState(false)

  async function addEvent() {
    if (!newText.trim()) return
    setSaving(true)
    const { error } = await supabase.from('asset_events').insert({
      asset_id: assetId, event_date: newDate, description: newText.trim()
    })
    setSaving(false)
    if (!error) { setNewText(''); onSave(); setAdding(false) }
  }

  async function deleteEvent(id) {
    await supabase.from('asset_events').delete().eq('id', id)
    onSave()
  }

  const sorted = [...events].sort((a,b) => new Date(b.event_date) - new Date(a.event_date))

  return (
    <SectionCard index={index} title="לוג אירועים" action={
      <button onClick={() => setAdding(a => !a)} className="ad-btn-ghost ad-press" style={{
        fontSize:11, padding:'4px 12px', borderRadius:8,
        border:'1px solid rgba(255,255,255,0.15)', background:'transparent',
        color:'rgba(255,255,255,0.68)', cursor:'pointer', fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif",
      }}>+ עדכון</button>
    }>
      {adding && (
        <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:10, padding:14, marginBottom:14 }}>
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <Input type="date" value={newDate} onChange={setNewDate} style={{ width:160 }} />
          </div>
          <Textarea value={newText} onChange={setNewText} placeholder="תיאור האירוע..." rows={3} />
          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            <SaveBtn onClick={addEvent} loading={saving} />
            <CancelBtn onClick={() => setAdding(false)} />
          </div>
        </div>
      )}
      {sorted.length === 0 && <div style={{ color:'rgba(255,255,255,0.52)', fontSize:13 }}>אין אירועים רשומים</div>}
      {sorted.map((ev, i) => (
        <div key={ev.id || i} style={{ display:'flex', gap:14, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', alignItems:'flex-start' }}>
          <div style={{ minWidth:80, fontSize:11, color:'rgba(255,255,255,0.55)', paddingTop:2 }}>{fmtDate(ev.event_date)}</div>
          <div style={{ flex:1, fontSize:13, color:'rgba(255,255,255,0.8)', lineHeight:1.6 }}>{ev.description}</div>
          <button onClick={() => deleteEvent(ev.id)}
            className="ad-x-subtle ad-press"
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, padding:0, flexShrink:0 }}
          >×</button>
        </div>
      ))}
    </SectionCard>
  )
}

// ─── Section: Contacts ────────────────────────────────────────────────────────

function ContactsSection({ assetId, contacts, onSave, readOnly, index = 0 }) {
  const [editing, setEditing] = useState(false)
  const [rows, setRows]       = useState([])
  const [saving, setSaving]   = useState(false)

  function startEdit() {
    setRows(contacts.map(c => ({ ...c })))
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    await supabase.from('contacts').delete().eq('asset_id', assetId)
    const toInsert = rows.map(({ id, ...r }) => ({ ...r, asset_id: assetId }))
    if (toInsert.length > 0) await supabase.from('contacts').insert(toInsert)
    setSaving(false)
    onSave(); setEditing(false)
  }

  if (editing) return (
    <SectionCard index={index} title="אנשי קשר" action={
      <div style={{ display:'flex', gap:8 }}>
        <CancelBtn onClick={() => setEditing(false)} />
        <SaveBtn onClick={save} loading={saving} />
      </div>
    }>
      {rows.map((row, i) => (
        <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 24px', gap:8, marginBottom:8, alignItems:'center' }}>
          <Input value={row.name} placeholder="שם" onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, name:v} : x))} />
          <Input value={row.role} placeholder="תפקיד" onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, role:v} : x))} />
          <Input value={row.phone} placeholder="טלפון" onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, phone:v} : x))} />
          <Input value={row.email} placeholder="מייל" onChange={v => setRows(r => r.map((x,j) => j===i ? {...x, email:v} : x))} />
          <button onClick={() => setRows(r => r.filter((_,j) => j!==i))}
            className="ad-x-red ad-press"
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, padding:0 }}>×</button>
        </div>
      ))}
      <button onClick={() => setRows(r => [...r, { id:null, name:'', role:'', phone:'', email:'', notes:'' }])}
        className="ad-text-btn ad-press"
        style={{ fontSize:12, color:'#60a5fa', background:'none', border:'none', cursor:'pointer', fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif", padding:0, marginTop:4 }}>
        + הוסף איש קשר
      </button>
    </SectionCard>
  )

  return (
    <SectionCard index={index} title="אנשי קשר" action={<EditBtn onClick={startEdit} hidden={readOnly} />}>
      {contacts.length === 0 && <div style={{ color:'rgba(255,255,255,0.52)', fontSize:13 }}>אין אנשי קשר</div>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))', gap:10 }}>
        {contacts.map((c, i) => (
          <div key={c.id || i} style={{ background:'rgba(255,255,255,0.06)', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'white', marginBottom:2 }}>{c.name}</div>
            {c.role  && <div style={{ fontSize:11, color:'rgba(255,255,255,0.65)', marginBottom:6 }}>{c.role}</div>}
            {c.phone && <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginBottom:2 }}>📞 {c.phone}</div>}
            {c.email && <div style={{ fontSize:12, color:'#60a5fa' }}>✉ {c.email}</div>}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────


// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ url, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return createPortal(
    <div
      onClick={onClose}
      className="ad-backdrop"
      style={{
        position:'fixed', inset:0,
        background:'rgba(0,0,0,0.92)',
        zIndex:99999,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:20,
      }}
    >
      <button
        onClick={onClose}
        className="ad-btn-ghost ad-press"
        style={{
          position:'absolute', top:16, left:16,
          background:'rgba(255,255,255,0.12)',
          border:'1px solid rgba(255,255,255,0.25)', borderRadius:8,
          color:'white', fontSize:20, cursor:'pointer', padding:'4px 14px',
          fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif", lineHeight:1.4,
          zIndex:1,
        }}
      >✕</button>
      <img
        src={url}
        onClick={e => e.stopPropagation()}
        className="ad-modal-panel"
        style={{
          maxWidth:'90vw', maxHeight:'90vh',
          objectFit:'contain', borderRadius:8,
          display:'block',
        }}
        alt=""
      />
    </div>,
    document.body
  )
}

// ─── Section: Files ───────────────────────────────────────────────────────────

const IMAGE_TYPES = ['image/jpeg','image/jpg','image/png','image/webp','image/gif']
const FILE_TYPE_LABELS = { image:'תמונה', plan:'תרשים', contract:'חוזה', other:'אחר' }
const ACCEPTED = '.jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx'

function FilesSection({ assetId, files, onSave, readOnly, index = 0 }) {
  const [editing,     setEditing]     = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [lightbox,    setLightbox]    = useState(null)
  const [dragOver,    setDragOver]    = useState(false)
  const [showUrlInput,setShowUrlInput]= useState(false)
  const [urlInput,    setUrlInput]    = useState('')
  const [urlCaption,  setUrlCaption]  = useState('')
  const [urlType,     setUrlType]     = useState('other')
  const [savingUrl,   setSavingUrl]   = useState(false)
  const [editName,    setEditName]    = useState(null)  // { id, value }

  async function getUrl(file) {
    if (file.external_url) return file.external_url
    const { data } = await supabase.storage.from('assets').createSignedUrl(file.storage_path, 3600)
    return data?.signedUrl
  }

  async function openFile(file) {
    const url = await getUrl(file)
    if (!url) return
    if (file.file_type === 'image') setLightbox(url)
    else window.open(url, '_blank')
  }

  async function uploadFiles(fileList) {
    if (!fileList?.length) return
    setUploading(true)
    for (const file of Array.from(fileList)) {
      const ext      = file.name.split('.').pop().toLowerCase()
      const path     = assetId + '/' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext
      const isImage  = IMAGE_TYPES.includes(file.type)
      const fileType = isImage ? 'image' : ext === 'pdf' ? 'contract' : 'other'
      const { error: upErr } = await supabase.storage.from('assets').upload(path, file)
      if (upErr) { console.error(upErr); continue }
      await supabase.from('asset_files').insert({
        asset_id: assetId, storage_path: path, external_url: null,
        file_type: fileType, caption: file.name.replace(/\.[^.]+$/, ''),
        sort_order: files.length,
      })
    }
    setUploading(false)
    onSave()
  }

  async function deleteFile(file) {
    if (!window.confirm('למחוק קובץ זה?')) return
    if (!file.external_url && file.storage_path) {
      await supabase.storage.from('assets').remove([file.storage_path])
    }
    await supabase.from('asset_files').delete().eq('id', file.id)
    onSave()
  }

  async function saveName(id, value) {
    await supabase.from('asset_files').update({ caption: value }).eq('id', id)
    setEditName(null)
    onSave()
  }

  async function saveExternalUrl() {
    if (!urlInput.trim()) return
    setSavingUrl(true)
    const isImg = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(urlInput)
    await supabase.from('asset_files').insert({
      asset_id: assetId, storage_path: '', external_url: urlInput.trim(),
      file_type: isImg ? 'image' : urlType,
      caption: urlCaption.trim() || urlInput.split('/').pop().split('?')[0],
      sort_order: files.length,
    })
    setSavingUrl(false)
    setUrlInput(''); setUrlCaption(''); setShowUrlInput(false)
    onSave()
  }

  const images = files.filter(f => f.file_type === 'image')
  const docs   = files.filter(f => f.file_type !== 'image')

  // ── מצב תצוגה ─────────────────────────────────────────────────────────────
  if (!editing) return (
    <>
      {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}
      <SectionCard index={index} title="קבצים ומסמכים" action={
        <EditBtn onClick={() => setEditing(true)} hidden={readOnly} />
      }>
        {files.length === 0 && (
          <div style={{ color:'rgba(255,255,255,0.48)', fontSize:13, textAlign:'center', padding:'12px 0' }}>
            אין קבצים. לחץ "עריכה" להוספה.
          </div>
        )}
        {/* תמונות */}
        {images.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:8, marginBottom: docs.length ? 14 : 0 }}>
            {images.map(f => (
              <div key={f.id} onClick={() => openFile(f)} style={{ cursor:'pointer', borderRadius:8, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)' }}>
                <ImageThumb file={f} />
                <div style={{ padding:'4px 8px', fontSize:11, color:'rgba(255,255,255,0.6)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {f.caption || '—'}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* מסמכים */}
        {docs.map(f => (
          <div key={f.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', cursor:'pointer' }}
            onClick={() => openFile(f)}>
            <span style={{ fontSize:18, flexShrink:0 }}>{f.storage_path?.endsWith('.pdf') || f.external_url?.includes('.pdf') ? '📄' : '📎'}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {f.caption || f.storage_path?.split('/').pop() || f.external_url}
              </div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.52)' }}>{FILE_TYPE_LABELS[f.file_type]}</div>
            </div>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.55)', flexShrink:0 }}>↗</span>
          </div>
        ))}
      </SectionCard>
    </>
  )

  // ── מצב עריכה ─────────────────────────────────────────────────────────────
  return (
    <>
      {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}
      <SectionCard index={index} title="קבצים ומסמכים" action={
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => { setShowUrlInput(u => !u); setUrlInput(''); setUrlCaption('') }}
            className="ad-btn-ghost ad-press"
            style={{ fontSize:11, padding:'4px 12px', borderRadius:8,
              border:'1px solid rgba(255,255,255,0.15)', background:'transparent',
              color:'rgba(255,255,255,0.68)', cursor:'pointer', fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif" }}>
            🔗 קישור
          </button>
          <label className="ad-btn-ghost ad-press" style={{
            fontSize:11, padding:'4px 12px', borderRadius:8,
            border:'1px solid rgba(255,255,255,0.15)', background:'transparent',
            color: uploading ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.68)',
            cursor: uploading ? 'default' : 'pointer', fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif",
          }}>
            {uploading ? 'מעלה...' : '+ קובץ'}
            <input type="file" multiple accept={ACCEPTED} disabled={uploading}
              style={{ display:'none' }} onChange={e => uploadFiles(e.target.files)} />
          </label>
          <button onClick={() => { setEditing(false); setShowUrlInput(false) }}
            className="ad-btn-soft ad-press"
            style={{ fontSize:11, padding:'4px 12px', borderRadius:8,
              border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.08)',
              color:'white', cursor:'pointer', fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif" }}>
            סיום
          </button>
        </div>
      }>
        {/* URL panel */}
        {showUrlInput && (
          <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:10, padding:14, marginBottom:12, border:'1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ marginBottom:8 }}>
              <label style={L.label}>קישור (URL)</label>
              <Input value={urlInput} onChange={setUrlInput} placeholder="https://..." />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 140px', gap:8, marginBottom:10 }}>
              <div><label style={L.label}>כיתוב</label>
                <Input value={urlCaption} onChange={setUrlCaption} placeholder="שם / תיאור" /></div>
              <div><label style={L.label}>סוג</label>
                <Select value={urlType} onChange={setUrlType} options={[
                  { value:'image',    label:'תמונה' },
                  { value:'contract', label:'חוזה/PDF' },
                  { value:'plan',     label:'תרשים' },
                  { value:'other',    label:'אחר' },
                ]} /></div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <SaveBtn onClick={saveExternalUrl} loading={savingUrl} />
              <CancelBtn onClick={() => setShowUrlInput(false)} />
            </div>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files) }}
          style={{
            border: '1.5px dashed ' + (dragOver ? '#3b82f6' : 'rgba(255,255,255,0.1)'),
            borderRadius:10, padding:'12px', textAlign:'center',
            fontSize:12, color:'rgba(255,255,255,0.52)',
            background: dragOver ? 'rgba(59,130,246,0.06)' : 'transparent',
            transition:'border-color 220ms var(--ease-out), background-color 220ms var(--ease-out)', marginBottom: files.length ? 14 : 0,
          }}
        >גרור קבצים לכאן</div>

        {/* תמונות במצב עריכה */}
        {images.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:8, marginBottom: docs.length ? 14 : 0 }}>
            {images.map(f => (
              <div key={f.id} style={{ position:'relative', borderRadius:8, overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.03)' }}>
                <div onClick={() => openFile(f)} style={{ cursor:'pointer' }}>
                  <ImageThumb file={f} />
                </div>
                <div style={{ padding:'4px 6px' }}>
                  {editName?.id === f.id ? (
                    <input autoFocus value={editName.value}
                      onChange={e => setEditName(n => ({...n, value:e.target.value}))}
                      onBlur={() => saveName(f.id, editName.value)}
                      onKeyDown={e => { if(e.key==='Enter') saveName(f.id, editName.value) }}
                      style={{ width:'100%', background:'transparent', border:'none',
                        borderBottom:'1px solid rgba(255,255,255,0.3)', color:'white',
                        fontSize:11, fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif", outline:'none' }} />
                  ) : (
                    <div onClick={() => setEditName({ id:f.id, value:f.caption||'' })}
                      style={{ fontSize:11, color:'rgba(255,255,255,0.65)', cursor:'text',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {f.caption || 'כיתוב...'}
                    </div>
                  )}
                </div>
                <button onClick={() => deleteFile(f)}
                  className="ad-x-chip ad-press"
                  style={{
                    position:'absolute', top:4, left:4, width:20, height:20,
                    background:'rgba(0,0,0,0.65)', border:'none', borderRadius:'50%',
                    cursor:'pointer', fontSize:13,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        {/* מסמכים במצב עריכה */}
        {docs.map(f => (
          <div key={f.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize:18, flexShrink:0 }}>{f.storage_path?.endsWith('.pdf') || f.external_url?.includes('.pdf') ? '📄' : '📎'}</span>
            <div style={{ flex:1, minWidth:0 }}>
              {editName?.id === f.id ? (
                <input autoFocus value={editName.value}
                  onChange={e => setEditName(n => ({...n, value:e.target.value}))}
                  onBlur={() => saveName(f.id, editName.value)}
                  onKeyDown={e => { if(e.key==='Enter') saveName(f.id, editName.value) }}
                  style={{ width:'100%', background:'transparent', border:'none',
                    borderBottom:'1px solid rgba(255,255,255,0.3)', color:'white',
                    fontSize:13, fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif", outline:'none' }} />
              ) : (
                <div onClick={() => setEditName({ id:f.id, value:f.caption||'' })}
                  style={{ fontSize:13, color:'white', cursor:'text',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {f.caption || f.storage_path?.split('/').pop() || f.external_url}
                </div>
              )}
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.52)' }}>{FILE_TYPE_LABELS[f.file_type]}</div>
            </div>
            <button onClick={() => deleteFile(f)}
              className="ad-x ad-press"
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, padding:0, flexShrink:0 }}
            >×</button>
          </div>
        ))}
      </SectionCard>
    </>
  )
}


function ImageThumb({ file, onClick }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (file.external_url) { setUrl(file.external_url); return }
    supabase.storage.from('assets').createSignedUrl(file.storage_path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl))
  }, [file.storage_path])

  return (
    <div
      onClick={onClick}
      style={{
        height:100, background:'rgba(255,255,255,0.07)', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden',
      }}
    >
      {url
        ? <img src={url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt={file.caption} />
        : <span style={{ color:'rgba(255,255,255,0.48)', fontSize:11 }}>טוען...</span>
      }
    </div>
  )
}

export default function AssetDetail({ session }) {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { fx }    = useFxRates()
  const userEmail = session?.user?.email || ''
  const isRoi     = userEmail === 'roy@barons.co.il'

  const [asset,     setAsset]     = useState(null)
  const [partners,  setPartners]  = useState([])
  const [income,    setIncome]    = useState([])
  const [purchases, setPurchases] = useState([])
  const [events,    setEvents]    = useState([])
  const [contacts,  setContacts]  = useState([])
  const [files,     setFiles]     = useState([])
  const [loading,   setLoading]   = useState(true)

  async function load() {
    const [
      { data: a },
      { data: p },
      { data: inc },
      { data: pur },
      { data: ev },
      { data: con },
      { data: fil },
    ] = await Promise.all([
      supabase.from('assets').select('*').eq('id', id).single(),
      supabase.from('asset_partners').select('*').eq('asset_id', id),
      supabase.from('asset_income').select('*').eq('asset_id', id),
      supabase.from('asset_purchases').select('*').eq('asset_id', id).order('purchase_date'),
      supabase.from('asset_events').select('*').eq('asset_id', id).order('event_date', { ascending: false }),
      supabase.from('contacts').select('*').eq('asset_id', id),
      supabase.from('asset_files').select('*').eq('asset_id', id).order('sort_order'),
    ])
    const purData  = pur || []
    const prtData  = p   || []
    // חשב ערך משוער מרכישות לתצוגה ב-GeneralSection
    const FX_FB = { ILS:1, USD:3.72, EUR:4.05, HUF:0.0096, GBP:4.70 }
    const totalPurchasesILS = purData.reduce((s,pu) =>
      s + (pu.amount || 0) * (FX_FB[pu.currency] || 1), 0)
    // מחשב myPct — אחוז ארז+רועי+חברה (כל מי שלא חיצוני)
    const myPct = prtData
      .filter(p => p.entity !== 'external')
      .reduce((s,p) => s + p.percentage, 0)
    setAsset({ ...a, _totalPurchasesILS: totalPurchasesILS, _myPct: myPct })
    setPartners(prtData); setIncome(inc || [])
    setPurchases(purData); setEvents(ev || []); setContacts(con || []); setFiles(fil || [])
    // בדיקת הרשאה לרועי — רק נכסים עם erez_roi
    if (isRoi) {
      const hasAccess = (p || []).some(pt =>
        pt.entity === 'erez_roi' ||
        ((p || []).some(x => x.entity === 'erez') && (p || []).some(x => x.entity === 'roi'))
      )
      if (!hasAccess) { navigate('/assets'); return }
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  if (loading) return (
    <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'rgba(255,255,255,0.65)', fontSize:14 }}>טוען...</div>
    </div>
  )

  if (!asset) return (
    <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#f87171', fontSize:14 }}>נכס לא נמצא</div>
    </div>
  )

  return (
    <div style={S.page}>
      <style>{AD_STYLE}</style>

      {/* Header — full width, sticky */}
      <BaronsHeader
        title={asset.name}
        subtitle={asset.address_city ? `${asset.address_city}${asset.address_country !== 'ישראל' ? ' · ' + asset.address_country : ''}` : 'נכס'}
        breadcrumbs={[{ label: 'נכסים', path: '/assets' }, { label: asset.name }]}
        actions={[]}
      />

      <div style={S.shell}>
        <div>
          <GeneralSection
            asset={asset}
            onSave={d => setAsset(a => ({ ...a, ...d }))}
            readOnly={isRoi}
            index={0}
          />
          <PartnersSection
            assetId={id}
            partners={partners}
            onSave={load}
            readOnly={isRoi}
            index={1}
          />
          <IncomeSection
            assetId={id}
            income={income}
            partners={partners}
            fx={fx}
            onSave={load}
            readOnly={isRoi}
            index={2}
          />
          <PurchasesSection
            assetId={id}
            purchases={purchases}
            onSave={load}
            readOnly={isRoi}
            index={3}
          />
          <EventsSection
            assetId={id}
            events={events}
            onSave={load}
            readOnly={isRoi}
            index={4}
          />
          <ContactsSection
            assetId={id}
            contacts={contacts}
            onSave={load}
            readOnly={isRoi}
            index={5}
          />
          <FilesSection
            assetId={id}
            files={files}
            onSave={load}
            readOnly={isRoi}
            index={6}
          />
        </div>
      </div>
    </div>
  )
}

const L = {
  label: { fontSize:11, color:'rgba(255,255,255,0.6)', display:'block', marginBottom:4 }
}

const S = {
  page:  { minHeight:'100vh', background:'linear-gradient(160deg,#101a2e 0%,#152e62 60%,#0f1f47 100%)', direction:'rtl', fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif" },
  shell: { width:'100%', maxWidth:800, margin:'0 auto', padding:'24px 20px 80px', boxSizing:'border-box' },
}

// ─── Emil Kowalski polish styles ──────────────────────────────────────────────

const AD_STYLE = `
  :root {
    --ease-out: cubic-bezier(0.23,1,0.32,1);
    --ease-in-out: cubic-bezier(0.77,0,0.175,1);
    --ease-drawer: cubic-bezier(0.32,0.72,0,1);
    --ease-spring: cubic-bezier(0.34,1.56,0.64,1);
  }

  /* Base form control tweaks */
  input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.7); }
  textarea::placeholder, input::placeholder { color: rgba(255,255,255,0.48); }
  select option { background: #1a2744; }

  @keyframes ad-section-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ad-backdrop-in {
    from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
    to   { opacity: 1; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
  }
  @keyframes ad-modal-in {
    from { opacity: 0; transform: translateY(8px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* Section cards stagger in */
  .ad-section {
    animation: ad-section-in 440ms var(--ease-out) both;
    transition:
      background-color 220ms var(--ease-out),
      border-color 220ms var(--ease-out);
  }

  /* Tactile press */
  .ad-press {
    transition: transform 160ms var(--ease-out);
  }
  .ad-press:active {
    transform: scale(0.97);
  }

  /* Ghost buttons (Edit, Cancel, text chips) */
  .ad-btn-ghost {
    transition:
      background-color 200ms var(--ease-out),
      border-color 200ms var(--ease-out),
      color 200ms var(--ease-out),
      box-shadow 220ms var(--ease-out),
      transform 160ms var(--ease-out);
  }
  @media (hover: hover) and (pointer: fine) {
    .ad-btn-ghost:hover {
      color: white !important;
      border-color: rgba(255,255,255,0.4) !important;
      background: rgba(255,255,255,0.05);
    }
  }
  .ad-btn-ghost:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.35);
  }

  /* Primary button (Save) */
  .ad-btn-primary {
    transition:
      filter 200ms var(--ease-out),
      box-shadow 220ms var(--ease-out),
      transform 160ms var(--ease-out);
  }
  @media (hover: hover) and (pointer: fine) {
    .ad-btn-primary:hover:not(:disabled) {
      filter: brightness(1.15);
      box-shadow: 0 8px 22px rgba(29,78,216,0.38);
    }
  }
  .ad-btn-primary:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px rgba(59,130,246,0.4);
  }
  .ad-btn-primary:disabled {
    opacity: 0.6;
    cursor: default;
  }

  /* Soft button (סיום in files section) */
  .ad-btn-soft {
    transition:
      background-color 200ms var(--ease-out),
      border-color 200ms var(--ease-out),
      box-shadow 220ms var(--ease-out),
      transform 160ms var(--ease-out);
  }
  @media (hover: hover) and (pointer: fine) {
    .ad-btn-soft:hover {
      background: rgba(255,255,255,0.14) !important;
      border-color: rgba(255,255,255,0.3) !important;
    }
  }
  .ad-btn-soft:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.35);
  }

  /* Text buttons (+ הוסף ...) */
  .ad-text-btn {
    transition:
      color 180ms var(--ease-out),
      transform 160ms var(--ease-out),
      text-shadow 220ms var(--ease-out);
  }
  @media (hover: hover) and (pointer: fine) {
    .ad-text-btn:hover {
      color: #93c5fd !important;
      text-shadow: 0 0 12px rgba(96,165,250,0.35);
    }
  }
  .ad-text-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.35);
    border-radius: 4px;
  }

  /* Destructive × buttons */
  .ad-x {
    color: rgba(255,255,255,0.48);
    transition: color 180ms var(--ease-out), transform 160ms var(--ease-out);
  }
  @media (hover: hover) and (pointer: fine) {
    .ad-x:hover { color: #f87171; }
  }
  .ad-x-subtle {
    color: rgba(255,255,255,0.15);
    transition: color 180ms var(--ease-out), transform 160ms var(--ease-out);
  }
  @media (hover: hover) and (pointer: fine) {
    .ad-x-subtle:hover { color: #f87171; }
  }
  .ad-x-red {
    color: #f87171;
    transition: color 180ms var(--ease-out), transform 160ms var(--ease-out), filter 180ms var(--ease-out);
  }
  @media (hover: hover) and (pointer: fine) {
    .ad-x-red:hover { filter: brightness(1.15); }
  }
  .ad-x-chip {
    color: rgba(255,255,255,0.6);
    transition: color 180ms var(--ease-out), background-color 180ms var(--ease-out), transform 160ms var(--ease-out);
  }
  @media (hover: hover) and (pointer: fine) {
    .ad-x-chip:hover { color: #f87171; background: rgba(0,0,0,0.82) !important; }
  }

  /* Inputs with focus glow */
  .ad-input {
    transition:
      border-color 220ms var(--ease-out),
      box-shadow 220ms var(--ease-out),
      background-color 220ms var(--ease-out);
  }
  .ad-input:focus {
    outline: none;
    border-color: rgba(96,165,250,0.55) !important;
    box-shadow: 0 0 0 4px rgba(59,130,246,0.18);
    background: rgba(255,255,255,0.09) !important;
  }
  .ad-input:hover:not(:focus) {
    border-color: rgba(255,255,255,0.24) !important;
  }

  /* Thumbnails */
  .ad-thumb {
    transition:
      border-color 220ms var(--ease-out),
      transform 220ms var(--ease-out),
      box-shadow 220ms var(--ease-out);
  }
  @media (hover: hover) and (pointer: fine) {
    .ad-thumb:hover {
      border-color: rgba(255,255,255,0.28) !important;
      transform: translateY(-1px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.28);
    }
  }

  /* Upload tile */
  .ad-upload-tile {
    transition:
      border-color 220ms var(--ease-out),
      background-color 220ms var(--ease-out),
      transform 160ms var(--ease-out);
  }
  @media (hover: hover) and (pointer: fine) {
    .ad-upload-tile:hover {
      border-color: rgba(96,165,250,0.45) !important;
      background: rgba(59,130,246,0.06) !important;
    }
  }

  /* Modal backdrop + panel (Lightbox) */
  .ad-backdrop {
    animation: ad-backdrop-in 240ms var(--ease-out) both;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
  .ad-modal-panel {
    animation: ad-modal-in 300ms var(--ease-drawer) both;
    will-change: transform, opacity;
  }

  @media (prefers-reduced-motion: reduce) {
    .ad-section,
    .ad-backdrop,
    .ad-modal-panel {
      animation: none !important;
    }
    .ad-press, .ad-press:active {
      transition: none !important;
      transform: none !important;
    }
    .ad-btn-ghost,
    .ad-btn-primary,
    .ad-btn-soft,
    .ad-text-btn,
    .ad-input,
    .ad-thumb,
    .ad-upload-tile,
    .ad-x, .ad-x-subtle, .ad-x-red, .ad-x-chip {
      transition-duration: 120ms !important;
    }
    @media (hover: hover) and (pointer: fine) {
      .ad-thumb:hover { transform: none; }
    }
  }
`

