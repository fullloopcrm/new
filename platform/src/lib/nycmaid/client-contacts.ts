import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/nycmaid/sms'
import { sendEmail } from '@/lib/nycmaid/email'

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

/**
 * Normalize a phone number to E.164 (+1XXXXXXXXXX).
 * Returns null if input can't be parsed as a reasonable US number.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length === 0) return null
  // Foreign or malformed — pass through with + so callers can decide
  return `+${digits}`
}

/**
 * Return every contact on this client that should receive a message on `channel`,
 * filtered by channel opt-in + account-level do_not_service.
 *
 * Used by every outbound SMS / email fan-out site. Empty array = send nothing.
 */
export async function getClientContacts(
  clientId: string,
  channel: Channel
): Promise<ClientContact[]> {
  // Account-level gate first
  const { data: client, error: clientErr } = await supabaseAdmin
    .from('clients')
    .select('id, do_not_service')
    .eq('id', clientId)
    .single()

  if (clientErr || !client) return []
  if (client.do_not_service) return []

  const channelColumn = channel === 'sms' ? 'receives_sms' : 'receives_email'
  const requiredField = channel === 'sms' ? 'phone_e164' : 'email'

  const { data: contacts, error } = await supabaseAdmin
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
 * Match an inbound SMS phone to a specific contact.
 * Returns { client_id, contact_id, contact_name } or null.
 */
export async function matchInboundPhone(
  rawPhone: string
): Promise<{ client_id: string; contact_id: string; contact_name: string | null } | null> {
  const phone = normalizePhone(rawPhone)
  if (!phone) return null

  const { data, error } = await supabaseAdmin
    .from('client_contacts')  // tenant-scope-ok: nycmaid-legacy helper; retires with the standalone cutover
    .select('id, client_id, name')
    .eq('phone_e164', phone)
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return { client_id: data.client_id, contact_id: data.id, contact_name: data.name }
}

/**
 * Fetch a single contact by id (used when resuming a conversation).
 */
export async function getContactById(contactId: string): Promise<ClientContact | null> {
  const { data, error } = await supabaseAdmin
    .from('client_contacts')
    .select('id, client_id, name, role, phone_e164, email, is_primary, receives_sms, receives_email')
    .eq('id', contactId)
    .maybeSingle()

  if (error || !data) return null
  return data as ClientContact
}

/**
 * Create a primary contact row for a newly-inserted client.
 * Safe to call even when no phone/email were captured — it just no-ops.
 * `receives_sms` defaults ON when phone present (matches pre-existing sms_consent behavior).
 */
export async function createPrimaryContact(
  clientId: string,
  input: { name?: string | null; phone?: string | null; email?: string | null }
): Promise<void> {
  const phone_e164 = input.phone ? normalizePhone(input.phone) : null
  const email = input.email ? input.email.trim().toLowerCase() || null : null
  if (!phone_e164 && !email) return

  const now = new Date().toISOString()
  await supabaseAdmin.from('client_contacts').insert({  // tenant-scope-ok: nycmaid-legacy helper; retires with the standalone cutover
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

// ──────────────────────────────────────────────────────────────
// Fan-out helpers — every client-facing SMS/email send path calls these.
// They handle: do_not_service gate, per-channel opt-in, per-contact loop.
// ──────────────────────────────────────────────────────────────

type SmsOptions = {
  skipConsent?: boolean
  smsType?: string
  bookingId?: string
}

type EmailOptions = {
  attachments?: unknown[]
  bcc?: string | string[]
  skipOwnerBcc?: boolean
}

type SendResult = { sent: number; skipped: number }

/**
 * Zero-contact fan-out is a silent failure: the caller thought a client
 * comms event happened, but no one was reachable. We log it as comms_fail
 * so the comms-monitor cron (runs every 15 min) surfaces it.
 */
async function logZeroContactFanout(
  clientId: string,
  channel: Channel,
  eventType?: string,
  bookingId?: string
): Promise<void> {
  try {
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('name, do_not_service')
      .eq('id', clientId)
      .single()
    if (client?.do_not_service) return // DNS clients are intentionally skipped
    const clientName = client?.name || clientId
    const ctx = [
      `client=${clientName}`,
      eventType ? `type=${eventType}` : '',
      bookingId ? `booking=${bookingId}` : '',
    ].filter(Boolean).join(' | ')
    await supabaseAdmin.from('notifications').insert({  // tenant-scope-ok: nycmaid-legacy helper; retires with the standalone cutover
      type: 'comms_fail',
      title: `Zero ${channel} contacts for client`,
      message: `${channel} fan-out found no contacts — ${ctx}`,
    })
  } catch {
    // never throw from the logger
  }
}

/**
 * Send an SMS to every contact on this client that receives SMS.
 * Per-contact message allowed via `buildMessage(contact)` — primary-first order.
 * Returns count of sends + count of contacts skipped (no phone / opted out).
 */
export async function sendClientSMS(
  clientId: string,
  message: string | ((contact: ClientContact) => string),
  options: SmsOptions = {}
): Promise<SendResult> {
  const contacts = await getClientContacts(clientId, 'sms')
  if (contacts.length === 0) {
    await logZeroContactFanout(clientId, 'sms', options.smsType, options.bookingId)
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
    const result = await sendSMS(c.phone_e164, text, {
      skipConsent: options.skipConsent,
      recipientType: 'client',
      recipientId: clientId,
      smsType: options.smsType,
      bookingId: options.bookingId,
    })
    if (result.success) sent++
    else skipped++
  }
  return { sent, skipped }
}

/**
 * Send an email to every contact on this client that receives email.
 * Subject/html can be static or per-contact functions.
 */
export async function sendClientEmail(
  clientId: string,
  subject: string | ((contact: ClientContact) => string),
  html: string | ((contact: ClientContact) => string),
  options: EmailOptions = {}
): Promise<SendResult> {
  const contacts = await getClientContacts(clientId, 'email')
  if (contacts.length === 0) {
    await logZeroContactFanout(clientId, 'email')
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
      await sendEmail(
        c.email,
        subj,
        body,
        options.attachments as never[] | undefined,
        { bcc: options.bcc, skipOwnerBcc: options.skipOwnerBcc }
      )
      sent++
    } catch {
      skipped++
    }
  }
  return { sent, skipped }
}
