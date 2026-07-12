import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { normalizePhone } from '@/lib/nycmaid/client-contacts'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // FL auth (replaces legacy admin_session): authenticates the caller + scopes
  // every query to their tenant, so no one can read another tenant's contact PII.
  const { tenant, error: authErr } = await requirePermission('clients.view')
  if (authErr) return authErr

  const { id } = await params
  const db = tenantDb(tenant.tenantId)
  const { data, error } = await db
    .from('client_contacts')
    .select('id, tenant_id, client_id, name, role, phone_e164, email, is_primary, receives_sms, receives_email, sms_consent_at, email_consent_at, sms_opted_out_at, email_opted_out_at, created_at')
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
    const db = tenantDb(tenant.tenantId)

    const { data: client } = await db
      .from('clients')
      .select('tenant_id')
      .eq('id', id)
      .single()
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const phone_e164 = body.phone ? normalizePhone(String(body.phone)) : null
    const email = body.email ? String(body.email).trim().toLowerCase() || null : null

    if (!phone_e164 && !email) {
      return NextResponse.json({ error: 'Contact needs at least a phone or an email' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const payload = {
      client_id: id,
      name: body.name ? String(body.name).trim() : null,
      role: body.role ? String(body.role).trim() : null,
      phone_e164,
      email,
      is_primary: Boolean(body.is_primary),
      receives_sms: Boolean(body.receives_sms) && !!phone_e164,
      receives_email: Boolean(body.receives_email) && !!email,
      sms_consent_at: body.receives_sms && phone_e164 ? now : null,
      email_consent_at: body.receives_email && email ? now : null,
    }

    if (payload.is_primary) {
      await db.from('client_contacts').update({ is_primary: false }).eq('client_id', id).eq('is_primary', true)
    }

    const { data, error } = await db.from('client_contacts').insert(payload).select().single()  // tenantDb stamps tenant_id
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('Contact create error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
