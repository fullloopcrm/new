import { getSiteConfig } from '../_config/load'
import CollectForm from './CollectForm'

// Server wrapper: reads the tenant's resolved SiteConfig and hands it to the
// trade-agnostic collect/contact form. Leads post to /api/lead (the tenant's
// own clients + portal_leads), so submissions land in the tenant backend.
export default async function ContactFormPage() {
  const config = await getSiteConfig()
  return <CollectForm config={config} />
}
