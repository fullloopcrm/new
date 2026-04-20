import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const { data: businesses } = await supabaseAdmin
    .from('tenants')
    .select('*, tenant_members(id), tenant_invites(id, accepted)')
    .order('created_at', { ascending: false })

  return NextResponse.json({ businesses })
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

  // Clean domain — strip protocol + trailing slash + www.
  const cleanDomain = (domain_name || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .replace(/^www\./, '')
    .toLowerCase()
    .trim() || null

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
      monthly_rate: monthly_rate || 0,
      setup_fee: setup_fee || 0,
      billing_status: 'setup',
      domain: cleanDomain,
      domain_name: domain_name || null,
      website_url: website_url || null,
      phone: phone || null,
      email: email || null,
      tagline: tagline || null,
      primary_color: primary_color || '#0d9488',
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

  // Services, selena_config, guidelines, etc. are seeded by
  // POST /api/admin/businesses/[id]/provision (called by the onboarding form
  // when Auto-seed is checked). Keeps seeding logic in one place.
  return NextResponse.json({ business: tenant })
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
