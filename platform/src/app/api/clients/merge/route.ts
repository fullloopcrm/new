import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { mergeClients, ClientMergeError } from '@/lib/client-merge'

// Reconciles two already-duplicate client records: moves canonical_id's
// booking/payment/communication history off of duplicate_id and onto it,
// then soft-retires duplicate_id (clients.active=false — never a hard
// delete). See src/lib/client-merge.ts for the full design rationale.
//
// Gated on clients.delete (not clients.edit) -- like GDPR deletion, this is a
// consolidating/irreversible-in-effect action on a client record, not a
// routine field edit.
export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('clients.delete')
  if (authError) return authError

  try {
    const body = await request.json().catch(() => ({}))
    const canonicalClientId = (body as Record<string, unknown>).canonical_id
    const duplicateClientId = (body as Record<string, unknown>).duplicate_id

    if (typeof canonicalClientId !== 'string' || typeof duplicateClientId !== 'string') {
      return NextResponse.json({ error: 'canonical_id and duplicate_id are both required' }, { status: 400 })
    }

    const result = await mergeClients({
      tenantId: tenant.tenantId,
      canonicalClientId,
      duplicateClientId,
      mergedBy: tenant.userId,
    })

    return NextResponse.json({ merge: result })
  } catch (e) {
    if (e instanceof ClientMergeError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
