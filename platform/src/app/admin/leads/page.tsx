import { redirect } from 'next/navigation'

// Leads now live inside the unified Sales surface (Leads | Accounts toggle).
// Old /admin/leads route redirects so there's no stale duplicate.
export default function LeadsRedirect() {
  redirect('/admin/sales')
}
