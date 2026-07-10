import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

// SIGNAL fleet summary — FL-admin scope. Reads the seo_fleet_summary view
// (28-day rollup per property) and returns per-property rows + portfolio totals.
export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const [
    { data, error },
    { data: issues },
    { data: changes },
    { data: competitors },
    { data: gaps },
    { data: scores },
    { data: notIndexed },
    { data: enrichments },
  ] = await Promise.all([
      supabaseAdmin.from('seo_fleet_summary').select('*').order('impressions', { ascending: false }),
      supabaseAdmin.from('seo_issue_summary').select('*').order('impressions_at_stake', { ascending: false }),
      supabaseAdmin
        .from('seo_changes')  // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
        .select('id,target_url,field,before_value,after_value,rationale')
        .eq('status', 'proposed')
        .order('proposed_at', { ascending: false })
        .limit(200),
      supabaseAdmin
        .from('seo_competitor_summary')
        .select('*')
        .eq('is_directory', false)
        .order('keywords_ahead', { ascending: false })
        .limit(12),
      supabaseAdmin
        .from('seo_issues')  // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
        .select('property,target_url,value,detail')
        .eq('status', 'open')
        .eq('type', 'competitor_gap')
        .order('value', { ascending: false })
        .limit(20),
      supabaseAdmin.from('seo_site_score').select('property,grade,score,at_goal,on_page1,targets'),
      supabaseAdmin
        .from('seo_issues')  // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
        .select('property,target_url,detail')
        .eq('status', 'open')
        .eq('type', 'not_indexed')
        .limit(40),
      supabaseAdmin
        .from('seo_changes')  // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
        .select('id,target_url,after_value,rationale')
        .eq('field', 'enrichment')
        .eq('status', 'proposed')
        .order('proposed_at', { ascending: false })
        .limit(20),
    ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group proposed title/meta changes by URL so each proposal is one review card.
  type Field = { id: string; before: string | null; after: string | null }
  type Grouped = { url: string; rationale: string | null; title?: Field; description?: Field }
  const byUrl = new Map<string, Grouped>()
  for (const c of changes ?? []) {
    const row: Grouped = byUrl.get(c.target_url) ?? { url: c.target_url, rationale: c.rationale }
    const field: Field = { id: c.id, before: c.before_value, after: c.after_value }
    if (c.field === 'title') row.title = field
    else if (c.field === 'meta_description') row.description = field
    row.rationale = row.rationale ?? c.rationale
    byUrl.set(c.target_url, row)
  }
  const proposals = [...byUrl.values()]

  // Merge the money-keyword grade onto each property, then sort worst-first so a
  // human scanning the fleet lands on the sites that need help.
  const scoreByProperty = new Map(
    (scores ?? []).map((s) => [s.property, s]),
  )
  const properties = (data ?? [])
    .map((r) => {
      const s = scoreByProperty.get(r.property)
      return {
        ...r,
        grade: s?.grade ?? null,
        score: s?.score ?? null,
        at_goal: s?.at_goal ?? 0,
        on_page1: s?.on_page1 ?? 0,
        targets: s?.targets ?? 0,
      }
    })
    .sort((a, b) => (a.score ?? 999) - (b.score ?? 999))

  const totals = properties.reduce(
    (t, r) => ({
      impressions: t.impressions + Number(r.impressions || 0),
      clicks: t.clicks + Number(r.clicks || 0),
      applicant_impressions: t.applicant_impressions + Number(r.applicant_impressions || 0),
      applicant_clicks: t.applicant_clicks + Number(r.applicant_clicks || 0),
      queries: t.queries + Number(r.queries || 0),
    }),
    { impressions: 0, clicks: 0, applicant_impressions: 0, applicant_clicks: 0, queries: 0 },
  )

  return NextResponse.json({
    properties,
    totals,
    issues: issues ?? [],
    proposals,
    competitors: competitors ?? [],
    competitorGaps: gaps ?? [],
    notIndexed: notIndexed ?? [],
    enrichments: enrichments ?? [],
    windowDays: 28,
  })
}
