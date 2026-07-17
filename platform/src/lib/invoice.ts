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
  const monthStart = new Date(Date.UTC(yyyy, now.getUTCMonth(), 1))
  const nextMonth = new Date(Date.UTC(yyyy, now.getUTCMonth() + 1, 1))

  const { count } = await supabaseAdmin
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', monthStart.toISOString())
    .lt('created_at', nextMonth.toISOString())

  const nnnn = String((count || 0) + 1).padStart(4, '0')
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

/**
 * Flip a single invoice-linked payment row to 'refunded' and, if that drains
 * the invoice's amount_paid_cents to zero, flip the invoice itself to
 * 'refunded'. Used by the Stripe `charge.refunded` webhook when the whole
 * charge behind a payment was reversed — a partial refund of a single charge
 * is intentionally left alone (payments has no partial-refund amount field
 * to represent it correctly) and only recorded in the ledger.
 */
export async function markInvoicePaymentRefunded(opts: {
  tenantId: string
  invoiceId: string
  paymentId: string
  reason?: string
}): Promise<{ flipped: boolean }> {
  const { tenantId, invoiceId, paymentId, reason } = opts

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id, amount_cents, status')
    .eq('id', paymentId)
    .eq('invoice_id', invoiceId)
    .single()
  if (!payment || !['succeeded', 'paid', 'completed'].includes(payment.status as string)) {
    return { flipped: false }
  }

  await supabaseAdmin.from('payments').update({ status: 'refunded' }).eq('id', paymentId)

  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select('status')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .single()
  if (!invoice) return { flipped: false }

  // Recompute the remaining paid total from the source of truth (the payments
  // table) rather than trusting invoices_recompute_paid's trigger side effect
  // to have already landed — the trigger DOES fire synchronously in Postgres,
  // but relying on that invisibly here made this function silently untestable
  // (nothing in fake-supabase simulates a DB trigger) and coupled correctness
  // here to a side channel this file never mentions.
  const { data: remaining } = await supabaseAdmin
    .from('payments')
    .select('amount_cents')
    .eq('invoice_id', invoiceId)
    .in('status', ['succeeded', 'paid', 'completed'])
  const totalPaidCents = (remaining || []).reduce((sum, r) => sum + ((r.amount_cents as number) || 0), 0)
  const shouldFlip = totalPaidCents <= 0 && !['refunded', 'void'].includes(invoice.status as string)

  await supabaseAdmin
    .from('invoices')
    .update({ amount_paid_cents: totalPaidCents, ...(shouldFlip ? { status: 'refunded' } : {}) })
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)

  await logInvoiceEvent({
    invoice_id: invoiceId,
    tenant_id: tenantId,
    event_type: 'refunded',
    detail: { amount_cents: payment.amount_cents, payment_id: paymentId, reason: reason || 'Stripe refund' },
  })

  return { flipped: shouldFlip }
}
