/**
 * READ-ONLY onboarding-readiness audit — the real 99% check for Stage 0.
 *
 * Runs the new canonical profile + funnel-aware readiness engine against every
 * live tenant and prints where each stands. NO WRITES. Reads only tenant config
 * (tenants / entities / service_types) + the existing read-only smoke gate — the
 * same per-tenant reads activation already performs. It does not bulk-read client
 * data.
 *
 * USAGE:  cd platform && npx tsx scripts/audit-onboarding-readiness.ts
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Load env BEFORE importing anything that constructs the supabase client.
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').replace(/\\n$/, '')
  }
}

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const { computeReadiness } = await import('../src/lib/tenant-readiness')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('placeholder')) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }
  const db = createClient(url, key)

  const { data: tenants, error } = await db
    .from('tenants')
    .select('id, name, slug, status')
    .order('created_at', { ascending: true })
  if (error) { console.error('tenant list failed:', error.message); process.exit(1) }

  console.log('='.repeat(88))
  console.log(`ONBOARDING READINESS AUDIT — ${tenants!.length} live tenants (READ-ONLY)`)
  console.log('='.repeat(88))

  const rows: Awaited<ReturnType<typeof computeReadiness>>[] = []
  for (const t of tenants!) {
    try {
      rows.push(await computeReadiness(t.id))
    } catch (e) {
      console.log(`  ! ${t.slug || t.id}: readiness error — ${e instanceof Error ? e.message : e}`)
    }
  }
  const R = rows.filter(Boolean) as NonNullable<(typeof rows)[number]>[]

  // Per-tenant line.
  const pad = (s: string, n: number) => (s + ' '.repeat(n)).slice(0, n)
  console.log('\n' + pad('SLUG', 26) + pad('FUNNEL', 10) + pad('STATUS', 10) + pad('COMPLETE', 10) + pad('LAUNCH?', 9) + 'TOP BLOCKERS')
  console.log('-'.repeat(88))
  for (const r of R) {
    const blockers = r.launchBlockers.slice(0, 3).join(', ') || (r.canLaunch ? '—' : 'spine')
    console.log(
      pad(r.slug || r.tenantId.slice(0, 8), 26) +
      pad(r.funnel, 10) +
      pad(r.status, 10) +
      pad(`${r.completeness.pct}% (${r.completeness.filled}/${r.completeness.applicable})`, 10) +
      pad(r.canLaunch ? 'YES' : 'no', 9) +
      blockers,
    )
  }

  // Aggregates.
  const n = R.length || 1
  const canLaunch = R.filter((r) => r.canLaunch).length
  const avgPct = Math.round(R.reduce((a, r) => a + r.completeness.pct, 0) / n)
  const byFunnel = R.reduce<Record<string, number>>((a, r) => ((a[r.funnel] = (a[r.funnel] || 0) + 1), a), {})

  const blockerFreq = new Map<string, number>()
  for (const r of R) for (const b of r.launchBlockers) blockerFreq.set(b, (blockerFreq.get(b) || 0) + 1)
  const topBlockers = [...blockerFreq.entries()].sort((a, b) => b[1] - a[1])

  // delta 1 evidence: lead_only tenants the OLD gate would have blocked on the
  // schedule/payment/review spine but the funnel-aware readiness clears.
  const leadOnlyRescued = R.filter(
    (r) => r.funnel === 'lead_only' && r.spine.some((s) => !s.applicable && !s.ok),
  ).length

  console.log('\n' + '='.repeat(88))
  console.log('SUMMARY')
  console.log('='.repeat(88))
  console.log(`  Tenants audited        : ${R.length}`)
  console.log(`  Funnel mix             : ${Object.entries(byFunnel).map(([k, v]) => `${v} ${k}`).join(' · ')}`)
  console.log(`  Can launch now         : ${canLaunch}/${R.length}`)
  console.log(`  Avg profile complete   : ${avgPct}%`)
  console.log(`  lead_only rescued by funnel-aware gate (delta 1): ${leadOnlyRescued}`)
  console.log(`\n  Most common launch blockers (empty critical fields):`)
  for (const [label, count] of topBlockers.slice(0, 12)) {
    console.log(`    ${pad(label, 34)} ${count}/${R.length}`)
  }
  console.log('\n  (READ-ONLY audit — no rows written.)')
}

main().catch((e) => { console.error(e); process.exit(1) })
