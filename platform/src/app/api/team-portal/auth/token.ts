import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'

// Token helpers for the field-staff (team) portal. Extracted from route.ts
// because Next 16 rejects non-standard exports from a route file.

function getSecret(): string {
  const s = process.env.TEAM_PORTAL_SECRET
  if (!s) {
    throw new Error('TEAM_PORTAL_SECRET env var is required. Do not fall back to SUPABASE_SERVICE_ROLE_KEY — a leaked team portal token would then act as a signature oracle against the service role key.')
  }
  return s
}

export function createToken(memberId: string, tenantId: string, payRate?: number | null, role?: string | null): string {
  const payload = JSON.stringify({ id: memberId, tid: tenantId, pr: payRate || 0, r: role || 'worker', scope: 'team', iat: Date.now(), exp: Date.now() + 24 * 3600 * 1000 })
  const hmac = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + hmac
}

// role is the field-staff portal tier (worker/lead/manager). Legacy tokens
// minted before tiers existed carry no `r` → treated as least-privilege 'worker'.
//
// Async (DB read) because of the force-logout check below -- team-portal
// tokens are otherwise fully stateless (no revocation list), so the only way
// to invalidate an already-issued token is to compare it against a stored
// per-tenant marker. Deliberately per-tenant, not a TEAM_PORTAL_SECRET
// rotation -- that secret is shared with the referrer and sales-partner
// portals platform-wide, so rotating it to force-logout one tenant's field
// staff would also log out every referrer/sales-partner on every tenant.
export async function verifyToken(token: string): Promise<{ id: string; tid: string; role: string } | null> {
  try {
    const [payloadB64, sig] = token.split('.')
    if (!payloadB64 || !sig) return null
    const payload = Buffer.from(payloadB64, 'base64').toString()
    const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
    // Constant-time compare to avoid leaking signature bytes via timing — mirrors
    // referrer-portal-auth.ts verifyReferrerToken, which shares TEAM_PORTAL_SECRET
    // and carries the same forgery risk from a non-constant-time comparison.
    const sigBuf = Buffer.from(sig)
    const expBuf = Buffer.from(expected)
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null
    const data = JSON.parse(payload)
    // Scope gate: TEAM_PORTAL_SECRET is shared with the referrer portal
    // (referrer-portal-auth.ts), which mints scope:'ref'. Reject any token
    // carrying a foreign scope so a referrer token can never be replayed here.
    // Legacy team tokens minted before this field existed carry no scope and
    // are grandfathered (24h TTL → the window self-closes within a day of
    // deploy, without logging out field staff mid-shift).
    if (data.scope && data.scope !== 'team') return null
    if (data.exp < Date.now()) return null
    // Force-logout check. Tokens minted before `iat` existed carry no field —
    // grandfathered exactly like the legacy-scope case above (same 24h
    // self-closing window), rather than mass-logging-out every currently
    // active field-staff session the moment this deploys.
    if (data.iat) {
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('team_portal_logout_after')
        .eq('id', data.tid)
        .single()
      const logoutAfter = tenant?.team_portal_logout_after
      if (logoutAfter && data.iat < new Date(logoutAfter).getTime()) return null
    }
    return { id: data.id, tid: data.tid, role: data.r || 'worker' }
  } catch {
    return null
  }
}
