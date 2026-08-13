import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { breadcrumbSchema } from '@/app/site/template/_lib/seo/schema'
import JsonLd from '@/app/site/template/_components/JsonLd'
import LegalDoc from '@/app/site/template/_components/LegalDoc'
import { shippingDoc } from '@/app/site/template/_lib/legal'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  return {
    title: `Shipping Policy | ${config.identity.name}`,
    description: `${config.identity.name}'s shipping rates, processing times, and delivery policy.`,
    alternates: { canonical: '/shipping-policy' },
  }
}

export default async function ShippingPolicyPage() {
  const config = await getSiteConfig()
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: config.identity.url },
        { name: 'Shipping Policy', url: `${config.identity.url}/shipping-policy` },
      ])} />
      <LegalDoc doc={shippingDoc(config)} />
    </>
  )
}
