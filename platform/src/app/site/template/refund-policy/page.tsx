import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { breadcrumbSchema } from '@/app/site/template/_lib/seo/schema'
import JsonLd from '@/app/site/template/_components/JsonLd'
import LegalDoc from '@/app/site/template/_components/LegalDoc'
import { refundDoc } from '@/app/site/template/_lib/legal'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  return {
    title: `Refund Policy | ${config.identity.name}`,
    description: `${config.identity.name}'s satisfaction, re-service, cancellation, and refund policy.`,
    alternates: { canonical: '/refund-policy' },
  }
}

export default async function RefundPolicyPage() {
  const config = await getSiteConfig()
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: config.identity.url },
        { name: 'Refund Policy', url: `${config.identity.url}/refund-policy` },
      ])} />
      <LegalDoc doc={refundDoc(config)} />
    </>
  )
}
