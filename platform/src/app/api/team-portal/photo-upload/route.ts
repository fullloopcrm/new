import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { verifyToken } from '../auth/token'

// PROPOSED / NOT WIRED — companion code to
// src/lib/migrations/2026_07_16_bookings_photo_proof_columns_PROPOSED.sql.
// This route calls booking_append_checkin_photo / booking_append_checkout_photo,
// RPCs that don't exist until that migration is applied, and references
// bookings.checkin_photos/checkout_photos, columns that don't exist yet
// either. Safe to leave in the tree unwired (no existing UI calls this path),
// mirroring the same file-only convention used for the other PROPOSED
// migrations this session. Do not link this route from any UI until the
// migration has been applied.
//
// Mirrors team-portal/video-upload/route.ts's structure (signed-URL flow +
// legacy small-file FormData flow, storage-prefix validation on the
// client-reported URL) with two differences: (1) photos append to a jsonb
// array (multiple proof-of-work shots per booking) instead of overwriting a
// single *_url column, via an atomic RPC rather than a read-then-write
// update — see the migration file for why. (2) each photo carries its own
// GPS tag, since "proof of work" is only as good as knowing where/when a
// specific shot was actually taken, which can drift over a long job.

const MAX_SIZE = 15 * 1024 * 1024 // 15MB — photos, not the 150MB video cap
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

type PhotoType = 'checkin' | 'checkout'

function isPhotoType(v: unknown): v is PhotoType {
  return v === 'checkin' || v === 'checkout'
}

async function appendPhoto(
  bookingId: string,
  type: PhotoType,
  photo: { url: string; uploaded_at: string; lat: number | null; lng: number | null },
) {
  const fn = type === 'checkin' ? 'booking_append_checkin_photo' : 'booking_append_checkout_photo'
  return supabaseAdmin.rpc(fn, { p_booking_id: bookingId, p_photo: photo })
}

// GET — generate signed upload URL (bypasses Vercel's 4.5MB body limit)
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const auth = verifyToken(token)
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const bookingId = req.nextUrl.searchParams.get('booking_id')
    const type = req.nextUrl.searchParams.get('type')
    const contentType = req.nextUrl.searchParams.get('content_type') || 'image/jpeg'

    if (!bookingId || !isPhotoType(type)) {
      return NextResponse.json({ error: 'booking_id and type (checkin|checkout) required' }, { status: 400 })
    }

    if (!ALLOWED_MIMES.includes(contentType)) {
      return NextResponse.json({ error: 'Photo must be JPEG, PNG, WebP, or HEIC' }, { status: 400 })
    }

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, team_member_id')
      .eq('id', bookingId)
      .eq('tenant_id', auth.tid)
      .single()
    if (!booking || booking.team_member_id !== auth.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const safeExt = EXT_BY_MIME[contentType] || 'jpg'
    const timestamp = Date.now()
    const randomId = randomBytes(6).toString('hex')
    const path = `${auth.tid}/job-photos/${bookingId}/${type}-${timestamp}-${randomId}.${safeExt}`

    const { data, error } = await supabaseAdmin.storage
      .from('uploads')
      .createSignedUploadUrl(path)

    if (error) {
      console.error('Signed URL error:', error)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(path)

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl: urlData.publicUrl,
    })
  } catch (err) {
    console.error('Signed URL error:', err)
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }
}

// POST — save a photo reference after signed-URL upload, or legacy direct upload
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const auth = verifyToken(token)
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const contentType = req.headers.get('content-type') || ''

    // JSON body = signed URL flow (save reference after upload)
    if (contentType.includes('application/json')) {
      const { booking_id, type, url, lat, lng } = await req.json()
      if (!booking_id || !isPhotoType(type) || !url) {
        return NextResponse.json({ error: 'booking_id, type (checkin|checkout), and url required' }, { status: 400 })
      }

      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('id, team_member_id, start_time, service_type, clients(name), team_members!bookings_team_member_id_fkey(name)')
        .eq('id', booking_id)
        .eq('tenant_id', auth.tid)
        .single()
      if (!booking || booking.team_member_id !== auth.id) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }

      // Same class of gap fixed this session on video-upload/reviews/team-apps:
      // don't trust a client-reported URL after an out-of-band signed upload.
      // Require it inside this tenant+booking+type's own storage prefix.
      const { data: prefixUrl } = supabaseAdmin.storage
        .from('uploads')
        .getPublicUrl(`${auth.tid}/job-photos/${booking_id}/${type}-`)
      if (typeof url !== 'string' || !url.startsWith(prefixUrl.publicUrl)) {
        return NextResponse.json({ error: 'Invalid photo URL' }, { status: 400 })
      }

      const photo = {
        url,
        uploaded_at: new Date().toISOString(),
        lat: typeof lat === 'number' ? lat : null,
        lng: typeof lng === 'number' ? lng : null,
      }
      const { error: appendError } = await appendPhoto(booking_id, type, photo)
      if (appendError) {
        console.error('Photo append error:', appendError)
        return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
      }

      const clientName = (booking.clients as unknown as { name: string })?.name || 'Client'
      const teamMemberName = (booking.team_members as unknown as { name: string })?.name || 'Team Member'
      const label = type === 'checkin' ? 'Check-In' : 'Check-Out'
      const jobDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

      await notify({
        tenantId: auth.tid,
        type: type === 'checkin' ? 'check_in' : 'check_out',
        title: `New ${label} Photo`,
        message: `${teamMemberName} uploaded a ${label.toLowerCase()} photo for ${clientName}'s ${booking.service_type || 'job'} on ${jobDate}`,
        bookingId: booking_id,
      }).catch(() => {})

      return NextResponse.json({ success: true, photo })
    }

    // FormData = legacy direct upload (for small files under 4.5MB)
    const formData = await req.formData()
    const file = formData.get('file') as File
    const bookingId = formData.get('booking_id') as string
    const type = formData.get('type') as string
    const lat = formData.get('lat')
    const lng = formData.get('lng')

    if (!file || !bookingId || !isPhotoType(type)) {
      return NextResponse.json({ error: 'file, booking_id, and type (checkin|checkout) required' }, { status: 400 })
    }

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, team_member_id, start_time, service_type, clients(name), team_members!bookings_team_member_id_fkey(name)')
      .eq('id', bookingId)
      .eq('tenant_id', auth.tid)
      .single()

    if (!booking || booking.team_member_id !== auth.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (!ALLOWED_MIMES.includes(file.type)) {
      return NextResponse.json({ error: 'Photo must be JPEG, PNG, WebP, or HEIC' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Photo must be under 15MB' }, { status: 400 })
    }

    const safeExt = EXT_BY_MIME[file.type] || 'jpg'
    const timestamp = Date.now()
    const randomId = randomBytes(6).toString('hex')
    const path = `${auth.tid}/job-photos/${bookingId}/${type}-${timestamp}-${randomId}.${safeExt}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('Photo upload error:', uploadError)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(path)

    const photo = {
      url: urlData.publicUrl,
      uploaded_at: new Date().toISOString(),
      lat: typeof lat === 'string' && lat !== '' ? Number(lat) : null,
      lng: typeof lng === 'string' && lng !== '' ? Number(lng) : null,
    }
    const { error: appendError } = await appendPhoto(bookingId, type, photo)
    if (appendError) {
      console.error('Photo append error:', appendError)
      return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
    }

    const clientName = (booking.clients as unknown as { name: string })?.name || 'Client'
    const teamMemberName = (booking.team_members as unknown as { name: string })?.name || 'Team Member'
    const label = type === 'checkin' ? 'Check-In' : 'Check-Out'
    const jobDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

    await notify({
      tenantId: auth.tid,
      type: type === 'checkin' ? 'check_in' : 'check_out',
      title: `New ${label} Photo`,
      message: `${teamMemberName} uploaded a ${label.toLowerCase()} photo for ${clientName}'s ${booking.service_type || 'job'} on ${jobDate}`,
      bookingId,
    }).catch(() => {})

    return NextResponse.json({ success: true, photo })
  } catch (err) {
    console.error('Photo upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
