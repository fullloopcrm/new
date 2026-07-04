// ---------------------------------------------------------------------------
// SIGNAL detection — turns per-page telemetry into typed, tiered opportunities.
//
// Focus: PROVEN-DEMAND underperformers — pages Google already shows but that
// rank poorly. That's captured demand left on the table, the highest-ROI work.
// (Dark pages with zero impressions are a separate net-new enrichment play.)
//
// Each run recomputes open issues per property (delete-open + re-insert), so
// the queue always reflects current data. Resolved/rejected issues are kept.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import { commercialWeight, type Commercial } from './commercial'

type Rollup = {
  property: string
  page: string
  impressions: number
  clicks: number
  ctr: number
  avg_position: number | null
  best_position: number | null
  has_applicant: string | null
  top_query: string | null
  top_commercial: Commercial | null
}

type Detected = {
  property: string
  tenant_id: string | null
  type: string
  severity: string
  intent: string
  target_url: string
  recipe: string
  tier: number
  status: string
  detail: Record<string, unknown>
}

// Pages ranking at or above this position are WINNERS — frozen from all
// auto-remediation, human-only. Protects #1 sites (nyc-tow, exterminator, roadside).
const PROTECTED_POSITION = 5

// Thresholds — deliberate, tunable. See each branch.
function classify(r: Rollup, tenant_id: string | null): Detected | null {
  const pos = r.avg_position
  if (pos == null) return null
  // WINNER FREEZE (real guard): if the page ranks <= PROTECTED_POSITION for ANY
  // query, it's untouchable — even if its average position looks worse. This is
  // what actually protects a #1 money page that also ranks deep on a long-tail.
  if (r.best_position != null && r.best_position <= PROTECTED_POSITION) return null
  const intent = r.has_applicant ? 'applicant' : 'customer'

  // VALUE = observed demand × buying intent. A transactional query is worth 3x
  // an informational one at equal impressions — so the queue ranks money first.
  const commercial: Commercial = r.top_commercial ?? 'commercial'
  const value = r.impressions * commercialWeight(commercial)
  const severity = value >= 600 ? 'high' : value >= 150 ? 'medium' : 'low'

  const detail = {
    impressions: r.impressions,
    clicks: r.clicks,
    ctr: r.ctr,
    position: pos,
    best_position: r.best_position,
    top_query: r.top_query,
    top_commercial: commercial,
    value,
  }
  const base = { property: r.property, tenant_id, target_url: r.page, intent, detail, status: 'open', severity }

  // Page 2 with real demand → one push from page 1. Highest-leverage.
  if (pos >= 11 && pos <= 20 && r.impressions >= 10) {
    return { ...base, type: 'striking_distance', recipe: 'onpage_push', tier: 1 }
  }
  // Ranking top-10 (but past the winner freeze) yet barely clicked → title/meta.
  if (pos > PROTECTED_POSITION && pos <= 10 && r.ctr < 0.03 && r.impressions >= 20) {
    return { ...base, type: 'low_ctr', recipe: 'title_meta', tier: 1 }
  }
  // Real demand but ranking deep → the page is too thin to compete → enrich.
  if (pos > 20 && r.impressions >= 15) {
    return { ...base, type: 'deep_underperformer', recipe: 'enrich', tier: 2 }
  }
  return null
}

// Supabase caps a single select at 1000 rows — page through the view.
async function fetchRollup(): Promise<Rollup[]> {
  const all: Rollup[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('seo_page_rollup')
      .select('property,page,impressions,clicks,ctr,avg_position,best_position,has_applicant,top_query,top_commercial')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const batch = (data ?? []) as Rollup[]
    all.push(...batch)
    if (batch.length < PAGE) break
  }
  return all
}

export async function detectAllProperties(): Promise<{
  scannedPages: number
  issues: number
  byType: Record<string, number>
}> {
  const [rollup, props] = await Promise.all([
    fetchRollup(),
    supabaseAdmin.from('seo_properties').select('property,tenant_id'),
  ])
  const tenantByProperty = new Map<string, string | null>(
    (props.data ?? []).map((p: { property: string; tenant_id: string | null }) => [p.property, p.tenant_id]),
  )

  const detected: Detected[] = []
  for (const r of rollup) {
    const issue = classify(r, tenantByProperty.get(r.property) ?? null)
    if (issue) detected.push(issue)
  }

  // Refresh open issues per property that has rollup data.
  const properties = [...new Set(rollup.map((r) => r.property))]
  for (const property of properties) {
    await supabaseAdmin.from('seo_issues').delete().eq('property', property).eq('status', 'open')
  }

  const CHUNK = 500
  for (let i = 0; i < detected.length; i += CHUNK) {
    const { error } = await supabaseAdmin.from('seo_issues').insert(detected.slice(i, i + CHUNK))
    if (error) throw new Error(error.message)
  }

  const byType = detected.reduce<Record<string, number>>((acc, d) => {
    acc[d.type] = (acc[d.type] ?? 0) + 1
    return acc
  }, {})

  return { scannedPages: rollup.length, issues: detected.length, byType }
}
