import { supabaseAdmin } from '@/lib/supabase'
import JoinClient from './join-client'

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Look up the invite
  const { data: invite } = await supabaseAdmin
    .from('tenant_invites')
    .select('*, tenants(id, name, industry)')
    .eq('token', token)
    .single()

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
          <p className="text-gray-600">This invite link is not valid. Please contact your administrator.</p>
        </div>
      </div>
    )
  }

  if (invite.accepted) {
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

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite Expired</h1>
          <p className="text-gray-600">This invite has expired. Please contact your administrator for a new one.</p>
        </div>
      </div>
    )
  }

  // Accepting mints a real, working credential (a PIN on tenant_members,
  // the same mechanism every other white-glove-onboarded operator uses —
  // see /api/invites/[token]/accept). There is no Clerk-style session to
  // check here; that path was dormant (lib/owner-session.ts) and could
  // never actually resolve for a fresh invitee.
  const tenantName = invite.tenants?.name || 'your business'

  return (
    <JoinClient token={token} inviteEmail={invite.email} tenantName={tenantName} />
  )
}
