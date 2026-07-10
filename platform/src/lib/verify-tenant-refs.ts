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

// Columns a client must never set through a mass-assigned write. Stripping these
// stops a raw `.update(body)` from moving a row to another tenant (tenant_id) or
// rewriting identity/audit fields.
const IMMUTABLE_WRITE_KEYS = ['tenant_id', 'id', 'created_at']

/**
 * Returns a shallow copy of `body` with system-owned keys removed, so a raw
 * `.update()` / `.insert()` of request JSON can't mass-assign them. Non-object
 * input yields `{}`.
 */
export function stripImmutable<T extends Record<string, unknown>>(body: T): Partial<T> {
  if (!body || typeof body !== 'object') return {}
  const out: Record<string, unknown> = { ...body }
  for (const k of IMMUTABLE_WRITE_KEYS) delete out[k]
  return out as Partial<T>
}
