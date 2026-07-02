import { getSiteConfig } from '../../_config/load'
import BookFormClient from './BookFormClient'

// Server wrapper: reads the tenant's resolved config (services are
// vertical-specific and config-driven) and hands them to the client form.
export default async function BookNewPage() {
  const config = await getSiteConfig()
  return <BookFormClient services={config.services} />
}
