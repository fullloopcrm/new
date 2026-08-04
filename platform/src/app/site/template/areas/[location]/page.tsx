import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { locationContent, type LocationInput } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'
import { resolveCoverage, type CoveredArea } from '@/lib/geo/coverage'
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

async function resolveArea(locationSlug: string): Promise<CoveredArea | null> {
  const tenant = (await getTenantFromHeaders()) as Record<string, unknown> | null
  if (!tenant) return null
  const radius = typeof tenant.service_radius_miles === 'number' ? tenant.service_radius_miles : 25
  const coverage = await resolveCoverage({
    lat: tenant.service_area_lat as number | null,
    lng: tenant.service_area_lng as number | null,
    address: tenant.address as string | null,
    radiusMiles: radius,
  })
  return coverage.areas.find((a) => a.urlSlug === locationSlug) || null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location } = await params
  const area = await resolveArea(location)
  if (!area) return {}
  const config = await getSiteConfig()
  const c = locationContent(config, area)
  const url = `${config.identity.url}/areas/${location}`
  return {
    title: { absolute: c.title },
    description: c.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: c.title, description: c.metaDescription, url, type: 'website' },
    other: { 'geo.region': `US-${area.state}`, 'geo.placename': area.name, 'geo.position': `${area.lat};${area.lng}`, ICBM: `${area.lat}, ${area.lng}` },
  }
}

export default async function LocationPage({ params }: Props) {
  const { location } = await params
  const area = await resolveArea(location)
  if (!area) notFound()

  const config = await getSiteConfig()
  const areaInput: LocationInput = { name: area.name, state: area.state }
  const content = locationContent(config, areaInput)

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
