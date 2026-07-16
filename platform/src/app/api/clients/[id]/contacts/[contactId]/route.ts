import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { normalizePhone } from '@/lib/nycmaid/client-contacts'

const ALLOWED = ['name', 'role', 'phone', 'email', 'is_primary', 'receives_sms', 'receives_email']

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  // FL auth (replaces legacy admin_session): authenticate + scope every write by
  // tenant_id so a forged cross-tenant client/contact id can't be edited.
  const { tenant, error: authErr } = await requirePermission('clients.edit')
  if (authErr) return authErr

  try {
    const { id, contactId } = await params
    const body = await req.json()

    const update: Record<string, unknown> = {}
    const now = new Date().toISOString()

    for (const key of Object.keys(body)) {
      if (!ALLOWED.includes(key)) continue
      if (key === 'phone') {
        update.phone_e164 = body.phone ? normalizePhone(String(body.phone)) : null
      } else if (key === 'email') {
        update.email = body.email ? String(body.email).trim().toLowerCase() || null : null
      } else if (key === 'name' || key === 'role') {
        update[key] = body[key] ? String(body[key]).trim() : null
      } else if (key === 'receives_sms') {
        update.receives_sms = Boolean(body.receives_sms)
        if (body.receives_sms) update.sms_consent_at = now
        else update.sms_opted_out_at = now
      } else if (key === 'receives_email') {
        update.receives_email = Boolean(body.receives_email)
        if (body.receives_email) update.email_consent_at = now
        else update.email_opted_out_at = now
      } else if (key === 'is_primary' && !body.is_primary) {
        // Un-setting primary is safe to apply directly -- no cross-row demote
        // needed. Setting it TRUE is intentionally NOT applied here; see the
        // RPC call below.
        update.is_primary = false
      }
    }

    const settingPrimary = Object.prototype.hasOwnProperty.call(body, 'is_primary') && Boolean(body.is_primary)

    if (Object.keys(update).length === 0 && !settingPrimary) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    let data: Record<string, unknown> | null = null
    if (Object.keys(update).length > 0) {
      const { data: updated, error } = await supabaseAdmin
        .from('client_contacts')
        .update(update)
        .eq('tenant_id', tenant.tenantId)
        .eq('id', contactId)
        .eq('client_id', id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      data = updated
    }

    if (settingPrimary) {
      // A two-step "demote others, then set/update this one" (in either
      // order) has a real race: two concurrent "set as primary" requests for
      // two DIFFERENT contacts can interleave into ZERO primaries left (each
      // demotes the other's just-set row), not just "two primaries". A
      // single UPDATE is atomic in Postgres -- no window for a second call
      // to observe or interleave with a partial state, so every call
      // deterministically leaves exactly one contact primary for the client.
      const { error: rpcErr } = await supabaseAdmin.rpc('set_primary_client_contact', {
        p_tenant_id: tenant.tenantId,
        p_client_id: id,
        p_contact_id: contactId,
      })
      if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 })
      if (!data) {
        const { data: refreshed, error: readErr } = await supabaseAdmin
          .from('client_contacts')
          .select()
          .eq('tenant_id', tenant.tenantId)
          .eq('id', contactId)
          .eq('client_id', id)
          .single()
        if (readErr || !refreshed) return NextResponse.json({ error: readErr?.message || 'Contact not found' }, { status: 404 })
        data = refreshed
      } else {
        data.is_primary = true
      }
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Contact update error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  // FL auth (replaces legacy admin_session): authenticate + scope by tenant_id.
  const { tenant, error: authErr } = await requirePermission('clients.edit')
  if (authErr) return authErr

  const { id, contactId } = await params
  const { error } = await supabaseAdmin
    .from('client_contacts')
    .delete()
    .eq('tenant_id', tenant.tenantId)
    .eq('id', contactId)
    .eq('client_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
