import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { protectAdminAPI } from '@/lib/nycmaid/auth'
import { getCurrentTenant } from '@/lib/tenant'
import { normalizePhone } from '@/lib/nycmaid/client-contacts'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await protectAdminAPI()
  if (authError) return authError

  // Tenant isolation: admin_session is not tenant-bound, so scope the read to
  // the caller's tenant (resolved from the signed header). Without this, any
  // admin_session holder could read another tenant's client contact PII by
  // iterating client ids.
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'No tenant context' }, { status: 403 })

  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('client_contacts')
    .select('id, tenant_id, client_id, name, role, phone_e164, email, is_primary, receives_sms, receives_email, sms_consent_at, email_consent_at, sms_opted_out_at, email_opted_out_at, created_at')
    .eq('tenant_id', tenant.id)
    .eq('client_id', id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await protectAdminAPI()
  if (authError) return authError

  // Tenant isolation: scope the client lookup + insert to the caller's tenant so
  // a cross-tenant client id can't have contacts written against it.
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'No tenant context' }, { status: 403 })

  try {
    const { id } = await params
    const body = await req.json()

    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('tenant_id')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
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
      is_primary: Boolean(body.is_primary),
      receives_sms: Boolean(body.receives_sms) && !!phone_e164,
      receives_email: Boolean(body.receives_email) && !!email,
      sms_consent_at: body.receives_sms && phone_e164 ? now : null,
      email_consent_at: body.receives_email && email ? now : null,
    }

    if (payload.is_primary) {
      await supabaseAdmin.from('client_contacts').update({ is_primary: false }).eq('client_id', id).eq('is_primary', true)
    }

    const { data, error } = await supabaseAdmin.from('client_contacts').insert(payload).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('Contact create error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
