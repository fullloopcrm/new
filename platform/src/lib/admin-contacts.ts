/**
 * Admin-contacts — tenant-aware replacement for nycmaid's admin-contacts.ts.
 *
 * Returns and notifies "admin" contacts for a tenant:
 *   - tenant_members rows with role owner/admin (explicit admin users)
 *   - falls back to tenant.email / tenant.phone when no members have those
 *   - final fallback to env (ADMIN_EMAIL / ADMIN_FORWARD_PHONE) if neither exists
 *
 * Public API is shaped the same as nycmaid for mechanical porting, BUT every
 * function now requires a `tenant` (or tenantId) so the multi-tenant boundary
 * is never violated.
 */
import { supabaseAdmin } from './supabase'
import { sendEmail } from './email'
import { sendSMS } from './sms'
import type { Tenant } from './tenant'

export interface AdminContact {
  email: string | null
  phone: string | null
  name: string | null
  role: string
}

type TenantLike = Pick<Tenant, 'id' | 'name' | 'email' | 'phone' | 'resend_api_key' | 'telnyx_api_key' | 'telnyx_phone' | 'email_from'> | { id: string }

async function loadTenant(input: TenantLike | string): Promise<TenantLike | null> {
  if (typeof input === 'string') {
    const { data } = await supabaseAdmin
      .from('tenants')
      .select('id, name, email, phone, resend_api_key, telnyx_api_key, telnyx_phone, email_from')
      .eq('id', input)
      .single()
    return data
  }
  // If caller passed a partial tenant with just id, hydrate it
  const anyT = input as Record<string, unknown>
  if (anyT.email === undefined || anyT.phone === undefined || anyT.telnyx_api_key === undefined) {
    const { data } = await supabaseAdmin
      .from('tenants')
      .select('id, name, email, phone, resend_api_key, telnyx_api_key, telnyx_phone, email_from')
      .eq('id', anyT.id as string)
      .single()
    return data
  }
  return input as TenantLike
}

/**
 * Get admin contacts for a tenant. Returns tenant_members with role owner/admin
 * (or caller-specified roles). If none, synthesizes one from tenant.email/phone.
 */
export async function getAdminContacts(
  tenantOrId: TenantLike | string,
  roles: string[] = ['owner', 'admin'],
): Promise<AdminContact[]> {
  const tenant = await loadTenant(tenantOrId)
  if (!tenant) return []

  const tenantId = (tenant as TenantLike).id

  const { data, error } = await supabaseAdmin
    .from('tenant_members')
    .select('email, role, name, phone')
    .eq('tenant_id', tenantId)
    .in('role', roles)

  if (error) {
    console.error('[admin-contacts] getAdminContacts error:', error)
  }

  const members: AdminContact[] = (data || []).map((row: Record<string, unknown>) => ({
    email: (row.email as string) || null,
    phone: (row.phone as string) || null,
    name: (row.name as string) || null,
    role: (row.role as string) || 'admin',
  }))

  // If no tenant_members, synthesize from tenant record
  if (members.length === 0) {
    const t = tenant as TenantLike & { email?: string | null; phone?: string | null }
    if (t.email || t.phone) {
      return [{ email: t.email ?? null, phone: t.phone ?? null, name: null, role: 'owner' }]
    }
  }

  return members
}

/**
 * Owner-only contacts.
 */
export async function getOwnerContacts(tenantOrId: TenantLike | string): Promise<AdminContact[]> {
  return getAdminContacts(tenantOrId, ['owner'])
}

/**
 * Email every admin for a tenant. Uses tenant.resend_api_key / tenant.email_from
 * when set; falls back to platform defaults via sendEmail.
 */
export async function emailAdmins(
  tenantOrId: TenantLike | string,
  subject: string,
  html: string,
  roles?: string[],
): Promise<void> {
  const tenant = await loadTenant(tenantOrId)
  if (!tenant) return

  const contacts = await getAdminContacts(tenant, roles)
  const withEmail = contacts.filter(c => c.email && c.email.trim().length > 0)

  const t = tenant as TenantLike
  const resendKey = (t as { resend_api_key?: string | null }).resend_api_key || null
  const from = (t as { email_from?: string | null }).email_from || undefined

  if (withEmail.length === 0) {
    // Fallback to ADMIN_EMAIL env var (platform-level) — last resort only
    const fallback = process.env.ADMIN_EMAIL
    if (fallback) {
      await sendEmail({ to: fallback, subject, html, from, resendApiKey: resendKey }).catch(err =>
        console.error('[admin-contacts] fallback ADMIN_EMAIL send failed:', err),
      )
    }
    return
  }

  await Promise.allSettled(
    withEmail.map(c =>
      sendEmail({ to: c.email!, subject, html, from, resendApiKey: resendKey }),
    ),
  )
}

/**
 * SMS every admin with a phone for a tenant. Uses tenant Telnyx keys.
 */
export async function smsAdmins(
  tenantOrId: TenantLike | string,
  message: string,
  roles?: string[],
): Promise<void> {
  const tenant = await loadTenant(tenantOrId)
  if (!tenant) return

  const t = tenant as TenantLike & { telnyx_api_key?: string | null; telnyx_phone?: string | null }
  const telnyxKey = t.telnyx_api_key || null
  const telnyxPhone = t.telnyx_phone || null
  if (!telnyxKey || !telnyxPhone) {
    console.warn('[admin-contacts] smsAdmins: tenant missing Telnyx config, skipping')
    return
  }

  const contacts = await getAdminContacts(tenant, roles)
  const withPhone = contacts.filter(c => c.phone && c.phone.trim().length > 0)

  if (withPhone.length === 0) {
    const fallback = process.env.ADMIN_FORWARD_PHONE
    if (fallback) {
      await sendSMS({
        to: fallback.startsWith('+') ? fallback : `+1${fallback.replace(/\D/g, '')}`,
        body: message,
        telnyxApiKey: telnyxKey,
        telnyxPhone,
      }).catch(err => console.error('[admin-contacts] fallback ADMIN_FORWARD_PHONE send failed:', err))
    }
    return
  }

  await Promise.allSettled(
    withPhone.map(c => {
      const phone = (c.phone as string).replace(/\D/g, '')
      return sendSMS({
        to: phone.startsWith('1') ? `+${phone}` : `+1${phone}`,
        body: message,
        telnyxApiKey: telnyxKey,
        telnyxPhone,
      })
    }),
  )
}

/**
 * Get all owner emails for BCC on outbound client/team communications.
 */
export async function getOwnerBccEmails(tenantOrId: TenantLike | string): Promise<string[]> {
  const owners = await getOwnerContacts(tenantOrId)
  return owners.map(o => o.email).filter((x): x is string => !!x)
}
