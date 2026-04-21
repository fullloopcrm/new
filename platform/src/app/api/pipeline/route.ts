/**
 * Pipeline snapshot — all open + recently closed deals grouped by stage
 * + forecast + stage totals. One request feeds the Kanban view.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { PIPELINE_STAGES, computeForecast, computeStageTotals } from '@/lib/pipeline'

export async function GET(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const url = new URL(request.url)
    const includeClosed = url.searchParams.get('include_closed') !== '0'
    const monthsAhead = Math.min(12, Number(url.searchParams.get('months')) || 6)

    const { data: deals, error } = await supabaseAdmin
      .from('deals')
      .select('*, clients(id, name, email, phone)')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('stage_changed_at', { ascending: false, nullsFirst: false })
      .limit(500)
    if (error) throw error

    const stageKeys = PIPELINE_STAGES.map(s => s.value)
    const byStage: Record<string, typeof deals> = {}
    for (const s of stageKeys) byStage[s] = []
    for (const d of deals || []) {
      const stage = (d.stage as string) || 'lead'
      if (stageKeys.includes(stage as (typeof PIPELINE_STAGES)[number]['value'])) {
        byStage[stage].push(d)
      } else {
        byStage['lead'].push(d) // normalize unknown stages
      }
    }

    const stageTotalsMap = computeStageTotals(deals || [])
    const stageTotals = PIPELINE_STAGES.map(s => ({
      stage: s.value,
      label: s.label,
      count: stageTotalsMap.get(s.value)?.count || 0,
      totalCents: stageTotalsMap.get(s.value)?.totalCents || 0,
      weightedCents: stageTotalsMap.get(s.value)?.weightedCents || 0,
    }))

    const forecast = includeClosed ? computeForecast(deals || [], monthsAhead) : []

    // Overdue follow-ups
    const now = new Date()
    const overdue = (deals || []).filter(d => {
      const f = d.follow_up_at as string | null
      return f && new Date(f) < now
    })

    return NextResponse.json({
      byStage,
      stageTotals,
      forecast,
      overdueFollowUps: overdue.length,
      total: deals?.length || 0,
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/pipeline', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
