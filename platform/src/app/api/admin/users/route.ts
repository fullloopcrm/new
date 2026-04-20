/**
 * Admin users — tenant-scoped thin wrapper over tenant_members.
 * Ported from nycmaid `/api/admin/users`. Owner-only list.
 *
 * Creation goes through /api/admin/invites (Clerk invite flow) — direct
 * password creation is not supported, by design.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  const { data, error } = await supabaseAdmin
    .from('tenant_members')
    .select('id, email, name, role, clerk_user_id, phone, created_at')
    .eq('tenant_id', tenant.tenantId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    (data || []).map(m => ({
      id: m.id,
      email: m.email,
      name: m.name,
      role: m.role,
      phone: m.phone,
      status: m.clerk_user_id ? 'active' : 'pending',
      last_login: null,
      created_at: m.created_at,
    })),
  )
}

export async function DELETE(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  const body = await request.json().catch(() => null)
  const id = body?.id
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: target } = await supabaseAdmin
    .from('tenant_members')
    .select('id, role')
    .eq('id', id)
    .eq('tenant_id', tenant.tenantId)
    .single()

  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  if (target.role === 'owner') {
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

export async function PUT(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  const { id, role, name, phone } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const validRoles = ['owner', 'admin', 'manager', 'staff']
  const update: Record<string, unknown> = {}
  if (role) {
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be: ${validRoles.join(', ')}` }, { status: 400 })
    }
    update.role = role
  }
  if (name !== undefined) update.name = name
  if (phone !== undefined) update.phone = phone

  const { error } = await supabaseAdmin
    .from('tenant_members')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', tenant.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
