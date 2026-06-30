import { supabaseAdmin } from '@/lib/supabase'
import { sendPushToAll } from '@/lib/nycmaid/push'
import { notifyOwnerOnTelegram, sendTelegram } from '@/lib/telegram'
import { decryptSecret } from '@/lib/secret-crypto'

interface NotifyOptions {
  type: string
  title: string
  message: string
  booking_id?: string
  url?: string
  tenantId?: string
}

// Operational event types that Jeff wants pushed to Telegram.
// Security/login chatter and unsubscribe noise stay dashboard-only.
const TELEGRAM_NOTIFY_TYPES = new Set<string>([
  'new_lead',
  'new_booking',
  'sms_reply',
  'owner_sms',
  'booking_confirmed_by_client',
  'job_complete',
  'check_in',
  'escalation',
  'callback_requested',
  'escalation_locked_inbound',
  'low_rating',
  'comms_fail',
  'yinez_error',
  'running_late',
  'payment_received',
  'cleaner_paid',
  'tip_paid',
])

// Resolve the tenant: explicit arg wins, else the request's x-tenant-id header
// (the nycmaid request-scoped pattern). Returns null outside request scope
// (e.g. crons) — callers there should pass tenantId explicitly.
async function resolveTenantId(explicit?: string): Promise<string | null> {
  if (explicit) return explicit
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    return h.get('x-tenant-id') || null
  } catch {
    return null
  }
}

// Per-tenant Telegram: post to the tenant's OWN bot when configured, else fall
// back to the global platform bot (backward-compatible with pre-multitenant).
async function sendTenantTelegram(tenantId: string | null, text: string): Promise<void> {
  if (tenantId) {
    const { data: t } = await supabaseAdmin
      .from('tenants')
      .select('telegram_bot_token, telegram_chat_id')
      .eq('id', tenantId)
      .single()
    if (t?.telegram_bot_token && t?.telegram_chat_id) {
      const botToken = decryptSecret(t.telegram_bot_token as string)
      await sendTelegram(t.telegram_chat_id as string, text, botToken)
      return
    }
  }
  await notifyOwnerOnTelegram(text)
}

export async function notify({ type, title, message, booking_id, url, tenantId }: NotifyOptions) {
  const tid = await resolveTenantId(tenantId)

  try {
    const { error } = await supabaseAdmin.from('notifications').insert({
      type,
      title,
      message,
      booking_id: booking_id || null,
      ...(tid ? { tenant_id: tid } : {}),
    })
    if (error) console.error('notify insert failed:', error)
  } catch (err) {
    console.error('notify insert exception:', err)
  }

  try {
    await sendPushToAll(title, message, url)
  } catch (err) {
    console.error('notify push failed:', err)
  }

  if (TELEGRAM_NOTIFY_TYPES.has(type)) {
    try {
      const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.thenycmaid.com').replace(/\/$/, '')
      const link = url
        ? (url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`)
        : null
      const text = `${title}\n\n${message}${link ? `\n\n${link}` : ''}`
      await sendTenantTelegram(tid, text)
    } catch (err) {
      console.error('notify telegram failed:', err)
    }
  }
}
