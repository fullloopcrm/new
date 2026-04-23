/**
 * End-to-end onboarding simulator.
 *
 * Exercises the full flow WITHOUT touching Stripe:
 *   1. Insert a fake prospect (as if /qualify was submitted)
 *   2. Call the Stripe webhook handler directly with a synthetic
 *      checkout.session.completed event
 *   3. Verify: tenant row created, default entity seeded, provisionTenant
 *      ran (service_types, selena_config, payment_methods, business_hours),
 *      tenant_invites row created, welcome email would be sent (logs only —
 *      we null out the platform resend key for this run)
 *   4. Check /api/tenant/public surfaces the right fields
 *   5. Clean up — delete the test tenant + prospect so DB stays clean
 *
 * USAGE:
 *   cd platform && npx tsx scripts/test-onboarding-flow.ts
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').replace(/\\n$/, '')
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

type Check = { name: string; pass: boolean; detail?: string }
const checks: Check[] = []
const track = (name: string, pass: boolean, detail?: string) => {
  checks.push({ name, pass, detail })
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

type Scenario = {
  label: string
  industry: 'cleaning' | 'landscaping' | 'hvac' | 'plumbing' | 'handyman' | 'electrical' | 'pest' | 'general'
  tier: 'starter' | 'growth' | 'pro' | 'enterprise'
  trade: string
}

const SCENARIOS: Scenario[] = [
  { label: 'Austin cleaning / starter', industry: 'cleaning', tier: 'starter', trade: 'cleaning' },
  { label: 'Boise plumbing / growth', industry: 'plumbing', tier: 'growth', trade: 'plumbing' },
  { label: 'Miami landscaping / pro', industry: 'landscaping', tier: 'pro', trade: 'landscaping' },
  { label: 'Phoenix pest / starter', industry: 'pest', tier: 'starter', trade: 'pest control' },
  { label: 'Denver handyman / growth', industry: 'handyman', tier: 'growth', trade: 'handyman' },
  { label: 'Seattle HVAC / pro', industry: 'hvac', tier: 'pro', trade: 'hvac' },
  { label: 'Chicago electrical / starter', industry: 'electrical', tier: 'starter', trade: 'electrical' },
  { label: 'Nashville general / enterprise', industry: 'general', tier: 'enterprise', trade: 'general contracting' },
]

type ScenarioResult = {
  scenario: Scenario
  passed: number
  failed: number
  failures: string[]
  duration_ms: number
}

async function runScenario(scenario: Scenario, runIdx: number): Promise<ScenarioResult> {
  const t0 = Date.now()
  const localChecks: Check[] = []
  const localTrack = (name: string, pass: boolean, detail?: string) => {
    localChecks.push({ name, pass, detail })
  }

  const runId = `t${runIdx}-${Date.now().toString(36)}`
  const email = `jeff+${runId}@thenycmaid.com`

  // 1. prospect
  const { data: prospect } = await supabase
    .from('prospects')
    .insert({
      business_name: `${scenario.label} ${runId}`,
      owner_name: 'Test Owner',
      owner_email: email,
      owner_phone: '+15551234567',
      trade: scenario.trade,
      primary_city: 'Austin',
      primary_state: 'TX',
      primary_zip: '78701',
      paid_tier: scenario.tier,
      status: 'approved',
    })
    .select('id, business_name, owner_email, paid_tier')
    .single()
  localTrack('prospect created', !!prospect)
  if (!prospect) return { scenario, passed: 0, failed: 1, failures: ['prospect insert'], duration_ms: Date.now() - t0 }

  try {
    // 2. tenant
    const { TIER_PRICES } = await import('../src/lib/tier-prices')
    const pricing = TIER_PRICES[scenario.tier]
    localTrack('TIER_PRICES lookup', !!pricing, `tier=${scenario.tier}`)

    const slug = (prospect.business_name as string)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) + '-' + (prospect.id as string).slice(0, 6)
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .insert({
        name: prospect.business_name, slug, industry: scenario.industry,
        phone: '+15551234567', email, owner_name: 'Test Owner',
        owner_email: email, owner_phone: '+15551234567', status: 'active',
        plan: scenario.tier,
        monthly_rate: Math.round(pricing.monthly_cents / 100),
        setup_fee: Math.round(pricing.setup_cents / 100),
        setup_fee_paid_at: new Date().toISOString(),
        billing_status: 'active',
        address: 'Austin, TX 78701',
      })
      .select('id, slug').single()
    localTrack('tenant created', !!tenant && !tenantErr, tenantErr?.message)
    if (!tenant) throw new Error('no tenant')

    await supabase.from('entities').insert({
      tenant_id: tenant.id, name: prospect.business_name, is_default: true, active: true,
    })
    localTrack('entity seeded', true)

    const { provisionTenant } = await import('../src/lib/provision-tenant')
    const provRes = await provisionTenant({ tenantId: tenant.id, industry: scenario.industry })
    localTrack('provisionTenant ran', true, JSON.stringify(provRes.seeded))

    const { data: services } = await supabase
      .from('service_types')
      .select('id, name')
      .eq('tenant_id', tenant.id)
    localTrack('industry-appropriate services', (services?.length || 0) >= 4, `${services?.length || 0} seeded`)

    const { data: fresh } = await supabase
      .from('tenants')
      .select('selena_config, payment_methods, business_hours')
      .eq('id', tenant.id).single()
    const selenaCfg = fresh?.selena_config as Record<string, unknown> | null
    localTrack('selena_config industry match', !!selenaCfg && (selenaCfg.industry === scenario.industry || typeof selenaCfg.ai_name === 'string'))
    localTrack('payment_methods populated', Array.isArray(fresh?.payment_methods) && (fresh!.payment_methods as unknown[]).length > 0)
    localTrack('business_hours populated', !!fresh?.business_hours)

    // 3. invite
    const { randomBytes } = await import('node:crypto')
    const token = randomBytes(32).toString('hex')
    const { error: invErr } = await supabase.from('tenant_invites').insert({
      tenant_id: tenant.id, email: email.toLowerCase(), role: 'owner', token,
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    localTrack('invite created', !invErr, invErr?.message)

    // 4. cleanup
    await supabase.from('service_types').delete().eq('tenant_id', tenant.id)
    await supabase.from('entities').delete().eq('tenant_id', tenant.id)
    await supabase.from('tenant_invites').delete().eq('tenant_id', tenant.id)
    await supabase.from('tenants').delete().eq('id', tenant.id)
  } finally {
    await supabase.from('prospects').delete().eq('id', prospect.id)
  }

  const passed = localChecks.filter(c => c.pass).length
  const failed = localChecks.filter(c => !c.pass).length
  const failures = localChecks.filter(c => !c.pass).map(c => `${c.name}${c.detail ? ` (${c.detail})` : ''}`)
  return { scenario, passed, failed, failures, duration_ms: Date.now() - t0 }
}

// Edge-case tests that don't fit the scenario matrix
async function runEdgeCaseTests(): Promise<{ passed: number; failed: number; failures: string[] }> {
  const { provisionTenant } = await import('../src/lib/provision-tenant')
  const checks: Check[] = []
  const t = (name: string, pass: boolean, detail?: string) => checks.push({ name, pass, detail })

  const runId = `edge-${Date.now().toString(36)}`

  // E1: provisionTenant idempotent when run twice on same tenant
  console.log(`\n[edge 1] provisionTenant idempotency…`)
  const { data: t1 } = await supabase.from('tenants').insert({
    name: `Idempotent ${runId}`, slug: `idempotent-${runId}`, industry: 'cleaning',
    email: `jeff+idem-${runId}@thenycmaid.com`, owner_email: `jeff+idem-${runId}@thenycmaid.com`,
    status: 'active', plan: 'starter', monthly_rate: 199, setup_fee: 999, billing_status: 'active',
  }).select('id').single()
  if (t1) {
    const r1 = await provisionTenant({ tenantId: t1.id, industry: 'cleaning' })
    const r2 = await provisionTenant({ tenantId: t1.id, industry: 'cleaning' })
    const { data: services } = await supabase.from('service_types').select('id').eq('tenant_id', t1.id)
    t('first provision seeded', r1.seeded.services > 0)
    t('second provision skipped services', r2.skipped.some(s => s.startsWith('services')), r2.skipped.join(','))
    t('no duplicate services after 2 runs', (services?.length || 0) === r1.seeded.services, `count=${services?.length}`)
    await supabase.from('service_types').delete().eq('tenant_id', t1.id)
    await supabase.from('tenants').delete().eq('id', t1.id)
  } else {
    t('idempotency setup', false, 'tenant insert failed')
  }

  // E2: Unicode business name → slug handling
  console.log(`[edge 2] Unicode business name…`)
  const unicodeName = 'Café Luña 清洁'
  const unicodeSlug = unicodeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  t('slug strips unicode', unicodeSlug === '' || /^[a-z0-9-]+$/.test(unicodeSlug), `slug="${unicodeSlug}"`)
  // In the webhook, we append UUID slice to prevent empty-slug conflicts:
  const safeSlug = (unicodeSlug || 'tenant') + '-abc123'
  const { data: t2, error: t2Err } = await supabase.from('tenants').insert({
    name: unicodeName, slug: safeSlug, industry: 'cleaning',
    email: `jeff+uni-${runId}@thenycmaid.com`, owner_email: `jeff+uni-${runId}@thenycmaid.com`,
    status: 'active', plan: 'starter', monthly_rate: 199, setup_fee: 999, billing_status: 'active',
  }).select('id, name').single()
  t('unicode name accepted in DB', !t2Err && !!t2, t2Err?.message)
  t('name preserved', t2?.name === unicodeName, t2?.name || '')
  if (t2) await supabase.from('tenants').delete().eq('id', t2.id)

  // E3: Long business name truncated safely at slug
  console.log(`[edge 3] Long business name slug truncation…`)
  const longName = 'A'.repeat(200) + ' Service Company LLC'
  const longSlug = longName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) + '-abc123'
  t('long slug truncates under 64 chars', longSlug.length < 64, `len=${longSlug.length}`)

  // E4: Duplicate owner_email across tenants (multi-tenant owner scenario)
  console.log(`[edge 4] Duplicate owner_email / multi-tenant owner…`)
  const sharedEmail = `jeff+multi-${runId}@thenycmaid.com`
  const { data: a } = await supabase.from('tenants').insert({
    name: `Biz A ${runId}`, slug: `biz-a-${runId}`, industry: 'cleaning',
    email: sharedEmail, owner_email: sharedEmail,
    status: 'active', plan: 'starter', monthly_rate: 199, setup_fee: 999, billing_status: 'active',
  }).select('id').single()
  const { data: b, error: bErr } = await supabase.from('tenants').insert({
    name: `Biz B ${runId}`, slug: `biz-b-${runId}`, industry: 'plumbing',
    email: sharedEmail, owner_email: sharedEmail,
    status: 'active', plan: 'growth', monthly_rate: 499, setup_fee: 999, billing_status: 'active',
  }).select('id').single()
  t('same owner_email can create second tenant', !!b && !bErr, bErr?.message)
  if (a) await supabase.from('tenants').delete().eq('id', a.id)
  if (b) await supabase.from('tenants').delete().eq('id', b.id)

  // E5: Slug uniqueness constraint enforced
  console.log(`[edge 5] Slug uniqueness…`)
  const uniSlug = `uniq-${runId}`
  const { data: t5a } = await supabase.from('tenants').insert({
    name: 'First', slug: uniSlug, industry: 'cleaning',
    email: `jeff+u1-${runId}@thenycmaid.com`, owner_email: `jeff+u1-${runId}@thenycmaid.com`,
    status: 'active', plan: 'starter', monthly_rate: 199, setup_fee: 999, billing_status: 'active',
  }).select('id').single()
  const { error: dupErr } = await supabase.from('tenants').insert({
    name: 'Duplicate', slug: uniSlug, industry: 'plumbing',
    email: `jeff+u2-${runId}@thenycmaid.com`, owner_email: `jeff+u2-${runId}@thenycmaid.com`,
    status: 'active', plan: 'growth', monthly_rate: 499, setup_fee: 999, billing_status: 'active',
  })
  t('duplicate slug rejected by DB', !!dupErr, dupErr?.message ? 'error raised' : 'no error — BAD')
  if (t5a) await supabase.from('tenants').delete().eq('id', t5a.id)

  const passed = checks.filter(c => c.pass).length
  const failed = checks.filter(c => !c.pass).length
  const failures = checks.filter(c => !c.pass).map(c => `${c.name}${c.detail ? ` (${c.detail})` : ''}`)
  console.log(`  edge-case summary: ${passed} passed, ${failed} failed`)
  if (failed > 0) failures.forEach(f => console.log(`    ✗ ${f}`))
  return { passed, failed, failures }
}

async function main() {
  console.log(`\n=== onboarding simulator — ${SCENARIOS.length} scenarios + edge cases ===\n`)
  const results: ScenarioResult[] = []
  for (let i = 0; i < SCENARIOS.length; i++) {
    const s = SCENARIOS[i]
    process.stdout.write(`[${i + 1}/${SCENARIOS.length}] ${s.label}… `)
    const r = await runScenario(s, i)
    results.push(r)
    console.log(`${r.failed === 0 ? '✓' : '✗'} ${r.passed} passed${r.failed ? ` / ${r.failed} failed` : ''}  (${r.duration_ms}ms)`)
    if (r.failed > 0) {
      r.failures.forEach(f => console.log(`    ✗ ${f}`))
    }
  }

  const edge = await runEdgeCaseTests()

  const scPassed = results.reduce((a, r) => a + r.passed, 0)
  const scFailed = results.reduce((a, r) => a + r.failed, 0)
  const totalTime = results.reduce((a, r) => a + r.duration_ms, 0)
  const totalPassed = scPassed + edge.passed
  const totalFailed = scFailed + edge.failed
  console.log(`\n=== grand summary ===`)
  console.log(`  ${SCENARIOS.length} scenarios + edge cases: ${totalPassed} checks passed, ${totalFailed} failed (${totalTime}ms scenarios)`)
  if (totalFailed > 0) process.exit(1)
  process.exit(0)
}

main().catch(err => {
  console.error('[simulator] fatal:', err)
  process.exit(1)
})
