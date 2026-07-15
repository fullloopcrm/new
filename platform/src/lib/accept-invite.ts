import { supabaseAdmin } from '@/lib/supabase'
import { logSecurityEvent } from '@/lib/security'
import type { AdminUser } from '@/lib/nycmaid/auth'

export interface TenantInviteRow {
  id: string
  tenant_id: string
  email: string
  role: string
  accepted: boolean
  expires_at: string
  tenants?: { id: string; name: string; industry: string } | null
}

export type InviteLookup =
  | { status: 'invalid' }
  | { status: 'already_accepted' }
  | { status: 'expired' }
  | { status: 'valid'; invite: TenantInviteRow }

export async function lookupInvite(token: string): Promise<InviteLookup> {
  const { data: invite } = await supabaseAdmin
    .from('tenant_invites')
    .select('*, tenants(id, name, industry)')
    .eq('token', token)
    .single()

  if (!invite) return { status: 'invalid' }
  if (invite.accepted) return { status: 'already_accepted' }
  if (new Date(invite.expires_at) < new Date()) return { status: 'expired' }
  return { status: 'valid', invite }
}

export type AcceptResult =
  | { status: 'email_mismatch'; inviteEmail: string }
  | { status: 'accepted'; tenantId: string }

// Grants the signed-in admin identity membership on the invite's tenant.
// The signed-in identity's own email must match the invite's — otherwise
// whichever admin_session happens to be active in the browser (any
// admin_users login, not necessarily the invited person) would silently
// inherit tenant_members access — often role:'owner' — to a tenant the
// invite was never sent to that identity for.
export async function acceptInviteForAdmin(
  invite: TenantInviteRow,
  admin: Pick<AdminUser, 'id' | 'email'>,
): Promise<AcceptResult> {
  if (!admin.email || admin.email.toLowerCase() !== invite.email.toLowerCase()) {
    return { status: 'email_mismatch', inviteEmail: invite.email }
  }

  const { data: existingMember } = await supabaseAdmin
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', invite.tenant_id)
    .eq('clerk_user_id', admin.id)
    .single()

  if (!existingMember) {
    await supabaseAdmin.from('tenant_members').insert({
      tenant_id: invite.tenant_id,
      clerk_user_id: admin.id,
      role: invite.role || 'owner',
    })
  }

  await supabaseAdmin.from('tenant_invites').update({ accepted: true }).eq('id', invite.id)

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

  return { status: 'accepted', tenantId: invite.tenant_id }
}
