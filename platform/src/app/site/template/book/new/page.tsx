import { redirect } from 'next/navigation'
import { getSiteConfig } from '../../_config/load'
import { industryProfile } from '../../_lib/seo/industry'
import BookFormClient from './BookFormClient'

// Server wrapper: reads the tenant's resolved config (services are
// vertical-specific and config-driven) and hands them to the client form.
export default async function BookNewPage() {
  const config = await getSiteConfig()
  // /book/new is the CLEANING-specific funnel (per-hour, "cleaners", 30-min
  // increments, supplies toggle). Every template CTA points here, so a
  // non-cleaning tenant would land customers on a cleaning UX (F-028/F-045).
  // Bounce them to the neutral form; cleaning tenants (Your Business) are unchanged.
  if (!industryProfile(config.industry).isCleaning) {
    redirect('/book/standard')
  }
  return <BookFormClient services={config.services} />
}
