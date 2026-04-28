// ============================================================
// BARONS — Biometric Lock Utilities
// Manages "is this route currently unlocked?" state in localStorage.
//
// To add or remove a protected route, edit PROTECTED_ROUTES below.
// ============================================================

// Routes that require biometric/PIN authentication on entry
export const PROTECTED_ROUTES = ['/travels', '/vouchers', '/assets']

// How long an unlock lasts before re-prompting (in minutes)
// This will become per-user once we add the user-preference UI.
const DEFAULT_TTL_MINUTES = 15

// localStorage key prefix
const STORAGE_PREFIX = 'barons_unlock_'

// ─── Match a path to a protected route ──────────────────────────────
// Handles cases like /travels/abc123 → /travels
export function matchProtectedRoute(pathname) {
  if (!pathname) return null
  // Find the longest protected prefix that matches
  for (const route of PROTECTED_ROUTES) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return route
    }
  }
  return null
}

// ─── Check if a route is currently unlocked ─────────────────────────
export function isUnlocked(route, userId) {
  if (!route || !userId) return false
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}_${route}`)
    if (!raw) return false
    const expiresAt = parseInt(raw, 10)
    if (!expiresAt || Date.now() > expiresAt) {
      localStorage.removeItem(`${STORAGE_PREFIX}${userId}_${route}`)
      return false
    }
    return true
  } catch {
    return false
  }
}

// ─── Mark a route as unlocked for the next TTL minutes ──────────────
export function markUnlocked(route, userId, ttlMinutes = DEFAULT_TTL_MINUTES) {
  if (!route || !userId) return
  try {
    const expiresAt = Date.now() + ttlMinutes * 60 * 1000
    localStorage.setItem(`${STORAGE_PREFIX}${userId}_${route}`, String(expiresAt))
  } catch {
    // localStorage full or disabled - silently fail
  }
}

// ─── Clear unlock state (e.g., on logout) ───────────────────────────
export function clearAllUnlocks(userId) {
  if (!userId) return
  try {
    const prefix = `${STORAGE_PREFIX}${userId}_`
    const toRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) toRemove.push(key)
    }
    toRemove.forEach(k => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

// ─── Clear single unlock (e.g., explicit "lock now") ────────────────
export function clearUnlock(route, userId) {
  if (!route || !userId) return
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${userId}_${route}`)
  } catch {
    // ignore
  }
}
