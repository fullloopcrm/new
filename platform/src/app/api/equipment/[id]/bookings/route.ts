/**
 * Equipment bookings — the per-job rental record for one physical equipment
 * unit: which job/quote, what date range, what was charged. Drives both
 * billing and availability (is this specific unit free on this date).
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'

type Params = { params: Promise<{ id: string }> }

const COLUMNS = 'id, equipment_id, job_id, quote_id, start_date, end_date, status, rate_cents, notes, created_at'
const ACTIVE_STATUSES = ['scheduled', 'out']

export async function GET(_request: Request, { params }: Params) {
  const { tenant, error: authError } = await requirePermission('bookings.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const { data, error } = await tenantDb(tenantId)
      .from('equipment_bookings')
      .select(COLUMNS)
      .eq('equipment_id', id)
      .order('start_date', { ascending: false })
    if (error) throw error
    return NextResponse.json({ bookings: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/equipment/[id]/bookings', err)
    return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: Params) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const startDate = body.start_date as string | undefined
    if (!startDate) return NextResponse.json({ error: 'start_date is required' }, { status: 400 })
    const endDate = (body.end_date as string) || null
    const jobId = (body.job_id as string) || null
    const quoteId = (body.quote_id as string) || null

    // job_id/quote_id are plain uuid PKs with no per-tenant namespace and no
    // cross-tenant FK constraint at the DB level -- verify each belongs to
    // this tenant before tying an equipment booking to it (same class of
    // gap already fixed on job-expenses/quote-budgets: no active read-leak
    // through this route today, but nothing stops a future job-detail view
    // from joining equipment_bookings by job_id and rendering a
    // cross-tenant row it never should have matched).
    if (jobId) {
      const { data: job } = await tenantDb(tenantId).from('jobs').select('id').eq('id', jobId).maybeSingle()
      if (!job) return NextResponse.json({ error: 'Invalid job_id' }, { status: 400 })
    }
    if (quoteId) {
      const { data: quote } = await tenantDb(tenantId).from('quotes').select('id').eq('id', quoteId).maybeSingle()
      if (!quote) return NextResponse.json({ error: 'Invalid quote_id' }, { status: 400 })
    }

    // Prevent double-booking the same physical unit for an overlapping
    // window -- an open-ended booking (no end_date) blocks anything after
    // its start; a dated one blocks any overlap with [start_date, end_date].
    const { data: existing } = await tenantDb(tenantId)
      .from('equipment_bookings')
      .select('id, start_date, end_date')
      .eq('equipment_id', id)
      .in('status', ACTIVE_STATUSES)
    const conflict = (existing || []).some((b) => {
      const bEnd = b.end_date || '9999-12-31'
      const newEnd = endDate || '9999-12-31'
      return startDate <= bEnd && b.start_date <= newEnd
    })
    if (conflict) return NextResponse.json({ error: 'This equipment is already booked for an overlapping date range' }, { status: 409 })

    const { data, error } = await tenantDb(tenantId)
      .from('equipment_bookings')
      .insert({
        equipment_id: id,
        job_id: jobId,
        quote_id: quoteId,
        start_date: startDate,
        end_date: endDate,
        status: (body.status as string) || 'scheduled',
        rate_cents: Number(body.rate_cents) || 0,
        notes: (body.notes as string) || null,
      })
      .select(COLUMNS)
      .single()
    if (error) throw error

    await tenantDb(tenantId).from('equipment').update({ status: 'out' }).eq('id', id).eq('status', 'available')

    return NextResponse.json({ booking: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/equipment/[id]/bookings', err)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const bookingId = body.id as string | undefined
    if (!bookingId) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const patch: Record<string, unknown> = {}
    if ('end_date' in body) patch.end_date = (body.end_date as string) || null
    if ('status' in body) patch.status = body.status as string
    if ('rate_cents' in body) patch.rate_cents = Number(body.rate_cents) || 0
    if ('notes' in body) patch.notes = (body.notes as string) || null

    const { data, error } = await tenantDb(tenantId)
      .from('equipment_bookings')
      .update(patch)
      .eq('id', bookingId)
      .eq('equipment_id', id)
      .select(COLUMNS)
      .single()
    if (error) throw error

    // Returned/cancelled and no other active booking -> unit is available again.
    if (patch.status === 'returned' || patch.status === 'cancelled') {
      const { count } = await tenantDb(tenantId)
        .from('equipment_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('equipment_id', id)
        .in('status', ACTIVE_STATUSES)
      if (!count) await tenantDb(tenantId).from('equipment').update({ status: 'available' }).eq('id', id).eq('status', 'out')
    }

    return NextResponse.json({ booking: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/equipment/[id]/bookings', err)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}
