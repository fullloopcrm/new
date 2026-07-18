import { supabaseAdmin } from '@/lib/supabase'
import { sendPushToAll } from '@/lib/nycmaid/push'
import { notifyOwnerOnTelegram, sendTelegram } from '@/lib/telegram'
import { decryptSecret } from '@/lib/secret-crypto'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'

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

// Resolve the tenant: explicit arg wins, else the request's signed x-tenant-id
// header (the nycmaid request-scoped pattern). Returns null outside request
// scope (e.g. crons) — callers there should pass tenantId explicitly.
//
// The header must carry its middleware-minted x-tenant-sig companion — only
// middleware knows the signing secret, so an unsigned/forged x-tenant-id on a
// public main-host request (e.g. /api/yinez) would otherwise let an
// unauthenticated caller write notification rows and push a Telegram alert
// into ANY tenant's own bot just by setting a header, bypassing the same
// signature check every other tenant-resolution helper in this codebase
// enforces (see getTenantFromHeaders / getCurrentTenant).
async function resolveTenantId(explicit?: string): Promise<string | null> {
  if (explicit) return explicit
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    const tenantId = h.get('x-tenant-id')
    const sig = h.get('x-tenant-sig')
    return tenantId && verifyTenantHeaderSig(tenantId, sig) ? tenantId : null
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
