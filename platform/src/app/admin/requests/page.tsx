import { redirect } from 'next/navigation'

// Partner requests are now managed inside the unified Sales surface.
// Points straight at /admin/sales (not /admin/leads, which is itself just a
// redirect there) so this doesn't chain through two hops for no reason.
export default function RequestsPage() {
  redirect('/admin/sales')
}
