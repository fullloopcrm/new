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
// Tenant safety: every read/write here goes through tenantDb(tenantId), which
// auto-scopes every query to `.eq('tenant_id', tenantId)` (see tenant-db.ts).
// Combined with looking both client rows up by id WITHIN that tenant scope
// before doing anything else, a caller can never merge across tenants even if
// it somehow obtained a foreign client id.

import { tenantDb } from './tenant-db'
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

  // Demote the duplicate's own "primary" flags BEFORE re-pointing, so the
  // re-point below never leaves the canonical client with two
  // is_primary=true contacts or two is_primary=true properties. The
  // canonical client's own existing primary (if any) is left untouched.
  await db.from('client_contacts').update({ is_primary: false }).eq('client_id', duplicateClientId)
  await db.from('client_properties').update({ is_primary: false }).eq('client_id', duplicateClientId)

  const movedCounts: Record<string, number> = {}
  for (const table of REPOINT_TABLES) {
    const { data, error } = await db
      .from(table)
      .update({ client_id: canonicalClientId })
      .eq('client_id', duplicateClientId)
      .select('id')
    if (error) {
      throw new ClientMergeError(`Failed to move ${table} to the canonical client: ${error.message}`, 500)
    }
    movedCounts[table] = Array.isArray(data) ? data.length : 0
  }

  const mergedAt = new Date().toISOString()
  const mergeNote = `[Merged into client ${canonicalClientId} (${(canonical as ClientRow).name}) on ${mergedAt}${mergedBy ? ` by ${mergedBy}` : ''}]`
  const existingNotes = (duplicate as ClientRow).notes ? String((duplicate as ClientRow).notes) : ''

  const { error: retireErr } = await db
    .from('clients')
    .update({
      active: false,
      do_not_service: true,
      notes: existingNotes ? `${mergeNote}\n${existingNotes}` : mergeNote,
    })
    .eq('id', duplicateClientId)
  if (retireErr) {
    throw new ClientMergeError(`Moved child records but failed to retire the duplicate client: ${retireErr.message}`, 500)
  }

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
