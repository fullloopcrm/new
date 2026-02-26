import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user already belongs to a tenant
  const { data: existing } = await supabaseAdmin
    .from('tenant_members')
    .select('tenant_id')
    .eq('clerk_user_id', userId)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'You already belong to a business' }, { status: 400 })
  }

  const { name, phone, email, industry } = await request.json()

  if (!name) {
    return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
  }

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Check slug uniqueness
  const { data: slugExists } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (slugExists) {
    return NextResponse.json({ error: 'A business with a similar name already exists' }, { status: 400 })
  }

  // Create tenant
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .insert({
      name,
      slug,
      phone: phone || null,
      email: email || null,
      industry: industry || 'cleaning',
    })
    .select()
    .single()

  if (tenantError) {
    return NextResponse.json({ error: tenantError.message }, { status: 500 })
  }

  // Add the user as owner
  const { error: memberError } = await supabaseAdmin
    .from('tenant_members')
    .insert({
      tenant_id: tenant.id,
      clerk_user_id: userId,
      role: 'owner',
    })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  // Create default service types based on industry
  const defaultServices = getDefaultServices(industry, tenant.id)
  if (defaultServices.length > 0) {
    await supabaseAdmin.from('service_types').insert(defaultServices)
  }

  return NextResponse.json({ tenant })
}

function getDefaultServices(industry: string, tenantId: string) {
  const services: Record<string, { name: string; default_duration_hours: number; default_hourly_rate: number }[]> = {
    cleaning: [
      { name: 'Standard Cleaning', default_duration_hours: 3, default_hourly_rate: 49 },
      { name: 'Deep Cleaning', default_duration_hours: 5, default_hourly_rate: 59 },
      { name: 'Move In/Out', default_duration_hours: 6, default_hourly_rate: 59 },
      { name: 'Post-Renovation', default_duration_hours: 6, default_hourly_rate: 65 },
      { name: 'Airbnb Turnover', default_duration_hours: 2, default_hourly_rate: 55 },
      { name: 'Office Cleaning', default_duration_hours: 3, default_hourly_rate: 49 },
    ],
    plumbing: [
      { name: 'Service Call', default_duration_hours: 1, default_hourly_rate: 95 },
      { name: 'Drain Cleaning', default_duration_hours: 1, default_hourly_rate: 125 },
      { name: 'Water Heater', default_duration_hours: 3, default_hourly_rate: 110 },
      { name: 'Fixture Install', default_duration_hours: 2, default_hourly_rate: 95 },
    ],
    hvac: [
      { name: 'AC Tune-Up', default_duration_hours: 1, default_hourly_rate: 110 },
      { name: 'Furnace Service', default_duration_hours: 2, default_hourly_rate: 110 },
      { name: 'Duct Cleaning', default_duration_hours: 3, default_hourly_rate: 95 },
      { name: 'Emergency Repair', default_duration_hours: 2, default_hourly_rate: 150 },
    ],
    landscaping: [
      { name: 'Lawn Mowing', default_duration_hours: 1, default_hourly_rate: 55 },
      { name: 'Full Service', default_duration_hours: 3, default_hourly_rate: 65 },
      { name: 'Spring/Fall Cleanup', default_duration_hours: 4, default_hourly_rate: 60 },
      { name: 'Mulching', default_duration_hours: 3, default_hourly_rate: 55 },
    ],
  }

  return (services[industry] || []).map((s, i) => ({
    tenant_id: tenantId,
    name: s.name,
    default_duration_hours: s.default_duration_hours,
    default_hourly_rate: s.default_hourly_rate,
    sort_order: i,
  }))
}
