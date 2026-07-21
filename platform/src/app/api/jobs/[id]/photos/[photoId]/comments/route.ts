/**
 * Comments on a single job photo. Reuses crm_notes (subject_type = 'job_photo')
 * as the thread instead of a parallel comments table.
 *
 * crm_notes has no tenant_id column — isolation is enforced here by confirming
 * the photo belongs to a job owned by the requesting tenant before any read
 * or write, same pattern as the parent photos route.
 *
 * GET  → { comments: [...] }
 * POST → { body: string } → { comment }
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

type Params = { params: Promise<{ id: string; photoId: string }> }

async function assertPhotoInTenant(tenantId: string, jobId: string, photoId: string) {
  const db = tenantDb(tenantId)
  const { data } = await db
    .from('job_photos')
    .select('id')
    .eq('id', photoId)
    .eq('job_id', jobId)
    .eq('tenant_id', tenantId)
    .single()
  return !!data
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.view')
    if (authError) return authError
    const { id: jobId, photoId } = await params

    if (!(await assertPhotoInTenant(tenant.tenantId, jobId, photoId))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from('crm_notes')
      .select('*')
      .eq('subject_type', 'job_photo')
      .eq('subject_id', photoId)
      .order('created_at', { ascending: true })
    if (error) throw error

    return NextResponse.json({ comments: data ?? [] })
  } catch (err) {
    console.error('GET /api/jobs/[id]/photos/[photoId]/comments', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.edit')
    if (authError) return authError
    const { id: jobId, photoId } = await params

    if (!(await assertPhotoInTenant(tenant.tenantId, jobId, photoId))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { body, author } = await request.json().catch(() => ({}))
    const text = typeof body === 'string' ? body.trim() : ''
    if (!text) return NextResponse.json({ error: 'Comment text required' }, { status: 400 })

    const { data: comment, error } = await supabaseAdmin
      .from('crm_notes')
      .insert({
        subject_type: 'job_photo',
        subject_id: photoId,
        body: text,
        author: typeof author === 'string' && author.trim() ? author.trim() : 'admin',
      })
      .select('*')
      .single()
    if (error) throw error

    return NextResponse.json({ comment })
  } catch (err) {
    console.error('POST /api/jobs/[id]/photos/[photoId]/comments', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
