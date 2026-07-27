import { redirect } from 'next/navigation'
import { getSiteConfig } from '../../_config/load'
import { industryProfile } from '../../_lib/seo/industry'
import BookFormClient from './BookFormClient'
import RemoteBookForm from './RemoteBookForm'

export default async function BookNewPage() {
  const config = await getSiteConfig()
  const profile = industryProfile(config.industry)

  // Remote / retainer verticals (e.g. virtual assistant) get the plan intake —
  // no service address, no single appointment.
  if (profile.isRemote) {
    return <RemoteBookForm services={config.services} businessName={config.identity.legalName ?? config.identity.name} />
  }

  // /book/new is the CLEANING-specific funnel (per-hour, "cleaners", 30-min
  // increments, supplies toggle). Every template CTA points here, so a
  // non-cleaning on-site tenant would land customers on a cleaning UX
  // (F-028/F-045). Bounce them to the neutral standard form; cleaning tenants
  // are unchanged.
  if (!profile.isCleaning) {
    redirect('/book/standard')
  }

  // Weekend (Sat/Sun) new-client surcharge is NYC Maid only (Jeff,
  // 2026-07-27) — resolved server-side from the tenant's own domain so the
  // shared template renders correctly for every other tenant unchanged.
  const isNycmaid = config.identity.url.includes('thenycmaid.com')

  return <BookFormClient services={config.services} businessName={config.identity.legalName ?? config.identity.name} isNycmaid={isNycmaid} />
}
