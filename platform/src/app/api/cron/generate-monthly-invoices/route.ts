import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import {
  normalizeLineItems,
  computeTotals,
  generateInvoiceNumber,
  generateInvoicePublicToken,
  logInvoiceEvent,
} from '@/lib/invoice'
import { buildConsolidatedLineItems } from '@/lib/invoice-consolidation'
import { getDefaultEntityId } from '@/lib/entity'

// Monthly cron: commercial/office recurring accounts expect ONE rollup
// statement, not a standalone invoice per visit (the default, and only,
// behavior before this — see POST /api/invoices from_booking_id). Any
// recurring_schedules row flagged invoice_consolidation='monthly' gets every
// completed-but-not-yet-invoiced booking folded into a single draft invoice,
// one line item per visit. `bookings.invoice_id IS NULL` is the "not yet
// billed" gate — set here on the rollup path and by POST /api/invoices on the
// standalone path, so a visit can never be billed twice regardless of which
// path claims it first.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const { data: schedules } = await supabaseAdmin
    .from('recurring_schedules') // tenant-scope-ok: cron job runs platform-wide across all tenants by design
    .select('id, tenant_id, client_id')
    .eq('invoice_consolidation', 'monthly')

  let invoicesCreated = 0
  let bookingsBilled = 0
  const failures: string[] = []

  for (const schedule of schedules || []) {
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time, price, service_type')
      .eq('schedule_id', schedule.id)
      .eq('status', 'completed')
      .is('invoice_id', null)
      .order('start_time')

    if (!bookings || bookings.length === 0) continue

    const lineItems = normalizeLineItems(buildConsolidatedLineItems(bookings))
    if (lineItems.length === 0) continue
    const totals = computeTotals(lineItems, 0, 0)
    const invoiceNumber = await generateInvoiceNumber(schedule.tenant_id)
    const publicToken = generateInvoicePublicToken()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 15)
    const entityId = await getDefaultEntityId(schedule.tenant_id)

    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .insert({ // tenant-scope-ok: row carries tenant_id (schedule.tenant_id)
        tenant_id: schedule.tenant_id,
        entity_id: entityId,
        client_id: schedule.client_id,
        recurring_schedule_id: schedule.id,
        invoice_number: invoiceNumber,
        status: 'draft',
        title: 'Monthly service statement',
        line_items: lineItems,
        subtotal_cents: totals.subtotal_cents,
        tax_rate_bps: 0,
        tax_cents: totals.tax_cents,
        discount_cents: totals.discount_cents,
        total_cents: totals.total_cents,
        due_date: dueDate.toISOString().slice(0, 10),
        public_token: publicToken,
      })
      .select('id')
      .single()

    if (error || !invoice) {
      failures.push(`schedule ${schedule.id}: ${error?.message || 'insert failed'}`)
      continue
    }

    await supabaseAdmin
      .from('bookings')
      .update({ invoice_id: invoice.id })
      .in('id', bookings.map((b) => b.id))

    await logInvoiceEvent({
      invoice_id: invoice.id,
      tenant_id: schedule.tenant_id,
      event_type: 'created',
      detail: { from: 'recurring_consolidation', schedule_id: schedule.id, booking_count: bookings.length },
    })

    invoicesCreated += 1
    bookingsBilled += bookings.length
  }

  if (failures.length > 0) {
    await supabaseAdmin.from('notifications').insert({ // tenant-scope-ok: cron job runs platform-wide across all tenants by design
      type: 'monthly_invoice_generation_failed',
      title: 'cron:generate-monthly-invoices had failures',
      message: failures.join('; '),
      channel: 'system',
      recipient_type: 'admin',
    }).then(() => {}, () => {})
  }

  // Health-monitor marker, same pattern as cron/generate-recurring.
  await supabaseAdmin.from('notifications').insert({ // tenant-scope-ok: cron job runs platform-wide across all tenants by design
    type: 'monthly_invoices_generated',
    title: 'cron:generate-monthly-invoices',
    message: `invoices=${invoicesCreated} bookings=${bookingsBilled}`,
    channel: 'system',
    recipient_type: 'admin',
  }).then(() => {}, () => {})

  return NextResponse.json({ invoices_created: invoicesCreated, bookings_billed: bookingsBilled })
}
