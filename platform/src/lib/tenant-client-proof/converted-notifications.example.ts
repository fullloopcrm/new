/**
 * PROOF OF CONVERSION — notifications feed (read + conditional mark-read) — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET converted to the scoped client:
 *   - src/app/api/notifications/route.ts  (GET: the admin's 50 latest notifications + unread
 *     count, and — when `?mark_read=true` — flips those rows' metadata.read to true)
 *
 * What this route adds over every prior proof: it is the first "read route" that ALSO MUTATES.
 * One `tenantClient(tenantId)` serves THREE operations, in order:
 *   1. LIST   — `.select('*')` … `.limit(50)`                 (the feed)
 *   2. COUNT  — `.select('id',{count:'exact',head:true})` …   (the unread badge; head=no rows)
 *              `.is('metadata->read', null)`                   ← JSON-path `.is()` null filter,
 *                                                                first in the proof set
 *   3. UPDATE — (conditional) `.update({metadata:{read:true}}).in('id', ids)`  (mark-as-read)
 *
 * NEW cutover considerations this surfaces (beyond the pure reads):
 *
 *   - RLS must cover the WRITE, not just the read. The gap-closure policy is
 *     `FOR ALL … USING(tenant_id=…) WITH CHECK(tenant_id=…)`, so UPDATE is in scope — but that
 *     means once cut over, RLS is the write's tenant guard too, and a converted route MUST NOT
 *     assume SELECT-only enforcement.
 *   - The UPDATE has NO explicit `.eq('tenant_id')` — it trusts that `ids` came from the
 *     tenant-scoped LIST above. Under `supabaseAdmin` that trust is the ONLY guard; under
 *     `tenantClient` the policy's USING clause ALSO scopes the UPDATE, so conversion TIGHTENS
 *     it (a leaked cross-tenant id could not be written). Worth stating explicitly: do not
 *     "clean up" by dropping the id-provenance assumption before cutover — keep both guards.
 *
 * Table `notifications` is tier #38 — a single-table floor case (no embed, no join), so the
 * read/write themselves are SAFE to cut over once #38 has its policy. The novelty is the
 * read+write shape, not a tier-ordering hazard.
 *
 * ERROR HANDLING — faithful: the live route returns a 500 inline on the LIST error (does NOT
 * swallow to `[]`); the proof surfaces it via `throw`. The COUNT error is IGNORED by the live
 * route (`const { count: unread } = …` never reads `error`) → unread falls back to 0; the proof
 * mirrors that exactly rather than "fixing" it. `{ notifications: data }` is returned verbatim
 * (no `?? []`), matching live.
 *
 * Auth entry is unchanged: the live GET authenticates via `getTenantForRequest()` and reads
 * `mark_read` from the query string. This proof takes `tenantId` + a `markRead` boolean
 * directly. The POST half (insert notification + optional SMS) is untouched.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/**
 * Converted read+mark-read path of GET /api/notifications. One scoped client runs the feed
 * LIST, the unread COUNT and the conditional mark-read UPDATE. Keeps every filter, the
 * created-at-desc order, the 50-row cap, and the `{ notifications, unread }` shape verbatim.
 * Surfaces the LIST error via `throw`; ignores the COUNT error (unread→0) exactly as live.
 *
 * The ONLY change from the live route is the client: `tenantClient(tenantId)` where each
 * operation read `supabaseAdmin`. Filters, order, limit and the update payload are unchanged.
 */
export async function listNotificationsConverted(
  tenantId: string,
  markRead: boolean,
): Promise<{ notifications: unknown; unread: number }> {
  const db = tenantClient(tenantId) // was: supabaseAdmin — one client for LIST + COUNT + UPDATE

  const { data, error } = await db
    .from('notifications')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('recipient_type', 'admin')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error

  // COUNT: head-only unread badge. Error deliberately ignored (faithful to live) → unread=0.
  const { count: unread } = await db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('recipient_type', 'admin')
    .is('metadata->read', null)

  if (markRead) {
    const ids = ((data as Array<{ id: string }> | null) ?? []).map((n) => n.id)
    if (ids.length > 0) {
      // NOTE: no explicit .eq('tenant_id') — ids come from the scoped LIST above; under
      // tenantClient the RLS policy also scopes this UPDATE (see module header).
      await db.from('notifications').update({ metadata: { read: true } }).in('id', ids)
    }
  }

  return { notifications: data, unread: unread || 0 }
}
