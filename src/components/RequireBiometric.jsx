import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser'
import { matchProtectedRoute, isUnlocked, markUnlocked } from '../lib/biometricLock'

const FONT = "'Open Sans Hebrew', 'Open Sans', Arial, sans-serif"
const PIN_LENGTH = 6
const PIN_MAX_ATTEMPTS = 5
const PIN_LOCKOUT_MINUTES = 15

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL || 'https://cwewsfuswiiliritikvh.supabase.co'}/functions/v1/webauthn`

// ─── Inline crypto helpers (mirrors Profile.jsx) ─────────────────────
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(pin + ':' + salt)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(buf))
}

// ─── Lockout helpers (shared with Profile.jsx) ──────────────────────
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

// ─── Animations ─────────────────────────────────────────────────────
const LOCK_STYLE = `
  @keyframes lock-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lock-spin {
    from { transform: rotate(0deg); } to { transform: rotate(360deg); }
  }
  @keyframes lock-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.85; }
  }
  .lock-screen-enter { animation: lock-fade-in 0.4s cubic-bezier(0.23,1,0.32,1) both; }
  .lock-icon-pulse { animation: lock-pulse 2s ease-in-out infinite; }
  .lock-spinner {
    width: 14px; height: 14px; border: 2px solid #fff;
    border-top-color: transparent; border-radius: 50%;
    animation: lock-spin 0.7s linear infinite;
    display: inline-block;
  }
  .lock-btn-primary {
    transition: transform 180ms cubic-bezier(0.23,1,0.32,1), box-shadow 180ms;
  }
  .lock-btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(26,26,26,0.18);
  }
  .lock-btn-primary:active:not(:disabled) { transform: translateY(0) scale(0.98); }
  .lock-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
`

// ─── PinInput (same component as Profile.jsx, inlined for self-containment) ──
function PinInput({ value, onChange, length = 6, autoFocus = false, disabled = false }) {
  const inputsRef = useRef([])

  function handleChange(idx, char) {
    if (char && !/^\d$/.test(char)) return
    const arr = value.padEnd(length, ' ').split('')
    arr[idx] = char || ' '
    const newVal = arr.join('').replace(/\s+$/, '')
    onChange(newVal)
    if (char && idx < length - 1) inputsRef.current[idx + 1]?.focus()
  }

  function handleKey(idx, e) {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) inputsRef.current[idx - 1]?.focus()
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, length)
    if (pasted) {
      onChange(pasted)
      inputsRef.current[Math.min(pasted.length, length - 1)]?.focus()
    }
  }

  return (
    <div style={{ display:'flex', gap:8, direction:'ltr', justifyContent:'center' }}>
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
          disabled={disabled}
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

// ============================================================
// Main wrapper
// ============================================================
export default function RequireBiometric({ route: explicitRoute, children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const route = explicitRoute || matchProtectedRoute(location.pathname)

  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [unlocked, setUnlocked] = useState(false)

  // UI mode: 'biometric' | 'pin'
  const [mode, setMode] = useState('biometric')

  // Biometric state
  const [bioStatus, setBioStatus] = useState('idle')  // 'idle' | 'prompting' | 'failed' | 'cancelled' | 'no-passkeys' | 'unsupported'
  const [bioError, setBioError] = useState('')
  const bioTriggeredRef = useRef(false)

  // PIN state
  const [pin, setPin] = useState('')
  const [pinChecking, setPinChecking] = useState(false)
  const [pinError, setPinError] = useState('')
  const [hasPinConfigured, setHasPinConfigured] = useState(false)

  // ─── Initial check: user, route, current unlock status ──────────
  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (cancelled) return

      if (!u) { navigate('/'); return }
      setUser(u)

      // No protected route → just allow
      if (!route) { setUnlocked(true); setChecking(false); return }

      // Already unlocked recently? skip
      if (isUnlocked(route, u.id)) {
        setUnlocked(true); setChecking(false); return
      }

      // Check if user has PIN configured
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('pin_hash')
        .eq('user_id', u.id)
        .maybeSingle()
      if (cancelled) return
      setHasPinConfigured(!!profile?.pin_hash)

      // Check WebAuthn support
      if (!browserSupportsWebAuthn()) {
        setBioStatus('unsupported')
        setMode('pin')
        setChecking(false)
        return
      }

      // Check if user has any passkeys
      const { data: passkeys } = await supabase
        .from('user_passkeys')
        .select('id')
        .eq('user_id', u.id)
        .limit(1)
      if (cancelled) return

      if (!passkeys || passkeys.length === 0) {
        // No passkeys registered → fall back to PIN
        setBioStatus('no-passkeys')
        setMode('pin')
        setChecking(false)
        return
      }

      setChecking(false)
    }
    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route])

  // ─── Auto-trigger biometric prompt once ready ───────────────────
  useEffect(() => {
    if (checking || unlocked || mode !== 'biometric') return
    if (bioStatus !== 'idle') return
    if (bioTriggeredRef.current) return
    bioTriggeredRef.current = true
    triggerBiometric()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, unlocked, mode, bioStatus])

  // ─── Trigger Face ID / Touch ID flow ────────────────────────────
  async function triggerBiometric() {
    setBioStatus('prompting')
    setBioError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('לא מחובר')
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      }

      // Step 1: Get authentication options
      const optsRes = await fetch(`${EDGE_FN_URL}?action=authenticate-options`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      })
      const optsBody = await optsRes.json()
      if (!optsRes.ok) {
        throw new Error(optsBody.error || optsBody.detail || 'שגיאה בקבלת אפשרויות אימות')
      }

      // Step 2: Trigger native prompt
      let authResp
      try {
        authResp = await startAuthentication({ optionsJSON: optsBody.options })
      } catch (e) {
        if (e?.name === 'NotAllowedError') {
          setBioStatus('cancelled')
          return
        }
        throw new Error(e?.message || 'שגיאה בזיהוי הביומטרי')
      }

      // Step 3: Verify with Edge Function
      const verifyRes = await fetch(`${EDGE_FN_URL}?action=authenticate-verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ response: authResp }),
      })
      const verifyBody = await verifyRes.json()
      if (!verifyRes.ok || !verifyBody.verified) {
        throw new Error(verifyBody.error || verifyBody.detail || 'אימות נכשל')
      }

      // Success!
      markUnlocked(route, user.id)
      setUnlocked(true)
    } catch (e) {
      setBioStatus('failed')
      setBioError(e.message || 'שגיאה לא ידועה')
    }
  }

  // ─── PIN verification ───────────────────────────────────────────
  async function verifyPin() {
    if (pin.length !== PIN_LENGTH) {
      setPinError(`יש להזין ${PIN_LENGTH} ספרות`)
      return
    }
    // Check lockout
    const lockout = getLockoutInfo(user.id)
    if (lockout.lockedUntil > Date.now()) {
      const minsLeft = Math.ceil((lockout.lockedUntil - Date.now()) / 60000)
      setPinError(`חסום עקב ניסיונות שגויים. נסה שוב בעוד ${minsLeft} דקות`)
      return
    }

    setPinChecking(true)
    setPinError('')
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('pin_hash, pin_salt')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!profile?.pin_hash || !profile?.pin_salt) {
        setPinError('לא הוגדר PIN. עבור לפרופיל להגדיר.')
        setPinChecking(false)
        return
      }
      const inputHash = await hashPin(pin, profile.pin_salt)
      if (inputHash !== profile.pin_hash) {
        const newAttempts = lockout.attempts + 1
        if (newAttempts >= PIN_MAX_ATTEMPTS) {
          setLockoutInfo(user.id, { attempts: 0, lockedUntil: Date.now() + PIN_LOCKOUT_MINUTES * 60000 })
          setPinError(`נחסמת ל-${PIN_LOCKOUT_MINUTES} דקות עקב ניסיונות שגויים`)
        } else {
          setLockoutInfo(user.id, { attempts: newAttempts, lockedUntil: 0 })
          setPinError(`PIN שגוי (${PIN_MAX_ATTEMPTS - newAttempts} ניסיונות נותרו)`)
        }
        setPin('')
        setPinChecking(false)
        return
      }
      // Success!
      clearLockoutInfo(user.id)
      markUnlocked(route, user.id)
      setUnlocked(true)
    } catch (e) {
      setPinError('שגיאה: ' + (e.message || ''))
      setPinChecking(false)
    }
  }

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (mode === 'pin' && pin.length === PIN_LENGTH && !pinChecking) {
      verifyPin()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, mode])

  // ─── If still checking initial state — silent loading ──────────
  if (checking) {
    return (
      <div dir="rtl" style={{
        minHeight:'100vh', background:'#FAF8F4',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:FONT,
      }}>
        <div className="lock-spinner" style={{
          borderColor:'#B8872D', borderTopColor:'transparent',
          width:32, height:32, borderWidth:3,
        }} />
      </div>
    )
  }

  // ─── Unlocked — render children normally ───────────────────────
  if (unlocked) return children

  // ─── Lock screen ─────────────────────────────────────────────
  return (
    <div dir="rtl" className="lock-screen-enter" style={{
      minHeight:'100vh', background:'#FAF8F4',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:FONT, padding:'24px',
    }}>
      <style>{LOCK_STYLE}</style>

      <div style={{
        width:'100%', maxWidth:380,
        background:'#FFFFFF', borderRadius:24,
        padding:'40px 32px',
        border:'1px solid rgba(0,0,0,0.06)',
        boxShadow:'0 12px 40px rgba(0,0,0,0.08)',
        textAlign:'center',
      }}>
        {/* Lock icon */}
        <div className={bioStatus === 'prompting' ? 'lock-icon-pulse' : ''} style={{
          width:64, height:64, borderRadius:'50%',
          background:'linear-gradient(135deg,#F5D88B,#B8872D)',
          margin:'0 auto 20px',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 8px 24px rgba(184,135,45,0.35)',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        {/* Title */}
        <div style={{ fontSize:11, fontWeight:500, color:'#B8872D', letterSpacing:'2px',
          textTransform:'uppercase', marginBottom:6 }}>
          נדרש אימות
        </div>
        <h1 style={{ fontSize:24, fontWeight:900, color:'#1A1A1A', margin:'0 0 8px',
          letterSpacing:'-0.02em' }}>
          {mode === 'biometric' ? 'זיהוי ביומטרי' : 'הזן קוד PIN'}
        </h1>
        <div style={{ fontSize:13, color:'#71717A', marginBottom:28 }}>
          העמוד הזה מוגן
        </div>

        {/* ── Biometric mode ────────────────────────────────── */}
        {mode === 'biometric' && (
          <>
            {bioStatus === 'prompting' && (
              <div style={{ fontSize:14, color:'#1A1A1A', marginBottom:24 }}>
                ממתין לזיהוי...
              </div>
            )}

            {(bioStatus === 'failed' || bioStatus === 'cancelled') && (
              <>
                {bioError && (
                  <div style={{ fontSize:13, color:'#dc2626', marginBottom:18, fontWeight:500 }}>
                    {bioError}
                  </div>
                )}
                <button
                  className="lock-btn-primary"
                  onClick={() => { bioTriggeredRef.current = false; setBioStatus('idle'); }}
                  style={{
                    width:'100%',
                    padding:'12px 20px', borderRadius:12, border:'none',
                    background:'#1A1A1A', color:'#FFFFFF',
                    fontSize:15, fontWeight:600, fontFamily:FONT,
                    cursor:'pointer', marginBottom:12,
                  }}>
                  נסה Face ID / Touch ID שוב
                </button>
              </>
            )}

            {hasPinConfigured && (
              <button
                onClick={() => setMode('pin')}
                style={{
                  width:'100%',
                  padding:'12px 20px', borderRadius:12,
                  border:'1px solid rgba(0,0,0,0.12)',
                  background:'transparent', color:'#1A1A1A',
                  fontSize:15, fontWeight:600, fontFamily:FONT,
                  cursor:'pointer', marginBottom:12,
                }}>
                כניסה עם PIN במקום
              </button>
            )}
          </>
        )}

        {/* ── PIN mode ──────────────────────────────────────── */}
        {mode === 'pin' && (
          <>
            {bioStatus === 'unsupported' && (
              <div style={{ fontSize:12, color:'#71717A', marginBottom:16 }}>
                הדפדפן הזה לא תומך בזיהוי ביומטרי
              </div>
            )}
            {bioStatus === 'no-passkeys' && (
              <div style={{ fontSize:12, color:'#71717A', marginBottom:16 }}>
                לא רשום מכשיר ביומטרי בחשבון זה
              </div>
            )}

            {!hasPinConfigured ? (
              <div style={{ fontSize:13, color:'#dc2626', marginBottom:18 }}>
                לא הוגדר PIN. עבור ל"פרופיל" להגדיר.
              </div>
            ) : (
              <>
                <div style={{ marginBottom:16 }}>
                  <PinInput value={pin} onChange={setPin} length={PIN_LENGTH}
                    autoFocus disabled={pinChecking} />
                </div>
                {pinError && (
                  <div style={{ fontSize:13, color:'#dc2626', marginBottom:14, fontWeight:500 }}>
                    {pinError}
                  </div>
                )}
                {pinChecking && (
                  <div style={{ fontSize:13, color:'#71717A', marginBottom:14 }}>
                    בודק...
                  </div>
                )}
              </>
            )}

            {/* Switch back to biometric, only if available */}
            {bioStatus !== 'unsupported' && bioStatus !== 'no-passkeys' && (
              <button
                onClick={() => {
                  setMode('biometric')
                  setPin(''); setPinError('')
                  bioTriggeredRef.current = false
                  setBioStatus('idle')
                }}
                style={{
                  width:'100%',
                  padding:'12px 20px', borderRadius:12,
                  border:'1px solid rgba(0,0,0,0.12)',
                  background:'transparent', color:'#1A1A1A',
                  fontSize:15, fontWeight:600, fontFamily:FONT,
                  cursor:'pointer', marginBottom:12,
                }}>
                חזור לזיהוי ביומטרי
              </button>
            )}
          </>
        )}

        {/* ── Back to home ─────────────────────────────────── */}
        <button
          onClick={() => navigate('/')}
          style={{
            width:'100%',
            padding:'10px 20px', borderRadius:12,
            border:'none', background:'transparent', color:'#71717A',
            fontSize:13, fontWeight:500, fontFamily:FONT,
            cursor:'pointer',
          }}>
          ← חזרה לעמוד הראשי
        </button>
      </div>
    </div>
  )
}
