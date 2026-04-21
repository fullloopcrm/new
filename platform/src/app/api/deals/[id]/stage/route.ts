/**
 * Move a deal to a new stage. Logs a stage_change activity.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { PIPELINE_STAGES, stageMeta } from '@/lib/pipeline'

type Params = { params: Promise<{ id: string }> }

const VALID = new Set(PIPELINE_STAGES.map(s => s.value))

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = await request.json()
    const to = String(body.stage || '')
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
    if (to === 'won' || to === 'lost') updates.closed_at = new Date().toISOString()
    if (to === 'won') updates.probability = 100
    if (to === 'lost') updates.probability = 0
    if (!(to === 'won' || to === 'lost')) {
      const currentProb = Number(existing.probability) || 0
      const wasDefaultProb = PIPELINE_STAGES.some(s => s.defaultProbability === currentProb)
      if (wasDefaultProb) updates.probability = newMeta.defaultProbability
    }

    const { data: updated, error } = await supabaseAdmin
      .from('deals')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*, clients(id, name, email, phone)')
      .single()
    if (error) throw error

    await supabaseAdmin.from('deal_activities').insert({
      tenant_id: tenantId,
      deal_id: id,
      type: 'stage_change',
      description: `Moved from ${existing.stage || 'lead'} to ${to}`,
      metadata: { from: existing.stage, to, value_cents: existing.value_cents },
    })

    return NextResponse.json({ deal: updated })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/deals/[id]/stage', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
