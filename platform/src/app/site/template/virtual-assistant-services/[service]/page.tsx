import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireVaTenant } from '@/app/site/template/_lib/va-gate'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import { getVAServiceBySlug, VA_SERVICES } from '@/app/site/template/_data/va-services'
import { CITIES } from '@/app/site/template/_data/us-locations'
import { serviceSections, type Section } from '@/app/site/template/_lib/va-content'
import VASeoPage, { type RelatedGroup } from '@/app/site/template/_components/VASeoPage'

interface Props {
  params: Promise<{ service: string }>
}

export const dynamicParams = true
export const dynamic = 'force-dynamic'
export async function generateStaticParams() {
  return VA_SERVICES.map((s) => ({ service: s.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { service: slug } = await params
  const service = getVAServiceBySlug(slug)
  const config = await getSiteConfig()
  if (!service || !industryProfile(config.industry).isVirtualAssistant) return {}
  const url = `${config.identity.url.replace(/\/+$/, '')}/virtual-assistant-services/${service.slug}`
  return {
    title: `${service.name} Virtual Assistant — From $8/hr | ${config.identity.name}`,
    description: `Hire a ${service.shortName.toLowerCase()} virtual assistant from $8/hour. ${service.tagline} Real English-speaking assistants, American-owned, 24/7. Serving the entire U.S.`,
    alternates: { canonical: url },
    openGraph: { title: `${service.name} Virtual Assistant`, description: service.tagline, url, type: 'website' },
  }
}

export default async function ServicePage({ params }: Props) {
  const { service: slug } = await params
  const config = await requireVaTenant()
  const service = getVAServiceBySlug(slug)
  if (!service) notFound()

  const sections: Section[] = serviceSections(service, config.identity.name)
  // Service-specific FAQ appended as a section
  sections.push({
    heading: 'Frequently Asked Questions',
    paragraphs: service.faqs.flatMap((f) => [`${f.q}`, f.a]),
  })

  const related: RelatedGroup[] = [
    {
      title: 'All Virtual Assistant Services',
      links: VA_SERVICES.map((s) => ({ href: `/virtual-assistant-services/${s.slug}`, label: s.name })),
    },
    {
      title: `${service.shortName} By Location`,
      links: CITIES.slice(0, 12).map((c) => ({
        href: `/virtual-assistant/${c.slug}/${service.slug}`,
        label: `${service.shortName} in ${c.shortName}`,
      })),
    },
  ]

  return (
    <VASeoPage
      config={config}
      h1={`Hire a ${service.shortName} Virtual Assistant`}
      subtitle={service.tagline}
      sections={sections}
      related={related}
      breadcrumb={[
        { href: '/', label: 'Home' },
        { href: '/virtual-assistant-services', label: 'Services' },
      ]}
    />
  )
}
