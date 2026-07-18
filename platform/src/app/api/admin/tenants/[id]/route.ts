import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logSecurityEvent } from '@/lib/security'
import { requireAdmin } from '@/lib/require-admin'
import { isKnownTenantStatus } from '@/lib/tenant-status'
import { ENCRYPTED_TENANT_FIELDS } from '@/lib/secret-crypto'
import { omit } from '@/lib/validate'

// This route's only consumer, admin/tenants/[id]/page.tsx, is a READ-ONLY
// tenant summary view — grepped, it never prefills these into an editable
// input (unlike admin/businesses/[id]/page.tsx's edit form, where several of
// these are legitimately read back raw). It only ever truthy-checks
// resend_api_key/telnyx_api_key for a connected badge, so every vendor secret
// plus the Google OAuth token pair can be redacted here with zero UX
// regression, replacing the two checked fields with explicit booleans.
const NEVER_RETURNED_TENANT_FIELDS = [...ENCRYPTED_TENANT_FIELDS, 'google_tokens'] as const

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
    // Explicit column list, NOT select('*') — this is returned wholesale to
    // the browser as `members` below, and tenant_members carries pin_hash
    // (the tenant admin's live login-PIN hash). Sibling routes that surface
    // PIN state (admin/businesses/[id]/users, admin/users) deliberately never
    // return the raw hash, only derived has_pin/pin_set_at/last_login — this
    // list matches that invariant instead of leaking it via select('*').
    supabaseAdmin.from('tenant_members').select('id, tenant_id, clerk_user_id, role, name, email, phone, created_at').eq('tenant_id', id),
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

  const safeTenant = {
    ...omit(tenant, [...NEVER_RETURNED_TENANT_FIELDS]),
    has_resend_api_key: !!tenant.resend_api_key,
    has_telnyx_api_key: !!tenant.telnyx_api_key,
  }

  return NextResponse.json({
    tenant: safeTenant,
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

  // Bust middleware's edge-cached slug/domain entries for this tenant when
  // status or domain changed — mirrors the clearSelenaConfigCache(id) pattern
  // just below in admin/businesses/[id]/route.ts for its own 5-min-TTL cache.
  // Without this, a tenant just suspended/cancelled here keeps resolving
  // through a warm edge isolate's cached entry (tenantServesSite() evaluates
  // the STALE status) for up to the rest of tenant-lookup.ts's 5-minute TTL.
  if (updates.status !== undefined || updates.domain !== undefined) {
    const { invalidateTenantCache, invalidateDomainCache } = await import('@/lib/tenant-lookup')
    invalidateTenantCache(id)
    // invalidateTenantCache only reaches POSITIVE cache entries (matched by
    // entry.tenant?.id — a negative "no tenant" entry has none). `updates.domain`
    // is tenants.domain, the resolver's FALLBACK source: if this exact host was
    // ever queried (and negatively cached) before this save, it keeps resolving
    // to "no tenant" for up to the rest of the TTL even after this write makes
    // it live. Same fix as admin/businesses/[id]'s identical PUT handler.
    if (updates.domain) invalidateDomainCache(updates.domain as string)
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
