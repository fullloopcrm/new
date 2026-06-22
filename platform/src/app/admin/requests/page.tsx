import { redirect } from 'next/navigation'

// Partner requests are now managed as leads in the sales pipeline.
export default function RequestsPage() {
  redirect('/admin/leads')
}
