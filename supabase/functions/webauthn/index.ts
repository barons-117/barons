// ============================================================
// BARONS — WebAuthn Edge Function
// Handles passkey registration and authentication for biometric login
// ============================================================
//
// Endpoints (POST):
//   action: 'register-options'      → Start passkey registration
//   action: 'register-verify'       → Verify and store passkey
//   action: 'authenticate-options'  → Start authentication challenge
//   action: 'authenticate-verify'   → Verify authentication signature
//
// Auth model:
//   register-* → require JWT (user must be logged in to register a device)
//   authenticate-* → may be called with OR without JWT
//      - With JWT: re-prompt flow (already logged in, asking for face id)
//      - Without JWT: passwordless login (find user by credential id)
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from 'jsr:@simplewebauthn/server@13.3.0'
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from 'jsr:@simplewebauthn/server@13.3.0'

// ─── Config ────────────────────────────────────────────────────────────
const RP_NAME = 'BARONS'
const RP_ID = 'barons.co.il'                    // Production
const RP_ID_LOCAL = 'localhost'                  // Development
const ORIGIN_PROD = 'https://barons.co.il'
const ORIGIN_DEV  = 'http://localhost:5173'

// Challenge cache TTL: 5 minutes
const CHALLENGE_TTL_MS = 5 * 60 * 1000

// ─── In-memory challenge store (per-instance) ────────────────────────
// Note: Edge Functions are short-lived isolates; we store the challenge
// in the database row itself instead of memory to survive cold starts.
// We use a temporary `pending_challenge` column on user_profiles for register,
// and a generic `pending_auth_challenges` table for authenticate.
// For simplicity, we'll use the user_profiles row for both during registration,
// and a small temp table for anonymous auth.
//
// → For the MVP, we keep challenges in a tiny temp table `webauthn_challenges`.

// ─── CORS ────────────────────────────────────────────────────────────────
function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [ORIGIN_PROD, ORIGIN_DEV]
  const requestOrigin = origin && allowedOrigins.includes(origin) ? origin : ORIGIN_PROD
  return {
    'Access-Control-Allow-Origin': requestOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────
function pickRpId(originHeader: string | null): { rpId: string; origin: string } {
  if (originHeader === ORIGIN_DEV) {
    return { rpId: RP_ID_LOCAL, origin: ORIGIN_DEV }
  }
  return { rpId: RP_ID, origin: ORIGIN_PROD }
}

function jsonResponse(data: unknown, init: ResponseInit, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...(init.headers || {}),
    },
  })
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let str = ''
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i])
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=')
  const str = atob(b64)
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i)
  return bytes
}

// Get user from JWT (returns null if missing/invalid)
async function getAuthUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

// ─── Challenge storage (DB-backed, survives cold starts) ─────────────────
async function storeChallenge(
  supabase: ReturnType<typeof createClient>,
  key: string,
  challenge: string,
  userId: string | null,
) {
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString()
  await supabase
    .from('webauthn_challenges')
    .upsert({ key, challenge, user_id: userId, expires_at: expiresAt }, { onConflict: 'key' })
}

async function consumeChallenge(
  supabase: ReturnType<typeof createClient>,
  key: string,
): Promise<{ challenge: string; user_id: string | null } | null> {
  const { data, error } = await supabase
    .from('webauthn_challenges')
    .select('challenge, user_id, expires_at')
    .eq('key', key)
    .maybeSingle()
  if (error || !data) return null
  // Delete it (one-time use)
  await supabase.from('webauthn_challenges').delete().eq('key', key)
  // Check expiry
  if (new Date(data.expires_at).getTime() < Date.now()) return null
  return { challenge: data.challenge, user_id: data.user_id }
}

// ============================================================
// HANDLERS
// ============================================================

// ─── 1. REGISTER OPTIONS ─────────────────────────────────────────────────
async function handleRegisterOptions(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  corsHeaders: Record<string, string>,
) {
  const user = await getAuthUser(req, supabase)
  if (!user) return jsonResponse({ error: 'unauthenticated' }, { status: 401 }, corsHeaders)

  const { rpId } = pickRpId(req.headers.get('Origin'))

  // Get any existing passkeys for this user to exclude (avoid double-registration)
  const { data: existing } = await supabase
    .from('user_passkeys')
    .select('credential_id, transports')
    .eq('user_id', user.id)

  const excludeCredentials = (existing || []).map((c: { credential_id: string; transports: string[] | null }) => ({
    id: c.credential_id,
    transports: c.transports ?? undefined,
  }))

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpId,
    userName: user.email ?? user.id,
    userDisplayName: user.email ?? user.id,
    userID: new TextEncoder().encode(user.id),
    timeout: 60_000,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
  })

  // Store challenge for verification step
  await storeChallenge(supabase, `reg:${user.id}`, options.challenge, user.id)

  return jsonResponse({ options }, { status: 200 }, corsHeaders)
}

// ─── 2. REGISTER VERIFY ──────────────────────────────────────────────────
interface RegisterVerifyBody {
  response: RegistrationResponseJSON
  device_name?: string
}

async function handleRegisterVerify(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  corsHeaders: Record<string, string>,
) {
  const user = await getAuthUser(req, supabase)
  if (!user) return jsonResponse({ error: 'unauthenticated' }, { status: 401 }, corsHeaders)

  const body = (await req.json()) as RegisterVerifyBody
  const { response, device_name } = body

  if (!response) return jsonResponse({ error: 'missing response' }, { status: 400 }, corsHeaders)

  const stored = await consumeChallenge(supabase, `reg:${user.id}`)
  if (!stored) return jsonResponse({ error: 'challenge expired' }, { status: 400 }, corsHeaders)

  const { rpId, origin } = pickRpId(req.headers.get('Origin'))

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: true,
    })
  } catch (e) {
    return jsonResponse(
      { error: 'verification failed', detail: (e as Error).message },
      { status: 400 },
      corsHeaders,
    )
  }

  if (!verification.verified || !verification.registrationInfo) {
    return jsonResponse({ error: 'not verified' }, { status: 400 }, corsHeaders)
  }

  const { credential } = verification.registrationInfo
  const credentialId = credential.id              // base64url string
  const publicKey = bytesToBase64Url(credential.publicKey)
  const counter = credential.counter
  const transports = response.response.transports || []

  // Save to DB
  const { error: insertError } = await supabase.from('user_passkeys').insert({
    user_id: user.id,
    credential_id: credentialId,
    public_key: publicKey,
    counter,
    device_name: device_name || 'מכשיר חדש',
    transports,
    last_used_at: new Date().toISOString(),
  })

  if (insertError) {
    return jsonResponse(
      { error: 'db insert failed', detail: insertError.message },
      { status: 500 },
      corsHeaders,
    )
  }

  return jsonResponse({ verified: true }, { status: 200 }, corsHeaders)
}

// ─── 3. AUTHENTICATE OPTIONS ─────────────────────────────────────────────
interface AuthOptionsBody {
  email?: string  // Optional: if provided + no JWT, used to find user's passkeys
}

async function handleAuthenticateOptions(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  corsHeaders: Record<string, string>,
) {
  const { rpId } = pickRpId(req.headers.get('Origin'))
  const user = await getAuthUser(req, supabase)
  const body = (await req.json().catch(() => ({}))) as AuthOptionsBody

  let userIdForChallenge: string | null = null
  let allowCredentials: { id: string; transports?: string[] }[] = []

  if (user) {
    // Re-prompt scenario: logged-in user, fetch their passkeys
    userIdForChallenge = user.id
    const { data } = await supabase
      .from('user_passkeys')
      .select('credential_id, transports')
      .eq('user_id', user.id)
    allowCredentials = (data || []).map((c: { credential_id: string; transports: string[] | null }) => ({
      id: c.credential_id,
      transports: c.transports ?? undefined,
    }))
    if (allowCredentials.length === 0) {
      return jsonResponse({ error: 'no passkeys registered' }, { status: 404 }, corsHeaders)
    }
  } else if (body.email) {
    // Login scenario: look up user by email via service role, then their passkeys
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: userList } = await serviceClient.auth.admin.listUsers()
    const target = userList?.users?.find((u) => u.email === body.email)
    if (!target) return jsonResponse({ error: 'user not found' }, { status: 404 }, corsHeaders)

    userIdForChallenge = target.id
    const { data } = await serviceClient
      .from('user_passkeys')
      .select('credential_id, transports')
      .eq('user_id', target.id)
    allowCredentials = (data || []).map((c: { credential_id: string; transports: string[] | null }) => ({
      id: c.credential_id,
      transports: c.transports ?? undefined,
    }))
    if (allowCredentials.length === 0) {
      return jsonResponse({ error: 'no passkeys registered' }, { status: 404 }, corsHeaders)
    }
  } else {
    // No user, no email — discoverable credentials flow (we don't pre-list)
    userIdForChallenge = null
  }

  const options = await generateAuthenticationOptions({
    rpID: rpId,
    timeout: 60_000,
    userVerification: 'required',
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
  })

  // Store challenge under a key — for re-prompt use user.id, for login use random key returned to client
  let challengeKey: string
  if (userIdForChallenge) {
    challengeKey = `auth:${userIdForChallenge}`
  } else {
    challengeKey = `auth:anon:${crypto.randomUUID()}`
  }
  await storeChallenge(supabase, challengeKey, options.challenge, userIdForChallenge)

  return jsonResponse({ options, challenge_key: challengeKey }, { status: 200 }, corsHeaders)
}

// ─── 4. AUTHENTICATE VERIFY ──────────────────────────────────────────────
interface AuthVerifyBody {
  response: AuthenticationResponseJSON
  challenge_key?: string  // Required if not authenticated via JWT
}

async function handleAuthenticateVerify(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  corsHeaders: Record<string, string>,
) {
  const user = await getAuthUser(req, supabase)
  const body = (await req.json()) as AuthVerifyBody
  const { response, challenge_key } = body

  if (!response) return jsonResponse({ error: 'missing response' }, { status: 400 }, corsHeaders)

  // Determine which challenge key to consume
  const key = user ? `auth:${user.id}` : challenge_key
  if (!key) return jsonResponse({ error: 'missing challenge key' }, { status: 400 }, corsHeaders)

  const stored = await consumeChallenge(supabase, key)
  if (!stored) return jsonResponse({ error: 'challenge expired' }, { status: 400 }, corsHeaders)

  const { rpId, origin } = pickRpId(req.headers.get('Origin'))

  // Look up the credential being used
  const credentialId = response.id
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data: passkey, error: pkError } = await serviceClient
    .from('user_passkeys')
    .select('id, user_id, credential_id, public_key, counter, transports')
    .eq('credential_id', credentialId)
    .maybeSingle()

  if (pkError || !passkey) {
    return jsonResponse({ error: 'unknown credential' }, { status: 400 }, corsHeaders)
  }

  // If user came in with JWT, verify that the credential belongs to them
  if (user && passkey.user_id !== user.id) {
    return jsonResponse({ error: 'credential mismatch' }, { status: 403 }, corsHeaders)
  }

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      credential: {
        id: passkey.credential_id,
        publicKey: base64UrlToBytes(passkey.public_key),
        counter: Number(passkey.counter),
        transports: passkey.transports ?? undefined,
      },
      requireUserVerification: true,
    })
  } catch (e) {
    return jsonResponse(
      { error: 'verification failed', detail: (e as Error).message },
      { status: 400 },
      corsHeaders,
    )
  }

  if (!verification.verified) {
    return jsonResponse({ error: 'not verified' }, { status: 400 }, corsHeaders)
  }

  // Update counter and last_used_at
  await serviceClient
    .from('user_passkeys')
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', passkey.id)

  // If this is a passwordless login (no JWT), generate a Supabase session token
  if (!user) {
    // Use admin API to create a session for this user
    const { data: sessionData, error: sessionError } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email: (await serviceClient.auth.admin.getUserById(passkey.user_id)).data.user?.email ?? '',
    })

    if (sessionError) {
      return jsonResponse(
        { error: 'session creation failed', detail: sessionError.message },
        { status: 500 },
        corsHeaders,
      )
    }

    return jsonResponse(
      {
        verified: true,
        passwordless: true,
        // The frontend will use this to complete login
        action_link: sessionData.properties?.action_link,
      },
      { status: 200 },
      corsHeaders,
    )
  }

  // Re-prompt scenario: just confirm verification
  return jsonResponse({ verified: true }, { status: 200 }, corsHeaders)
}

// ============================================================
// MAIN ENTRY
// ============================================================
Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('Origin'))

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, { status: 405 }, corsHeaders)
  }

  // Initialize Supabase client (uses caller's JWT for RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    },
  )

  try {
    const url = new URL(req.url)
    // Parse action either from query string or body
    let action = url.searchParams.get('action')
    let body: Record<string, unknown> = {}
    if (!action) {
      // Try body
      try {
        body = await req.clone().json()
        action = body.action as string | null
      } catch {
        // ignore
      }
    }

    switch (action) {
      case 'register-options':
        return await handleRegisterOptions(req, supabase, corsHeaders)
      case 'register-verify':
        return await handleRegisterVerify(req, supabase, corsHeaders)
      case 'authenticate-options':
        return await handleAuthenticateOptions(req, supabase, corsHeaders)
      case 'authenticate-verify':
        return await handleAuthenticateVerify(req, supabase, corsHeaders)
      default:
        return jsonResponse(
          { error: 'unknown action', valid: ['register-options', 'register-verify', 'authenticate-options', 'authenticate-verify'] },
          { status: 400 },
          corsHeaders,
        )
    }
  } catch (e) {
    return jsonResponse(
      { error: 'internal error', detail: (e as Error).message },
      { status: 500 },
      corsHeaders,
    )
  }
})
