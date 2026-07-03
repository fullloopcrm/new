/**
 * Schedule a work session on a job → creates a booking carrying the job_id.
 * A job can have many sessions (the multi-day schedule).
 *
 * POST → { start_time, end_time?, notes? }
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { logJobEvent } from '@/lib/jobs'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as {
      start_time?: string
      end_time?: string | null
      notes?: string | null
    }
    if (!body.start_time) {
      return NextResponse.json({ error: 'start_time required' }, { status: 400 })
    }

    const { data: job, error: jErr } = await supabaseAdmin
      .from('jobs')
      .select('id, client_id, service_address')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (jErr || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .insert({
        tenant_id: tenantId,
        client_id: job.client_id,
        job_id: id,
        start_time: body.start_time,
        end_time: body.end_time ?? null,
        status: 'confirmed',
        notes: body.notes || 'Job session',
        address: job.service_address || null,
      })
      .select('id, start_time, end_time, status')
      .single()
    if (bErr) throw bErr

    await logJobEvent({
      tenant_id: tenantId,
      job_id: id,
      event_type: 'scheduled',
      detail: { booking_id: booking.id, start_time: body.start_time },
    })

    return NextResponse.json({ session: booking })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/jobs/[id]/sessions', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
