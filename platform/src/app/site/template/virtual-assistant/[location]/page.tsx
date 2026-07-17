import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireVaTenant } from '@/app/site/template/_lib/va-gate'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import { getLocationBySlug, STATES, CITIES, ALL_LOCATIONS } from '@/app/site/template/_data/us-locations'
import { VA_SERVICES } from '@/app/site/template/_data/va-services'
import { locationHubSections } from '@/app/site/template/_lib/va-content'
import VASeoPage, { type RelatedGroup } from '@/app/site/template/_components/VASeoPage'
import { getSeoOverride } from '@/lib/seo/overrides'

interface Props {
  params: Promise<{ location: string }>
}

export const dynamicParams = true
export const dynamic = 'force-dynamic'
export async function generateStaticParams() {
  return ALL_LOCATIONS.map((l) => ({ location: l.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location: slug } = await params
  const loc = getLocationBySlug(slug)
  const config = await getSiteConfig()
  if (!loc || !industryProfile(config.industry).isVirtualAssistant) return {}
  const where = loc.type === 'state' ? loc.name : `${loc.shortName}, ${loc.stateCode}`
  const url = `${config.identity.url.replace(/\/+$/, '')}/virtual-assistant/${loc.slug}`
  const override = await getSeoOverride(url)
  return {
    title: override?.title || `Virtual Assistant Services in ${where} — From $8/hr | ${config.identity.name}`,
    description: override?.description || `Hire a virtual assistant in ${where} from $8/hour. Real English-speaking, American-owned & managed. Call answering, admin, CRM, and more. 24/7 coverage.`,
    alternates: { canonical: url },
    openGraph: { title: override?.title || `Virtual Assistant Services in ${where}`, description: override?.description || `From $8/hour. American-owned, English-speaking assistants serving ${where}.`, url, type: 'website' },
  }
}

export default async function LocationHubPage({ params }: Props) {
  const { location: slug } = await params
  const config = await requireVaTenant()
  const loc = getLocationBySlug(slug)
  if (!loc) notFound()

  const where = loc.type === 'state' ? loc.name : `${loc.shortName}, ${loc.stateCode}`
  const name = config.identity.name

  const sections = locationHubSections(loc, name)

  const otherLocations = (loc.type === 'city' ? STATES : CITIES).slice(0, 12)

  const related: RelatedGroup[] = [
    {
      title: `Services in ${loc.shortName}`,
      links: VA_SERVICES.map((s) => ({ href: `/virtual-assistant/${loc.slug}/${s.slug}`, label: `${s.shortName} in ${loc.shortName}` })),
    },
    {
      title: 'Other Locations',
      links: otherLocations.map((l) => ({ href: `/virtual-assistant/${l.slug}`, label: l.name })),
    },
  ]

  return (
    <VASeoPage
      config={config}
      h1={`Virtual Assistant Services in ${where}`}
      subtitle={`Real English-speaking, American-owned assistants serving ${where} — from $8/hour, 24/7.`}
      sections={sections}
      related={related}
      breadcrumb={[
        { href: '/', label: 'Home' },
        { href: '/virtual-assistant-services', label: 'Services' },
      ]}
    />
  )
}
