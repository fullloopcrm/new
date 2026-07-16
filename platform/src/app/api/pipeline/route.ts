/**
 * Pipeline snapshot — all open + recently closed deals grouped by stage
 * + forecast + stage totals. One request feeds the Kanban view.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { PIPELINE_STAGES, computeForecast, computeStageTotals } from '@/lib/pipeline'
import { tenantDb } from '@/lib/tenant-db'

export async function GET(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('sales.view')
    if (authError) return authError
    const db = tenantDb(tenant.tenantId)
    const url = new URL(request.url)
    const includeClosed = url.searchParams.get('include_closed') !== '0'
    const monthsAhead = Math.min(12, Number(url.searchParams.get('months')) || 6)

    const { data: deals, error } = await db
      .from('deals')
      .select('*, clients(id, name, email, phone)')
      .eq('status', 'active')
      .order('stage_changed_at', { ascending: false, nullsFirst: false })
      .limit(500)
    if (error) throw error

    const stageKeys = PIPELINE_STAGES.map(s => s.value)
    // First canonical stage (label "Lead") is the fallback bucket: orphan deals
    // whose stage is null/empty or non-canonical land here. Using a real,
    // initialized key avoids a crash on 'lead' (which is NOT a PIPELINE_STAGES value).
    const fallbackStage = stageKeys[0]
    const byStage: Record<string, typeof deals> = {}
    for (const s of stageKeys) byStage[s] = []
    for (const d of deals || []) {
      const stage = (d.stage as string) || fallbackStage
      const key = stageKeys.includes(stage as (typeof PIPELINE_STAGES)[number]['value'])
        ? stage
        : fallbackStage // normalize unknown stages
      byStage[key].push(d)
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
