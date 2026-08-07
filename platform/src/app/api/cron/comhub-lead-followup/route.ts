/**
 * One-time "just following up" nudge for ComHub contacts who reached out and
 * never became a client (Jeff, 2026-08-07). Deliberately NOT a drip campaign
 * — one message, ever, per contact:
 *
 *   1. They reached out (comhub_contacts has at least one thread/message).
 *   2. We reviewed it (the latest inbound message has read_at set, or we
 *      already replied — either way the ball isn't sitting unread on our side).
 *   3. They didn't respond (24h+ since the thread's last message, nothing
 *      from them since).
 *
 * Sent via whichever channel they originally reached out on (sms or email —
 * web/internal threads are skipped, there's no way to reach a webchat
 * visitor asynchronously without a phone/email on file). Idempotent via
 * comhub_contacts.followup_sent_at (migration 20260807172632) — set once,
 * never re-sent to that contact by this cron again.
 *
 * Scoped to NYC Maid + Florida Maid only for now (Jeff's explicit call,
 * 2026-08-07) — hardcoded tenant allowlist rather than a per-tenant setting,
 * matching how other features have soft-launched on these two tenants
 * before going global.
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendComhubMessage, type ComhubSendTenant } from '@/lib/comhub-send'
import { isPlaceholderName } from '@/lib/comhub-contact-resolve'

export const maxDuration = 120

const ALLOWED_TENANT_IDS = [
  '00000000-0000-0000-0000-000000000001', // The NYC Maid
  '56490a6b-820c-49e6-8c14-cb4e54ffcb06', // The Florida Maid
]

const FOLLOWUP_DELAY_MS = 24 * 60 * 60 * 1000
const ELIGIBLE_TAGS = ['lead', 'potential_lead']

function followupCopy(name: string | null, phone: string | null): string {
  const greetName = name && !isPlaceholderName(name, phone) ? name.split(' ')[0] : null
  return greetName
    ? `Hey ${greetName}, just following up on your message — still interested?`
    : `Hey, just following up on your message — still interested?`
}

interface ContactRow {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  client_id: string | null
  tag: string | null
}

interface ThreadRow {
  id: string
  contact_id: string
  channel: string
  last_message_at: string | null
  archived_at: string | null
}

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  let totalSent = 0
  const perTenant: Record<string, number> = {}
  const errors: string[] = []

  for (const tenantId of ALLOWED_TENANT_IDS) {
    const { data: tenantRow } = await supabaseAdmin
      .from('tenants')
      .select('name, phone, email, address, logo_url, primary_color, telnyx_api_key, telnyx_phone, resend_api_key, email_from')
      .eq('id', tenantId)
      .maybeSingle()
    if (!tenantRow) continue

    const sent = await processTenant(tenantId, tenantRow as ComhubSendTenant, errors)
    if (sent > 0) {
      perTenant[tenantId] = sent
      totalSent += sent
    }
  }

  return NextResponse.json({ success: true, sent: totalSent, perTenant, errors })
}

async function processTenant(tenantId: string, tenant: ComhubSendTenant, errors: string[]): Promise<number> {
  const { data: rawContacts } = await supabaseAdmin
    .from('comhub_contacts')
    .select('id, name, phone, email, client_id, tag')
    .eq('tenant_id', tenantId)
    .in('tag', ELIGIBLE_TAGS)
    .is('client_id', null)
    .is('followup_sent_at', null)
  const contacts = (rawContacts as ContactRow[] | null) || []
  if (contacts.length === 0) return 0

  const contactIds = contacts.map(c => c.id)
  const { data: rawThreads } = await supabaseAdmin
    .from('comhub_threads')
    .select('id, contact_id, channel, last_message_at, archived_at')
    .eq('tenant_id', tenantId)
    .in('contact_id', contactIds)
    .in('channel', ['sms', 'email'])
    .is('archived_at', null)
  const threads = (rawThreads as ThreadRow[] | null) || []
  if (threads.length === 0) return 0

  const threadsByContact = new Map<string, ThreadRow[]>()
  for (const t of threads) {
    const list = threadsByContact.get(t.contact_id) || []
    list.push(t)
    threadsByContact.set(t.contact_id, list)
  }

  const cutoff = Date.now() - FOLLOWUP_DELAY_MS
  let sent = 0

  for (const contact of contacts) {
    const contactThreads = threadsByContact.get(contact.id)
    if (!contactThreads || contactThreads.length === 0) continue

    // Most recently active thread decides eligibility — if they reached out
    // on more than one channel, whichever they touched last is the one that
    // matters for "have they gone quiet".
    const thread = contactThreads.reduce((a, b) =>
      new Date(a.last_message_at || 0).getTime() >= new Date(b.last_message_at || 0).getTime() ? a : b)
    if (!thread.last_message_at) continue
    if (new Date(thread.last_message_at).getTime() > cutoff) continue // not 24h yet

    const { data: lastMsg } = await supabaseAdmin
      .from('comhub_messages')
      .select('direction, read_at')
      .eq('tenant_id', tenantId)
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!lastMsg) continue
    // Still sitting unread and inbound → not "reviewed" yet, don't nudge on our own silence.
    if (lastMsg.direction === 'in' && !lastMsg.read_at) continue

    const channel = thread.channel === 'sms' ? 'sms' : 'email'
    if (channel === 'sms' && !contact.phone) continue
    if (channel === 'email' && !contact.email) continue

    const result = await sendComhubMessage(
      tenantId, tenant,
      { contact_id: contact.id, channel, body: followupCopy(contact.name, contact.phone), subject: 'Just following up' },
      'Automated follow-up', null,
    )
    if (result.status !== 200) {
      errors.push(`${tenantId}/${contact.id}: ${JSON.stringify(result.json)}`)
      continue
    }

    await supabaseAdmin
      .from('comhub_contacts')
      .update({ followup_sent_at: new Date().toISOString() })
      .eq('id', contact.id)
      .eq('tenant_id', tenantId)
    sent++
  }

  return sent
}
