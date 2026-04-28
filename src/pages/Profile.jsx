import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ─── Default name fallback (mirrors NAME_MAP from Home.jsx) ───────────
const NAME_MAP = {
  'erez@barons.co.il':     'ארז',
  'roy@barons.co.il':      'רועי',
  'user@barons.co.il':     'אורח',
  'daphna@barons.co.il':   'דפנה',
  'danielle@barons.co.il': 'דניאל',
}

const FONT = "'Open Sans Hebrew', 'Open Sans', Arial, sans-serif"

// ─── PIN configuration ───────────────────────────────────────────────
const PIN_LENGTH = 6
const PIN_MAX_ATTEMPTS = 5
const PIN_LOCKOUT_MINUTES = 15

// ─── PIN crypto helpers (Web Crypto API, no external deps) ──────────
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateSalt() {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return bytesToHex(arr)
}

async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(pin + ':' + salt)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(buf))
}

// ─── Lockout state in localStorage ──────────────────────────────────
function getLockoutInfo(userId) {
  try {
    const raw = localStorage.getItem(`barons_pin_attempts_${userId}`)
    if (!raw) return { attempts: 0, lockedUntil: 0 }
    return JSON.parse(raw)
  } catch { return { attempts: 0, lockedUntil: 0 } }
}

function setLockoutInfo(userId, info) {
  localStorage.setItem(`barons_pin_attempts_${userId}`, JSON.stringify(info))
}

function clearLockoutInfo(userId) {
  localStorage.removeItem(`barons_pin_attempts_${userId}`)
}

// ─── Animations ───────────────────────────────────────────────────────
const PROFILE_STYLE = `
  @keyframes profile-fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes profile-spin {
    from { transform: rotate(0deg); } to { transform: rotate(360deg); }
  }
  .profile-section {
    animation: profile-fade-up 0.5s cubic-bezier(0.23,1,0.32,1) both;
  }
  .profile-input:focus {
    border-color: #B8872D !important;
    box-shadow: 0 0 0 3px rgba(184,135,45,0.12);
  }
  .profile-btn-primary {
    transition: transform 180ms cubic-bezier(0.23,1,0.32,1), box-shadow 180ms cubic-bezier(0.23,1,0.32,1), background 180ms;
  }
  .profile-btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(26,26,26,0.18);
  }
  .profile-btn-primary:active:not(:disabled) { transform: translateY(0) scale(0.98); }
  .profile-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .profile-btn-ghost {
    transition: background 180ms, color 180ms;
  }
  .profile-btn-ghost:hover:not(:disabled) {
    background: rgba(26,26,26,0.04);
  }
  .profile-spinner {
    width: 14px; height: 14px; border: 2px solid #fff;
    border-top-color: transparent; border-radius: 50%;
    animation: profile-spin 0.7s linear infinite;
    display: inline-block;
  }
  @media (max-width: 640px) {
    .profile-page-padding { padding: 16px !important; }
    .profile-card-padding { padding: 20px !important; }
    .profile-section-title { font-size: 16px !important; }
  }
`

// ─── PinInput: N digit boxes (iOS-style) ────────────────────────────
function PinInput({ value, onChange, length = 6, autoFocus = false }) {
  const inputsRef = useRef([])

  function handleChange(idx, char) {
    // Only digits
    if (char && !/^\d$/.test(char)) return
    const arr = value.padEnd(length, ' ').split('')
    arr[idx] = char || ' '
    const newVal = arr.join('').replace(/\s+$/, '')
    onChange(newVal)
    if (char && idx < length - 1) {
      inputsRef.current[idx + 1]?.focus()
    }
  }

  function handleKey(idx, e) {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && idx < length - 1) {
      inputsRef.current[idx + 1]?.focus()
    }
    if (e.key === 'ArrowRight' && idx > 0) {
      inputsRef.current[idx - 1]?.focus()
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, length)
    if (pasted) {
      onChange(pasted)
      inputsRef.current[Math.min(pasted.length, length - 1)]?.focus()
    }
  }

  // direction:'ltr' so digit 1 appears leftmost (typical PIN entry)
  return (
    <div style={{ display:'flex', gap:8, direction:'ltr', justifyContent:'flex-start' }}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => inputsRef.current[i] = el}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          autoFocus={autoFocus && i === 0}
          style={{
            width:42, height:52,
            textAlign:'center', fontSize:22, fontWeight:700,
            fontFamily:FONT, color:'#1A1A1A',
            border:'1.5px solid rgba(0,0,0,0.12)',
            borderRadius:10, background:'#FAF8F4',
            outline:'none',
            transition:'border-color 180ms, box-shadow 180ms',
          }}
          onFocus={e => {
            e.target.style.borderColor = '#B8872D'
            e.target.style.boxShadow = '0 0 0 3px rgba(184,135,45,0.12)'
          }}
          onBlur={e => {
            e.target.style.borderColor = 'rgba(0,0,0,0.12)'
            e.target.style.boxShadow = 'none'
          }}
        />
      ))}
    </div>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Display name state
  const [displayName, setDisplayName] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState('')

  // Password state
  const [showPwdForm, setShowPwdForm] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdMsg, setPwdMsg] = useState('')

  // PIN state
  const [hasPin, setHasPin] = useState(false)
  const [pinMode, setPinMode] = useState(null)        // null | 'set' | 'change' | 'remove'
  const [pinStep, setPinStep] = useState(1)           // 1 = enter (current/new), 2 = confirm
  const [pinCurrent, setPinCurrent] = useState('')
  const [pinNew, setPinNew] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinPwdConfirm, setPinPwdConfirm] = useState('')  // for remove: account password
  const [savingPin, setSavingPin] = useState(false)
  const [pinMsg, setPinMsg] = useState('')

  // ─── Load user + profile ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!u) { navigate('/'); return }
      setUser(u)

      // Try to load custom display name + pin from user_profiles
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, pin_hash')
        .eq('user_id', u.id)
        .maybeSingle()

      const fallback = NAME_MAP[u.email] || u.email?.split('@')[0] || ''
      const current = profile?.display_name || fallback
      setDisplayName(current)
      setOriginalName(current)
      setHasPin(!!profile?.pin_hash)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [navigate])

  // ─── Save display name ────────────────────────────────────────────
  async function saveName() {
    if (!user || !displayName.trim()) return
    setSavingName(true)
    setNameMsg('')
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({ user_id: user.id, display_name: displayName.trim() }, { onConflict: 'user_id' })
      if (error) throw error
      setOriginalName(displayName.trim())
      setNameMsg('נשמר')
      setTimeout(() => setNameMsg(''), 2500)
    } catch (e) {
      setNameMsg('שגיאה: ' + (e.message || ''))
    } finally {
      setSavingName(false)
    }
  }

  // ─── Change password ──────────────────────────────────────────────
  async function changePassword() {
    setPwdMsg('')
    if (newPwd.length < 6) {
      setPwdMsg('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg('הסיסמאות אינן תואמות')
      return
    }
    setSavingPwd(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      setPwdMsg('הסיסמה עודכנה בהצלחה')
      setNewPwd(''); setConfirmPwd('')
      setTimeout(() => { setShowPwdForm(false); setPwdMsg('') }, 2200)
    } catch (e) {
      setPwdMsg('שגיאה: ' + (e.message || ''))
    } finally {
      setSavingPwd(false)
    }
  }

  // ─── PIN: open mode (set / change / remove) ──────────────────────
  function openPinMode(mode) {
    setPinMode(mode)
    setPinStep(1)
    setPinCurrent(''); setPinNew(''); setPinConfirm(''); setPinPwdConfirm('')
    setPinMsg('')
  }

  function closePinMode() {
    setPinMode(null)
    setPinStep(1)
    setPinCurrent(''); setPinNew(''); setPinConfirm(''); setPinPwdConfirm('')
    setPinMsg('')
  }

  // ─── PIN: verify current PIN against stored hash ─────────────────
  async function verifyCurrentPin(input) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('pin_hash, pin_salt')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!profile?.pin_hash || !profile?.pin_salt) return false
    const inputHash = await hashPin(input, profile.pin_salt)
    return inputHash === profile.pin_hash
  }

  // ─── PIN: handle set (new PIN, no current required) ──────────────
  async function handlePinSet() {
    setPinMsg('')
    if (pinStep === 1) {
      if (!/^\d{6}$/.test(pinNew)) {
        setPinMsg(`קוד PIN חייב להכיל בדיוק ${PIN_LENGTH} ספרות`)
        return
      }
      setPinStep(2)
      return
    }
    // Step 2: confirm
    if (pinConfirm !== pinNew) {
      setPinMsg('הקודים אינם תואמים')
      return
    }
    setSavingPin(true)
    try {
      const salt = generateSalt()
      const hash = await hashPin(pinNew, salt)
      const { error } = await supabase
        .from('user_profiles')
        .upsert({ user_id: user.id, pin_hash: hash, pin_salt: salt }, { onConflict: 'user_id' })
      if (error) throw error
      clearLockoutInfo(user.id)
      setHasPin(true)
      setPinMsg('PIN הוגדר בהצלחה')
      setTimeout(() => closePinMode(), 1600)
    } catch (e) {
      setPinMsg('שגיאה: ' + (e.message || ''))
    } finally {
      setSavingPin(false)
    }
  }

  // ─── PIN: handle change (current → new → confirm) ────────────────
  async function handlePinChange() {
    setPinMsg('')
    if (pinStep === 1) {
      // Verify current PIN
      const lockout = getLockoutInfo(user.id)
      if (lockout.lockedUntil > Date.now()) {
        const minsLeft = Math.ceil((lockout.lockedUntil - Date.now()) / 60000)
        setPinMsg(`חסום עקב ניסיונות שגויים. נסה שוב בעוד ${minsLeft} דקות`)
        return
      }
      setSavingPin(true)
      const ok = await verifyCurrentPin(pinCurrent)
      setSavingPin(false)
      if (!ok) {
        const newAttempts = lockout.attempts + 1
        if (newAttempts >= PIN_MAX_ATTEMPTS) {
          setLockoutInfo(user.id, { attempts: 0, lockedUntil: Date.now() + PIN_LOCKOUT_MINUTES * 60000 })
          setPinMsg(`נחסמת ל-${PIN_LOCKOUT_MINUTES} דקות עקב ניסיונות שגויים`)
        } else {
          setLockoutInfo(user.id, { attempts: newAttempts, lockedUntil: 0 })
          setPinMsg(`PIN שגוי (${PIN_MAX_ATTEMPTS - newAttempts} ניסיונות נותרו)`)
        }
        return
      }
      clearLockoutInfo(user.id)
      // PIN correct - require new PIN
      if (!/^\d{6}$/.test(pinNew)) {
        setPinMsg(`קוד PIN חדש חייב להכיל בדיוק ${PIN_LENGTH} ספרות`)
        return
      }
      setPinStep(2)
      return
    }
    // Step 2: confirm new
    if (pinConfirm !== pinNew) {
      setPinMsg('הקודים אינם תואמים')
      return
    }
    setSavingPin(true)
    try {
      const salt = generateSalt()
      const hash = await hashPin(pinNew, salt)
      const { error } = await supabase
        .from('user_profiles')
        .upsert({ user_id: user.id, pin_hash: hash, pin_salt: salt }, { onConflict: 'user_id' })
      if (error) throw error
      setPinMsg('PIN שונה בהצלחה')
      setTimeout(() => closePinMode(), 1600)
    } catch (e) {
      setPinMsg('שגיאה: ' + (e.message || ''))
    } finally {
      setSavingPin(false)
    }
  }

  // ─── PIN: handle remove (account password required) ──────────────
  async function handlePinRemove() {
    setPinMsg('')
    if (!pinPwdConfirm) {
      setPinMsg('יש להזין את הסיסמה לאישור')
      return
    }
    setSavingPin(true)
    try {
      // Verify password by attempting re-authentication
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pinPwdConfirm,
      })
      if (authError) {
        setPinMsg('סיסמה שגויה')
        setSavingPin(false)
        return
      }
      // Password OK - clear PIN
      const { error } = await supabase
        .from('user_profiles')
        .update({ pin_hash: null, pin_salt: null })
        .eq('user_id', user.id)
      if (error) throw error
      clearLockoutInfo(user.id)
      setHasPin(false)
      setPinMsg('PIN הוסר בהצלחה')
      setTimeout(() => closePinMode(), 1600)
    } catch (e) {
      setPinMsg('שגיאה: ' + (e.message || ''))
    } finally {
      setSavingPin(false)
    }
  }

  // ─── PIN: dispatch by mode ───────────────────────────────────────
  function handlePinSubmit() {
    if (pinMode === 'set') return handlePinSet()
    if (pinMode === 'change') return handlePinChange()
    if (pinMode === 'remove') return handlePinRemove()
  }

  if (loading) {
    return (
      <div dir="rtl" style={{ minHeight:'100vh', background:'#FAF8F4', fontFamily:FONT,
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div className="profile-spinner" style={{ borderColor:'#B8872D', borderTopColor:'transparent', width:32, height:32, borderWidth:3 }} />
      </div>
    )
  }

  const nameChanged = displayName.trim() !== originalName && displayName.trim().length > 0

  return (
    <div dir="rtl" style={{ minHeight:'100vh', background:'#FAF8F4', fontFamily:FONT, overflowX:'hidden' }}>
      <style>{PROFILE_STYLE}</style>

      {/* ── Header ── */}
      <div className="profile-page-padding" style={{ maxWidth:720, margin:'0 auto', padding:'24px 24px 0' }}>
        {/* Breadcrumb */}
        <nav style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#71717A', marginBottom:24 }}>
          <button onClick={() => navigate('/')} style={{
            background:'none', border:'none', color:'#71717A', cursor:'pointer', fontFamily:FONT, fontSize:13,
            padding:0, transition:'color 180ms',
          }}
            onMouseEnter={e => e.target.style.color = '#1A1A1A'}
            onMouseLeave={e => e.target.style.color = '#71717A'}>
            BARONS
          </button>
          <span>/</span>
          <span style={{ color:'#1A1A1A', fontWeight:600 }}>פרופיל</span>
        </nav>

        {/* Title */}
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:11, fontWeight:500, color:'#B8872D', letterSpacing:'2px',
            textTransform:'uppercase', marginBottom:6 }}>
            הגדרות אישיות
          </div>
          <h1 style={{ fontSize:36, fontWeight:900, color:'#1A1A1A', margin:0, lineHeight:1.1,
            letterSpacing:'-0.02em' }}>
            פרופיל
          </h1>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="profile-page-padding" style={{ maxWidth:720, margin:'0 auto', padding:'0 24px 48px' }}>

        {/* ── Section 1: Account info ────────────────────────────── */}
        <section className="profile-section profile-card-padding" style={{
          background:'#FFFFFF', borderRadius:20, padding:'28px 32px', marginBottom:20,
          border:'1px solid rgba(0,0,0,0.06)', boxShadow:'0 4px 14px rgba(0,0,0,0.04)',
        }}>
          <h2 className="profile-section-title" style={{ fontSize:18, fontWeight:700, color:'#1A1A1A', margin:'0 0 20px',
            letterSpacing:'-0.01em' }}>
            פרטי חשבון
          </h2>

          {/* Email (read-only) */}
          <div style={{ marginBottom:18 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#71717A',
              marginBottom:6, letterSpacing:'0.02em' }}>
              אימייל
            </label>
            <div style={{ fontSize:15, color:'#1A1A1A', fontFamily:FONT, padding:'10px 0',
              direction:'ltr', textAlign:'right' }}>
              {user?.email}
            </div>
          </div>

          {/* Display name */}
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#71717A',
              marginBottom:6, letterSpacing:'0.02em' }}>
              שם תצוגה
            </label>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
              <input
                className="profile-input"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="השם שלך"
                style={{
                  flex:1, minWidth:200,
                  padding:'10px 14px', borderRadius:10,
                  border:'1px solid rgba(0,0,0,0.12)',
                  fontSize:15, fontFamily:FONT, color:'#1A1A1A',
                  background:'#FAF8F4', outline:'none',
                  textAlign:'right',
                  transition:'border-color 180ms, box-shadow 180ms',
                }}
              />
              <button
                className="profile-btn-primary"
                onClick={saveName}
                disabled={!nameChanged || savingName}
                style={{
                  padding:'10px 20px', borderRadius:10, border:'none',
                  background:'#1A1A1A', color:'#FFFFFF',
                  fontSize:14, fontWeight:600, fontFamily:FONT,
                  cursor:'pointer', minWidth:80,
                  display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
                }}>
                {savingName ? <span className="profile-spinner" /> : 'שמור'}
              </button>
            </div>
            {nameMsg && (
              <div style={{ fontSize:12, color: nameMsg.startsWith('שגיאה') ? '#dc2626' : '#10b981',
                marginTop:8, fontWeight:500 }}>
                {nameMsg}
              </div>
            )}
          </div>
        </section>

        {/* ── Section 2: Password ───────────────────────────────── */}
        <section className="profile-section profile-card-padding" style={{
          background:'#FFFFFF', borderRadius:20, padding:'28px 32px', marginBottom:20,
          border:'1px solid rgba(0,0,0,0.06)', boxShadow:'0 4px 14px rgba(0,0,0,0.04)',
          animationDelay:'0.08s',
        }}>
          <h2 className="profile-section-title" style={{ fontSize:18, fontWeight:700, color:'#1A1A1A', margin:'0 0 8px',
            letterSpacing:'-0.01em' }}>
            סיסמה
          </h2>
          <div style={{ fontSize:13, color:'#71717A', marginBottom:18 }}>
            עדכון הסיסמה לחשבון שלך
          </div>

          {!showPwdForm ? (
            <button
              className="profile-btn-ghost"
              onClick={() => { setShowPwdForm(true); setPwdMsg('') }}
              style={{
                padding:'10px 18px', borderRadius:10,
                border:'1px solid rgba(0,0,0,0.12)',
                background:'transparent', color:'#1A1A1A',
                fontSize:14, fontWeight:600, fontFamily:FONT,
                cursor:'pointer',
              }}>
              שינוי סיסמה
            </button>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <input
                className="profile-input"
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="סיסמה חדשה (לפחות 6 תווים)"
                style={{
                  padding:'10px 14px', borderRadius:10,
                  border:'1px solid rgba(0,0,0,0.12)',
                  fontSize:15, fontFamily:FONT, color:'#1A1A1A',
                  background:'#FAF8F4', outline:'none',
                  textAlign:'right',
                  transition:'border-color 180ms, box-shadow 180ms',
                }}
              />
              <input
                className="profile-input"
                type="password"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="אימות סיסמה"
                style={{
                  padding:'10px 14px', borderRadius:10,
                  border:'1px solid rgba(0,0,0,0.12)',
                  fontSize:15, fontFamily:FONT, color:'#1A1A1A',
                  background:'#FAF8F4', outline:'none',
                  textAlign:'right',
                  transition:'border-color 180ms, box-shadow 180ms',
                }}
              />
              {pwdMsg && (
                <div style={{ fontSize:12, color: pwdMsg.includes('בהצלחה') ? '#10b981' : '#dc2626',
                  fontWeight:500 }}>
                  {pwdMsg}
                </div>
              )}
              <div style={{ display:'flex', gap:10, marginTop:4 }}>
                <button
                  className="profile-btn-primary"
                  onClick={changePassword}
                  disabled={savingPwd || !newPwd || !confirmPwd}
                  style={{
                    padding:'10px 20px', borderRadius:10, border:'none',
                    background:'#1A1A1A', color:'#FFFFFF',
                    fontSize:14, fontWeight:600, fontFamily:FONT,
                    cursor:'pointer',
                    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
                  }}>
                  {savingPwd ? <span className="profile-spinner" /> : 'עדכן סיסמה'}
                </button>
                <button
                  className="profile-btn-ghost"
                  onClick={() => { setShowPwdForm(false); setNewPwd(''); setConfirmPwd(''); setPwdMsg('') }}
                  disabled={savingPwd}
                  style={{
                    padding:'10px 18px', borderRadius:10,
                    border:'1px solid rgba(0,0,0,0.12)',
                    background:'transparent', color:'#71717A',
                    fontSize:14, fontWeight:600, fontFamily:FONT,
                    cursor:'pointer',
                  }}>
                  ביטול
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Section 3: PIN Code ─────────────────────────────── */}
        <section className="profile-section profile-card-padding" style={{
          background:'#FFFFFF', borderRadius:20, padding:'28px 32px', marginBottom:20,
          border:'1px solid rgba(0,0,0,0.06)', boxShadow:'0 4px 14px rgba(0,0,0,0.04)',
          animationDelay:'0.16s',
        }}>
          <h2 className="profile-section-title" style={{ fontSize:18, fontWeight:700, color:'#1A1A1A', margin:'0 0 8px',
            letterSpacing:'-0.01em' }}>
            קוד PIN
          </h2>
          <div style={{ fontSize:13, color:'#71717A', marginBottom:18 }}>
            {hasPin
              ? `קוד PIN בן ${PIN_LENGTH} ספרות פעיל לאימות חוזר`
              : `הגדר קוד PIN בן ${PIN_LENGTH} ספרות לאימות חוזר`}
          </div>

          {/* Idle state — show buttons */}
          {!pinMode && (
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              {hasPin && (
                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13,
                  color:'#10b981', fontWeight:600, marginLeft:'auto' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  פעיל
                </div>
              )}
              {!hasPin ? (
                <button
                  className="profile-btn-primary"
                  onClick={() => openPinMode('set')}
                  style={{
                    padding:'10px 20px', borderRadius:10, border:'none',
                    background:'#1A1A1A', color:'#FFFFFF',
                    fontSize:14, fontWeight:600, fontFamily:FONT,
                    cursor:'pointer',
                  }}>
                  הגדר PIN
                </button>
              ) : (
                <>
                  <button
                    className="profile-btn-ghost"
                    onClick={() => openPinMode('change')}
                    style={{
                      padding:'10px 18px', borderRadius:10,
                      border:'1px solid rgba(0,0,0,0.12)',
                      background:'transparent', color:'#1A1A1A',
                      fontSize:14, fontWeight:600, fontFamily:FONT,
                      cursor:'pointer',
                    }}>
                    שנה PIN
                  </button>
                  <button
                    className="profile-btn-ghost"
                    onClick={() => openPinMode('remove')}
                    style={{
                      padding:'10px 18px', borderRadius:10,
                      border:'1px solid rgba(220,38,38,0.2)',
                      background:'transparent', color:'#dc2626',
                      fontSize:14, fontWeight:600, fontFamily:FONT,
                      cursor:'pointer',
                    }}>
                    הסר PIN
                  </button>
                </>
              )}
            </div>
          )}

          {/* Form state — set / change / remove */}
          {pinMode && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* SET mode */}
              {pinMode === 'set' && pinStep === 1 && (
                <>
                  <label style={{ fontSize:12, fontWeight:600, color:'#71717A' }}>
                    קוד PIN חדש ({PIN_LENGTH} ספרות)
                  </label>
                  <PinInput value={pinNew} onChange={setPinNew} length={PIN_LENGTH} autoFocus />
                </>
              )}
              {pinMode === 'set' && pinStep === 2 && (
                <>
                  <label style={{ fontSize:12, fontWeight:600, color:'#71717A' }}>
                    אישור PIN — הקלד שוב
                  </label>
                  <PinInput value={pinConfirm} onChange={setPinConfirm} length={PIN_LENGTH} autoFocus />
                </>
              )}

              {/* CHANGE mode */}
              {pinMode === 'change' && pinStep === 1 && (
                <>
                  <label style={{ fontSize:12, fontWeight:600, color:'#71717A' }}>
                    קוד PIN נוכחי
                  </label>
                  <PinInput value={pinCurrent} onChange={setPinCurrent} length={PIN_LENGTH} autoFocus />
                  <label style={{ fontSize:12, fontWeight:600, color:'#71717A', marginTop:8 }}>
                    קוד PIN חדש ({PIN_LENGTH} ספרות)
                  </label>
                  <PinInput value={pinNew} onChange={setPinNew} length={PIN_LENGTH} />
                </>
              )}
              {pinMode === 'change' && pinStep === 2 && (
                <>
                  <label style={{ fontSize:12, fontWeight:600, color:'#71717A' }}>
                    אישור PIN חדש — הקלד שוב
                  </label>
                  <PinInput value={pinConfirm} onChange={setPinConfirm} length={PIN_LENGTH} autoFocus />
                </>
              )}

              {/* REMOVE mode */}
              {pinMode === 'remove' && (
                <>
                  <div style={{ fontSize:13, color:'#1A1A1A', marginBottom:4 }}>
                    הזן את סיסמת החשבון לאישור הסרת ה-PIN
                  </div>
                  <input
                    className="profile-input"
                    type="password"
                    value={pinPwdConfirm}
                    onChange={e => setPinPwdConfirm(e.target.value)}
                    placeholder="סיסמת החשבון"
                    autoFocus
                    style={{
                      padding:'10px 14px', borderRadius:10,
                      border:'1px solid rgba(0,0,0,0.12)',
                      fontSize:15, fontFamily:FONT, color:'#1A1A1A',
                      background:'#FAF8F4', outline:'none',
                      textAlign:'right',
                      transition:'border-color 180ms, box-shadow 180ms',
                    }}
                  />
                </>
              )}

              {pinMsg && (
                <div style={{ fontSize:12,
                  color: (pinMsg.includes('בהצלחה') || pinMsg.includes('הוסר')) ? '#10b981' : '#dc2626',
                  fontWeight:500 }}>
                  {pinMsg}
                </div>
              )}

              <div style={{ display:'flex', gap:10, marginTop:4 }}>
                <button
                  className="profile-btn-primary"
                  onClick={handlePinSubmit}
                  disabled={savingPin}
                  style={{
                    padding:'10px 20px', borderRadius:10, border:'none',
                    background: pinMode === 'remove' ? '#dc2626' : '#1A1A1A',
                    color:'#FFFFFF',
                    fontSize:14, fontWeight:600, fontFamily:FONT,
                    cursor:'pointer', minWidth:110,
                    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
                  }}>
                  {savingPin ? <span className="profile-spinner" /> : (
                    pinMode === 'remove' ? 'הסר PIN' :
                    (pinStep === 1 && pinMode !== 'remove') ? 'המשך' : 'שמור'
                  )}
                </button>
                <button
                  className="profile-btn-ghost"
                  onClick={closePinMode}
                  disabled={savingPin}
                  style={{
                    padding:'10px 18px', borderRadius:10,
                    border:'1px solid rgba(0,0,0,0.12)',
                    background:'transparent', color:'#71717A',
                    fontSize:14, fontWeight:600, fontFamily:FONT,
                    cursor:'pointer',
                  }}>
                  ביטול
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Placeholder for future sections (Passkeys) ── */}
        <section className="profile-section profile-card-padding" style={{
          background:'rgba(184,135,45,0.06)', borderRadius:20, padding:'20px 32px',
          border:'1px dashed rgba(184,135,45,0.3)',
          animationDelay:'0.24s',
        }}>
          <div style={{ fontSize:13, color:'#B8872D', fontWeight:600, marginBottom:4 }}>
            🔐 בקרוב
          </div>
          <div style={{ fontSize:13, color:'#71717A' }}>
            כניסה ביומטרית (Face ID / Touch ID) ועמודים מוגנים
          </div>
        </section>

      </div>
    </div>
  )
}
