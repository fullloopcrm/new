import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { breadcrumbSchema } from '@/app/site/template/_lib/seo/schema'
import JsonLd from '@/app/site/template/_components/JsonLd'
import LegalDoc from '@/app/site/template/_components/LegalDoc'
import { doNotSellDoc } from '@/app/site/template/_lib/legal'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  return {
    title: `Do Not Sell or Share My Personal Information | ${config.identity.name}`,
    description: `California residents: how to opt out of the sale or sharing of your personal information with ${config.identity.name}.`,
    alternates: { canonical: '/do-not-share-policy' },
  }
}

export default async function DoNotSharePolicyPage() {
  const config = await getSiteConfig()
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: config.identity.url },
        { name: 'Do Not Sell or Share', url: `${config.identity.url}/do-not-share-policy` },
      ])} />
      <LegalDoc doc={doNotSellDoc(config)} />
    </>
  )
}
