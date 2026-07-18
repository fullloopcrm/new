/**
 * Crew photo capture — field-staff upload from team/checkin, team/checkout.
 * Bearer-token auth (team portal), not the admin `requirePermission` path.
 * Storage + insert logic lives in lib/job-photos.ts, shared with the office
 * and client capture routes.
 *
 * POST multipart: file, booking_id, photo_type?, caption? → { photo }
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'
import { saveJobPhoto, JobPhotoError } from '@/lib/job-photos'

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
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!bookingId) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

    const { data: booking } = await db
      .from('bookings')
      .select('id, job_id, team_member_id')
      .eq('id', bookingId)
      .single()
    if (!booking || booking.team_member_id !== auth.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const photo = await saveJobPhoto({
      tenantId: auth.tid,
      jobId: booking.job_id,
      bookingId,
      file,
      photoType: (form.get('photo_type') as string) || undefined,
      source: 'crew',
      teamMemberId: auth.id,
      caption: ((form.get('caption') as string) || '').trim() || null,
      lat: form.get('lat') ? Number(form.get('lat')) : null,
      lng: form.get('lng') ? Number(form.get('lng')) : null,
    })

    return NextResponse.json({ photo })
  } catch (err) {
    if (err instanceof JobPhotoError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/team-portal/photos', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
