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
      .select('id, client_id, title')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (jErr || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    // bookings.start_time AND end_time are both NOT NULL. Default a 2-hour
    // session when the caller doesn't give an explicit end.
    const start = new Date(body.start_time)
    const end = body.end_time ? new Date(body.end_time) : new Date(start.getTime() + 2 * 60 * 60 * 1000)

    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .insert({
        tenant_id: tenantId,
        client_id: job.client_id,
        job_id: id,
        // bookings.service_type is NOT NULL — label the session from the job.
        service_type: job.title || 'Job session',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'confirmed',
        notes: body.notes || 'Job session',
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
