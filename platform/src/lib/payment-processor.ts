/**
 * Payment processor — tenant-aware port of nycmaid's payment-processor.ts.
 *
 * Canonical path for non-Stripe (Zelle / Venmo / admin-confirmed) payments:
 *   1. Compute expected balance from booking (actual_hours or check-in elapsed)
 *   2. Sum prior payments → decide partial vs paid (95% threshold)
 *   3. Insert payments row
 *   4. If partial: mark booking partial + open admin_tasks + notify — return early
 *   5. If paid: mark paid, auto-payout team member via Stripe Connect if possible
 *   6. SMS team member (bilingual, finish-up message), SMS client (confirmation),
 *      SMS admins via admin-contacts.
 *
 * Multi-tenant: every DB read/write scopes by tenant_id. Stripe key comes from
 * tenant.stripe_api_key first, falls back to env.
 */
import Stripe from 'stripe'
import { supabaseAdmin } from './supabase'
import { sendSMS } from './sms'
import { smsAdmins } from './admin-contacts'
import { notify } from './notify'
import type { Tenant } from './tenant'

type TenantPaymentFields = Pick<
  Tenant,
  'id' | 'name' | 'stripe_api_key' | 'telnyx_api_key' | 'telnyx_phone'
>

export interface ProcessPaymentInput {
  tenant: TenantPaymentFields | { id: string }
  bookingId: string
  clientId: string
  method: string                       // 'zelle' | 'venmo' | 'cashapp' | 'cash' | 'manual' | ...
  amountCents: number
  referenceId: string
  senderName?: string | null
}

export interface ProcessPaymentResult {
  status: 'paid' | 'partial'
  totalReceivedCents: number
  expectedCents: number
  tipCents: number
  cleanerPaidCents: number
}

const PARTIAL_THRESHOLD = 0.95

function getStripe(apiKey: string | null | undefined): Stripe {
  const key = apiKey || process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Stripe not configured')
  return new Stripe(key, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
}

async function hydrateTenant(input: TenantPaymentFields | { id: string }): Promise<TenantPaymentFields | null> {
  const anyT = input as Record<string, unknown>
  if (anyT.stripe_api_key !== undefined && anyT.telnyx_api_key !== undefined) {
    return input as TenantPaymentFields
  }
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('id, name, stripe_api_key, telnyx_api_key, telnyx_phone')
    .eq('id', (input as { id: string }).id)
    .single()
  return data
}

export async function processPayment(input: ProcessPaymentInput): Promise<ProcessPaymentResult | null> {
  const tenant = await hydrateTenant(input.tenant)
  if (!tenant) return null
  const tenantId = tenant.id

  const { bookingId, clientId, method, amountCents, referenceId } = input
  const label = method.charAt(0).toUpperCase() + method.slice(1)

  // Tenant-scoped booking lookup with joined relations
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select(`
      id,
      team_member_id,
      client_id,
      team_member_pay,
      actual_hours,
      hourly_rate,
      pay_rate,
      price,
      check_in_time,
      start_time,
      clients:clients(name, phone),
      team_members:team_members(name, phone, sms_consent, stripe_account_id, hourly_rate, pay_rate, preferred_language)
    `)
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .single()

  if (!booking) return null

  const clientJoin = booking.clients as unknown as { name: string; phone?: string } | null
  const teamMember = booking.team_members as unknown as {
    name: string
    phone: string | null
    sms_consent: boolean | null
    stripe_account_id: string | null
    hourly_rate: number | null
    pay_rate: number | null
    preferred_language: string | null
  } | null

  const clientName = clientJoin?.name || 'Client'

  // Expected balance in cents — mirror nycmaid logic:
  //   actual_hours × hourly_rate  OR  (now - check_in) rounded up to .5h buffer
  const clientRate = (booking.hourly_rate as number | null) || 75
  let expectedCents = 0
  if (booking.price && booking.price > 0) {
    expectedCents = booking.price as number
  } else if (booking.actual_hours) {
    expectedCents = Math.round((booking.actual_hours as number) * clientRate * 100)
  } else if (booking.check_in_time) {
    const checkIn = new Date(booking.check_in_time as string)
    const rawMinutes = Math.max(0, (Date.now() - checkIn.getTime()) / (1000 * 60))
    // Round up to next 30 min with a 30 min buffer (nycmaid rule)
    const estHours = Math.max(0.5, Math.ceil((rawMinutes + 30) / 30) * 0.5)
    expectedCents = Math.round(estHours * clientRate * 100)
  }

  // Sum prior payments for this booking (tenant-scoped)
  const { data: priorPayments } = await supabaseAdmin
    .from('payments')
    .select('amount_cents')
    .eq('booking_id', bookingId)
    .eq('tenant_id', tenantId)
  const priorCents = (priorPayments || []).reduce((s, p) => s + ((p.amount_cents as number) || 0), 0)
  const totalReceivedCents = priorCents + amountCents

  const isPartial = expectedCents > 0 && totalReceivedCents < expectedCents * PARTIAL_THRESHOLD
  const tipCents = !isPartial && expectedCents > 0 ? Math.max(0, totalReceivedCents - expectedCents) : 0
  const tipAmount = (tipCents / 100).toFixed(2)

  // Record payment (tenant-scoped)
  await supabaseAdmin
    .from('payments')
    .insert({
      tenant_id: tenantId,
      booking_id: bookingId,
      client_id: clientId,
      amount_cents: amountCents,
      tip_cents: isPartial ? 0 : tipCents,
      method,
      status: isPartial ? 'partial' : 'completed',
      payment_sender_name: input.senderName || null,
      reference_id: referenceId,
    })
    .then(
      () => {},
      err => console.error(`[payment-processor] ${label} insert failed:`, err),
    )

  if (isPartial) {
    const shortfallCents = expectedCents - totalReceivedCents
    const shortfall = (shortfallCents / 100).toFixed(0)
    const totalReceived = (totalReceivedCents / 100).toFixed(0)
    const totalExpected = (expectedCents / 100).toFixed(0)

    await supabaseAdmin
      .from('bookings')
      .update({ payment_status: 'partial', partial_payment_cents: totalReceivedCents })
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)

    await supabaseAdmin
      .from('admin_tasks')
      .insert({
        tenant_id: tenantId,
        type: 'payment_partial',
        priority: 'high',
        title: `Partial ${label} from ${clientName}: $${totalReceived}/$${totalExpected}`,
        description: `Client still owes $${shortfall}. Team member NOT paid yet. Contact client manually.`,
        related_type: 'booking',
        related_id: bookingId,
      })
      .then(() => {}, () => {})

    notify({
      tenantId,
      type: 'payment_due',
      title: `Partial payment — ${clientName} owes $${shortfall}`,
      message: `${clientName} sent $${totalReceived} of $${totalExpected} via ${label}. Team member NOT paid yet. Admin contact required.`,
      bookingId,
    }).catch(() => {})

    return { status: 'partial', totalReceivedCents, expectedCents, tipCents: 0, cleanerPaidCents: 0 }
  }

  // Full payment — mark booking paid
  await supabaseAdmin
    .from('bookings')
    .update({ payment_status: 'paid', payment_method: method, payment_date: new Date().toISOString(), tip_amount: tipCents })
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)

  // Team member auto-pay via Stripe Connect
  let cleanerPaidCents = 0
  if (teamMember?.stripe_account_id && booking.team_member_id) {
    try {
      let payAmountCents: number | null = (booking.team_member_pay as number | null) || null
      if (!payAmountCents) {
        const rate = teamMember.pay_rate || teamMember.hourly_rate || (booking.pay_rate as number | null) || 25
        if (booking.actual_hours) {
          payAmountCents = Math.round((booking.actual_hours as number) * rate * 100)
        } else if (booking.check_in_time) {
          const checkIn = new Date(booking.check_in_time as string)
          const rawMinutes = Math.max(0, (Date.now() - checkIn.getTime()) / (1000 * 60))
          const estHours = Math.max(0.5, Math.round(rawMinutes / 30) * 0.5)
          payAmountCents = Math.round(estHours * rate * 100)
        }
      }

      if (tipCents > 0 && payAmountCents) payAmountCents += tipCents

      if (payAmountCents && payAmountCents > 0) {
        const stripe = getStripe(tenant.stripe_api_key)
        const transfer = await stripe.transfers.create({
          amount: payAmountCents,
          currency: 'usd',
          destination: teamMember.stripe_account_id,
          description: `${label} payment for ${clientName} service${tipCents > 0 ? ` (includes $${tipAmount} tip)` : ''}`,
          metadata: { booking_id: bookingId, tenant_id: tenantId },
        })

        let payoutId: string | null = null
        let isInstant = false
        try {
          const payout = await stripe.payouts.create(
            { amount: payAmountCents, currency: 'usd', method: 'instant' },
            { stripeAccount: teamMember.stripe_account_id },
          )
          payoutId = payout.id
          isInstant = true
        } catch {
          // standard schedule fallback — Stripe will pay on default cadence
        }

        cleanerPaidCents = payAmountCents

        await supabaseAdmin
          .from('team_member_payouts')
          .insert({
            tenant_id: tenantId,
            booking_id: bookingId,
            team_member_id: booking.team_member_id,
            amount_cents: payAmountCents - tipCents,
            tip_cents: tipCents,
            stripe_transfer_id: transfer.id,
            stripe_payout_id: payoutId,
            instant: isInstant,
            status: 'transferred',
            paid_at: new Date().toISOString(),
          })
          .then(() => {}, err => console.error('[payment-processor] payout record failed:', err))

        await supabaseAdmin
          .from('bookings')
          .update({ team_member_paid: true, team_member_paid_at: new Date().toISOString(), team_member_pay: payAmountCents })
          .eq('id', bookingId)
          .eq('tenant_id', tenantId)
      }
    } catch (err) {
      console.error(`[payment-processor] team member auto-pay from ${label} failed:`, err)
    }
  }

  // Team member finish-up SMS (bilingual)
  if (teamMember?.phone && teamMember.sms_consent !== false && tenant.telnyx_api_key && tenant.telnyx_phone) {
    const isEs = teamMember.preferred_language === 'es'
    const tipLine = tipCents > 0
      ? (isEs
        ? `\n¡El cliente dejó $${tipAmount} de propina!`
        : `\nClient left a $${tipAmount} tip!`)
      : ''
    const cleanerSms = isEs
      ? `Pago confirmado para ${clientName}. Por favor termine y haga check-out en los próximos 30 minutos. ¡Gracias!${tipLine}`
      : `Payment confirmed for ${clientName}. Please finish up and check out within the next 30 minutes. Thank you!${tipLine}`

    sendSMS({
      to: teamMember.phone,
      body: cleanerSms,
      telnyxApiKey: tenant.telnyx_api_key,
      telnyxPhone: tenant.telnyx_phone,
    }).catch(err => console.error('[payment-processor] team member SMS failed:', err))
  }

  // Client confirmation SMS
  const { data: clientRecord } = await supabaseAdmin
    .from('clients')
    .select('phone')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()
  if (clientRecord?.phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
    const tipThank = tipCents > 0
      ? ` Your generous tip of $${tipAmount} has been passed along — thank you!`
      : ''
    const clientSms = `Payment confirmed — $${(amountCents / 100).toFixed(0)} received via ${label}. Thank you, ${clientName}!${tipThank} 😊`
    sendSMS({
      to: clientRecord.phone as string,
      body: clientSms,
      telnyxApiKey: tenant.telnyx_api_key,
      telnyxPhone: tenant.telnyx_phone,
    }).catch(err => console.error('[payment-processor] client SMS failed:', err))
  }

  // Admin notification
  const tipNote = tipCents > 0 ? ` Tip: $${tipAmount}.` : ''
  const payoutNote = cleanerPaidCents > 0
    ? ` Team member auto-paid $${(cleanerPaidCents / 100).toFixed(2)}${tipCents > 0 ? ' (includes tip)' : ''}.`
    : teamMember?.stripe_account_id ? '' : ' Team member not on Stripe — pay manually.'

  const adminMessage =
    `${label} payment CONFIRMED — ${clientName} paid $${(amountCents / 100).toFixed(2)}` +
    `${input.senderName ? ` (from ${input.senderName})` : ''}.${tipNote}${payoutNote}` +
    ` Client + team notified.`

  smsAdmins(tenant, adminMessage).catch(err => console.error('[payment-processor] admin SMS failed:', err))

  notify({
    tenantId,
    type: 'payment_received',
    title: `${label} payment — ${clientName}`,
    message: adminMessage,
    bookingId,
    metadata: {
      amount: `$${(amountCents / 100).toFixed(2)}`,
      paymentMethod: label,
      clientName,
    },
  }).catch(() => {})

  return { status: 'paid', totalReceivedCents, expectedCents, tipCents, cleanerPaidCents }
}
