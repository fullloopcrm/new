import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

// SIGNAL fleet summary — FL-admin scope. Reads the seo_fleet_summary view
// (28-day rollup per property) and returns per-property rows + portfolio totals.
export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const [{ data, error }, { data: issues }] = await Promise.all([
    supabaseAdmin.from('seo_fleet_summary').select('*').order('impressions', { ascending: false }),
    supabaseAdmin.from('seo_issue_summary').select('*').order('impressions_at_stake', { ascending: false }),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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

  return NextResponse.json({ properties, totals, issues: issues ?? [], windowDays: 28 })
}
