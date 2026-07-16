import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logSecurityEvent } from '@/lib/security'
import { requireAdmin } from '@/lib/require-admin'
import { isKnownTenantStatus } from '@/lib/tenant-status'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

  const [
    { data: tenant },
    { data: members },
    { count: clients },
    { count: bookings },
    { count: team_members },
  ] = await Promise.all([
    supabaseAdmin.from('tenants').select('*').eq('id', id).single(),
    supabaseAdmin.from('tenant_members').select('*').eq('tenant_id', id),
    supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    supabaseAdmin.from('team_members').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
  ])

  if (!tenant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Revenue for this tenant
  const { data: revenueData } = await supabaseAdmin
    .from('bookings')
    .select('final_price')
    .eq('tenant_id', id)
    .in('status', ['paid', 'completed'])

  const revenue = (revenueData || []).reduce((sum, b) => sum + (b.final_price || 0), 0)

  return NextResponse.json({
    tenant,
    members,
    stats: {
      clients: clients || 0,
      bookings: bookings || 0,
      team_members: team_members || 0,
      revenue,
    },
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await request.json()

  // Only allow specific fields to be updated. Beyond status/plan, these are the
  // brand/config fields the shared site template renders from (see
  // src/app/site/template/_config/load.ts) so admins can personalize a new
  // tenant's site without a code change.
  const allowed = [
    'status', 'plan', 'name', 'industry',
    'phone', 'email', 'owner_email', 'owner_phone', 'sms_number',
    'domain', 'website_url', 'logo_url', 'tagline',
    'primary_color', 'secondary_color',
  ]
  const updates: Record<string, string | null> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  // Normalize to the SAME host form the resolver's tenants.domain fallback
  // looks up at request time (getTenantByDomain in tenant-lookup.ts /
  // tenant.ts: lowercase, strip protocol/path/www) — mirrors the fix already
  // applied to tenant_domains inserts in /api/admin/websites. Without this,
  // an admin pasting "https://WWW.Acme.com/" here stores that exact string;
  // the resolver's `.eq('domain', cleanDomain)` fallback query never finds
  // it, so the domain silently never routes even though it's saved.
  if (updates.domain !== undefined) {
    const cleanDomain = String(updates.domain || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/^www\./, '')
    updates.domain = cleanDomain || null
  }

  // tenantServesSite() is a case-sensitive exact match against a fixed status
  // set — an unvalidated free-text status here could write successfully while
  // never actually gating the tenant (see tenant-status.ts).
  if (updates.status !== undefined && !isKnownTenantStatus(updates.status)) {
    return NextResponse.json({ error: `Unknown status: ${updates.status}` }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('tenants')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log security events for status/plan changes
  if (updates.status) {
    await logSecurityEvent({
      tenantId: id,
      type: 'status_change',
      description: `Account status changed to ${updates.status} by platform admin`,
    })
  }
  if (updates.plan) {
    await logSecurityEvent({
      tenantId: id,
      type: 'plan_change',
      description: `Plan changed to ${updates.plan} by platform admin`,
    })
  }

  return NextResponse.json({ success: true })
}
