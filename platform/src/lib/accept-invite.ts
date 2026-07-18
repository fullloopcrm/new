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
  // maybeSingle() (not single()), error checked explicitly: token is UNIQUE at
  // the DB level, so an unknown/bogus token legitimately returns 0 rows — the
  // normal "invalid invite" case. single() can't tell that apart from a
  // genuine transient DB failure (both surface as data:null once only `data`
  // is destructured), so a DB blip used to render the exact same "Invalid
  // Invite — contact your administrator" page as a real bad token, sending a
  // legitimately-invited admin down a support dead-end instead of a retry.
  const { data: invite, error } = await supabaseAdmin
    .from('tenant_invites')
    .select('*, tenants(id, name, industry)')
    .eq('token', token)
    .maybeSingle()

  if (error) {
    throw new Error(`TENANT_INVITE_LOOKUP_ERROR token=${token} error=${error.message}`)
  }

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

  // maybeSingle() (not single()), error checked explicitly: (tenant_id,
  // clerk_user_id) is UNIQUE at the DB level (supabase/schema.sql), so "not a
  // member yet" legitimately returns 0 rows. single() can't distinguish that
  // from a genuine transient failure — both surfaced as data:null when only
  // `data` was destructured — so a DB blip here used to silently take the
  // "insert a new tenant_members row" branch on an admin who already had one,
  // attempting an insert the DB's own unique constraint would then reject
  // (with that second error also discarded), instead of failing loudly.
  const { data: existingMember, error: existingMemberError } = await supabaseAdmin
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', invite.tenant_id)
    .eq('clerk_user_id', admin.id)
    .maybeSingle()

  if (existingMemberError) {
    throw new Error(
      `TENANT_MEMBER_LOOKUP_ERROR tenant_id=${invite.tenant_id} clerk_user_id=${admin.id} error=${existingMemberError.message}`,
    )
  }

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

  // Bust tenant-lookup.ts's 5-min slug/domain cache — same class already fixed
  // for the admin-side status writes (admin/tenants/[id], admin/businesses/[id]).
  // Without this, a tenant an owner just brought out of 'setup' by accepting
  // their invite can still resolve through a warm edge isolate's cached
  // pre-active entry (tenantServesSite() evaluates the STALE status) for up to
  // the rest of the TTL.
  const { invalidateTenantCache } = await import('@/lib/tenant-lookup')
  invalidateTenantCache(invite.tenant_id)

  await logSecurityEvent({
    tenantId: invite.tenant_id,
    type: 'login',
    description: `Owner accepted invite and joined (${invite.email})`,
  })

  return { status: 'accepted', tenantId: invite.tenant_id }
}
