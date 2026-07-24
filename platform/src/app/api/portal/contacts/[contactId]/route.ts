import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../../auth/token'

const ALLOWED = ['name', 'role', 'is_primary', 'receives_sms', 'receives_email'] as const

export async function PUT(request: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { contactId } = await params
  const body = await request.json().catch(() => ({}))
  const db = tenantDb(auth.tid)

  const { data: existing } = await db
    .from('client_contacts')
    .select('id, phone_e164, email, sms_consent_at, email_consent_at')
    .eq('id', contactId)
    .eq('client_id', auth.id)
    .single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const update: Record<string, unknown> = {}
  for (const key of Object.keys(body)) {
    if (!(ALLOWED as readonly string[]).includes(key)) continue

    if (key === 'receives_sms') {
      // Opting OUT is always allowed immediately. Opting IN only without a
      // fresh OTP if this phone was already verified once before (has a
      // consent timestamp) — a never-verified phone must go through
      // POST /api/portal/contacts/verify first, or a client could opt in a
      // number they don't actually control.
      if (body.receives_sms && !existing.sms_consent_at) {
        return NextResponse.json({ error: 'Verify this phone number first' }, { status: 400 })
      }
      update.receives_sms = Boolean(body.receives_sms)
      if (!body.receives_sms) update.sms_opted_out_at = new Date().toISOString()
      continue
    }
    if (key === 'receives_email') {
      if (body.receives_email && !existing.email_consent_at) {
        return NextResponse.json({ error: 'Verify this email address first' }, { status: 400 })
      }
      update.receives_email = Boolean(body.receives_email)
      if (!body.receives_email) update.email_opted_out_at = new Date().toISOString()
      continue
    }
    if (key === 'name' || key === 'role') {
      update[key] = body[key] ? String(body[key]).trim() : null
      continue
    }
    if (key === 'is_primary') {
      update.is_primary = Boolean(body.is_primary)
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  if (update.is_primary === true) {
    await db.from('client_contacts').update({ is_primary: false }).eq('client_id', auth.id).neq('id', contactId)
  }

  const { data, error } = await db
    .from('client_contacts')
    .update(update)
    .eq('id', contactId)
    .eq('client_id', auth.id)
    .select('id, name, role, phone_e164, email, is_primary, receives_sms, receives_email')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contact: data })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { contactId } = await params
  const { error } = await tenantDb(auth.tid).from('client_contacts').delete().eq('id', contactId).eq('client_id', auth.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
