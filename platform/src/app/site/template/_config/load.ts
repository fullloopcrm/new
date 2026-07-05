import { getTenantFromHeaders } from '@/lib/tenant-site'
import { supabaseAdmin } from '@/lib/supabase'
import { siteConfig as defaultConfig } from './site'
import type { SiteConfig } from './types'

/**
 * Per-request site config loader.
 *
 * Reads the tenant resolved by middleware (signed x-tenant-id header) and maps
 * its row onto a SiteConfig, falling back to the neutral default for any field
 * the tenant has not set. This is what makes the shared template render as the
 * tenant's own site — no per-tenant file copy or redeploy required. A brand-new
 * tenant immediately gets a working, de-branded site carrying whatever fields
 * onboarding has filled so far; the rest stay neutral until the admin
 * personalizes them.
 *
 * Server-only: uses headers() via getTenantFromHeaders(). Pass the result into
 * client components (e.g. MarketingNav) as a prop.
 */

function toDigits(value?: string | null): string {
  return (value || '').replace(/\D/g, '')
}

type TenantRow = Record<string, unknown>

function str(row: TenantRow, key: string): string | undefined {
  const v = row[key]
  return typeof v === 'string' && v.trim() !== '' ? v : undefined
}

export async function getSiteConfig(): Promise<SiteConfig> {
  let tenant: TenantRow | null = null
  try {
    tenant = (await getTenantFromHeaders()) as TenantRow | null
  } catch {
    tenant = null
  }
  if (!tenant) return defaultConfig

  const name = str(tenant, 'name') ?? defaultConfig.identity.name
  const domain = str(tenant, 'domain') ?? str(tenant, 'domain_name')
  const url =
    str(tenant, 'website_url') ??
    (domain ? `https://${domain}` : defaultConfig.identity.url)

  const phone = str(tenant, 'phone') ?? defaultConfig.contact.phone
  const phoneDigits = toDigits(phone) || defaultConfig.contact.phoneDigits

  const supportRaw = str(tenant, 'owner_phone') ?? str(tenant, 'sms_number')
  const supportPhone = supportRaw ?? defaultConfig.contact.supportPhone
  const supportPhoneDigits = supportRaw
    ? toDigits(supportRaw)
    : defaultConfig.contact.supportPhoneDigits

  const selena = (tenant['selena_config'] as Record<string, unknown> | undefined) ?? undefined
  const agentName =
    (selena && typeof selena['agent_name'] === 'string' && selena['agent_name']) ||
    defaultConfig.agent.name

  return {
    identity: {
      name,
      url,
      siteName: name,
      legalName: str(tenant, 'legal_name') ?? defaultConfig.identity.legalName,
      foundedYear: defaultConfig.identity.foundedYear,
      logo: str(tenant, 'logo_url') ?? defaultConfig.identity.logo,
    },
    contact: {
      phone,
      phoneDigits,
      email: str(tenant, 'email') ?? str(tenant, 'owner_email') ?? defaultConfig.contact.email,
      supportPhone,
      supportPhoneDigits,
    },
    geo: defaultConfig.geo,
    theme: {
      primary: str(tenant, 'primary_color') ?? defaultConfig.theme.primary,
      primaryAlt: defaultConfig.theme.primaryAlt,
      accent: str(tenant, 'secondary_color') ?? defaultConfig.theme.accent,
      accentHover: defaultConfig.theme.accentHover,
      surface: defaultConfig.theme.surface,
    },
    agent: { name: agentName },
    rating: defaultConfig.rating,
    reviewCount: defaultConfig.reviewCount,
    services: (await loadServices(str(tenant, 'id'))) ?? defaultConfig.services,
    funnelMode:
      selena?.['funnel_mode'] === 'pipeline' ? 'pipeline'
      : selena?.['funnel_mode'] === 'lead_only' ? 'lead_only'
      : 'booking',
    industry: str(tenant, 'industry') ?? defaultConfig.industry,
  }
}

/**
 * Map a tenant's active services onto ServiceOption[]. Canonical source is the
 * `service_types` table (the same rows the booking/availability funnel reads),
 * so the marketing template shows exactly what the tenant can actually be
 * booked for — no separate, drift-prone copy. Returns null (→ neutral default)
 * when the tenant has no active services yet, keeping the template
 * vertical-neutral until onboarding populates them.
 */
async function loadServices(tenantId: string | undefined): Promise<SiteConfig['services'] | null> {
  if (!tenantId) return null
  const { data } = await supabaseAdmin
    .from('service_types')
    .select('name, default_duration_hours, active')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (!data || data.length === 0) return null
  const mapped = data
    .map((s) => {
      const value = typeof s.name === 'string' ? s.name : ''
      if (!value) return null
      return {
        value,
        label: value,
        hours: typeof s.default_duration_hours === 'number' ? s.default_duration_hours : 2,
        emergency: /same.?day|emergency/i.test(value),
      }
    })
    .filter((o): o is NonNullable<typeof o> => o !== null)
  return mapped.length > 0 ? mapped : null
}
