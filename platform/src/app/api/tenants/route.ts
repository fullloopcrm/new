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

  const { name, phone, email, industry, zip_code, team_size } = await request.json()

  if (!name) {
    return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
  }

  // Derive timezone from zip code prefix
  const tz = zipToTimezone(zip_code || '')

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
      zip_code: zip_code || null,
      team_size: team_size || 'solo',
      timezone: tz,
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
    electrical: [
      { name: 'Service Call', default_duration_hours: 1, default_hourly_rate: 95 },
      { name: 'Outlet/Switch Install', default_duration_hours: 1, default_hourly_rate: 90 },
      { name: 'Panel Upgrade', default_duration_hours: 4, default_hourly_rate: 120 },
      { name: 'Lighting Install', default_duration_hours: 2, default_hourly_rate: 95 },
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
    pest_control: [
      { name: 'General Treatment', default_duration_hours: 1, default_hourly_rate: 85 },
      { name: 'Termite Inspection', default_duration_hours: 1, default_hourly_rate: 95 },
      { name: 'Rodent Control', default_duration_hours: 1, default_hourly_rate: 90 },
      { name: 'Bed Bug Treatment', default_duration_hours: 3, default_hourly_rate: 120 },
    ],
    handyman: [
      { name: 'Hourly Service', default_duration_hours: 2, default_hourly_rate: 75 },
      { name: 'Furniture Assembly', default_duration_hours: 2, default_hourly_rate: 70 },
      { name: 'Drywall Repair', default_duration_hours: 2, default_hourly_rate: 80 },
      { name: 'Door/Window Repair', default_duration_hours: 1, default_hourly_rate: 75 },
    ],
    pressure_washing: [
      { name: 'Driveway', default_duration_hours: 2, default_hourly_rate: 80 },
      { name: 'House Exterior', default_duration_hours: 3, default_hourly_rate: 90 },
      { name: 'Deck/Patio', default_duration_hours: 2, default_hourly_rate: 85 },
      { name: 'Fence', default_duration_hours: 2, default_hourly_rate: 75 },
    ],
    window_cleaning: [
      { name: 'Interior Windows', default_duration_hours: 2, default_hourly_rate: 65 },
      { name: 'Exterior Windows', default_duration_hours: 3, default_hourly_rate: 70 },
      { name: 'Full Service (Int + Ext)', default_duration_hours: 4, default_hourly_rate: 65 },
      { name: 'Screen Cleaning', default_duration_hours: 1, default_hourly_rate: 55 },
    ],
    junk_removal: [
      { name: 'Small Load', default_duration_hours: 1, default_hourly_rate: 90 },
      { name: 'Half Truck', default_duration_hours: 2, default_hourly_rate: 85 },
      { name: 'Full Truck', default_duration_hours: 3, default_hourly_rate: 80 },
      { name: 'Appliance Removal', default_duration_hours: 1, default_hourly_rate: 95 },
    ],
    roofing: [
      { name: 'Inspection', default_duration_hours: 1, default_hourly_rate: 95 },
      { name: 'Leak Repair', default_duration_hours: 3, default_hourly_rate: 110 },
      { name: 'Shingle Replacement', default_duration_hours: 4, default_hourly_rate: 100 },
      { name: 'Gutter Install', default_duration_hours: 4, default_hourly_rate: 85 },
    ],
    painting: [
      { name: 'Interior Room', default_duration_hours: 4, default_hourly_rate: 55 },
      { name: 'Exterior', default_duration_hours: 8, default_hourly_rate: 60 },
      { name: 'Cabinet Refinishing', default_duration_hours: 6, default_hourly_rate: 65 },
      { name: 'Trim/Doors', default_duration_hours: 3, default_hourly_rate: 55 },
    ],
    carpet_cleaning: [
      { name: 'Per Room', default_duration_hours: 1, default_hourly_rate: 65 },
      { name: 'Whole House', default_duration_hours: 3, default_hourly_rate: 60 },
      { name: 'Upholstery', default_duration_hours: 2, default_hourly_rate: 70 },
      { name: 'Stain Treatment', default_duration_hours: 1, default_hourly_rate: 75 },
    ],
    pool_service: [
      { name: 'Weekly Maintenance', default_duration_hours: 1, default_hourly_rate: 75 },
      { name: 'Opening', default_duration_hours: 3, default_hourly_rate: 85 },
      { name: 'Closing', default_duration_hours: 3, default_hourly_rate: 85 },
      { name: 'Equipment Repair', default_duration_hours: 2, default_hourly_rate: 95 },
    ],
    locksmith: [
      { name: 'Lockout Service', default_duration_hours: 1, default_hourly_rate: 95 },
      { name: 'Lock Rekey', default_duration_hours: 1, default_hourly_rate: 85 },
      { name: 'Lock Replacement', default_duration_hours: 1, default_hourly_rate: 90 },
      { name: 'Smart Lock Install', default_duration_hours: 1, default_hourly_rate: 100 },
    ],
    appliance_repair: [
      { name: 'Diagnostic', default_duration_hours: 1, default_hourly_rate: 85 },
      { name: 'Washer/Dryer', default_duration_hours: 2, default_hourly_rate: 90 },
      { name: 'Refrigerator', default_duration_hours: 2, default_hourly_rate: 95 },
      { name: 'Dishwasher', default_duration_hours: 1, default_hourly_rate: 85 },
    ],
    tree_service: [
      { name: 'Trimming', default_duration_hours: 3, default_hourly_rate: 85 },
      { name: 'Removal', default_duration_hours: 6, default_hourly_rate: 100 },
      { name: 'Stump Grinding', default_duration_hours: 2, default_hourly_rate: 90 },
      { name: 'Emergency Service', default_duration_hours: 4, default_hourly_rate: 130 },
    ],
    moving: [
      { name: 'Local Move', default_duration_hours: 4, default_hourly_rate: 65 },
      { name: 'Loading Only', default_duration_hours: 2, default_hourly_rate: 60 },
      { name: 'Unloading Only', default_duration_hours: 2, default_hourly_rate: 60 },
      { name: 'Packing Service', default_duration_hours: 4, default_hourly_rate: 55 },
    ],
    flooring: [
      { name: 'Hardwood Install', default_duration_hours: 8, default_hourly_rate: 75 },
      { name: 'Tile Install', default_duration_hours: 8, default_hourly_rate: 70 },
      { name: 'LVP/Laminate Install', default_duration_hours: 6, default_hourly_rate: 60 },
      { name: 'Floor Refinishing', default_duration_hours: 8, default_hourly_rate: 65 },
    ],
    fencing: [
      { name: 'Wood Fence Install', default_duration_hours: 8, default_hourly_rate: 65 },
      { name: 'Chain Link Install', default_duration_hours: 6, default_hourly_rate: 55 },
      { name: 'Fence Repair', default_duration_hours: 3, default_hourly_rate: 70 },
      { name: 'Gate Install', default_duration_hours: 4, default_hourly_rate: 75 },
    ],
    concrete: [
      { name: 'Driveway', default_duration_hours: 8, default_hourly_rate: 85 },
      { name: 'Patio/Slab', default_duration_hours: 6, default_hourly_rate: 80 },
      { name: 'Walkway', default_duration_hours: 4, default_hourly_rate: 75 },
      { name: 'Crack Repair', default_duration_hours: 2, default_hourly_rate: 90 },
    ],
    garage_door: [
      { name: 'Spring Replacement', default_duration_hours: 1, default_hourly_rate: 110 },
      { name: 'Opener Install', default_duration_hours: 2, default_hourly_rate: 95 },
      { name: 'Door Replacement', default_duration_hours: 4, default_hourly_rate: 100 },
      { name: 'Tune-Up', default_duration_hours: 1, default_hourly_rate: 85 },
    ],
    chimney: [
      { name: 'Chimney Sweep', default_duration_hours: 2, default_hourly_rate: 85 },
      { name: 'Inspection', default_duration_hours: 1, default_hourly_rate: 90 },
      { name: 'Cap Install', default_duration_hours: 2, default_hourly_rate: 95 },
      { name: 'Liner Install', default_duration_hours: 4, default_hourly_rate: 100 },
    ],
    septic: [
      { name: 'Drain Cleaning', default_duration_hours: 1, default_hourly_rate: 110 },
      { name: 'Septic Pumping', default_duration_hours: 2, default_hourly_rate: 95 },
      { name: 'Camera Inspection', default_duration_hours: 1, default_hourly_rate: 120 },
      { name: 'Line Repair', default_duration_hours: 4, default_hourly_rate: 115 },
    ],
    solar: [
      { name: 'Consultation', default_duration_hours: 1, default_hourly_rate: 0 },
      { name: 'Panel Install', default_duration_hours: 8, default_hourly_rate: 95 },
      { name: 'Maintenance', default_duration_hours: 2, default_hourly_rate: 85 },
      { name: 'Battery Install', default_duration_hours: 4, default_hourly_rate: 100 },
    ],
    home_security: [
      { name: 'System Install', default_duration_hours: 3, default_hourly_rate: 95 },
      { name: 'Camera Install', default_duration_hours: 2, default_hourly_rate: 90 },
      { name: 'Alarm Monitoring Setup', default_duration_hours: 1, default_hourly_rate: 85 },
      { name: 'Smart Lock Integration', default_duration_hours: 1, default_hourly_rate: 95 },
    ],
    snow_removal: [
      { name: 'Driveway Plowing', default_duration_hours: 1, default_hourly_rate: 75 },
      { name: 'Sidewalk Clearing', default_duration_hours: 1, default_hourly_rate: 65 },
      { name: 'De-icing/Salting', default_duration_hours: 1, default_hourly_rate: 60 },
      { name: 'Roof Snow Removal', default_duration_hours: 3, default_hourly_rate: 95 },
    ],
    restoration: [
      { name: 'Water Damage', default_duration_hours: 4, default_hourly_rate: 120 },
      { name: 'Fire Damage', default_duration_hours: 8, default_hourly_rate: 130 },
      { name: 'Mold Remediation', default_duration_hours: 6, default_hourly_rate: 115 },
      { name: 'Emergency Extraction', default_duration_hours: 3, default_hourly_rate: 140 },
    ],
    remodeling: [
      { name: 'Consultation', default_duration_hours: 1, default_hourly_rate: 0 },
      { name: 'Kitchen Remodel', default_duration_hours: 8, default_hourly_rate: 85 },
      { name: 'Bathroom Remodel', default_duration_hours: 8, default_hourly_rate: 80 },
      { name: 'Basement Finish', default_duration_hours: 8, default_hourly_rate: 75 },
    ],
    irrigation: [
      { name: 'System Install', default_duration_hours: 6, default_hourly_rate: 75 },
      { name: 'Spring Startup', default_duration_hours: 1, default_hourly_rate: 70 },
      { name: 'Winterization', default_duration_hours: 1, default_hourly_rate: 70 },
      { name: 'Repair', default_duration_hours: 2, default_hourly_rate: 80 },
    ],
    decks: [
      { name: 'Deck Build', default_duration_hours: 8, default_hourly_rate: 75 },
      { name: 'Deck Staining', default_duration_hours: 4, default_hourly_rate: 55 },
      { name: 'Paver Patio', default_duration_hours: 8, default_hourly_rate: 70 },
      { name: 'Repair', default_duration_hours: 3, default_hourly_rate: 75 },
    ],
    insulation: [
      { name: 'Attic Insulation', default_duration_hours: 4, default_hourly_rate: 75 },
      { name: 'Crawl Space', default_duration_hours: 4, default_hourly_rate: 80 },
      { name: 'Basement Waterproofing', default_duration_hours: 8, default_hourly_rate: 90 },
      { name: 'Spray Foam', default_duration_hours: 4, default_hourly_rate: 95 },
    ],
    wildlife_removal: [
      { name: 'Inspection', default_duration_hours: 1, default_hourly_rate: 95 },
      { name: 'Animal Removal', default_duration_hours: 2, default_hourly_rate: 110 },
      { name: 'Exclusion Sealing', default_duration_hours: 3, default_hourly_rate: 90 },
      { name: 'Cleanup/Sanitize', default_duration_hours: 3, default_hourly_rate: 85 },
    ],
    home_inspection: [
      { name: 'Full Home Inspection', default_duration_hours: 3, default_hourly_rate: 120 },
      { name: 'Pre-Listing Inspection', default_duration_hours: 2, default_hourly_rate: 110 },
      { name: 'Radon Testing', default_duration_hours: 1, default_hourly_rate: 95 },
      { name: 'Mold Testing', default_duration_hours: 1, default_hourly_rate: 100 },
    ],
    smart_home: [
      { name: 'Consultation', default_duration_hours: 1, default_hourly_rate: 85 },
      { name: 'Smart Home Setup', default_duration_hours: 3, default_hourly_rate: 95 },
      { name: 'Home Theater Install', default_duration_hours: 4, default_hourly_rate: 100 },
      { name: 'Network/WiFi Setup', default_duration_hours: 2, default_hourly_rate: 90 },
    ],
    multi_service: [
      { name: 'Service Call', default_duration_hours: 2, default_hourly_rate: 75 },
      { name: 'Maintenance Visit', default_duration_hours: 3, default_hourly_rate: 70 },
      { name: 'Emergency Service', default_duration_hours: 2, default_hourly_rate: 110 },
      { name: 'Consultation', default_duration_hours: 1, default_hourly_rate: 0 },
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

function zipToTimezone(zip: string): string {
  const prefix = parseInt(zip.slice(0, 3), 10)
  if (isNaN(prefix)) return 'America/New_York'
  // Eastern: 0-299 (NE, SE, FL, OH, MI, IN, etc)
  if (prefix < 300) return 'America/New_York'
  // Eastern/Central border: 300-399 (GA, AL, TN, MS)
  if (prefix < 400) return 'America/New_York'
  // Central: 400-499 (KY, IN partial, MI partial)
  if (prefix < 500) return 'America/Chicago'
  // Central: 500-599 (IA, MN, SD, ND, NE)
  if (prefix < 600) return 'America/Chicago'
  // Central: 600-699 (IL, MO, KS)
  if (prefix < 700) return 'America/Chicago'
  // Central: 700-799 (LA, AR, OK, TX)
  if (prefix < 800) return 'America/Chicago'
  // Mountain: 800-849 (CO, WY, MT, NM, UT)
  if (prefix < 850) return 'America/Denver'
  // Mountain/Pacific: 850-899 (AZ, NV, ID)
  if (prefix < 900) return 'America/Denver'
  // Pacific: 900-999 (CA, OR, WA, HI, AK)
  return 'America/Los_Angeles'
}
