/**
 * Admin users — tenant-scoped thin wrapper over tenant_members.
 * Ported from nycmaid `/api/admin/users`. Owner-only list.
 *
 * POST creates a PIN-based member directly (see below) — there is no
 * password creation. /api/admin/invites is a separate, email-token path for
 * inviting someone not yet in the dashboard (accepted at
 * /api/invites/[token]/accept, which mints a PIN the same way this route
 * does); it does not run through here.
 */
import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { hashAdminPin, generateAdminPin } from '@/lib/admin-pin'
import { ROLES } from '@/lib/rbac'
import { sendEmail, tenantSender } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { operatorAccountCreatedEmail } from '@/lib/email-templates'

const VALID_ROLES = ROLES.map(r => r.value)

export async function GET() {
  const { tenant, error: authError } = await requirePermission('team.view')
  if (authError) return authError

  const { data, error } = await tenantDb(tenant.tenantId)
    .from('tenant_members')
    .select('id, email, name, role, clerk_user_id, phone, created_at, pin_hash, pin_set_at, pin_last_login')
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
  const { tenant, error: authError } = await requirePermission('team.create')
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
    const { data: clash } = await tenantDb(tenant.tenantId)
      .from('tenant_members')
      .select('id')
      .eq('pin_hash', hashAdminPin(pin))
      .maybeSingle()
    if (!clash) break
    pin = generateAdminPin()
  }

  const normalizedEmail = email ? String(email).trim().toLowerCase() : null
  const normalizedPhone = phone ? String(phone).trim() : null

  const { data, error } = await tenantDb(tenant.tenantId)
    .from('tenant_members')
    .insert({
      name: name.trim(),
      role: memberRole,
      email: normalizedEmail,
      phone: normalizedPhone,
      pin_hash: hashAdminPin(pin),
      pin_set_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Hand the new member their login credentials directly — the operator
  // still sees the PIN once too (below), but this is what gets them in
  // without a manual copy/paste from the admin.
  const roleLabel = ROLES.find(r => r.value === memberRole)?.label || memberRole
  const portalUrl = tenant.tenant.domain ? `https://${tenant.tenant.domain}/fullloop` : null
  const notified = { email: false, sms: false }

  if (normalizedEmail && portalUrl) {
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: `Your ${tenant.tenant.name} login`,
        html: operatorAccountCreatedEmail({
          tenantName: tenant.tenant.name,
          primaryColor: tenant.tenant.primary_color || undefined,
          logoUrl: tenant.tenant.logo_url || undefined,
          personName: name.trim(),
          pin,
          portalUrl,
          role: roleLabel,
        }),
        from: tenantSender(tenant.tenant),
        resendApiKey: tenant.tenant.resend_api_key,
      })
      notified.email = true
    } catch (e) {
      console.error('Failed to send new-member credentials email:', e)
    }
  }

  if (normalizedPhone && portalUrl && tenant.tenant.telnyx_api_key && tenant.tenant.telnyx_phone) {
    try {
      await sendSMS({
        to: normalizedPhone,
        body: `${tenant.tenant.name}: You've been added as ${roleLabel}. Log in at ${portalUrl} with PIN ${pin}.`,
        telnyxApiKey: tenant.tenant.telnyx_api_key,
        telnyxPhone: tenant.tenant.telnyx_phone,
      })
      notified.sms = true
    } catch (e) {
      console.error('Failed to send new-member credentials SMS:', e)
    }
  }

  return NextResponse.json({ success: true, id: data.id, pin, notified })
}

export async function DELETE(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('team.delete')
  if (authError) return authError

  const body = await request.json().catch(() => null)
  const id = body?.id
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: target } = await tenantDb(tenant.tenantId)
    .from('tenant_members')
    .select('id, role')
    .eq('id', id)
    .single()

  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

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

export async function PUT(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  const { id, role, name, phone } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (role) {
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be: ${VALID_ROLES.join(', ')}` }, { status: 400 })
    }
    // Granting 'owner' is owner-only — see POST for why this can't be left open.
    if (role === 'owner' && tenant.role !== 'owner') {
      return NextResponse.json({ error: 'Only an owner can grant the owner role' }, { status: 403 })
    }
    update.role = role
  }
  if (name !== undefined) update.name = name
  if (phone !== undefined) update.phone = phone

  const { error } = await tenantDb(tenant.tenantId)
    .from('tenant_members')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
