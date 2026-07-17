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
import { etToday, formatNaiveET, parseNaiveET, addCalendarDays, daysInCalendarMonth } from './recurring'

export type InvoiceLineItem = QuoteLineItem
export type InvoiceTotals = QuoteTotals
export { normalizeLineItems, computeTotals }

export function generateInvoicePublicToken(): string {
  return randomBytes(24).toString('base64url')
}

export async function generateInvoiceNumber(tenantId: string): Promise<string> {
  // yyyy/mm reads the SERVER's UTC calendar month, not ET -- an invoice
  // generated in the evening ET on the last day of any month (e.g. Jul 31
  // 9pm ET = Aug 1 UTC) got numbered into the WRONG, not-yet-arrived month
  // (INV-202608-0001 while every other system still says July), and its
  // sequence count restarted early since the window compared against real
  // UTC-Aug created_at rows instead of the July ones that actually exist so
  // far. Same day/month-boundary class as this session's other UTC-vs-ET
  // finds (see recurring.ts's etToday()/parseNaiveET() headers).
  const monthStartCal = { ...etToday(), day: 1 }
  const nextMonthStartCal = addCalendarDays(monthStartCal, daysInCalendarMonth(monthStartCal))
  const monthStart = parseNaiveET(formatNaiveET(monthStartCal))
  const nextMonth = parseNaiveET(formatNaiveET(nextMonthStartCal))
  const yyyy = monthStartCal.year
  const mm = String(monthStartCal.month + 1).padStart(2, '0')

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
    | 'booking_removed'
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
