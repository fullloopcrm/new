import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { isUniversalPin } from '@/lib/universal-pin'
import { createToken } from './token'
import { logAuthFailure } from '@/lib/error-tracking'
import { audit } from '@/lib/audit'
import { findRowByPin } from '@/lib/pin-lookup'

const PIN_SCAN_CAP = 5000

// Brute-force throttle for team-portal login. Counts FAILED PIN attempts on TWO
// compound buckets — per TENANT and per IP — never per (tenant, pin). The old
// key embedded the guessed PIN, so a sweep of the whole PIN space made one
// attempt per bucket and never tripped the limit.
//   - per-tenant bucket: a distributed sweep of ONE tenant's PIN space locks out.
//   - per-IP bucket: one IP can't hammer MANY tenants at N tries each.
// Either bucket exhausted → 429. Successful logins never touch either bucket,
// so real members are not locked out by an attacker's failures.
const MAX_FAILED_PER_TENANT = 10
const MAX_FAILED_PER_IP = 20
const FAILED_WINDOW_MS = 15 * 60 * 1000

/** First hop of x-forwarded-for (Vercel sets it), falling back to x-real-ip. */
function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const pin = body.pin
  // Prefer an explicit slug, but fall back to the middleware-injected tenant
  // header (set on every tenant domain/subdomain). This lets a cleaner log in
  // on their own site without typing a "business code".
  const tenant_slug: string = body.tenant_slug || request.headers.get('x-tenant-slug') || ''

  if (!pin || !tenant_slug) {
    return NextResponse.json({ error: 'PIN and tenant required' }, { status: 400 })
  }

  // Bucket must NOT include the guessed pin itself -- keying by the value
  // under attack (as this route previously did) gives every distinct guess
  // its own fresh bucket, so a brute-forcer that never repeats a guess is
  // never throttled. Every sibling PIN/credential-guessing route in this
  // codebase (admin-auth, auth/login, client/login) keys by caller identity
  // (tenant+ip) instead -- match that here.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`team_portal_auth:${tenant_slug}:${ip}`, 5, 15 * 60 * 1000, { failClosed: true })
  if (!rl.allowed) {
    await logAuthFailure({ surface: 'team-portal/auth', ip, identifier: tenant_slug, lockedOut: true })
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
  }

  // Look up tenant
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, phone')
    .eq('slug', tenant_slug)
    .eq('status', 'active')
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  // Look up team member by PIN — scoped to the tenant resolved above. The
  // universal PIN mirrors /api/portal/auth's cross-tenant master PIN: signs
  // in as the oldest member on file for WHATEVER tenant, deliberate bypass,
  // still gated by the same rate limits as a normal PIN attempt.
  type Member = { id: string; name: string; preferred_language: string | null; pay_rate: number | null; avatar_url: string | null; role: string | null; pin: string | null }
  const usedUniversalPin = isUniversalPin(pin)
  let member: Member | null = null
  if (usedUniversalPin) {
    const { data } = (await tenantDb(tenant.id)
      .from('team_members')
      .select('id, name, preferred_language, pay_rate, avatar_url, role, pin')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()) as { data: Member | null }
    member = data
  } else {
    member = await findRowByPin(
      pin,
      async () => {
        const { data } = (await tenantDb(tenant.id)
          .from('team_members')
          .select('id, name, preferred_language, pay_rate, avatar_url, role, pin')
          .eq('pin', pin)
          .eq('status', 'active')
          .single()) as { data: Member | null }
        return data
      },
      async () => {
        const { data } = (await tenantDb(tenant.id)
          .from('team_members')
          .select('id, name, preferred_language, pay_rate, avatar_url, role, pin')
          .eq('status', 'active')
          .limit(PIN_SCAN_CAP)) as { data: Member[] | null }
        return (data || []).filter((m) => m.pin)
      },
    )
  }

  if (!member) {
    // Wrong PIN: spend from BOTH failure budgets. Either exhausted → 429, so a
    // full sweep of one tenant's PIN space (per-tenant) or one IP fanning out
    // across many tenants (per-IP) both get cut off. Correct PINs never reach here.
    const ip = clientIp(request)
    const [byTenant, byIp] = await Promise.all([
      rateLimitDb(`team_portal_auth_fail:slug:${tenant_slug}`, MAX_FAILED_PER_TENANT, FAILED_WINDOW_MS, { failClosed: true }),
      rateLimitDb(`team_portal_auth_fail:ip:${ip}`, MAX_FAILED_PER_IP, FAILED_WINDOW_MS, { failClosed: true }),
    ])
    if (!byTenant.allowed || !byIp.allowed) {
      await logAuthFailure({ surface: 'team-portal/auth', tenantId: tenant.id, ip, lockedOut: true })
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }
    await logAuthFailure({ surface: 'team-portal/auth', tenantId: tenant.id, ip, lockedOut: false, remaining: Math.min(byTenant.remaining, byIp.remaining) })
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const token = createToken(member.id, tenant.id, member.pay_rate, member.role)

  if (usedUniversalPin) {
    // Visible-by-default trail for the master PIN — this bypass produces no
    // record otherwise, so support access to a tenant's team portal would
    // otherwise be invisible to that tenant and to platform audits.
    await audit({ tenantId: tenant.id, action: 'auth.universal_pin_login', entityType: 'team_member', entityId: member.id, ip })
  }

  return NextResponse.json({
    token,
    member: {
      id: member.id,
      name: member.name,
      language: member.preferred_language,
      pay_rate: member.pay_rate,
      avatar_url: member.avatar_url,
      role: member.role,
    },
    tenant: { id: tenant.id, name: tenant.name, phone: tenant.phone },
  })
}
