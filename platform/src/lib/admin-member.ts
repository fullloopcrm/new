import { supabaseAdmin } from './supabase'

// Resolve the tenant_members row id to use as the "current admin" for routes
// that need a per-user record (voice presence, voice settings, etc.). The
// fullloop platform uses a single-token super_admin auth — there's no
// individual user identity at the cookie layer — so we default to the
// tenant's first owner; if none, the first member.
export async function getActiveAdminMemberId(tenantId: string): Promise<string | null> {
  const { data: owner } = await supabaseAdmin
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('role', 'owner')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (owner?.id) return owner.id

  const { data: any } = await supabaseAdmin
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return any?.id ?? null
}
