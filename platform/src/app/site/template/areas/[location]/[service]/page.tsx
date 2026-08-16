import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { locationServiceContent, type LocationInput, type LocationServiceInput } from '@/app/site/template/_lib/content/longform'
import { getStoredOrFallbackContent } from '@/app/site/template/_lib/content/stored-content'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'
import { resolveCoverage, type CoveredArea } from '@/lib/geo/coverage'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import type { ServiceOption } from '@/app/site/template/_config/types'

interface Props {
  params: Promise<{ location: string; service: string }>
}

// Service x location combo page — the config-driven replacement for the old
// nycmaid-only [slug]/[service] route (real hardcoded borough/pricing copy,
// gated to thenycmaid.com — see _lib/gate.ts's comment on why). This one is
// built purely from the tenant's own SiteConfig.services + a
// resolveCoverage() area, so it works for any template tenant/location/
// service, not just nycmaid. Must be dynamic: tenant + coverage + services
// are resolved per-request from headers.
export const dynamic = 'force-dynamic'
export async function generateStaticParams() { return [] }

function slugifyService(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function resolveAreaAndService(
  locationSlug: string,
  serviceSlug: string,
): Promise<{ area: CoveredArea; service: ServiceOption; tenantId: string } | null> {
  const tenant = (await getTenantFromHeaders()) as Record<string, unknown> | null
  if (!tenant) return null
  const radius = typeof tenant.service_radius_miles === 'number' ? tenant.service_radius_miles : 25
  const coverage = await resolveCoverage({
    lat: tenant.service_area_lat as number | null,
    lng: tenant.service_area_lng as number | null,
    address: tenant.address as string | null,
    radiusMiles: radius,
  })
  const area = coverage.areas.find((a) => a.urlSlug === locationSlug)
  if (!area) return null

  const config = await getSiteConfig()
  const service = config.services.find((s) => slugifyService(s.value) === serviceSlug)
  if (!service) return null

  return { area, service, tenantId: tenant.id as string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location, service: serviceSlug } = await params
  const resolved = await resolveAreaAndService(location, serviceSlug)
  if (!resolved) return {}
  const { area, service, tenantId } = resolved
  const config = await getSiteConfig()
  const svcInput: LocationServiceInput = { value: service.value, label: service.label, hours: service.hours, rate: service.rate }
  const fallback = locationServiceContent(config, area, svcInput)
  const c = await getStoredOrFallbackContent(tenantId, 'location-service', `${area.urlSlug}-${serviceSlug}`, fallback)
  const url = `${config.identity.url}/areas/${location}/${serviceSlug}`
  return {
    title: { absolute: c.title },
    description: c.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: c.title, description: c.metaDescription, url, type: 'website' },
    other: { 'geo.region': `US-${area.state}`, 'geo.placename': area.name, 'geo.position': `${area.lat};${area.lng}`, ICBM: `${area.lat}, ${area.lng}` },
  }
}

export default async function LocationServicePage({ params }: Props) {
  const { location, service: serviceSlug } = await params
  const resolved = await resolveAreaAndService(location, serviceSlug)
  if (!resolved) notFound()
  const { area, service, tenantId } = resolved

  const config = await getSiteConfig()
  const areaInput: LocationInput = { name: area.name, state: area.state }
  const svcInput: LocationServiceInput = { value: service.value, label: service.label, hours: service.hours, rate: service.rate }
  const fallback = locationServiceContent(config, areaInput, svcInput)
  const content = await getStoredOrFallbackContent(tenantId, 'location-service', `${area.urlSlug}-${serviceSlug}`, fallback)

  return (
    <LongformArticle
      config={config}
      content={content}
      eyebrow={service.label}
      ctaHeading={`Book ${service.label} in ${area.name}`}
      ctaBody={`Tell us what you need in ${area.name} and we'll take it from there — a clear quote, a time that works, and work we stand behind.`}
    />
  )
}
