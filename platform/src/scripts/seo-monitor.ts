// SIGNAL — LOCAL monitor. Zero paid-API cost.
//
// Runs the free half of the pipeline from your Mac against the prod DB:
//   1. ingestAllProperties()  — pulls Google Search Console data (GSC API = FREE)
//   2. detectAllProperties()  — DB-side classification into seo_issues (no external call)
//   3. reports the fleet's open opportunities, worst-first
//
// Does NOT touch Serper (competitors) or Anthropic (enrich/remediate) — those cost money.
//
// Run:
//   npx tsx --env-file=.env.local src/scripts/seo-monitor.ts            # fresh pull + detect + report
//   npx tsx --env-file=.env.local src/scripts/seo-monitor.ts --no-ingest # report on existing data only
//   npx tsx --env-file=.env.local src/scripts/seo-monitor.ts --top 40    # show 40 opportunities
import { ingestAllProperties } from '@/lib/seo/ingest'
import { detectAllProperties } from '@/lib/seo/detect'
import { supabaseAdmin } from '@/lib/supabase'

const args = process.argv.slice(2)
const noIngest = args.includes('--no-ingest')
const topN = Number(args[args.indexOf('--top') + 1]) || 25

type Detail = {
  impressions?: number
  clicks?: number
  ctr?: number
  position?: number
  best_position?: number
  top_query?: string
  value?: number
}
type Issue = {
  property: string
  tenant_id: string | null
  type: string
  severity: string
  target_url: string | null
  detail: Detail
}

function n(x: number | undefined, d = 0): string {
  return (x ?? 0).toLocaleString(undefined, { maximumFractionDigits: d })
}

async function main() {
  if (!noIngest) {
    console.log('→ Ingesting fresh GSC data (free)…')
    const ing = await ingestAllProperties({ days: 30 })
    console.log(`  ${ing.properties} properties, ${n(ing.totalRows)} rows\n`)
  } else {
    console.log('→ Skipping ingest (--no-ingest): reporting on existing data.\n')
  }

  console.log('→ Running detection (DB-only, free)…')
  const det = await detectAllProperties()
  console.log(`  ${n(det.issues)} open issues in queue\n`)

  const { data, error } = await supabaseAdmin
    .from('seo_issues')
    .select('property,tenant_id,type,severity,target_url,detail')
    .eq('status', 'open')
  if (error) throw new Error(error.message)
  const issues = (data ?? []) as Issue[]

  // ---- Per-property rollup, worst-first by total value ----
  const byProp = new Map<
    string,
    { linked: boolean; count: number; value: number; types: Map<string, number> }
  >()
  for (const i of issues) {
    const p = byProp.get(i.property) ?? {
      linked: !!i.tenant_id,
      count: 0,
      value: 0,
      types: new Map(),
    }
    p.linked = p.linked || !!i.tenant_id
    p.count += 1
    p.value += i.detail.value ?? 0
    p.types.set(i.type, (p.types.get(i.type) ?? 0) + 1)
    byProp.set(i.property, p)
  }
  const props = [...byProp.entries()].sort((a, b) => b[1].value - a[1].value)

  console.log('════════════════ FLEET — open opportunity by property ════════════════')
  console.log('  value   issues  linked  property                         top types')
  for (const [prop, s] of props) {
    const types = [...s.types.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t, c]) => `${t}:${c}`)
      .join(' ')
    console.log(
      `  ${n(s.value).padStart(6)}  ${String(s.count).padStart(6)}  ${
        s.linked ? '  yes ' : '  NO  '
      }  ${prop.padEnd(32)} ${types}`,
    )
  }

  // ---- Top individual opportunities across the fleet ----
  const ranked = [...issues].sort((a, b) => (b.detail.value ?? 0) - (a.detail.value ?? 0)).slice(0, topN)
  console.log(`\n════════════════ TOP ${topN} OPPORTUNITIES (worst-first by value) ════════════════`)
  for (const i of ranked) {
    const d = i.detail
    console.log(
      `\n  [${i.type}] ${i.property}  ·  value ${n(d.value)}  ·  ${i.severity}`,
    )
    console.log(`    url:   ${i.target_url ?? '(site-level)'}`)
    console.log(
      `    query: "${d.top_query ?? '—'}"  pos ${n(d.position, 1)} (best ${n(
        d.best_position,
        1,
      )})  impr ${n(d.impressions)}  clicks ${n(d.clicks)}  ctr ${n((d.ctr ?? 0) * 100, 1)}%`,
    )
  }
  console.log('\nDone. No paid APIs called.')
  process.exit(0)
}

main().catch((e) => {
  console.error('MONITOR ERROR:', e)
  process.exit(1)
})
