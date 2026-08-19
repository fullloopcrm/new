import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { locationContent, type LocationInput } from '@/app/site/template/_lib/content/longform'
import { getStoredOrFallbackContent } from '@/app/site/template/_lib/content/stored-content'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'
import { resolveCoverage, SITEMAP_AREA_LIMIT, type CoveredArea } from '@/lib/geo/coverage'
import { getTenantFromHeaders } from '@/lib/tenant-site'

interface Props {
  params: Promise<{ location: string }>
}

// Resolves the tenant's real service area at request time via
// resolveCoverage() (falls back to a live Overpass/OSM lookup outside the
// static NY/NJ dataset), so this works for any US tenant — not just nycmaid.
// Must be dynamic: tenant + coverage are resolved per-request from headers.
export const dynamic = 'force-dynamic'
export async function generateStaticParams() { return [] }

async function resolveArea(locationSlug: string): Promise<{ area: CoveredArea; tenantId: string; indexable: boolean } | null> {
  const tenant = (await getTenantFromHeaders()) as Record<string, unknown> | null
  if (!tenant) return null
  const radius = typeof tenant.service_radius_miles === 'number' ? tenant.service_radius_miles : 25
  const coverage = await resolveCoverage({
    lat: tenant.service_area_lat as number | null,
    lng: tenant.service_area_lng as number | null,
    address: tenant.address as string | null,
    radiusMiles: radius,
  })
  const rank = coverage.areas.findIndex((a) => a.urlSlug === locationSlug)
  if (rank === -1) return null
  return { area: coverage.areas[rank], tenantId: tenant.id as string, indexable: rank < SITEMAP_AREA_LIMIT }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location } = await params
  const resolved = await resolveArea(location)
  if (!resolved) return {}
  const { area, tenantId, indexable } = resolved
  const config = await getSiteConfig()
  const fallback = locationContent(config, area)
  const c = await getStoredOrFallbackContent(tenantId, 'location', area.urlSlug, fallback)
  const url = `${config.identity.url}/areas/${location}`
  return {
    title: { absolute: c.title },
    description: c.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: c.title, description: c.metaDescription, url, type: 'website' },
    other: { 'geo.region': `US-${area.state}`, 'geo.placename': area.name, 'geo.position': `${area.lat};${area.lng}`, ICBM: `${area.lat}, ${area.lng}` },
    // Beyond SITEMAP_AREA_LIMIT this is real geo data but template-generated
    // prose (no generate-tenant-site.ts content yet) — kept crawlable/linkable
    // (follow) but out of the index until it has real content or a sitemap slot.
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  }
}

export default async function LocationPage({ params }: Props) {
  const { location } = await params
  const resolved = await resolveArea(location)
  if (!resolved) notFound()
  const { area, tenantId } = resolved

  const config = await getSiteConfig()
  const areaInput: LocationInput = { name: area.name, state: area.state }
  const fallback = locationContent(config, areaInput)
  const content = await getStoredOrFallbackContent(tenantId, 'location', area.urlSlug, fallback)

  return (
    <LongformArticle
      config={config}
      content={content}
      eyebrow="Service Area"
      ctaHeading={`Book ${area.name} Today`}
      ctaBody={`Tell us what you need in ${area.name} and we'll take it from there — a clear quote, a time that works, and work we stand behind.`}
    />
  )
}
