// GDPR/CCPA right-to-be-forgotten workflow.
//
// requestDeletion() soft-deletes a client immediately (clients.active=false)
// and opens a 30-day cancellable grace period. cancelDeletion() reverses that
// within the window. purgeDueDeletions() — meant to be called by a daily cron
// — irreversibly anonymizes PII on requests whose grace period has elapsed.
// Rows are never hard-deleted: booking counts, revenue totals, and other
// tenant-level aggregates stay intact because only PII columns are
// overwritten, not the rows themselves.
//
// PII field list below is grounded in the columns visible in this repo's own
// migration history (clients, invoices, client_sms_messages) — not a live
// schema introspection. Verify against the production schema before relying
// on it for full compliance coverage.

import { supabaseAdmin } from './supabase'
import { tenantDb } from './tenant-db'
import { audit } from './audit'

export const GDPR_GRACE_PERIOD_DAYS = 30

export interface GdprDeletionRequest {
  id: string
  tenant_id: string
  client_id: string
  status: 'pending' | 'cancelled' | 'completed'
  requested_by: string | null
  requested_at: string
  scheduled_purge_at: string
  cancelled_at: string | null
  completed_at: string | null
}

export class GdprDeletionError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export async function requestDeletion({
  tenantId,
  clientId,
  requestedBy,
}: {
  tenantId: string
  clientId: string
  requestedBy?: string
}): Promise<GdprDeletionRequest> {
  const db = tenantDb(tenantId)

  const { data: client, error: clientErr } = await db.from('clients').select('id').eq('id', clientId).single()
  if (clientErr || !client) throw new GdprDeletionError('Client not found', 404)

  const { data: existing } = await db
    .from('gdpr_deletion_requests')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .single()
  if (existing) throw new GdprDeletionError('A deletion request is already pending for this client', 409)

  const requestedAt = new Date()
  const scheduledPurgeAt = new Date(requestedAt.getTime() + GDPR_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)

  const { error: softDeleteErr } = await db
    .from('clients')
    .update({ active: false, deletion_requested_at: requestedAt.toISOString() })
    .eq('id', clientId)
  if (softDeleteErr) throw new GdprDeletionError(softDeleteErr.message, 500)

  const { data: inserted, error: insertErr } = await db
    .from('gdpr_deletion_requests')
    .insert({
      client_id: clientId,
      status: 'pending',
      requested_by: requestedBy || null,
      requested_at: requestedAt.toISOString(),
      scheduled_purge_at: scheduledPurgeAt.toISOString(),
    })
    .select()
    .single()
  if (insertErr || !inserted) {
    throw new GdprDeletionError(insertErr?.message || 'Failed to create deletion request', 500)
  }

  await audit({
    tenantId,
    action: 'client.gdpr_deletion_requested',
    entityType: 'client',
    entityId: clientId,
    details: { scheduledPurgeAt: scheduledPurgeAt.toISOString(), requestedBy: requestedBy || null },
  })

  return inserted as GdprDeletionRequest
}

export async function cancelDeletion({
  tenantId,
  clientId,
}: {
  tenantId: string
  clientId: string
}): Promise<void> {
  const db = tenantDb(tenantId)

  const { data: pending, error: findErr } = await db
    .from('gdpr_deletion_requests')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .single()
  if (findErr || !pending) throw new GdprDeletionError('No pending deletion request for this client', 404)

  const cancelledAt = new Date().toISOString()

  const { error: cancelErr } = await db
    .from('gdpr_deletion_requests')
    .update({ status: 'cancelled', cancelled_at: cancelledAt })
    .eq('id', pending.id as string)
  if (cancelErr) throw new GdprDeletionError(cancelErr.message, 500)

  const { error: restoreErr } = await db
    .from('clients')
    .update({ active: true, deletion_requested_at: null })
    .eq('id', clientId)
  if (restoreErr) throw new GdprDeletionError(restoreErr.message, 500)

  await audit({ tenantId, action: 'client.gdpr_deletion_cancelled', entityType: 'client', entityId: clientId })
}

const REDACTED_NAME = 'Deleted User'
const REDACTED_MESSAGE = '[deleted — GDPR request]'

async function purgeOne(tenantId: string, clientId: string, requestId: string): Promise<void> {
  const db = tenantDb(tenantId)
  const completedAt = new Date().toISOString()

  const { error: clientErr } = await db
    .from('clients')
    .update({
      name: REDACTED_NAME,
      email: null,
      phone: null,
      address: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      zip: null,
      pin: null,
      pet_name: null,
      pet_type: null,
      lat: null,
      lng: null,
      notes: null,
      selena_memory_summary: null,
      anonymized_at: completedAt,
    })
    .eq('id', clientId)
  if (clientErr) throw new Error(`client anonymize: ${clientErr.message}`)

  const { error: smsErr } = await db
    .from('client_sms_messages')
    .update({ message: REDACTED_MESSAGE })
    .eq('client_id', clientId)
  if (smsErr) throw new Error(`sms anonymize: ${smsErr.message}`)

  const { error: invoiceErr } = await db
    .from('invoices')
    .update({ contact_name: null, contact_email: null, contact_phone: null, service_address: null })
    .eq('client_id', clientId)
  if (invoiceErr) throw new Error(`invoice anonymize: ${invoiceErr.message}`)

  const { error: reqErr } = await db
    .from('gdpr_deletion_requests')
    .update({ status: 'completed', completed_at: completedAt })
    .eq('id', requestId)
  if (reqErr) throw new Error(`request complete: ${reqErr.message}`)

  await audit({ tenantId, action: 'client.gdpr_deletion_purged', entityType: 'client', entityId: clientId })
}

/**
 * Sweeps ALL tenants for deletion requests whose grace period has elapsed
 * and purges each one. The sweep read is necessarily cross-tenant (no single
 * tenant context exists in a cron); every mutation on a found request is
 * then scoped through tenantDb(request.tenant_id) so no request can touch
 * another tenant's rows.
 */
export async function purgeDueDeletions({ now }: { now?: Date } = {}): Promise<{
  purged: number
  errors: string[]
}> {
  const cutoff = (now || new Date()).toISOString()
  let purged = 0
  const errors: string[] = []

  const { data: due, error: dueErr } = await supabaseAdmin
    .from('gdpr_deletion_requests')
    .select('id, tenant_id, client_id')
    .eq('status', 'pending')
    .lte('scheduled_purge_at', cutoff)
    .limit(500)

  if (dueErr) {
    errors.push(`Failed to load due deletion requests: ${dueErr.message}`)
    return { purged, errors }
  }

  for (const request of due || []) {
    try {
      await purgeOne(request.tenant_id as string, request.client_id as string, request.id as string)
      purged++
    } catch (e) {
      errors.push(`request ${request.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { purged, errors: errors.slice(0, 20) }
}
