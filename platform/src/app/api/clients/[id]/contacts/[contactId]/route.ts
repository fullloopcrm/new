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
      } else if (key === 'is_primary') {
        update.is_primary = Boolean(body.is_primary)
      }
    }

    if (update.is_primary === true) {
      await supabaseAdmin.from('client_contacts').update({ is_primary: false }).eq('tenant_id', tenant.tenantId).eq('client_id', id).eq('is_primary', true).neq('id', contactId)
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('client_contacts')
      .update(update)
      .eq('tenant_id', tenant.tenantId)
      .eq('id', contactId)
      .eq('client_id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
