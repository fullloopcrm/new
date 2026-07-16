import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { normalizePhone } from '@/lib/nycmaid/client-contacts'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // FL auth (replaces legacy admin_session): authenticates the caller + scopes
  // every query to their tenant, so no one can read another tenant's contact PII.
  const { tenant, error: authErr } = await requirePermission('clients.view')
  if (authErr) return authErr

  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('client_contacts')
    .select('id, tenant_id, client_id, name, role, phone_e164, email, is_primary, receives_sms, receives_email, sms_consent_at, email_consent_at, sms_opted_out_at, email_opted_out_at, created_at')
    .eq('tenant_id', tenant.tenantId)
    .eq('client_id', id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // FL auth (replaces legacy admin_session): authenticate + scope to tenant.
  const { tenant, error: authErr } = await requirePermission('clients.edit')
  if (authErr) return authErr

  try {
    const { id } = await params
    const body = await req.json()

    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('tenant_id')
      .eq('id', id)
      .eq('tenant_id', tenant.tenantId)
      .single()
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const phone_e164 = body.phone ? normalizePhone(String(body.phone)) : null
    const email = body.email ? String(body.email).trim().toLowerCase() || null : null

    if (!phone_e164 && !email) {
      return NextResponse.json({ error: 'Contact needs at least a phone or an email' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const payload = {
      tenant_id: client.tenant_id,
      client_id: id,
      name: body.name ? String(body.name).trim() : null,
      role: body.role ? String(body.role).trim() : null,
      phone_e164,
      email,
      // is_primary always starts false on insert -- if requested, set it via
      // the atomic RPC below instead, so a fresh row is never a second-window
      // TOCTOU target between insert and demote.
      is_primary: false,
      receives_sms: Boolean(body.receives_sms) && !!phone_e164,
      receives_email: Boolean(body.receives_email) && !!email,
      sms_consent_at: body.receives_sms && phone_e164 ? now : null,
      email_consent_at: body.receives_email && email ? now : null,
    }

    const { data, error } = await supabaseAdmin.from('client_contacts').insert(payload).select().single()  // tenant-scope-ok: insert payload carries tenant_id (client.tenant_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (Boolean(body.is_primary)) {
      // Demote-then-insert (or insert-then-demote) is two statements with a
      // real race window: two concurrent "set as primary" requests for two
      // DIFFERENT contacts can each run their own step independently and
      // interleave into ZERO primaries (each demotes the other's just-set
      // row), not just the obvious "two primaries" failure. A single UPDATE
      // is atomic in Postgres -- no window exists for a second call to
      // observe or interleave with a partial state, so every call
      // deterministically leaves exactly one contact primary.
      const { error: rpcErr } = await supabaseAdmin.rpc('set_primary_client_contact', {
        p_tenant_id: tenant.tenantId,
        p_client_id: id,
        p_contact_id: data.id,
      })
      if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 })
      data.is_primary = true
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Contact create error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
