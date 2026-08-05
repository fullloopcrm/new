/**
 * Gathers everyone owed money through Global Payouts for a tenant — the lead
 * on each booking (bookings.team_member_id, pay already computed at checkout
 * into team_member_pay) AND any extras on a multi-cleaner job
 * (booking_team_members), who have never had their own pay computed anywhere
 * in this codebase before this file existed.
 *
 * Extras' pay: "each person gets their own rate × hours" (Jeff's call,
 * 08-04). The job's hours aren't re-derivable cleanly post-checkout (the
 * team-minimum floor was already baked into team_member_pay at checkout —
 * see checkout-pricing.ts), so hours are backed out from the lead's own
 * pay ÷ rate, then reapplied at the extra's own rate. This keeps extras
 * paid for exactly the hours the lead was paid for, without duplicating or
 * drifting from the team-minimum logic.
 */
import { supabaseAdmin } from '../supabase'

export interface PayoutItem {
  bookingId: string
  role: 'lead' | 'extra'
  teamMemberId: string
  amountCents: number
  tipCents: number
  clientName: string
}

export interface TeamMemberPayoutGroup {
  teamMemberId: string
  name: string
  recipientId: string
  phone: string | null
  smsConsent: boolean | null
  preferredLanguage: string | null
  items: PayoutItem[]
  totalCents: number
}

interface BookingRow {
  id: string
  team_member_id: string
  team_member_pay: number | null
  pay_rate: number | null
  actual_hours: number | null
  clients: { name: string | null } | null
  team_members: {
    global_payouts_recipient_id: string | null
    name: string
    phone: string | null
    sms_consent: boolean | null
    preferred_language: string | null
    pay_rate: number | null
    hourly_rate: number | null
  } | null
}

export async function gatherGlobalPayoutsEligibility(tenantId: string): Promise<TeamMemberPayoutGroup[]> {
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select(`
      id, team_member_id, team_member_pay, pay_rate, actual_hours,
      clients(name),
      team_members!bookings_team_member_id_fkey(global_payouts_recipient_id, name, phone, sms_consent, preferred_language, pay_rate, hourly_rate)
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .eq('payment_status', 'paid')
    .or('team_member_paid.is.null,team_member_paid.eq.false')
    .not('team_member_pay', 'is', null)
    .order('start_time', { ascending: true }) as { data: BookingRow[] | null }

  const rows = bookings || []
  if (rows.length === 0) return []

  const bookingIds = rows.map(b => b.id)

  type ExtraRow = { booking_id: string; team_member_id: string; team_members: BookingRow['team_members'] }

  const [{ data: paymentRows }, { data: extrasRows }] = await Promise.all([
    supabaseAdmin.from('payments').select('booking_id, tip_cents').eq('tenant_id', tenantId).in('booking_id', bookingIds),
    supabaseAdmin
      .from('booking_team_members')
      .select('booking_id, team_member_id, is_lead, team_members(global_payouts_recipient_id, name, phone, sms_consent, preferred_language, pay_rate, hourly_rate)')
      .eq('tenant_id', tenantId)
      .eq('is_lead', false)
      .in('booking_id', bookingIds) as unknown as Promise<{ data: ExtraRow[] | null }>,
  ])

  const tipByBooking: Record<string, number> = {}
  for (const p of paymentRows || []) {
    tipByBooking[p.booking_id as string] = (tipByBooking[p.booking_id as string] || 0) + ((p.tip_cents as number) || 0)
  }

  const groups = new Map<string, TeamMemberPayoutGroup>()

  function addItem(teamMemberId: string, tm: BookingRow['team_members'], item: PayoutItem) {
    if (!tm?.global_payouts_recipient_id) return
    const existing = groups.get(teamMemberId)
    if (existing) {
      existing.items.push(item)
      existing.totalCents += item.amountCents + item.tipCents
    } else {
      groups.set(teamMemberId, {
        teamMemberId,
        name: tm.name,
        recipientId: tm.global_payouts_recipient_id,
        phone: tm.phone,
        smsConsent: tm.sms_consent,
        preferredLanguage: tm.preferred_language,
        items: [item],
        totalCents: item.amountCents + item.tipCents,
      })
    }
  }

  for (const b of rows) {
    const clientName = b.clients?.name || 'a client'
    const tipCents = tipByBooking[b.id] || 0
    const leadPayCents = b.team_member_pay || 0

    addItem(b.team_member_id, b.team_members, {
      bookingId: b.id, role: 'lead', teamMemberId: b.team_member_id, amountCents: leadPayCents, tipCents, clientName,
    })

    const leadRate = b.pay_rate || b.team_members?.pay_rate || b.team_members?.hourly_rate || 25
    const impliedHours = leadRate > 0 ? (leadPayCents / 100) / leadRate : 0
    if (impliedHours <= 0) continue

    const extras = (extrasRows || []).filter(e => e.booking_id === b.id)
    for (const extra of extras) {
      const extraTm = extra.team_members
      const extraRate = extraTm?.pay_rate || extraTm?.hourly_rate || 25
      const extraPayCents = Math.round(impliedHours * extraRate * 100)
      if (extraPayCents <= 0) continue
      addItem(extra.team_member_id, extraTm, {
        bookingId: b.id, role: 'extra', teamMemberId: extra.team_member_id, amountCents: extraPayCents, tipCents: 0, clientName,
      })
    }
  }

  return Array.from(groups.values())
}
