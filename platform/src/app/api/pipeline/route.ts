/**
 * Pipeline snapshot — all open + recently closed deals grouped by stage
 * + forecast + stage totals. One request feeds the Kanban view.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { PIPELINE_STAGES, computeForecast, computeStageTotals } from '@/lib/pipeline'
import { tenantDb } from '@/lib/tenant-db'
import { formatJobNumber } from '@/lib/format'

export async function GET(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const db = tenantDb(tenantId)
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

    // Job numbers for sold deals — the deal's most-recently-converted quote
    // points at the booking it created; look up job_seq + the client's
    // customer_number to build the same NYCMAID-007-02 format the Bookings
    // view uses. Scoped to 'sold' deals only, so this stays a couple of
    // small batched queries, not N+1 per deal.
    const soldDealIds = (deals || []).filter(d => (d.stage as string) === 'sold').map(d => d.id as string)
    const jobNumberByDeal = new Map<string, string>()
    if (soldDealIds.length > 0) {
      const { data: convertedQuotes } = await db
        .from('quotes')
        .select('deal_id, converted_booking_id, created_at')
        .in('deal_id', soldDealIds)
        .not('converted_booking_id', 'is', null)
        .order('created_at', { ascending: false })
      const bookingIdByDeal = new Map<string, string>()
      for (const q of (convertedQuotes || []) as { deal_id: string | null; converted_booking_id: string | null }[]) {
        // Belt-and-suspenders: don't rely solely on the `.not(...is null)` filter
        // reaching the database — guard client-side too.
        if (q.deal_id && q.converted_booking_id && !bookingIdByDeal.has(q.deal_id)) {
          bookingIdByDeal.set(q.deal_id, q.converted_booking_id)
        }
      }
      const bookingIds = Array.from(new Set(bookingIdByDeal.values()))
      if (bookingIds.length > 0) {
        const { data: bookingRows } = await db
          .from('bookings')
          .select('id, job_seq, clients(customer_number)')
          .in('id', bookingIds)
        const jobInfoByBooking = new Map<string, { job_seq: number; customer_number: number }>()
        for (const b of (bookingRows || []) as { id: string; job_seq: number | null; clients: { customer_number: number | null } | null }[]) {
          if (b.job_seq != null && b.clients?.customer_number != null) {
            jobInfoByBooking.set(b.id, { job_seq: b.job_seq, customer_number: b.clients.customer_number })
          }
        }
        for (const [dealId, bookingId] of bookingIdByDeal.entries()) {
          const info = jobInfoByBooking.get(bookingId)
          if (info) jobNumberByDeal.set(dealId, formatJobNumber(_authTenant.tenant.slug, info.customer_number, info.job_seq))
        }
      }
    }
    for (const d of deals || []) {
      const jobNumber = jobNumberByDeal.get(d.id as string)
      if (jobNumber) (d as Record<string, unknown>).job_number = jobNumber
    }

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
    // Pinned deals sort to the top of their column; Array#sort is stable so
    // the existing stage_changed_at-desc order is preserved within each group.
    for (const key of Object.keys(byStage)) {
      byStage[key] = [...byStage[key]].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
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
