/**
 * Pre-signed upload URL for crew-captured job-site videos (team/checkin,
 * team/checkout). Mirrors /api/team-portal/video-upload's GET — bypasses
 * the ~4.5MB Vercel serverless body limit a multipart POST would hit.
 *
 * GET ?booking_id&filename&content_type → { signedUrl, token, path, publicUrl }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../../auth/token'
import { VIDEO_MIMES } from '@/lib/job-video'

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const auth = verifyToken(token)
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const bookingId = req.nextUrl.searchParams.get('booking_id')
    const filename = req.nextUrl.searchParams.get('filename') || 'video.mp4'
    const contentType = req.nextUrl.searchParams.get('content_type') || 'video/mp4'
    if (!bookingId) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
    if (!VIDEO_MIMES.includes(contentType)) {
      return NextResponse.json({ error: 'Video must be MP4, MOV, WebM, M4V, or 3GP' }, { status: 400 })
    }

    const db = tenantDb(auth.tid)
    const { data: booking } = await db
      .from('bookings')
      .select('id, team_member_id')
      .eq('id', bookingId)
      .single()
    if (!booking || booking.team_member_id !== auth.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const rawExt = (filename.split('.').pop() || 'mp4').toLowerCase()
    const ext = ['mp4', 'mov', 'webm', '3gp', 'm4v'].includes(rawExt) ? rawExt : 'mp4'
    const path = `${auth.tid}/job-photos/${bookingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await supabaseAdmin.storage.from('uploads').createSignedUploadUrl(path)
    if (error || !data) {
      console.error('GET /api/team-portal/photos/signed-url', error)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)

    return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl: urlData.publicUrl })
  } catch (err) {
    console.error('GET /api/team-portal/photos/signed-url', err)
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }
}
