/**
 * Generate (idempotently) the public share token for a job's photo timeline.
 * Office side, tenant-scoped.
 *
 * POST → { token, path }  (path = /photos/[token], caller prefixes the host)
 */
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { id: jobId } = await params
    const db = tenantDb(tenantId)

    const { data: job } = await db.from('jobs').select('id, public_token').eq('id', jobId).eq('tenant_id', tenantId).single()
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    if (job.public_token) return NextResponse.json({ token: job.public_token, path: `/photos/${job.public_token}` })

    const token = crypto.randomBytes(16).toString('hex')
    const { error } = await db.from('jobs').update({ public_token: token }).eq('id', jobId)
    if (error) return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })

    return NextResponse.json({ token, path: `/photos/${token}` })
  } catch (err) {
    console.error('POST /api/jobs/[id]/share', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
