import { getSiteConfig } from '@/app/site/template/_config/load'
import FeedbackForm from './FeedbackForm'

/**
 * Server wrapper for the tenant customer feedback form — reads the tenant's
 * SiteConfig so the client form renders the real business name instead of
 * a generic placeholder. Same pattern as ./apply/page.tsx.
 */
export default async function FeedbackPage() {
  const config = await getSiteConfig()
  return <FeedbackForm businessName={config.identity.legalName ?? config.identity.name} />
}
