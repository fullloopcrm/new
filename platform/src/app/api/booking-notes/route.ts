import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get('booking_id')
  const jobId = searchParams.get('job_id')
  if (!bookingId && !jobId) return NextResponse.json({ error: 'Missing booking_id or job_id' }, { status: 400 })

  let ctx
  try {
    ctx = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

  // Job-level notes (no single booking, e.g. a project-wide LoopCam session)
  // are anchored by job_id alone with booking_id null — query on job_id and
  // exclude rows that also belong to a specific booking so the job page
  // doesn't show every per-visit note too, only the project-level ones.
  let query = tenantDb(ctx.tenantId).from('booking_notes').select('*').order('created_at', { ascending: true })
  query = bookingId ? query.eq('booking_id', bookingId) : query.eq('job_id', jobId).is('booking_id', null)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const body = await request.json()
  const { booking_id, job_id, content, author_type, author_name, mentioned_team_member_ids } = body

  if (!booking_id && !job_id) return NextResponse.json({ error: 'Missing booking_id or job_id' }, { status: 400 })
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  let ctx
  try {
    ctx = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

  // booking_id/job_id are caller-supplied FKs — booking_notes has no cross-tenant
  // FK check, so an unvalidated id would let this tenant attach a note to
  // another tenant's booking/job. Verify ownership before insert.
  let resolvedBookingId: string | null = null
  let resolvedJobId: string | null = null
  if (booking_id) {
    const { data: owned } = await tenantDb(ctx.tenantId).from('bookings').select('id, job_id').eq('id', booking_id).maybeSingle()
    if (!owned) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    resolvedBookingId = owned.id as string
    resolvedJobId = (owned.job_id as string | null) ?? null
  } else {
    const { data: owned } = await tenantDb(ctx.tenantId).from('jobs').select('id').eq('id', job_id).maybeSingle()
    if (!owned) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    resolvedJobId = owned.id as string
  }

  // mentioned_team_member_ids is caller-supplied — same cross-tenant risk as
  // booking_id above. Drop any id that isn't actually this tenant's rather
  // than trusting the client's picker selection.
  let validMentionIds: string[] = []
  if (Array.isArray(mentioned_team_member_ids) && mentioned_team_member_ids.length > 0) {
    const { data: owned } = await tenantDb(ctx.tenantId)
      .from('team_members')
      .select('id')
      .in('id', mentioned_team_member_ids)
    validMentionIds = (owned || []).map((m: { id: string }) => m.id)
  }

  const { data, error } = await tenantDb(ctx.tenantId)
    .from('booking_notes')
    .insert({
      booking_id: resolvedBookingId,
      job_id: resolvedJobId,
      author_type: author_type || 'admin',
      author_name: author_name || 'Admin',
      content: content.trim(),
      mentioned_team_member_ids: validMentionIds,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
