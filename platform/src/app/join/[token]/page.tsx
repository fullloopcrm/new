import { supabaseAdmin } from '@/lib/supabase'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
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

  // Check if user is already signed in
  const { userId } = await auth()

  if (userId) {
    // Already signed in — accept the invite directly
    // Check if already a member
    const { data: existingMember } = await supabaseAdmin
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', invite.tenant_id)
      .eq('clerk_user_id', userId)
      .single()

    if (!existingMember) {
      // Add them as a member
      await supabaseAdmin.from('tenant_members').insert({
        tenant_id: invite.tenant_id,
        clerk_user_id: userId,
        role: invite.role || 'owner',
      })
    }

    // Mark invite as accepted
    await supabaseAdmin
      .from('tenant_invites')
      .update({ accepted: true })
      .eq('id', invite.id)

    redirect('/dashboard')
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
