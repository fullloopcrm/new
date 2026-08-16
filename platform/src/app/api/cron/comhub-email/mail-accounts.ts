import { supabaseAdmin } from '@/lib/supabase'
import { decryptSecret } from '@/lib/secret-crypto'
import { getTenantTimezone } from '@/lib/tenant-time'
import type { SupportHours } from '@/lib/comhub-away'

// Split out of route.ts — Next.js route files may only export HTTP method
// handlers (and a few config values), so collectAccounts can't live there
// and stay directly unit-testable.

export const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'
export const NYCMAID_EMAIL_FROM = 'The NYC Maid <hi@thenycmaid.com>'

type Brand = { name: string; phone?: string | null; email?: string | null; address?: string | null; logoUrl?: string | null; primaryColor?: string | null }

// One mailbox to poll — either a tenant's saved IMAP profile, or the nycmaid
// env fallback (so nycmaid keeps working before its profile fields are set).
export type MailAccount = {
  tenantId: string
  host: string
  port: number
  user: string
  pass: string
  resendApiKey: string | null // tenant Resend → branded reply; null → nycmaid fallback
  emailFrom: string | null
  brand: Brand
  timezone: string
  hoursEnabled: boolean
  supportHours: SupportHours | null
  manualAway: boolean
}

export async function collectAccounts(): Promise<MailAccount[]> {
  const accounts: MailAccount[] = []

  // Per-tenant: every tenant that has saved IMAP creds in its profile.
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, phone, email, address, logo_url, primary_color, imap_host, imap_user, imap_pass, imap_port, resend_api_key, email_from, timezone, selena_config')
    .not('imap_host', 'is', null)
    .not('imap_user', 'is', null)
    .not('imap_pass', 'is', null)

  for (const t of tenants || []) {
    try {
      const selenaConfig = (t.selena_config || {}) as Record<string, unknown>
      accounts.push({
        tenantId: t.id,
        host: String(t.imap_host).trim(),
        port: t.imap_port || 993,
        user: String(t.imap_user).trim(),
        pass: decryptSecret(String(t.imap_pass)).trim(),
        resendApiKey: t.resend_api_key || null,
        // nycmaid must never fall through to the generic tenant-email default
        // (Full Loop CRM <hello@fullloopcrm.com>) even if its profile row is
        // migrated to Resend before email_from is set — its real from-address
        // is hi@thenycmaid.com, matching the source production repo.
        emailFrom: t.email_from || (t.id === NYCMAID_TENANT_ID ? NYCMAID_EMAIL_FROM : null),
        brand: {
          name: t.name || 'Full Loop',
          phone: t.phone,
          email: t.email_from || t.email,
          address: t.address,
          logoUrl: t.logo_url,
          primaryColor: t.primary_color,
        },
        timezone: getTenantTimezone(t as { timezone?: string | null }),
        hoursEnabled: Boolean(selenaConfig.hours_enabled),
        supportHours: (selenaConfig.support_hours as SupportHours | undefined) || null,
        manualAway: Boolean(selenaConfig.manual_away),
      })
    } catch {
      // Bad/undecryptable creds for one tenant must not sink the whole run.
    }
  }

  // nycmaid env fallback — only if it isn't already covered by a profile entry.
  const envPass = (process.env.EMAIL_PASS || '').trim()
  if (envPass && !accounts.some((a) => a.tenantId === NYCMAID_TENANT_ID)) {
    const { data: nycmaidTenant } = await supabaseAdmin
      .from('tenants')
      .select('timezone, selena_config')
      .eq('id', NYCMAID_TENANT_ID)
      .single()
    const selenaConfig = (nycmaidTenant?.selena_config || {}) as Record<string, unknown>
    accounts.push({
      tenantId: NYCMAID_TENANT_ID,
      host: (process.env.EMAIL_HOST || 'mail.thenycmaid.com').trim(),
      port: 993,
      user: (process.env.EMAIL_USER || 'hi@thenycmaid.com').trim(),
      pass: envPass,
      resendApiKey: null,
      emailFrom: null,
      brand: { name: 'The NYC Maid' },
      timezone: getTenantTimezone(nycmaidTenant as { timezone?: string | null } | null),
      hoursEnabled: Boolean(selenaConfig.hours_enabled),
      supportHours: (selenaConfig.support_hours as SupportHours | undefined) || null,
      manualAway: Boolean(selenaConfig.manual_away),
    })
  }

  return accounts
}
