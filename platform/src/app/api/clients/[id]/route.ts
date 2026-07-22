import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { pick } from '@/lib/validate'
import { audit } from '@/lib/audit'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params

    const { data, error } = await tenantDb(tenantId)
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ client: data })
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
    const fields = pick(body, ['name', 'email', 'phone', 'address', 'unit', 'status', 'source', 'notes', 'notes_private', 'notes_public', 'special_instructions', 'preferred_team_member_id', 'sms_consent', 'do_not_service', 'dns_reason'])

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

    return NextResponse.json({ client: data })
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
