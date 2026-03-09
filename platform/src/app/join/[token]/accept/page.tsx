import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { logSecurityEvent } from '@/lib/security'

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { userId } = await auth()

  if (!userId) {
    // Not signed in — send back to join page
    redirect(`/join/${token}`)
  }

  // Look up the invite
  const { data: invite } = await supabaseAdmin
    .from('tenant_invites')
    .select('*')
    .eq('token', token)
    .single()

  if (!invite || invite.accepted || new Date(invite.expires_at) < new Date()) {
    redirect('/dashboard')
  }

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

  // Update tenant status from setup to active if this is the first member
  await supabaseAdmin
    .from('tenants')
    .update({ status: 'active' })
    .eq('id', invite.tenant_id)
    .eq('status', 'setup')

  await logSecurityEvent({
    tenantId: invite.tenant_id,
    type: 'login',
    description: `Owner accepted invite and joined (${invite.email})`,
  })

  redirect('/dashboard')
}
