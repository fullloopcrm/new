/**
 * Individual tenant member update/delete — tenant-scoped.
 * Ported from nycmaid `/api/admin/users/[id]`. Password field accepted but
 * ignored: fullloop uses Clerk + PIN auth, not plaintext passwords.
 */
import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { ROLES } from '@/lib/rbac'

const VALID_ROLES = ROLES.map(r => r.value)

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  const { id } = await params

  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.name) updates.name = body.name
    if (body.email) updates.email = body.email.toLowerCase().trim()
    if (body.phone !== undefined) updates.phone = body.phone
    if (body.role) {
      if (!VALID_ROLES.includes(body.role)) {
        return NextResponse.json({ error: `Invalid role. Must be: ${VALID_ROLES.join(', ')}` }, { status: 400 })
      }
      // Granting 'owner' is owner-only — otherwise any member with settings.edit
      // (e.g. the 'admin' role) could promote themselves to owner and, from
      // there, remove the real owner outright (DELETE only blocks removing the
      // LAST owner, not a non-last one).
      if (body.role === 'owner' && tenant.role !== 'owner') {
        return NextResponse.json({ error: 'Only an owner can grant the owner role' }, { status: 403 })
      }
      updates.role = body.role
    }
    if (body.is_active !== undefined) {
      const nextActive = !!body.is_active
      if (!nextActive) {
        // Same invariant as DELETE below: a tenant can't be left with zero
        // active owners, or nobody can log in to reactivate anyone.
        const { data: target } = await tenantDb(tenant.tenantId)
          .from('tenant_members')
          .select('role')
          .eq('id', id)
          .single()
        if (target?.role === 'owner') {
          const { count } = await tenantDb(tenant.tenantId)
            .from('tenant_members')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'owner')
            .eq('is_active', true)
          if ((count ?? 0) <= 1) {
            return NextResponse.json({ error: 'Cannot deactivate the last active owner' }, { status: 400 })
          }
        }
      }
      updates.is_active = nextActive
    }

    const { data, error } = await tenantDb(tenant.tenantId)
      .from('tenant_members')
      .update(updates)
      .eq('id', id)
      .select('id, email, name, role, phone, created_at, is_active')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[admin/users/:id] update error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  const { id } = await params

  const { data: target } = await tenantDb(tenant.tenantId)
    .from('tenant_members')
    .select('id, role')
    .eq('id', id)
    .single()

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (target.role === 'owner') {
    const { count } = await tenantDb(tenant.tenantId)
      .from('tenant_members')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'owner')
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last owner' }, { status: 400 })
    }
  }

  const { error } = await tenantDb(tenant.tenantId)
    .from('tenant_members')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
