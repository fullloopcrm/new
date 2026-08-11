import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantBySlug } from '@/lib/tenant'
import { hashAdminPin } from '@/lib/admin-pin'
import { createTenantAdminToken } from '@/app/api/admin-auth/route'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { sendLoginAlert } from '@/lib/login-alert'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

// Mobile login for the Full Loop Mobile app. Additive alongside the existing
// cookie-based /api/admin-auth (browser, domain-scoped) — this is the same
// tenant_members PIN credential, but resolves the tenant by slug (typed in
// the app) instead of a custom-domain header, and returns the signed token
// as JSON instead of a Set-Cookie, for the app to send back as
// `Authorization: Bearer <token>`.
//
// v1 scope: owner + admin roles only. manager/staff PINs are valid
// credentials but rejected here — the mobile app doesn't support their
// permission tier yet.
const ALLOWED_ROLES = new Set(['owner', 'admin'])

// Same layered brute-force throttle as mobile/unified-login + team-portal/
// auth: the upfront per-IP bucket below alone resets every time an attacker
// tries a different tenant slug from the same IP. This per-slug bucket
// closes that gap — a distributed sweep of one tenant's admin PIN space
// from many rotating IPs now still trips a tenant-wide lockout.
const MAX_FAILED_PER_TENANT = 10
const FAILED_WINDOW_MS = 15 * 60 * 1000

export const OPTIONS = corsPreflight

export const POST = withMobileCors(async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ua = request.headers.get('user-agent') || 'unknown'

  const rl = await rateLimitDb(`mobile_auth:${ip}`, 5, 15 * 60 * 1000, { failClosed: true })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const slug = typeof body?.slug === 'string' ? body.slug.trim().toLowerCase() : ''
  const pin = typeof body?.pin === 'string' ? body.pin : ''
  if (!slug || !pin) {
    return NextResponse.json({ error: 'Business ID and PIN are required' }, { status: 400 })
  }

  // Spent only on an actual failed lookup below (tenant not found, or no
  // matching PIN) — never on success, and never upfront — same "neither
  // bucket is spent on success" contract as mobile/unified-login's fail
  // buckets. A single helper since both failure branches return the same
  // generic message either way (this route never reveals whether the slug
  // itself was invalid vs. the PIN was wrong).
  const spendTenantFailBucket = () =>
    rateLimitDb(`mobile_auth_fail:slug:${slug}`, MAX_FAILED_PER_TENANT, FAILED_WINDOW_MS, { failClosed: true })

  const tenant = await getTenantBySlug(slug)
  if (!tenant) {
    const byTenant = await spendTenantFailBucket()
    if (!byTenant.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }
    return NextResponse.json({ error: 'Invalid business ID or PIN' }, { status: 401 })
  }

  let pinHash: string
  try {
    pinHash = hashAdminPin(pin)
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  const { data: member } = await supabaseAdmin
    .from('tenant_members')
    .select('id, role')
    .eq('tenant_id', tenant.id)
    .eq('pin_hash', pinHash)
    .eq('is_active', true)
    .maybeSingle()

  if (!member) {
    const byTenant = await spendTenantFailBucket()
    if (!byTenant.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }
    return NextResponse.json({ error: 'Invalid business ID or PIN' }, { status: 401 })
  }

  if (!ALLOWED_ROLES.has(member.role)) {
    return NextResponse.json({ error: 'This account does not have mobile access yet' }, { status: 403 })
  }

  await supabaseAdmin
    .from('tenant_members')
    .update({ pin_last_login: new Date().toISOString() })
    .eq('id', member.id)
    .then(() => {}, () => {})

  const token = createTenantAdminToken(tenant.id, member.id, member.role)
  await sendLoginAlert({ tenantId: tenant.id, ip, ua, who: `Mobile app (${member.role})` })

  return NextResponse.json({
    success: true,
    token,
    tenantId: tenant.id,
    tenantName: tenant.name,
    role: member.role,
  })
})
