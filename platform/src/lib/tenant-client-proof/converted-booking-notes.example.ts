/**
 * PROOF OF CONVERSION — booking-notes — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/booking-notes/route.ts  (GET: notes for one booking)
 *
 * What this route adds over prior proofs: a REQUIRED non-tenant filter chained ALONGSIDE
 * the tenant scope. Every prior single-table proof filtered on `tenant_id` only (campaigns,
 * chart-of-accounts) or added OPTIONAL filters (quotes). Here the caller MUST supply a
 * `booking_id`, and the query carries BOTH `.eq('booking_id', bookingId)` AND
 * `.eq('tenant_id', tenantId)`. The client swap is orthogonal to both: `tenantClient(tenantId)`
 * only rescopes the connection; the two chained filters are copied verbatim. The tenant
 * `.eq(...)` is KEPT (defense-in-depth) even though `booking_id` alone would already narrow
 * the set — after RLS the tenant scope is also enforced by policy, but a stray cross-tenant
 * booking_id must never leak notes, so the explicit filter stays.
 *
 * Return SHAPE note: the live GET returns a BARE array `data || []` (not a `{ notes: [] }`
 * envelope) and surfaces a DB error inline as `{ error: error.message }` @ 500 (like campaigns,
 * unlike the finance/* throw). This helper returns the bare array and throws on error so the
 * isolation test can assert the error is surfaced, never swallowed to `[]`.
 *
 * NO CROSS-TABLE RLS DEPENDENCY: single table `booking_notes`, no embed/join. `booking_id`
 * is a plain column `.eq()` on `booking_notes` (a bookings FK, but NOT a cross-table read),
 * so it carries no extra policy dependency — only `booking_notes`' own policy is load-bearing.
 * Floor RLS case; no tier-ordering hold.
 *
 * Auth entry is unchanged: the live GET resolves the tenant via `getTenantForRequest()` and
 * reads `booking_id` from the query string (400 if missing). This proof takes `tenantId` +
 * `bookingId` directly so the isolation test exercises the DB path without the auth/parse layer.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/**
 * Converted read path of GET /api/booking-notes. Lists notes for one booking, oldest first,
 * scoped by BOTH the required booking_id and the tenant. Returns the bare array the live route
 * returns; throws on DB error so the surface (not-swallowed) is testable.
 */
export async function listBookingNotesConverted(tenantId: string, bookingId: string) {
  const db = tenantClient(tenantId) // was: supabaseAdmin
  const { data, error } = await db
    .from('booking_notes')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}
