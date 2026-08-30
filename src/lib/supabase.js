import { createClient } from '@supabase/supabase-js'

// ------------------------------------------------------------
// תוספת יחידה מהגרסה המקורית: storage adapter שמכבד "זכור אותי".
// ברירת המחדל היא remember = true, כך שכל מי שמחובר היום נשאר מחובר.
// ------------------------------------------------------------
const REMEMBER_KEY = 'barons.remember'

/** true = localStorage (נשאר אחרי סגירת הדפדפן)
 *  false = sessionStorage (נמחק כשסוגרים את הטאב) */
export function setRememberMe(remember) {
  try {
    window.localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
  } catch (_) { /* מצב פרטי / אחסון חסום */ }
}

export function getRememberMe() {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) !== '0'
  } catch (_) {
    return true
  }
}

const smartStorage = {
  getItem(key) {
    try {
      const fromLocal = window.localStorage.getItem(key)
      if (fromLocal !== null) return fromLocal
      return window.sessionStorage.getItem(key)
    } catch (_) {
      return null
    }
  },
  setItem(key, value) {
    try {
      if (getRememberMe()) {
        window.localStorage.setItem(key, value)
        window.sessionStorage.removeItem(key)
      } else {
        window.sessionStorage.setItem(key, value)
        window.localStorage.removeItem(key)
      }
    } catch (_) { /* noop */ }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    } catch (_) { /* noop */ }
  },
}

export const supabase = createClient(
  'https://cwewsfuswiiliritikvh.supabase.co',
  'sb_publishable_qIHIRr47iAqiYoTn9aQIuQ_qteCIHk0',
  {
    auth: {
      storage: smartStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

export default supabase
