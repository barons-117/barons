import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const REPORT_EMAIL = Deno.env.get('REPORT_EMAIL')!  // erez@barons.co.il
const FROM_EMAIL = Deno.env.get('FROM_EMAIL')!       // school@barons.co.il

const STUDENTS = [
  { email: 'danielle@barons.co.il', name: 'דניאל', emoji: '🦋', color: '#8b5cf6' },
  { email: 'daphna@barons.co.il',   name: 'דפנה',  emoji: '🌸', color: '#ec4899' },
]

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const now = new Date()
  const todayISO = now.toISOString().split('T')[0]

  const dayOfWeek = now.getDay()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dayOfWeek)
  const weekStartISO = weekStart.toISOString().split('T')[0]

  const { data: progress } = await supabase
    .from('school_progress')
    .select('student_email, mission_id, score, last_completed_at, completed, answers, updated_at')
    .gte('last_completed_at', weekStartISO)
    .eq('completed', true)

  // Also fetch in-progress today (started but not completed)
  const { data: inProgress } = await supabase
    .from('school_progress')
    .select('student_email, mission_id, answers, updated_at')
    .eq('completed', false)
    .gte('updated_at', todayISO)

  const { data: missions } = await supabase
    .from('school_missions')
    .select('id, title, subject, questions')
    .eq('active', true)

  const missionMap = Object.fromEntries((missions || []).map(m => [m.id, m]))

  const dateStr = now.toLocaleDateString('he-IL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const reports = STUDENTS.map(student => {
    const all = (progress || []).filter(p => p.student_email === student.email)
    const today = all.filter(p => p.last_completed_at?.split('T')[0] === todayISO)
    const todayInProgress = (inProgress || []).filter(p =>
      p.student_email === student.email && (p.answers || []).length > 0
    )

    let streak = 0
    if (today.length === 0) {
      for (let i = 0; i < 7; i++) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const dISO = d.toISOString().split('T')[0]
        const hasActivity = all.some(p => p.last_completed_at?.split('T')[0] === dISO)
        if (!hasActivity) streak++
        else break
      }
    }

    const todayRows = today.map(p => {
      const m = missionMap[p.mission_id]
      const totalQ = (m?.questions || []).length || 1
      const pct = Math.round((p.score / totalQ) * 100)
      const subj = m?.subject === 'math' ? '🔢 מתמטיקה' : '🇬🇧 אנגלית'
      const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e'
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${m?.title || 'משימה'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#666">${subj}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-weight:800;color:${color}">${pct}%</td>
      </tr>`
    }).join('')

    const weekMath = all.filter(p => missionMap[p.mission_id]?.subject === 'math').length
    const weekEng  = all.filter(p => missionMap[p.mission_id]?.subject === 'english').length
    const weekTotal = all.length

    return { student, today, todayRows, todayInProgress, streak, weekTotal, weekMath, weekEng }
  })

  const studentBlocks = reports.map(r => {
    const { student, today, todayRows, todayInProgress, streak, weekTotal, weekMath, weekEng } = r

    const inProgressNote = todayInProgress.length > 0 && today.length === 0
      ? `<div style="margin-top:8px;padding:8px 12px;background:#fef9ee;border-radius:8px;color:#92400e;font-size:13px">
          ▶️ התחילה ${todayInProgress.length} משימה היום אבל לא סיימה עדיין
        </div>`
      : ''

    const todaySection = today.length === 0
      ? `<div style="padding:12px 16px;background:#fff5f5;border-radius:10px;color:#9f1239;font-weight:700">
          ${streak <= 1 ? '❌ לא ביצעה משימות היום' : `⚠️ זה כבר יום ${streak} ברצף שלא ביצעה משימות`}
        </div>${inProgressNote}`
      : `<table style="width:100%;border-collapse:collapse;font-size:14px" dir="rtl">
          <thead><tr style="background:#f8faff">
            <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600">משימה</th>
            <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600">מקצוע</th>
            <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600">ציון</th>
          </tr></thead>
          <tbody>${todayRows}</tbody>
        </table>`

    const weekSection = weekTotal === 0
      ? `<span style="color:#94a3b8">לא ביצעה משימות השבוע עדיין</span>`
      : `<strong>${weekTotal} משימות השבוע</strong> — ${weekMath} במתמטיקה, ${weekEng} באנגלית`

    return `
      <div style="background:#ffffff;border:1.5px solid ${student.color}33;border-radius:16px;padding:20px;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;direction:rtl">
          <div style="width:40px;height:40px;border-radius:50%;background:${student.color};display:flex;align-items:center;justify-content:center;font-size:20px">${student.emoji}</div>
          <div style="font-size:18px;font-weight:900;color:#0f172a">${student.name}</div>
        </div>
        <div style="margin-bottom:12px">${todaySection}</div>
        <div style="font-size:13px;color:#64748b;padding:8px 0;border-top:1px solid #f0f0f0;margin-top:8px;direction:rtl">
          📊 ${weekSection}
        </div>
      </div>`
  }).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="font-family:Arial,sans-serif;background:#f8faff;margin:0;padding:20px;direction:rtl">
    <div style="max-width:560px;margin:0 auto">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:28px;font-weight:900;color:#0f172a">📚 אקדמיית ברון</div>
        <div style="font-size:14px;color:#64748b;margin-top:4px">דוח יומי — ${dateStr}</div>
      </div>
      ${studentBlocks}
      <div style="text-align:center;font-size:12px;color:#94a3b8;margin-top:20px">נשלח אוטומטית מ-barons.co.il</div>
    </div>
  </body></html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `אקדמיית ברון <${FROM_EMAIL}>`,
      to: [REPORT_EMAIL, 'roy@barons.co.il'],
      subject: `📚 דוח יומי — ${now.toLocaleDateString('he-IL', { day:'numeric', month:'short' })}`,
      html,
    }),
  })

  const result = await res.json()
  return new Response(JSON.stringify({ success: res.ok, resend: result }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
