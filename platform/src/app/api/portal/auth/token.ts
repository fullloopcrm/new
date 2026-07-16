import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantServesSite } from '@/lib/tenant-status'

// Token helpers for the client portal. Extracted from route.ts because Next 16
// rejects non-standard exports from a route file.

function getSecret(): string {
  const s = process.env.PORTAL_SECRET
  if (!s) {
    throw new Error('PORTAL_SECRET env var is required. Do not fall back to SUPABASE_SERVICE_ROLE_KEY — a leaked portal token would then act as a signature oracle against the service role key.')
  }
  return s
}

export function generateCode(): string {
  // crypto.randomInt is uniformly distributed and cryptographically strong;
  // Math.random was brute-forceable with timing knowledge.
  return String(100000 + crypto.randomInt(0, 900000))
}

export function createToken(clientId: string, tenantId: string): string {
  const payload = JSON.stringify({ id: clientId, tid: tenantId, exp: Date.now() + 24 * 3600 * 1000 })
  const hmac = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + hmac
}

// Async: beyond the HMAC/expiry check, this now re-checks the token's tenant
// against the DB on every call. All ~18 direct verifyPortalToken() call sites
// (bookings, availability, checkout-adjacent client routes, etc.) previously
// kept trusting the token — and therefore kept serving a suspended/cancelled/
// deleted tenant — for up to 24h (the token's lifetime). Same class of gap as
// verifyToken (team-portal/auth/token.ts); see that file for the longer note.
export async function verifyPortalToken(token: string): Promise<{ id: string; tid: string } | null> {
  try {
    const [payloadB64, sig] = token.split('.')
    const payload = Buffer.from(payloadB64, 'base64').toString()
    const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
    // Constant-time compare — a naive `!==` leaks signature bytes via timing.
    const sigBuf = Buffer.from(sig, 'hex')
    const expectedBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null
    const data = JSON.parse(payload)
    if (data.exp < Date.now()) return null
    const result = { id: data.id, tid: data.tid }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('status')
      .eq('id', result.tid)
      .single()
    if (!tenant || !tenantServesSite(tenant.status)) return null

    return result
  } catch {
    return null
  }
}
