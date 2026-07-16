/**
 * Documents — core helpers for the multi-party e-sign module.
 *
 * State machine:
 *   draft → sent → viewed/in_progress → completed
 *                                      ↘ declined
 *   draft ↔ voided (via duplicate + void)
 */
import { supabaseAdmin } from './supabase'
import { randomBytes, createHash } from 'crypto'

export const DOCUMENTS_BUCKET = 'documents'
export const FIELD_TYPES = ['signature', 'initial', 'date', 'text', 'full_name'] as const
export type FieldType = (typeof FIELD_TYPES)[number]

export function generateSignerToken(): string {
  return randomBytes(24).toString('base64url')
}

export function sha256Hex(data: Uint8Array | Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

export function documentOriginalPath(tenantId: string, docId: string): string {
  return `tenants/${tenantId}/docs/${docId}/original.pdf`
}

export function documentSignedPath(tenantId: string, docId: string): string {
  return `tenants/${tenantId}/docs/${docId}/signed.pdf`
}

export interface LogDocEventOpts {
  document_id: string
  tenant_id: string
  signer_id?: string | null
  event_type:
    | 'created'
    | 'uploaded'
    | 'field_placed'
    | 'sent'
    | 'viewed'
    | 'consent_accepted'
    | 'signed'
    | 'completed'
    | 'declined'
    | 'voided'
    | 'reminder_sent'
    | 'expired'
  detail?: Record<string, unknown>
  ip_address?: string | null
  user_agent?: string | null
}

export async function logDocEvent(opts: LogDocEventOpts) {
  await supabaseAdmin.from('document_activity').insert({
    document_id: opts.document_id,
    tenant_id: opts.tenant_id,
    signer_id: opts.signer_id || null,
    event_type: opts.event_type,
    detail: opts.detail || null,
    ip_address: opts.ip_address || null,
    user_agent: opts.user_agent || null,
  })
}

export function isEditableStatus(status: string): boolean {
  return status === 'draft'
}

/**
 * Re-check that a document is still 'draft' AFTER a document_fields/
 * document_signers write. Those child tables carry no status column of
 * their own, so the usual "re-assert the pre-read status in the write's own
 * WHERE" CAS pattern (used for writes directly on `documents`) can't close
 * the race atomically here. POST /api/documents/[id]/send landing in the gap
 * between the isEditableStatus(doc.status) check and a fields/signers write
 * would otherwise let a field/signer get added to (or removed from) an
 * already-sent, hash-locked, invitations-already-out document — worse,
 * a signer added post-send never receives an invite, so finalizeDocument's
 * `every(s => s.status === 'signed')` check can never pass and the document
 * gets stuck in 'in_progress' forever. This is a best-effort post-write
 * check (not a true atomic mutex), called immediately after the write so
 * the window is as small as it can be without a DB-side transaction.
 */
export async function verifyStillDraft(tenantId: string, documentId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('documents')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('id', documentId)
    .eq('status', 'draft')
    .maybeSingle()
  return !!data
}

export function isTerminalStatus(status: string): boolean {
  return ['completed', 'declined', 'voided', 'expired'].includes(status)
}

/** Is this signer eligible to sign right now given sequential order? */
export function canSignerAct(
  signOrder: 'parallel' | 'sequential',
  thisSigner: { order_index: number; status: string },
  allSigners: { order_index: number; status: string }[],
): boolean {
  if (thisSigner.status !== 'pending' && thisSigner.status !== 'sent' && thisSigner.status !== 'viewed') return false
  if (signOrder === 'parallel') return true
  // Sequential: only prior signers must be done
  for (const s of allSigners) {
    if (s.order_index < thisSigner.order_index && s.status !== 'signed') return false
  }
  return true
}
