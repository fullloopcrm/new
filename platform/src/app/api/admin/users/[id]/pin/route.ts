/**
 * Set/reset a tenant member's admin-login PIN.
 *
 * POST /api/admin/users/:id/pin
 *   - Owner/settings.edit only, tenant-scoped.
 *   - Generates a new 6-digit PIN (or accepts a provided 4–8 digit one),
 *     stores it HASHED on the member, and returns the plaintext ONCE so the
 *     operator can hand it over. We never store or re-display it after this.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { hashAdminPin, generateAdminPin, isValidAdminPin } from '@/lib/admin-pin'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  const { id } = await params

  // Confirm the member belongs to THIS tenant before touching their PIN.
  const { data: member } = await supabaseAdmin
    .from('tenant_members')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenant.tenantId)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  let pin: string
  if (body?.pin) {
    if (!isValidAdminPin(String(body.pin))) {
      return NextResponse.json({ error: 'PIN must be 4–8 digits' }, { status: 400 })
    }
    pin = String(body.pin)
  } else {
    pin = generateAdminPin()
  }

  // Enforce per-tenant PIN uniqueness defensively (the DB index also enforces it).
  const pinHash = hashAdminPin(pin)
  const { data: clash } = await supabaseAdmin
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenant.tenantId)
    .eq('pin_hash', pinHash)
    .neq('id', id)
    .maybeSingle()
  if (clash) {
    return NextResponse.json({ error: 'That PIN is already in use — try again.' }, { status: 409 })
  }

  const { error } = await supabaseAdmin
    .from('tenant_members')
    .update({ pin_hash: pinHash, pin_set_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenant.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Plaintext returned ONCE. Not stored, not retrievable later.
  return NextResponse.json({ success: true, pin })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  const { id } = await params
  const { error } = await supabaseAdmin
    .from('tenant_members')
    .update({ pin_hash: null, pin_set_at: null })
    .eq('id', id)
    .eq('tenant_id', tenant.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
