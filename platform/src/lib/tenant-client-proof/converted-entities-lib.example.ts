/**
 * PROOF OF CONVERSION — entities (shared lib helper) — NOT WIRED, REVERSIBLE.
 *
 * Low-risk read converted to the scoped client — but the target is a SHARED LIB HELPER, not
 * an inline route read:
 *   - src/lib/entity.ts :: listEntities(tenantId)   (called by GET /api/finance/entities and
 *     other finance routes that list a tenant's legal/accounting entities)
 *
 * What this adds over every prior proof: the conversion point is a DATA-ACCESS HELPER shared
 * across call sites, so ONE edit inside the helper scopes EVERY caller at once — the DRY
 * cutover point, in contrast to the ~24 prior proofs that each converted a single route's
 * inline query. The helper already RECEIVES `tenantId` (it is the only argument), and that
 * same value is exactly the RLS scope key, so the swap is a one-line change with NO signature
 * change: `supabaseAdmin` → `tenantClient(tenantId)`. Callers are untouched.
 *
 * The query itself is a floor case: single table `entities` (tier #17), an `.eq('active',
 * true)` compound filter alongside the tenant scope, and a dual order (`is_default` DESC then
 * `name` ASC). No embed, no join — SAFE to cut over once `entities` (#17) has its own policy;
 * nothing else is load-bearing for THIS helper. (The `entities(name)` embed seen in
 * `finance/periods` is a SEPARATE call site with its own tier-ordering to weigh; it does not
 * ride on this helper.)
 *
 * ERROR HANDLING — faithful: the live helper `throw`s on a read error (`if (error) throw
 * error`). The converted helper preserves that, so an RLS default-deny surfaces rather than
 * silently returning `[]`.
 *
 * The live `listEntities` is UNCHANGED. Deleting this directory reverts the proof with zero
 * impact. (This is a byte-for-byte copy of the helper body with only the client swapped, kept
 * here so the isolation test can exercise it without importing the real `supabaseAdmin`.)
 */
import { tenantClient } from '../tenant-client'

/** Mirrors the `Entity` shape the live helper returns (src/lib/entity.ts). */
export interface Entity {
  id: string
  tenant_id: string
  name: string
  legal_name: string | null
  ein: string | null
  entity_type: string | null
  is_default: boolean
  active: boolean
}

/**
 * Converted `listEntities`. Lists a tenant's ACTIVE entities through the scoped client,
 * keeping the tenant scope, the `active = true` filter and the default-first / name-next
 * order. Returns the row array (empty on no rows); surfaces a read error via `throw`.
 *
 * The ONLY change from the live helper is the client: `tenantClient(tenantId)` where it read
 * `supabaseAdmin`. Because the helper is shared, this single swap scopes every caller.
 */
export async function listEntitiesConverted(tenantId: string): Promise<Entity[]> {
  const db = tenantClient(tenantId) // was: supabaseAdmin — filters + dual order unchanged
  const { data, error } = await db
    .from('entities')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })
  if (error) throw error
  return (data || []) as Entity[]
}
