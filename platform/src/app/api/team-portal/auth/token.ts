import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantServesSite } from '@/lib/tenant-status'
import { getTerminatedTeamMemberIds } from '@/lib/hr'

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
  const payload = JSON.stringify({ id: memberId, tid: tenantId, pr: payRate || 0, r: role || 'worker', exp: Date.now() + 24 * 3600 * 1000 })
  const hmac = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + hmac
}

// role is the field-staff portal tier (worker/lead/manager). Legacy tokens
// minted before tiers existed carry no `r` → treated as least-privilege 'worker'.
//
// Async: beyond the HMAC/expiry check, this now re-checks the token's tenant
// against the DB on every call. Every one of this codebase's ~20 direct
// verifyToken() call sites (checkout, jobs, messages, etc.) previously kept
// trusting the token — and therefore kept serving a suspended/cancelled/
// deleted tenant — for up to 24h (the token's lifetime), even though
// requirePortalPermission (team-portal-auth.ts) already re-checked tenant
// status for the routes that go through it. Baking the check in here closes
// the gap for every caller at once instead of requiring each route to
// remember to layer requirePortalPermission on top.
export async function verifyToken(token: string): Promise<{ id: string; tid: string; role: string } | null> {
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
    const result = { id: data.id, tid: data.tid, role: data.r || 'worker' }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('status')
      .eq('id', result.tid)
      .single()
    if (!tenant || !tenantServesSite(tenant.status)) return null

    // Member-side instant revocation, same rationale as the tenant-status check
    // above: requirePortalPermission (team-portal-auth.ts) already re-checks
    // team_members.status==='active' and hr_status!=='terminated' on every
    // gated call, but ~14 routes (checkin, checkout, messages, video-upload,
    // etc.) call verifyToken() directly and skip that wrapper entirely.
    // checkin/checkout are the two routes where this matters most — a fired
    // or suspended worker's existing token (up to 24h life) could still check
    // in, check out, and get paid. Baking the member check in here closes the
    // gap for every direct caller at once, matching the tenant-status fix.
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('status')
      .eq('id', result.id)
      .eq('tenant_id', result.tid)
      .single()
    if (!member || member.status !== 'active') return null

    const terminated = await getTerminatedTeamMemberIds(result.tid, [result.id])
    if (terminated.length > 0) return null

    return result
  } catch {
    return null
  }
}
