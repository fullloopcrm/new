import crypto from 'crypto'

/**
 * Signed companion header for x-tenant-id. Only middleware holds the secret,
 * so a caller who puts x-tenant-id on a raw request cannot also mint a matching
 * x-tenant-sig. Downstream helpers must verify the sig before trusting the id.
 *
 * Why not delete caller-supplied headers in middleware? Next.js NextRequest
 * headers may not propagate mutations to the route handler in all runtimes.
 * A signed companion is airtight regardless of header mutability semantics.
 */

function getSecret(): string {
  const s =
    process.env.TENANT_HEADER_SIG_SECRET ||
    process.env.ADMIN_TOKEN_SECRET ||
    process.env.PORTAL_SECRET
  if (!s) {
    throw new Error(
      'TENANT_HEADER_SIG_SECRET (or ADMIN_TOKEN_SECRET / PORTAL_SECRET fallback) is required. Middleware cannot sign tenant-id headers without it, which means every tenant-domain request would 500.',
    )
  }
  return s
}

export function signTenantHeader(tenantId: string): string {
  return crypto.createHmac('sha256', getSecret()).update(tenantId).digest('hex')
}

export function verifyTenantHeaderSig(tenantId: string, sig: string | null | undefined): boolean {
  if (!sig || !tenantId) return false
  const expected = signTenantHeader(tenantId)
  if (expected.length !== sig.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))
  } catch {
    return false
  }
}
