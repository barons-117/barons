import { useEffect, useRef, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import Travels from './pages/Travels'
import TripDetail from './pages/TripDetail'
import Search from './pages/Search'
import Stats from './pages/Stats'
import Vouchers from './pages/Vouchers'
import Recipes from './pages/Recipes'
import RecipeDetail from './pages/RecipeDetail'
import Marathon from './pages/Marathon'
import Gym from './pages/Gym'
import FamilyTree from './pages/FamilyTree'
import Shopping from './pages/Shopping'
import ShoppingQuick from './pages/ShoppingQuick'
import Assets from './pages/Assets'
import AssetDetail from './pages/AssetDetail'
import School from './pages/School'
import SmartHome from './pages/SmartHome'
import AliExpressOrders from './pages/AliExpressOrders'
import Countries from './pages/Countries'
import CountryDetail from './pages/CountryDetail'
import Profile from './pages/Profile'
import RequireBiometric from './components/RequireBiometric'
import { clearAllUnlocks } from './lib/biometricLock'


// ─── Permissions ──────────────────────────────────────────────────────────────
const SUPER_ADMIN = 'erez@barons.co.il'

const ROUTE_PERMISSIONS = {
  '/travels':    [SUPER_ADMIN],
  '/search':     [SUPER_ADMIN],
  '/stats':      [SUPER_ADMIN],
  '/assets':     [SUPER_ADMIN, 'roy@barons.co.il'],
  '/vouchers':   [SUPER_ADMIN, 'roy@barons.co.il'],
  '/recipes':    [SUPER_ADMIN, 'roy@barons.co.il', 'user@barons.co.il'],
  '/marathon':   [SUPER_ADMIN, 'roy@barons.co.il'],
  '/gym':        [SUPER_ADMIN],
  '/family':     [SUPER_ADMIN, 'roy@barons.co.il', 'user@barons.co.il'],
  '/shopping':   [SUPER_ADMIN, 'roy@barons.co.il', 'user@barons.co.il'],
  '/school':     [SUPER_ADMIN, 'roy@barons.co.il', 'daphna@barons.co.il', 'danielle@barons.co.il'],
  '/smarthome':  [SUPER_ADMIN, 'roy@barons.co.il'],
  '/aliexpress': [SUPER_ADMIN],
}

function canAccess(email, route) {
  if (!email) return false
  if (email === SUPER_ADMIN) return true
  return (ROUTE_PERMISSIONS[route] || []).includes(email)
}

function Guard({ session, route, children }) {
  if (!session) return <Navigate to="/" replace />
  if (!canAccess(session.user.email, route)) return <Navigate to="/" replace />
  return children
}

// Guard for routes that just require a logged-in user (no per-user route permissions)
function AuthOnly({ session, children }) {
  if (!session) return <Navigate to="/" replace />
  return children
}

// ─── Analytics ────────────────────────────────────────────────────────────────
const GA_ID = 'G-DLFH9B6GWW'

const ROUTE_NAMES = {
  '/':              'Home',
  '/travels':       'נסיעות — רשימה',
  '/search':        'חיפוש',
  '/stats':         'סטטיסטיקות',
  '/school':        'אקדמיה',
  '/smarthome':     'בית חכם',
  '/aliexpress':    'הזמנות AliExpress',
  '/countries':     'יעדים',
  '/country':       'עמוד יעד',
  '/vouchers':      'שוברים',
  '/gym':           'כושר',
  '/assets':        'נכסים',
  '/recipes':       'מתכונים',
  '/marathon':      'מרתון',
  '/family':        'עץ משפחה',
  '/shopping':      'קניות',
  '/shopping-quick':'קניות מהירות',
  '/profile':       'פרופיל',
}

function initAnalyticsUser(user) {
  if (typeof window.gtag !== 'function' || !user?.email) return
  const memberName = user.email.split('@')[0] // 'erez', 'roy', וכו'
  window.gtag('config', GA_ID, { user_id: user.email })
  window.gtag('set', 'user_properties', { family_member: memberName })
}

function clearAnalyticsUser() {
  if (typeof window.gtag !== 'function') return
  window.gtag('config', GA_ID, { user_id: undefined })
  window.gtag('set', 'user_properties', { family_member: 'guest' })
}

function trackPageView(path, title) {
  if (typeof window.gtag !== 'function') return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
    send_to: GA_ID,
  })
}

// קומפוננט פנימי — חייב להיות בתוך <HashRouter> כדי להשתמש ב-useLocation
function AnalyticsTracker({ session }) {
  const location = useLocation()
  const enterTimeRef = useRef(Date.now())
  const prevPathRef = useRef(null)

  // מעקב auth — מגדיר User ID כשמשתמש מתחבר/מתנתק
  useEffect(() => {
    if (session?.user) {
      initAnalyticsUser(session.user)
    } else {
      clearAnalyticsUser()
    }
  }, [session])

  // מעקב page views + זמן ששהינו בכל עמוד
  useEffect(() => {
    // חישוב base path (ללא /travels/some-uuid — רק /travels)
    const fullPath = location.pathname
    const basePath = '/' + fullPath.split('/').filter(Boolean)[0] || '/'
    const name = ROUTE_NAMES[basePath] || fullPath

    // שלח זמן ששהינו בעמוד הקודם (מינימום 3 שניות)
    if (prevPathRef.current !== null && prevPathRef.current !== fullPath) {
      const seconds = Math.round((Date.now() - enterTimeRef.current) / 1000)
      if (seconds >= 3) {
        window.gtag?.('event', 'time_on_section', {
          section: ROUTE_NAMES['/' + prevPathRef.current.split('/').filter(Boolean)[0]] || prevPathRef.current,
          seconds_spent: seconds,
        })
      }
    }

    // איפוס טיימר לעמוד החדש
    enterTimeRef.current = Date.now()
    prevPathRef.current = fullPath

    // שלח page_view
    trackPageView(fullPath, `BARONS — ${name}`)
  }, [location.pathname])

  return null // קומפוننט ללא UI
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      // On sign-out, clear all biometric unlock state for the previous user
      if (event === 'SIGNED_OUT' && session?.user?.id) {
        clearAllUnlocks(session.user.id)
      }
      setSession(newSession)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0f1a2e', color:'white', fontSize:'20px' }}>BARONS</div>
  )

  const G = (route, el) => <Guard session={session} route={route}>{el}</Guard>

  return (
    <HashRouter>
      {/* מעקב אנליטיקס — חייב להיות בתוך HashRouter */}
      <AnalyticsTracker session={session} />

      <Routes>
        <Route path="/"                element={<Home session={session} />} />
        <Route path="/travels"         element={G('/travels',     <RequireBiometric route="/travels"><Travels        session={session} /></RequireBiometric>)} />
        <Route path="/travels/:id"     element={G('/travels',     <RequireBiometric route="/travels"><TripDetail     session={session} /></RequireBiometric>)} />
        <Route path="/assets"          element={G('/assets',      <RequireBiometric route="/assets"><Assets         session={session} /></RequireBiometric>)} />
        <Route path="/assets/:id"      element={G('/assets',      <RequireBiometric route="/assets"><AssetDetail    session={session} /></RequireBiometric>)} />
        <Route path="/search"          element={G('/search',      <Search         session={session} />)} />
        <Route path="/stats"           element={G('/stats',       <Stats          session={session} />)} />
        <Route path="/vouchers"        element={G('/vouchers',    <RequireBiometric route="/vouchers"><Vouchers       session={session} /></RequireBiometric>)} />
        <Route path="/recipes"         element={G('/recipes',     <Recipes        session={session} />)} />
        <Route path="/recipes/:id"     element={G('/recipes',     <RecipeDetail   session={session} />)} />
        <Route path="/marathon"        element={G('/marathon',    <Marathon       session={session} />)} />
        <Route path="/gym"             element={G('/gym',         <Gym            session={session} />)} />
        <Route path="/family"          element={G('/family',      <FamilyTree     session={session} />)} />
        <Route path="/shopping"        element={G('/shopping',    <Shopping       session={session} />)} />
        <Route path="/school"          element={G('/school',      <School         session={session} />)} />
        <Route path="/smarthome"       element={G('/smarthome',   <SmartHome      session={session} />)} />
        <Route path="/aliexpress"      element={G('/aliexpress',  <AliExpressOrders session={session} />)} />
        <Route path="/profile"         element={<AuthOnly session={session}><Profile session={session} /></AuthOnly>} />
        <Route path="/countries"       element={G('/travels',     <Countries        session={session} />)} />
        <Route path="/country/:country" element={G('/travels',    <CountryDetail    session={session} />)} />
        <Route path="/shopping-quick"  element={<ShoppingQuick />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
