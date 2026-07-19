// Voice MCP tool implementations — tenant-scoped port of nycmaid's
// src/lib/voice/mcp-tools.ts (commits f02c3fe4, 55d4ef65, b0d665cf,
// 61a97d0d, 4fd2fb64).
//
// The xAI Grok voice agent connects to our MCP server (see
// src/app/api/voice/mcp/[secret]/[transport]/route.ts) and calls these
// tools server-side. Every tool reuses the EXACT logic text-Yinez runs on
// SMS (src/lib/selena/core.ts's handleTool): we find-or-create an
// sms_conversations row keyed by the caller's phone (tenant-scoped, unlike
// nycmaid's single-tenant version), then dispatch through handleTool. That
// guarantees voice bookings, payments, lookups and escalations flow through
// the identical pipeline (pending bookings, memory, owner notifications) as
// every other channel, for whichever tenant owns the call.
import { supabaseAdmin } from '@/lib/supabase'
import { handleTool, EMPTY_CHECKLIST, type YinezResult } from '@/lib/selena/core'
import { checkAvailability } from '@/lib/availability'
import { sendSMS } from '@/lib/sms'
import { resolveTenantSmsCredentials } from '@/lib/sms-credentials'
import { tenantSiteUrl } from '@/lib/tenant-site'
import { logComhubVoiceMessage } from '@/lib/voice/comhub-log'

function normalizePhone(raw: string): string {
  return String(raw || '').replace(/\D/g, '')
}

function newResult(): YinezResult {
  return { text: '', checklist: { ...EMPTY_CHECKLIST } }
}

// Link the conversation to an existing client by matching the caller's
// phone (tenant-scoped), so read tools (lookup_client/lookup_bookings/
// check_payment) recognize returning callers. Without this a fresh voice
// conversation has no client_id and the handlers return "No account" even
// when the client exists. Port of nycmaid's 55d4ef65 fix.
async function linkClientByPhone(tenantId: string, conversationId: string, clean: string): Promise<void> {
  const { data: convo } = await supabaseAdmin
    .from('sms_conversations')
    .select('client_id')
    .eq('id', conversationId)
    .eq('tenant_id', tenantId)
    .single()
  if (convo?.client_id) return
  const last10 = clean.slice(-10)
  if (last10.length !== 10) return
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('phone', `%${last10}%`)
    .limit(1)
    .maybeSingle()
  if (client?.id) {
    await supabaseAdmin
      .from('sms_conversations')
      .update({ client_id: client.id })
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
  }
}

// Find-or-create a voice conversation for this caller (scoped to the
// tenant that owns the call — resolved by the MCP route from the caller's
// voice_mcp_token) so a single call's tool invocations (lookup ->
// create_booking) share one conversation, and so handleTool (which keys
// off a conversationId) works unchanged.
export async function getOrCreateVoiceConversation(tenantId: string, phone: string): Promise<string> {
  const clean = normalizePhone(phone)
  if (clean.length < 10) throw new Error('valid caller_phone required')

  const { data: recent } = await supabaseAdmin
    .from('sms_conversations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('phone', clean)
    .eq('state', 'voice')
    .is('outcome', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (recent?.id) {
    await linkClientByPhone(tenantId, recent.id, clean)
    return recent.id
  }

  const { data: created, error } = await supabaseAdmin
    .from('sms_conversations')
    .insert({
      tenant_id: tenantId,
      phone: clean,
      state: 'voice',
      booking_checklist: { ...EMPTY_CHECKLIST, channel: 'voice', phone: clean },
    })
    .select('id')
    .single()
  if (error || !created) {
    throw new Error(`voice conversation create failed: ${error?.message || 'no row returned'}`)
  }
  await linkClientByPhone(tenantId, created.id, clean)
  return created.id
}

export async function voiceLookupClient(tenantId: string, phone: string): Promise<string> {
  const convId = await getOrCreateVoiceConversation(tenantId, phone)
  return handleTool('get_account', {}, convId, newResult(), tenantId)
}

export async function voiceLookupBookings(tenantId: string, phone: string): Promise<string> {
  const convId = await getOrCreateVoiceConversation(tenantId, phone)
  return handleTool('lookup_bookings', {}, convId, newResult(), tenantId)
}

// General open-slots check for a date (src/lib/availability.ts's
// checkAvailability, already tenant-scoped). nycmaid additionally called
// getSmartSuggestions() when no slots were free; this codebase's equivalent
// (suggestBookingSlots in lib/nycmaid/smart-schedule.ts) requires a client
// address as input, which a first-time caller usually hasn't given yet — so
// that enrichment is intentionally left out here rather than guessed.
export async function voiceCheckAvailability(
  tenantId: string,
  date: string,
  durationHours = 2,
): Promise<string> {
  const res = await checkAvailability(tenantId, date, durationHours)
  return JSON.stringify({ date, ...res })
}

export async function voiceCreateBooking(
  tenantId: string,
  phone: string,
  input: Record<string, unknown>,
): Promise<string> {
  const convId = await getOrCreateVoiceConversation(tenantId, phone)
  const out = await handleTool('create_booking', input, convId, newResult(), tenantId)
  if (out.includes('"success":true') || out.includes('bookingId')) {
    const svc = (input.service_type as string) || 'cleaning'
    await logComhubVoiceMessage(
      tenantId,
      phone,
      `📞 Booked ${svc} on ${input.date ?? '?'} at ${input.time ?? '?'} ($${input.hourly_rate ?? '?'}/hr) — pending, needs confirm`,
    )
  }
  return out
}

export async function voiceCheckPayment(tenantId: string, phone: string): Promise<string> {
  const convId = await getOrCreateVoiceConversation(tenantId, phone)
  return handleTool('check_payment', {}, convId, newResult(), tenantId)
}

export async function voiceLogEscalation(
  tenantId: string,
  phone: string,
  input: Record<string, unknown>,
): Promise<string> {
  const convId = await getOrCreateVoiceConversation(tenantId, phone)
  const out = await handleTool('request_callback', input, convId, newResult(), tenantId)
  const reason = (input.reason as string) || 'callback'
  const details = input.details ? ` — ${String(input.details).slice(0, 140)}` : ''
  await logComhubVoiceMessage(tenantId, phone, `⚠️ Escalated: ${reason}${details}`)
  return out
}

export async function voiceGetQuote(tenantId: string, input: Record<string, unknown>): Promise<string> {
  return handleTool('get_quote', input, '', newResult(), tenantId)
}

// Actually TEXT the caller the booking link when Yinez says "I'll text you
// the link." Sends via the tenant's own Telnyx SMS credentials (the generic
// tenant-scoped sendSMS, not nycmaid's single-tenant one) — a tenant with no
// Telnyx configured can't send, so this reports that instead of silently
// no-op'ing. The link itself is resolved from the tenant's own site domain
// (tenantSiteUrl) rather than trusting the voice model to supply a URL, so
// a hallucinated/wrong domain can never be texted out. Also logs the send
// to the caller's ComHub thread.
export async function voiceSendBookingLink(tenantId: string, phone: string): Promise<string> {
  const clean = normalizePhone(phone)
  if (clean.length < 10) return JSON.stringify({ error: 'valid caller_phone required' })

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, domain, slug, telnyx_api_key, telnyx_phone, sms_number')
    .eq('id', tenantId)
    .single()
  if (!tenant) return JSON.stringify({ error: 'tenant not found' })

  const creds = resolveTenantSmsCredentials(tenant)
  if (!creds.apiKey || !creds.phone) {
    return JSON.stringify({ error: 'SMS not configured for this business — cannot text the link' })
  }

  const siteUrl = await tenantSiteUrl(tenant)
  if (!siteUrl) return JSON.stringify({ error: 'no site domain configured for this business' })

  const body = `Here's your booking link — book online: ${siteUrl}/book/new`
  try {
    await sendSMS({ to: clean, body, telnyxApiKey: creds.apiKey, telnyxPhone: creds.phone })
    await logComhubVoiceMessage(tenantId, phone, '💬 Texted booking link')
    return JSON.stringify({ success: true, sent: true })
  } catch (err) {
    return JSON.stringify({ error: `text failed: ${err instanceof Error ? err.message : String(err)}` })
  }
}

// Capture the caller as a lead the moment we have a name + number — even if
// they never book. Creates a client (status 'potential') or updates the
// name/email on a matched existing one. Port of nycmaid's 61a97d0d.
export async function voiceSaveCaller(
  tenantId: string,
  phone: string,
  name: string,
  email?: string,
): Promise<string> {
  const clean = normalizePhone(phone)
  if (clean.length < 10) return JSON.stringify({ error: 'valid caller_phone required' })
  const trimmedName = (name || '').trim()

  const convId = await getOrCreateVoiceConversation(tenantId, phone)
  const { data: convo } = await supabaseAdmin
    .from('sms_conversations')
    .select('client_id')
    .eq('id', convId)
    .eq('tenant_id', tenantId)
    .single()

  if (convo?.client_id) {
    const update: Record<string, unknown> = {}
    if (trimmedName) update.name = trimmedName
    if (email && email.trim()) update.email = email.trim()
    if (Object.keys(update).length > 0) {
      await supabaseAdmin.from('clients').update(update).eq('id', convo.client_id).eq('tenant_id', tenantId)
    }
    return JSON.stringify({ success: true, existing: true })
  }

  if (!trimmedName) return JSON.stringify({ error: 'need the caller name to save the lead' })
  const pin = Math.floor(100000 + Math.random() * 900000).toString()
  const { data: newClient, error } = await supabaseAdmin
    .from('clients')
    .insert({
      tenant_id: tenantId,
      name: trimmedName,
      phone: clean,
      email: email && email.trim() ? email.trim() : null,
      status: 'potential',
      pin,
    })
    .select('id')
    .single()
  if (error || !newClient) {
    return JSON.stringify({ error: `save failed: ${error?.message || 'no row'}` })
  }
  await supabaseAdmin
    .from('sms_conversations')
    .update({ client_id: newClient.id, name: trimmedName })
    .eq('id', convId)
    .eq('tenant_id', tenantId)
  await logComhubVoiceMessage(tenantId, phone, `🙋 New lead saved: ${trimmedName}`)
  return JSON.stringify({ success: true, created: true })
}

// Save a call note to the caller's record (access instructions, allergies,
// gate codes, preferences). Reuses the same yinez_memory store text-Yinez
// writes to, so notes surface in the client's context on every future
// conversation/channel.
export async function voiceSaveNote(
  tenantId: string,
  phone: string,
  note: string,
  type = 'instruction',
): Promise<string> {
  const convId = await getOrCreateVoiceConversation(tenantId, phone)
  const out = await handleTool('remember', { type, content: note }, convId, newResult(), tenantId)
  await logComhubVoiceMessage(tenantId, phone, `📝 Note saved: ${note.slice(0, 160)}`)
  return out
}
