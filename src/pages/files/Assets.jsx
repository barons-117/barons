import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'
import { supabase } from '../lib/supabase'
import { useFxRates } from '../lib/useFxRates'

const FALLBACK_FX = { ILS: 1, USD: 3.72, EUR: 4.05, HUF: 0.0096, GBP: 4.70 }

function toILS(amount, currency, fx) {
  return amount * ((fx || FALLBACK_FX)[currency] || 1)
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ENTITIES = [
  {
    key: 'erez_only',
    label: 'ארז',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    match: (partners) => {
      const e = partners.map(p => p.entity)
      // רק erez בלי roi ובלי erez_roi
      return e.includes('erez') && !e.includes('roi') && !e.includes('erez_roi')
    },
    incomeEntities: ['erez'],
  },
  {
    key: 'erez_roi',
    label: 'ארז ורועי',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.12)',
    match: (partners) => {
      const e = partners.map(p => p.entity)
      return e.includes('erez_roi') || (e.includes('erez') && e.includes('roi'))
    },
    incomeEntities: ['erez', 'roi', 'erez_roi'],
  },
  {
    key: 'reuven_private',
    label: 'ראובן ברון — פרטי',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    match: (partners) => partners.some(p => p.entity === 'reuven_private'),
    incomeEntities: ['reuven_private'],
  },
  {
    key: 'reuven_company',
    label: 'ראובן ברון פיתוח וניהול',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    match: (partners) => partners.some(p => p.entity === 'reuven_company'),
    incomeEntities: ['reuven_company'],
  },
]

const ENTITY_META = {
  erez:           { label: 'ארז',         color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  roi:            { label: 'רועי',        color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  erez_roi:       { label: 'ארז ורועי',  color: '#818cf8', bg: 'rgba(129,140,248,0.15)' },
  reuven_private: { label: 'ראובן פרטי', color: '#22c55e', bg: 'rgba(34,197,94,0.15)'  },
  reuven_company: { label: 'חברה',        color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  external:       { label: 'חיצוני',      color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
}

const TYPE_META = {
  residential:        { label: 'מגורים',       color: '#22c55e' },
  commercial:         { label: 'עסקי',         color: '#f59e0b' },
  real_estate_abroad: { label: 'נדל"ן בחו"ל', color: '#38bdf8' },
  equity:             { label: 'מניות/חברה',   color: '#a78bfa' },
  land:               { label: 'קרקע',         color: '#94a3b8' },
}

const STATUS_META = {
  active:   { label: 'פעיל',   color: '#22c55e' },
  archived: { label: 'ארכיון', color: '#94a3b8' },
  sold:     { label: 'נמכר',   color: '#f87171' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FREQ_DIV = { monthly: 1, quarterly: 3, 'semi-annual': 6, annual: 12 }

// החזר הכנסה חודשית נטו בשקלים מרשומת income אחת
function incomeMonthlyILS(inc, fx) {
  const gross = inc.gross_amount
  const net   = inc.vat_type === 'included' ? gross / 1.18 : gross
  const monthly = net / (FREQ_DIV[inc.payment_frequency] || 1)
  return toILS(monthly, inc.currency || 'ILS', fx)
}

// הכנסה חודשית בשקלים של ישות אחת מנכס אחד
function entityMonthlyILS(income, partners, entity, fx) {
  return income.filter(i => i.is_active).reduce((sum, inc) => {
    const monthly = incomeMonthlyILS(inc, fx)
    let pct = 0
    if (inc.split_by_ownership) {
      const p = partners.find(p => p.entity === entity)
      pct = p ? p.percentage : 0
    } else {
      const split = (inc.splits || []).find(s => s.entity === entity)
      pct = split ? (split.percentage || 0) : 0
    }
    return sum + monthly * pct
  }, 0)
}

// הכנסה חודשית לרשימת ישויות (erez+roi ביחד)
function entitiesMonthlyILS(income, partners, entityList, fx) {
  return entityList.reduce((s, e) => s + entityMonthlyILS(income, partners, e, fx), 0)
}

function fmtILS(n) {
  if (!n || n === 0) return '—'
  return '₪' + Math.round(n).toLocaleString('he-IL')
}

function fmtOrig(n, currency) {
  if (!n) return ''
  const sym = { ILS: '₪', USD: '$', EUR: '€', HUF: 'HUF ', GBP: '£' }[currency] || currency + ' '
  return sym + Math.round(n).toLocaleString()
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('he-IL', { year: 'numeric', month: 'short' })
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ text, color }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 9px',
      borderRadius: 999, color, background: color + '22',
      letterSpacing: '0.3px', whiteSpace: 'nowrap',
    }}>{text}</span>
  )
}

// ─── SummaryBlock ─────────────────────────────────────────────────────────────

function SummaryBlock({ entity, assets, allIncome, allPartners, fx }) {
  const myAssets = assets.filter(a => entity.match(allPartners[a.id] || []))

  const totalMonthly = myAssets.reduce((sum, a) =>
    sum + entitiesMonthlyILS(allIncome[a.id] || [], allPartners[a.id] || [], entity.incomeEntities, fx)
  , 0)

  const totalValue = myAssets.reduce((sum, a) => {
    if (!a.estimated_value) return sum
    const pct = (allPartners[a.id] || [])
      .filter(p => entity.incomeEntities.includes(p.entity))
      .reduce((s, p) => s + p.percentage, 0)
    return sum + toILS(a.estimated_value, a.estimated_value_currency, fx) * pct
  }, 0)

  return (
    <div style={{
      flex: 1, minWidth: 200,
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${entity.color}33`,
      borderRadius: 14, padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: entity.color }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: entity.color, letterSpacing: '0.3px' }}>
          {entity.label}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginRight: 'auto' }}>
          {myAssets.length} נכסים
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>הכנסה חודשית</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
            {fmtILS(totalMonthly)}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>שווי חלק</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
            {fmtILS(totalValue)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── AssetCard ────────────────────────────────────────────────────────────────

function AssetCard({ asset, partners, income, entitySection, fx, onClick }) {
  const type   = TYPE_META[asset.asset_type] || {}
  const status = STATUS_META[asset.status]   || {}

  const internalPartners = partners.filter(p =>
    ['erez','roi','erez_roi','reuven_private','reuven_company'].includes(p.entity)
  )

  const myMonthly = entitiesMonthlyILS(
    income.filter(i => i.is_active),
    partners,
    entitySection.incomeEntities,
    fx
  )

  // אחוז הישות הנוכחית בנכס
  const myPct = partners
    .filter(p => entitySection.incomeEntities.includes(p.entity))
    .reduce((s,p) => s + p.percentage, 0)

  // שווי: אם יש estimated_value — משתמשים בו. אם לא — מחשבים מסך ההשקעות / האחוז
  const isILS = !asset.estimated_value_currency || asset.estimated_value_currency === 'ILS'
  const hasEstimate = !!asset.estimated_value
  const valueILS_total = hasEstimate
    ? toILS(asset.estimated_value, asset.estimated_value_currency || 'ILS', fx)
    : (() => {
        // סכם את כל הרכישות של הנכס (asset.purchases מגיע כ-prop נפרד בדשבורד — כאן אין לנו אותם,
        // אז נשתמש ב-asset._totalPurchasesILS שנחשב מחוץ)
        if (!asset._totalPurchasesILS || myPct <= 0) return 0
        return asset._totalPurchasesILS / myPct  // השקעה / אחוז = ערך כולל משוער
      })()
  const valueOrig = hasEstimate
    ? fmtOrig(asset.estimated_value, asset.estimated_value_currency || 'ILS')
    : null
  const impliedValue = !hasEstimate && valueILS_total > 0
  const myValueILS = myPct > 0 && myPct < 1 && valueILS_total
    ? fmtILS(valueILS_total * myPct)
    : null

  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 14, padding: '16px 18px',
        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'background 0.15s, border-color 0.15s, transform 0.12s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background  = 'rgba(255,255,255,0.09)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'
        e.currentTarget.style.transform   = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background  = 'rgba(255,255,255,0.05)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
        e.currentTarget.style.transform   = 'translateY(0)'
      }}
    >
      {/* שם + סוג */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'white', lineHeight: 1.35, marginBottom: 3 }}>
            {asset.name}
          </div>
          {asset.address_city && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              {asset.address_city}
              {asset.address_country !== 'ישראל' ? ` · ${asset.address_country}` : ''}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <Badge text={type.label} color={type.color} />
          {asset.status !== 'active' && <Badge text={status.label} color={status.color} />}
        </div>
      </div>

      {/* שותפים פנימיים */}
      {internalPartners.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {internalPartners.map((p, i) => {
            const m = ENTITY_META[p.entity]
            return (
              <span key={i} style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 999,
                background: m.bg, color: m.color, fontWeight: 600,
              }}>
                {m.label} {(p.percentage * 100).toFixed(2)}%
              </span>
            )
          })}
        </div>
      )}

      {/* הכנסה + שווי */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 }}>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>הכנסה חודשית</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: myMonthly > 0 ? 'white' : 'rgba(255,255,255,0.25)' }}>
            {myMonthly > 0 ? fmtILS(myMonthly) : 'אין'}
          </div>
        </div>
        {(valueOrig || impliedValue) && (
          <div style={{ textAlign: 'left' }}>
            {myValueILS ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: impliedValue ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.7)' }}>
                  {myValueILS}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 1 }}>
                  {impliedValue
                    ? `משוער מהשקעה (${Math.round(myPct*100)}%)`
                    : `מתוך ~${!isILS ? fmtILS(valueILS_total) : valueOrig}`}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>~{valueOrig}</div>
            )}
            {asset.updated_at && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                {fmtDate(asset.updated_at)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── EntitySection ────────────────────────────────────────────────────────────

function EntitySection({ entity, assets, allIncome, allPartners, typeFilter, statusFilter, fx, onCardClick }) {
  const filtered = assets.filter(a => {
    if (!entity.match(allPartners[a.id] || [])) return false
    if (typeFilter   && a.asset_type !== typeFilter)   return false
    if (statusFilter && a.status     !== statusFilter) return false
    return true
  })

  if (filtered.length === 0) return null

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 3, height: 20, borderRadius: 2, background: entity.color }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{entity.label}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{filtered.length} נכסים</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {filtered.map(asset => (
          <AssetCard
            key={asset.id + entity.key}
            asset={asset}
            partners={allPartners[asset.id] || []}
            income={allIncome[asset.id] || []}
            entitySection={entity}
            fx={fx}
            onClick={() => onCardClick(asset.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── FX Notice ───────────────────────────────────────────────────────────────

function FxNotice({ fx, fxDate }) {
  if (!fx) return null
  return (
    <div style={{
      fontSize: 10, color: 'rgba(255,255,255,0.2)',
      marginBottom: 20, textAlign: 'right',
    }}>
      שערי המרה{fxDate ? ` (${fxDate})` : ''}: $1 = ₪{fx.USD?.toFixed(2)} · €1 = ₪{fx.EUR?.toFixed(2)} · 100 HUF = ₪{(fx.HUF * 100)?.toFixed(2)}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Assets({ session }) {
  const navigate  = useNavigate()
  const userEmail = session?.user?.email || ''
  const isRoi     = userEmail === 'roy@barons.co.il'

  const [assets,      setAssets]   = useState([])
  const [allPartners, setPartners] = useState({})
  const [allIncome,   setIncome]   = useState({})
  const [loading,     setLoading]  = useState(true)
  const [error,       setError]    = useState(null)
  const [typeFilter,   setTypeFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('active')

  const { fx, date: fxDate } = useFxRates()

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [
          { data: assetsData,    error: e1 },
          { data: partnersData,  error: e2 },
          { data: incomeData,    error: e3 },
          { data: splitsData,    error: e4 },
          { data: purchasesData, error: e5 },
        ] = await Promise.all([
          supabase.from('assets').select('*').order('address_city'),
          supabase.from('asset_partners').select('*'),
          supabase.from('asset_income').select('*'),
          supabase.from('asset_income_splits').select('*'),
          supabase.from('asset_purchases').select('asset_id, amount, currency'),
        ])
        if (e1 || e2 || e3 || e4 || e5) throw e1 || e2 || e3 || e4 || e5

        const partnersMap = {}
        ;(partnersData || []).forEach(p => {
          if (!partnersMap[p.asset_id]) partnersMap[p.asset_id] = []
          partnersMap[p.asset_id].push(p)
        })

        const incomeMap = {}
        ;(incomeData || []).forEach(inc => {
          if (!incomeMap[inc.asset_id]) incomeMap[inc.asset_id] = []
          inc.splits = (splitsData || []).filter(s => s.income_id === inc.id)
          incomeMap[inc.asset_id].push(inc)
        })

        // חשב סך השקעות בשקלים לכל נכס (לאומדן ערך כשאין estimated_value)
        const FX_FALLBACK = { ILS:1, USD:3.72, EUR:4.05, HUF:0.0096, GBP:4.70 }
        const purchaseTotals = {}
        ;(purchasesData || []).forEach(p => {
          if (!p.amount) return
          const ils = p.amount * (FX_FALLBACK[p.currency] || 1)
          purchaseTotals[p.asset_id] = (purchaseTotals[p.asset_id] || 0) + ils
        })
        const assetsWithPurchases = (assetsData || []).map(a => ({
          ...a, _totalPurchasesILS: purchaseTotals[a.id] || 0
        }))
        setAssets(assetsWithPurchases)
        setPartners(partnersMap)
        setIncome(incomeMap)
      } catch (err) {
        setError('שגיאה בטעינת הנתונים')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // לרועי — רק סקשן erez_roi
  const visibleEntities = isRoi
    ? ENTITIES.filter(e => e.key === 'erez_roi')
    : ENTITIES

  const typeChips = [
    { value: '',                   label: 'כל הסוגים' },
    { value: 'residential',        label: 'מגורים' },
    { value: 'commercial',         label: 'עסקי' },
    { value: 'real_estate_abroad', label: 'נדל"ן בחו"ל' },
    { value: 'equity',             label: 'מניות/חברה' },
    { value: 'land',               label: 'קרקע' },
  ]

  const statusChips = [
    { value: 'active',   label: 'פעיל' },
    { value: '',         label: 'הכל' },
    { value: 'archived', label: 'ארכיון' },
    { value: 'sold',     label: 'נמכרו' },
  ]

  if (loading) return (
    <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>טוען נכסים...</div>
    </div>
  )

  if (error) return (
    <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#f87171', fontSize: 14 }}>{error}</div>
    </div>
  )

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .chip-btn {
          font-size:12px; font-weight:600; padding:5px 13px;
          border-radius:999px; border:1px solid rgba(255,255,255,0.12);
          background:transparent; color:rgba(255,255,255,0.45);
          cursor:pointer; font-family:Heebo,sans-serif;
          transition:all 0.15s; white-space:nowrap;
        }
        .chip-btn:hover  { background:rgba(255,255,255,0.08); color:white; }
        .chip-btn.active { background:rgba(59,130,246,0.2); border-color:#3b82f6; color:#93c5fd; }
        .add-btn {
          font-size:13px; font-weight:700; padding:8px 18px;
          border-radius:10px; border:none;
          background:linear-gradient(135deg,#3b82f6,#1d4ed8);
          color:white; cursor:pointer; font-family:Heebo,sans-serif;
          transition:opacity 0.15s;
        }
        .add-btn:hover { opacity:0.88; }
      `}</style>

      <div style={S.shell}>

                  {/* Header */}
          <BaronsHeader
            title="נכסים"
            subtitle="ניהול נכסים ופרויקטים"
            breadcrumbs={[{ label: 'נכסים', path: '/assets' }]}
            actions={!isRoi ? [{ label: '+ נכס חדש', onClick: () => navigate('/assets/new'), primary: true }] : []}
          />
          {/* Summary blocks */}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:8, animation:'fadeUp 0.4s 0.05s ease both', opacity:0 }}>
          {visibleEntities.map(entity => (
            <SummaryBlock
              key={entity.key}
              entity={entity}
              assets={assets}
              allIncome={allIncome}
              allPartners={allPartners}
              fx={fx}
            />
          ))}
        </div>

        {/* FX notice */}
        <div style={{ animation:'fadeUp 0.4s 0.08s ease both', opacity:0 }}>
          <FxNotice fx={fx} fxDate={fxDate} />
        </div>

        {/* Filters */}
        <div style={{ marginBottom:28, animation:'fadeUp 0.4s 0.1s ease both', opacity:0 }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
            {statusChips.map(c => (
              <button key={c.value} className={`chip-btn${statusFilter===c.value?' active':''}`}
                onClick={() => setStatusFilter(c.value)}>{c.label}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {typeChips.map(c => (
              <button key={c.value} className={`chip-btn${typeFilter===c.value?' active':''}`}
                onClick={() => setTypeFilter(c.value)}>{c.label}</button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div style={{ animation:'fadeUp 0.4s 0.15s ease both', opacity:0 }}>
          {visibleEntities.map(entity => (
            <EntitySection
              key={entity.key}
              entity={entity}
              assets={assets}
              allIncome={allIncome}
              allPartners={allPartners}
              typeFilter={typeFilter}
              statusFilter={statusFilter}
              fx={fx}
              onCardClick={id => navigate(`/assets/${id}`)}
            />
          ))}
        </div>

        {assets.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 0', color:'rgba(255,255,255,0.25)', fontSize:14 }}>
            אין נכסים עדיין. לחץ "+ נכס חדש" כדי להתחיל.
          </div>
        )}

      </div>
    </div>
  )
}

const S = {
  page:  { minHeight:'100vh', background:'linear-gradient(160deg,#0b1526 0%,#0f2a5c 60%,#0b1a3e 100%)', direction:'rtl', fontFamily:'Heebo,sans-serif', display:'flex', justifyContent:'center' },
  shell: { width:'100%', maxWidth:960, padding:'40px 20px 60px', boxSizing:'border-box' },
}
