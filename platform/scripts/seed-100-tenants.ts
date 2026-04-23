/**
 * Seed 100 test tenants across 8 industries. One-by-one inserts + provisioning.
 * Each tenant gets: base row, services, selena_config, business_hours, payment_methods, guidelines.
 *
 * USAGE: pnpm tsx scripts/seed-100-tenants.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(url, key, { auth: { persistSession: false } })

type Industry = 'cleaning' | 'landscaping' | 'hvac' | 'plumbing' | 'handyman' | 'electrical' | 'pest' | 'general'

const PLAN: Array<{ industry: Industry; count: number; names: string[] }> = [
  { industry: 'cleaning', count: 20, names: ['Sparkle', 'Shine', 'Fresh', 'Clean Slate', 'Tidy', 'Crystal', 'Pristine', 'Spotless', 'Polish', 'Bright', 'Dust Busters', 'Home Glow', 'Pure', 'Meadow', 'Linen', 'Blossom', 'Suds', 'Gleam', 'Azure', 'Mint'] },
  { industry: 'landscaping', count: 15, names: ['Evergreen', 'Greenscape', 'Terra', 'Oak & Ivy', 'Garden Path', 'Meadowview', 'Bloom', 'Cedar', 'Verdant', 'Stonefield', 'Willow', 'Acorn', 'Fern', 'Clover', 'Stonehedge'] },
  { industry: 'hvac', count: 12, names: ['Climate', 'Polar', 'Arctic Air', 'Comfort', 'Home Temp', 'Cool Breeze', 'Thermo', 'Airflow', 'Chill', 'Warm Hearth', 'HVAC Pro', 'Precision Climate'] },
  { industry: 'plumbing', count: 12, names: ['Drain Masters', 'Pipe', 'Flow', 'Aqua', 'Waterworks', 'Leak Stop', 'Rapid Pipe', 'Drip', 'Plumbline', 'Pressure', 'Clear Pipes', 'Tap'] },
  { industry: 'handyman', count: 12, names: ['Handy', 'Fix-It', 'Mr. Fixit', 'All Tasks', 'Hammer', 'Nail & Hammer', 'Odd Jobs', 'Quick Fix', 'Tool Box', 'Honey Do', 'Wrench', 'Any Job'] },
  { industry: 'electrical', count: 10, names: ['Spark', 'Voltage', 'Current', 'Wire', 'Bright Watt', 'Lightning', 'Circuit', 'Power Source', 'Amp', 'Flux'] },
  { industry: 'pest', count: 10, names: ['Pest Pro', 'Bug Free', 'Guardian Pest', 'Shield', 'Trap', 'No Bugs', 'Exterminate', 'Pest Patrol', 'Safeguard', 'Buzz Off'] },
  { industry: 'general', count: 9, names: ['Service First', 'Home Pros', 'All Services', 'House Care', 'Property', 'Home Solutions', 'Estate', 'Fixit All', 'City Services'] },
]

const SERVICE_PRESETS: Record<Industry, Array<{ name: string; description: string; default_duration_hours: number; default_hourly_rate: number; sort_order: number }>> = {
  cleaning: [
    { name: 'Standard Cleaning', description: 'Regular recurring cleaning', default_duration_hours: 2, default_hourly_rate: 59, sort_order: 1 },
    { name: 'Deep Cleaning', description: 'Top-to-bottom cleaning', default_duration_hours: 4, default_hourly_rate: 75, sort_order: 2 },
    { name: 'Move In/Out', description: 'Empty-home deep clean', default_duration_hours: 4, default_hourly_rate: 75, sort_order: 3 },
  ],
  landscaping: [
    { name: 'Lawn Mowing', description: 'Mow + edge + trim', default_duration_hours: 1, default_hourly_rate: 75, sort_order: 1 },
    { name: 'Spring Cleanup', description: 'Full cleanup + debris haul', default_duration_hours: 4, default_hourly_rate: 85, sort_order: 2 },
  ],
  hvac: [
    { name: 'HVAC Tune-Up', description: 'Seasonal maintenance', default_duration_hours: 1, default_hourly_rate: 125, sort_order: 1 },
    { name: 'Service Call', description: 'Diagnosis + repair', default_duration_hours: 2, default_hourly_rate: 150, sort_order: 2 },
  ],
  plumbing: [
    { name: 'Service Call', description: 'Diagnosis + repair', default_duration_hours: 1, default_hourly_rate: 135, sort_order: 1 },
    { name: 'Drain Cleaning', description: 'Clear slow drains', default_duration_hours: 1, default_hourly_rate: 125, sort_order: 2 },
  ],
  handyman: [
    { name: 'Small Repair', description: 'Single-item repair', default_duration_hours: 1, default_hourly_rate: 85, sort_order: 1 },
    { name: 'Half-Day Service', description: 'Multiple small jobs', default_duration_hours: 4, default_hourly_rate: 85, sort_order: 2 },
  ],
  electrical: [
    { name: 'Service Call', description: 'Diagnostic + minor repair', default_duration_hours: 1, default_hourly_rate: 150, sort_order: 1 },
    { name: 'Outlet Install', description: 'New outlet or switch', default_duration_hours: 1, default_hourly_rate: 150, sort_order: 2 },
  ],
  pest: [
    { name: 'General Pest Control', description: 'Interior + exterior treatment', default_duration_hours: 1, default_hourly_rate: 95, sort_order: 1 },
    { name: 'Rodent Control', description: 'Rat / mouse exclusion', default_duration_hours: 2, default_hourly_rate: 115, sort_order: 2 },
  ],
  general: [
    { name: 'Service Call', description: 'Initial diagnostic visit', default_duration_hours: 1, default_hourly_rate: 100, sort_order: 1 },
    { name: 'Standard Service', description: 'Typical service package', default_duration_hours: 2, default_hourly_rate: 100, sort_order: 2 },
  ],
}

function slugify(name: string, i: number): string {
  return `test-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${i}`
}

function selenaConfigFor(industry: Industry, tenantName: string) {
  const services = SERVICE_PRESETS[industry]
  return {
    ai_enabled: true,
    ai_name: 'Selena',
    tone: 'warm_friendly',
    emoji: 'one_per_message',
    language: 'en',
    pricing_tiers: services.map(s => ({ label: s.name, price: s.default_hourly_rate })),
    time_estimates: services.map(s => ({ size: s.name, estimate: `${s.default_duration_hours}hr` })),
    business_description: `${tenantName} — reliable ${industry} service`,
    cancellation_policy: 'First-time: no cancel. Recurring: 7 days notice.',
  }
}

async function createOne(industry: Industry, baseName: string, i: number): Promise<{ id: string; name: string; slug: string } | null> {
  const name = `${baseName} ${industry === 'cleaning' ? 'Cleaning' : industry === 'landscaping' ? 'Landscaping' : industry === 'hvac' ? 'HVAC' : industry === 'plumbing' ? 'Plumbing' : industry === 'handyman' ? 'Handyman' : industry === 'electrical' ? 'Electric' : industry === 'pest' ? 'Pest' : 'Services'} (Test ${i})`
  const slug = slugify(`${baseName}-${industry}`, i)

  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .insert({ name, slug, industry, status: 'active' })
    .select('id, name, slug')
    .single()
  if (tErr || !tenant) {
    console.error(`  ✗ ${name}: ${tErr?.message}`)
    return null
  }

  const services = SERVICE_PRESETS[industry].map(s => ({ ...s, tenant_id: tenant.id, active: true }))
  await supabase.from('service_types').insert(services)

  await supabase.from('tenants').update({
    selena_config: selenaConfigFor(industry, name),
    payment_methods: ['zelle', 'apple_pay', 'credit_card', 'cash'],
    business_hours: 'Mon-Fri 8am-6pm, Sat 9am-3pm',
    guidelines_en: 'Arrive on time. Be polite. Finish the job.',
    business_hours_start: 8,
    business_hours_end: 18,
    standard_rate: services[0].default_hourly_rate,
  }).eq('id', tenant.id)

  return tenant
}

async function main() {
  console.log(`[seed] starting — will create ${PLAN.reduce((s, p) => s + p.count, 0)} tenants, one by one`)
  let total = 0
  let fails = 0
  const created: Array<{ id: string; name: string; industry: Industry }> = []

  for (const plan of PLAN) {
    for (let i = 0; i < plan.count; i++) {
      total++
      const baseName = plan.names[i % plan.names.length]
      const t = await createOne(plan.industry, baseName, total)
      if (!t) { fails++; continue }
      created.push({ id: t.id, name: t.name, industry: plan.industry })
      console.log(`  [${total}/100] ${plan.industry.padEnd(12)} ${t.name}`)
    }
  }

  console.log(`\n[seed] done: ${created.length} created, ${fails} failed`)
  console.log(`[seed] writing manifest to scripts/out/seed-100-tenants.json`)
  const outDir = resolve(process.cwd(), 'scripts/out')
  const { mkdirSync, writeFileSync } = await import('node:fs')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, 'seed-100-tenants.json'), JSON.stringify(created, null, 2))
}

main().catch(err => {
  console.error('[seed] fatal:', err)
  process.exit(1)
})
