import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

// Office-side counterpart to /api/team-portal/media-note — same booking_notes
// video-note shape, but for an admin picking an existing file from the
// dashboard (a client-texted video, e.g.) instead of live in-browser
// recording. Dashboard session auth instead of a team-portal bearer token.
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/x-m4v']
const ALLOWED_VIDEO_EXTS = ['mp4', 'mov', 'webm', '3gp', 'm4v']
const SESSION_TYPES = ['walkthrough', 'before', 'during', 'after', 'issue-flag']

export async function GET(req: NextRequest) {
  let ctx
  try {
    ctx = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

  const bookingId = req.nextUrl.searchParams.get('booking_id')
  const jobId = req.nextUrl.searchParams.get('job_id')
  const filename = req.nextUrl.searchParams.get('filename') || 'video.mp4'
  const contentType = req.nextUrl.searchParams.get('content_type') || 'video/mp4'
  if (!bookingId && !jobId) return NextResponse.json({ error: 'Missing booking_id or job_id' }, { status: 400 })
  if (!ALLOWED_VIDEO_MIMES.includes(contentType)) {
    return NextResponse.json({ error: 'Video must be MP4, MOV, WebM, M4V, or 3GP' }, { status: 400 })
  }

  const scope = bookingId ? { table: 'bookings' as const, id: bookingId } : { table: 'jobs' as const, id: jobId as string }
  const { data: owned } = await tenantDb(ctx.tenantId).from(scope.table).select('id').eq('id', scope.id).maybeSingle()
  if (!owned) return NextResponse.json({ error: `${scope.table === 'bookings' ? 'Booking' : 'Job'} not found` }, { status: 404 })

  const ext = (filename.split('.').pop() || 'mp4').toLowerCase()
  const safeExt = ALLOWED_VIDEO_EXTS.includes(ext) ? ext : 'mp4'
  const storageScope = bookingId || `job-${jobId}`
  const path = `${ctx.tenantId}/booking-notes/${storageScope}/video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`

  const { data, error } = await supabaseAdmin.storage.from('uploads').createSignedUploadUrl(path)
  if (error) return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)

  return NextResponse.json({ signedUrl: data.signedUrl, path, publicUrl: urlData.publicUrl })
}

export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

  const body = await req.json()
  const { booking_id, job_id, video_url, video_storage_path, video_duration_seconds, session_type } = body
  if (!booking_id && !job_id) return NextResponse.json({ error: 'Missing booking_id or job_id' }, { status: 400 })
  if (!video_url || !video_storage_path) return NextResponse.json({ error: 'video_url and video_storage_path required' }, { status: 400 })
  const sessionType = SESSION_TYPES.includes(session_type) ? session_type : 'walkthrough'

  const db = tenantDb(ctx.tenantId)
  let resolvedJobId: string | null = null
  if (booking_id) {
    const { data: owned } = await db.from('bookings').select('id, job_id').eq('id', booking_id).maybeSingle()
    if (!owned) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    resolvedJobId = (owned.job_id as string | null) ?? null
  } else {
    const { data: owned } = await db.from('jobs').select('id').eq('id', job_id).maybeSingle()
    if (!owned) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    resolvedJobId = owned.id as string
  }

  const { data: note, error } = await db
    .from('booking_notes')
    .insert({
      tenant_id: ctx.tenantId,
      booking_id: booking_id || null,
      job_id: resolvedJobId,
      note_type: 'video',
      author_type: 'admin',
      author_name: 'Admin',
      video_url,
      video_storage_path,
      // Integer column — browser-reported video.duration is always a float.
      video_duration_seconds: typeof video_duration_seconds === 'number' ? Math.round(video_duration_seconds) : null,
      video_session_type: sessionType,
      processing_status: 'uploaded',
    })
    .select('*')
    .single()

  if (error || !note) return NextResponse.json({ error: 'Failed to save media note' }, { status: 500 })
  return NextResponse.json({ note })
}
