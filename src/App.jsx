import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import Travels from './pages/Travels'
import TripDetail from './pages/TripDetail'
import Search from './pages/Search'
import Stats from './pages/Stats'
import Vouchers from './pages/Vouchers'
import Cards from './pages/Cards'
import Recipes from './pages/Recipes'
import RecipeDetail from './pages/RecipeDetail'
import Marathon from './pages/Marathon'
import Gym from './pages/Gym'
import FamilyTree from './pages/FamilyTree'
import Shopping from './pages/Shopping'
import ShoppingQuick from './pages/ShoppingQuick'

// ─── Permissions ──────────────────────────────────────────────────────────────
const SUPER_ADMIN = 'erez@barons.co.il'

const ROUTE_PERMISSIONS = {
  '/travels':  [SUPER_ADMIN],
  '/search':   [SUPER_ADMIN],
  '/stats':    [SUPER_ADMIN],
  '/vouchers': [SUPER_ADMIN, 'roy@barons.co.il'],
  '/cards':    [SUPER_ADMIN, 'roy@barons.co.il'],
  '/recipes':  [SUPER_ADMIN, 'roy@barons.co.il', 'user@barons.co.il'],
  '/marathon': [SUPER_ADMIN, 'roy@barons.co.il'],
  '/gym':      [SUPER_ADMIN],
  '/family':   [SUPER_ADMIN, 'roy@barons.co.il', 'user@barons.co.il'],
  '/shopping': [SUPER_ADMIN, 'roy@barons.co.il', 'user@barons.co.il'],
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

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0f1a2e', color:'white', fontSize:'20px' }}>BARONS</div>
  )

  const G = (route, el) => <Guard session={session} route={route}>{el}</Guard>

  return (
    <HashRouter>
      <Routes>
        <Route path="/"                element={<Home session={session} />} />
        <Route path="/travels"         element={G('/travels',  <Travels      session={session} />)} />
        <Route path="/travels/:id"     element={G('/travels',  <TripDetail   session={session} />)} />
        <Route path="/search"          element={G('/search',   <Search       session={session} />)} />
        <Route path="/stats"           element={G('/stats',    <Stats        session={session} />)} />
        <Route path="/vouchers"        element={G('/vouchers', <Vouchers     session={session} />)} />
        <Route path="/cards"           element={G('/cards',    <Cards        session={session} />)} />
        <Route path="/recipes"         element={G('/recipes',  <Recipes      session={session} />)} />
        <Route path="/recipes/:id"     element={G('/recipes',  <RecipeDetail session={session} />)} />
        <Route path="/marathon"        element={G('/marathon', <Marathon     session={session} />)} />
        <Route path="/gym"             element={G('/gym',      <Gym          session={session} />)} />
        <Route path="/family"          element={G('/family',   <FamilyTree   session={session} />)} />
        <Route path="/shopping"        element={G('/shopping', <Shopping     session={session} />)} />
        <Route path="/shopping-quick"  element={<ShoppingQuick />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
