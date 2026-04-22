import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from './supabase'
import { verifyTenantHeaderSig } from './tenant-header-sig'

/**
 * Gate nycmaid-specific hardcoded SEO pages. Pages that contain
 * NYC-Maid-authored content (specific neighborhoods, FAQ, blog posts,
 * careers pages) should call this at the top of their server component.
 * A tenant with `enable_legacy_seo_pages=true` renders normally. All
 * other tenants get 404 — they build their own SEO surface over time
 * via an admin CMS (future work).
 *
 * Returns the tenant for convenience so callers don't double-lookup.
 */
export async function requireLegacySeoPages() {
  const tenant = await getTenantFromHeaders()
  if (!tenant || !(tenant as Record<string, unknown>).enable_legacy_seo_pages) {
    notFound()
  }
  return tenant
}

export async function getTenantFromHeaders() {
  const h = await headers()
  const tenantId = h.get('x-tenant-id')
  const sig = h.get('x-tenant-sig')
  if (!tenantId) return null
  // Reject caller-supplied x-tenant-id. Only middleware knows the signing
  // secret, so a missing or wrong sig means this header did not originate
  // from middleware. Without this, a curl-er could impersonate any tenant
  // on any public /api route that uses this helper.
  if (!verifyTenantHeaderSig(tenantId, sig)) return null

  const { data } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()
  return data
}

export async function getTenantServices(tenantId: string) {
  const { data } = await supabaseAdmin
    .from('service_types')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('sort_order')
  return data || []
}

export async function getTenantTeamCount(tenantId: string) {
  const { count } = await supabaseAdmin
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
  return count || 0
}

export async function getTenantAreas(tenantId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('selena_config')
    .eq('id', tenantId)
    .single()
  return (data?.selena_config as any)?.service_areas || []
}

export function toSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function fromSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function tenantSiteUrl(tenant: { domain?: string | null; slug?: string | null } | null): string {
  if (!tenant) return ''
  if (tenant.domain) return `https://${tenant.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  if (tenant.slug) return `https://${tenant.slug}.homeservicesbusinesscrm.com`
  return ''
}

/* ---------------------------------------------------------------------------
 * SEO content generation helpers
 * Template strings with variable substitution — no AI needed.
 * --------------------------------------------------------------------------- */

const INDUSTRY_CHECKLIST: Record<string, string[]> = {
  cleaning: [
    'Dusting all surfaces, shelves, and fixtures',
    'Vacuuming carpets, rugs, and upholstery',
    'Mopping and sanitizing hard floors',
    'Kitchen cleaning — counters, sink, appliances, stovetop',
    'Bathroom cleaning — toilet, tub, shower, mirrors',
    'Trash removal and liner replacement',
    'Wiping light switches, door handles, and baseboards',
    'Interior window sill and ledge cleaning',
  ],
  plumbing: [
    'Full diagnosis and inspection of the issue',
    'Pipe repair, replacement, or rerouting',
    'Fixture installation and repair',
    'Drain clearing and cleaning',
    'Water pressure testing and adjustment',
    'Leak detection with professional equipment',
    'Post-repair cleanup of the work area',
    'Written summary and warranty documentation',
  ],
  landscaping: [
    'Lawn mowing and edging',
    'Hedge and shrub trimming',
    'Leaf and debris removal',
    'Mulching and bed maintenance',
    'Weed control and prevention',
    'Seasonal planting and flower bed design',
    'Irrigation system check',
    'Post-service property walkthrough',
  ],
  'pest control': [
    'Full property inspection for pests',
    'Identification of pest species and entry points',
    'Targeted treatment application',
    'Interior and exterior barrier treatment',
    'Nest and colony removal',
    'Sealing of common entry points',
    'Follow-up monitoring plan',
    'Safety documentation and product info',
  ],
}

function getChecklistForService(serviceName: string, industry: string): string[] {
  const sLower = serviceName.toLowerCase()
  const iLower = industry.toLowerCase()

  // Try to match service name keywords first
  for (const [key, items] of Object.entries(INDUSTRY_CHECKLIST)) {
    if (sLower.includes(key) || iLower.includes(key)) return items
  }

  // Generic fallback built from the service name
  return [
    `Professional-grade equipment and supplies for ${sLower}`,
    `Experienced, background-checked ${sLower} specialists`,
    `Thorough ${sLower} tailored to your space`,
    `Satisfaction guarantee on every visit`,
    `Flexible scheduling — mornings, evenings, and weekends`,
    `Transparent pricing with no hidden fees`,
    `Post-service walkthrough and quality check`,
    `Dedicated support before and after service`,
  ]
}

interface ContentBlock {
  aboutParagraphs: string[]
  whyChoose: { title: string; desc: string }[]
  processSteps: string[]
}

function generateContent(
  industry: string,
  businessName: string,
  opts?: { service?: string; area?: string }
): ContentBlock {
  const svc = opts?.service?.toLowerCase() || industry.toLowerCase()
  const area = opts?.area || 'your neighborhood'
  const iLower = industry.toLowerCase()

  // About paragraphs
  const aboutParagraphs: string[] = []

  if (iLower.includes('cleaning')) {
    aboutParagraphs.push(
      `${businessName} delivers meticulous ${svc} services throughout ${area}. Our trained cleaning professionals use eco-friendly products and systematic methods to ensure every surface is spotless — from kitchens and bathrooms to living areas and bedrooms.`
    )
    aboutParagraphs.push(
      `Whether you need a one-time deep clean or recurring maintenance, our ${area} team arrives on time, fully equipped, and ready to transform your space. We treat every home and office as if it were our own.`
    )
  } else if (iLower.includes('plumbing')) {
    aboutParagraphs.push(
      `${businessName} provides dependable ${svc} services to residents and businesses in ${area}. Our licensed plumbers handle everything from minor drips to major pipe replacements with precision and care.`
    )
    aboutParagraphs.push(
      `We understand plumbing emergencies don't wait — and neither do we. Our ${area} team offers prompt response times, upfront pricing, and lasting repairs you can count on.`
    )
  } else if (iLower.includes('landscaping')) {
    aboutParagraphs.push(
      `${businessName} keeps properties across ${area} looking their best with expert ${svc} services. From lawn mowing and edging to seasonal plantings and full landscape redesigns, we do it all.`
    )
    aboutParagraphs.push(
      `Our ${area} crew takes pride in creating and maintaining beautiful outdoor spaces. We use professional-grade equipment and sustainable practices to deliver results that last.`
    )
  } else {
    aboutParagraphs.push(
      `${businessName} provides expert ${svc} services to homes and businesses throughout ${area}. Our trained, professional team delivers consistent, high-quality results every time.`
    )
    aboutParagraphs.push(
      `We understand that every space in ${area} is unique. That's why we customize our ${svc} approach to meet your specific needs, preferences, and schedule.`
    )
  }

  // Why choose us
  const whyChoose = [
    {
      title: 'Local Team',
      desc: `Our team members live and work near ${area}, so we know the community and can respond quickly.`,
    },
    {
      title: 'Licensed & Insured',
      desc: 'Fully licensed, bonded, and insured for your complete peace of mind.',
    },
    {
      title: 'Transparent Pricing',
      desc: "No surprise charges. You'll know exactly what you're paying before we start.",
    },
    {
      title: 'Satisfaction Guaranteed',
      desc: "Not happy with our work? We'll come back and make it right, free of charge.",
    },
  ]

  // Process steps
  const processSteps = [
    `Contact us online or by phone to request ${svc}.`,
    'We confirm availability and provide an upfront quote.',
    `Our team arrives at your ${area} location on time, fully equipped.`,
    `We complete the ${svc} to the highest standard.`,
    "Follow-up to make sure you're 100% satisfied with the results.",
  ]

  return { aboutParagraphs, whyChoose, processSteps }
}

export { generateContent, getChecklistForService }
export type { ContentBlock }

export async function getTenantReviews(tenantId: string) {
  const { data } = await supabaseAdmin
    .from('google_reviews')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(20)
  return data || []
}

/**
 * Look up a tenant's service by URL slug and adapt it to the Service shape
 * expected by /site/services/[slug] so the SEO template still renders.
 * Returns null if no tenant service matches the slug.
 */
export async function getTenantServiceByUrlSlug(
  tenantId: string,
  urlSlug: string,
): Promise<{
  slug: string
  urlSlug: string
  name: string
  shortName: string
  description: string
  features: string[]
  idealFor: string[]
  priceRange: string
  duration: string
} | null> {
  const services = await getTenantServices(tenantId)
  const match = services.find(s => toSlug(s.name) === urlSlug) as
    | {
        id: string
        name: string
        description?: string | null
        default_hourly_rate?: number | null
        default_duration_hours?: number | null
      }
    | undefined
  if (!match) return null

  const rate = match.default_hourly_rate || 0
  const duration = match.default_duration_hours || 2
  const minPrice = rate * duration
  const maxPrice = rate * (duration + 2)

  return {
    slug: toSlug(match.name),
    urlSlug,
    name: match.name,
    shortName: match.name.split(' ')[0],
    description: match.description || `Professional ${match.name.toLowerCase()}.`,
    features: [],
    idealFor: [],
    priceRange: rate ? `$${minPrice}–$${maxPrice}` : '',
    duration: `${duration}–${duration + 1} hours`,
  }
}

/**
 * Convert all tenant services to the Service shape for the "other services"
 * grid on service pages. Excludes the current service by slug.
 */
export async function getTenantServiceList(
  tenantId: string,
  excludeSlug?: string,
): Promise<
  Array<{ slug: string; urlSlug: string; name: string; shortName: string; description: string; priceRange: string; duration: string }>
> {
  const services = await getTenantServices(tenantId)
  return services
    .map(s => {
      const svc = s as {
        id: string
        name: string
        description?: string | null
        default_hourly_rate?: number | null
        default_duration_hours?: number | null
      }
      const slug = toSlug(svc.name)
      const rate = svc.default_hourly_rate || 0
      const duration = svc.default_duration_hours || 2
      return {
        slug,
        urlSlug: slug,
        name: svc.name,
        shortName: svc.name.split(' ')[0],
        description: svc.description || `Professional ${svc.name.toLowerCase()}.`,
        priceRange: rate ? `$${rate * duration}–$${rate * (duration + 2)}` : '',
        duration: `${duration}–${duration + 1} hours`,
      }
    })
    .filter(s => s.slug !== excludeSlug)
}
