/**
 * Platform-admin user management for a specific tenant (keyed by URL id, gated
 * by requireAdmin) — distinct from /api/admin/users which is the caller's own
 * tenant. Reuses tenant_members + PIN infra.
 *   GET    → list members
 *   POST   { name, role, email?, phone? } → create PIN member, returns pin ONCE
 *   DELETE ?user_id=UUID
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { hashAdminPin, generateAdminPin } from '@/lib/admin-pin'

const VALID_ROLES = ['owner', 'admin', 'manager', 'staff']

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('tenant_members')
    .select('id, email, name, role, clerk_user_id, phone, created_at, pin_hash, pin_set_at, pin_last_login')
    .eq('tenant_id', id)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    users: (data || []).map(m => ({
      id: m.id, email: m.email, name: m.name, role: m.role, phone: m.phone,
      status: (m.clerk_user_id || m.pin_hash) ? 'active' : 'pending',
      has_pin: !!m.pin_hash, last_login: m.pin_last_login, created_at: m.created_at,
    })),
  })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id } = await params

  const { name, role, email, phone } = await request.json().catch(() => ({}))
  if (!name || typeof name !== 'string') return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  const memberRole = VALID_ROLES.includes(role) ? role : 'staff'

  let pin = generateAdminPin()
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await supabaseAdmin
      .from('tenant_members').select('id')
      .eq('tenant_id', id).eq('pin_hash', hashAdminPin(pin)).maybeSingle()
    if (!clash) break
    pin = generateAdminPin()
  }

  const { data, error } = await supabaseAdmin
    .from('tenant_members')
    .insert({
      tenant_id: id, name: name.trim(), role: memberRole,
      email: email ? String(email).trim().toLowerCase() : null,
      phone: phone ? String(phone).trim() : null,
      pin_hash: hashAdminPin(pin), pin_set_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // PIN returned once, in the clear, for the operator to hand over.
  return NextResponse.json({ id: data.id, pin })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id } = await params
  const userId = new URL(request.url).searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('tenant_members').delete().eq('tenant_id', id).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
