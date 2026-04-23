/**
 * Parallel tenant stress test. Spawns N tenants at once, each running
 * the full provision flow. Looks for race conditions (slug collisions,
 * duplicate service rows, partial failures) and measures latency.
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
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const INDUSTRIES = ['cleaning','landscaping','hvac','plumbing','handyman','pest','electrical','general'] as const
const TIERS = ['starter','growth','pro','enterprise'] as const
const COUNT = parseInt(process.argv[2] || '20', 10)

type Result = { idx: number; ok: boolean; tenantId?: string; industry: string; tier: string; ms: number; err?: string }

async function provision(idx: number): Promise<Result> {
  const t0 = Date.now()
  const industry = INDUSTRIES[idx % INDUSTRIES.length]
  const tier = TIERS[idx % TIERS.length]
  const runId = `s${idx}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`
  const businessName = `Stress ${idx} ${runId}`

  try {
    const { TIER_PRICES } = await import('../src/lib/tier-prices')
    const p = TIER_PRICES[tier]
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48) + '-' + runId.slice(0,6)
    const email = `jeff+${runId}@thenycmaid.com`

    const { data: tenant, error: tErr } = await supabase.from('tenants').insert({
      name: businessName, slug, industry,
      email, owner_email: email,
      status: 'active', plan: tier,
      monthly_rate: Math.round(p.monthly_cents/100),
      setup_fee: Math.round(p.setup_cents/100),
      setup_fee_paid_at: new Date().toISOString(),
      billing_status: 'active',
    }).select('id').single()
    if (tErr || !tenant) throw new Error(`tenant: ${tErr?.message}`)

    await supabase.from('entities').insert({ tenant_id: tenant.id, name: businessName, is_default: true, active: true })
    const { provisionTenant } = await import('../src/lib/provision-tenant')
    await provisionTenant({ tenantId: tenant.id, industry: industry as 'cleaning' | 'plumbing' | 'hvac' | 'landscaping' | 'handyman' | 'pest' | 'electrical' | 'general' })

    // Verify no duplicate service rows (race condition check)
    const { data: services } = await supabase.from('service_types').select('id, name').eq('tenant_id', tenant.id)
    const names = new Set((services || []).map(s => s.name))
    if (services && services.length !== names.size) throw new Error(`duplicate services: ${services.length} rows, ${names.size} unique`)

    return { idx, ok: true, tenantId: tenant.id, industry, tier, ms: Date.now() - t0 }
  } catch (err) {
    return { idx, ok: false, industry, tier, ms: Date.now() - t0, err: err instanceof Error ? err.message : String(err) }
  }
}

async function cleanup(tenantIds: string[]) {
  if (tenantIds.length === 0) return
  // Batch cascade cleanup
  await supabase.from('service_types').delete().in('tenant_id', tenantIds)
  await supabase.from('entities').delete().in('tenant_id', tenantIds)
  await supabase.from('tenants').delete().in('id', tenantIds)
}

async function main() {
  console.log(`\n=== stress: ${COUNT} parallel tenants ===\n`)
  const start = Date.now()
  const results = await Promise.all(Array.from({ length: COUNT }, (_, i) => provision(i)))
  const totalMs = Date.now() - start

  const okay = results.filter(r => r.ok)
  const failed = results.filter(r => !r.ok)

  const latencies = okay.map(r => r.ms).sort((a,b) => a-b)
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0

  console.log(`succeeded: ${okay.length}/${COUNT}  total wall: ${totalMs}ms  p50=${p50}ms p95=${p95}ms p99=${p99}ms`)

  if (failed.length > 0) {
    console.log(`\nfailures:`)
    failed.forEach(r => console.log(`  [${r.idx}] ${r.industry}/${r.tier}: ${r.err}`))
  }

  // Verify no slug collisions — a side-effect of the slug generator
  const tenantIds = okay.map(r => r.tenantId!).filter(Boolean)
  const { data: allSlugs } = await supabase.from('tenants').select('slug').in('id', tenantIds)
  const slugs = (allSlugs || []).map(t => t.slug)
  const uniqueSlugs = new Set(slugs)
  console.log(`\nslug collision check: ${slugs.length} tenants, ${uniqueSlugs.size} unique slugs — ${slugs.length === uniqueSlugs.size ? '✓' : '✗ COLLISION'}`)

  // Cleanup
  console.log('\ncleaning up…')
  await cleanup(tenantIds)
  console.log('  purged')

  process.exit(failed.length > 0 || slugs.length !== uniqueSlugs.size ? 1 : 0)
}

main().catch(e => { console.error('[fatal]', e); process.exit(1) })
