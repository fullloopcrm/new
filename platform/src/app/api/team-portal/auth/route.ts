import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { createToken } from './token'
import { getTerminatedTeamMemberIds } from '@/lib/hr'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const pin = body.pin
  // Prefer an explicit slug, but fall back to the middleware-injected tenant
  // header (set on every tenant domain/subdomain). This lets a cleaner log in
  // on their own site without typing a "business code".
  const rawSlug: string = body.tenant_slug || request.headers.get('x-tenant-slug') || ''

  if (!pin || !rawSlug) {
    return NextResponse.json({ error: 'PIN and tenant required' }, { status: 400 })
  }

  // Lowercase — slugs are always generated lowercase (slugify()/toSlug() in
  // every tenant-creation path, per tenant.ts/tenant-lookup.ts's shared
  // resolver contract). The x-tenant-slug header is already lowercase
  // (middleware sets it from tenant.slug), but this route also accepts a
  // caller-supplied tenant_slug directly in the body — unnormalized, that
  // path would silently 404 "Business not found" on a mixed-case slug for a
  // real tenant instead of resolving it.
  const tenant_slug = rawSlug.toLowerCase()

  // Bucket must NOT include the guessed pin itself -- keying by the value
  // under attack (as this route previously did) gives every distinct guess
  // its own fresh bucket, so a brute-forcer that never repeats a guess is
  // never throttled. Every sibling PIN/credential-guessing route in this
  // codebase (admin-auth, auth/login, client/login) keys by caller identity
  // (tenant+ip) instead -- match that here.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`team_portal_auth:${tenant_slug}:${ip}`, 5, 15 * 60 * 1000, { failClosed: true })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
  }

  // Look up tenant. maybeSingle() + explicit error check — same masked-error
  // pattern already fixed on the canonical resolver (tenant.ts/tenant-lookup.ts):
  // slug is UNIQUE NOT NULL at the DB level, so 0 rows legitimately means
  // "unknown business", not an error. single() can't tell that apart from a
  // genuine DB failure (both surface as data:null once destructured), so a
  // real outage here used to look identical to "Business not found".
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('id, name, phone')
    .eq('slug', tenant_slug)
    .eq('status', 'active')
    .maybeSingle()

  if (tenantError) {
    console.error(`TEAM_PORTAL_AUTH_TENANT_LOOKUP_ERROR slug=${tenant_slug} error=${tenantError.message}`)
    return NextResponse.json({ error: 'Unable to verify business. Please try again.' }, { status: 500 })
  }

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
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  // team_members.status alone doesn't reflect HR termination (that writes
  // hr_status='terminated' to hr_employee_profiles, never this row) -- without
  // this check a fired worker could keep minting fresh portal tokens by PIN
  // forever, not just ride out an existing one. Same guard as
  // requirePortalPermission's per-request re-check (team-portal-auth.ts).
  const terminated = await getTerminatedTeamMemberIds(tenant.id, [member.id])
  if (terminated.length > 0) {
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
