import crypto from 'crypto'
import { supabaseAdmin } from './supabase'

// Sales Partner portal session tokens. Same HMAC scheme as the referrer
// portal (src/lib/referrer-portal-auth.ts) -- a base64 payload plus a
// SHA-256 HMAC signature -- reusing TEAM_PORTAL_SECRET so we don't
// introduce a second signing secret to provision. The `scope: 'salespartner'`
// field keeps a sales-partner token from being replayed against referrer or
// team-portal routes and vice-versa. Unlike nycmaid (which returns the
// partner's raw id/name/ref_code from /login for the client to hold in
// localStorage with no signature), every portal-data route here requires
// this signed bearer token -- matching the security bar the referrer portal
// was already raised to (see referrer-portal-auth.ts and the auth-gap fixes
// in referral-commissions/route.ts).

const TOKEN_TTL_MS = 30 * 24 * 3600 * 1000 // 30 days — partners check earnings rarely

function getSecret(): string {
  const s = process.env.TEAM_PORTAL_SECRET
  if (!s) {
    throw new Error('TEAM_PORTAL_SECRET env var is required for sales partner portal auth.')
  }
  return s
}

// ttlMs is optional and defaults to the web sales-partner portal's existing
// 30-day session — the mobile unified-login resolver (api/mobile/unified-login)
// passes a long-lived override (matches tenant_members' 10-year pattern)
// without changing behavior for the web portal's own email+PIN login.
export function createSalesPartnerToken(salesPartnerId: string, tenantId: string, ttlMs: number = TOKEN_TTL_MS): string {
  const payload = JSON.stringify({ pid: salesPartnerId, tid: tenantId, scope: 'salespartner', exp: Date.now() + ttlMs })
  const hmac = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + hmac
}

export function verifySalesPartnerToken(token: string): { pid: string; tid: string } | null {
  try {
    const [payloadB64, sig] = token.split('.')
    if (!payloadB64 || !sig) return null
    const payload = Buffer.from(payloadB64, 'base64').toString()
    const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
    const sigBuf = Buffer.from(sig)
    const expBuf = Buffer.from(expected)
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null
    const data = JSON.parse(payload)
    if (data.scope !== 'salespartner') return null
    if (data.exp < Date.now()) return null
    return { pid: data.pid, tid: data.tid }
  } catch {
    return null
  }
}

// Pull and verify the sales partner bearer token off a request, AND
// instant-revoke: a signed, unexpired token alone isn't proof the partner is
// still active -- the token carries no live state, so a deactivated partner
// would otherwise keep working until the token's natural expiry (up to 10
// years for a mobile-minted token, see MOBILE_SESSION_MS in
// api/mobile/unified-login). Re-reads sales_partners.active on every call
// instead of trusting the signed claim -- mirrors requirePortalPermission's
// per-request status re-check (lib/team-portal-auth.ts) and the equivalent
// fix applied to /api/cleaners/upload's team-portal bearer branch.
export async function getSalesPartnerAuth(request: Request): Promise<{ pid: string; tid: string } | null> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const verified = verifySalesPartnerToken(token)
  if (!verified) return null

  const { data: partner } = await supabaseAdmin
    .from('sales_partners')
    .select('active')
    .eq('id', verified.pid)
    .eq('tenant_id', verified.tid)
    .maybeSingle()
  if (!partner || !partner.active) return null

  return verified
}
