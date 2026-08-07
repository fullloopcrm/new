import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { tenantClient } from '@/lib/tenant-supabase'
import { pick } from '@/lib/validate'
import { audit } from '@/lib/audit'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { sendClientSMS } from '@/lib/nycmaid/client-contacts'
import { notify } from '@/lib/notify'
import { formatName, formatEmail } from '@/lib/format'
import { normalizePhone } from '@/lib/phone'
import { updateProperty } from '@/lib/client-properties'
import { encryptSecretSafe, decryptSecret } from '@/lib/secret-crypto'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const OPTIONS = corsPreflight

export const GET = withMobileCors(async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Same gap as GET /api/clients (list) -- see that file's comment. Every
    // other verb here (PUT/DELETE below) is gated by requirePermission.
    const { tenant: authTenant, error: authError } = await requirePermission('clients.view')
    if (authError) return authError
    const { tenantId, tenant } = authTenant
    const { id } = await params

    const { data, error } = await (await tenantClient(tenantId))
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ client: data, tenant_slug: tenant.slug })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('clients.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json()

    // NYC Maid parity: send/reset a client's portal PIN via email/SMS.
    // Gated to this tenant only — see src/lib/nycmaid/tenant.ts.
    if (isNycMaid(tenantId) && body.send_pin) {
      const { data: client } = await (await tenantClient(tenantId)).from('clients').select('name, pin').eq('id', id).eq('tenant_id', tenantId).single()
      if (!client?.pin) return NextResponse.json({ error: 'Client has no PIN' }, { status: 400 })
      const plainPin = decryptSecret(client.pin)

      const portalUrl = tenant.tenant.website_url ? `${tenant.tenant.website_url}/book/new` : undefined
      const pinMessage = `Your ${tenant.tenant.name} portal PIN is: ${plainPin}.${portalUrl ? ` Log in at ${portalUrl} with your email and this PIN.` : ''}`
      // Same standard branded template as the reset flow just below — this
      // used to send a raw unstyled <p> tag with the tenant name hardcoded.
      const emailResult = await notify({
        tenantId,
        type: 'portal_pin_reset',
        title: 'Your Portal PIN',
        message: pinMessage,
        channel: 'email',
        recipientType: 'client',
        recipientId: id,
        metadata: { recipientName: client.name, pin: plainPin, portalUrl, wasReset: false },
      })
      const smsResult = await sendClientSMS(id, pinMessage, { smsType: 'pin_delivery' })

      return NextResponse.json({ success: true, sent_to: { email: emailResult.success, sms: smsResult.sent > 0 } })
    }

    if (isNycMaid(tenantId) && body.reset_pin) {
      const { data: client } = await (await tenantClient(tenantId)).from('clients').select('id, name, email').eq('id', id).eq('tenant_id', tenantId).single()
      if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      if (!client.email) return NextResponse.json({ error: 'Client has no email on file' }, { status: 400 })

      const newPin = generatePin()
      const { error: updateError } = await (await tenantClient(tenantId)).from('clients').update({ pin: encryptSecretSafe(newPin) }).eq('id', id).eq('tenant_id', tenantId)
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

      const result = await notify({
        tenantId,
        type: 'portal_pin_reset',
        title: `Your PIN was reset: ${newPin}`,
        message: `Your new PIN is ${newPin}.`,
        channel: 'email',
        recipientType: 'client',
        recipientId: id,
        metadata: { recipientName: client.name, pin: newPin, portalUrl: tenant.tenant.website_url ? `${tenant.tenant.website_url}/book/new` : undefined },
      })
      await audit({ tenantId, action: 'client.updated', entityType: 'client', entityId: id, details: { field: 'pin_reset' } })

      return NextResponse.json({ success: true, pin: newPin, emailed: result.success })
    }

    const fields = pick(body, ['name', 'email', 'phone', 'address', 'unit', 'status', 'source', 'notes', 'notes_private', 'notes_public', 'special_instructions', 'preferred_team_member_id', 'sms_consent', 'do_not_service', 'dns_reason'])

    if (typeof fields.name === 'string') fields.name = formatName(fields.name)
    if (typeof fields.email === 'string') fields.email = formatEmail(fields.email)
    if (typeof fields.phone === 'string') {
      const normalized = normalizePhone(fields.phone)
      if (!normalized) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
      fields.phone = normalized
    }

    // preferred_team_member_id is a caller-supplied FK — verify it's tenant-owned
    // before writing it, matching the same guard the client-portal twin
    // (PUT /api/client/preferred-cleaner) already enforces.
    if (fields.preferred_team_member_id) {
      const { data: ownedMember } = await tenantDb(tenantId)
        .from('team_members')
        .select('id')
        .eq('id', fields.preferred_team_member_id as string)
        .maybeSingle()
      if (!ownedMember) {
        return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
      }
    }

    const { data, error } = await (await tenantClient(tenantId))
      .from('clients')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'client.updated', entityType: 'client', entityId: id, details: { fields: Object.keys(fields) } })

    // client_contacts.phone_e164 is a one-time copy of clients.phone made at
    // client creation (createPrimaryContact) — every reminder/confirmation
    // SMS (cron jobs, recurring bookings) reads from client_contacts first
    // via getClientContacts(), so without this the primary contact keeps
    // texting the old number forever after an edit here. Only the primary
    // contact mirrors clients.phone; other contacts are distinct people and
    // must not be overwritten.
    if (typeof fields.phone === 'string') {
      await tenantDb(tenantId)
        .from('client_contacts')
        .update({ phone_e164: fields.phone })
        .eq('client_id', id)
        .eq('is_primary', true)
    }

    // Bookings resolve their address from client_properties (via a booking's
    // property_id), not from clients.address -- so editing the address here
    // alone leaves any existing property row stale and every booking tied to
    // it keeps showing the old address. Sync it when there's exactly one
    // active property (the common single-address case); with zero or
    // multiple properties there's no unambiguous row to update, so leave it
    // to the dedicated Addresses panel.
    if (typeof fields.address === 'string' && fields.address.trim()) {
      const { data: activeProps } = await tenantDb(tenantId)
        .from('client_properties')
        .select('id')
        .eq('client_id', id)
        .eq('active', true)
      if (activeProps && activeProps.length === 1) {
        await updateProperty(id, activeProps[0].id, { address: fields.address as string }, { changedBy: 'admin', source: 'admin' })
      }
    }

    return NextResponse.json({ client: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('clients.delete')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params

    const { data, error } = await (await tenantClient(tenantId))
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await audit({ tenantId, action: 'client.deleted', entityType: 'client', entityId: id })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
