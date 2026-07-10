import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { breadcrumbSchema } from '@/app/site/template/_lib/seo/schema'
import JsonLd from '@/app/site/template/_components/JsonLd'
import LegalDoc from '@/app/site/template/_components/LegalDoc'
import { termsDoc } from '@/app/site/template/_lib/legal'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  return {
    title: `Terms & Conditions | ${config.identity.name}`,
    description: `The terms that govern ${config.identity.name}'s website and services.`,
    alternates: { canonical: '/terms-conditions' },
  }
}

export default async function TermsPage() {
  const config = await getSiteConfig()
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: config.identity.url },
        { name: 'Terms & Conditions', url: `${config.identity.url}/terms-conditions` },
      ])} />
      <LegalDoc doc={termsDoc(config)} />
    </>
  )
}
