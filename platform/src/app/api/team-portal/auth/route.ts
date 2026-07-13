import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { createToken } from './token'

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

  const rl = await rateLimitDb(`team_portal_auth:${tenant_slug}:${pin}`, 5, 15 * 60 * 1000)
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

  // Look up team member by PIN — scoped to the tenant resolved above.
  const { data: member } = (await tenantDb(tenant.id)
    .from('team_members')
    .select('id, name, preferred_language, pay_rate, avatar_url, role')
    .eq('pin', pin)
    .eq('status', 'active')
    .single()) as { data: { id: string; name: string; preferred_language: string | null; pay_rate: number | null; avatar_url: string | null; role: string | null } | null }

  if (!member) {
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
