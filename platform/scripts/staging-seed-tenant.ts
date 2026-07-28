/**
 * Seeds ONE representative tenant + a small amount of real-shaped data into
 * whatever Supabase instance NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
 * point at (by default the local `supabase start` stack — see
 * scripts/staging-up.sh). Purpose-built for pre-deploy smoke tests, not a
 * demo dataset: one tenant, one team member, one client, one completed
 * booking with a payment — enough to exercise the booking → payment →
 * payroll-prep chain end to end against a real (if small) dataset instead
 * of an empty schema.
 *
 * Insert shape follows the proven pattern already used by
 * platform/scripts/seed-100-tenants.ts (same minimal required tenants
 * columns: name, slug, industry, status) — not reinvented here.
 *
 * USAGE (from platform/):
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
 *   SUPABASE_SERVICE_ROLE_KEY=<local service_role key from `supabase start`> \
 *   npx tsx scripts/staging-seed-tenant.ts
 *
 * Idempotent-ish: re-running creates a second tenant with a timestamped slug
 * rather than erroring, since there's no unique business key to upsert on
 * for a smoke-test fixture. Run ../scripts/staging-up.sh --reset (which
 * resets the DB via `supabase db reset` first) for a clean slate instead of
 * re-running this alone if you want exactly one tenant.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY first (local stack values from `supabase start`).')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  const stamp = Date.now().toString(36)
  const name = 'Staging Smoke Test Cleaning'
  const slug = `staging-smoke-${stamp}`

  console.log(`[staging-seed] creating tenant "${name}" (${slug})`)
  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .insert({ name, slug, industry: 'cleaning', status: 'active' })
    .select('id, name, slug')
    .single()
  if (tErr || !tenant) {
    console.error('[staging-seed] tenant insert failed:', tErr?.message)
    process.exit(1)
  }

  await supabase.from('tenants').update({
    selena_config: {
      ai_enabled: true,
      ai_name: 'Selena',
      tone: 'warm_friendly',
      language: 'en',
      funnel_mode: 'booking',
      pricing_rows: [{ service: 'Standard Cleaning', rate: 59 }],
      service_areas: ['10001'],
    },
    payment_methods: ['zelle', 'credit_card', 'cash'],
    business_hours: 'Mon-Fri 8am-6pm',
    business_hours_start: 8,
    business_hours_end: 18,
    standard_rate: 59,
  }).eq('id', tenant.id)

  const { data: service } = await supabase
    .from('service_types')
    .insert({ tenant_id: tenant.id, name: 'Standard Cleaning', description: 'Regular recurring cleaning', default_duration_hours: 2, default_hourly_rate: 59, sort_order: 1, active: true })
    .select('id')
    .single()

  const { data: teamMember } = await supabase
    .from('team_members')
    .insert({ tenant_id: tenant.id, name: 'Alex Smoketest', phone: '+15550000001', role: 'cleaner', pay_rate: 20, active: true, status: 'active' })
    .select('id')
    .single()

  const { data: client } = await supabase
    .from('clients')
    .insert({ tenant_id: tenant.id, name: 'Jordan Testclient', phone: '+15550000002', email: 'jordan@staging.test' })
    .select('id')
    .single()

  if (service && teamMember && client) {
    const start = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    await supabase.from('bookings').insert({
      tenant_id: tenant.id,
      client_id: client.id,
      team_member_id: teamMember.id,
      service_type_id: service.id,
      status: 'completed',
      payment_status: 'paid',
      price: 118, // 2hr * $59
      actual_hours: 2,
      team_member_pay: 4000, // cents, $40
      start_time: start.toISOString(),
    })
  } else {
    console.warn('[staging-seed] one or more child inserts failed — booking not seeded. Check table/column names match your local schema (post scripts/staging-apply-migrations.sh).')
  }

  console.log(`[staging-seed] done. tenant_id=${tenant.id} slug=${slug}`)
  console.log('[staging-seed] smoke-test targets: GET /api/finance/payroll-prep, /dashboard/bookings, /dashboard/clients for this tenant.')
}

main().catch((err) => {
  console.error('[staging-seed] fatal:', err)
  process.exit(1)
})
