/**
 * Client-submitted job photos. Client must own the booking (portal auth).
 * Lands in the same job_photos gallery as crew photos, flagged source='client',
 * and pushes the tenant's admins so it doesn't sit unseen.
 *
 * POST multipart: file, booking_id, caption? → { photo }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../auth/token'
import { sendPushToTenantAdmins } from '@/lib/push'

const MAX_SIZE = 8 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

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
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })

    const { data: booking } = await db
      .from('bookings')
      .select('id, job_id, client_id')
      .eq('id', bookingId)
      .single()
    if (!booking || booking.client_id !== auth.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'jpg'
    const storagePath = `${auth.tid}/job-photos/${bookingId}/client-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

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
        photo_type: 'progress',
        source: 'client',
        uploaded_by: 'Homeowner',
        caption,
      })
      .select('*')
      .single()
    if (error || !photo) {
      console.error('POST /api/portal/photos insert', error)
      return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
    }

    await sendPushToTenantAdmins(auth.tid, 'New photo from client', caption || 'A client added a job photo', `/dashboard/jobs/${booking.job_id || ''}`)

    return NextResponse.json({ photo })
  } catch (err) {
    console.error('POST /api/portal/photos', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
