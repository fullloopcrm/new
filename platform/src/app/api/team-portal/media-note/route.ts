import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'

// 150MB client-side cap enforced by the recorder UI (Supabase storage receives
// the bytes directly via the signed URL — this route never sees the file body,
// so there's no server-side size check to add here).
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/x-m4v']
const ALLOWED_VIDEO_EXTS = ['mp4', 'mov', 'webm', '3gp', 'm4v']
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp']
const SESSION_TYPES = ['walkthrough', 'before', 'during', 'after', 'issue-flag']

// GET — signed upload URL for a LoopCam video or a still captured mid-recording
// (?kind=video|still). Bypasses Vercel's 4.5MB body limit either way.
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const auth = verifyToken(token)
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const bookingId = req.nextUrl.searchParams.get('booking_id')
    const kind = req.nextUrl.searchParams.get('kind') === 'still' ? 'still' : 'video'
    const filename = req.nextUrl.searchParams.get('filename') || (kind === 'still' ? 'still.jpg' : 'session.webm')
    const contentType = req.nextUrl.searchParams.get('content_type') || (kind === 'still' ? 'image/jpeg' : 'video/webm')

    if (!bookingId) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
    const allowedMimes = kind === 'still' ? ALLOWED_IMAGE_MIMES : ALLOWED_VIDEO_MIMES
    if (!allowedMimes.includes(contentType)) {
      return NextResponse.json(
        { error: kind === 'still' ? 'Still must be JPEG, PNG, or WebP' : 'Video must be MP4, MOV, WebM, M4V, or 3GP' },
        { status: 400 }
      )
    }

    const { data: booking } = (await tenantDb(auth.tid)
      .from('bookings')
      .select('id, team_member_id')
      .eq('id', bookingId)
      .single()) as { data: { team_member_id: string | null } | null }
    if (!booking || booking.team_member_id !== auth.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const allowedExts = kind === 'still' ? ALLOWED_IMAGE_EXTS : ALLOWED_VIDEO_EXTS
    const defaultExt = kind === 'still' ? 'jpg' : 'webm'
    const ext = (filename.split('.').pop() || defaultExt).toLowerCase()
    const safeExt = allowedExts.includes(ext) ? ext : defaultExt
    const path = `${auth.tid}/booking-notes/${bookingId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`

    const { data, error } = await supabaseAdmin.storage.from('uploads').createSignedUploadUrl(path)
    if (error) {
      console.error('[media-note] signed URL error:', error)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)

    return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl: urlData.publicUrl })
  } catch (err) {
    console.error('[media-note] signed URL error:', err)
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }
}

// POST — create the note row once the signed-URL upload has completed. The
// client calls /process on the returned note id next to kick off transcription.
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const auth = verifyToken(token)
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const body = await req.json()
    const { booking_id, video_url, video_storage_path, video_duration_seconds, session_type, stills } = body

    if (!booking_id || !video_url || !video_storage_path) {
      return NextResponse.json({ error: 'booking_id, video_url, and video_storage_path required' }, { status: 400 })
    }
    const sessionType = SESSION_TYPES.includes(session_type) ? session_type : 'walkthrough'

    // images was a plain string[] of URLs for text notes; a video note's stills
    // also carry a video timestamp so the note UI can seek on click. Existing
    // rows keep the old shape — BookingNotes.tsx handles both when reading.
    const images = Array.isArray(stills)
      ? stills
          .filter((s): s is { url: unknown; timestamp_seconds: unknown } => !!s && typeof s === 'object')
          .map((s) => ({ url: String(s.url), timestamp_seconds: Number(s.timestamp_seconds) || 0 }))
      : []

    const db = tenantDb(auth.tid)
    const { data: booking } = (await db
      .from('bookings')
      .select('id, job_id, team_member_id')
      .eq('id', booking_id)
      .single()) as { data: { id: string; job_id: string | null; team_member_id: string | null } | null }
    if (!booking || booking.team_member_id !== auth.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const { data: member } = await db.from('team_members').select('name').eq('id', auth.id).maybeSingle()

    const { data: note, error } = await db
      .from('booking_notes')
      .insert({
        tenant_id: auth.tid,
        booking_id: booking.id,
        job_id: booking.job_id,
        note_type: 'video',
        author_type: 'crew',
        author_name: (member as { name: string } | null)?.name || 'Crew member',
        team_member_id: auth.id,
        video_url,
        video_storage_path,
        // video_duration_seconds is an integer column — the recorder times via
        // Date.now() deltas, which is always a float (e.g. 14.344667s), so it
        // must be rounded or Postgres rejects the insert (22P02).
        video_duration_seconds: typeof video_duration_seconds === 'number' ? Math.round(video_duration_seconds) : null,
        video_session_type: sessionType,
        images,
        processing_status: 'uploaded',
      })
      .select('*')
      .single()

    if (error || !note) {
      console.error('[media-note] insert failed:', error)
      return NextResponse.json({ error: 'Failed to save media note' }, { status: 500 })
    }

    return NextResponse.json({ note })
  } catch (err) {
    console.error('[media-note] create error:', err)
    return NextResponse.json({ error: 'Failed to save media note' }, { status: 500 })
  }
}
