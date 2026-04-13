// useFxRates.js — hook לשערי חליפין חיים
// API: frankfurter.app — חינמי, ללא key, מבוסס ECB
// מחזיר כמה ILS שווה 1 יחידה של כל מטבע

import { useState, useEffect } from 'react'

const FALLBACK_FX = { ILS: 1, USD: 3.72, EUR: 4.05, HUF: 0.0096, GBP: 4.70 }
const CACHE_KEY   = 'barons_fx_cache'
const CACHE_TTL   = 1000 * 60 * 60 * 4  // 4 שעות

export function useFxRates() {
  const [fx,      setFx]      = useState(FALLBACK_FX)
  const [loading, setLoading] = useState(true)
  const [date,    setDate]    = useState(null)

  useEffect(() => {
    async function load() {
      // בדוק cache
      try {
        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null')
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
          setFx(cached.fx)
          setDate(cached.date)
          setLoading(false)
          return
        }
      } catch {}

      // שלוף מ-API
      try {
        // frankfurter מחזיר: כמה USD/EUR/HUF/GBP שווה 1 ILS
        // אנחנו צריכים ההפך: כמה ILS שווה 1 USD/EUR וכו'
        const res  = await fetch('https://api.frankfurter.app/latest?from=ILS&to=USD,EUR,HUF,GBP')
        const data = await res.json()
        // data.rates = { USD: 0.268, EUR: 0.247, HUF: 104.2, GBP: 0.213 }
        // הופכים: 1/rate = כמה ILS שווה 1 מטבע זר
        const rates = data.rates
        const newFx = {
          ILS: 1,
          USD: 1 / rates.USD,
          EUR: 1 / rates.EUR,
          HUF: 1 / rates.HUF,
          GBP: 1 / rates.GBP,
        }
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ fx: newFx, date: data.date, ts: Date.now() }))
        setFx(newFx)
        setDate(data.date)
      } catch {
        // fallback לערכים hardcoded אם ה-API נפל
        console.warn('FX API failed, using fallback rates')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { fx, loading, date }
}
