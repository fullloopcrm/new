// Which endpoint BookingsAdmin.tsx's close-out quick actions (Mark Paid,
// payment method buttons, Mark Team Paid, status change) should PUT/PATCH
// to. Extracted as a pure function so the routing decision is testable
// without mounting the whole (3000+ line, multi-fetch) BookingsAdmin
// component.
//
// The generic PUT /api/bookings/[id] allow-list doesn't include
// payment_status or payment_method at all -- sending them there silently
// no-ops (200 OK, nothing persisted). The dedicated PATCH
// /api/bookings/[id]/payment endpoint owns those fields plus tip_amount/
// team_member_paid/team_member_pay/actual_hours, and additionally derives
// status='paid' + payment_date and writes the payment.marked_paid audit
// entry -- none of which the generic PUT does.
const PAYMENT_UPDATE_FIELDS = new Set([
  'payment_status', 'payment_method', 'tip_amount', 'team_member_paid', 'team_member_pay', 'actual_hours',
])

export function closeOutUpdateRoute(bookingId: string, updates: Record<string, unknown>): { url: string; method: 'PUT' | 'PATCH' } {
  const isPaymentUpdate = Object.keys(updates).some((k) => PAYMENT_UPDATE_FIELDS.has(k))
  return isPaymentUpdate
    ? { url: `/api/bookings/${bookingId}/payment`, method: 'PATCH' }
    : { url: `/api/bookings/${bookingId}`, method: 'PUT' }
}
