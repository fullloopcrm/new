import crypto from 'node:crypto'

/**
 * Signed impersonation cookie helpers.
 * Cookie value format: `<tenantId>:<exp>.<hmac>` where hmac is HMAC-SHA256 of
 * "<tenantId>:<exp>" under ADMIN_TOKEN_SECRET, and exp is a unix-ms timestamp.
 *
 * Why: before signing, a client could forge `fl_impersonate=<any-tenant-id>`
 * and, combined with a stolen/leaked admin_token, impersonate arbitrary tenants.
 * The signature proves the cookie was minted by our server.
 *
 * Why exp is embedded (not just left to the cookie's Max-Age): the browser-side
 * Max-Age is not cryptographically enforced — a captured cookie value (log leak,
 * XSS, shared HAR file) would otherwise stay validly-signed forever, well past
 * the intended 1-hour impersonation window, as long as it's replayed alongside a
 * still-valid admin_token. Every sibling token in this codebase (createAdminToken,
 * createTenantAdminToken) already embeds+checks exp; this closes the one gap.
 */
export const IMPERSONATE_COOKIE = 'fl_impersonate'
const DEFAULT_TTL_MS = 3600 * 1000 // 1 hour, matches the cookie's own Max-Age

export function signImpersonation(tenantId: string, ttlMs: number = DEFAULT_TTL_MS): string {
  const secret = process.env.ADMIN_TOKEN_SECRET
  if (!secret) throw new Error('ADMIN_TOKEN_SECRET not configured')
  const exp = Date.now() + ttlMs
  const payload = `${tenantId}:${exp}`
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${hmac}`
}

/**
 * Returns the validated tenantId if the cookie is genuine and unexpired, else null.
 * Accepts legacy unsigned values too (raw UUID) when IMPERSONATION_ALLOW_UNSIGNED=1
 * — useful during rolling cutover; remove once all in-flight sessions have rotated.
 */
export function verifyImpersonationCookie(raw: string | undefined): string | null {
  if (!raw) return null
  const secret = process.env.ADMIN_TOKEN_SECRET
  if (!secret) return null

  // Signed form: "<uuid>:<exp>.<hex>"
  const dotIdx = raw.indexOf('.')
  if (dotIdx > 0) {
    const payload = raw.slice(0, dotIdx)
    const sig = raw.slice(dotIdx + 1)
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

    const sepIdx = payload.lastIndexOf(':')
    if (sepIdx <= 0) return null
    const tenantId = payload.slice(0, sepIdx)
    const exp = Number(payload.slice(sepIdx + 1))
    if (!Number.isFinite(exp) || exp <= Date.now()) return null
    return tenantId
  }

  // Legacy unsigned form — only accept if explicitly allowed.
  if (process.env.IMPERSONATION_ALLOW_UNSIGNED === '1') return raw
  return null
}
