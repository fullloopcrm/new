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

/**
 * Best-effort city from a US business address like
 * "150 W 47th St, New York, NY 10036" → "New York". For the standard
 * "street, city, ST zip" shape the city is the second-to-last comma segment;
 * a bare "City, ST" yields the first. Returns undefined when we can't tell,
 * so the caller falls back to the neutral default rather than a wrong city.
 */
function cityFromAddress(address?: string): string | undefined {
  if (!address) return undefined
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 3) return parts[parts.length - 2] || undefined
  if (parts.length === 2) return parts[0] || undefined
  return undefined
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

  // Geo scope, in priority order, so a tenant never renders the "Your City"
  // placeholder when we can derive its real area:
  //  1. NATIONAL — service_areas names the whole US → "the United States"
  //  2. DECLARED — the first explicitly-listed service area (regional/local)
  //  3. LOCAL    — the city parsed from the tenant's business address
  //  4. fallback — the neutral default
  const areas: string[] = Array.isArray(selena?.['service_areas'])
    ? (selena!['service_areas'] as unknown[]).filter((a): a is string => typeof a === 'string')
    : []
  const isNational = areas.some((a) => /united states|nationwide|\bnational\b|\bu\.?s\.?a?\b/i.test(a))
  const addressCity = cityFromAddress(str(tenant, 'address'))
  const geo: SiteConfig['geo'] = isNational
    ? { region: 'US', placename: 'the United States', lat: 39.8283, lng: -98.5795 }
    : areas.length > 0
      ? { ...defaultConfig.geo, placename: areas[0] }
      : addressCity
        ? { ...defaultConfig.geo, placename: addressCity }
        : defaultConfig.geo

  const industry = str(tenant, 'industry') ?? defaultConfig.industry
  const reviewStats = await loadReviewStats(str(tenant, 'id'))
  const hasReviews = reviewStats.count !== ''

  return {
    identity: {
      name,
      url,
      siteName: name,
      legalName: str(tenant, 'legal_name') ?? defaultConfig.identity.legalName,
      foundedYear: defaultConfig.identity.foundedYear,
      // No NYC-Maid /logo.png fallback — a logo-less tenant renders its NAME as a
      // wordmark in the nav/footer, never another tenant's logo.
      logo: str(tenant, 'logo_url') ?? undefined,
    },
    contact: {
      phone,
      phoneDigits,
      email: str(tenant, 'email') ?? str(tenant, 'owner_email') ?? defaultConfig.contact.email,
      supportPhone,
      supportPhoneDigits,
    },
    geo,
    theme: {
      primary: str(tenant, 'primary_color') ?? defaultConfig.theme.primary,
      primaryAlt: defaultConfig.theme.primaryAlt,
      accent: str(tenant, 'secondary_color') ?? defaultConfig.theme.accent,
      accentHover: defaultConfig.theme.accentHover,
      surface: defaultConfig.theme.surface,
    },
    agent: { name: agentName },
    // Reviews come ONLY from the tenant's REAL google_reviews. A tenant with none
    // shows no rating at all — never a fabricated "5.0 / 50+". Emitting an
    // aggregateRating a business did not actually earn is fake-review markup
    // (Google manual-action risk), so there is no industry-based default here:
    // reviewCount stays '' (falsy) until real reviews exist, which suppresses the
    // AggregateRating JSON-LD and the visible star badge downstream.
    rating: hasReviews ? reviewStats.rating : 0,
    reviewCount: hasReviews ? reviewStats.count : '',
    services: (await loadServices(str(tenant, 'id'))) ?? defaultConfig.services,
    funnelMode:
      selena?.['funnel_mode'] === 'pipeline' ? 'pipeline'
      : selena?.['funnel_mode'] === 'lead_only' ? 'lead_only'
      : 'booking',
    industry,
  }
}

/**
 * Real review stats from google_reviews. Returns empty count when the tenant has
 * no reviews so the marketing site can hide the rating instead of inventing one.
 */
async function loadReviewStats(tenantId: string | undefined): Promise<{ rating: number; count: string }> {
  if (!tenantId) return { rating: 0, count: '' }
  const { data } = await supabaseAdmin
    .from('google_reviews')
    .select('rating')
    .eq('tenant_id', tenantId)
  if (!data || data.length === 0) return { rating: 0, count: '' }
  const rated = data
    .map((r) => (typeof r.rating === 'number' ? r.rating : Number(r.rating)))
    .filter((n) => !Number.isNaN(n) && n > 0)
  const avg = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0
  return { rating: Math.round(avg * 10) / 10, count: String(data.length) }
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
