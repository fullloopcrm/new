/**
 * Invoice core — totals, numbering, state transitions.
 * Reuses the line-item shape and math from quote.ts.
 */
import { supabaseAdmin } from './supabase'
import { randomBytes } from 'crypto'
import {
  normalizeLineItems,
  computeTotals,
  type QuoteLineItem,
  type QuoteTotals,
} from './quote'

export type InvoiceLineItem = QuoteLineItem
export type InvoiceTotals = QuoteTotals
export { normalizeLineItems, computeTotals }

export function generateInvoicePublicToken(): string {
  return randomBytes(24).toString('base64url')
}

export async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')

  // Atomic per-tenant-per-month sequence (migrations/2026_07_13_document_number_atomic.sql)
  // — a count-then-append here let two concurrent creates land on the same number.
  const { data: seq, error } = await supabaseAdmin.rpc('next_document_number', {
    p_tenant_id: tenantId,
    p_doc_type: 'invoice',
    p_period: `${yyyy}${mm}`,
  })
  if (error) throw error

  const nnnn = String(seq).padStart(4, '0')
  return `INV-${yyyy}${mm}-${nnnn}`
}

export interface LogInvoiceEventOpts {
  invoice_id: string
  tenant_id: string
  event_type:
    | 'created'
    | 'edited'
    | 'sent'
    | 'viewed'
    | 'partial_payment'
    | 'paid'
    | 'overdue'
    | 'refunded'
    | 'voided'
    | 'reminder_sent'
  detail?: Record<string, unknown>
  ip_address?: string | null
  user_agent?: string | null
}

export async function logInvoiceEvent(opts: LogInvoiceEventOpts) {
  await supabaseAdmin.from('invoice_activity').insert({
    invoice_id: opts.invoice_id,
    tenant_id: opts.tenant_id,
    event_type: opts.event_type,
    detail: opts.detail || null,
    ip_address: opts.ip_address || null,
    user_agent: opts.user_agent || null,
  })
}

export function formatInvoiceCents(cents: number): string {
  return ((cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
