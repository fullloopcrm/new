/**
 * Job photos — job-site photo documentation (CompanyCam-style), tenant-scoped.
 *
 * GET  → { photos: JobPhoto[] }  — full gallery for the job, newest first
 * POST → uploads one photo (multipart), tags it to the job and optionally a
 *        booking/session. Storage + insert logic lives in lib/job-photos.ts,
 *        shared with the crew and client capture routes.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { saveJobPhoto, JobPhotoError } from '@/lib/job-photos'

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

    const { data: job } = await db.from('jobs').select('id').eq('id', jobId).eq('tenant_id', tenantId).single()
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const photo = await saveJobPhoto({
      tenantId,
      jobId,
      bookingId: (form.get('booking_id') as string) || null,
      file,
      photoType: (form.get('photo_type') as string) || undefined,
      pairId: (form.get('pair_id') as string) || null,
      source: 'crew',
      teamMemberId: (form.get('team_member_id') as string) || null,
      uploadedBy: ((form.get('uploaded_by') as string) || '').trim() || null,
      caption: ((form.get('caption') as string) || '').trim() || null,
      lat: form.get('lat') ? Number(form.get('lat')) : null,
      lng: form.get('lng') ? Number(form.get('lng')) : null,
    })

    return NextResponse.json({ photo })
  } catch (err) {
    if (err instanceof JobPhotoError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/jobs/[id]/photos', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
