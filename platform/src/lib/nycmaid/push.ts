import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_EMAIL = process.env.ADMIN_EMAIL || 'admin@thenycmaid.com'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(`mailto:${VAPID_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

async function sendToSubscriptions(subscriptions: { id: string; subscription: webpush.PushSubscription }[], title: string, body: string, url?: string, tag?: string) {
  const payload = JSON.stringify({ title, body, url: url || '/admin', tag: tag || 'notification' })

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub.subscription, payload)
    } catch (err: unknown) {
      const error = err as { statusCode?: number }
      if (error.statusCode === 410 || error.statusCode === 404) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }
}

export async function sendPushToAll(title: string, body: string, url?: string, tag?: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('role', 'admin')

  if (!subscriptions || subscriptions.length === 0) return
  await sendToSubscriptions(subscriptions, title, body, url, tag)
}

export async function sendPushToCleaner(cleanerId: string, title: string, body: string, url?: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('cleaner_id', cleanerId)

  if (!subscriptions || subscriptions.length === 0) return
  await sendToSubscriptions(subscriptions, title, body, url || '/team/dashboard')
}

export async function sendPushToClient(clientId: string, title: string, body: string, url?: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('client_id', clientId)

  if (!subscriptions || subscriptions.length === 0) return
  await sendToSubscriptions(subscriptions, title, body, url || '/book/dashboard')
}

export async function sendPushToAllCleaners(title: string, body: string, url?: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('role', 'cleaner')

  if (!subscriptions || subscriptions.length === 0) return
  await sendToSubscriptions(subscriptions, title, body, url || '/team/dashboard')
}
