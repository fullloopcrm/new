import { supabaseAdmin } from '@/lib/supabase'

/**
 * P2: GDPR/CCPA right-to-be-forgotten workflow.
 *
 * A deletion request opens a 30-day grace window (data_deletion_requests row +
 * clients.deletion_requested_at/deletion_purge_at). Either the client or an
 * admin can cancel within that window. Once the window elapses uncancelled,
 * cron/gdpr-purge anonymizes the client row's PII IN PLACE — the row and its
 * id are kept so FK-linked bookings/invoices/reviews keep referential
 * integrity and aggregate reporting (revenue totals, job counts, etc.) stays
 * intact. Only identity fields are erased.
 *
 * Backing table DDL: migrations/2026_07_12_gdpr_data_deletion.sql.
 */

export const GDPR_GRACE_PERIOD_DAYS = 30

export type DeletionRequestedBy = 'client' | 'admin' | 'owner'

export interface DataDeletionRequest {
  id: string
  tenant_id: string
  client_id: string
  requested_by: DeletionRequestedBy
  requested_by_id: string | null
  status: 'pending' | 'cancelled' | 'completed'
  requested_at: string
  purge_at: string
  cancelled_at: string | null
  completed_at: string | null
  notes: string | null
}

/**
 * Fields nulled/redacted on hard purge. Deliberately limited to columns this
 * codebase is known to write PII into (schema.sql + src/lib/migrations/*
 * parity migrations) — NOT a live schema introspection. If the production
 * `clients` table carries PII columns added outside this repo's migration
 * history, extend this list before relying on the purge for full compliance.
 */
const PII_FIELD_RESET: Record<string, unknown> = {
  name: 'Deleted Client',
  email: null,
  phone: null,
  address: null,
  unit: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  zip: null,
  lat: null,
  lng: null,
  latitude: null,
  longitude: null,
  notes: null,
  notes_private: null,
  notes_public: null,
  special_instructions: null,
  selena_memory: null,
  selena_memory_summary: null,
  pet_name: null,
  pet_type: null,
  pin: null,
  referral_code: null,
  email_opt_in: false,
  sms_opt_in: false,
  email_marketing_opt_out: true,
  sms_marketing_opt_out: true,
  sms_consent: false,
}

/**
 * Open (or return the existing) deletion request for a client. Idempotent —
 * calling this twice while a request is already pending returns the original
 * request instead of resetting the grace-period clock.
 */
export async function requestClientDeletion(
  tenantId: string,
  clientId: string,
  requestedBy: DeletionRequestedBy,
  requestedById?: string | null
): Promise<{ request: DataDeletionRequest; alreadyPending: boolean }> {
  const { data: existing } = await supabaseAdmin
    .from('data_deletion_requests')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return { request: existing as DataDeletionRequest, alreadyPending: true }
  }

  const requestedAt = new Date()
  const purgeAt = new Date(requestedAt.getTime() + GDPR_GRACE_PERIOD_DAYS * 24 * 3600 * 1000)

  const { data: created, error } = await supabaseAdmin
    .from('data_deletion_requests')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      requested_by: requestedBy,
      requested_by_id: requestedById ?? null,
      status: 'pending',
      requested_at: requestedAt.toISOString(),
      purge_at: purgeAt.toISOString(),
    })
    .select()
    .single()

  if (error || !created) {
    throw new Error(error?.message || 'Failed to create deletion request')
  }

  await supabaseAdmin
    .from('clients')
    .update({
      deletion_requested_at: requestedAt.toISOString(),
      deletion_purge_at: purgeAt.toISOString(),
    })
    .eq('id', clientId)
    .eq('tenant_id', tenantId)

  return { request: created as DataDeletionRequest, alreadyPending: false }
}

/**
 * Cancel a pending deletion request within the grace period. No-op (returns
 * cancelled: false) if there is no pending request — e.g. it already purged,
 * or was never opened.
 */
export async function cancelClientDeletion(
  tenantId: string,
  clientId: string
): Promise<{ cancelled: boolean }> {
  const { data: existing } = await supabaseAdmin
    .from('data_deletion_requests')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .maybeSingle()

  if (!existing) return { cancelled: false }

  await supabaseAdmin
    .from('data_deletion_requests')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', existing.id)

  await supabaseAdmin
    .from('clients')
    .update({ deletion_requested_at: null, deletion_purge_at: null })
    .eq('id', clientId)
    .eq('tenant_id', tenantId)

  return { cancelled: true }
}

/**
 * Hard-purge every pending request whose grace window has elapsed, across ALL
 * tenants (cron job — platform-wide by design, same pattern as
 * cron/generate-recurring). Anonymizes the client row in place rather than
 * deleting it, so aggregate/financial history stays queryable. Per-request
 * fault tolerance: one failing row does not stop the rest of the batch.
 */
export async function purgeDueDeletions(): Promise<{ purged: string[]; failed: string[] }> {
  const nowIso = new Date().toISOString()

  const { data: due } = await supabaseAdmin
    .from('data_deletion_requests') // tenant-scope-ok: cron job runs platform-wide across all tenants by design
    .select('id, tenant_id, client_id')
    .eq('status', 'pending')
    .lte('purge_at', nowIso)

  const purged: string[] = []
  const failed: string[] = []

  for (const request of due || []) {
    const { error: clientError } = await supabaseAdmin
      .from('clients')
      .update({
        ...PII_FIELD_RESET,
        deleted_at: nowIso,
        deletion_requested_at: null,
        deletion_purge_at: null,
        status: 'deleted',
      })
      .eq('id', request.client_id)
      .eq('tenant_id', request.tenant_id)

    if (clientError) {
      failed.push(request.id)
      continue
    }

    const { error: requestError } = await supabaseAdmin
      .from('data_deletion_requests')
      .update({ status: 'completed', completed_at: nowIso })
      .eq('id', request.id)

    if (requestError) {
      failed.push(request.id)
      continue
    }

    purged.push(request.id)
  }

  return { purged, failed }
}
