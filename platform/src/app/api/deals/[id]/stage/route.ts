/**
 * Move a deal to a new stage. Logs a stage_change activity.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { PIPELINE_STAGES, stageMeta } from '@/lib/pipeline'
import { trackError } from '@/lib/error-tracking'

type Params = { params: Promise<{ id: string }> }

const VALID = new Set(PIPELINE_STAGES.map(s => s.value))

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const db = tenantDb(tenantId)
    const { id } = await params
    const body = await request.json()
    const to = String(body.stage || '')
    const lostReason = typeof body.lost_reason === 'string' ? body.lost_reason.trim() : ''
    if (!VALID.has(to as (typeof PIPELINE_STAGES)[number]['value'])) {
      return NextResponse.json({ error: `Invalid stage: ${to}` }, { status: 400 })
    }

    const { data: existing } = await db
      .from('deals')
      .select('stage, title, value_cents, probability')
      .eq('id', id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.stage === to) return NextResponse.json({ ok: true, unchanged: true })

    // Auto-update probability when moving to a new stage if user hasn't
    // set a custom one (probability === stage default → treat as default)
    const newMeta = stageMeta(to)
    const updates: Record<string, unknown> = { stage: to }
    if (to === 'sold' || to === 'lost') updates.closed_at = new Date().toISOString()
    if (to === 'sold') updates.probability = 100
    if (to === 'lost') {
      updates.probability = 0
      updates.lost_reason = lostReason || null
    } else {
      // Re-opening a previously-lost deal clears the reason.
      updates.lost_reason = null
    }
    if (!(to === 'sold' || to === 'lost')) {
      const currentProb = Number(existing.probability) || 0
      const wasDefaultProb = PIPELINE_STAGES.some(s => s.defaultProbability === currentProb)
      if (wasDefaultProb) updates.probability = newMeta.defaultProbability
    }

    const { data: updated, error } = await db
      .from('deals')
      .update(updates)
      .eq('id', id)
      .select('*, clients(id, name, email, phone)')
      .single()
    if (error) throw error

    await db.from('deal_activities').insert({
      deal_id: id,
      type: 'stage_change',
      description: `Moved from ${existing.stage || 'lead'} to ${to}`
        + (to === 'lost' && lostReason ? ` — reason: ${lostReason}` : ''),
      metadata: { from: existing.stage, to, value_cents: existing.value_cents, ...(to === 'lost' && lostReason ? { lost_reason: lostReason } : {}) },
    })

    // Manually closing to SOLD spins up the right fulfillment (booking /
    // recurring series / Job) from the deal's proposal (if any, and not
    // already converted) so it can be scheduled. Idempotent + best-effort.
    // `converted_at` (not `converted_job_id`) is the shared not-yet-converted
    // marker across all three conversion paths — see closeSoldQuote's docstring.
    if (to === 'sold') {
      try {
        const { data: q } = await db
          .from('quotes')
          .select('id')
          .eq('deal_id', id)
          .is('converted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (q) {
          const { closeSoldQuote } = await import('@/lib/jobs')
          await closeSoldQuote(tenantId, q.id)
        }
      } catch (jobErr) {
        // lss-06 live-audit gap (2026-07-31): closeSoldQuote (and everything
        // it calls — createJobFromQuote/createBookingFromQuote/
        // createRecurringSeriesFromQuote) throws unless the quote's own
        // status is already 'accepted'. This manual "mark sold" action is
        // NOT gated on that — an operator can mark a deal sold over the
        // phone/in person before the customer ever formally accepts the
        // public quote link, which is exactly the trigger this checkpoint's
        // own historical bug came from (a manually-closed $365 quote sat
        // unscheduled for 11+ days with zero alert). Before this fix,
        // console.warn was the only signal — a silent-failure gap of the
        // same shape as the original bug, just one layer deeper (wrong
        // quote status instead of wrong fulfillment type). The deal still
        // closes to 'sold' either way (this is best-effort fulfillment
        // dispatch, not something that should block the stage change) —
        // but now it actually alerts instead of repeating the same story.
        console.warn('job creation on manual sold failed', jobErr)
        await trackError(jobErr, { source: 'api/deals/stage:close-sold-quote', severity: 'high', tenantId }).catch(() => {})
      }
    }

    return NextResponse.json({ deal: updated })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/deals/[id]/stage', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
