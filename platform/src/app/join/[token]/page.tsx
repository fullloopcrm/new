import { getAdminUser } from '@/lib/nycmaid/auth'
import { redirect } from 'next/navigation'
import { lookupInvite, acceptInviteForAdmin } from '@/lib/accept-invite'
import JoinClient from './join-client'

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const lookup = await lookupInvite(token)

  if (lookup.status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
          <p className="text-gray-600">This invite link is not valid. Please contact your administrator.</p>
        </div>
      </div>
    )
  }

  if (lookup.status === 'already_accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Accepted</h1>
          <p className="text-gray-600 mb-4">This invite has already been used.</p>
          <a href="/sign-in" className="text-blue-600 hover:text-blue-500 font-medium">
            Sign in to your account
          </a>
        </div>
      </div>
    )
  }

  if (lookup.status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite Expired</h1>
          <p className="text-gray-600">This invite has expired. Please contact your administrator for a new one.</p>
        </div>
      </div>
    )
  }

  const { invite } = lookup

  // Check if user is already signed in
  const admin = await getAdminUser()

  if (admin) {
    const result = await acceptInviteForAdmin(invite, admin)

    if (result.status === 'accepted') {
      redirect('/dashboard')
    }

    // email_mismatch — the active session belongs to a different identity
    // than the one this invite was sent to. Do not silently grant access.
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Wrong Account</h1>
          <p className="text-gray-600 mb-4">
            This invite was sent to <strong>{result.inviteEmail}</strong>, but you&apos;re signed in as a different
            account. Sign out and try again, or contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  // Not signed in — show invite details with sign-up option
  const tenantName = invite.tenants?.name || 'your business'

  return (
    <JoinClient
      token={token}
      inviteEmail={invite.email}
      tenantName={tenantName}
      tenantId={invite.tenant_id}
      inviteId={invite.id}
      role={invite.role}
    />
  )
}
