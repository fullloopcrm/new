import type { Metadata } from 'next'
import { requireVaTenant } from '@/app/site/template/_lib/va-gate'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import { VA_SERVICES } from '@/app/site/template/_data/va-services'
import { CITIES, STATES } from '@/app/site/template/_data/us-locations'
import type { Section } from '@/app/site/template/_lib/va-content'
import VASeoPage, { type RelatedGroup } from '@/app/site/template/_components/VASeoPage'
import { getSeoOverride } from '@/lib/seo/overrides'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  if (!industryProfile(config.industry).isVirtualAssistant) return {}
  const url = `${config.identity.url.replace(/\/+$/, '')}/virtual-assistant-services`
  const override = await getSeoOverride(url)
  return {
    title: override?.title || `Virtual Assistant Services — From $8/hr | ${config.identity.name}`,
    description: override?.description || `Every virtual assistant service: call answering, admin, CRM management, email, customer support, and more. Real English-speaking, American-owned assistants from $8/hour.`,
    alternates: { canonical: url },
    openGraph: { title: override?.title || 'Virtual Assistant Services', description: override?.description || 'From $8/hour. American-owned, English-speaking assistants.', url, type: 'website' },
  }
}

export default async function ServicesIndexPage() {
  const config = await requireVaTenant()

  const sections: Section[] = [
    {
      heading: 'One Assistant. Every Task.',
      paragraphs: [
        `${config.identity.name} pairs you with a dedicated, English-speaking virtual assistant who handles the work that does not need you — from answering your phones to running your CRM. American-owned and managed, based in New York City, serving over 100 businesses nationwide.`,
        `Every service below is delivered by a real person at a starting rate of $8/hour, tracked transparently through Quo. Pick a service to see exactly what it covers, or start pay-as-you-go with a $50/week minimum.`,
      ],
    },
  ]

  const related: RelatedGroup[] = [
    {
      title: 'Virtual Assistant Services',
      links: VA_SERVICES.map((s) => ({ href: `/virtual-assistant-services/${s.slug}`, label: s.name })),
    },
    {
      title: 'Popular Locations',
      links: [...CITIES.slice(0, 8), ...STATES.slice(0, 4)].map((l) => ({
        href: `/virtual-assistant/${l.slug}`,
        label: l.name,
      })),
    },
  ]

  return (
    <VASeoPage
      config={config}
      h1="Virtual Assistant Services"
      subtitle="Every service, one dedicated English-speaking assistant. From $8/hour, 24/7."
      sections={sections}
      related={related}
      breadcrumb={[{ href: '/', label: 'Home' }]}
    />
  )
}
