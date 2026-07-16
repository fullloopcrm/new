// ---------------------------------------------------------------------------
// seomgr — reporting: FullLoop admin first, then each tenant.
//
// Three delivery surfaces, reusing existing platform infrastructure rather
// than inventing new ones:
//   1. Email + in-platform admin notification — via the existing notify()
//      helper (same path daily_ops_recap already uses). One call per tenant,
//      recipientType:'admin', channel:'email'.
//   2. Tenant admin communications — a row in tenant_owner_messages
//      (sender_role:'jefe'), so it shows in that tenant's own
//      /dashboard/messages inbox alongside every other admin<->owner thread.
//   3. FL admin Telegram — NOT new: seo-health and seo-volatility already
//      post to the Jefe/"Full Loop CRM" group via alertOwner(). This digest
//      is the summary; those two are the real-time alerts. Not duplicated
//      here to avoid spamming the same channel twice for the same data.
//
// FL-admin-first / tenant-second ordering: the fleet-wide digest (all
// tenants combined) is generated and sent under the platform's own tenant
// (full-loop-crm) BEFORE the per-tenant loop runs.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'

const PERIOD_DAYS = 7

export type DigestStats = {
  properties: number
  newIssues: Record<string, number>
  proposed: number
  applied: number
  rejected: number
  rolledBack: number
  sitesDown: number
}

async function statsFor(tenantId: string | null): Promise<DigestStats> {
  const since = new Date(Date.now() - PERIOD_DAYS * 86_400_000).toISOString()

  let propsQuery = supabaseAdmin.from('seo_properties').select('property', { count: 'exact', head: true })
  if (tenantId) propsQuery = propsQuery.eq('tenant_id', tenantId)
  const { count: properties } = await propsQuery

  let issuesQuery = supabaseAdmin.from('seo_issues').select('type').gte('detected_at', since)
  if (tenantId) issuesQuery = issuesQuery.eq('tenant_id', tenantId)
  const { data: issueRows } = await issuesQuery

  const newIssues: Record<string, number> = {}
  for (const r of (issueRows ?? []) as Array<{ type: string }>) {
    newIssues[r.type] = (newIssues[r.type] || 0) + 1
  }

  const changeCount = async (status: string, dateCol: string): Promise<number> => {
    let q = supabaseAdmin.from('seo_changes').select('status', { count: 'exact', head: true }).eq('status', status).gte(dateCol, since)
    if (tenantId) q = q.eq('tenant_id', tenantId)
    const { count } = await q
    return count ?? 0
  }

  const proposed = await changeCount('proposed', 'proposed_at')
  const applied = await changeCount('applied', 'applied_at')
  const rejected = await changeCount('rejected', 'proposed_at')
  const rolledBack = await changeCount('rolled_back', 'verified_at')

  let downQuery = supabaseAdmin
    .from('seo_issues')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open')
    .eq('type', 'site_down')
  if (tenantId) downQuery = downQuery.eq('tenant_id', tenantId)
  const { count: sitesDown } = await downQuery

  return {
    properties: properties ?? 0,
    newIssues,
    proposed: proposed ?? 0,
    applied: applied ?? 0,
    rejected: rejected ?? 0,
    rolledBack: rolledBack ?? 0,
    sitesDown: sitesDown ?? 0,
  }
}

export type KeywordRow = { query: string; position: number; clicks: number; impressions: number }
export type MetricRow = { query: string; clicks: number; impressions: number; position: number }

// Below this, a query's position is noise, not a real ranking signal — a
// query with 2-3 impressions over a week can show a wild, meaningless
// position. Jeff's call (2026-07-16): 25, not 10 — and a query that never
// clears this bar isn't just "no data," it's a sign that page/keyword needs
// real work (thin content, wrong targeting), so it's reported as its own
// count, not silently dropped.
const MIN_IMPRESSIONS_TO_COUNT = 25

/** Pure aggregation: raw seo_metrics rows -> one row per query, best position first. */
export function aggregateKeywords(rows: MetricRow[]): KeywordRow[] {
  const byQuery = new Map<string, { clicks: number; impressions: number; weightedPos: number }>()
  for (const r of rows) {
    const cur = byQuery.get(r.query) ?? { clicks: 0, impressions: 0, weightedPos: 0 }
    cur.clicks += r.clicks || 0
    cur.impressions += r.impressions || 0
    cur.weightedPos += (r.position || 0) * (r.impressions || 0)
    byQuery.set(r.query, cur)
  }

  return [...byQuery.entries()]
    .map(([query, v]) => ({
      query,
      clicks: v.clicks,
      impressions: v.impressions,
      position: v.impressions > 0 ? Math.round((v.weightedPos / v.impressions) * 10) / 10 : 0,
    }))
    .sort((a, b) => a.position - b.position)
}

/** Split into real (>= MIN_IMPRESSIONS_TO_COUNT) vs. too-thin-to-mean-anything. */
export function splitByVolume(keywords: KeywordRow[]): { real: KeywordRow[]; needsWork: KeywordRow[] } {
  return {
    real: keywords.filter((k) => k.impressions >= MIN_IMPRESSIONS_TO_COUNT),
    needsWork: keywords.filter((k) => k.impressions < MIN_IMPRESSIONS_TO_COUNT),
  }
}

/**
 * Every tracked query for a property over the period — not just the ones
 * that crossed an issue threshold. Sorted best position first ("low and
 * high", per Jeff 2026-07-16: the digest was only ever surfacing issue
 * counts, never the underlying keyword-level rankings seomgr actually
 * tracks in seo_metrics). Split at MIN_IMPRESSIONS_TO_COUNT — under that,
 * position is noise, and the query itself is a "needs work" signal.
 */
async function keywordBreakdown(
  property: string,
  currentSince: string,
  previousSince: string,
): Promise<{ real: KeywordRow[]; needsWork: number; winners: Mover[]; losers: Mover[] }> {
  const [currentRows, previousRows] = await Promise.all([
    fetchMetrics(property, currentSince),
    fetchMetrics(property, previousSince, currentSince),
  ])

  const current = aggregateKeywords(currentRows)
  const previous = aggregateKeywords(previousRows)
  const { real, needsWork } = splitByVolume(current)
  const { winners, losers } = computeMovers(current, previous)
  return { real, needsWork: needsWork.length, winners, losers }
}

export type Mover = { query: string; current: number; previous: number; delta: number }

/**
 * Biggest winners/losers: current vs. previous period, same query, both
 * sides real (>= MIN_IMPRESSIONS_TO_COUNT) so a swing isn't just volume
 * noise. delta = current - previous; negative = improved (lower position is
 * better), positive = declined.
 */
export function computeMovers(current: KeywordRow[], previous: KeywordRow[], topN = 5): { winners: Mover[]; losers: Mover[] } {
  const prevReal = new Map(splitByVolume(previous).real.map((k) => [k.query, k.position]))
  const moves: Mover[] = []
  for (const k of splitByVolume(current).real) {
    const prevPos = prevReal.get(k.query)
    if (prevPos == null) continue // new this period — nothing to compare against
    moves.push({ query: k.query, current: k.position, previous: prevPos, delta: Math.round((k.position - prevPos) * 10) / 10 })
  }
  const winners = moves.filter((m) => m.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, topN)
  const losers = moves.filter((m) => m.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, topN)
  return { winners, losers }
}

async function fetchMetrics(property: string, sinceDate: string, untilDate?: string): Promise<MetricRow[]> {
  let q = supabaseAdmin
    .from('seo_metrics')
    .select('query,clicks,impressions,position')
    .eq('property', property)
    .neq('query', '')
    .gte('date', sinceDate)
    .limit(20000)
  if (untilDate) q = q.lt('date', untilDate)
  const { data } = await q
  return (data ?? []) as MetricRow[]
}

export function formatDigest(stats: DigestStats, label: string): string {
  const lines = [`seomgr weekly report — ${label}`, '']
  lines.push(`Properties monitored: ${stats.properties}`)
  const issueTypes = Object.entries(stats.newIssues)
  if (issueTypes.length) {
    lines.push('', 'New issues this week:')
    for (const [type, count] of issueTypes) lines.push(`  • ${type}: ${count}`)
  }
  lines.push(
    '',
    `Proposals drafted: ${stats.proposed}`,
    `Autopilot applied: ${stats.applied} | rejected: ${stats.rejected} | reverted: ${stats.rolledBack}`,
  )
  if (stats.sitesDown > 0) lines.push('', `⚠️ ${stats.sitesDown} site(s) currently down — see Telegram alert.`)
  return lines.join('\n')
}

async function sendTenantMessage(tenantId: string, body: string): Promise<void> {
  await supabaseAdmin.from('tenant_owner_messages').insert({
    tenant_id: tenantId,
    direction: 'outbound',
    channel: 'platform',
    body,
    sender: 'seomgr',
    sender_role: 'jefe',
  })
}

export type DigestRunResult = {
  admin: { sent: boolean; error?: string }
  tenants: Array<{ tenant_id: string; slug: string; sent: boolean; error?: string }>
}

/**
 * FL admin first, then every tenant. Each tenant call goes through notify()
 * (email + in-platform admin notification, same path daily_ops_recap uses)
 * AND a tenant_owner_messages row (shows in that tenant's own message inbox).
 */
export async function sendSeoDigests(): Promise<DigestRunResult> {
  const { data: adminTenant } = await supabaseAdmin.from('tenants').select('id').eq('slug', 'full-loop-crm').maybeSingle()
  const result: DigestRunResult = { admin: { sent: false }, tenants: [] }

  const since = new Date(Date.now() - PERIOD_DAYS * 86_400_000).toISOString().slice(0, 10)
  const previousSince = new Date(Date.now() - 2 * PERIOD_DAYS * 86_400_000).toISOString().slice(0, 10)

  if (adminTenant?.id) {
    const fleetStats = await statsFor(null)
    const body = formatDigest(fleetStats, 'fleet-wide')
    const res = await notify({
      tenantId: adminTenant.id,
      type: 'seo_digest',
      title: 'seomgr weekly fleet report',
      message: body,
      channel: 'email',
      recipientType: 'admin',
      metadata: {
        label: 'fleet-wide',
        propertiesMonitored: fleetStats.properties,
        newIssues: Object.entries(fleetStats.newIssues).map(([type, count]) => ({ type, count })),
        proposed: fleetStats.proposed,
        applied: fleetStats.applied,
        rejected: fleetStats.rejected,
        rolledBack: fleetStats.rolledBack,
        sitesDown: fleetStats.sitesDown,
        // Fleet-wide keyword-by-keyword across every property would be
        // thousands of rows in one email — out of scope for the admin
        // executive rollup. Per-tenant reports below carry the full list.
        keywords: [],
        needsWork: 0,
        winners: [],
        losers: [],
      },
    })
    result.admin = { sent: res.success, error: res.error }
  }

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, slug')
    .eq('status', 'active')
    .neq('slug', 'full-loop-crm')
    .neq('slug', 'nycmaid') // excluded on Jeff's call (2026-07-16) — mid-cutover, no owner_email set

  for (const t of (tenants ?? []) as Array<{ id: string; slug: string }>) {
    try {
      const stats = await statsFor(t.id)
      if (stats.properties === 0) continue // not onboarded into seomgr yet — nothing to report
      const body = formatDigest(stats, t.slug)

      const { data: prop } = await supabaseAdmin.from('seo_properties').select('property').eq('tenant_id', t.id).limit(1).maybeSingle()
      const kw = prop?.property
        ? await keywordBreakdown(prop.property, since, previousSince)
        : { real: [], needsWork: 0, winners: [], losers: [] }

      const res = await notify({
        tenantId: t.id,
        type: 'seo_digest',
        title: 'Your weekly SEO report',
        message: body,
        channel: 'email',
        recipientType: 'admin',
        metadata: {
          label: t.slug,
          propertiesMonitored: stats.properties,
          newIssues: Object.entries(stats.newIssues).map(([type, count]) => ({ type, count })),
          proposed: stats.proposed,
          applied: stats.applied,
          rejected: stats.rejected,
          rolledBack: stats.rolledBack,
          sitesDown: stats.sitesDown,
          keywords: kw.real,
          needsWork: kw.needsWork,
          winners: kw.winners,
          losers: kw.losers,
        },
      })
      await sendTenantMessage(t.id, body)
      result.tenants.push({ tenant_id: t.id, slug: t.slug, sent: res.success, error: res.error })
    } catch (e) {
      result.tenants.push({ tenant_id: t.id, slug: t.slug, sent: false, error: e instanceof Error ? e.message : String(e) })
    }
  }

  return result
}
