import { redirect } from 'next/navigation'

// Leads merged into the unified Sales page — the live-visitor feed now lives in
// the Sales page's "Leads" tab (LeadsFeed). This old route redirects there.
export default function LeadsRedirect() {
  redirect('/dashboard/sales')
}
