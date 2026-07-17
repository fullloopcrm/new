/**
 * Guard against hard-deleting a client who has real booking/revenue or sales
 * history attached. DELETE /api/clients/[id] is the only door that hard-deletes
 * a clients row, and it never checked this: bookings carries a NOT NULL
 * ON DELETE CASCADE to clients (migration 008) — deleting a client silently
 * destroys every booking (completed and paid included), which itself
 * cascades further into booking_team_members and ratings (migration 050) and
 * referral_commissions (migration 019). client_properties/property_changes
 * also cascade (migration 052). None of that has a confirmation step or an
 * undo today.
 *
 * deals.client_id has no ON DELETE action (defaults to RESTRICT) — a client
 * with an open deal would already 500 with a raw Postgres FK-violation
 * instead of cascading, so it's caught here too for a clean 409 instead of a
 * leaked DB error.
 *
 * clients.status already supports an inactive-style state via 'status' field
 * (e.g. 'inactive'/'archived') used exactly for "remove from the active list,
 * keep the record" — this guard steers callers there instead of guessing a
 * new soft-delete mechanism.
 */
import { supabaseAdmin } from '@/lib/supabase'

export interface DeleteGuardResult {
  deletable: boolean
  reason?: string
}

export async function checkClientDeletable(
  tenantId: string,
  clientId: string,
): Promise<DeleteGuardResult> {
  const [bookings, deals, properties] = await Promise.all([
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('client_id', clientId),
    supabaseAdmin.from('deals').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('client_id', clientId),
    supabaseAdmin.from('client_properties').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('client_id', clientId),
  ])

  if ((bookings.count || 0) > 0) {
    return {
      deletable: false,
      reason: 'This client has booking history and cannot be deleted — set status to inactive instead to preserve the booking and revenue record.',
    }
  }
  if ((deals.count || 0) > 0) {
    return {
      deletable: false,
      reason: 'This client has deals on file and cannot be deleted — set status to inactive instead, or close/remove the deals first.',
    }
  }
  if ((properties.count || 0) > 0) {
    return {
      deletable: false,
      reason: 'This client has saved properties on file and cannot be deleted — set status to inactive instead to preserve the property record.',
    }
  }
  return { deletable: true }
}
