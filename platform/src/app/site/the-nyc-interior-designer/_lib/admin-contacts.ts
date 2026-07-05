import { supabaseAdmin } from '@/app/site/the-nyc-interior-designer/_lib/supabase'
import { sendEmail } from '@/app/site/the-nyc-interior-designer/_lib/email'

interface AdminContact {
  email: string
  phone: string | null
  name: string
  role: string
}

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

export async function getOwnerContacts(): Promise<AdminContact[]> {
  return getAdminContacts(['owner'])
}

export async function emailAdmins(subject: string, html: string, roles?: string[]) {
  const contacts = await getAdminContacts(roles)
  if (contacts.length === 0) {
    const fallback = process.env.ADMIN_EMAIL
    if (fallback) await sendEmail(fallback, subject, html)
    return
  }

  await Promise.allSettled(
    contacts.map(c => sendEmail(c.email, subject, html))
  )
}

export async function getOwnerBccEmails(): Promise<string[]> {
  const owners = await getOwnerContacts()
  return owners.map(o => o.email).filter(Boolean)
}
