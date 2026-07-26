import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { normalizePhone } from '@/lib/client-contacts'
import { verifyPortalToken } from '../auth/token'

// Self-service contacts management for an authenticated client. A newly-added
// phone/email is inserted UNVERIFIED (receives_sms/receives_email forced
// false, no consent timestamp) — it only starts receiving comms once the
// client completes the OTP flow at POST /api/portal/contacts/verify. This
// mirrors the admin CRUD at /api/clients/[id]/contacts, but the admin route
// trusts the operator's word on consent; this one cannot, since a client
// could otherwise add anyone else's phone number and opt it in unverified.

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data, error } = await tenantDb(auth.tid)
    .from('client_contacts')
    .select('id, name, role, phone_e164, email, is_primary, receives_sms, receives_email, sms_consent_at, email_consent_at')
    .eq('client_id', auth.id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contacts: data })
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const phone_e164 = body.phone ? normalizePhone(String(body.phone)) : null
  const email = body.email ? String(body.email).trim().toLowerCase() || null : null

  if (!phone_e164 && !email) {
    return NextResponse.json({ error: 'Enter at least a phone or an email' }, { status: 400 })
  }

  const db = tenantDb(auth.tid)

  if (body.is_primary) {
    await db.from('client_contacts').update({ is_primary: false }).eq('client_id', auth.id).eq('is_primary', true)
  }

  const { data, error } = await db
    .from('client_contacts')
    .insert({
      client_id: auth.id,
      name: body.name ? String(body.name).trim() : null,
      role: body.role ? String(body.role).trim() : null,
      phone_e164,
      email,
      is_primary: Boolean(body.is_primary),
      // Unverified on creation — verify/route.ts flips these after OTP confirm.
      receives_sms: false,
      receives_email: false,
    })
    .select('id, name, role, phone_e164, email, is_primary, receives_sms, receives_email')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contact: data }, { status: 201 })
}
