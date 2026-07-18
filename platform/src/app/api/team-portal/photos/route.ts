/**
 * Crew photo capture — field-staff upload from team/checkin, team/checkout.
 * Bearer-token auth (team portal), not the admin `requirePermission` path.
 *
 * POST multipart: file, booking_id, photo_type?, caption? → { photo }
 *
 * Resolves job_id from the booking when it belongs to a multi-day Job;
 * standalone cleaning bookings (job_id NULL) anchor on booking_id alone.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'
import { logJobEvent } from '@/lib/jobs'

const MAX_SIZE = 8 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const PHOTO_TYPES = ['before', 'after', 'progress'] as const

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  try {
    const db = tenantDb(auth.tid)
    const form = await request.formData()
    const file = form.get('file') as File | null
    const bookingId = form.get('booking_id') as string | null
    const rawPhotoType = (form.get('photo_type') as string) || 'progress'
    const photoType = (PHOTO_TYPES as readonly string[]).includes(rawPhotoType) ? rawPhotoType : 'progress'
    const caption = ((form.get('caption') as string) || '').trim() || null
    const lat = form.get('lat') ? Number(form.get('lat')) : null
    const lng = form.get('lng') ? Number(form.get('lng')) : null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!bookingId) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })

    const { data: booking } = await db
      .from('bookings')
      .select('id, job_id, team_member_id')
      .eq('id', bookingId)
      .single()
    if (!booking || booking.team_member_id !== auth.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'jpg'
    const storagePath = `${auth.tid}/job-photos/${bookingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(storagePath)

    const { data: photo, error } = await db
      .from('job_photos')
      .insert({
        tenant_id: auth.tid,
        job_id: booking.job_id,
        booking_id: bookingId,
        url: urlData.publicUrl,
        storage_path: storagePath,
        photo_type: photoType,
        source: 'crew',
        team_member_id: auth.id,
        caption,
        lat,
        lng,
      })
      .select('*')
      .single()
    if (error || !photo) {
      console.error('POST /api/team-portal/photos insert', error)
      return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
    }

    if (booking.job_id) {
      await logJobEvent({
        tenant_id: auth.tid, job_id: booking.job_id, event_type: 'photo_added',
        detail: { photo_id: photo.id, photo_type: photoType, booking_id: bookingId },
      })
    }

    return NextResponse.json({ photo })
  } catch (err) {
    console.error('POST /api/team-portal/photos', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
