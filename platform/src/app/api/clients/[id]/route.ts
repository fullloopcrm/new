import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { pick, omit } from '@/lib/validate'
import { audit } from '@/lib/audit'

// clients.pin is a plaintext client-portal login PIN (POST /api/client/login
// checks it directly). Neither dashboard/clients/[id]/page.tsx nor
// client-drawer.tsx read `.pin` — unlike team_members.pin, which
// admin/broadcast-guidelines deliberately texts to crew on request, there is
// no admin feature that needs a client's PIN back. Same class as the
// tenant_members.pin_hash fix (select('*') drifted from the narrow-select
// invariant its own sibling POST /api/client/login already follows).
const NEVER_RETURNED_CLIENT_FIELDS = ['pin']

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('clients.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params

    const { data, error } = await tenantDb(tenantId)
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ client: omit(data, NEVER_RETURNED_CLIENT_FIELDS) })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('clients.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json()
    const fields = pick(body, ['name', 'email', 'phone', 'address', 'unit', 'status', 'source', 'notes', 'special_instructions', 'preferred_team_member_id', 'sms_consent'])

    // preferred_team_member_id is a caller-supplied FK — verify it's tenant-owned
    // before writing it, matching the same guard the client-portal twin
    // (PUT /api/client/preferred-cleaner) already enforces.
    if (fields.preferred_team_member_id) {
      const { data: ownedMember } = await tenantDb(tenantId)
        .from('team_members')
        .select('id')
        .eq('id', fields.preferred_team_member_id as string)
        .maybeSingle()
      if (!ownedMember) {
        return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
      }
    }

    const { data, error } = await tenantDb(tenantId)
      .from('clients')
      .update(fields)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'client.updated', entityType: 'client', entityId: id, details: { fields: Object.keys(fields) } })

    return NextResponse.json({ client: omit(data, NEVER_RETURNED_CLIENT_FIELDS) })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('clients.delete')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params

    const { data, error } = await tenantDb(tenantId)
      .from('clients')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await audit({ tenantId, action: 'client.deleted', entityType: 'client', entityId: id })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
