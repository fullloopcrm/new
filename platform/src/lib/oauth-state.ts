/**
 * Signed OAuth `state` for the Google Business connect flow. The callback stores
 * tokens under the tenant named in `state`, so an unsigned state let an attacker
 * craft a callback that binds a Google account to a chosen tenant (CSRF / CWE-352).
 * We HMAC-sign the tenant id + a short expiry so only our own /auth init can mint
 * a state the /callback will accept.
 */
import crypto from 'crypto'

const TTL_MS = 15 * 60 * 1000 // 15 minutes

function secret(): string {
  const s = process.env.ADMIN_TOKEN_SECRET
  if (!s) throw new Error('ADMIN_TOKEN_SECRET required for OAuth state signing')
  return s
}

export function signOAuthState(tenantId: string): string {
  const payload = `${tenantId}.${Date.now() + TTL_MS}`
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('hex')
  return `${payload}.${sig}`
}

/** Returns the verified tenantId, or null if the state is forged/expired/malformed. */
export function verifyOAuthState(state: string | null | undefined): string | null {
  if (!state) return null
  const parts = state.split('.')
  if (parts.length !== 3) return null
  const [tenantId, exp, sig] = parts
  const expected = crypto.createHmac('sha256', secret()).update(`${tenantId}.${exp}`).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  if (!crypto.timingSafeEqual(a, b)) return null
  if (!Number.isFinite(Number(exp)) || Date.now() > Number(exp)) return null
  return tenantId || null
}
