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

interface ResolvedLogin {
  role: Role
  token: string
  profile: Record<string, unknown>
}

async function tryAdmin(tenantId: string, email: string, pin: string): Promise<ResolvedLogin | null> {
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

async function tryTeam(tenantId: string, email: string, pin: string): Promise<ResolvedLogin | null> {
  type Member = { id: string; name: string; preferred_language: string | null; pay_rate: number | null; avatar_url: string | null; role: string | null; pin: string | null }
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
  const token = createTeamToken(member.id, tenantId, member.pay_rate, member.role)
  return {
    role: 'team',
    token,
    profile: { id: member.id, name: member.name, language: member.preferred_language, pay_rate: member.pay_rate, avatar_url: member.avatar_url, role: member.role },
  }
}

async function tryClient(tenantId: string, email: string, pin: string): Promise<ResolvedLogin | null> {
  type ClientRow = { id: string; name: string; pin: string | null }
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
  const token = createClientToken(client.id, tenantId)
  return { role: 'client', token, profile: { id: client.id, name: client.name } }
}

async function trySales(tenantId: string, email: string, pin: string): Promise<ResolvedLogin | null> {
  const { data: partner } = await supabaseAdmin
    .from('sales_partners')
    .select('id, name, email, referral_code, pin_hash, pin_salt, active')
    .eq('tenant_id', tenantId)
    .ilike('email', email)
    .eq('active', true)
    .maybeSingle()
  if (!partner || !verifySalesPin(pin, partner.pin_hash as string, partner.pin_salt as string)) return null
  const token = createSalesPartnerToken(partner.id as string, tenantId)
  return { role: 'sales', token, profile: { id: partner.id, name: partner.name, email: partner.email, referral_code: partner.referral_code } }
}

const RESOLVERS: Record<Role, (tenantId: string, email: string, pin: string) => Promise<ResolvedLogin | null>> = {
  admin: tryAdmin,
  team: tryTeam,
  client: tryClient,
  sales: trySales,
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const body = await request.json().catch(() => null)
  const slug = typeof body?.tenant_slug === 'string' ? body.tenant_slug.trim().toLowerCase() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const pin = typeof body?.pin === 'string' ? body.pin : ''
  if (!slug || !email || !pin) {
    return NextResponse.json({ error: 'Business ID, email, and PIN are required' }, { status: 400 })
  }

  const rl = await rateLimitDb(`mobile_unified_login:${slug}:${ip}`, 5, 15 * 60 * 1000, { failClosed: true })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
  }

  const tenant = await getTenantBySlug(slug)
  if (!tenant) {
    return NextResponse.json({ error: 'Invalid business ID or credentials' }, { status: 401 })
  }

  for (const role of ROLE_PRIORITY) {
    const resolved = await RESOLVERS[role](tenant.id, email, pin)
    if (resolved) {
      return NextResponse.json({
        success: true,
        role: resolved.role,
        token: resolved.token,
        tenantId: tenant.id,
        tenantName: tenant.name,
        profile: resolved.profile,
      })
    }
  }

  await logAuthFailure({ surface: 'mobile/unified-login', tenantId: tenant.id, ip, identifier: email, lockedOut: false, remaining: rl.remaining })
  return NextResponse.json({ error: 'Invalid email or PIN' }, { status: 401 })
}
