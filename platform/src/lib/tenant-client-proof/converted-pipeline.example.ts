/**
 * PROOF OF CONVERSION — pipeline — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/pipeline/route.ts  (GET: open/closed deals grouped by stage + forecast)
 *
 * What this route adds: a single scoped read (`deals` + embedded `clients` join) feeding
 * PURE downstream helpers (computeStageTotals / computeForecast) and inline stage grouping.
 * The conversion touches ONLY the db line — swap the import; `const db = tenantClient(tenantId)`
 * in place of `supabaseAdmin`. The pure helpers and grouping are unchanged. The base
 * `.eq('tenant_id', tenantId)` (plus `.eq('status','active')`) is KEPT verbatim.
 *
 * ⚠ CROSS-TABLE RLS DEPENDENCY: the select embeds `clients(...)`. Under RLS the embed is
 * resolved with the same authenticated token, so `clients` must ALSO carry a tenant policy
 * before this route is converted for real — `clients` is a core tenant table already slated
 * for the Tier list, so this dependency is expected to be satisfied early.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 *
 * Takes `tenantId` + parsed options directly — auth resolution (`getTenantForRequest`) and
 * URL parsing are unchanged by the conversion.
 */
import { tenantClient } from '../tenant-client'
import { PIPELINE_STAGES, computeForecast, computeStageTotals, type DealForForecast } from '../pipeline'

/** The row shape used here: forecast fields + the grouping/overdue fields. */
type PipelineDeal = DealForForecast & {
  follow_up_at?: string | null
  [k: string]: unknown
}

export interface PipelineOptions {
  includeClosed: boolean
  /** Already clamped by the caller (live route: Math.min(12, n || 6)). */
  monthsAhead: number
  /** Injectable clock for deterministic overdue tests; defaults to now. */
  now?: Date
}

/** Converted read path of GET /api/pipeline (scoped read + join + pure helpers). */
export async function pipelineConverted(tenantId: string, opts: PipelineOptions) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — the deals read is now scoped
  const { data: deals, error } = await db
    .from('deals')
    .select('*, clients(id, name, email, phone)')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('stage_changed_at', { ascending: false, nullsFirst: false })
    .limit(500)
  if (error) throw error

  const rows = (deals || []) as PipelineDeal[]
  const stageKeys = PIPELINE_STAGES.map((s) => s.value)
  const byStage: Record<string, PipelineDeal[]> = {}
  for (const s of stageKeys) byStage[s] = []
  for (const d of rows) {
    const stage = (d.stage as string) || 'lead'
    if ((stageKeys as string[]).includes(stage)) {
      byStage[stage].push(d)
    } else {
      // ⚠ FAITHFULLY MIRRORED LATENT BUG (pre-exists the conversion, unaffected by it):
      // the live route falls back to byStage['lead'], but 'lead' is NOT a PIPELINE_STAGES
      // value (`new|qualifying|quoted|pending|sold|lost`), so byStage['lead'] is undefined
      // and this line throws on any deal with an unknown/NULL stage. Kept identical so the
      // proof reflects the real route; flagged for a separate fix (see W5 report).
      byStage['lead'].push(d) // normalize unknown stages — see bug note above
    }
  }

  const stageTotalsMap = computeStageTotals(rows)
  const stageTotals = PIPELINE_STAGES.map((s) => ({
    stage: s.value,
    label: s.label,
    count: stageTotalsMap.get(s.value)?.count || 0,
    totalCents: stageTotalsMap.get(s.value)?.totalCents || 0,
    weightedCents: stageTotalsMap.get(s.value)?.weightedCents || 0,
  }))

  const forecast = opts.includeClosed ? computeForecast(rows, opts.monthsAhead) : []

  const now = opts.now ?? new Date()
  const overdue = rows.filter((d) => {
    const f = d.follow_up_at as string | null
    return f && new Date(f) < now
  })

  return {
    byStage,
    stageTotals,
    forecast,
    overdueFollowUps: overdue.length,
    total: rows.length,
  }
}
