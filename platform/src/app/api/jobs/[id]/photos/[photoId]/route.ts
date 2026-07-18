/**
 * Update a single job photo: tags, before/after pairing, caption.
 * Tenant-scoped, office-only (requirePermission).
 *
 * PATCH { tags?: string[], pair_id?: string | null, caption?: string } → { photo }
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

type Params = { params: Promise<{ id: string; photoId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { id: jobId, photoId } = await params
    const db = tenantDb(tenantId)

    const body = (await request.json().catch(() => ({}))) as {
      tags?: string[]
      pair_id?: string | null
      caption?: string
    }

    const patch: Record<string, unknown> = {}
    if (Array.isArray(body.tags)) {
      patch.tags = body.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 20)
    }
    if (body.pair_id !== undefined) patch.pair_id = body.pair_id
    if (body.caption !== undefined) patch.caption = body.caption.trim() || null

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data: photo, error } = await db
      .from('job_photos')
      .update(patch)
      .eq('id', photoId)
      .eq('job_id', jobId)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()
    if (error || !photo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Mutual link: pairing A -> B also stamps B -> A so either side finds its pair.
    if (body.pair_id) {
      await db.from('job_photos').update({ pair_id: photoId }).eq('id', body.pair_id).eq('tenant_id', tenantId)
    }

    return NextResponse.json({ photo })
  } catch (err) {
    console.error('PATCH /api/jobs/[id]/photos/[photoId]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
