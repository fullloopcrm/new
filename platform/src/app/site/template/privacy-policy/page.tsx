import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { breadcrumbSchema } from '@/app/site/template/_lib/seo/schema'
import JsonLd from '@/app/site/template/_components/JsonLd'
import LegalDoc from '@/app/site/template/_components/LegalDoc'
import { privacyPolicyDoc } from '@/app/site/template/_lib/legal'
import { getSeoOverride } from '@/lib/seo/overrides'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const override = await getSeoOverride(`${config.identity.url}/privacy-policy`)
  return {
    title: override?.title || `Privacy Policy | ${config.identity.name}`,
    description: override?.description || `How ${config.identity.name} collects, uses, shares, and protects your information. We do not sell your personal data.`,
    alternates: { canonical: '/privacy-policy' },
  }
}

export default async function PrivacyPolicyPage() {
  const config = await getSiteConfig()
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: config.identity.url },
        { name: 'Privacy Policy', url: `${config.identity.url}/privacy-policy` },
      ])} />
      <LegalDoc doc={privacyPolicyDoc(config)} />
    </>
  )
}
