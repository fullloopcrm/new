import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { normalizePhone } from '@/lib/client-contacts'
import { audit } from '@/lib/audit'

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

    // Duplicate-contact guardrail (Jeff, 2026-08-14): phone and email are the
    // dominating match keys -- a new contact sharing either with an existing
    // contact under this SAME client is the same person, not a second
    // contact. Merge into the existing row instead of creating a duplicate.
    // Phone takes priority when a legacy pair of already-duplicate contacts
    // would otherwise match on both fields to two different rows.
    const { data: existingContacts } = await db
      .from('client_contacts')
      .select('id, name, role, phone_e164, email, is_primary, receives_sms, receives_email, sms_consent_at, email_consent_at')
      .eq('client_id', id)
    const rows = (existingContacts || []) as {
      id: string; name: string | null; role: string | null; phone_e164: string | null; email: string | null
      is_primary: boolean; receives_sms: boolean; receives_email: boolean
      sms_consent_at: string | null; email_consent_at: string | null
    }[]
    const phoneMatch = phone_e164 ? rows.find((r) => r.phone_e164 === phone_e164) : undefined
    const emailMatch = email ? rows.find((r) => r.email === email) : undefined
    const existing = phoneMatch || emailMatch

    if (existing) {
      if (payload.is_primary) {
        await db.from('client_contacts').update({ is_primary: false }).eq('client_id', id).eq('is_primary', true)
      }
      const mergedUpdate = {
        name: payload.name || existing.name,
        role: payload.role || existing.role,
        phone_e164: phone_e164 || existing.phone_e164,
        email: email || existing.email,
        is_primary: payload.is_primary || existing.is_primary,
        receives_sms: payload.receives_sms || existing.receives_sms,
        receives_email: payload.receives_email || existing.receives_email,
        sms_consent_at: payload.sms_consent_at || existing.sms_consent_at,
        email_consent_at: payload.email_consent_at || existing.email_consent_at,
      }
      const { data: updated, error: updateError } = await db
        .from('client_contacts')
        .update(mergedUpdate)
        .eq('id', existing.id)
        .select()
        .single()
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
      await audit({
        tenantId: tenant.tenantId,
        action: 'client_contact.duplicate_merged',
        entityType: 'client_contact',
        entityId: existing.id,
        details: { clientId: id, matchedOn: phoneMatch ? 'phone' : 'email' },
      })
      return NextResponse.json({ ...updated, merged: true })
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
