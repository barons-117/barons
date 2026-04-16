import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ─── Design Tokens: Emil Kowalski × Taste ─────────────────────────────────────
const T = {
  // Backgrounds
  bg:          '#0b1120',
  bgGrad:      'linear-gradient(155deg, #0b1120 0%, #0e1729 55%, #0b1120 100%)',
  surface:     'rgba(255,255,255,0.055)',
  surfaceHov:  'rgba(255,255,255,0.085)',
  surfaceAct:  'rgba(255,255,255,0.04)',

  // Text — high contrast, Taste-compliant
  text:        '#f1f5f9',   // primary — bright slate
  textSub:     '#cbd5e1',   // secondary — readable
  textDim:     '#94a3b8',   // tertiary — timestamps, labels

  // Borders
  border:      'rgba(255,255,255,0.10)',
  borderMid:   'rgba(255,255,255,0.16)',
  borderBright:'rgba(255,255,255,0.24)',

  // Accents
  blue:        '#60a5fa',
  green:       '#34d399',
  amber:       '#fbbf24',
  red:         '#f87171',

  // Glass effect
  glass:       'inset 0 1px 0 rgba(255,255,255,0.07)',

  font:        '"Open Sans Hebrew", "Open Sans", sans-serif',
  mono:        '"JetBrains Mono", "Courier New", monospace',
}

// Emil Kowalski easings
const E = {
  out:    'cubic-bezier(0.23, 1, 0.32, 1)',
  inOut:  'cubic-bezier(0.77, 0, 0.175, 1)',
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
}

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  'Awaiting delivery': { color: '#fbbf24', bg: 'rgba(251,191,36,0.13)',  label: 'בדרך',         p: 2 },
  'Ready to ship':     { color: '#60a5fa', bg: 'rgba(96,165,250,0.13)',  label: 'ממתין לשליחה', p: 3 },
  'Completed':         { color: '#34d399', bg: 'rgba(52,211,153,0.13)', label: 'הגיע',          p: 5 },
  'Processed':         { color: '#34d399', bg: 'rgba(52,211,153,0.13)', label: 'הגיע',          p: 5 },
  'Canceled':          { color: '#f87171', bg: 'rgba(248,113,113,0.13)', label: 'בוטל',         p: 6 },
  'In dispute':        { color: '#f87171', bg: 'rgba(248,113,113,0.13)', label: 'במחלוקת',      p: 1 },
}

const TRACK_P = {
  'ממתין לאיסוף':     0,
  'בדרך לאיסוף':     1,
  'הגיע למדינת היעד': 2,
  'עבר מכס':         3,
  'בדרך':            4,
  'יצא ממדינת המוצא': 5,
}

function getStatusCfg(s) {
  s = (s || '').trim()
  for (const [k, v] of Object.entries(STATUS_CFG))
    if (s.toLowerCase().includes(k.toLowerCase())) return v
  return { color: T.textDim, bg: T.surface, label: s || '—', p: 9 }
}

function inTransit(s) {
  s = (s || '').toLowerCase()
  return s.includes('awaiting') || s.includes('shipped') || s.includes('transit')
}

function isPickup(ts) { return (ts || '').includes('ממתין לאיסוף') }

function sortOrders(arr) {
  return [...arr].sort((a, b) => {
    const pa = isPickup(a.track_status) ? 0 : 1
    const pb = isPickup(b.track_status) ? 0 : 1
    if (pa !== pb) return pa - pb
    const ta = TRACK_P[a.track_status] ?? 99
    const tb = TRACK_P[b.track_status] ?? 99
    if (ta !== tb) return ta - tb
    const ca = getStatusCfg(a.status).p, cb = getStatusCfg(b.status).p
    if (ca !== cb) return ca - cb
    return (b.order_date || '').localeCompare(a.order_date || '')
  })
}

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
  return lines.slice(1).map(line => {
    const vals = []; let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ }
      else if (line[i] === ',' && !inQ) { vals.push(cur); cur = '' }
      else cur += line[i]
    }
    vals.push(cur)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim() })
    return obj
  }).filter(r => r.order_id)
}

const SB_URL = 'https://cwewsfuswiiliritikvh.supabase.co'
const SB_KEY = 'sb_publishable_qIHIRr47iAqiYoTn9aQIuQ_qteCIHk0'

// ─── Skeleton loader (Taste: shimmer matching layout) ─────────────────────────
function SkeletonCard({ delay = 0 }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: '13px', padding: '13px 16px',
      display: 'flex', gap: '14px', alignItems: 'center',
      animation: `fadeUp 0.4s ${E.out} ${delay}ms both`,
    }}>
      <div style={{ width: 52, height: 52, borderRadius: 9, background: 'rgba(255,255,255,0.06)', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s linear infinite' }} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', width: '70%' }}>
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s linear infinite 0.1s' }} />
        </div>
        <div style={{ height: 11, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', width: '40%' }}>
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s linear infinite 0.2s' }} />
        </div>
      </div>
      <div style={{ width: 70, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        <div style={{ height: 22, width: 70, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s linear infinite 0.15s' }} />
        </div>
        <div style={{ height: 11, width: 50, borderRadius: 4, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s linear infinite 0.25s' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AliExpressOrders() {
  const navigate = useNavigate()
  const [orders, setOrders]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [tab, setTab]                   = useState('awaiting')
  const [importing, setImporting]       = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [dragOver, setDragOver]         = useState(false)
  const [refreshing, setRefreshing]     = useState(false)
  const [refreshMsg, setRefreshMsg]     = useState('')
  const fileRef = useRef()

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('aliexpress_orders').select('*')
    if (!error) setOrders(sortOrders(data || []))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const onUpdate = useCallback((u) => {
    setOrders(prev => sortOrders(prev.map(o => o.order_id === u.order_id ? u : o)))
  }, [])

  const importCSV = async (text) => {
    setImporting(true); setImportResult(null)
    try {
      const rows = parseCSV(text)
      if (!rows.length) { setImportResult({ ok: false, msg: 'לא נמצאו שורות' }); return }
      const records = rows.map(r => ({
        order_id: r.order_id, order_date: r.order_date || '',
        store_name: r.store_name || '', product_name: r.product_name || '',
        sku_info: r.sku_info || '', status: r.status || '',
        price: r.price || '', order_url: r.order_url || '',
        tracking_url: r.tracking_url || '', product_images: r.product_images || '',
        product_urls: r.product_urls || '', updated_at: new Date().toISOString(),
      }))
      const { error } = await supabase.from('aliexpress_orders').upsert(records, { onConflict: 'order_id' })
      if (error) throw error
      setImportResult({ ok: true, msg: `יובאו ${records.length} הזמנות` })
      await load()
    } catch (e) {
      setImportResult({ ok: false, msg: e.message })
    } finally { setImporting(false) }
  }

  const handleFile = (f) => {
    if (!f) return
    const r = new FileReader()
    r.onload = e => importCSV(e.target.result)
    r.readAsText(f, 'UTF-8')
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const refreshAll = async () => {
    const cutoff = new Date(Date.now() - 86400000)
    const toRefresh = orders.filter(o =>
      inTransit(o.status) && o.tracking_number &&
      (!o.updated_at || new Date(o.updated_at) < cutoff || !o.track_status)
    )
    if (!toRefresh.length) {
      setRefreshMsg('הכל מעודכן'); setTimeout(() => setRefreshMsg(''), 3000); return
    }
    setRefreshing(true); setRefreshMsg(`מעדכן ${toRefresh.length}...`)
    let n = 0
    for (const o of toRefresh) {
      try {
        const res = await fetch(`${SB_URL}/functions/v1/track-package`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SB_KEY}` },
          body: JSON.stringify({ tracking_number: o.tracking_number }),
        })
        const info = await res.json()
        if (info.status) {
          const { data } = await supabase.from('aliexpress_orders')
            .update({ track_status: info.status, track_last_event: info.last_event || '', updated_at: new Date().toISOString() })
            .eq('order_id', o.order_id).select().single()
          if (data) { onUpdate(data); n++ }
        }
      } catch { /* skip */ }
    }
    setRefreshing(false); setRefreshMsg(`עודכנו ${n}`)
    setTimeout(() => setRefreshMsg(''), 4000)
  }

  const filtered = sortOrders(orders.filter(o => {
    const q = search.toLowerCase()
    const ms = !q ||
      (o.product_name||'').toLowerCase().includes(q) ||
      (o.store_name||'').toLowerCase().includes(q) ||
      (o.order_id||'').includes(q) ||
      (o.tracking_number||'').toLowerCase().includes(q)
    const mt = tab === 'all' ||
      (tab === 'processed'
        ? (o.status||'').toLowerCase().includes('processed') || (o.status||'').toLowerCase().includes('completed')
        : (o.status||'').toLowerCase().includes(tab.toLowerCase()))
    return ms && mt
  }))

  const total   = orders.length
  const transit = orders.filter(o => inTransit(o.status)).length
  const ship    = orders.filter(o => (o.status||'').toLowerCase().includes('ready')).length
  const done    = orders.filter(o => ['processed','completed','canceled'].some(k => (o.status||'').toLowerCase().includes(k))).length
  const pickup  = orders.filter(o => isPickup(o.track_status)).length

  const tabs = [
    { k: 'awaiting',  l: 'בדרך',        n: transit },
    { k: 'ready',     l: 'לשליחה',       n: ship },
    { k: 'processed', l: 'הגיע / בוטל',  n: done },
    { k: 'all',       l: 'הכל',          n: total },
  ]

  return (
    <div style={{ minHeight: '100dvh', background: T.bgGrad, fontFamily: T.font, direction: 'rtl', color: T.text }}>
      <style>{`
        @keyframes fadeUp   { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes expandDn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.6} }
        @keyframes greenGlow{ 0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,0)} 50%{box-shadow:0 0 16px 2px rgba(52,211,153,0.22)} }
        @keyframes shimmer  { from{background-position:200% 0} to{background-position:-200% 0} }
        @keyframes topBar   { 0%,100%{opacity:.7} 50%{opacity:1} }
      `}</style>

      {/* ── Sticky Header ── */}
      <header style={{
        padding: '22px 28px 18px',
        borderBottom: `1px solid ${T.border}`,
        background: 'rgba(11,17,32,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        {/* Breadcrumb */}
        <nav style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
          <button onClick={() => navigate('/')} style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontFamily: T.font, fontSize: '12px', color: T.textDim,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            transition: `color 0.2s ${E.out}`,
          }}
            onMouseEnter={e => e.target.style.color = T.textSub}
            onMouseLeave={e => e.target.style.color = T.textDim}
          >BARONS</button>
          <span style={{ color: T.border, fontSize: '12px' }}>/</span>
          <span style={{ fontSize: '12px', color: T.textDim, letterSpacing: '0.04em' }}>ALIEXPRESS</span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{
              margin: 0, fontSize: 'clamp(18px, 3vw, 24px)',
              fontWeight: 800, letterSpacing: '-0.03em', color: T.text,
              lineHeight: 1.1,
            }}>
              הזמנות AliExpress
            </h1>
            {pickup > 0 && (
              <span style={{
                background: 'rgba(52,211,153,0.14)',
                border: '1px solid rgba(52,211,153,0.38)',
                color: T.green, borderRadius: '99px',
                padding: '4px 13px', fontSize: '12px', fontWeight: 700,
                letterSpacing: '-0.01em',
                animation: 'greenGlow 2.8s ease-in-out infinite',
              }}>
                {pickup} ממתין לאיסוף
              </span>
            )}
          </div>
          <a
            href="https://www.aliexpress.com/p/order/index.html"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: T.surface, border: `1px solid ${T.border}`,
              color: T.textDim, borderRadius: '9px', padding: '8px 15px',
              fontSize: '12px', fontWeight: 600, textDecoration: 'none',
              fontFamily: T.font, letterSpacing: '0.01em',
              transition: `all 0.2s ${E.out}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHov; e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = T.borderMid }}
            onMouseLeave={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.color = T.textDim; e.currentTarget.style.borderColor = T.border }}
          >
            ↗ ייצוא CSV
          </a>
        </div>
      </header>

      <main style={{ maxWidth: '980px', margin: '0 auto', padding: '24px 20px' }}>

        {/* ── CSV Drop Zone ── */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `1px dashed ${dragOver ? T.blue : T.border}`,
            borderRadius: '14px', padding: '18px 24px',
            textAlign: 'center', cursor: 'pointer', marginBottom: '12px',
            background: dragOver ? 'rgba(96,165,250,0.06)' : 'rgba(255,255,255,0.02)',
            transition: `all 0.25s ${E.out}`,
          }}
        >
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])} />
          {importing
            ? <span style={{ color: T.textDim, fontSize: '14px' }}>מייבא...</span>
            : <span style={{ color: T.textDim, fontSize: '14px' }}>
                גרור CSV לכאן&nbsp;&nbsp;·&nbsp;&nbsp;<span style={{ color: T.blue, fontWeight: 600 }}>לחץ לבחור</span>
              </span>
          }
        </div>

        {importResult && (
          <div style={{
            padding: '10px 16px', borderRadius: '10px', marginBottom: '14px',
            background: importResult.ok ? 'rgba(52,211,153,0.09)' : 'rgba(248,113,113,0.09)',
            border: `1px solid ${importResult.ok ? 'rgba(52,211,153,0.28)' : 'rgba(248,113,113,0.28)'}`,
            color: importResult.ok ? T.green : T.red,
            fontSize: '14px', fontWeight: 600,
            animation: `fadeUp 0.3s ${E.out}`,
          }}>
            {importResult.ok ? '✓' : '✕'} {importResult.msg}
          </div>
        )}

        {/* ── Controls row ── */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Tabs — pill group */}
          <div style={{
            display: 'flex', gap: '2px', padding: '3px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${T.border}`,
            borderRadius: '11px', flexShrink: 0,
          }}>
            {tabs.map(t => (
              <button key={t.k} onClick={() => setTab(t.k)} style={{
                padding: '6px 14px',
                background: tab === t.k ? 'rgba(255,255,255,0.13)' : 'transparent',
                border: 'none', borderRadius: '8px',
                color: tab === t.k ? T.text : T.textDim,
                fontSize: '13px', fontWeight: tab === t.k ? 700 : 400,
                cursor: 'pointer', fontFamily: T.font,
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: `all 0.18s ${E.out}`,
                letterSpacing: tab === t.k ? '-0.01em' : '0',
              }}>
                {t.l}
                <span style={{
                  fontSize: '11px', fontWeight: 600,
                  background: tab === t.k ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                  color: tab === t.k ? T.text : T.textDim,
                  borderRadius: '99px', padding: '1px 7px',
                  minWidth: '18px', textAlign: 'center',
                  transition: `all 0.18s ${E.out}`,
                }}>{t.n}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש..."
            style={{
              flex: 1, minWidth: '130px',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${T.border}`,
              borderRadius: '9px', padding: '8px 14px',
              color: T.text, fontFamily: T.font, fontSize: '14px',
              outline: 'none', direction: 'rtl',
              transition: `border-color 0.2s ${E.out}`,
            }}
            onFocus={e => e.target.style.borderColor = T.borderMid}
            onBlur={e => e.target.style.borderColor = T.border}
          />

          {/* Refresh button */}
          {tab === 'awaiting' && (
            <button
              onClick={refreshAll}
              disabled={refreshing}
              style={{
                padding: '8px 14px',
                background: refreshing ? T.surfaceAct : 'rgba(251,191,36,0.09)',
                border: `1px solid ${refreshing ? T.border : 'rgba(251,191,36,0.28)'}`,
                color: refreshing ? T.textDim : T.amber,
                borderRadius: '9px', fontSize: '13px', fontWeight: 600,
                cursor: refreshing ? 'default' : 'pointer',
                fontFamily: T.font, whiteSpace: 'nowrap',
                transition: `all 0.2s ${E.out}`,
                transform: 'translateY(0)',
              }}
              onMouseEnter={e => { if (!refreshing) e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
            >
              {refreshing ? 'מעדכן...' : 'רענן מעקב'}
            </button>
          )}

          {refreshMsg && (
            <span style={{
              fontSize: '12px', color: T.textSub,
              animation: `fadeUp 0.3s ${E.out}`,
            }}>{refreshMsg}</span>
          )}
        </div>

        {/* ── List ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[0,1,2,3,4].map(i => <SkeletonCard key={i} delay={i * 60} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            color: T.textDim, animation: `fadeUp 0.4s ${E.out}`,
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.2, lineHeight: 1 }}>—</div>
            <div style={{ fontSize: '15px', letterSpacing: '-0.01em' }}>לא נמצאו הזמנות</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {filtered.map((o, i) => (
              <OrderCard key={o.order_id} order={o} idx={i} onUpdate={onUpdate} />
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <p style={{ textAlign: 'center', padding: '20px', color: T.textDim, fontSize: '12px', letterSpacing: '0.04em', margin: 0 }}>
            {filtered.length} / {total}
          </p>
        )}
      </main>
    </div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, idx, onUpdate }) {
  const [expanded, setExpanded]       = useState(false)
  const [trackNum, setTrackNum]       = useState(order.tracking_number || '')
  const [saving, setSaving]           = useState(false)
  const [fetching, setFetching]       = useState(false)
  const [trackInfo, setTrackInfo]     = useState(
    order.track_status ? { status: order.track_status, last_event: order.track_last_event || '' } : null
  )

  useEffect(() => {
    if (order.track_status)
      setTrackInfo({ status: order.track_status, last_event: order.track_last_event || '' })
  }, [order.track_status, order.track_last_event])

  const cfg         = getStatusCfg(order.status)
  const showTrack   = inTransit(order.status)
  const pickup      = isPickup(order.track_status)
  const imgUrl      = (order.product_images || '').split('|')[0].trim()
  const prodUrl     = (order.product_urls || '').split('|')[0].trim()

  const fetchStatus = async (num) => {
    if (!num) return
    setFetching(true)
    try {
      const res = await fetch(`${SB_URL}/functions/v1/track-package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SB_KEY}` },
        body: JSON.stringify({ tracking_number: num }),
      })
      const info = await res.json()
      if (info.status) {
        setTrackInfo(info)
        const { data } = await supabase.from('aliexpress_orders')
          .update({ track_status: info.status, track_last_event: info.last_event || '', updated_at: new Date().toISOString() })
          .eq('order_id', order.order_id).select().single()
        if (data) onUpdate(data)
      }
    } catch { /* skip */ } finally { setFetching(false) }
  }

  const saveNum = async (num) => {
    const t = num.trim()
    if (!t || t === order.tracking_number) return
    setSaving(true)
    const { data, error } = await supabase.from('aliexpress_orders')
      .update({ tracking_number: t, updated_at: new Date().toISOString() })
      .eq('order_id', order.order_id).select().single()
    setSaving(false)
    if (!error && data) { onUpdate(data); await fetchStatus(t) }
  }

  return (
    <div style={{
      background: pickup ? 'rgba(52,211,153,0.055)' : T.surface,
      border: `1px solid ${pickup ? 'rgba(52,211,153,0.32)' : T.border}`,
      borderRadius: '13px', overflow: 'hidden',
      boxShadow: T.glass,
      animation: `fadeUp 0.38s ${E.out} ${Math.min(idx * 22, 200)}ms both`,
      transition: `border-color 0.25s ${E.out}, background 0.25s ${E.out}`,
    }}>

      {/* Pickup indicator bar */}
      {pickup && (
        <div style={{
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.85) 30%, rgba(52,211,153,0.85) 70%, transparent)',
          animation: 'topBar 2.8s ease-in-out infinite',
        }} />
      )}

      {/* ── Main row ── */}
      <div
        onClick={() => setExpanded(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '13px 16px', cursor: 'pointer',
          transition: `background 0.15s ${E.out}`,
        }}
        onMouseEnter={e => e.currentTarget.style.background = T.surfaceHov}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Thumbnail */}
        <div style={{
          width: 52, height: 52, borderRadius: 9, flexShrink: 0,
          background: 'rgba(255,255,255,0.07)',
          border: `1px solid ${T.border}`,
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {imgUrl
            ? <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.style.display = 'none' }} />
            : <div style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }} />
          }
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '14px', fontWeight: 600, color: T.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: '4px', letterSpacing: '-0.015em',
          }}>
            {order.product_name || '—'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: T.textSub }}>{order.store_name}</span>
            {order.sku_info && (
              <span style={{ fontSize: '11px', color: T.textDim, direction: 'ltr' }}>
                · {order.sku_info.split('|')[0].trim()}
              </span>
            )}
            {order.tracking_number && (
              <span style={{
                fontSize: '10px', fontFamily: T.mono, direction: 'ltr',
                color: pickup ? T.green : T.blue, letterSpacing: '0.01em',
              }}>
                · {order.tracking_number}
              </span>
            )}
          </div>
        </div>

        {/* Right: badge + price */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0 }}>
          {trackInfo ? (
            <span style={{
              background: pickup ? 'rgba(52,211,153,0.14)' : 'rgba(251,191,36,0.12)',
              color: pickup ? T.green : T.amber,
              border: `1px solid ${pickup ? 'rgba(52,211,153,0.32)' : 'rgba(251,191,36,0.24)'}`,
              borderRadius: '6px', padding: '3px 10px',
              fontSize: '12px', fontWeight: 700, letterSpacing: '-0.01em',
              animation: pickup ? 'pulse 2.8s ease-in-out infinite' : 'none',
            }}>
              {trackInfo.status}
            </span>
          ) : (
            <span style={{
              background: cfg.bg, color: cfg.color,
              borderRadius: '6px', padding: '3px 10px',
              fontSize: '12px', fontWeight: 600,
            }}>
              {cfg.label}
            </span>
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: T.text, direction: 'ltr', fontFamily: T.mono }}>
              {order.price}
            </span>
            <span style={{ fontSize: '11px', color: T.textDim, direction: 'ltr' }}>
              {order.order_date}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <div style={{
          width: 16, height: 16, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
          transition: `transform 0.28s ${E.out}`,
          opacity: 0.35,
        }}>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke={T.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* ── Tracking strip ── */}
      {showTrack && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            borderTop: `1px solid ${pickup ? 'rgba(52,211,153,0.16)' : 'rgba(251,191,36,0.1)'}`,
            padding: '9px 16px',
            background: pickup ? 'rgba(52,211,153,0.03)' : 'transparent',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Label */}
            <span style={{
              fontSize: '11px', fontWeight: 700, flexShrink: 0,
              color: pickup ? T.green : T.amber,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              מעקב
            </span>

            {/* Input */}
            <input
              value={trackNum}
              onChange={e => setTrackNum(e.target.value)}
              onBlur={e => saveNum(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveNum(trackNum) }}
              placeholder="הדבק מספר מעקב..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${pickup ? 'rgba(52,211,153,0.18)' : 'rgba(251,191,36,0.15)'}`,
                borderRadius: '6px', padding: '5px 10px',
                color: T.text, fontFamily: T.mono, fontSize: '12px',
                outline: 'none', direction: 'ltr',
                transition: `border-color 0.18s ${E.out}`,
              }}
              onFocus={e => e.target.style.borderColor = pickup ? 'rgba(52,211,153,0.4)' : 'rgba(251,191,36,0.35)'}
              onBlur2={e => e.target.style.borderColor = pickup ? 'rgba(52,211,153,0.18)' : 'rgba(251,191,36,0.15)'}
            />

            {/* States */}
            {saving   && <span style={{ fontSize: '11px', color: T.textDim, flexShrink: 0 }}>שומר</span>}
            {fetching && <span style={{ fontSize: '11px', color: T.amber,   flexShrink: 0 }}>בודק</span>}

            {/* Refresh btn */}
            {(trackNum || order.tracking_number) && !fetching && (
              <button
                onClick={() => fetchStatus(trackNum || order.tracking_number)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${T.border}`,
                  color: T.textDim, borderRadius: '6px',
                  padding: '5px 9px', fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: T.font, flexShrink: 0,
                  transition: `all 0.18s ${E.out}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = T.borderMid }}
                onMouseLeave={e => { e.currentTarget.style.color = T.textDim; e.currentTarget.style.borderColor = T.border }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                ↻
              </button>
            )}
          </div>

          {/* Last event */}
          {trackInfo?.last_event && (
            <div style={{
              marginTop: '6px', fontSize: '11px', color: T.textSub,
              direction: 'ltr', lineHeight: 1.55, paddingRight: '2px',
              animation: `expandDn 0.25s ${E.out}`,
            }}>
              {trackInfo.last_event}
            </div>
          )}
        </div>
      )}

      {/* ── Expanded details ── */}
      {expanded && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            borderTop: `1px solid ${T.border}`,
            padding: '10px 16px',
            display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center',
            animation: `expandDn 0.25s ${E.out}`,
          }}
        >
          <span style={{ fontSize: '11px', color: T.textDim, fontFamily: T.mono, direction: 'ltr', letterSpacing: '0.02em' }}>
            {order.order_id}
          </span>
          {order.order_url && (
            <a href={order.order_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '12px', color: T.blue, textDecoration: 'none', fontWeight: 600, transition: `opacity 0.15s ${E.out}` }}
              onMouseEnter={e => e.target.style.opacity = '0.75'}
              onMouseLeave={e => e.target.style.opacity = '1'}>
              פרטי הזמנה ↗
            </a>
          )}
          {order.tracking_url && (
            <a href={order.tracking_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '12px', color: T.amber, textDecoration: 'none', fontWeight: 600, transition: `opacity 0.15s ${E.out}` }}
              onMouseEnter={e => e.target.style.opacity = '0.75'}
              onMouseLeave={e => e.target.style.opacity = '1'}>
              מעקב AliExpress ↗
            </a>
          )}
          {prodUrl && (
            <a href={prodUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '12px', color: T.textDim, textDecoration: 'none', transition: `opacity 0.15s ${E.out}` }}
              onMouseEnter={e => e.target.style.opacity = '0.65'}
              onMouseLeave={e => e.target.style.opacity = '1'}>
              המוצר ↗
            </a>
          )}
        </div>
      )}
    </div>
  )
}
