import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { requestDeletion, cancelDeletion, GdprDeletionError } from '@/lib/gdpr-deletion'

// Right-to-be-forgotten request for a single client.
// POST   — soft-deletes the client and starts the 30-day grace period.
// DELETE — cancels a pending request within the grace period, restoring the client.

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('clients.delete')
  if (authError) return authError

  try {
    const { id } = await params
    const request = await requestDeletion({ tenantId: tenant.tenantId, clientId: id, requestedBy: tenant.userId })
    return NextResponse.json({ request }, { status: 201 })
  } catch (e) {
    if (e instanceof GdprDeletionError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('clients.delete')
  if (authError) return authError

  try {
    const { id } = await params
    await cancelDeletion({ tenantId: tenant.tenantId, clientId: id })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof GdprDeletionError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
