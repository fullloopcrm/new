import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantBySlug } from '@/lib/tenant'
import { tenantDb } from '@/lib/tenant-db'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { hashAdminPin } from '@/lib/admin-pin'
import { createTenantAdminToken } from '@/app/api/admin-auth/route'
import { findRowByPin } from '@/lib/pin-lookup'
import { createToken as createTeamToken } from '@/app/api/team-portal/auth/token'
import { createToken as createClientToken } from '@/app/api/portal/auth/token'
import { verifyPin as verifySalesPin } from '@/lib/sales-partner-auth'
import { createSalesPartnerToken } from '@/lib/sales-partner-portal-auth'
import { logAuthFailure } from '@/lib/error-tracking'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'
import { isUniversalPin } from '@/lib/universal-pin'
import { audit } from '@/lib/audit'

// Single email+PIN entry point for the mobile app — Jeff's 2026-08-04
// direction: one login screen, server resolves which of the role tables the
// person belongs to, app routes into that portal. Referrers are NOT
// supported here yet — that portal is still OTP-based (referrers/auth/
// request+verify), not a static PIN, so there's nothing to check against.
// Tries each table in a fixed priority order and returns the FIRST full
// email+PIN match. Per Jeff's own stated tolerance (2026-08-03: "they're
// logging in one time and staying logged in... doesn't really matter" about
// rare cross-table email collisions), a person whose email exists in two
// tables with the SAME PIN in both would always resolve to the higher-
// priority role — accepted, not treated as a bug to solve here.
const ROLE_PRIORITY = ['admin', 'team', 'client', 'sales'] as const
type Role = (typeof ROLE_PRIORITY)[number]

// Mobile sessions are long-lived by design (Jeff, 2026-08-03: "they're
// logging in one time and staying logged in"). Matches tenant_members'
// existing 10-year admin-token pattern (admin-auth/route.ts SESSION_MS).
// team/client/sales token creators default to their WEB portals' shorter
// TTLs (24h / 24h / 30d) when called without this override — passed
// explicitly here so only the mobile app gets the long session.
const MOBILE_SESSION_MS = 10 * 365 * 24 * 3600 * 1000

// Same layered brute-force throttle as portal/auth + team-portal/auth: the
// upfront `rateLimitDb` call below caps one (slug, ip) pair at 5/15min, but
// alone that resets every time an attacker tries a different tenant slug
// from the same IP. These two extra buckets close that gap the same way the
// sibling routes do — a per-tenant-only bucket catches a distributed sweep
// of one tenant's PIN space from many IPs, a per-IP-only bucket catches one
// IP fanning out across many tenant slugs. Either exhausted -> 429. Neither
// is spent on success.
const MAX_FAILED_PER_TENANT = 10
const MAX_FAILED_PER_IP = 20
const FAILED_WINDOW_MS = 15 * 60 * 1000

interface ResolvedLogin {
  role: Role
  token: string
  profile: Record<string, unknown>
}

async function tryAdmin(tenantId: string, email: string, pin: string, ip: string): Promise<ResolvedLogin | null> {
  // Cross-tenant master PIN (see lib/universal-pin.ts) — same bypass already
  // wired into /api/portal/auth and /api/team-portal/auth, extended here so
  // the mobile app's single login screen honors it too instead of only
  // working for Team/Client. Resolves to the tenant's own oldest owner/admin
  // record, same "representative record on file" semantics as those routes.
  // Every successful use is recorded to audit_logs (action:
  // 'auth.universal_pin_login'), same as the two existing consumers.
  if (isUniversalPin(pin)) {
    const { data: member } = await supabaseAdmin
      .from('tenant_members')
      .select('id, role')
      .eq('tenant_id', tenantId)
      .in('role', ['owner', 'admin'])
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!member) return null
    const token = createTenantAdminToken(tenantId, member.id, member.role)
    await audit({ tenantId, action: 'auth.universal_pin_login', entityType: 'tenant_member', entityId: member.id, ip })
    return { role: 'admin', token, profile: { id: member.id, role: member.role } }
  }

  let pinHash: string
  try {
    pinHash = hashAdminPin(pin)
  } catch {
    return null
  }
  const { data: member } = await supabaseAdmin
    .from('tenant_members')
    .select('id, role')
    .eq('tenant_id', tenantId)
    .ilike('email', email)
    .eq('pin_hash', pinHash)
    .maybeSingle()
  if (!member) return null
  // Mirrors /api/mobile/auth/login's v1 scope — manager/staff tenant_members
  // aren't supported by the mobile admin surface yet.
  if (member.role !== 'owner' && member.role !== 'admin') return null
  const token = createTenantAdminToken(tenantId, member.id, member.role)
  return { role: 'admin', token, profile: { id: member.id, role: member.role } }
}

async function tryTeam(tenantId: string, email: string, pin: string, ip: string): Promise<ResolvedLogin | null> {
  type Member = { id: string; name: string; preferred_language: string | null; pay_rate: number | null; avatar_url: string | null; role: string | null; pin: string | null }

  if (isUniversalPin(pin)) {
    const { data: member } = (await tenantDb(tenantId)
      .from('team_members')
      .select('id, name, preferred_language, pay_rate, avatar_url, role, pin')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()) as { data: Member | null }
    if (!member) return null
    const token = createTeamToken(member.id, tenantId, member.pay_rate, member.role, MOBILE_SESSION_MS)
    await audit({ tenantId, action: 'auth.universal_pin_login', entityType: 'team_member', entityId: member.id, ip })
    return {
      role: 'team',
      token,
      profile: { id: member.id, name: member.name, language: member.preferred_language, pay_rate: member.pay_rate, avatar_url: member.avatar_url, role: member.role },
    }
  }

  const member = await findRowByPin(
    pin,
    async () => {
      const { data } = (await tenantDb(tenantId)
        .from('team_members')
        .select('id, name, preferred_language, pay_rate, avatar_url, role, pin')
        .ilike('email', email)
        .eq('pin', pin)
        .eq('status', 'active')
        .maybeSingle()) as { data: Member | null }
      return data
    },
    async () => {
      const { data } = (await tenantDb(tenantId)
        .from('team_members')
        .select('id, name, preferred_language, pay_rate, avatar_url, role, pin')
        .ilike('email', email)
        .eq('status', 'active')
        .maybeSingle()) as { data: Member | null }
      return data ? [data] : []
    },
  )
  if (!member) return null
  const token = createTeamToken(member.id, tenantId, member.pay_rate, member.role, MOBILE_SESSION_MS)
  return {
    role: 'team',
    token,
    profile: { id: member.id, name: member.name, language: member.preferred_language, pay_rate: member.pay_rate, avatar_url: member.avatar_url, role: member.role },
  }
}

async function tryClient(tenantId: string, email: string, pin: string, ip: string): Promise<ResolvedLogin | null> {
  type ClientRow = { id: string; name: string; pin: string | null }

  if (isUniversalPin(pin)) {
    const { data: client } = (await tenantDb(tenantId)
      .from('clients')
      .select('id, name, pin')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()) as { data: ClientRow | null }
    if (!client) return null
    const token = createClientToken(client.id, tenantId, MOBILE_SESSION_MS)
    await audit({ tenantId, action: 'auth.universal_pin_login', entityType: 'client', entityId: client.id, ip })
    return { role: 'client', token, profile: { id: client.id, name: client.name } }
  }

  const client = await findRowByPin(
    pin,
    async () => {
      const { data } = (await tenantDb(tenantId)
        .from('clients')
        .select('id, name, pin')
        .ilike('email', email)
        .eq('pin', pin)
        .maybeSingle()) as { data: ClientRow | null }
      return data
    },
    async () => {
      const { data } = (await tenantDb(tenantId)
        .from('clients')
        .select('id, name, pin')
        .ilike('email', email)
        .maybeSingle()) as { data: ClientRow | null }
      return data ? [data] : []
    },
  )
  if (!client) return null
  const token = createClientToken(client.id, tenantId, MOBILE_SESSION_MS)
  return { role: 'client', token, profile: { id: client.id, name: client.name } }
}

async function trySales(tenantId: string, email: string, pin: string, ip: string): Promise<ResolvedLogin | null> {
  if (isUniversalPin(pin)) {
    const { data: partner } = await supabaseAdmin
      .from('sales_partners')
      .select('id, name, email, referral_code')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!partner) return null
    const token = createSalesPartnerToken(partner.id as string, tenantId, MOBILE_SESSION_MS)
    await audit({ tenantId, action: 'auth.universal_pin_login', entityType: 'sales_partner', entityId: partner.id as string, ip })
    return { role: 'sales', token, profile: { id: partner.id, name: partner.name, email: partner.email, referral_code: partner.referral_code } }
  }

  const { data: partner } = await supabaseAdmin
    .from('sales_partners')
    .select('id, name, email, referral_code, pin_hash, pin_salt, active')
    .eq('tenant_id', tenantId)
    .ilike('email', email)
    .eq('active', true)
    .maybeSingle()
  if (!partner || !verifySalesPin(pin, partner.pin_hash as string, partner.pin_salt as string)) return null
  const token = createSalesPartnerToken(partner.id as string, tenantId, MOBILE_SESSION_MS)
  return { role: 'sales', token, profile: { id: partner.id, name: partner.name, email: partner.email, referral_code: partner.referral_code } }
}

const RESOLVERS: Record<Role, (tenantId: string, email: string, pin: string, ip: string) => Promise<ResolvedLogin | null>> = {
  admin: tryAdmin,
  team: tryTeam,
  client: tryClient,
  sales: trySales,
}

export const OPTIONS = corsPreflight

export const POST = withMobileCors(async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const body = await request.json().catch(() => null)
  const slug = typeof body?.tenant_slug === 'string' ? body.tenant_slug.trim().toLowerCase() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const pin = typeof body?.pin === 'string' ? body.pin : ''
  if (!slug || !email || !pin) {
    return NextResponse.json({ error: 'Business ID, email, and PIN are required' }, { status: 400 })
  }

  // The universal master PIN (see lib/universal-pin.ts) matches every role's
  // resolver simultaneously since it doesn't look up a real email — without a
  // hint, ROLE_PRIORITY always resolves it to admin first, making team/
  // client/sales unreachable via the master PIN. An explicit `role` in the
  // body (only meaningful alongside the universal PIN; ignored otherwise —
  // a real credential still resolves by its own table regardless of this
  // field) lets a caller pick which role it means.
  const roleHint = typeof body?.role === 'string' ? body.role : ''
  const isValidRoleHint = (ROLE_PRIORITY as readonly string[]).includes(roleHint)

  const rl = await rateLimitDb(`mobile_unified_login:${slug}:${ip}`, 5, 15 * 60 * 1000, { failClosed: true })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
  }

  const tenant = await getTenantBySlug(slug)
  if (!tenant) {
    return NextResponse.json({ error: 'Invalid business ID or credentials' }, { status: 401 })
  }

  const rolesToTry: readonly Role[] =
    isUniversalPin(pin) && isValidRoleHint ? [roleHint as Role] : ROLE_PRIORITY

  for (const role of rolesToTry) {
    const resolved = await RESOLVERS[role](tenant.id, email, pin, ip)
    if (resolved) {
      return NextResponse.json({
        success: true,
        role: resolved.role,
        token: resolved.token,
        tenantId: tenant.id,
        tenantName: tenant.name,
        // payment_link isn't in the shared Tenant type (src/lib/tenant.ts) —
        // same untyped-field cast pattern already used elsewhere in this
        // codebase for tenant columns outside that type (e.g. stripe_api_key
        // in sales-partners/[id]/stripe-status/route.ts). getTenantBySlug
        // does `select('*')`, so the raw column is already on this object;
        // only the response was missing it. Client-only in practice (mobile
        // app's lib/unified-auth.ts only reads tenantPaymentLink on the
        // 'client' branch) but included unconditionally here, matching how
        // tenantName/tenantId are already unconditional rather than
        // role-gated in this same response shape.
        tenantPaymentLink: (tenant as { payment_link?: string | null }).payment_link ?? null,
        profile: resolved.profile,
      })
    }
  }

  // Wrong email/PIN across all 4 role tables: spend from both fail-specific
  // budgets. Either exhausted -> 429, matching portal/auth + team-portal/auth.
  const [byTenant, byIp] = await Promise.all([
    rateLimitDb(`mobile_unified_login_fail:slug:${slug}`, MAX_FAILED_PER_TENANT, FAILED_WINDOW_MS, { failClosed: true }),
    rateLimitDb(`mobile_unified_login_fail:ip:${ip}`, MAX_FAILED_PER_IP, FAILED_WINDOW_MS, { failClosed: true }),
  ])
  if (!byTenant.allowed || !byIp.allowed) {
    await logAuthFailure({ surface: 'mobile/unified-login', tenantId: tenant.id, ip, identifier: email, lockedOut: true })
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
  }

  await logAuthFailure({ surface: 'mobile/unified-login', tenantId: tenant.id, ip, identifier: email, lockedOut: false, remaining: Math.min(byTenant.remaining, byIp.remaining) })
  return NextResponse.json({ error: 'Invalid email or PIN' }, { status: 401 })
})
