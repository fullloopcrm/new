/**
 * Backfill the real checkout bill for bookings that went through the
 * now-fixed broken "Complete" path (dashboard/bookings/[id]/page.tsx,
 * fixed 2026-07-23 commit 770577c0f) before the fix landed. That path
 * bare-PATCHed { status: 'completed' } and never recomputed
 * price/actual_hours/team_member_pay from real elapsed time — those
 * bookings are permanently stuck showing the original scheduling-time
 * estimate unless backfilled.
 *
 * Target set (see deploy-prep/w4-checkout-price-backfill-proposal-2026-07-23.md
 * for the full investigation): status='completed' AND actual_hours IS NULL
 * AND check_in_time/check_out_time BOTH present — every other checkout path
 * (team-portal/checkout, BookingsAdmin's Confirm Check Out) always sets
 * actual_hours alongside price, so its absence on a completed booking is the
 * signal this route relies on. Bookings missing check_in_time or
 * check_out_time are deliberately excluded (by the query itself, not a
 * runtime check) rather than guessed at — there is no real elapsed-time data
 * to compute an accurate bill from for those, and silently falling back to
 * the scheduled estimate would just re-write the original bug's output.
 *
 * Uses the exact same computeCheckoutPricing() helper the live fix now
 * calls (team-portal/checkout, BookingsAdmin.tsx, and
 * dashboard/bookings/[id]/page.tsx all share it) — no separate/drifted math.
 *
 * Deliberately NOT a reuse of /api/finance/backfill/route.ts: that route
 * targets a different signal (team_member_pay IS NULL), uses a
 * less-complete calculation (no team-minimum/recurring-discount
 * reapplication), and falls back to the scheduled start/end window when
 * check-in/out timestamps are missing instead of excluding those rows.
 *
 * dryRun defaults to true — a caller must explicitly pass { dryRun: false }
 * to write anything. Every write is a scoped column update on one row at a
 * time (actual_hours/price/team_member_pay only — never touches
 * check_in_time/check_out_time/status, which are already correct).
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { computeCheckoutPricing } from '@/lib/checkout-pricing'

interface AffectedBooking {
  id: string
  check_in_time: string
  check_out_time: string
  hourly_rate: number | null
  pay_rate: number | null
  discount_percent: number | null
  one_time_credit_cents: number | null
  recurring_type: string | null
  max_hours: number | null
  team_size: number | null
  price: number | null
  team_member_pay: number | null
  team_member_id: string | null
}

interface TeamMemberRow {
  id: string
  pay_rate: number | null
}

interface BackfillChange {
  bookingId: string
  oldPriceCents: number | null
  newPriceCents: number
  oldTeamMemberPayCents: number | null
  newTeamMemberPayCents: number
  actualHours: number
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('finance.expenses')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const dryRun = body.dryRun !== false

    const db = tenantDb(tenantId)

    const { data: rawBookings, error: bErr } = await db
      .from('bookings')
      .select(
        'id, check_in_time, check_out_time, hourly_rate, pay_rate, discount_percent, one_time_credit_cents, recurring_type, max_hours, team_size, price, team_member_pay, team_member_id'
      )
      .eq('status', 'completed')
      .is('actual_hours', null)
      .not('check_in_time', 'is', null)
      .not('check_out_time', 'is', null)
    if (bErr) throw bErr

    const bookings = (rawBookings || []) as AffectedBooking[]
    if (bookings.length === 0) {
      return NextResponse.json({ dryRun, targeted: 0, changes: [], updated: 0 })
    }

    // Booking-level pay_rate is an admin override and wins over the team
    // member's own default rate — same precedence as every live checkout
    // path (BookingsAdmin.tsx, team-portal/15min-alert's documented
    // comment). Only fetch team_members for bookings that actually need the
    // fallback (pay_rate not already set on the booking itself).
    const memberIdsNeeded = Array.from(
      new Set(bookings.filter((b) => b.pay_rate == null && b.team_member_id).map((b) => b.team_member_id as string))
    )
    const memberRateById = new Map<string, number | null>()
    if (memberIdsNeeded.length > 0) {
      const { data: members, error: mErr } = await db.from('team_members').select('id, pay_rate').in('id', memberIdsNeeded)
      if (mErr) throw mErr
      for (const m of (members || []) as TeamMemberRow[]) memberRateById.set(m.id, m.pay_rate)
    }

    const changes: BackfillChange[] = []
    for (const b of bookings) {
      const cleanerHourlyRate = b.pay_rate ?? (b.team_member_id ? memberRateById.get(b.team_member_id) ?? null : null)
      const { actualHours, priceCents, cleanerPayCents } = computeCheckoutPricing({
        checkInIso: b.check_in_time,
        checkOutIso: b.check_out_time,
        hourlyRate: b.hourly_rate,
        cleanerHourlyRate,
        discountPercent: b.discount_percent,
        oneTimeCreditCents: b.one_time_credit_cents,
        recurringType: b.recurring_type,
        maxHours: b.max_hours,
        teamSize: b.team_size,
      })

      changes.push({
        bookingId: b.id,
        oldPriceCents: b.price,
        newPriceCents: priceCents,
        oldTeamMemberPayCents: b.team_member_pay,
        newTeamMemberPayCents: cleanerPayCents,
        actualHours,
      })

      if (!dryRun) {
        const { error: uErr } = await db
          .from('bookings')
          .update({ actual_hours: actualHours, price: priceCents, team_member_pay: cleanerPayCents })
          .eq('id', b.id)
        if (uErr) throw uErr
      }
    }

    return NextResponse.json({
      dryRun,
      targeted: bookings.length,
      changes,
      updated: dryRun ? 0 : changes.length,
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/backfill-checkout-price error:', err)
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500 })
  }
}
