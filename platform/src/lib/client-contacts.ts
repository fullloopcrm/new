// Global, tenant-aware client_contacts fan-out.
//
// client_contacts lets one client have multiple phone/email recipients
// (e.g. two spouses, a property manager + owner), each with its own
// receives_sms/receives_email opt-in. Every client-facing SMS/email send
// site should route through sendClientSMS/sendClientEmail below instead of
// messaging clients.phone/clients.email directly, or additional contacts
// silently never hear anything.
//
// This supersedes src/lib/nycmaid/client-contacts.ts, which is nycmaid-only:
// it sends through @/lib/nycmaid/sms + @/lib/nycmaid/email, which use a
// single hardcoded Telnyx/Resend credential pair — correct for nycmaid, but
// silently wrong (wrong sender identity, wrong Telnyx number) for every
// other tenant, violating the platform's one-shared-codebase rule. This
// version takes the tenant's own credentials and routes through the
// tenant-aware @/lib/sms + @/lib/email.
import { tenantDb } from './tenant-db'
import { sendSMS } from './sms'
import { sendEmail, tenantSender } from './email'

export interface ClientContact {
  id: string
  client_id: string
  name: string | null
  role: string | null
  phone_e164: string | null
  email: string | null
  is_primary: boolean
  receives_sms: boolean
  receives_email: boolean
}

export type Channel = 'sms' | 'email'

export type CommsTenant = {
  id: string
  name?: string | null
  slug?: string | null
  email_from?: string | null
  telnyx_api_key?: string | null
  telnyx_phone?: string | null
  resend_api_key?: string | null
}

/** Normalize a phone number to E.164 (+1XXXXXXXXXX). Null if unparseable. */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length === 0) return null
  return `+${digits}`
}

/**
 * Every contact on this client that should receive a message on `channel`,
 * filtered by channel opt-in + account-level do_not_service. Empty array =
 * send nothing (the fan-out helpers below log that as a comms_fail).
 */
export async function getClientContacts(
  tenantId: string,
  clientId: string,
  channel: Channel
): Promise<ClientContact[]> {
  const db = tenantDb(tenantId)

  const { data: client, error: clientErr } = await db
    .from('clients')
    .select('id, do_not_service')
    .eq('id', clientId)
    .single()
  if (clientErr || !client) return []
  if (client.do_not_service) return []

  const channelColumn = channel === 'sms' ? 'receives_sms' : 'receives_email'
  const requiredField = channel === 'sms' ? 'phone_e164' : 'email'

  const { data: contacts, error } = await db
    .from('client_contacts')
    .select('id, client_id, name, role, phone_e164, email, is_primary, receives_sms, receives_email')
    .eq('client_id', clientId)
    .eq(channelColumn, true)
    .not(requiredField, 'is', null)
    .order('is_primary', { ascending: false })
  if (error || !contacts) return []
  return contacts as ClientContact[]
}

/**
 * Whether this client has ANY client_contacts rows at all, regardless of
 * channel opt-in. Used to distinguish "not yet migrated to client_contacts,
 * fall back to clients.phone/email" from "has contacts, none opted into this
 * channel" — the latter must NOT fall back, or it silently bypasses opt-out.
 */
export async function hasAnyClientContacts(tenantId: string, clientId: string): Promise<boolean> {
  const db = tenantDb(tenantId)
  const { data } = await db.from('client_contacts').select('id').eq('client_id', clientId).limit(1)
  return Boolean(data && data.length > 0)
}

/**
 * Create a primary contact row for a newly-inserted client. Every
 * client-creation path must call this, or the client silently never
 * receives any SMS/email — getClientContacts() returns empty and the
 * fan-out helpers above log a comms_fail with nobody to send to.
 * Safe to call even when no phone/email were captured — it just no-ops.
 */
export async function createPrimaryContact(
  tenantId: string,
  clientId: string,
  input: { name?: string | null; phone?: string | null; email?: string | null }
): Promise<void> {
  const phone_e164 = input.phone ? normalizePhone(input.phone) : null
  const email = input.email ? input.email.trim().toLowerCase() || null : null
  if (!phone_e164 && !email) return

  const now = new Date().toISOString()
  await tenantDb(tenantId).from('client_contacts').insert({
    tenant_id: tenantId,
    client_id: clientId,
    name: input.name || null,
    role: 'primary',
    phone_e164,
    email,
    is_primary: true,
    receives_sms: Boolean(phone_e164),
    receives_email: Boolean(email),
    sms_consent_at: phone_e164 ? now : null,
    email_consent_at: email ? now : null,
  })
}

type SendResult = { sent: number; skipped: number }

async function logZeroContactFanout(
  tenantId: string,
  clientId: string,
  channel: Channel
): Promise<void> {
  try {
    const db = tenantDb(tenantId)
    const { data: client } = await db.from('clients').select('name, do_not_service').eq('id', clientId).single()
    if (client?.do_not_service) return // DNS clients are intentionally skipped
    await db.from('notifications').insert({
      type: 'comms_fail',
      title: `Zero ${channel} contacts for client`,
      message: `${channel} fan-out found no contacts — client=${client?.name || clientId}`,
    })
  } catch {
    // never throw from the logger
  }
}

/**
 * Send an SMS to every contact on this client that receives SMS, through
 * the TENANT'S OWN Telnyx credentials. Per-contact message via
 * `buildMessage(contact)`, primary-first order.
 */
export async function sendClientSMS(
  tenant: CommsTenant,
  clientId: string,
  message: string | ((contact: ClientContact) => string)
): Promise<SendResult> {
  if (!tenant.telnyx_api_key || !tenant.telnyx_phone) return { sent: 0, skipped: 0 }

  const contacts = await getClientContacts(tenant.id, clientId, 'sms')
  if (contacts.length === 0) {
    await logZeroContactFanout(tenant.id, clientId, 'sms')
    return { sent: 0, skipped: 0 }
  }

  let sent = 0
  let skipped = 0
  for (const c of contacts) {
    if (!c.phone_e164) {
      skipped++
      continue
    }
    const text = typeof message === 'function' ? message(c) : message
    try {
      await sendSMS({ to: c.phone_e164, body: text, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone })
      sent++
    } catch {
      skipped++
    }
  }
  return { sent, skipped }
}

/**
 * Send an email to every contact on this client that receives email,
 * through the TENANT'S OWN Resend credentials + sender identity.
 */
export async function sendClientEmail(
  tenant: CommsTenant,
  clientId: string,
  subject: string | ((contact: ClientContact) => string),
  html: string | ((contact: ClientContact) => string)
): Promise<SendResult> {
  const contacts = await getClientContacts(tenant.id, clientId, 'email')
  if (contacts.length === 0) {
    await logZeroContactFanout(tenant.id, clientId, 'email')
    return { sent: 0, skipped: 0 }
  }

  let sent = 0
  let skipped = 0
  for (const c of contacts) {
    if (!c.email) {
      skipped++
      continue
    }
    const subj = typeof subject === 'function' ? subject(c) : subject
    const body = typeof html === 'function' ? html(c) : html
    try {
      await sendEmail({ to: c.email, subject: subj, html: body, from: tenantSender(tenant), resendApiKey: tenant.resend_api_key })
      sent++
    } catch {
      skipped++
    }
  }
  return { sent, skipped }
}
