import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { locationCareersContent, type LocationInput } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'
import { buildBusiness, jobPostingLd } from '@/app/site/template/_lib/seo/schema'
import JsonLd from '@/app/site/template/_components/JsonLd'
import { resolveCoverage, type CoveredArea } from '@/lib/geo/coverage'
import { getTenantFromHeaders } from '@/lib/tenant-site'

interface Props {
  params: Promise<{ location: string }>
}

// Job/hiring page per service area — same pattern as we-pay-you-junk's
// /careers/[state]/[city] (JobPosting schema, "Now Recruiting in X"), but
// config-driven for any tenant/industry instead of one hardcoded brand, and
// built on the tenant's REAL resolveCoverage() area instead of a static city
// list. Must be dynamic: tenant + coverage are resolved per-request.
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
  const c = locationCareersContent(config, area)
  const url = `${config.identity.url}/careers/${location}`
  return {
    title: { absolute: c.title },
    description: c.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: c.title, description: c.metaDescription, url, type: 'website' },
  }
}

export default async function LocationCareersPage({ params }: Props) {
  const { location } = await params
  const area = await resolveArea(location)
  if (!area) notFound()

  const config = await getSiteConfig()
  const areaInput: LocationInput = { name: area.name, state: area.state }
  const content = locationCareersContent(config, areaInput)
  const url = `${config.identity.url}/careers/${location}`
  const biz = buildBusiness(config)

  return (
    <>
      <JsonLd data={jobPostingLd(biz, { title: content.h1, description: content.metaDescription, url, city: area.name, state: area.state })} />
      <LongformArticle
        config={config}
        content={content}
        eyebrow="Careers"
        ctaHeading={`Apply in ${area.name}`}
        ctaBody={`Reach out and tell us about yourself — we hire for reliability and character, and we treat our team right.`}
      />
    </>
  )
}
