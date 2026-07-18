/**
 * Job photos — job-site photo documentation (CompanyCam-style), tenant-scoped.
 *
 * GET  → { photos: JobPhoto[] }  — full gallery for the job, newest first
 * POST → uploads one photo (multipart), tags it to the job and optionally a
 *        booking/session, and logs a job_events row so it shows in the
 *        existing Activity timeline for free.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { logJobEvent } from '@/lib/jobs'

const MAX_SIZE = 8 * 1024 * 1024 // 8MB — job-site photos run larger than avatar/document uploads
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const PHOTO_TYPES = ['before', 'after', 'progress'] as const

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.view')
    if (authError) return authError
    const { tenantId } = tenant
    const { id } = await params
    const db = tenantDb(tenantId)

    const { data: photos, error } = await db
      .from('job_photos')
      .select('*')
      .eq('job_id', id)
      .order('taken_at', { ascending: false })
    if (error) throw error

    return NextResponse.json({ photos: photos ?? [] })
  } catch (err) {
    console.error('GET /api/jobs/[id]/photos', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { id: jobId } = await params
    const db = tenantDb(tenantId)

    const form = await request.formData()
    const file = form.get('file') as File | null
    const bookingId = (form.get('booking_id') as string) || null
    const rawPhotoType = (form.get('photo_type') as string) || 'progress'
    const photoType = (PHOTO_TYPES as readonly string[]).includes(rawPhotoType) ? rawPhotoType : 'progress'
    const pairId = (form.get('pair_id') as string) || null
    const caption = ((form.get('caption') as string) || '').trim() || null
    const uploadedBy = ((form.get('uploaded_by') as string) || '').trim() || null
    const teamMemberId = (form.get('team_member_id') as string) || null
    const lat = form.get('lat') ? Number(form.get('lat')) : null
    const lng = form.get('lng') ? Number(form.get('lng')) : null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })

    // Confirm the job belongs to this tenant before writing anything under it.
    const { data: job } = await db.from('jobs').select('id').eq('id', jobId).eq('tenant_id', tenantId).single()
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'jpg'
    const storagePath = `${tenantId}/job-photos/${jobId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(storagePath)

    const { data: photo, error } = await db
      .from('job_photos')
      .insert({
        tenant_id: tenantId,
        job_id: jobId,
        booking_id: bookingId,
        url: urlData.publicUrl,
        storage_path: storagePath,
        photo_type: photoType,
        pair_id: pairId,
        source: 'crew',
        team_member_id: teamMemberId,
        uploaded_by: uploadedBy,
        caption,
        lat,
        lng,
      })
      .select('*')
      .single()
    if (error || !photo) {
      console.error('POST /api/jobs/[id]/photos insert', error)
      return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
    }

    await logJobEvent({
      tenant_id: tenantId,
      job_id: jobId,
      event_type: 'photo_added',
      detail: { photo_id: photo.id, photo_type: photoType, uploaded_by: uploadedBy },
    })

    return NextResponse.json({ photo })
  } catch (err) {
    console.error('POST /api/jobs/[id]/photos', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
