import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { requestClientDeletion, cancelClientDeletion } from '@/lib/gdpr'
import { audit } from '@/lib/audit'

// Operator-triggered right-to-be-forgotten request. Opens a 30-day grace
// window; the client row itself isn't touched until cron/gdpr-purge runs.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('clients.delete')
  if (authError) return authError

  try {
    const { tenantId, userId } = tenant
    const { id } = await params

    const { request: deletionRequest, alreadyPending } = await requestClientDeletion(
      tenantId,
      id,
      'admin',
      userId
    )

    if (!alreadyPending) {
      await audit({
        tenantId,
        action: 'client.deletion_requested',
        entityType: 'client',
        entityId: id,
        userId,
        details: { purge_at: deletionRequest.purge_at },
      })
    }

    return NextResponse.json({ request: deletionRequest, alreadyPending })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

// Cancel a pending deletion request within the grace period.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('clients.delete')
  if (authError) return authError

  try {
    const { tenantId, userId } = tenant
    const { id } = await params

    const { cancelled } = await cancelClientDeletion(tenantId, id)

    if (cancelled) {
      await audit({
        tenantId,
        action: 'client.deletion_cancelled',
        entityType: 'client',
        entityId: id,
        userId,
      })
    }

    return NextResponse.json({ cancelled })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
