// Client-record merge: reconciles two duplicate client rows into one.
//
// Duplicate detection already exists at creation time (POST /api/clients
// blocks a new client whose email or phone matches an existing one, unless
// force=true — see src/app/api/clients/route.ts). Nothing previously existed
// to reconcile two clients that are ALREADY duplicates (created via force=true,
// via the CSV importer, or from before the creation-time check existed).
//
// "Safely retire" here means never a hard DELETE. clients is referenced by
// FKs across the whole app (bookings, payments, invoices, contacts,
// properties, comms, ratings, deals, quotes, recurring schedules) — some of
// those FKs are ON DELETE CASCADE (client_contacts, client_properties,
// client_sms_messages), so a hard delete of the duplicate would silently
// destroy that history instead of preserving it under the canonical client.
// Instead: every child row is re-pointed from duplicate -> canonical
// (UPDATE, not re-insert, so row ids/created_at/history are untouched), then
// the duplicate itself is soft-retired using the same `clients.active=false`
// convention gdpr-deletion.ts already established for "this client record is
// retired but not destroyed" — NOT a new column, since a schema change is
// outside this change's scope. The merge is traceable via a note prepended
// to the duplicate's own `notes` field and an audit_logs row
// (action: 'client.merged') recording both ids and exactly what moved.
//
// Tenant safety: the initial lookup goes through tenantDb(tenantId), which
// auto-scopes every query to `.eq('tenant_id', tenantId)` (see tenant-db.ts).
// Combined with looking both client rows up by id WITHIN that tenant scope
// before doing anything else, a caller can never merge across tenants even if
// it somehow obtained a foreign client id. The actual writes happen inside
// merge_client_atomic (2026_08_13_merge_client_atomic.sql), which
// re-verifies tenant_id on both rows itself before touching anything.
//
// Atomicity (added 2026-08-13): the demote/repoint/retire writes below used
// to be separate sequential calls with no surrounding transaction -- fine
// when a human triggered one merge at a time and could notice a partial
// failure, not fine once the automated dedupe cron (client-dedupe.ts) started
// calling this unattended, nightly, across every tenant. merge_client_atomic
// folds all of it into one plpgsql function/transaction: a failure partway
// through now rolls back everything instead of leaving some tables repointed
// and others not.

import { tenantDb } from './tenant-db'
import { supabaseAdmin } from './supabase'
import { audit } from './audit'

export class ClientMergeError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

// Tables with a `client_id` FK whose rows represent booking, payment, or
// communication history that must survive the merge under the canonical
// client. Order doesn't matter -- each is an independent UPDATE keyed on its
// own `client_id` column, not a chain.
const REPOINT_TABLES = [
  // Booking history
  'bookings',
  'recurring_schedules',
  // Payment / billing history
  'payments',
  'invoices',
  // Communication history
  'comhub_contacts',
  'client_sms_messages',
  // Client's own records (contacts/addresses) and sales-adjacent history
  'client_contacts',
  'client_properties',
  'ratings',
  'deals',
  'quotes',
] as const

export interface ClientMergeResult {
  canonicalClientId: string
  duplicateClientId: string
  /** Rows moved per table (table name -> row count re-pointed). */
  movedCounts: Record<string, number>
}

interface ClientRow {
  id: string
  name: string
  notes: string | null
}

/**
 * Merges `duplicateClientId`'s booking/payment/communication history onto
 * `canonicalClientId`, then soft-retires the duplicate. Idempotent in the
 * sense that re-running after a successful merge is a no-op on every
 * REPOINT_TABLES query (nothing left with client_id = duplicateClientId) and
 * simply re-writes the same retirement fields on the duplicate.
 */
export async function mergeClients({
  tenantId,
  canonicalClientId,
  duplicateClientId,
  mergedBy,
}: {
  tenantId: string
  canonicalClientId: string
  duplicateClientId: string
  mergedBy?: string
}): Promise<ClientMergeResult> {
  if (!canonicalClientId || !duplicateClientId) {
    throw new ClientMergeError('canonicalClientId and duplicateClientId are both required', 400)
  }
  if (canonicalClientId === duplicateClientId) {
    throw new ClientMergeError('Cannot merge a client into itself', 400)
  }

  const db = tenantDb(tenantId)

  const [{ data: canonical, error: canonicalErr }, { data: duplicate, error: duplicateErr }] = await Promise.all([
    db.from('clients').select('id, name, notes').eq('id', canonicalClientId).single(),
    db.from('clients').select('id, name, notes').eq('id', duplicateClientId).single(),
  ])
  if (canonicalErr || !canonical) throw new ClientMergeError('Canonical client not found', 404)
  if (duplicateErr || !duplicate) throw new ClientMergeError('Duplicate client not found', 404)

  const mergedAt = new Date().toISOString()
  const mergeNote = `[Merged into client ${canonicalClientId} (${(canonical as ClientRow).name}) on ${mergedAt}${mergedBy ? ` by ${mergedBy}` : ''}]`
  const existingNotes = (duplicate as ClientRow).notes ? String((duplicate as ClientRow).notes) : ''

  // One RPC, one transaction -- see the atomicity note above. Demotes the
  // duplicate's own "primary" flags, repoints every REPOINT_TABLES row, and
  // retires the duplicate, all inside merge_client_atomic. Any failure
  // anywhere in that sequence rolls the whole thing back.
  const { data: moved, error: mergeErr } = await supabaseAdmin.rpc('merge_client_atomic', {
    p_tenant_id: tenantId,
    p_canonical_id: canonicalClientId,
    p_duplicate_id: duplicateClientId,
    p_repoint_tables: [...REPOINT_TABLES],
    p_merge_note: mergeNote,
    p_existing_notes: existingNotes,
  })
  if (mergeErr) {
    throw new ClientMergeError(`Failed to merge client records: ${mergeErr.message}`, 500)
  }
  const movedCounts = (moved || {}) as Record<string, number>

  await audit({
    tenantId,
    action: 'client.merged',
    entityType: 'client',
    entityId: canonicalClientId,
    userId: mergedBy,
    details: { duplicateClientId, movedCounts },
  })

  return { canonicalClientId, duplicateClientId, movedCounts }
}
