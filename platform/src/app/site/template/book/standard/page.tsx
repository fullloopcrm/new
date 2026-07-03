import { getSiteConfig } from '../../_config/load'
import StandardBookForm from './StandardBookForm'

// Server wrapper: reads the tenant's resolved SiteConfig (services, theme,
// contact are all config-driven) and hands it to the trade-agnostic booking
// form. The cleaning-specific form at /book/new stays separate and live.
export default async function StandardBookPage() {
  const config = await getSiteConfig()
  return <StandardBookForm config={config} />
}
