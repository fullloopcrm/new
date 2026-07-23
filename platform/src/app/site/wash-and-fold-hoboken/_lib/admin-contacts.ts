import { supabaseAdmin } from '@/app/site/wash-and-fold-hoboken/_lib/supabase'
import { sendEmail } from '@/app/site/wash-and-fold-hoboken/_lib/email'
import { sendSMS } from '@/app/site/wash-and-fold-hoboken/_lib/sms'

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
  if (contacts.length === 0) {
    // Fallback to env var if no admin users in DB
    const fallback = process.env.ADMIN_EMAIL
    if (fallback) await sendEmail(fallback, subject, html)
    return
  }

  await Promise.allSettled(
    contacts.map(c => sendEmail(c.email, subject, html))
  )
}

/**
 * SMS all active admin users who have a phone number (owner + admin role).
 * Used for 30-min alerts, inbound SMS forwarding, etc.
 */
export async function smsAdmins(message: string, roles?: string[]) {
  const contacts = await getAdminContacts(roles)
  const withPhone = contacts.filter(c => c.phone)

  if (withPhone.length === 0) {
    // Fallback to env var if no admin users have phone numbers
    const fallback = process.env.ADMIN_FORWARD_PHONE || '2122029220'
    await sendSMS(`+1${fallback}`, message, { skipConsent: true, smsType: 'admin_alert' })
    return
  }

  await Promise.allSettled(
    withPhone.map(c => {
      const phone = c.phone!.replace(/\D/g, '')
      return sendSMS(`+1${phone}`, message, { skipConsent: true, smsType: 'admin_alert' })
    })
  )
}

/**
 * Get all owner emails for BCC on outbound client/cleaner communications.
 * Returns array of email strings.
 */
export async function getOwnerBccEmails(): Promise<string[]> {
  const owners = await getOwnerContacts()
  return owners.map(o => o.email).filter(Boolean)
}
