import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { verifyToken } from '../team-portal/auth/token'

// This thread is shared by three very different callers — admin (cookie
// session), the client portal (cookie session), and the team/cleaner portal
// (Bearer token, no cookie at all — see team-portal/auth/token.ts). Resolve
// whichever one the request actually is instead of assuming admin/client.
// A team-portal caller additionally gets its identity fixed server-side
// (author_type/team_member_id can't be spoofed via the request body) and is
// restricted to bookings assigned to them.
type NotesAuth =
  | { kind: 'tenant'; tenantId: string }
  | { kind: 'team'; tenantId: string; teamMemberId: string }

async function resolveAuth(request: Request): Promise<NotesAuth | NextResponse> {
  // A Bearer token is an explicit team-portal identity claim — honor it first.
  // Checking cookies first would be wrong here: an admin impersonating a
  // tenant while also testing/using the team portal in the same browser
  // carries both a valid admin cookie AND a team Bearer token on this same
  // request, and the cookie must not silently win — a cleaner's reply would
  // then post as "Admin" instead of them (caught live: verified this exact
  // misattribution before adding this ordering).
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (token) {
    const auth = verifyToken(token)
    if (auth) return { kind: 'team', tenantId: auth.tid, teamMemberId: auth.id }
  }
  try {
    const ctx = await getTenantForRequest()
    return { kind: 'tenant', tenantId: ctx.tenantId }
  } catch (err) {
    if (!(err instanceof AuthError)) throw err
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get('booking_id')
  const jobId = searchParams.get('job_id')
  const clientId = searchParams.get('client_id')
  if (!bookingId && !jobId && !clientId) {
    return NextResponse.json({ error: 'Missing booking_id, job_id, or client_id' }, { status: 400 })
  }

  const auth = await resolveAuth(request)
  if (auth instanceof NextResponse) return auth
  const db = tenantDb(auth.tenantId)

  // A cleaner can only read notes on their own assigned bookings — same
  // ownership boundary team-portal/media-note already enforces for video notes.
  // The client_id rollup (a client's full note history across every booking,
  // for the admin client-profile page) is intentionally admin/client-portal
  // only — a cleaner has no business seeing a client's history beyond their
  // own assigned jobs.
  if (auth.kind === 'team') {
    if (clientId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (bookingId) {
      const { data: owned } = await db.from('bookings').select('team_member_id').eq('id', bookingId).maybeSingle()
      if (!owned || owned.team_member_id !== auth.teamMemberId) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }
    }
  }

  let query = db.from('booking_notes').select('*').order('created_at', { ascending: true })
  if (bookingId) {
    query = query.eq('booking_id', bookingId)
  } else if (jobId) {
    // Job-level notes (no single booking, e.g. a project-wide LoopCam session)
    // are anchored by job_id alone with booking_id null — exclude rows that
    // also belong to a specific booking so the job page doesn't show every
    // per-visit note too, only the project-level ones.
    query = query.eq('job_id', jobId).is('booking_id', null)
  } else {
    // client_id: the full thread across every one of this client's bookings,
    // for the client-profile "copy of the notes" view. booking_notes.client_id
    // isn't reliably backfilled on older rows, so also match via booking_id —
    // whichever way a given row was anchored, this should still find it.
    const { data: clientBookings } = await db.from('bookings').select('id').eq('client_id', clientId as string)
    const bookingIds = (clientBookings || []).map((b: { id: string }) => b.id)
    query = bookingIds.length > 0
      ? query.or(`client_id.eq.${clientId},booking_id.in.(${bookingIds.join(',')})`)
      : query.eq('client_id', clientId as string)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const body = await request.json()
  const { booking_id, job_id, content, author_type, author_name, mentioned_team_member_ids } = body

  if (!booking_id && !job_id) return NextResponse.json({ error: 'Missing booking_id or job_id' }, { status: 400 })
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const auth = await resolveAuth(request)
  if (auth instanceof NextResponse) return auth
  const db = tenantDb(auth.tenantId)

  // booking_id/job_id are caller-supplied FKs — booking_notes has no cross-tenant
  // FK check, so an unvalidated id would let this tenant attach a note to
  // another tenant's booking/job. Verify ownership before insert. A cleaner is
  // further restricted to bookings assigned to them (not just this tenant's).
  let resolvedBookingId: string | null = null
  let resolvedJobId: string | null = null
  if (booking_id) {
    const { data: owned } = await db.from('bookings').select('id, job_id, team_member_id').eq('id', booking_id).maybeSingle()
    if (!owned || (auth.kind === 'team' && owned.team_member_id !== auth.teamMemberId)) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    resolvedBookingId = owned.id as string
    resolvedJobId = (owned.job_id as string | null) ?? null
  } else {
    if (auth.kind === 'team') return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    const { data: owned } = await db.from('jobs').select('id').eq('id', job_id).maybeSingle()
    if (!owned) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    resolvedJobId = owned.id as string
  }

  // mentioned_team_member_ids is caller-supplied — same cross-tenant risk as
  // booking_id above. Drop any id that isn't actually this tenant's rather
  // than trusting the client's picker selection.
  let validMentionIds: string[] = []
  if (auth.kind === 'tenant' && Array.isArray(mentioned_team_member_ids) && mentioned_team_member_ids.length > 0) {
    const { data: owned } = await db
      .from('team_members')
      .select('id')
      .in('id', mentioned_team_member_ids)
    validMentionIds = (owned || []).map((m: { id: string }) => m.id)
  }

  // Identity for a team-portal caller is fixed from the verified token, never
  // the request body — otherwise a cleaner could post as 'admin' or as a
  // different team member.
  let resolvedAuthorType = author_type || 'admin'
  let resolvedAuthorName = author_name || 'Admin'
  let resolvedTeamMemberId: string | null = null
  if (auth.kind === 'team') {
    const { data: member } = await db.from('team_members').select('name').eq('id', auth.teamMemberId).maybeSingle()
    resolvedAuthorType = 'crew'
    resolvedAuthorName = (member as { name: string } | null)?.name || 'Crew member'
    resolvedTeamMemberId = auth.teamMemberId
  }

  const { data, error } = await db
    .from('booking_notes')
    .insert({
      booking_id: resolvedBookingId,
      job_id: resolvedJobId,
      author_type: resolvedAuthorType,
      author_name: resolvedAuthorName,
      team_member_id: resolvedTeamMemberId,
      content: content.trim(),
      mentioned_team_member_ids: validMentionIds,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
