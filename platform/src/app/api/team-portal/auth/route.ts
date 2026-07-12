import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { createToken } from './token'

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

  // Rate-limit bucket must NOT include the PIN. Keying on the PIN gave every
  // guessed value its own fresh 5-attempt budget, so an attacker could walk the
  // whole PIN space unthrottled. Key on slug+IP instead: 5 PIN guesses per IP
  // per tenant per 15 min, which both throttles enumeration and locks out a
  // spraying host for the rest of the window.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`team_portal_auth:${tenant_slug}:${ip}`, 5, 15 * 60 * 1000)
  if (!rl.allowed) {
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

  // Look up team member by PIN
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('id, name, preferred_language, pay_rate, avatar_url, role')
    .eq('tenant_id', tenant.id)
    .eq('pin', pin)
    .eq('status', 'active')
    .single()

  if (!member) {
    // Wrong PIN: spend from BOTH failure budgets. Either exhausted → 429, so a
    // full sweep of one tenant's PIN space (per-tenant) or one IP fanning out
    // across many tenants (per-IP) both get cut off. Correct PINs never reach here.
    const ip = clientIp(request)
    const [byTenant, byIp] = await Promise.all([
      rateLimitDb(`team_portal_auth_fail:slug:${tenant_slug}`, MAX_FAILED_PER_TENANT, FAILED_WINDOW_MS),
      rateLimitDb(`team_portal_auth_fail:ip:${ip}`, MAX_FAILED_PER_IP, FAILED_WINDOW_MS),
    ])
    if (!byTenant.allowed || !byIp.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const token = createToken(member.id, tenant.id, member.pay_rate, member.role)

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
