/**
 * Pre-signed upload URL for job-site videos, admin/office side. Mirrors
 * /api/lead-media/signed-url and /api/team-portal/video-upload's GET so the
 * dashboard can PUT video straight to Supabase storage — a multipart POST
 * through the serverless function would hit the ~4.5MB Vercel body cap.
 *
 * POST { filename, contentType } → { signedUrl, token, path, publicUrl }
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { VIDEO_MIMES } from '@/lib/job-video'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { id: jobId } = await params
    const db = tenantDb(tenantId)

    const { data: job } = await db.from('jobs').select('id').eq('id', jobId).eq('tenant_id', tenantId).single()
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const { filename, contentType } = await request.json().catch(() => ({}))
    if (!contentType || !VIDEO_MIMES.includes(contentType)) {
      return NextResponse.json({ error: 'Video must be MP4, MOV, WebM, M4V, or 3GP' }, { status: 400 })
    }

    const rawExt = (String(filename || '').split('.').pop() || 'mp4').toLowerCase()
    const ext = ['mp4', 'mov', 'webm', '3gp', 'm4v'].includes(rawExt) ? rawExt : 'mp4'
    const path = `${tenantId}/job-photos/${jobId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await supabaseAdmin.storage.from('uploads').createSignedUploadUrl(path)
    if (error || !data) {
      console.error('POST /api/jobs/[id]/photos/signed-url', error)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)

    return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl: urlData.publicUrl })
  } catch (err) {
    console.error('POST /api/jobs/[id]/photos/signed-url', err)
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }
}
