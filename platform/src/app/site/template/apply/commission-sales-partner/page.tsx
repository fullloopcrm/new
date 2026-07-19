import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import ApplySalesPartnerForm from './ApplySalesPartnerForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const title = `Apply — Commission Sales Partner | ${config.identity.name}`
  return {
    title,
    description: `Apply for the Commission Sales Partner role at ${config.identity.name}. Includes a required 60-second selfie video upload.`,
    robots: { index: false, follow: false },
  }
}

/**
 * Server wrapper for the Commission Sales Partner application form. Reads the
 * tenant's SiteConfig so the client form renders the real business name and
 * phone (header + SMS consent + selfie-video requirement copy) instead of a
 * placeholder.
 */
export default async function ApplySalesPartnerPage() {
  const config = await getSiteConfig()
  return (
    <ApplySalesPartnerForm
      businessName={config.identity.legalName ?? config.identity.name}
      phoneDisplay={config.contact.phone}
    />
  )
}
