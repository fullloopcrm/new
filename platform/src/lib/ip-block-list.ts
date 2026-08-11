import { supabaseAdmin } from '@/lib/supabase'

// Shared by the Comm Hub contact block button and the client DNS flow
// (2026-08-10) — both need to add/remove an exact IP from a tenant's
// site-wide block list (tenants.blocked_ips, enforced in middleware.ts).
// Read-modify-write on the array: block-list churn is rare (abuse/DNS
// cases only), so the tiny race window against a concurrent edit is an
// acceptable tradeoff against a real set-membership RPC.
export async function setTenantIpBlocked(tenantId: string, ip: string | null | undefined, blocked: boolean): Promise<void> {
  if (!ip) return
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('blocked_ips')
    .eq('id', tenantId)
    .single()
  const current: string[] = tenant?.blocked_ips || []
  const next = blocked
    ? Array.from(new Set([...current, ip]))
    : current.filter((existing) => existing !== ip)
  await supabaseAdmin.from('tenants').update({ blocked_ips: next }).eq('id', tenantId)
}
