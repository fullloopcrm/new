import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@fullloopcrm.com'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(`mailto:${VAPID_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

async function sendToSubscriptions(subscriptions: { id: string; subscription: webpush.PushSubscription }[], title: string, body: string, url?: string, tag?: string) {
  const payload = JSON.stringify({ title, body, url: url || '/dashboard', tag: tag || 'notification' })

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

// Send push to all admins for a tenant (business owners/managers)
export async function sendPushToTenantAdmins(tenantId: string, title: string, body: string, url?: string, tag?: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('tenant_id', tenantId)
    .eq('role', 'admin')

  if (!subscriptions || subscriptions.length === 0) return
  await sendToSubscriptions(subscriptions, title, body, url, tag)
}

// Send push to a specific team member
export async function sendPushToTeamMember(teamMemberId: string, title: string, body: string, url?: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('team_member_id', teamMemberId)

  if (!subscriptions || subscriptions.length === 0) return
  await sendToSubscriptions(subscriptions, title, body, url || '/team/dashboard')
}

// Send push to a specific client
export async function sendPushToClient(clientId: string, title: string, body: string, url?: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('client_id', clientId)

  if (!subscriptions || subscriptions.length === 0) return
  await sendToSubscriptions(subscriptions, title, body, url || '/portal')
}

// Send push to all team members of a tenant
export async function sendPushToAllTeamMembers(tenantId: string, title: string, body: string, url?: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('tenant_id', tenantId)
    .eq('role', 'team_member')

  if (!subscriptions || subscriptions.length === 0) return
  await sendToSubscriptions(subscriptions, title, body, url || '/team/dashboard')
}

// Send push to platform super admin (you)
export async function sendPushToPlatformAdmin(title: string, body: string, url?: string, tag?: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('role', 'platform_admin')

  if (!subscriptions || subscriptions.length === 0) return
  await sendToSubscriptions(subscriptions, title, body, url || '/admin', tag)
}
