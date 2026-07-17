import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireVaTenant } from '@/app/site/template/_lib/va-gate'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import { getLocationBySlug } from '@/app/site/template/_data/us-locations'
import { getVAServiceBySlug, VA_SERVICES } from '@/app/site/template/_data/va-services'
import { geoSections, type Section } from '@/app/site/template/_lib/va-content'
import VASeoPage, { type RelatedGroup } from '@/app/site/template/_components/VASeoPage'
import { getSeoOverride } from '@/lib/seo/overrides'

interface Props {
  params: Promise<{ location: string; service: string }>
}

export const dynamicParams = true
export const dynamic = 'force-dynamic'
export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location: locSlug, service: svcSlug } = await params
  const loc = getLocationBySlug(locSlug)
  const service = getVAServiceBySlug(svcSlug)
  const config = await getSiteConfig()
  if (!loc || !service || !industryProfile(config.industry).isVirtualAssistant) return {}
  const where = loc.type === 'state' ? loc.name : `${loc.shortName}, ${loc.stateCode}`
  const url = `${config.identity.url.replace(/\/+$/, '')}/virtual-assistant/${loc.slug}/${service.slug}`
  const override = await getSeoOverride(url)
  return {
    title: override?.title || `${service.name} in ${where} — Virtual Assistant From $8/hr | ${config.identity.name}`,
    description: override?.description || `${service.shortName} from a real, English-speaking virtual assistant serving ${where}. American-owned, from $8/hour, 24/7.`,
    alternates: { canonical: url },
    // NOINDEX by default: the geo×service combos are near-duplicate at national
    // scale. Kept crawlable (follow) for internal linking; promote to indexed
    // per-page only once a combo carries unique local signal (real client/review).
    robots: { index: false, follow: true },
  }
}

export default async function GeoServicePage({ params }: Props) {
  const { location: locSlug, service: svcSlug } = await params
  const config = await requireVaTenant()
  const loc = getLocationBySlug(locSlug)
  const service = getVAServiceBySlug(svcSlug)
  if (!loc || !service) notFound()

  const sections: Section[] = geoSections(service, loc, config.identity.name)
  sections.push({
    heading: 'Frequently Asked Questions',
    paragraphs: service.faqs.flatMap((f) => [f.q, f.a]),
  })

  const where = loc.type === 'state' ? loc.name : `${loc.shortName}, ${loc.stateCode}`

  const related: RelatedGroup[] = [
    {
      title: `Other Services in ${loc.shortName}`,
      links: VA_SERVICES.filter((s) => s.slug !== service.slug).map((s) => ({
        href: `/virtual-assistant/${loc.slug}/${s.slug}`,
        label: `${s.shortName} in ${loc.shortName}`,
      })),
    },
    {
      title: `${service.shortName} Elsewhere`,
      links: [
        { href: `/virtual-assistant-services/${service.slug}`, label: `${service.name} (nationwide)` },
        { href: `/virtual-assistant/${loc.slug}`, label: `All services in ${loc.shortName}` },
      ],
    },
  ]

  return (
    <VASeoPage
      config={config}
      h1={`${service.name} in ${where}`}
      subtitle={`${service.tagline} Serving ${where} from $8/hour.`}
      sections={sections}
      related={related}
      breadcrumb={[
        { href: '/', label: 'Home' },
        { href: '/virtual-assistant-services', label: 'Services' },
        { href: `/virtual-assistant/${loc.slug}`, label: loc.shortName },
      ]}
    />
  )
}
