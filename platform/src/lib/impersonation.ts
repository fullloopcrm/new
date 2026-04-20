import crypto from 'node:crypto'

/**
 * Signed impersonation cookie helpers.
 * Cookie value format: `<tenantId>.<hmac>` where hmac is HMAC-SHA256 of tenantId
 * under ADMIN_TOKEN_SECRET.
 *
 * Why: before signing, a client could forge `fl_impersonate=<any-tenant-id>`
 * and, combined with a stolen/leaked admin_token, impersonate arbitrary tenants.
 * The signature proves the cookie was minted by our server.
 */
export const IMPERSONATE_COOKIE = 'fl_impersonate'

export function signImpersonation(tenantId: string): string {
  const secret = process.env.ADMIN_TOKEN_SECRET
  if (!secret) throw new Error('ADMIN_TOKEN_SECRET not configured')
  const hmac = crypto.createHmac('sha256', secret).update(tenantId).digest('hex')
  return `${tenantId}.${hmac}`
}

/**
 * Returns the validated tenantId if the cookie is genuine, else null.
 * Accepts legacy unsigned values too (raw UUID) when IMPERSONATION_ALLOW_UNSIGNED=1
 * — useful during rolling cutover; remove once all in-flight sessions have rotated.
 */
export function verifyImpersonationCookie(raw: string | undefined): string | null {
  if (!raw) return null
  const secret = process.env.ADMIN_TOKEN_SECRET
  if (!secret) return null

  // Signed form: "<uuid>.<hex>"
  const dotIdx = raw.indexOf('.')
  if (dotIdx > 0) {
    const tenantId = raw.slice(0, dotIdx)
    const sig = raw.slice(dotIdx + 1)
    const expected = crypto.createHmac('sha256', secret).update(tenantId).digest('hex')
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return tenantId
    return null
  }

  // Legacy unsigned form — only accept if explicitly allowed.
  if (process.env.IMPERSONATION_ALLOW_UNSIGNED === '1') return raw
  return null
}
