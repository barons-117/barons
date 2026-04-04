import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ─── Menus ────────────────────────────────────────────────────────────────────
const USER_MENUS = {
  'erez@barons.co.il': [
    { label: 'נסיעות',    sub: 'יומן הטיולים שלי',        path: '/travels',  internal: true },
    { label: 'כושר',      sub: 'מעקב אימונים',             path: '/gym',      internal: true },
    { label: 'מתכונים',   sub: 'ספר המתכונים המשפחתי',     path: '/recipes',  internal: true },
    { label: 'שוברים',    sub: 'ניהול שוברים',             path: '/vouchers', internal: true },
    { label: 'כרטיסים',   sub: 'כרטיסי מתנה',              path: '/cards',    internal: true },
    { label: 'מרתון',     sub: 'אימוני ריצה — רועי',       path: '/marathon', internal: true },
    { label: 'עץ משפחה',  sub: 'גרוסמן-ארטג לדורותיה',    path: '/family',   internal: true },
  ],
  'roy@barons.co.il': [
    { label: 'מרתון',     sub: 'אימוני ריצה — ברלין 2026', path: '/marathon', internal: true },
    { label: 'מתכונים',   sub: 'ספר המתכונים המשפחתי',     path: '/recipes',  internal: true },
    { label: 'שוברים',    sub: 'ניהול שוברים',             path: '/vouchers', internal: true },
    { label: 'כרטיסים',   sub: 'כרטיסי מתנה',              path: '/cards',    internal: true },
    { label: 'עץ משפחה',  sub: 'גרוסמן-ארטג לדורותיה',    path: '/family',   internal: true },
  ],
  'user@barons.co.il': [
    { label: 'עץ משפחה',  sub: 'גרוסמן-ארטג לדורותיה',    path: '/family',   internal: true },
  ],
}

const DEFAULT_MENU = [
  { label: 'נסיעות', sub: 'יומן הטיולים שלי', path: '/travels', internal: true },
]

function getUserName(email) {
  if (email?.includes('erez')) return 'ארז'
  if (email?.includes('roy'))  return 'רועי'
  if (email?.startsWith('user@')) return 'אורח'
  return email?.split('@')[0]
}

export default function Home({ session }) {
  const [email, setEmail]       = useState(() => localStorage.getItem('barons_email') || '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('אימייל או סיסמה שגויים'); setLoading(false) }
    else { if (remember) localStorage.setItem('barons_email', email); else localStorage.removeItem('barons_email') }
  }

  if (session) {
    const userEmail = session.user.email
    const menu = USER_MENUS[userEmail] || DEFAULT_MENU
    const name = getUserName(userEmail)
    return (
      <div style={S.page}>
        <div style={S.loginBox}>
          <Logo />
          <p style={S.greeting}>שלום, {name}</p>
          <div style={S.menuGrid}>
            {menu.map(item => (
              <button
                key={item.path}
                style={S.menuCard}
                onClick={() => item.internal ? navigate(item.path) : window.location.href = item.path}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
              >
                <div style={S.menuLabel}>{item.label}</div>
                <div style={S.menuSub}>{item.sub}</div>
              </button>
            ))}
          </div>
          <button style={S.logoutLink} onClick={() => supabase.auth.signOut()}>התנתק</button>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <div style={S.loginBox}>
        <Logo />
        <form onSubmit={handleLogin} style={S.form}>
          <input style={S.input} type="email" placeholder="אימייל" value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
          <input style={S.input} type="password" placeholder="סיסמה" value={password} onChange={e => setPassword(e.target.value)} required />
          <label style={S.rememberRow}>
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ marginLeft:'8px', accentColor:'#60a5fa' }} />
            זכור אותי
          </label>
          {error && <p style={S.errorMsg}>{error}</p>}
          <button type="submit" style={S.loginBtn} disabled={loading}>{loading ? '...' : 'כניסה'}</button>
        </form>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <div style={{ textAlign:'center', marginBottom:'40px' }}>
      <img src="/logo-circle.png" alt="BARONS" style={{ width:'100px', height:'100px', display:'block', margin:'0 auto 12px' }} />
      <div style={S.logoTagline}>לנהל משפחה זה חתיכת עסק</div>
    </div>
  )
}

const S = {
  page:       { minHeight:'100vh', background:'linear-gradient(160deg,#0b1526 0%,#0f2a5c 60%,#0b1a3e 100%)', display:'flex', alignItems:'center', justifyContent:'center' },
  loginBox:   { width:'360px', padding:'48px 40px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', backdropFilter:'blur(20px)', boxShadow:'0 24px 80px rgba(0,0,0,0.4)' },
  logoTagline:{ fontSize:'13px', color:'rgba(255,255,255,0.75)', marginTop:'8px', letterSpacing:'3px', textTransform:'uppercase' },
  greeting:   { color:'rgba(255,255,255,0.85)', fontSize:'15px', textAlign:'center', marginBottom:'28px' },
  menuGrid:   { display:'flex', flexDirection:'column', gap:'10px', marginBottom:'32px' },
  menuCard:   { background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.15)', color:'white', padding:'16px 20px', borderRadius:'12px', textAlign:'right', cursor:'pointer', fontFamily:'Heebo,sans-serif', transition:'background 0.2s' },
  menuLabel:  { fontSize:'17px', fontWeight:700, marginBottom:'2px' },
  menuSub:    { fontSize:'12px', color:'rgba(255,255,255,0.75)' },
  logoutLink: { background:'none', border:'none', color:'rgba(255,255,255,0.55)', fontSize:'13px', cursor:'pointer', fontFamily:'Heebo,sans-serif', display:'block', margin:'0 auto' },
  form:       { display:'flex', flexDirection:'column', gap:'12px' },
  input:      { background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'10px', padding:'13px 16px', fontSize:'15px', color:'white', fontFamily:'Heebo,sans-serif', outline:'none', textAlign:'right' },
  rememberRow:{ color:'rgba(255,255,255,0.75)', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' },
  errorMsg:   { color:'#f87171', fontSize:'13px', textAlign:'center' },
  loginBtn:   { background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', border:'none', color:'white', padding:'14px', borderRadius:'10px', fontSize:'16px', fontWeight:700, cursor:'pointer', fontFamily:'Heebo,sans-serif', marginTop:'6px', boxShadow:'0 4px 20px rgba(59,130,246,0.4)' },
}
