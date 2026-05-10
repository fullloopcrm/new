import { supabaseAdmin } from '@/lib/supabase'
import { sendPushToAll } from '@/lib/nycmaid/push'
import { notifyOwnerOnTelegram } from '@/lib/telegram'

interface NotifyOptions {
  type: string
  title: string
  message: string
  booking_id?: string
  url?: string
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

export async function notify({ type, title, message, booking_id, url }: NotifyOptions) {
  try {
    const { error } = await supabaseAdmin.from('notifications').insert({
      type,
      title,
      message,
      booking_id: booking_id || null
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
      await notifyOwnerOnTelegram(text)
    } catch (err) {
      console.error('notify telegram failed:', err)
    }
  }
}
