import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'
import { supabase } from '../lib/supabase'
import { useFxRates } from '../lib/useFxRates'

const FALLBACK_FX = { ILS: 1, USD: 3.00, EUR: 3.47, HUF: 0.0097, GBP: 4.04 }   // עודכן 31/08/2026

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
  investment:         { label: 'השקעה',        color: '#06b6d4' },
  income:             { label: 'הכנסה',        color: '#14b8a6' },
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
    // ברירת מחדל: אם split_by_ownership הוא null/undefined, להתייחס כ-true
    // (חלוקה לפי שותפויות). זה תואם רשומות ישנות שנוצרו לפני שהשדה היה קיים.
    const splitByOwnership = inc.split_by_ownership !== false
    if (splitByOwnership) {
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

function fmtDateShort(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' })
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

function SummaryBlock({ entity, assets, allIncome, allPartners, fx, index = 0 }) {
  const myAssets = assets.filter(a => entity.match(allPartners[a.id] || []))

  const totalMonthly = myAssets.reduce((sum, a) =>
    sum + entitiesMonthlyILS(allIncome[a.id] || [], allPartners[a.id] || [], entity.incomeEntities, fx)
  , 0)

  const totalValue = myAssets.reduce((sum, a) => {
    // חלק האחוז של הישות הזו בנכס
    const pct = (allPartners[a.id] || [])
      .filter(p => entity.incomeEntities.includes(p.entity))
      .reduce((s, p) => s + p.percentage, 0)

    // לנכסי השקעה — שווי = סך כל ההשקעות (בלי תלות ב-estimated_value)
    if (a.asset_type === 'investment') {
      return sum + (a._totalInvestmentsILS || 0) * pct
    }
    // אחרת: לוגיקה זהה ל-AssetCard
    // 1) אם יש estimated_value → השתמש בו
    if (a.estimated_value) {
      return sum + toILS(a.estimated_value, a.estimated_value_currency, fx) * pct
    }
    // 2) אם אין — fallback לסך הרכישות (משוער מהשקעה).
    //    _totalPurchasesILS הוא חלק הישויות הפנימיות בלבד, אז כדי לקבל את
    //    שווי הנכס המלא צריך לחלק ב-myPct של אותן ישויות (כל הלא-חיצוניים).
    //    אז שווי החלק של הישות הספציפית = (purchases / internalPct) × pct.
    if (a._totalPurchasesILS && pct > 0) {
      const internalPct = (allPartners[a.id] || [])
        .filter(p => p.entity !== 'external')
        .reduce((s, p) => s + p.percentage, 0)
      if (internalPct > 0) {
        const fullValue = a._totalPurchasesILS / internalPct
        return sum + fullValue * pct
      }
    }
    return sum
  }, 0)

  return (
    <div
      className="assets-summary"
      style={{
        flex: '1 1 calc(50% - 6px)',
        maxWidth: 'calc(50% - 6px)',
        minWidth: 220,
        background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${entity.color}33`,
        borderRadius: 14, padding: '18px 20px',
        boxSizing: 'border-box',
        animationDelay: `${index * 60}ms`,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: entity.color }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: entity.color, letterSpacing: '0.3px' }}>
          {entity.label}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginRight: 'auto' }}>
          {myAssets.length} נכסים
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>הכנסה חודשית</div>
          <div style={{
            fontSize: 15, fontWeight: 700, color: 'white',
            whiteSpace: 'nowrap',
            direction: 'ltr', textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.01em',
          }}>
            {fmtILS(totalMonthly)}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>שווי חלק</div>
          <div style={{
            fontSize: 15, fontWeight: 700, color: 'white',
            whiteSpace: 'nowrap',
            direction: 'ltr', textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.01em',
          }}>
            {fmtILS(totalValue)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── AssetCard ────────────────────────────────────────────────────────────────

function AssetCard({ asset, partners, income, entitySection, fx, onClick, index = 0,
                     childCount = 0, heldViaName = null, isChild = false }) {
  const type   = TYPE_META[asset.asset_type] || {}
  const status = STATUS_META[asset.status]   || {}
  const isInvestment = asset.asset_type === 'investment'
  const isIncome     = asset.asset_type === 'income'
  // נכסים "מופשטים" — בלי כתובת/שווי. רק זרמי כסף.
  const isAbstract   = isInvestment || isIncome

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

  // שווי: לוגיקה שונה לנכסי השקעה
  let valueILS_total = 0
  let valueOrig = null
  let impliedValue = false
  let myValueILS = null
  let isILS = true

  if (isInvestment) {
    // נכס השקעה — שווי = סך כל ההשקעות (כבר בשקלים)
    valueILS_total = asset._totalInvestmentsILS || 0
    if (myPct > 0 && myPct < 1 && valueILS_total) {
      myValueILS = fmtILS(valueILS_total * myPct)
    }
  } else if (isIncome) {
    // נכס הכנסה — אין שווי, רק זרם חודשי. valueILS_total נשאר 0 ולא יוצג.
  } else {
    // לוגיקה קיימת לנכסי נדל"ן וכו'
    isILS = !asset.estimated_value_currency || asset.estimated_value_currency === 'ILS'
    const hasEstimate = !!asset.estimated_value
    // internalPct = סך אחוזי הישויות הפנימיות (כל מי שלא חיצוני).
    // _totalPurchasesILS מייצג רק את החלק שהישויות הפנימיות שילמו,
    // אז כדי לקבל את שווי הנכס המלא צריך לחלק ב-internalPct (לא ב-myPct).
    const internalPct = partners
      .filter(p => p.entity !== 'external')
      .reduce((s, p) => s + p.percentage, 0)
    valueILS_total = hasEstimate
      ? toILS(asset.estimated_value, asset.estimated_value_currency || 'ILS', fx)
      : (() => {
          if (!asset._totalPurchasesILS || internalPct <= 0) return 0
          return asset._totalPurchasesILS / internalPct
        })()
    valueOrig = hasEstimate
      ? fmtOrig(asset.estimated_value, asset.estimated_value_currency || 'ILS')
      : null
    impliedValue = !hasEstimate && valueILS_total > 0
    myValueILS = myPct > 0 && myPct < 1 && valueILS_total
      ? fmtILS(valueILS_total * myPct)
      : null
  }

  return (
    <div
      onClick={onClick}
      className={`assets-card assets-press${childCount > 0 ? ' assets-holding' : ''}${isChild ? ' assets-child' : ''}`}
      style={{
        borderRadius: 14, padding: '16px 18px',
        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10,
        animationDelay: `${Math.min(index * 50, 500)}ms`,
      }}
    >
      {/* שם + סוג */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'white', lineHeight: 1.35, marginBottom: 3 }}>
            {asset.name}
          </div>
          {/* כתובת — לא מציגים לנכסי השקעה / הכנסה (להם אין כתובת) */}
          {!isAbstract && asset.address_city && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
              {asset.address_city}
              {asset.address_country !== 'ישראל' ? ` · ${asset.address_country}` : ''}
            </div>
          )}
          {/* בנכס השקעה — מציגים מספר השקעות פעילות */}
          {isInvestment && asset._investmentCount > 0 && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
              {asset._investmentCount} {asset._investmentCount === 1 ? 'השקעה' : 'השקעות'}
            </div>
          )}
          {/* בנכס הכנסה — מציגים מספר הכנסות פעילות */}
          {isIncome && asset._activeIncomeCount > 0 && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
              {asset._activeIncomeCount} {asset._activeIncomeCount === 1 ? 'הכנסה פעילה' : 'הכנסות פעילות'}
            </div>
          )}
          {/* חברת החזקות — מספר הנכסים שתחתיה */}
          {childCount > 0 && (
            <div style={{ fontSize: 11, color: '#fcd34d', marginTop: 2 }}>
              מחזיקה {childCount} {childCount === 1 ? 'נכס' : 'נכסים'}
            </div>
          )}
          {/* נכס בת — דרך איזו חברה הוא מוחזק */}
          {heldViaName && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              דרך {heldViaName}
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

      {/* הכנסה / עדכון אחרון + שווי */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 }}>
        <div>
          {isInvestment ? (
            <>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>עדכון אחרון</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: asset._lastBalanceDate ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)' }}>
                {asset._lastBalanceDate ? fmtDateShort(asset._lastBalanceDate) : '—'}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>הכנסה חודשית</div>
              <div style={{
                fontSize: isIncome ? 17 : 15,
                fontWeight: 700,
                color: myMonthly > 0
                  ? (isIncome ? '#5eead4' : 'white')
                  : 'rgba(255,255,255,0.52)',
              }}>
                {myMonthly > 0 ? fmtILS(myMonthly) : 'אין'}
              </div>
            </>
          )}
        </div>
        {/* שווי — לא מוצג ל-income (אין שווי לקצבה) */}
        {!isIncome && isInvestment && valueILS_total > 0 ? (
          <div style={{ textAlign: 'left' }}>
            {myValueILS ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#67e8f9' }}>
                  {myValueILS}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
                  מתוך {fmtILS(valueILS_total)} ({Math.round(myPct*100)}%)
                </div>
              </>
            ) : (
              <div style={{ fontSize: 14, fontWeight: 700, color: '#67e8f9' }}>
                {fmtILS(valueILS_total)}
              </div>
            )}
          </div>
        ) : (valueOrig || impliedValue) && (
          <div style={{ textAlign: 'left' }}>
            {myValueILS ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: impliedValue ? 'rgba(255,255,255,0.68)' : 'rgba(255,255,255,0.7)' }}>
                  {myValueILS}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
                  {impliedValue
                    ? `משוער מהשקעה (${Math.round(myPct*100)}%)`
                    : `מתוך ~${!isILS ? fmtILS(valueILS_total) : valueOrig}`}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>~{valueOrig}</div>
            )}
            {asset.updated_at && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.48)', marginTop: 2 }}>
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

function EntitySection({ entity, assets, allIncome, allPartners, typeFilter, statusFilter, fx, onCardClick, startIndex = 0 }) {
  const filtered = assets.filter(a => {
    if (!entity.match(allPartners[a.id] || [])) return false
    if (typeFilter   && a.asset_type !== typeFilter)   return false
    if (statusFilter && a.status     !== statusFilter) return false
    return true
  })

  if (filtered.length === 0) return null

  // ─── בניית היררכיה: נכסי בת מקובצים תחת חברת ההחזקות שלהם ─────────────────
  // נכס בת מקונן רק אם נכס האם עצמו עבר את הפילטרים. אחרת הוא מוצג עצמאית,
  // כך שסינון לפי סוג (למשל "נדל\"ן בחו\"ל") לא מעלים נכסים.
  const byId        = new Map(filtered.map(a => [a.id, a]))
  const childrenOf  = new Map()
  filtered.forEach(a => {
    if (!a.parent_asset_id || !byId.has(a.parent_asset_id)) return
    const list = childrenOf.get(a.parent_asset_id) || []
    list.push(a)
    childrenOf.set(a.parent_asset_id, list)
  })
  const topLevel = filtered.filter(a => !(a.parent_asset_id && byId.has(a.parent_asset_id)))

  // אינדקס רץ ל-stagger — נשמר רציף גם כשיש קינון
  let cursor = startIndex
  const nextIndex = () => cursor++

  function renderCard(asset, extra = {}) {
    return (
      <AssetCard
        key={asset.id + entity.key}
        asset={asset}
        partners={allPartners[asset.id] || []}
        income={allIncome[asset.id] || []}
        entitySection={entity}
        fx={fx}
        onClick={() => onCardClick(asset.id)}
        index={nextIndex()}
        {...extra}
      />
    )
  }

  const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 3, height: 20, borderRadius: 2, background: entity.color }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{entity.label}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{filtered.length} נכסים</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(() => {
          const blocks = []
          let plain = []

          const flushPlain = () => {
            if (plain.length === 0) return
            blocks.push(
              <div key={`plain-${blocks.length}`} style={gridStyle}>
                {plain}
              </div>
            )
            plain = []
          }

          topLevel.forEach(asset => {
            const kids = childrenOf.get(asset.id)
            if (!kids || kids.length === 0) {
              plain.push(renderCard(asset))
              return
            }
            flushPlain()
            blocks.push(
              <div key={`grp-${asset.id}`} className="assets-group">
                {renderCard(asset, { childCount: kids.length })}
                <div className="assets-group-children">
                  <div style={gridStyle}>
                    {kids.map(kid => renderCard(kid, { heldViaName: asset.name, isChild: true }))}
                  </div>
                </div>
              </div>
            )
          })

          flushPlain()
          return blocks
        })()}
      </div>
    </div>
  )
}

// Count assets matching an entity & filters (used for global stagger index)
function countEntityMatches(entity, assets, allPartners, typeFilter, statusFilter) {
  return assets.filter(a => {
    if (!entity.match(allPartners[a.id] || [])) return false
    if (typeFilter   && a.asset_type !== typeFilter)   return false
    if (statusFilter && a.status     !== statusFilter) return false
    return true
  }).length
}

// ─── FX Notice ───────────────────────────────────────────────────────────────

function FxNotice({ fx, fxDate }) {
  if (!fx) return null
  return (
    <div style={{
      fontSize: 10, color: 'rgba(255,255,255,0.48)',
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
          { data: assetsData,      error: e1 },
          { data: partnersData,    error: e2 },
          { data: incomeData,      error: e3 },
          { data: splitsData,      error: e4 },
          { data: purchasesData,   error: e5 },
          { data: investmentsData, error: e6 },
        ] = await Promise.all([
          supabase.from('assets').select('*').order('address_city'),
          supabase.from('asset_partners').select('*'),
          supabase.from('asset_income').select('*'),
          supabase.from('asset_income_splits').select('*'),
          supabase.from('asset_purchases').select('asset_id, amount, currency'),
          supabase.from('asset_investments').select('asset_id, amount, currency, balance_date'),
        ])
        if (e1 || e2 || e3 || e4 || e5 || e6) throw e1 || e2 || e3 || e4 || e5 || e6

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
        const FX_FALLBACK = { ILS:1, USD:3.00, EUR:3.47, HUF:0.0097, GBP:4.04 }   // עודכן 31/08/2026
        const purchaseTotals = {}
        ;(purchasesData || []).forEach(p => {
          if (!p.amount) return
          const ils = p.amount * (FX_FALLBACK[p.currency] || 1)
          purchaseTotals[p.asset_id] = (purchaseTotals[p.asset_id] || 0) + ils
        })

        // חשב סך השקעות (investments) בשקלים + תאריך עדכון אחרון + מספר השקעות לכל נכס
        const investmentTotals = {}
        const investmentLastDate = {}
        const investmentCount = {}
        ;(investmentsData || []).forEach(inv => {
          if (!inv.amount) return
          const ils = inv.amount * (FX_FALLBACK[inv.currency] || 1)
          investmentTotals[inv.asset_id] = (investmentTotals[inv.asset_id] || 0) + ils
          investmentCount[inv.asset_id]  = (investmentCount[inv.asset_id]  || 0) + 1
          if (inv.balance_date) {
            const cur = investmentLastDate[inv.asset_id]
            if (!cur || new Date(inv.balance_date) > new Date(cur)) {
              investmentLastDate[inv.asset_id] = inv.balance_date
            }
          }
        })

        // חשב מספר הכנסות פעילות לכל נכס (משמש לתצוגה בכרטיסי 'income')
        const activeIncomeCount = {}
        ;(incomeData || []).forEach(inc => {
          if (!inc.is_active) return
          activeIncomeCount[inc.asset_id] = (activeIncomeCount[inc.asset_id] || 0) + 1
        })

        const assetsWithExtras = (assetsData || []).map(a => ({
          ...a,
          _totalPurchasesILS:   purchaseTotals[a.id]     || 0,
          _totalInvestmentsILS: investmentTotals[a.id]   || 0,
          _lastBalanceDate:     investmentLastDate[a.id] || null,
          _investmentCount:     investmentCount[a.id]    || 0,
          _activeIncomeCount:   activeIncomeCount[a.id]  || 0,
        }))
        setAssets(assetsWithExtras)
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
    { value: 'investment',         label: 'השקעה' },
    { value: 'income',             label: 'הכנסה' },
  ]

  const statusChips = [
    { value: 'active',   label: 'פעיל' },
    { value: '',         label: 'הכל' },
    { value: 'archived', label: 'ארכיון' },
    { value: 'sold',     label: 'נמכרו' },
  ]

  if (loading) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>טוען נכסים...</div>
    </div>
  )

  if (error) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#f87171', fontSize: 14 }}>{error}</div>
    </div>
  )

  // Build a running index across sections so AssetCards stagger globally
  let runningIndex = 0
  const sectionIndexes = visibleEntities.map(entity => {
    const start = runningIndex
    runningIndex += countEntityMatches(entity, assets, allPartners, typeFilter, statusFilter)
    return start
  })

  return (
    <div style={S.page}>
      <style>{ASSETS_STYLE}</style>

      {/* Header — full width, sticky */}
      <BaronsHeader
        title="נכסים"
        subtitle="ניהול נכסים ופרויקטים"
        breadcrumbs={[{ label: 'נכסים', path: '/assets' }]}
        actions={!isRoi ? [{ label: '+ נכס חדש', onClick: () => navigate('/assets/new'), primary: true }] : []}
      />

      <div style={S.shell}>
        {/* Summary blocks */}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:8 }}>
          {visibleEntities.map((entity, i) => (
            <SummaryBlock
              key={entity.key}
              entity={entity}
              assets={assets}
              allIncome={allIncome}
              allPartners={allPartners}
              fx={fx}
              index={i}
            />
          ))}
        </div>

        {/* FX notice */}
        <div className="assets-fade-up" style={{ animationDelay:'240ms' }}>
          <FxNotice fx={fx} fxDate={fxDate} />
        </div>

        {/* Filters */}
        <div className="assets-fade-up" style={{ marginBottom:28, animationDelay:'300ms' }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
            {statusChips.map(c => (
              <button key={c.value} className={`assets-chip assets-press${statusFilter===c.value?' active':''}`}
                onClick={() => setStatusFilter(c.value)}>{c.label}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {typeChips.map(c => (
              <button key={c.value} className={`assets-chip assets-press${typeFilter===c.value?' active':''}`}
                onClick={() => setTypeFilter(c.value)}>{c.label}</button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div>
          {visibleEntities.map((entity, i) => (
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
              startIndex={sectionIndexes[i]}
            />
          ))}
        </div>

        {assets.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 0', color:'rgba(255,255,255,0.52)', fontSize:14 }}>
            אין נכסים עדיין. לחץ "+ נכס חדש" כדי להתחיל.
          </div>
        )}

      </div>
    </div>
  )
}

const S = {
  page:  { minHeight:'100vh', background:'linear-gradient(160deg,#101a2e 0%,#152e62 60%,#0f1f47 100%)', direction:'rtl', fontFamily:"'Open Sans Hebrew', 'Open Sans', sans-serif" },
  shell: { width:'100%', maxWidth:960, margin:'0 auto', padding:'24px 20px 60px', boxSizing:'border-box' },
}

// ─── Emil Kowalski polish styles ──────────────────────────────────────────────

const ASSETS_STYLE = `
  :root {
    --ease-out: cubic-bezier(0.23,1,0.32,1);
    --ease-in-out: cubic-bezier(0.77,0,0.175,1);
    --ease-drawer: cubic-bezier(0.32,0.72,0,1);
    --ease-spring: cubic-bezier(0.34,1.56,0.64,1);
  }

  @keyframes assets-fade-up {
    from { opacity:0; transform:translateY(10px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes assets-card-in {
    from { opacity:0; transform:translateY(12px) scale(0.985); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  @keyframes assets-summary-in {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:translateY(0); }
  }

  .assets-fade-up {
    animation: assets-fade-up 420ms var(--ease-out) both;
  }

  /* Tactile press feedback */
  .assets-press {
    transition: transform 160ms var(--ease-out);
  }
  .assets-press:active {
    transform: scale(0.97);
  }

  /* Summary blocks */
  .assets-summary {
    animation: assets-summary-in 440ms var(--ease-out) both;
    transition:
      background-color 220ms var(--ease-out),
      border-color 220ms var(--ease-out);
  }

  /* Asset cards */
  .assets-card {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    animation: assets-card-in 460ms var(--ease-out) both;
    transition:
      background-color 220ms var(--ease-out),
      border-color 220ms var(--ease-out),
      transform 220ms var(--ease-out),
      box-shadow 220ms var(--ease-out);
    will-change: transform;
  }
  /* Press gate: when press overrides, still allow active scale */
  .assets-card.assets-press:active {
    transform: translateY(0) scale(0.985);
  }

  @media (hover: hover) and (pointer: fine) {
    .assets-card:hover {
      background: rgba(255,255,255,0.095);
      border-color: rgba(255,255,255,0.2);
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(0,0,0,0.28);
    }
  }

  /* Holding group — חברת החזקות והנכסים שתחתיה */
  .assets-group {
    border: 1px solid rgba(245,158,11,0.18);
    background: rgba(245,158,11,0.04);
    border-radius: 16px;
    padding: 12px;
  }
  .assets-group .assets-holding {
    border-color: rgba(245,158,11,0.34);
    background: rgba(245,158,11,0.07);
  }
  .assets-group-children {
    margin-top: 10px;
    padding-top: 12px;
    padding-inline-start: 14px;
    border-top: 1px solid rgba(245,158,11,0.14);
    border-inline-start: 2px solid rgba(245,158,11,0.22);
  }
  @media (max-width: 520px) {
    .assets-group { padding: 10px; }
    .assets-group-children { padding-inline-start: 8px; }
  }

  /* Chip buttons (filters) */
  .assets-chip {
    font-size: 12px;
    font-weight: 600;
    padding: 5px 13px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: transparent;
    color: rgba(255,255,255,0.68);
    cursor: pointer;
    font-family: 'Open Sans Hebrew', 'Open Sans', sans-serif;
    white-space: nowrap;
    transition:
      background-color 200ms var(--ease-out),
      border-color 200ms var(--ease-out),
      color 200ms var(--ease-out),
      transform 160ms var(--ease-out),
      box-shadow 200ms var(--ease-out);
  }
  @media (hover: hover) and (pointer: fine) {
    .assets-chip:hover {
      background: rgba(255,255,255,0.08);
      color: white;
      border-color: rgba(255,255,255,0.18);
    }
  }
  .assets-chip:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.35);
  }
  .assets-chip.active {
    background: rgba(59,130,246,0.2);
    border-color: #3b82f6;
    color: #93c5fd;
  }

  /* Add button (primary) */
  .assets-btn-primary {
    font-size: 13px;
    font-weight: 700;
    padding: 8px 18px;
    border-radius: 10px;
    border: none;
    background: linear-gradient(135deg,#3b82f6,#1d4ed8);
    color: white;
    cursor: pointer;
    font-family: 'Open Sans Hebrew', 'Open Sans', sans-serif;
    transition:
      filter 200ms var(--ease-out),
      transform 160ms var(--ease-out),
      box-shadow 220ms var(--ease-out);
  }
  @media (hover: hover) and (pointer: fine) {
    .assets-btn-primary:hover {
      filter: brightness(1.1);
      box-shadow: 0 8px 22px rgba(59,130,246,0.3);
    }
  }
  .assets-btn-primary:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px rgba(59,130,246,0.35);
  }

  /* Inputs (if any) */
  .assets-input {
    transition:
      border-color 220ms var(--ease-out),
      box-shadow 220ms var(--ease-out),
      background-color 220ms var(--ease-out);
  }
  .assets-input:focus {
    outline: none;
    border-color: rgba(96,165,250,0.5);
    box-shadow: 0 0 0 4px rgba(59,130,246,0.18);
    background: rgba(255,255,255,0.08);
  }

  @media (prefers-reduced-motion: reduce) {
    .assets-card,
    .assets-summary,
    .assets-fade-up {
      animation: none !important;
    }
    .assets-press, .assets-press:active {
      transition: none !important;
      transform: none !important;
    }
    .assets-card, .assets-chip, .assets-btn-primary {
      transition-duration: 120ms !important;
    }
    @media (hover: hover) and (pointer: fine) {
      .assets-card:hover { transform: none; }
    }
  }
`
