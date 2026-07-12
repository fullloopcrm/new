/**
 * PROOF OF CONVERSION — finance/bank-accounts — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/finance/bank-accounts/route.ts  (GET: list bank_accounts + embedded config)
 *
 * What this route adds over the floor case: a DUAL embedded-join select
 * (`chart_of_accounts(code, name, type)` and `entities(id, name)`), a boolean
 * `.eq('active', true)` filter, and an OPTIONAL `entity_id` filter chained only when the
 * caller passes one (?entity_id=…). The conversion is still the two-line client swap; every
 * `.eq('tenant_id', tenantId)` is KEPT verbatim.
 *
 * ⚠ CROSS-TABLE RLS DEPENDENCY — AND A TIER-ORDERING HAZARD (the real finding here):
 * the embedded selects read `chart_of_accounts` and `entities` THROUGH the scoped client, so
 * both child tables must have an RLS policy before this route converts, or under an
 * authenticated token those embeds default-deny and come back `null` (the account rows still
 * return, but `chart_of_accounts`/`entities` on each row silently null out).
 *
 * The hazard is the ORDER: in deploy-prep/rls-tier-rollout-order.md the parent
 * `bank_accounts` is Tier #4 (Tier 1, highest-risk-first), but the embedded children are
 * LATER — `chart_of_accounts` #15 and `entities` #17. Converting the parent at its own tier
 * (#4) runs embedded reads against children whose Stage C+D is not done until #15/#17. That
 * inverts the master plan's dependency rule ("do not convert a parent whose child has no
 * policy"). So bank-accounts must NOT be cut over at #4; hold it until #15 AND #17 are both
 * load-bearing, OR move the embed to a KEEP (service_role) path with an explicit tenant check.
 * Flagged for the cutover — see rls-cutover-master-plan.md §"Cross-table read dependencies".
 *
 * Auth entry is unchanged (`requirePermission('finance.view')`); this proof takes `tenantId`
 * + an optional `entityId` directly so the isolation test exercises both filter paths.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/** Converted read path of GET /api/finance/bank-accounts (dual embed + optional entity filter). */
export async function listBankAccountsConverted(tenantId: string, entityId?: string | null) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — embeds below are now scoped too
  let q = db
    .from('bank_accounts')
    .select('*, chart_of_accounts(code, name, type), entities(id, name)')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('created_at', { ascending: true })
  if (entityId) q = q.eq('entity_id', entityId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}
