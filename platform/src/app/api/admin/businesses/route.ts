import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { registerCarryingDomain } from '@/lib/vercel-domains'
import { findDomainOwner } from '@/lib/domains'
import { PRICING } from '@/lib/billing-pricing'
import { ENCRYPTED_TENANT_FIELDS } from '@/lib/secret-crypto'
import { omit } from '@/lib/validate'

// Sibling of admin/businesses/[id]'s redaction: this is the LIST version of
// that same select('*') tenant row, returned wholesale to every one of this
// route's 8 consumers (businesses/clients/calendar/bookings/activity/social/
// ai/google-profile admin pages). Grepped all 8 — none reference a
// vendor-secret or google_tokens field name, so the same zero-consumer
// redaction applies here (unlike businesses/[id]'s own edit form, which is a
// documented exception this list never touches).
const NEVER_RETURNED_TENANT_FIELDS = [...ENCRYPTED_TENANT_FIELDS, 'google_tokens'] as const

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const { data: businesses } = await supabaseAdmin
    .from('tenants')
    .select('*, tenant_members(id), tenant_invites(id, accepted)')
    .order('created_at', { ascending: false })

  return NextResponse.json({
    businesses: (businesses || []).map(t => omit(t, [...NEVER_RETURNED_TENANT_FIELDS])),
  })
}

export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const body = await request.json()
  const {
    name, industry, zip_code, team_size,
    owner_name, owner_email, owner_phone,
    payment_method, monthly_rate, setup_fee,
    domain_name, website_url, phone, email, tagline, primary_color,
    business_hours, business_hours_start, business_hours_end, payment_methods,
  } = body

  if (!name || !industry) {
    return NextResponse.json({ error: 'Name and industry required' }, { status: 400 })
  }

  // Generate slug
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Check uniqueness
  const { data: exists } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (exists) {
    return NextResponse.json({ error: 'A business with a similar name already exists' }, { status: 400 })
  }

  // Derive timezone from zip
  const tz = zipToTimezone(zip_code || '')

  // Clean domain — strip protocol + trailing slash + www. Lowercase FIRST,
  // THEN strip www.: order matters because the www. regex is case-sensitive.
  // A mixed-case paste like "https://WWW.Acme.com/" previously ran the www.
  // strip before lowercasing, so "WWW." never matched and survived into the
  // stored value ("www.acme.com") — every resolver fallback lookup
  // (tenant-lookup.ts / tenant.ts getTenantByDomain step 2) lowercases THEN
  // strips www., always normalizing an incoming Host header to the bare apex
  // ("acme.com"), so a tenant created this way could never resolve its own
  // custom domain at all. Matches the correct order already used by the PUT
  // handlers (admin/businesses/[id], admin/tenants/[id]) and the resolver
  // itself.
  const cleanDomain = (domain_name || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .replace(/^www\./, '') || null

  // Reject a domain already claimed by ANOTHER tenant (via tenant_domains OR
  // the legacy tenants.domain column) BEFORE writing it here. tenants.domain
  // has no DB unique constraint, so nothing else stops this — and a collision
  // makes the resolver's TRANSITION ASSERT-AND-REFUSE divergence guard throw
  // on EVERY request to that host, darkening the EXISTING tenant's live site
  // the instant this write lands (see findDomainOwner's doc comment).
  if (cleanDomain) {
    const owner = await findDomainOwner(cleanDomain)
    if (owner) {
      return NextResponse.json(
        { error: `${cleanDomain} is already registered to ${owner.tenantName}. Remove it there first, or reassign it, before adding it here.` },
        { status: 409 },
      )
    }
  }

  // Create tenant with status=setup
  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .insert({
      name,
      slug,
      industry: industry || 'cleaning',
      zip_code: zip_code || null,
      team_size: team_size || 'solo',
      timezone: tz,
      status: 'setup',
      owner_name: owner_name || null,
      owner_email: owner_email || null,
      owner_phone: owner_phone || null,
      payment_method: payment_method || null,
      monthly_rate: monthly_rate ?? PRICING.adminMonthly,
      setup_fee: setup_fee ?? PRICING.setupFee,
      billing_status: 'setup',
      domain: cleanDomain,
      domain_name: domain_name || null,
      website_url: website_url || null,
      phone: phone || null,
      email: email || null,
      tagline: tagline || null,
      primary_color: primary_color || null,
      ...(business_hours && { business_hours }),
      ...(business_hours_start && { business_hours_start }),
      ...(business_hours_end && { business_hours_end }),
      ...(Array.isArray(payment_methods) && payment_methods.length > 0 && { payment_methods }),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Bust tenant-lookup.ts's edge cache for this exact domain string, same fix
  // as admin/businesses/[id] PUT and admin/tenants/[id] PUT's identical writes
  // to tenants.domain (the resolver's FALLBACK source). invalidateTenantCache
  // can't help here — it only sweeps POSITIVE entries matched by tenant id,
  // and a brand-new tenant has none yet. If this host was ever queried (and
  // negatively cached) before this business was created, it would keep
  // resolving to "no tenant" for up to the rest of the 5-minute TTL despite
  // the tenant now existing with this exact domain.
  if (cleanDomain) {
    const { invalidateDomainCache } = await import('@/lib/tenant-lookup')
    invalidateDomainCache(cleanDomain)
  }

  // Register the tenant's live website (<slug>.fullloopcrm.com) as a Vercel
  // project domain so the site exists the moment the business is created — not
  // only later via Activate. Best-effort: never throws, no-ops if Vercel env is
  // unset. The result is surfaced so the form can show the live URL / any issue.
  const carrying = await registerCarryingDomain(slug)

  // Services, selena_config, guidelines, etc. are seeded by
  // POST /api/admin/businesses/[id]/provision (called by the onboarding form
  // when Auto-seed is checked). Keeps seeding logic in one place.
  return NextResponse.json({ business: tenant, carrying })
}

function zipToTimezone(zip: string): string {
  const prefix = parseInt(zip.slice(0, 3), 10)
  if (isNaN(prefix)) return 'America/New_York'
  if (prefix < 300) return 'America/New_York'
  if (prefix < 400) return 'America/New_York'
  if (prefix < 500) return 'America/Chicago'
  if (prefix < 600) return 'America/Chicago'
  if (prefix < 700) return 'America/Chicago'
  if (prefix < 800) return 'America/Chicago'
  if (prefix < 850) return 'America/Denver'
  if (prefix < 900) return 'America/Denver'
  return 'America/Los_Angeles'
}

function getDefaultServices(industry: string, tenantId: string) {
  const services: Record<string, { name: string; default_duration_hours: number; default_hourly_rate: number }[]> = {
    cleaning: [
      { name: 'Standard Cleaning', default_duration_hours: 3, default_hourly_rate: 49 },
      { name: 'Deep Cleaning', default_duration_hours: 5, default_hourly_rate: 59 },
      { name: 'Move In/Out', default_duration_hours: 6, default_hourly_rate: 59 },
      { name: 'Post-Renovation', default_duration_hours: 6, default_hourly_rate: 65 },
      { name: 'Airbnb Turnover', default_duration_hours: 2, default_hourly_rate: 55 },
    ],
    plumbing: [
      { name: 'Service Call', default_duration_hours: 1, default_hourly_rate: 95 },
      { name: 'Drain Cleaning', default_duration_hours: 1, default_hourly_rate: 125 },
      { name: 'Water Heater', default_duration_hours: 3, default_hourly_rate: 110 },
    ],
    electrical: [
      { name: 'Service Call', default_duration_hours: 1, default_hourly_rate: 95 },
      { name: 'Outlet/Switch Install', default_duration_hours: 1, default_hourly_rate: 90 },
      { name: 'Panel Upgrade', default_duration_hours: 4, default_hourly_rate: 120 },
    ],
    hvac: [
      { name: 'AC Tune-Up', default_duration_hours: 1, default_hourly_rate: 110 },
      { name: 'Furnace Service', default_duration_hours: 2, default_hourly_rate: 110 },
      { name: 'Emergency Repair', default_duration_hours: 2, default_hourly_rate: 150 },
    ],
    landscaping: [
      { name: 'Lawn Mowing', default_duration_hours: 1, default_hourly_rate: 55 },
      { name: 'Full Service', default_duration_hours: 3, default_hourly_rate: 65 },
      { name: 'Spring/Fall Cleanup', default_duration_hours: 4, default_hourly_rate: 60 },
    ],
  }

  // For industries without specific defaults, provide generic services
  const generic = [
    { name: 'Service Call', default_duration_hours: 2, default_hourly_rate: 75 },
    { name: 'Standard Service', default_duration_hours: 3, default_hourly_rate: 70 },
    { name: 'Emergency Service', default_duration_hours: 2, default_hourly_rate: 110 },
  ]

  return (services[industry] || generic).map((s, i) => ({
    tenant_id: tenantId,
    name: s.name,
    default_duration_hours: s.default_duration_hours,
    default_hourly_rate: s.default_hourly_rate,
    sort_order: i,
  }))
}
