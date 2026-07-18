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
import { hashAdminPin, generateAdminPin } from '@/lib/admin-pin'

const VALID_ROLES = ['owner', 'admin', 'manager', 'staff']

export async function GET() {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  const { data, error } = await supabaseAdmin
    .from('tenant_members')
    .select('id, email, name, role, clerk_user_id, phone, created_at, pin_hash, pin_set_at, pin_last_login')
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
      // A member is active once they can log in either way (Clerk or PIN).
      status: (m.clerk_user_id || m.pin_hash) ? 'active' : 'pending',
      has_pin: !!m.pin_hash,
      pin_set_at: m.pin_set_at,
      last_login: m.pin_last_login,
      created_at: m.created_at,
    })),
  )
}

// Create a PIN-based member (no Clerk / no outside platform). Returns the
// generated PIN ONCE so the operator can hand it over.
export async function POST(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  const { name, role, email, phone } = await request.json().catch(() => ({}))
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const memberRole = VALID_ROLES.includes(role) ? role : 'staff'

  // Granting 'owner' is owner-only — 'admin' already holds settings.edit, so
  // without this check any admin could mint themselves (or anyone) a fresh
  // owner account and, from there, remove the real owner outright.
  if (memberRole === 'owner' && tenant.role !== 'owner') {
    return NextResponse.json({ error: 'Only an owner can grant the owner role' }, { status: 403 })
  }

  // Generate a per-tenant-unique 6-digit PIN (retry on the rare collision).
  let pin = generateAdminPin()
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await supabaseAdmin
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', tenant.tenantId)
      .eq('pin_hash', hashAdminPin(pin))
      .maybeSingle()
    if (!clash) break
    pin = generateAdminPin()
  }

  const { data, error } = await supabaseAdmin
    .from('tenant_members')
    .insert({
      tenant_id: tenant.tenantId,
      name: name.trim(),
      role: memberRole,
      email: email ? String(email).trim().toLowerCase() : null,
      phone: phone ? String(phone).trim() : null,
      pin_hash: hashAdminPin(pin),
      pin_set_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, id: data.id, pin })
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
    // Granting 'owner' is owner-only — see POST for why this can't be left open.
    if (role === 'owner' && tenant.role !== 'owner') {
      return NextResponse.json({ error: 'Only an owner can grant the owner role' }, { status: 403 })
    }
    // Same escalation, other direction: demoting an EXISTING owner away from
    // 'owner' is just as dangerous as granting it (see [id]/route.ts for the
    // matching guard on the other PUT variant of this same endpoint).
    if (role !== 'owner') {
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
