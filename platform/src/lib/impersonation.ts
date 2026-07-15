import crypto from 'node:crypto'

/**
 * Signed impersonation cookie helpers.
 * Cookie value format: `<tenantId>.<exp>.<hmac>` where hmac is HMAC-SHA256 of
 * `<tenantId>.<exp>` under ADMIN_TOKEN_SECRET and exp is an epoch-ms deadline.
 *
 * Why: before signing, a client could forge `fl_impersonate=<any-tenant-id>`
 * and, combined with a stolen/leaked admin_token, impersonate arbitrary tenants.
 * The signature proves the cookie was minted by our server.
 *
 * Why exp is embedded (not just relied on via the cookie's Max-Age): Max-Age is
 * a client-enforced hint, not a security boundary — a captured cookie value
 * (proxy/access-log capture, browser devtools on a shared machine, etc.) can be
 * replayed with any Max-Age the replayer likes. The admin_token/tenant-admin
 * tokens this cookie is always paired with already embed+verify `exp` server
 * side (see admin-auth/route.ts); this brings the impersonation cookie in line
 * with that same pattern instead of being the one token that never expires.
 */
export const IMPERSONATE_COOKIE = 'fl_impersonate'
export const IMPERSONATE_TTL_MS = 60 * 60 * 1000 // 1 hour

export function signImpersonation(tenantId: string): string {
  const secret = process.env.ADMIN_TOKEN_SECRET
  if (!secret) throw new Error('ADMIN_TOKEN_SECRET not configured')
  const exp = Date.now() + IMPERSONATE_TTL_MS
  const payload = `${tenantId}.${exp}`
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${hmac}`
}

/**
 * Returns the validated tenantId if the cookie is genuine and unexpired, else
 * null. Accepts legacy unsigned values too (raw UUID) when
 * IMPERSONATION_ALLOW_UNSIGNED=1 — useful during rolling cutover; remove once
 * all in-flight sessions have rotated. Older signed cookies (pre-expiry,
 * `<uuid>.<hmac>` with no exp segment) are rejected rather than grandfathered
 * in — they carry no expiry to check, and this cookie's Max-Age is only 1
 * hour, so forcing re-impersonation after a deploy costs nothing.
 */
export function verifyImpersonationCookie(raw: string | undefined): string | null {
  if (!raw) return null
  const secret = process.env.ADMIN_TOKEN_SECRET
  if (!secret) return null

  const parts = raw.split('.')

  // Signed form: "<uuid>.<exp>.<hex>"
  if (parts.length === 3) {
    const [tenantId, expStr, sig] = parts
    const exp = Number(expStr)
    if (!Number.isFinite(exp)) return null
    const payload = `${tenantId}.${expStr}`
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
    if (exp <= Date.now()) return null
    return tenantId
  }

  // Legacy unsigned form (raw UUID, no dots) — only accept if explicitly allowed.
  if (parts.length === 1 && process.env.IMPERSONATION_ALLOW_UNSIGNED === '1') return raw
  return null
}
