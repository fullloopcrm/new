/**
 * Stage an upload into a reviewable import batch — NO write to live tables.
 * POST { kind: 'clients'|'schedules', rows: object[], filename?, mapping? }
 *   → { batchId, review }
 */
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { stageClientBatch, stageScheduleBatch, getBatchReview } from '@/lib/import-staging'

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('clients.create')
  if (authError) return authError
  const { tenantId } = tenant

  try {
    const body = (await request.json().catch(() => ({}))) as {
      kind?: string; rows?: Array<Record<string, unknown>>; filename?: string; mapping?: unknown
    }
    const rows = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) return NextResponse.json({ error: 'No rows to stage' }, { status: 400 })
    if (rows.length > 5000) return NextResponse.json({ error: 'Maximum 5,000 rows per import.' }, { status: 400 })

    let batchId: string
    if (body.kind === 'schedules') {
      batchId = await stageScheduleBatch(tenantId, rows, { filename: body.filename, mapping: body.mapping })
    } else if (body.kind === 'clients') {
      batchId = await stageClientBatch(tenantId, rows, { filename: body.filename, mapping: body.mapping })
    } else {
      return NextResponse.json({ error: 'kind must be clients or schedules' }, { status: 400 })
    }

    const review = await getBatchReview(batchId)
    return NextResponse.json({ batchId, review })
  } catch (e) {
    console.error('POST /api/dashboard/import/stage', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Stage failed' }, { status: 500 })
  }
}
