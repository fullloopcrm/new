import { getSiteConfig } from '@/app/site/template/_config/load'
import ApplyForm from './ApplyForm'

/**
 * Server wrapper for the tenant apply form. Reads the tenant's SiteConfig so the
 * client form renders the real business name (header + SMS consent) instead of
 * the "Your Business" placeholder.
 */
export default async function ApplyPage() {
  const config = await getSiteConfig()
  return <ApplyForm businessName={config.identity.legalName ?? config.identity.name} />
}
