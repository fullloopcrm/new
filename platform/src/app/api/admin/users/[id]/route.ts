/**
 * Individual tenant member update/delete — tenant-scoped.
 * Ported from nycmaid `/api/admin/users/[id]`. Password field accepted but
 * ignored: fullloop uses Clerk + PIN auth, not plaintext passwords.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

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
      const validRoles = ['owner', 'admin', 'manager', 'staff']
      if (!validRoles.includes(body.role)) {
        return NextResponse.json({ error: `Invalid role. Must be: ${validRoles.join(', ')}` }, { status: 400 })
      }
      // Granting 'owner' is owner-only — otherwise any member with settings.edit
      // (e.g. the 'admin' role) could promote themselves to owner and, from
      // there, remove the real owner outright (DELETE only blocks removing the
      // LAST owner, not a non-last one).
      if (body.role === 'owner' && tenant.role !== 'owner') {
        return NextResponse.json({ error: 'Only an owner can grant the owner role' }, { status: 403 })
      }
      // The other half of that same escalation: changing an EXISTING owner's
      // role AWAY from 'owner' is just as dangerous as granting it. Without
      // this, any 'admin' (settings.edit by default) could PUT {role:'staff'}
      // on the real owner's member row, stripping their always-full-access
      // tier with zero owner-level authorization -- a full tenant takeover
      // that doesn't even need the self-promote-then-delete path above.
      if (body.role !== 'owner') {
        const { data: currentTarget } = await supabaseAdmin
          .from('tenant_members')
          .select('role')
          .eq('id', id)
          .eq('tenant_id', tenant.tenantId)
          .maybeSingle()
        if (currentTarget?.role === 'owner') {
          if (tenant.role !== 'owner') {
            return NextResponse.json({ error: "Only an owner can change another owner's role" }, { status: 403 })
          }
          // Mirror DELETE's last-owner guard: don't let the tenant demote its
          // way down to zero owners, even when the actor legitimately is one.
          const { count } = await supabaseAdmin
            .from('tenant_members')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenant.tenantId)
            .eq('role', 'owner')
          if ((count ?? 0) <= 1) {
            return NextResponse.json({ error: 'Cannot demote the last owner' }, { status: 400 })
          }
        }
      }
      updates.role = body.role
    }

    const { data, error } = await supabaseAdmin
      .from('tenant_members')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenant.tenantId)
      .select('id, email, name, role, phone, created_at')
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

  const { data: target } = await supabaseAdmin
    .from('tenant_members')
    .select('id, role')
    .eq('id', id)
    .eq('tenant_id', tenant.tenantId)
    .single()

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (target.role === 'owner') {
    // The count check below only ever blocked removing the LAST owner --
    // with 2+ owners on a tenant, any 'admin' (settings.edit by default)
    // could DELETE a non-last owner outright with no owner-level
    // authorization at all. Removing an owner is exactly as sensitive as
    // demoting one (see the PUT handler above): only an owner may do it.
    if (tenant.role !== 'owner') {
      return NextResponse.json({ error: 'Only an owner can remove another owner' }, { status: 403 })
    }
    const { count } = await supabaseAdmin
      .from('tenant_members')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.tenantId)
      .eq('role', 'owner')
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last owner' }, { status: 400 })
    }
  }

  const { error } = await supabaseAdmin
    .from('tenant_members')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenant.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
