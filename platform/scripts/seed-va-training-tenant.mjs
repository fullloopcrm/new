/**
 * One-shot: create the "Virtual Assistant (Training)" tenant for onboarding
 * the first VA hire — a realistic-looking cleaning-business dataset (owner +
 * VA login, team, service catalog, clients, and a mix of past/upcoming
 * bookings) so the trainee can click around a live tenant instead of an
 * empty shell. Production Supabase — same DB every real tenant lives in,
 * per this platform's "global code, per-tenant data" architecture.
 *
 * Idempotent-ish: checks for an existing tenant with this slug first and
 * exits instead of duplicating if re-run.
 *
 * USAGE (from platform/):  node scripts/seed-va-training-tenant.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import crypto from 'node:crypto'

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

function hashAdminPin(pin) {
  const secret = process.env.ADMIN_TOKEN_SECRET
  if (!secret) throw new Error('ADMIN_TOKEN_SECRET is not configured')
  return crypto.createHmac('sha256', secret).update(`tenant-admin-pin:${pin}`).digest('hex')
}
function generatePin() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

const SLUG = 'virtual-assistant-training'
const TENANT_NAME = 'Virtual Assistant (Training)'

async function main() {
  const { data: existing } = await supabase.from('tenants').select('id').eq('slug', SLUG).maybeSingle()
  if (existing) {
    console.error(`[seed-va] tenant already exists (id=${existing.id}) — not duplicating. Delete it first if you want a fresh run.`)
    process.exit(1)
  }

  console.log(`[seed-va] creating tenant "${TENANT_NAME}" (${SLUG})`)
  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .insert({
      name: TENANT_NAME,
      slug: SLUG,
      industry: 'cleaning',
      status: 'active',
      timezone: 'America/New_York',
      currency: 'USD',
      business_hours: 'Mon-Fri 8am-6pm',
      business_hours_start: 8,
      business_hours_end: 18,
      payment_methods: ['credit_card', 'zelle', 'cash'],
      admin_notes: 'Internal sandbox for onboarding the Virtual Assistant hire — not a real customer. Created 2026-08-03. Do not sweep in tenant cleanup passes.',
      selena_config: {
        ai_enabled: false,
        agent_name: 'Selena',
        pricing_rows: [
          { service: 'Standard Cleaning', rate: 59 },
          { service: 'Deep Cleaning', rate: 89 },
        ],
        service_areas: ['10001', '10002', '10003'],
      },
    })
    .select('id, name, slug')
    .single()
  if (tErr || !tenant) {
    console.error('[seed-va] tenant insert failed:', tErr?.message)
    process.exit(1)
  }
  console.log(`[seed-va] tenant_id=${tenant.id}`)

  // --- Users: an owner (so the tenant is manageable) + the actual VA login ---
  const ownerPin = generatePin()
  const vaPin = generatePin()
  const { error: ownerErr } = await supabase.from('tenant_members').insert({
    tenant_id: tenant.id, name: 'Training Owner', role: 'owner',
    pin_hash: hashAdminPin(ownerPin), pin_set_at: new Date().toISOString(),
  })
  const { error: vaErr } = await supabase.from('tenant_members').insert({
    tenant_id: tenant.id, name: 'VA Trainee', role: 'virtual_assistant',
    pin_hash: hashAdminPin(vaPin), pin_set_at: new Date().toISOString(),
  })
  if (ownerErr || vaErr) console.error('[seed-va] member insert error:', ownerErr?.message, vaErr?.message)

  // --- Service catalog ---
  const { data: services } = await supabase.from('service_types').insert([
    { tenant_id: tenant.id, name: 'Standard Cleaning', description: 'Regular recurring cleaning', default_duration_hours: 2, default_hourly_rate: 59, sort_order: 1, active: true },
    { tenant_id: tenant.id, name: 'Deep Cleaning', description: 'Top-to-bottom cleaning', default_duration_hours: 4, default_hourly_rate: 89, sort_order: 2, active: true },
  ]).select('id, name')
  const svcStandard = services.find(s => s.name === 'Standard Cleaning')
  const svcDeep = services.find(s => s.name === 'Deep Cleaning')

  // --- Team (cleaners to assign jobs to) ---
  const { data: team } = await supabase.from('team_members').insert([
    { tenant_id: tenant.id, name: 'Alex Rivera', phone: '+15550001001', role: 'cleaner', pay_rate: 22, hourly_rate: 22, active: true, status: 'active' },
    { tenant_id: tenant.id, name: 'Jordan Lee', phone: '+15550001002', role: 'cleaner', pay_rate: 24, hourly_rate: 24, active: true, status: 'active' },
  ]).select('id, name')

  // --- Test clients ---
  const CLIENTS = [
    { name: 'Maria Gonzalez', phone: '+15550002001', email: 'maria.gonzalez@example.com', address_line1: '412 W 24th St', city: 'New York', state: 'NY', zip: '10011' },
    { name: 'David Chen', phone: '+15550002002', email: 'david.chen@example.com', address_line1: '88 Bleecker St', city: 'New York', state: 'NY', zip: '10012' },
    { name: 'Sarah Thompson', phone: '+15550002003', email: 'sarah.thompson@example.com', address_line1: '150 E 3rd St', city: 'New York', state: 'NY', zip: '10009' },
    { name: 'James Patel', phone: '+15550002004', email: 'james.patel@example.com', address_line1: '225 5th Ave', city: 'New York', state: 'NY', zip: '10010' },
    { name: 'Emily Nguyen', phone: '+15550002005', email: 'emily.nguyen@example.com', address_line1: '77 Water St', city: 'New York', state: 'NY', zip: '10005' },
    { name: 'Robert Kim', phone: '+15550002006', email: 'robert.kim@example.com', address_line1: '340 E 14th St', city: 'New York', state: 'NY', zip: '10003' },
  ]
  const { data: clients, error: cErr } = await supabase.from('clients').insert(
    CLIENTS.map(c => ({
      tenant_id: tenant.id,
      name: c.name, phone: c.phone, email: c.email,
      address: `${c.address_line1}, ${c.city}, ${c.state} ${c.zip}`,
      address_line1: c.address_line1, city: c.city, state: c.state, zip: c.zip,
      status: 'active', source: 'referral', email_opt_in: true, sms_opt_in: true,
    })),
  ).select('id, name')
  if (cErr || !clients) { console.error('[seed-va] client insert failed:', cErr?.message); process.exit(1) }

  // --- Bookings: a believable mix — completed past week, today, and scheduled ahead ---
  const dayMs = 24 * 60 * 60 * 1000
  const now = Date.now()
  const at = (offsetDays, hour) => new Date(now + offsetDays * dayMs).toISOString().slice(0, 10) + `T${String(hour).padStart(2, '0')}:00:00Z`

  const BOOKINGS = [
    { offset: -6, hour: 10, status: 'completed', payment_status: 'paid', svc: svcStandard, client: 0, member: 0 },
    { offset: -4, hour: 13, status: 'completed', payment_status: 'paid', svc: svcDeep, client: 1, member: 1 },
    { offset: -2, hour: 9, status: 'completed', payment_status: 'paid', svc: svcStandard, client: 2, member: 0 },
    { offset: -1, hour: 11, status: 'completed', payment_status: 'paid', svc: svcStandard, client: 3, member: 1 },
    { offset: 0, hour: 9, status: 'confirmed', payment_status: 'pending', svc: svcStandard, client: 4, member: 0 },
    { offset: 0, hour: 14, status: 'confirmed', payment_status: 'pending', svc: svcDeep, client: 5, member: 1 },
    { offset: 1, hour: 10, status: 'scheduled', payment_status: 'pending', svc: svcStandard, client: 0, member: 0 },
    { offset: 3, hour: 13, status: 'scheduled', payment_status: 'pending', svc: svcStandard, client: 2, member: 1 },
    { offset: 5, hour: 9, status: 'scheduled', payment_status: 'pending', svc: svcDeep, client: 4, member: 0 },
    { offset: 8, hour: 11, status: 'scheduled', payment_status: 'pending', svc: svcStandard, client: 1, member: 1 },
  ]

  const { error: bErr } = await supabase.from('bookings').insert(
    BOOKINGS.map(b => {
      const durationHours = b.svc.name === 'Deep Cleaning' ? 4 : 2
      const price = b.svc.name === 'Deep Cleaning' ? 8900 : 5900 // cents
      const start = at(b.offset, b.hour)
      const end = at(b.offset, b.hour + durationHours)
      return {
        tenant_id: tenant.id,
        client_id: clients[b.client].id,
        team_member_id: team[b.member].id,
        service_type_id: b.svc.id,
        service_type: b.svc.name,
        start_time: start,
        end_time: end,
        status: b.status,
        payment_status: b.payment_status,
        price,
        hourly_rate: price / durationHours,
        actual_hours: b.status === 'completed' ? durationHours : null,
        team_member_pay: b.status === 'completed' ? Math.round(price * 0.4) : null,
      }
    }),
  )
  if (bErr) { console.error('[seed-va] booking insert failed:', bErr.message); process.exit(1) }

  console.log('[seed-va] done.')
  console.log(`[seed-va] tenant: ${tenant.name} (${tenant.id}), slug=${SLUG}`)
  console.log(`[seed-va] owner PIN (login at https://<tenant-domain-or-fullloopcrm-dashboard>/fullloop): ${ownerPin}`)
  console.log(`[seed-va] VA Trainee PIN: ${vaPin}`)
  console.log(`[seed-va] seeded: ${clients.length} clients, ${team.length} team members, ${services.length} services, ${BOOKINGS.length} bookings`)
}

main().catch(err => {
  console.error('[seed-va] fatal:', err)
  process.exit(1)
})
