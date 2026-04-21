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
