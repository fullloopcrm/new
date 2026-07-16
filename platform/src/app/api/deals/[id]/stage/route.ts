/**
 * Move a deal to a new stage. Logs a stage_change activity.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { PIPELINE_STAGES, stageMeta } from '@/lib/pipeline'

type Params = { params: Promise<{ id: string }> }

const VALID = new Set(PIPELINE_STAGES.map(s => s.value))

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const body = await request.json()
    const to = String(body.stage || '')
    const lostReason = typeof body.lost_reason === 'string' ? body.lost_reason.trim() : ''
    if (!VALID.has(to as (typeof PIPELINE_STAGES)[number]['value'])) {
      return NextResponse.json({ error: `Invalid stage: ${to}` }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('deals')
      .select('stage, title, value_cents, probability')
      .eq('tenant_id', tenantId)
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

    // Atomic claim: only the request whose UPDATE actually flips `stage`
    // away from `to` may log the stage_change activity or kick off
    // 'sold'-triggered job creation. The `existing.stage === to` check above
    // reads the prior stage via a SEPARATE SELECT, so it only catches a
    // SEQUENTIAL re-POST — two truly concurrent POSTs moving the same deal
    // to the same stage (double-click "Mark Sold" on the pipeline card, a
    // kanban drag firing twice) both read the prior stage before either
    // write landed and both concluded "this is a real move," each inserting
    // a duplicate stage_change activity and attempting convertSaleToJob
    // (itself already race-safe on its own quote claim, but redundant and
    // noisy otherwise). `neq('stage', to)` in the WHERE clause means only
    // the request that actually flips the row can match it; the race
    // loser's UPDATE matches 0 rows and is treated the same as the
    // already-unchanged case. Mirrors the atomic-claim fix already applied
    // to jobs/bookings status transitions this session.
    const { data: updated, error } = await supabaseAdmin
      .from('deals')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .neq('stage', to)
      .select('*, clients(id, name, email, phone)')
      .maybeSingle()
    if (error) throw error
    if (!updated) return NextResponse.json({ ok: true, unchanged: true })

    await supabaseAdmin.from('deal_activities').insert({
      tenant_id: tenantId,
      deal_id: id,
      type: 'stage_change',
      description: `Moved from ${existing.stage || 'lead'} to ${to}`
        + (to === 'lost' && lostReason ? ` — reason: ${lostReason}` : ''),
      metadata: { from: existing.stage, to, value_cents: existing.value_cents, ...(to === 'lost' && lostReason ? { lost_reason: lostReason } : {}) },
    })

    // Manually closing to SOLD spins up the Job from the deal's proposal (if any,
    // and not already converted) so it can be scheduled. Idempotent + best-effort.
    if (to === 'sold') {
      try {
        const { data: q } = await supabaseAdmin
          .from('quotes')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('deal_id', id)
          .is('converted_job_id', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (q) {
          const { convertSaleToJob } = await import('@/lib/jobs')
          await convertSaleToJob(tenantId, { type: 'quote', quoteId: q.id }, {})
        }
      } catch (jobErr) {
        console.warn('job creation on manual sold failed', jobErr)
      }
    }

    return NextResponse.json({ deal: updated })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/deals/[id]/stage', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
