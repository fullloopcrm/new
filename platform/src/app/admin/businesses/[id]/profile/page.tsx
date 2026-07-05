import Link from 'next/link'
import { ProfileForm } from '@/components/admin/ProfileForm'

/**
 * New registry-driven tenant-profile page — the one live-save form. Additive:
 * lives alongside the legacy mega-page ([id]) until parity is verified and we cut
 * over. Server shell resolves params, then mounts the client ProfileForm.
 */
export default async function TenantProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/admin/businesses/${id}`} className="text-sm text-teal-600 hover:text-teal-700">&larr; Business</Link>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">New profile form · live-save</span>
      </div>
      <h1 className="mb-1 font-heading text-2xl font-bold text-slate-900">Business Profile</h1>
      <p className="mb-8 text-sm text-slate-500">Every field saves as you type and populates the whole account. Fill the required fields, then activate.</p>
      <ProfileForm tenantId={id} />
    </div>
  )
}
