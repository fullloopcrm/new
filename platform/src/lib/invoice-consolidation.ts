/**
 * Line-item shaping for monthly rollup invoices (recurring_schedules with
 * invoice_consolidation='monthly'). One line per completed visit, matching
 * the granularity a commercial/office client expects on a statement instead
 * of a single opaque total.
 */
import type { QuoteLineItem } from './quote'

export interface ConsolidatableBooking {
  id: string
  start_time: string
  price: number | null
  service_type: string | null
}

export function buildConsolidatedLineItems(bookings: ConsolidatableBooking[]): Partial<QuoteLineItem>[] {
  return bookings.map((b) => ({
    id: `li_${b.id}`,
    name: b.service_type || 'Service visit',
    description: new Date(b.start_time).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    quantity: 1,
    unit_price_cents: Math.max(0, Number(b.price) || 0),
  }))
}
