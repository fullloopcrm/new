import { supabaseAdmin } from './supabase'

/**
 * Guards against cross-tenant reference injection.
 *
 * A tenant-scoped write can set its own `tenant_id` correctly and STILL attach a
 * foreign-key id (client_id, team_member_id, service_type_id, …) that belongs to
 * another tenant — FK constraints don't enforce tenancy. This verifies that every
 * provided id actually exists within `tenantId` for its table.
 *
 * Returns the first offending `{ table, id }`, or `null` when every provided id
 * belongs to the tenant (empty/nullish ids are ignored).
 */
export async function findForeignRef(
  tenantId: string,
  refs: { table: string; ids: (string | null | undefined)[] }[],
): Promise<{ table: string; id: string } | null> {
  for (const { table, ids } of refs) {
    const wanted = ids.filter((x): x is string => typeof x === 'string' && x.length > 0)
    if (wanted.length === 0) continue

    const { data } = await supabaseAdmin
      .from(table)
      .select('id')
      .eq('tenant_id', tenantId)
      .in('id', wanted)

    const found = new Set((data || []).map((r) => r.id as string))
    const missing = wanted.find((id) => !found.has(id))
    if (missing) return { table, id: missing }
  }
  return null
}
