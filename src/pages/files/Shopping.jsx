import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'
import { supabase } from '../lib/supabase'

const PRIORITY_COLORS = { urgent: '#ef4444', regular: '#1d4ed8', daily: '#64748b' }
const PRIORITY_ORDER  = { urgent: 0, regular: 1, daily: 2 }

// ─── SVG אייקונים לפי פריט ────────────────────────────────────────────────────
const ITEM_ICONS = {
  חלב: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="13" y="8" width="18" height="28" rx="4" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="1.5"/><rect x="16" y="4" width="12" height="6" rx="2" fill="#bae6fd"/><rect x="16" y="16" width="12" height="8" fill="#fff" opacity=".6"/></svg>`,
  קוטג: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="14" width="24" height="20" rx="4" fill="#f0fdf4" stroke="#86efac" stroke-width="1.5"/><ellipse cx="22" cy="14" rx="12" ry="4" fill="#bbf7d0"/><circle cx="16" cy="22" r="2" fill="#4ade80" opacity=".5"/><circle cx="22" cy="25" r="2" fill="#4ade80" opacity=".5"/><circle cx="28" cy="21" r="2" fill="#4ade80" opacity=".5"/></svg>`,
  גבינה: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><polygon points="6,34 22,10 38,34" fill="#fef08a" stroke="#facc15" stroke-width="1.5"/><circle cx="18" cy="28" r="2.5" fill="#fde047"/><circle cx="26" cy="24" r="2" fill="#fde047"/><circle cx="22" cy="31" r="1.5" fill="#fde047"/></svg>`,
  יוגורט: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="12" width="20" height="22" rx="4" fill="#fdf4ff" stroke="#d8b4fe" stroke-width="1.5"/><rect x="12" y="12" width="20" height="7" rx="4" fill="#e9d5ff"/><path d="M16 22 Q22 28 28 22" stroke="#a855f7" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
  חמאה: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="16" width="28" height="16" rx="3" fill="#fef9c3" stroke="#fde047" stroke-width="1.5"/><rect x="8" y="16" width="28" height="5" rx="3" fill="#fde047"/></svg>`,
  ביצים: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><ellipse cx="16" cy="24" rx="7" ry="9" fill="#fef9c3" stroke="#fde047" stroke-width="1.5"/><ellipse cx="29" cy="24" rx="7" ry="9" fill="#fef9c3" stroke="#fde047" stroke-width="1.5"/><ellipse cx="16" cy="25" rx="3" ry="3.5" fill="#fb923c" opacity=".4"/><ellipse cx="29" cy="25" rx="3" ry="3.5" fill="#fb923c" opacity=".4"/></svg>`,
  ביצה: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="24" rx="10" ry="13" fill="#fef9c3" stroke="#fde047" stroke-width="1.5"/><ellipse cx="22" cy="25" rx="5" ry="5" fill="#fb923c" opacity=".5"/></svg>`,
  שמנת: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="13" y="10" width="18" height="24" rx="4" fill="#fff7ed" stroke="#fed7aa" stroke-width="1.5"/><rect x="15" y="8" width="14" height="5" rx="2" fill="#fdba74"/></svg>`,
  מעדן: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="11" y="12" width="22" height="22" rx="4" fill="#fdf4ff" stroke="#d8b4fe" stroke-width="1.5"/><rect x="11" y="12" width="22" height="7" rx="4" fill="#c084fc"/><rect x="11" y="19" width="22" height="7" fill="#e9d5ff"/><rect x="11" y="26" width="22" height="8" rx="4" fill="#f3e8ff"/></svg>`,
  לחם: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="20" width="30" height="16" rx="5" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/><ellipse cx="22" cy="20" rx="15" ry="8" fill="#fde68a" stroke="#f59e0b" stroke-width="1.5"/></svg>`,
  פיתה: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="24" rx="16" ry="10" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/><ellipse cx="22" cy="24" rx="10" ry="5" fill="#fde68a" opacity=".5"/></svg>`,
  חלה: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="26" rx="15" ry="8" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/><path d="M10 24 Q16 18 22 24 Q28 18 34 24" stroke="#f59e0b" stroke-width="2" fill="none"/></svg>`,
  בגט: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="19" width="34" height="10" rx="5" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/><line x1="12" y1="19" x2="10" y2="29" stroke="#f59e0b" stroke-width="1" opacity=".6"/><line x1="20" y1="19" x2="18" y2="29" stroke="#f59e0b" stroke-width="1" opacity=".6"/><line x1="28" y1="19" x2="26" y2="29" stroke="#f59e0b" stroke-width="1" opacity=".6"/></svg>`,
  עגבניה: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="26" r="13" fill="#fca5a5" stroke="#ef4444" stroke-width="1.5"/><path d="M18 13 Q22 8 26 13" stroke="#4ade80" stroke-width="2" fill="none"/><line x1="22" y1="8" x2="22" y2="14" stroke="#4ade80" stroke-width="2"/></svg>`,
  עגבניות: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="26" r="13" fill="#fca5a5" stroke="#ef4444" stroke-width="1.5"/><path d="M18 13 Q22 8 26 13" stroke="#4ade80" stroke-width="2" fill="none"/><line x1="22" y1="8" x2="22" y2="14" stroke="#4ade80" stroke-width="2"/></svg>`,
  מלפפון: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="24" rx="8" ry="14" fill="#bbf7d0" stroke="#4ade80" stroke-width="1.5"/><line x1="22" y1="12" x2="22" y2="36" stroke="#4ade80" stroke-width="1" opacity=".4"/><line x1="16" y1="18" x2="28" y2="18" stroke="#4ade80" stroke-width="1" opacity=".4"/><line x1="15" y1="24" x2="29" y2="24" stroke="#4ade80" stroke-width="1" opacity=".4"/><line x1="16" y1="30" x2="28" y2="30" stroke="#4ade80" stroke-width="1" opacity=".4"/></svg>`,
  גזר: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M22 36 Q14 24 18 12 Q22 8 26 12 Q30 24 22 36Z" fill="#fb923c" stroke="#ea580c" stroke-width="1.5"/><path d="M20 10 Q18 4 14 6" stroke="#4ade80" stroke-width="1.5" fill="none"/><path d="M24 10 Q26 4 30 6" stroke="#4ade80" stroke-width="1.5" fill="none"/></svg>`,
  בצל: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="26" rx="13" ry="11" fill="#fef9c3" stroke="#facc15" stroke-width="1.5"/><path d="M16 18 Q22 10 28 18" fill="#fef9c3" stroke="#facc15" stroke-width="1.5"/></svg>`,
  שום: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="26" rx="10" ry="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/><path d="M18 16 Q22 8 26 16" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/><line x1="22" y1="8" x2="22" y2="14" stroke="#86efac" stroke-width="2"/></svg>`,
  פלפל: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M22 36 Q10 30 12 18 Q14 8 22 10 Q30 8 32 18 Q34 30 22 36Z" fill="#fca5a5" stroke="#ef4444" stroke-width="1.5"/><line x1="22" y1="8" x2="22" y2="12" stroke="#4ade80" stroke-width="2"/></svg>`,
  חסה: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="26" rx="15" ry="11" fill="#bbf7d0" stroke="#4ade80" stroke-width="1.5"/><path d="M12 22 Q17 18 22 22 Q27 18 32 22" stroke="#16a34a" stroke-width="1.5" fill="none"/></svg>`,
  ברוקולי: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="20" r="7" fill="#4ade80" stroke="#16a34a" stroke-width="1"/><circle cx="28" cy="20" r="7" fill="#4ade80" stroke="#16a34a" stroke-width="1"/><circle cx="22" cy="16" r="7" fill="#22c55e" stroke="#16a34a" stroke-width="1"/><rect x="20" y="26" width="4" height="10" rx="2" fill="#16a34a"/></svg>`,
  תפוחאדמה: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="24" rx="13" ry="11" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/><circle cx="16" cy="20" r="1.5" fill="#d97706" opacity=".4"/><circle cx="27" cy="26" r="1.5" fill="#d97706" opacity=".4"/></svg>`,
  תפוח: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M22 36 Q8 30 10 18 Q12 8 22 10 Q32 8 34 18 Q36 30 22 36Z" fill="#fca5a5" stroke="#ef4444" stroke-width="1.5"/><path d="M22 10 Q24 4 28 6" stroke="#4ade80" stroke-width="1.5" fill="none"/><line x1="22" y1="6" x2="22" y2="11" stroke="#4ade80" stroke-width="1.5"/></svg>`,
  בננה: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M8 30 Q12 10 30 8 Q36 8 36 14 Q36 20 18 28 Q12 30 8 30Z" fill="#fef08a" stroke="#facc15" stroke-width="1.5"/></svg>`,
  תות: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M22 36 Q10 28 12 18 Q14 10 22 12 Q30 10 32 18 Q34 28 22 36Z" fill="#fca5a5" stroke="#ef4444" stroke-width="1.5"/><circle cx="18" cy="22" r="1" fill="white" opacity=".7"/><circle cx="24" cy="19" r="1" fill="white" opacity=".7"/></svg>`,
  אבוקדו: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="24" rx="11" ry="15" fill="#bbf7d0" stroke="#4ade80" stroke-width="1.5"/><ellipse cx="22" cy="26" rx="6" ry="8" fill="#78350f" opacity=".5"/></svg>`,
  מנגו: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M22 38 Q8 30 10 18 Q12 8 22 10 Q34 8 34 22 Q34 34 22 38Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5"/></svg>`,
  ענבים: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="20" r="5" fill="#c4b5fd" stroke="#8b5cf6" stroke-width="1"/><circle cx="28" cy="20" r="5" fill="#c4b5fd" stroke="#8b5cf6" stroke-width="1"/><circle cx="22" cy="28" r="5" fill="#a78bfa" stroke="#8b5cf6" stroke-width="1"/><circle cx="14" cy="30" r="4" fill="#c4b5fd" stroke="#8b5cf6" stroke-width="1"/><circle cx="30" cy="30" r="4" fill="#c4b5fd" stroke="#8b5cf6" stroke-width="1"/></svg>`,
  עוף: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="26" rx="13" ry="10" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/><path d="M22 16 Q28 12 32 16 Q30 20 22 20Z" fill="#fef3c7" stroke="#d97706" stroke-width="1"/><circle cx="30" cy="14" r="2" fill="#fca5a5"/></svg>`,
  פרגית: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="26" rx="13" ry="10" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/><path d="M22 16 Q28 12 32 16 Q30 20 22 20Z" fill="#fef3c7" stroke="#d97706" stroke-width="1"/><circle cx="30" cy="14" r="2" fill="#fca5a5"/></svg>`,
  בשר: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M8 28 Q10 16 22 14 Q34 12 36 24 Q34 34 22 34 Q10 36 8 28Z" fill="#fca5a5" stroke="#ef4444" stroke-width="1.5"/><path d="M14 20 Q22 18 30 22" stroke="#f87171" stroke-width="2" fill="none" opacity=".5"/></svg>`,
  סטייק: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M8 28 Q10 16 22 14 Q34 12 36 24 Q34 34 22 34 Q10 36 8 28Z" fill="#fca5a5" stroke="#ef4444" stroke-width="1.5"/></svg>`,
  דג: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M36 22 Q28 12 14 18 Q8 22 14 26 Q28 32 36 22Z" fill="#bae6fd" stroke="#38bdf8" stroke-width="1.5"/><path d="M36 22 L42 16 L42 28 Z" fill="#7dd3fc" stroke="#38bdf8" stroke-width="1"/><circle cx="16" cy="21" r="2" fill="#0ea5e9"/></svg>`,
  סלמון: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M36 22 Q28 12 14 18 Q8 22 14 26 Q28 32 36 22Z" fill="#fca5a5" stroke="#f87171" stroke-width="1.5"/><path d="M36 22 L42 16 L42 28 Z" fill="#fca5a5" stroke="#f87171" stroke-width="1"/><circle cx="16" cy="21" r="2" fill="#ef4444"/></svg>`,
  טונה: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="16" width="28" height="16" rx="8" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.5"/><ellipse cx="22" cy="16" rx="14" ry="4" fill="#7dd3fc"/></svg>`,
  קמח: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="10" width="20" height="26" rx="3" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/><rect x="14" y="20" width="16" height="8" rx="2" fill="#e2e8f0"/></svg>`,
  סוכר: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="10" width="20" height="26" rx="3" fill="#fff7ed" stroke="#fed7aa" stroke-width="1.5"/><rect x="14" y="20" width="16" height="8" rx="2" fill="#fde68a"/></svg>`,
  מלח: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="12" width="16" height="24" rx="3" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/><rect x="16" y="10" width="12" height="5" rx="2" fill="#94a3b8"/></svg>`,
  אורז: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="10" width="20" height="26" rx="3" fill="#f0fdf4" stroke="#86efac" stroke-width="1.5"/><ellipse cx="18" cy="22" rx="2" ry="3" fill="#4ade80" opacity=".5"/><ellipse cx="22" cy="20" rx="2" ry="3" fill="#4ade80" opacity=".5"/><ellipse cx="26" cy="22" rx="2" ry="3" fill="#4ade80" opacity=".5"/><ellipse cx="20" cy="27" rx="2" ry="3" fill="#4ade80" opacity=".5"/><ellipse cx="24" cy="27" rx="2" ry="3" fill="#4ade80" opacity=".5"/></svg>`,
  פסטה: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M12 16 Q22 12 32 16" stroke="#fde68a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M10 22 Q22 18 34 22" stroke="#fde68a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M12 28 Q22 24 32 28" stroke="#fde68a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  שמן: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="14" width="16" height="22" rx="4" fill="#fef9c3" stroke="#facc15" stroke-width="1.5"/><rect x="17" y="10" width="10" height="6" rx="2" fill="#fde047"/><path d="M18 22 Q22 26 26 22" stroke="#f59e0b" stroke-width="1.5" fill="none"/></svg>`,
  ספריי: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="16" width="12" height="20" rx="3" fill="#fef9c3" stroke="#facc15" stroke-width="1.5"/><rect x="16" y="10" width="8" height="8" rx="2" fill="#fde047"/><path d="M26 14 Q32 12 34 16" stroke="#facc15" stroke-width="1.5" fill="none"/><line x1="34" y1="16" x2="38" y2="13" stroke="#bae6fd" stroke-width="1.5" stroke-linecap="round"/><line x1="34" y1="16" x2="38" y2="18" stroke="#bae6fd" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  קורנפלור: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="10" width="20" height="26" rx="3" fill="#fef9c3" stroke="#fde047" stroke-width="1.5"/><rect x="14" y="20" width="16" height="8" rx="2" fill="#fde68a"/></svg>`,
  קורנפלקס: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="8" width="24" height="30" rx="3" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/><rect x="13" y="16" width="18" height="12" rx="2" fill="#fde68a"/></svg>`,
  קטשופ: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="14" width="14" height="22" rx="4" fill="#fca5a5" stroke="#ef4444" stroke-width="1.5"/><rect x="17" y="10" width="10" height="6" rx="2" fill="#ef4444"/><rect x="16" y="20" width="12" height="6" fill="#fee2e2" opacity=".6"/></svg>`,
  חומוס: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="26" r="13" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/><path d="M14 26 Q22 20 30 26" stroke="#d97706" stroke-width="1.5" fill="none"/></svg>`,
  טחינה: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="13" y="12" width="18" height="22" rx="4" fill="#fef9c3" stroke="#d97706" stroke-width="1.5"/><rect x="15" y="10" width="14" height="5" rx="2" fill="#f59e0b"/></svg>`,
  ריבה: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="14" width="20" height="22" rx="3" fill="#fce7f3" stroke="#f9a8d4" stroke-width="1.5"/><rect x="12" y="10" width="20" height="6" rx="3" fill="#f9a8d4"/></svg>`,
  ממרח: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="14" width="20" height="22" rx="3" fill="#78350f" stroke="#92400e" stroke-width="1.5"/><rect x="12" y="10" width="20" height="6" rx="3" fill="#92400e"/><path d="M16 24 Q22 20 28 24" stroke="#fde68a" stroke-width="1.5" fill="none"/></svg>`,
  קפה: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="11" y="18" width="20" height="18" rx="3" fill="#78350f" stroke="#92400e" stroke-width="1.5"/><path d="M31 22 Q36 22 36 26 Q36 30 31 30" stroke="#92400e" stroke-width="1.5" fill="none"/><path d="M16 14 Q16 10 18 10" stroke="#94a3b8" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M22 12 Q22 8 24 8" stroke="#94a3b8" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
  תה: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="11" y="18" width="20" height="18" rx="3" fill="#fef9c3" stroke="#facc15" stroke-width="1.5"/><path d="M31 22 Q36 22 36 26 Q36 30 31 30" stroke="#facc15" stroke-width="1.5" fill="none"/><line x1="22" y1="8" x2="22" y2="18" stroke="#92400e" stroke-width="1.5"/><rect x="18" y="6" width="8" height="4" rx="1" fill="#fde68a"/></svg>`,
  מיץ: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="13" y="10" width="18" height="26" rx="4" fill="#fef08a" stroke="#facc15" stroke-width="1.5"/><rect x="15" y="8" width="14" height="5" rx="2" fill="#fde047"/></svg>`,
  מים: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="8" width="16" height="28" rx="4" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.5"/><rect x="16" y="6" width="12" height="5" rx="2" fill="#7dd3fc"/><rect x="16" y="16" width="12" height="10" fill="#bae6fd" opacity=".4"/></svg>`,
  שוקולד: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="14" width="28" height="20" rx="3" fill="#78350f" stroke="#92400e" stroke-width="1.5"/><line x1="8" y1="22" x2="36" y2="22" stroke="#92400e" stroke-width="1.5"/><line x1="18" y1="14" x2="18" y2="34" stroke="#92400e" stroke-width="1.5"/><line x1="26" y1="14" x2="26" y2="34" stroke="#92400e" stroke-width="1.5"/></svg>`,
  גלידה: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="18" rx="10" ry="10" fill="#fce7f3" stroke="#f9a8d4" stroke-width="1.5"/><path d="M14 26 L22 38 L30 26Z" fill="#fde68a" stroke="#facc15" stroke-width="1.5"/></svg>`,
  ביסקוויט: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="16" width="28" height="16" rx="3" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/><circle cx="16" cy="24" r="2" fill="#d97706" opacity=".4"/><circle cx="22" cy="24" r="2" fill="#d97706" opacity=".4"/><circle cx="28" cy="24" r="2" fill="#d97706" opacity=".4"/></svg>`,
  שמפו: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="14" width="16" height="22" rx="4" fill="#f0fdf4" stroke="#4ade80" stroke-width="1.5"/><rect x="16" y="10" width="12" height="6" rx="3" fill="#4ade80"/></svg>`,
  סבון: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="16" width="24" height="16" rx="6" fill="#fdf4ff" stroke="#d8b4fe" stroke-width="1.5"/><circle cx="18" cy="22" r="2" fill="#d8b4fe" opacity=".5"/><circle cx="26" cy="26" r="1.5" fill="#d8b4fe" opacity=".5"/></svg>`,
  נייר: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="14" width="24" height="18" rx="3" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/><ellipse cx="22" cy="14" rx="12" ry="4" fill="#e2e8f0"/><ellipse cx="22" cy="23" rx="5" ry="5" fill="white" stroke="#cbd5e1" stroke-width="1"/></svg>`,
  נוזל: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="12" width="16" height="24" rx="4" fill="#bfdbfe" stroke="#3b82f6" stroke-width="1.5"/><rect x="16" y="8" width="12" height="6" rx="3" fill="#3b82f6"/><path d="M18 22 Q22 26 26 22" stroke="#1d4ed8" stroke-width="1.5" fill="none"/></svg>`,
}

const DEPT_ICONS = {
  'מוצרי חלב': `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="13" y="8" width="18" height="28" rx="4" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="1.5"/><rect x="16" y="4" width="12" height="6" rx="2" fill="#bae6fd"/></svg>`,
  'ירקות': `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="26" r="13" fill="#bbf7d0" stroke="#4ade80" stroke-width="1.5"/><path d="M17 14 Q22 8 27 14" stroke="#16a34a" stroke-width="2" fill="none"/></svg>`,
  'פירות': `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M22 36 Q8 30 10 18 Q12 8 22 10 Q32 8 34 18 Q36 30 22 36Z" fill="#fca5a5" stroke="#ef4444" stroke-width="1.5"/></svg>`,
  'בשר ועוף': `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M8 28 Q10 16 22 14 Q34 12 36 24 Q34 34 22 34 Q10 36 8 28Z" fill="#fca5a5" stroke="#ef4444" stroke-width="1.5"/></svg>`,
  'דגים': `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M36 22 Q28 12 14 18 Q8 22 14 26 Q28 32 36 22Z" fill="#bae6fd" stroke="#38bdf8" stroke-width="1.5"/><circle cx="16" cy="21" r="2" fill="#0ea5e9"/></svg>`,
  'מאפים': `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="24" width="30" height="12" rx="4" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/><ellipse cx="22" cy="24" rx="15" ry="7" fill="#fde68a" stroke="#f59e0b" stroke-width="1.5"/></svg>`,
  'יבש': `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="10" width="20" height="26" rx="3" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/></svg>`,
  'קפואים': `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="12" width="28" height="22" rx="4" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.5"/><line x1="22" y1="14" x2="22" y2="32" stroke="#7dd3fc" stroke-width="2"/><line x1="12" y1="23" x2="32" y2="23" stroke="#7dd3fc" stroke-width="2"/></svg>`,
  'שתייה': `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="8" width="16" height="28" rx="4" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.5"/></svg>`,
  'חטיפים ומתוקים': `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="14" width="28" height="20" rx="3" fill="#78350f" stroke="#92400e" stroke-width="1.5"/><line x1="8" y1="22" x2="36" y2="22" stroke="#92400e" stroke-width="1.5"/></svg>`,
  'ניקיון': `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="14" width="16" height="22" rx="4" fill="#f0fdf4" stroke="#4ade80" stroke-width="1.5"/><rect x="16" y="10" width="12" height="6" rx="3" fill="#4ade80"/></svg>`,
  'טיפוח': `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="14" width="16" height="22" rx="4" fill="#fdf4ff" stroke="#d8b4fe" stroke-width="1.5"/><rect x="16" y="10" width="12" height="6" rx="3" fill="#d8b4fe"/></svg>`,
}

const DEFAULT_ICON = `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="22" r="14" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1.5"/><text x="22" y="28" text-anchor="middle" font-size="16" fill="#cbd5e1">?</text></svg>`

function getItemIcon(name, deptName) {
  const lower = (name || '').trim().toLowerCase()
  const keys = Object.keys(ITEM_ICONS).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (lower.includes(key)) return ITEM_ICONS[key]
  }
  if (deptName && DEPT_ICONS[deptName]) return DEPT_ICONS[deptName]
  return DEFAULT_ICON
}

function ItemSVG({ svg, isDone, size = 44 }) {
  return (
    <div
      style={{ width: size, height: size, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: isDone ? 'grayscale(1) opacity(0.4)' : 'none', background: '#f8fafc' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}


// ─── AI parser ────────────────────────────────────────────────────────────────
async function parseItemsWithAI(text, departments, storeId) {
  const deptList = departments.map(d => d.id + ':' + d.name).join(', ')
  const systemPrompt = 'You are a shopping list parser. You ONLY output valid JSON arrays, never text or explanation. Split compound inputs into separate items.'
  const userPrompt = [
    'Parse this Hebrew shopping list input into separate items.',
    'Input: ' + text,
    '',
    'Rules:',
    '- Split into individual items (comma or Hebrew "ו" = separate items)',
    '- Extract quantity (number before item name)',
    '- Extract unit if present (kg, gram, liter, pack)',
    '- Match department_id from this list: ' + deptList,
    '- priority = urgent only if input says דחוף',
    '',
    'Output ONLY a JSON array:',
    '[{"name":"item","quantity":1,"unit":"","department_id":2,"priority":"regular"}]',
    'If input has 3 items output 3 objects. Never merge items into one.',
  ].join('\n')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  const rawText = data.content?.find(b => b.type === 'text')?.text || '[]'
  const clean = rawText.replace(/^```[\w]*\n?/m, '').replace(/```$/m, '').trim()
  let parsed
  try {
    parsed = JSON.parse(clean)
  } catch {
    const match = clean.match(/\[[\s\S]*\]/)
    if (match) parsed = JSON.parse(match[0])
    else throw new Error('bad json')
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('empty')
  return parsed.map(item => ({
    name: item.name || text,
    quantity: Number(item.quantity) || 1,
    unit: item.unit || '',
    priority: item.priority || 'regular',
    department_id: item.department_id || null,
    store_id: storeId,
  }))
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Shopping({ session }) {
  const navigate = useNavigate()
  const isAdmin  = ['erez@barons.co.il', 'user@barons.co.il'].includes(session?.user?.email)

  const [items,       setItems]       = useState([])
  const [stores,      setStores]      = useState([])
  const [departments, setDepartments] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [activeStore, setActiveStore] = useState(null)
  const [showDone,    setShowDone]    = useState(true)

  // add
  const [addMode,   setAddMode]   = useState(null) // null | 'ai' | 'manual'
  const [aiText,    setAiText]    = useState('')
  const [aiParsed,  setAiParsed]  = useState([])
  const [aiStep,    setAiStep]    = useState('input')
  const [aiLoading, setAiLoading] = useState(false)
  const [form,      setForm]      = useState({ name: '', quantity: 1, unit: '', priority: 'regular', store_id: 1, department_id: '', notes: '' })
  const [saving,    setSaving]    = useState(false)

  // edit / qty
  const [editItem, setEditItem] = useState(null)
  const [qtyModal, setQtyModal] = useState(null)

  const aiRef = useRef()

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    const ch = supabase
      .channel('shopping_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shopping_items' }, () => loadItems())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shopping_items' }, () => loadItems())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'shopping_items' }, () => loadItems())
      .subscribe()
    const poll = setInterval(loadItems, 8000)
    return () => { supabase.removeChannel(ch); clearInterval(poll) }
  }, [])

  async function loadAll() {
    setLoading(true)
    const [sr, dr] = await Promise.all([
      supabase.from('shopping_stores').select('*').order('sort_order'),
      supabase.from('shopping_departments').select('*').order('sort_order'),
    ])
    if (sr.data) setStores(sr.data)
    if (dr.data) setDepartments(dr.data)
    await loadItems()
    setLoading(false)
  }

  async function loadItems() {
    const { data } = await supabase
      .from('shopping_items')
      .select('*, shopping_stores(name), shopping_departments(name)')
      .order('is_done',    { ascending: true })
      .order('created_at', { ascending: false })
    if (data) setItems(data)
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = items.filter(i => !activeStore || i.store_id === activeStore)
  const pending  = filtered.filter(i => !i.is_done)
  const done     = filtered.filter(i =>  i.is_done)

  const byDept = {}
  pending.forEach(item => {
    const key = item.department_id || 0
    if (!byDept[key]) byDept[key] = []
    byDept[key].push(item)
  })
  Object.values(byDept).forEach(arr => arr.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]))

  const deptKeys = Object.keys(byDept).sort((a, b) => {
    const da = departments.find(d => d.id === parseInt(a))
    const db = departments.find(d => d.id === parseInt(b))
    return (da?.sort_order || 99) - (db?.sort_order || 99)
  })

  function storePendingCount(storeId) {
    return items.filter(i => !i.is_done && i.store_id === storeId).length
  }
  const totalPending = items.filter(i => !i.is_done).length

  // ── Actions ───────────────────────────────────────────────────────────────
  async function toggleDone(item) {
    if (!item.is_done) {
      await supabase.from('shopping_items').update({
        is_done: true, quantity_bought: item.quantity, done_at: new Date().toISOString(),
      }).eq('id', item.id)
    } else {
      await supabase.from('shopping_items').update({ is_done: false, quantity_bought: 0, done_at: null }).eq('id', item.id)
    }
    loadItems()
  }

  async function setPartialBought(item, bought) {
    const isDone = bought >= item.quantity
    await supabase.from('shopping_items').update({
      quantity_bought: bought,
      is_done: isDone,
      done_at: isDone ? new Date().toISOString() : null,
    }).eq('id', item.id)
    setQtyModal(null)
    loadItems()
  }

  async function deleteItem(id) {
    if (!confirm('למחוק?')) return
    await supabase.from('shopping_items').delete().eq('id', id)
    loadItems()
  }

  async function clearDone() {
    if (!confirm('למחוק את כל הפריטים שנקנו?')) return
    await supabase.from('shopping_items').delete().eq('is_done', true)
    loadItems()
  }

  // ── Add manual ────────────────────────────────────────────────────────────
  async function addManual(e) {
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
    setForm({ name: '', quantity: 1, unit: '', priority: 'regular', store_id: form.store_id, department_id: '', notes: '' })
    setAddMode(null)
    setSaving(false)
    loadItems()
  }

  // ── Add AI ────────────────────────────────────────────────────────────────
  async function handleAiParse() {
    if (!aiText.trim()) return
    setAiLoading(true)
    try {
      const storeId = activeStore || 1
      const depts = departments.filter(d => d.store_id === storeId || !d.store_id)
      const parsed = await parseItemsWithAI(aiText, depts.length ? depts : departments, storeId)
      setAiParsed(parsed)
      setAiStep('preview')
    } catch {
      // smart fallback: split by comma or ו
      const parts = aiText.split(/,|،|\sו\s/i).map(s => s.trim()).filter(Boolean)
      const fallback = parts.map(part => {
        const match = part.match(/^(\d+(?:\.\d+)?)\s*(.+)$/)
        return {
          name: match ? match[2].trim() : part,
          quantity: match ? parseFloat(match[1]) : 1,
          unit: '', priority: 'regular', department_id: null, store_id: activeStore || 1,
        }
      })
      setAiParsed(fallback)
      setAiStep('preview')
    }
    setAiLoading(false)
  }

  async function handleAiConfirm() {
    setSaving(true)
    await supabase.from('shopping_items').insert(
      aiParsed.map(item => ({
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || '',
        priority: item.priority || 'regular',
        store_id: item.store_id || 1,
        department_id: item.department_id || null,
        added_by: session?.user?.email,
      }))
    )
    setAiText(''); setAiParsed([]); setAiStep('input'); setAddMode(null)
    setSaving(false)
    loadItems()
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
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
    loadItems()
  }

  const formDepts = departments.filter(d => d.store_id === parseInt(form.store_id) || !d.store_id)
  const editDepts = editItem ? departments.filter(d => d.store_id === parseInt(editItem.store_id) || !d.store_id) : []

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ direction: 'rtl', fontFamily: "'Open Sans Hebrew','Open Sans',Arial,sans-serif", background: '#f0f4ff', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Header */}
            <BaronsHeader
        title="קניות"
        subtitle="רשימת קניות משפחתית"
        breadcrumbs={[{ label: 'קניות', path: '/shopping' }]}
        actions={[{ label: '+ פריט', onClick: () => setShowAdd && setShowAdd(true), primary: true }]}
      />

      {/* Store tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '8px 12px', display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
        <StoreTab label="הכל" count={totalPending} active={activeStore === null} onClick={() => setActiveStore(null)} />
        {stores.map(s => (
          <StoreTab key={s.id} label={s.name} count={storePendingCount(s.id)} active={activeStore === s.id} onClick={() => setActiveStore(activeStore === s.id ? null : s.id)} />
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>טוען...</div>
      ) : (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '14px 12px' }}>

          {deptKeys.length === 0 && done.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>הרשימה ריקה</div>
              <div style={{ fontSize: 13 }}>לחץ "+ הוסף" כדי להתחיל</div>
            </div>
          )}

          {deptKeys.map(deptId => (
            <div key={deptId} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', padding: '0 2px 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {departments.find(d => d.id === parseInt(deptId))?.name || 'כללי'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {byDept[deptId].map(item => (
                  <ItemCard key={item.id} item={item} isAdmin={isAdmin}
                    onToggle={() => toggleDone(item)}
                    onEdit={() => setEditItem({ ...item })}
                    onDelete={() => deleteItem(item.id)}
                    onPartial={() => setQtyModal(item)}
                  />
                ))}
              </div>
            </div>
          ))}

          {done.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 10px' }}>
                <button onClick={() => setShowDone(v => !v)} style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showDone ? '▾' : '▸'} נקנו ({done.length})
                </button>
                {isAdmin && (
                  <button onClick={clearDone} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>נקה הכל</button>
                )}
              </div>
              {showDone && done.map(item => (
                <ItemRow key={item.id} item={item} isAdmin={isAdmin} isDone
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

      {/* AI Add Modal */}
      {addMode === 'ai' && (
        <Modal onClose={() => { setAddMode(null); setAiStep('input'); setAiText('') }}>
          {aiStep === 'input' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>מה צריך לקנות?</div>
                <button onClick={() => setAddMode('manual')} style={{ fontSize: 12, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>טופס ידני</button>
              </div>
              <textarea
                ref={aiRef}
                value={aiText}
                onChange={e => setAiText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiParse() } }}
                placeholder={'למשל: "2 קמח, קוטג\' אחד, ביצים דחוף"'}
                rows={3}
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
              />
              <button onClick={handleAiParse} disabled={aiLoading || !aiText.trim()}
                style={{ ...btnPrimary, width: '100%', marginTop: 10, opacity: aiLoading ? 0.6 : 1 }}>
                {aiLoading ? 'מנתח...' : 'המשך'}
              </button>
            </>
          )}
          {aiStep === 'preview' && (
            <>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>הבנתי {aiParsed.length} פריטים</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>בדוק לפני שליחה:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
                {aiParsed.map((item, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '9px 12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</span>
                      {(item.quantity !== 1 || item.unit) && (
                        <span style={{ fontSize: 12, background: '#e2e8f0', borderRadius: 4, padding: '1px 7px' }}>{item.quantity}{item.unit ? ' ' + item.unit : ''}</span>
                      )}
                      {item.priority === 'urgent' && <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>דחוף</span>}
                      <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 'auto' }}>
                        {departments.find(d => d.id === item.department_id)?.name || 'כללי'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setAiStep('input')} style={{ ...btnSecondary, flex: 1 }}>תקן</button>
                <button onClick={handleAiConfirm} disabled={saving} style={{ ...btnPrimary, flex: 2, background: saving ? '#94a3b8' : 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                  {saving ? 'שולח...' : 'הוסף לרשימה'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Manual Add Modal */}
      {addMode === 'manual' && (
        <Modal onClose={() => setAddMode(null)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>פריט חדש</div>
            <button onClick={() => { setAddMode('ai'); setAiStep('input') }} style={{ fontSize: 12, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>הוספה חכמה</button>
          </div>
          <form onSubmit={addManual} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input required placeholder="שם הפריט" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} autoFocus />
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" min="0" step="0.5" placeholder="כמות" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} style={{ ...inputStyle, width: 80 }} />
              <input placeholder="יחידה" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inputStyle}>
              <option value="urgent">דחוף</option>
              <option value="regular">רגיל</option>
              <option value="daily">יום-יום</option>
            </select>
            <select value={form.store_id} onChange={e => setForm(f => ({ ...f, store_id: e.target.value, department_id: '' }))} style={inputStyle}>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {formDepts.length > 0 && (
              <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} style={inputStyle}>
                <option value="">-- מחלקה --</option>
                {formDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
            <input placeholder="הערות (אופציונלי)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} />
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" onClick={() => setAddMode(null)} style={{ ...btnSecondary, flex: 1 }}>ביטול</button>
              <button type="submit" disabled={saving} style={{ ...btnPrimary, flex: 1 }}>{saving ? 'שומר...' : 'הוסף'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editItem && (
        <Modal onClose={() => setEditItem(null)}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>עריכת פריט</div>
          <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input required value={editItem.name} onChange={e => setEditItem(i => ({ ...i, name: e.target.value }))} style={inputStyle} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" min="0" step="0.5" value={editItem.quantity} onChange={e => setEditItem(i => ({ ...i, quantity: e.target.value }))} style={{ ...inputStyle, width: 80 }} />
              <input placeholder="יחידה" value={editItem.unit || ''} onChange={e => setEditItem(i => ({ ...i, unit: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <select value={editItem.priority} onChange={e => setEditItem(i => ({ ...i, priority: e.target.value }))} style={inputStyle}>
              <option value="urgent">דחוף</option>
              <option value="regular">רגיל</option>
              <option value="daily">יום-יום</option>
            </select>
            <select value={editItem.store_id} onChange={e => setEditItem(i => ({ ...i, store_id: e.target.value, department_id: '' }))} style={inputStyle}>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {editDepts.length > 0 && (
              <select value={editItem.department_id || ''} onChange={e => setEditItem(i => ({ ...i, department_id: e.target.value }))} style={inputStyle}>
                <option value="">-- מחלקה --</option>
                {editDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
            <input placeholder="הערות" value={editItem.notes || ''} onChange={e => setEditItem(i => ({ ...i, notes: e.target.value }))} style={inputStyle} />
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" onClick={() => setEditItem(null)} style={{ ...btnSecondary, flex: 1 }}>ביטול</button>
              <button type="submit" disabled={saving} style={{ ...btnPrimary, flex: 1 }}>{saving ? 'שומר...' : 'שמור'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Partial Qty Modal */}
      {qtyModal && (
        <Modal onClose={() => setQtyModal(null)}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>כמה קנית?</div>
          <div style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>{qtyModal.name} — סה״כ: {qtyModal.quantity} {qtyModal.unit}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {Array.from({ length: Math.ceil(qtyModal.quantity) + 1 }, (_, i) => i).map(n => (
              <button key={n} onClick={() => setPartialBought(qtyModal, n)}
                style={{
                  width: 52, height: 52, borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  background: n === 0 ? '#f1f5f9' : n >= qtyModal.quantity ? '#dcfce7' : '#fef9c3',
                  border: '2px solid ' + (n === 0 ? '#e2e8f0' : n >= qtyModal.quantity ? '#86efac' : '#fde68a'),
                  color: '#0f172a',
                }}>
                {n}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── StoreTab ─────────────────────────────────────────────────────────────────
function StoreTab({ label, count, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 16px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
      fontFamily: "'Open Sans Hebrew','Open Sans',Arial,sans-serif",
      display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
      borderRadius: 20, border: 'none',
      background: active ? '#0b1a3e' : 'transparent',
      color: active ? '#fff' : '#64748b',
      fontWeight: active ? 700 : 500,
      transition: 'background 0.15s, color 0.15s',
    }}>
      {label}
      {count > 0 && (
        <span style={{
          background: active ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
          color: active ? 'white' : '#64748b',
          fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '1px 7px', lineHeight: 1.6,
        }}>{count}</span>
      )}
    </button>
  )
}

// ─── Fallback אות ראשונה ─────────────────────────────────────────────────────
const DEPT_COLORS = {
  'מוצרי חלב': '#e0f2fe', 'ירקות': '#dcfce7', 'פירות': '#fee2e2',
  'בשר ועוף': '#fef3c7', 'דגים': '#dbeafe', 'מאפים': '#fef9c3',
  'יבש': '#f1f5f9', 'קפואים': '#e0f2fe', 'שתייה': '#ede9fe',
  'חטיפים ומתוקים': '#fce7f3', 'ניקיון': '#f0fdf4', 'טיפוח': '#fdf4ff',
}
const DEPT_TEXT_COLORS = {
  'מוצרי חלב': '#0369a1', 'ירקות': '#15803d', 'פירות': '#b91c1c',
  'בשר ועוף': '#92400e', 'דגים': '#1e40af', 'מאפים': '#78350f',
  'יבש': '#475569', 'קפואים': '#0369a1', 'שתייה': '#6d28d9',
  'חטיפים ומתוקים': '#be185d', 'ניקיון': '#15803d', 'טיפוח': '#7e22ce',
}

function ItemFallback({ name, deptName }) {
  const bg = DEPT_COLORS[deptName] || '#f1f5f9'
  const color = DEPT_TEXT_COLORS[deptName] || '#475569'
  const letter = (name || '?').trim()[0]
  return (
    <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color, flexShrink: 0, fontFamily: "'Open Sans Hebrew',sans-serif" }}>
      {letter}
    </div>
  )
}

// ─── ItemCard (grid card) ─────────────────────────────────────────────────────
function ItemCard({ item, isAdmin, onToggle, onEdit, onDelete, onPartial }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const deptName = item.shopping_departments?.name
  const svg = getItemIcon(item.name, deptName)
  const hasSvg = svg !== DEFAULT_ICON
  const isUrgent = item.priority === 'urgent'
  const hasPart = item.quantity_bought > 0
  const pct = item.quantity > 0 ? (item.quantity_bought / item.quantity) * 100 : 0

  return (
    <>
      <div style={{
        background: 'white', borderRadius: 12, overflow: 'hidden',
        border: isUrgent ? '2px solid #fca5a5' : '1px solid #f1f5f9',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column',
      }}>
        {isUrgent && (
          <div style={{ background: '#ef4444', padding: '2px 4px', textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'white', letterSpacing: '.04em' }}>דחוף</div>
        )}

        {/* icon + text — tap opens menu */}
        <div
          onClick={() => setMenuOpen(true)}
          style={{ padding: '10px 6px 5px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flex: 1 }}
        >
          {hasSvg
            ? <ItemSVG svg={svg} isDone={false} size={36} />
            : <ItemFallback name={item.name} deptName={deptName} />
          }
          <div style={{ marginTop: 5, fontSize: 12, fontWeight: 600, color: '#0f172a', textAlign: 'center', lineHeight: 1.25, wordBreak: 'break-word', width: '100%' }}>
            {item.name}
          </div>
          {(item.quantity !== 1 || item.unit) && (
            <div style={{ marginTop: 3, fontSize: 11, fontWeight: 700, color: '#fff', background: '#0b1a3e', borderRadius: 5, padding: '1px 7px' }}>
              {hasPart ? `${item.quantity_bought}/${item.quantity}` : item.quantity}{item.unit ? ' ' + item.unit : ''}
            </div>
          )}
          {item.shopping_stores?.name && item.shopping_stores.name !== 'סופר' && (
            <div style={{ marginTop: 3, fontSize: 9, color: '#7c3aed', background: '#ede9fe', borderRadius: 3, padding: '1px 5px' }}>
              {item.shopping_stores.name}
            </div>
          )}
          {hasPart && (
            <div style={{ marginTop: 4, width: '80%', height: 2, background: '#f1f5f9', borderRadius: 1 }}>
              <div style={{ height: '100%', width: pct + '%', background: '#fbbf24', borderRadius: 1 }} />
            </div>
          )}
        </div>

        {/* נקנה strip */}
        <button
          onClick={onToggle}
          style={{
            border: 'none', borderTop: '1px solid #f1f5f9', cursor: 'pointer',
            background: '#f8fafc', padding: '7px 4px',
            fontSize: 11, fontWeight: 600, color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            width: '100%', fontFamily: "'Open Sans Hebrew',sans-serif",
          }}
        >
          <span style={{ width: 13, height: 13, borderRadius: 3, border: '1.5px solid #cbd5e1', background: 'white', display: 'inline-block', flexShrink: 0 }} />
          נקנה
        </button>
      </div>

      {menuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setMenuOpen(false)}
        >
          <div
            style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '8px 0 32px', direction: 'rtl' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '10px auto 16px' }} />
            <div style={{ padding: '0 20px 12px', fontWeight: 700, fontSize: 15, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>
              {item.name}
            </div>
            <div style={{ padding: '8px 0' }}>
              <ActionBtn onClick={() => { setMenuOpen(false); onPartial() }}>
                כמה קנית?{hasPart ? ` (${item.quantity_bought}/${item.quantity})` : ''}
              </ActionBtn>
              <ActionBtn onClick={() => { setMenuOpen(false); onToggle() }}>סמן כנקנה</ActionBtn>
              {isAdmin && <ActionBtn onClick={() => { setMenuOpen(false); onEdit() }}>ערוך פריט</ActionBtn>}
              {isAdmin && <ActionBtn onClick={() => { setMenuOpen(false); onDelete() }} danger>מחק פריט</ActionBtn>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── ItemRow ──────────────────────────────────────────────────────────────────
function ItemRow({ item, isAdmin, isDone, onToggle, onEdit, onDelete, onPartial }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const hasPart = item.quantity_bought > 0 && !item.is_done
  const pct     = item.quantity > 0 ? (item.quantity_bought / item.quantity) * 100 : 0
  const deptName = item.shopping_departments?.name
  const svg = getItemIcon(item.name, deptName)

  return (
    <>
      <div style={{
        background: 'white', borderRadius: 10, padding: '10px 12px', marginBottom: 5,
        display: 'flex', alignItems: 'center', gap: 10,
        opacity: isDone ? 0.5 : 1,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        border: item.priority === 'urgent' && !isDone ? '1px solid #fca5a5' : '1px solid #f1f5f9',
        position: 'relative', overflow: 'hidden',
      }}>
        {!isDone && (
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: PRIORITY_COLORS[item.priority], borderRadius: '0 10px 10px 0' }} />
        )}

        {/* Checkbox */}
        <button onClick={onToggle} style={{
          width: 28, height: 28, borderRadius: 7,
          border: '2px solid ' + (isDone ? '#86efac' : '#cbd5e1'),
          background: isDone ? '#dcfce7' : 'white',
          cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>
          {isDone ? '✓' : ''}
        </button>

        {/* Item icon */}
        <ItemSVG svg={svg} isDone={isDone} />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setMenuOpen(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? '#94a3b8' : '#0f172a' }}>
              {item.name}
            </span>
            {(item.quantity !== 1 || item.unit) && (
              <span style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', borderRadius: 4, padding: '1px 6px' }}>
                {hasPart ? item.quantity_bought + '/' + item.quantity : item.quantity}{item.unit ? ' ' + item.unit : ''}
              </span>
            )}
            {item.priority === 'urgent' && !isDone && (
              <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>דחוף</span>
            )}
            {item.shopping_stores?.name && item.shopping_stores.name !== 'סופר' && (
              <span style={{ fontSize: 11, color: '#7c3aed', background: '#ede9fe', borderRadius: 4, padding: '1px 6px' }}>
                {item.shopping_stores.name}
              </span>
            )}
          </div>
          {item.notes && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{item.notes}</div>}
          {hasPart && (
            <div style={{ marginTop: 5, height: 3, background: '#f1f5f9', borderRadius: 2 }}>
              <div style={{ height: '100%', width: pct + '%', background: '#fbbf24', borderRadius: 2 }} />
            </div>
          )}
        </div>

        {/* Menu button */}
        <button onClick={() => setMenuOpen(true)} style={{
          width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
          background: 'white', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: '#94a3b8',
        }}>⋮</button>
      </div>

      {/* Action sheet */}
      {menuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setMenuOpen(false)}
        >
          <div
            style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '8px 0 32px', direction: 'rtl' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '10px auto 16px' }} />
            <div style={{ padding: '0 20px 12px', fontWeight: 700, fontSize: 15, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>
              {item.name}
            </div>
            <div style={{ padding: '8px 0' }}>
              {!isDone && (
                <ActionBtn onClick={() => { setMenuOpen(false); onPartial() }}>
                  כמה קנית?{item.quantity_bought > 0 ? ' (' + item.quantity_bought + '/' + item.quantity + ')' : ''}
                </ActionBtn>
              )}
              <ActionBtn onClick={() => { setMenuOpen(false); onToggle() }}>
                {isDone ? 'בטל סימון — לא נקנה' : 'סמן כנקנה'}
              </ActionBtn>
              {isAdmin && (
                <ActionBtn onClick={() => { setMenuOpen(false); onEdit() }}>ערוך פריט</ActionBtn>
              )}
              {isAdmin && (
                <ActionBtn onClick={() => { setMenuOpen(false); onDelete() }} danger>מחק פריט</ActionBtn>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── ActionBtn ────────────────────────────────────────────────────────────────
function ActionBtn({ children, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      display: 'block', width: '100%', padding: '14px 20px', textAlign: 'right',
      background: 'none', border: 'none', cursor: 'pointer', fontSize: 15,
      color: danger ? '#ef4444' : '#0f172a',
      fontFamily: "'Open Sans Hebrew','Open Sans',Arial,sans-serif",
      fontWeight: danger ? 600 : 400,
    }}>
      {children}
    </button>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ children, onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', direction: 'rtl' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
  fontSize: 14, fontFamily: "'Open Sans Hebrew','Open Sans',Arial,sans-serif",
  boxSizing: 'border-box', direction: 'rtl', outline: 'none',
}
const btnPrimary = {
  padding: '10px', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: 'white',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14,
  fontFamily: "'Open Sans Hebrew','Open Sans',Arial,sans-serif",
}
const btnSecondary = {
  padding: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0',
  borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
  fontFamily: "'Open Sans Hebrew','Open Sans',Arial,sans-serif",
}
