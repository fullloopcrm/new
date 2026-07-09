import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/nycmaid/email'
import { notifyOwnerOnTelegram } from '@/lib/telegram'
import { sendSMS } from '@/lib/nycmaid/sms'

interface AdminContact {
  email: string
  phone: string | null
  name: string
  role: string
}

/**
 * Get all active admin users, optionally filtered by role.
 * Default: returns owner + admin roles (the people who need ops notifications).
 */
export async function getAdminContacts(roles: string[] = ['owner', 'admin']): Promise<AdminContact[]> {
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('email, phone, name, role')
    .in('role', roles)
    .eq('status', 'active')

  if (error) {
    console.error('getAdminContacts error:', error)
    return []
  }

  return data || []
}

/**
 * Get owner contact(s) only.
 */
export async function getOwnerContacts(): Promise<AdminContact[]> {
  return getAdminContacts(['owner'])
}

/**
 * Email all active admin users (owner + admin role).
 * Used for ops notifications: new bookings, job completions, applications, etc.
 */
export async function emailAdmins(subject: string, html: string, roles?: string[]) {
  const contacts = await getAdminContacts(roles)
  const recipients: string[] = []
  if (contacts.length === 0) {
    // Fallback to env var if no admin users in DB
    const fallback = process.env.ADMIN_EMAIL
    if (fallback) {
      recipients.push(fallback)
      await sendEmail(fallback, subject, html)
    }
  } else {
    await Promise.allSettled(
      contacts.map(c => {
        recipients.push(c.email)
        return sendEmail(c.email, subject, html)
      })
    )
  }

  // Make admin emails visible in email_logs so monitoring can verify delivery
  try {
    const rows = recipients.map(r => ({
      email_type: 'admin_alert',
      recipient: r,
      // email_logs.booking_id is nullable; leave null for admin-scoped sends
    }))
    if (rows.length > 0) {
      await supabaseAdmin.from('email_logs').insert(rows)  // tenant-scope-ok: nycmaid-legacy helper; retires with the standalone cutover
    }
  } catch {
    // never throw from the logger
  }
}

/**
 * SMS all active admin users who have a phone number (owner + admin role).
 * Used for 30-min alerts, inbound SMS forwarding, etc.
 */
export async function smsAdmins(message: string, _roles?: string[]) {
  // Try Telegram first (preferred — keeps SMS volume down). If the bot is dead
  // or returns non-ok, fall back to actual SMS to active admin phones so alerts
  // never get silently dropped (the bot token went bad once and admin missed
  // weeks of payment confirmations).
  const tg = await notifyOwnerOnTelegram(`[admin alert]\n${message}`).catch(() => null)
  if (tg && tg.ok) return

  const contacts = await getAdminContacts()
  const phones = contacts.map(c => c.phone).filter((p): p is string => !!p)
  if (phones.length === 0) {
    const fallback = (process.env.ADMIN_PHONE || process.env.OWNER_PHONES || '').split(',').map(s => s.trim()).filter(Boolean)
    phones.push(...fallback)
  }
  await Promise.allSettled(phones.map(p => sendSMS(p, message, { skipConsent: true, smsType: 'admin_alert' })))
}

/**
 * Get all owner emails for BCC on outbound client/cleaner communications.
 * Returns array of email strings.
 */
export async function getOwnerBccEmails(): Promise<string[]> {
  const owners = await getOwnerContacts()
  return owners.map(o => o.email).filter(Boolean)
}
