import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

// SIGNAL fleet summary — FL-admin scope. Reads the seo_fleet_summary view
// (28-day rollup per property) and returns per-property rows + portfolio totals.
export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const [{ data, error }, { data: issues }, { data: changes }] = await Promise.all([
    supabaseAdmin.from('seo_fleet_summary').select('*').order('impressions', { ascending: false }),
    supabaseAdmin.from('seo_issue_summary').select('*').order('impressions_at_stake', { ascending: false }),
    supabaseAdmin
      .from('seo_changes')
      .select('id,target_url,field,before_value,after_value,rationale')
      .eq('status', 'proposed')
      .order('proposed_at', { ascending: false })
      .limit(200),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group proposed title/meta changes by URL so each proposal is one review card.
  type Field = { id: string; before: string | null; after: string | null }
  const byUrl = new Map<string, { url: string; rationale: string | null; title?: Field; description?: Field }>()
  for (const c of changes ?? []) {
    const row = byUrl.get(c.target_url) ?? { url: c.target_url, rationale: c.rationale }
    const field: Field = { id: c.id, before: c.before_value, after: c.after_value }
    if (c.field === 'title') row.title = field
    else if (c.field === 'meta_description') row.description = field
    row.rationale = row.rationale ?? c.rationale
    byUrl.set(c.target_url, row)
  }
  const proposals = [...byUrl.values()]

  const properties = data ?? []
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

  return NextResponse.json({ properties, totals, issues: issues ?? [], proposals, windowDays: 28 })
}
