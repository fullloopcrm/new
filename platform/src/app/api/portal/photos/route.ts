/**
 * Client-submitted job photos. Client must own the booking (portal auth).
 * Lands in the same job_photos gallery as crew photos, flagged source='client',
 * and pushes the tenant's admins so it doesn't sit unseen. Storage + insert
 * logic lives in lib/job-photos.ts, shared with the office and crew routes.
 *
 * POST multipart: file, booking_id, caption? → { photo }
 */
import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../auth/token'
import { sendPushToTenantAdmins } from '@/lib/push'
import { saveJobPhoto, JobPhotoError } from '@/lib/job-photos'

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  try {
    const db = tenantDb(auth.tid)
    const form = await request.formData()
    const file = form.get('file') as File | null
    const bookingId = form.get('booking_id') as string | null
    const caption = ((form.get('caption') as string) || '').trim() || null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!bookingId) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

    const { data: booking } = await db
      .from('bookings')
      .select('id, job_id, client_id')
      .eq('id', bookingId)
      .single()
    if (!booking || booking.client_id !== auth.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const photo = await saveJobPhoto({
      tenantId: auth.tid,
      jobId: booking.job_id,
      bookingId,
      file,
      photoType: 'progress',
      source: 'client',
      uploadedBy: 'Homeowner',
      caption,
    })

    await sendPushToTenantAdmins(auth.tid, 'New photo from client', caption || 'A client added a job photo', `/dashboard/jobs/${booking.job_id || ''}`)

    return NextResponse.json({ photo })
  } catch (err) {
    if (err instanceof JobPhotoError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/portal/photos', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
