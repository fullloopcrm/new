/**
 * Voice MCP tool implementations for a tenant's CUSTOMER-facing xAI Grok voice
 * agent (Yinez on the phone) — as opposed to src/lib/voice-agent/tools.ts,
 * which is FullLoop's own prospect-qualification line.
 *
 * Ported from the standalone NYC Maid build (src/lib/voice/mcp-tools.ts).
 * Every tool reuses the EXACT logic text-Yinez runs on SMS/web: find-or-create
 * an sms_conversations row keyed by the caller's phone (now tenant-scoped),
 * then dispatch through the same handleTool() in lib/selena/core.ts. That
 * guarantees voice bookings, payments, lookups and escalations flow through
 * the identical pipeline (pending bookings, memory, owner notifications) as
 * every other channel — global code, not a nycmaid fork.
 */

import { supabaseAdmin } from '@/lib/supabase'
import { handleTool, type YinezResult, EMPTY_CHECKLIST } from '@/lib/selena/core'
import { checkAvailability } from '@/lib/availability'
import { getSmartSuggestions } from '@/lib/nycmaid/availability'
import { sendSMS } from '@/lib/sms'
import { tenantSiteUrl } from '@/lib/tenant-site'

function normalizePhone(raw: string): string {
  return String(raw || '').replace(/\D/g, '')
}

function newResult(): YinezResult {
  return { text: '', checklist: { ...EMPTY_CHECKLIST } }
}

// Link an existing client by phone so read tools (lookup_client/lookup_bookings/
// check_payment) recognize returning callers — without this, a fresh voice
// conversation has no client_id and the handlers report "no account" even when
// the client exists.
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

// Find-or-create a voice conversation for this caller/tenant so a single
// call's tool invocations (lookup -> create_booking) share one conversation.
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

// Log an action event (booking, escalation, note) to the caller's ComHub voice
// thread so the team sees what Yinez did on the call in real time. Best-effort
// ONLY: a ComHub failure must never break a live call.
export async function logVoiceEventToComhub(tenantId: string, phone: string, body: string): Promise<void> {
  try {
    const clean = normalizePhone(phone)
    if (clean.length < 10) return
    const { data: cId } = await supabaseAdmin.rpc('comhub_get_or_create_contact_by_phone', {
      p_tenant_id: tenantId,
      p_phone: clean,
    })
    if (!cId) return
    const contactId = cId as string
    const { data: tId } = await supabaseAdmin.rpc('comhub_get_or_create_thread', {
      p_tenant_id: tenantId,
      p_contact_id: contactId,
      p_channel: 'voice',
    })
    if (!tId) return
    const threadId = tId as string
    const now = new Date().toISOString()
    await supabaseAdmin.from('comhub_messages').insert({
      tenant_id: tenantId,
      thread_id: threadId,
      contact_id: contactId,
      channel: 'voice',
      direction: 'system',
      author: 'yinez',
      body,
      sent_at: now,
    })
    await supabaseAdmin
      .from('comhub_threads')
      .update({ last_message_at: now, last_message_preview: body.slice(0, 120), updated_at: now })
      .eq('id', threadId)
      .eq('tenant_id', tenantId)
  } catch {
    // swallow — comhub logging is never allowed to break a live call
  }
}

export async function voiceLookupClient(tenantId: string, phone: string): Promise<string> {
  const convId = await getOrCreateVoiceConversation(tenantId, phone)
  return handleTool('get_account', {}, convId, newResult(), tenantId)
}

export async function voiceLookupBookings(tenantId: string, phone: string): Promise<string> {
  const convId = await getOrCreateVoiceConversation(tenantId, phone)
  return handleTool('lookup_bookings', {}, convId, newResult(), tenantId)
}

export async function voiceCheckAvailability(
  tenantId: string,
  date: string,
  durationHours = 2,
): Promise<string> {
  const res = await checkAvailability(tenantId, date, durationHours)
  const suggestions = res.slots && res.slots.length > 0
    ? []
    : await getSmartSuggestions(tenantId, date, durationHours)
  return JSON.stringify({ date, ...res, suggestions })
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
    await logVoiceEventToComhub(
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
  await logVoiceEventToComhub(tenantId, phone, `⚠️ Escalated: ${reason}${details}`)
  return out
}

export async function voiceGetQuote(input: Record<string, unknown>): Promise<string> {
  return handleTool('get_quote', input, '', newResult())
}

// Actually TEXT the caller the booking link when Yinez says "I'll text you the
// link." Sends via the tenant's own Telnyx credentials — same as every other
// SMS path in this codebase, no platform-wide fallback number.
export async function voiceSendBookingLink(tenantId: string, phone: string): Promise<string> {
  const clean = normalizePhone(phone)
  if (clean.length < 10) return JSON.stringify({ error: 'valid caller_phone required' })

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name, domain, slug, telnyx_api_key, telnyx_phone')
    .eq('id', tenantId)
    .single()
  if (!tenant?.telnyx_api_key || !tenant?.telnyx_phone) {
    return JSON.stringify({ error: 'SMS not configured for this tenant' })
  }

  const bookUrl = `${tenantSiteUrl(tenant)}/book/new`
  const body = `Here's your ${tenant.name} booking link: ${bookUrl}`
  try {
    await sendSMS({
      to: clean,
      body,
      telnyxApiKey: tenant.telnyx_api_key,
      telnyxPhone: tenant.telnyx_phone,
    })
    await logVoiceEventToComhub(tenantId, phone, '💬 Texted booking link')
    return JSON.stringify({ success: true, sent: true })
  } catch (err) {
    return JSON.stringify({ error: `text failed: ${err instanceof Error ? err.message : String(err)}` })
  }
}

// Capture the caller as a lead the moment we have a name + number — even if
// they never book. Creates a client (status 'potential') or updates the
// name/email on a matched existing one.
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
  await logVoiceEventToComhub(tenantId, phone, `🙋 New lead saved: ${trimmedName}`)
  return JSON.stringify({ success: true, created: true })
}

// Save a call note (access instructions, allergies, gate codes, preferences)
// via the same `remember` store text-Yinez writes to.
export async function voiceSaveNote(
  tenantId: string,
  phone: string,
  note: string,
  type = 'instruction',
): Promise<string> {
  const convId = await getOrCreateVoiceConversation(tenantId, phone)
  const out = await handleTool('remember', { type, content: note }, convId, newResult(), tenantId)
  await logVoiceEventToComhub(tenantId, phone, `📝 Note saved: ${note.slice(0, 160)}`)
  return out
}
