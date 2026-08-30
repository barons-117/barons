import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const REPORT_EMAIL = Deno.env.get('REPORT_EMAIL')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL')!

const TZ = 'Asia/Jerusalem'

// Returns YYYY-MM-DD for a Date, in Israel local time
function israelDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ })
}

const STUDENTS = [
  { email: 'danielle@barons.co.il', name: 'דניאל', emoji: '🦋', color: '#8b5cf6' },
  { email: 'daphna@barons.co.il',   name: 'דפנה',  emoji: '🌸', color: '#ec4899' },
]

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const now = new Date()
  const todayIL = israelDate(now)

  // Week start (Sunday) in Israel time
  const ilNow = new Date(now.toLocaleString('en-US', { timeZone: TZ }))
  const weekStart = new Date(ilNow)
  weekStart.setDate(ilNow.getDate() - ilNow.getDay())
  weekStart.setHours(0, 0, 0, 0)
  // Fetch 10 days back: covers this week AND gives the streak loop enough
  // history. A narrow window makes older completions invisible and inflates
  // the "days without activity" counter.
  const fetchFrom = new Date(now.getTime() - 10 * 86400000).toISOString()

  const { data: progress, error: pErr } = await supabase
    .from('school_progress')
    .select('student_email, mission_id, score, last_completed_at, completed, answers, updated_at')
    .eq('completed', true)
    .gte('last_completed_at', fetchFrom)

  const { data: inProgress } = await supabase
    .from('school_progress')
    .select('student_email, mission_id, answers, updated_at')
    .eq('completed', false)
    .gte('updated_at', new Date(now.getTime() - 36 * 3600 * 1000).toISOString())

  const { data: missions } = await supabase
    .from('school_missions')
    .select('id, title, subject, questions')

  const missionMap = Object.fromEntries((missions || []).map(m => [m.id, m]))

  const weekStartStr = israelDate(weekStart)
  const dateStr = now.toLocaleDateString('he-IL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ
  })

  const reports = STUDENTS.map(student => {
    const all = (progress || []).filter(p => p.student_email === student.email)

    // Compare using Israel-local dates, not raw UTC strings
    const today = all.filter(p =>
      p.last_completed_at && israelDate(new Date(p.last_completed_at)) === todayIL
    )
    const week = all.filter(p =>
      p.last_completed_at && israelDate(new Date(p.last_completed_at)) >= weekStartStr
    )

    const todayInProgress = (inProgress || []).filter(p =>
      p.student_email === student.email &&
      (p.answers || []).length > 0 &&
      p.updated_at && israelDate(new Date(p.updated_at)) === todayIL
    )

    let streak = 0
    if (today.length === 0) {
      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getTime() - i * 86400000)
        const dStr = israelDate(d)
        const hasActivity = all.some(p =>
          p.last_completed_at && israelDate(new Date(p.last_completed_at)) === dStr
        )
        if (!hasActivity) streak++
        else break
      }
    }

    const todayRows = today.map(p => {
      const m = missionMap[p.mission_id]
      const totalQ = (m?.questions || []).length || 1
      const pct = Math.min(100, Math.round((p.score / totalQ) * 100))
      const subj = m?.subject === 'math' ? '🔢 מתמטיקה' : '🇬🇧 אנגלית'
      const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e'
      const t = new Date(p.last_completed_at).toLocaleTimeString('he-IL', {
        hour: '2-digit', minute: '2-digit', timeZone: TZ
      })
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${m?.title || 'משימה'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#666">${subj}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#94a3b8;font-size:12px">${t}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-weight:800;color:${color}">${pct}%</td>
      </tr>`
    }).join('')

    const weekMath = week.filter(p => missionMap[p.mission_id]?.subject === 'math').length
    const weekEng  = week.filter(p => missionMap[p.mission_id]?.subject === 'english').length
    const weekTotal = week.length

    // Per-day counts for the last 7 days (index 0 = today, 1 = yesterday, ...)
    const dayNames = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת']
    const daily = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 86400000)
      const dStr = israelDate(d)
      const count = all.filter(p =>
        p.last_completed_at && israelDate(new Date(p.last_completed_at)) === dStr
      ).length
      const label = i === 0 ? 'היום' : i === 1 ? 'אתמול' : i === 2 ? 'שלשום' : dayNames[new Date(d).getDay()]
      daily.push({ label, count, isToday: i === 0 })
    }
    const last7Total = daily.reduce((s, d) => s + d.count, 0)

    return { student, today, todayRows, todayInProgress, streak, weekTotal, weekMath, weekEng, daily, last7Total }
  })

  const studentBlocks = reports.map(r => {
    const { student, today, todayRows, todayInProgress, streak, weekTotal, weekMath, weekEng, daily, last7Total } = r

    const inProgressNote = todayInProgress.length > 0 && today.length === 0
      ? `<div style="margin-top:8px;padding:8px 12px;background:#fef9ee;border-radius:8px;color:#92400e;font-size:13px">
          ▶️ התחילה ${todayInProgress.length} משימה היום אבל לא סיימה עדיין
        </div>`
      : ''

    // Find the most recent day with activity, to give a concrete reference
    const lastActive = daily.find(d => !d.isToday && d.count > 0)
    const noActivityMsg = streak <= 1
      ? 'לא ביצעה משימות היום'
      : lastActive
        ? `לא ביצעה משימות היום · אחרון: ${lastActive.label} (${lastActive.count})`
        : `לא ביצעה משימות ${streak} ימים ברצף`

    const todaySection = today.length === 0
      ? `<div style="padding:12px 16px;background:#fff5f5;border-radius:10px;color:#9f1239;font-weight:700">
          ${streak <= 1 ? '❌' : '⚠️'} ${noActivityMsg}
        </div>${inProgressNote}`
      : `<table style="width:100%;border-collapse:collapse;font-size:14px" dir="rtl">
          <thead><tr style="background:#f8faff">
            <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600">משימה</th>
            <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600">מקצוע</th>
            <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600">שעה</th>
            <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600">ציון</th>
          </tr></thead>
          <tbody>${todayRows}</tbody>
        </table>`

    // Day-by-day strip for the last 7 days, newest on the right (RTL reading order)
    const dailyCells = [...daily].reverse().map(d => {
      const bg = d.count > 0 ? '#dcfce7' : '#f8fafc'
      const fg = d.count > 0 ? '#15803d' : '#cbd5e1'
      const ring = d.isToday ? `box-shadow:inset 0 0 0 2px ${student.color};` : ''
      return `<td style="text-align:center;padding:0 3px">
        <div style="background:${bg};${ring}border-radius:8px;padding:6px 0;font-size:15px;font-weight:800;color:${fg}">${d.count}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:3px">${d.label}</div>
      </td>`
    }).join('')

    const dailyStrip = `
      <table style="width:100%;border-collapse:separate;border-spacing:0;margin-top:10px" dir="rtl">
        <tr>${dailyCells}</tr>
      </table>`

    const summaryLine = last7Total === 0
      ? `<span style="color:#94a3b8">אין משימות שהושלמו בשבוע האחרון</span>`
      : `<strong>${last7Total} משימות ב-7 הימים האחרונים</strong>` +
        (weekTotal > 0
          ? ` · מתחילת השבוע: ${weekTotal} (${weekMath} מתמטיקה, ${weekEng} אנגלית)`
          : ` · מתחילת השבוע (יום ראשון): עדיין 0`)

    return `
      <div style="background:#ffffff;border:1.5px solid ${student.color}33;border-radius:16px;padding:20px;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;direction:rtl">
          <div style="width:40px;height:40px;border-radius:50%;background:${student.color};display:flex;align-items:center;justify-content:center;font-size:20px">${student.emoji}</div>
          <div style="font-size:18px;font-weight:900;color:#0f172a">${student.name}</div>
        </div>
        <div style="margin-bottom:12px">${todaySection}</div>
        ${dailyStrip}
        <div style="font-size:13px;color:#64748b;padding:10px 0 0;border-top:1px solid #f0f0f0;margin-top:12px;direction:rtl">
          📊 ${summaryLine}
        </div>
      </div>`
  }).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="font-family:Arial,sans-serif;background:#f8faff;margin:0;padding:20px;direction:rtl">
    <div style="max-width:600px;margin:0 auto">
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
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `אקדמיית ברון <${FROM_EMAIL}>`,
      to: [REPORT_EMAIL, 'roy@barons.co.il'],
      subject: `📚 דוח יומי — ${now.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', timeZone: TZ })}`,
      html,
    }),
  })

  const result = await res.json()
  return new Response(JSON.stringify({
    success: res.ok,
    resend: result,
    debug: {
      todayIsrael: todayIL,
      weekStartIsrael: weekStartStr,
      rowsFetched: (progress || []).length,
      fetchError: pErr?.message || null,
      students: reports.map(r => ({
        name: r.student.name,
        todayCount: r.today.length,
        inProgressCount: r.todayInProgress.length,
        streak: r.streak,
        weekTotal: r.weekTotal,
      })),
    }
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
})
