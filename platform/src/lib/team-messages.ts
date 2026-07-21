import { supabaseAdmin } from './supabase'
import type { TenantContext } from './tenant-query'

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Resolves the current dashboard session to a team_members.id for
 * team_direct_messages. A team-member PIN login IS already a team_members.id
 * (ctx.userId). A Clerk/admin owner session isn't a team_members row at all,
 * so it resolves to that tenant's founding team_members row instead --
 * activate-tenant.ts always seeds one at activation, email = tenant.owner_email.
 * Returns null only if the tenant somehow has zero active team_members rows.
 */
export async function resolveActorTeamMemberId(ctx: TenantContext): Promise<string | null> {
  if (UUID_RE.test(ctx.userId)) {
    const { data } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('id', ctx.userId)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle()
    if (data) return data.id
  }

  if (ctx.tenant.owner_email) {
    const { data } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .eq('email', ctx.tenant.owner_email)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (data) return data.id
  }

  const { data: earliest } = await supabaseAdmin
    .from('team_members')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return earliest?.id || null
}
