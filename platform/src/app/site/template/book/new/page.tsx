import { getSiteConfig } from '../../_config/load'
import BookFormClient from './BookFormClient'
import RemoteBookForm from './RemoteBookForm'

// Remote, retainer-style verticals get the plan intake (no address / no single
// appointment). Everyone else gets the on-site appointment form. Config-driven
// off the tenant's industry — no per-tenant fork.
const REMOTE_INDUSTRIES = new Set(['virtual assistant', 'virtual_assistant'])

export default async function BookNewPage() {
  const config = await getSiteConfig()
  const remote = REMOTE_INDUSTRIES.has((config.industry || '').toLowerCase())
  return remote
    ? <RemoteBookForm services={config.services} />
    : <BookFormClient services={config.services} />
}
