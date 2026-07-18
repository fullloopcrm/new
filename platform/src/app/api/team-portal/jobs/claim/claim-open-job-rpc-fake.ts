import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Test double for the claim_open_job() RPC (2026_07_18_claim_open_job_atomic.sql).
 * Mirrors the real function's logic against the shared in-memory fake store:
 * cap check first (DAILY_CAP_REACHED error if at/over cap), then the
 * `team_member_id IS NULL`-gated claim. The whole body is synchronous (no
 * internal `await`) so two calls issued via Promise.all still can't interleave
 * mid-check the way two separately-awaited fake queries could — matching the
 * real function's single-transaction atomicity.
 */
export function fakeClaimOpenJobRpc(fake: FakeSupabase) {
  return async (fn: string, params: Record<string, unknown>) => {
    if (fn !== 'claim_open_job') throw new Error(`unexpected rpc: ${fn}`)

    const memberId = params.p_member_id as string
    const tenantId = params.p_tenant_id as string
    const bookingId = params.p_booking_id as string
    const dayStart = params.p_day_start as string
    const dayEnd = params.p_day_end as string
    const defaultPayRate = params.p_default_pay_rate as number | null

    const member = fake._all('team_members').find(
      (m) => m.id === memberId && m.tenant_id === tenantId,
    ) as { max_jobs_per_day?: number | null } | undefined
    const cap = member?.max_jobs_per_day

    if (cap && cap > 0) {
      const count = fake._all('bookings').filter((b) =>
        b.tenant_id === tenantId &&
        b.team_member_id === memberId &&
        typeof b.start_time === 'string' &&
        b.start_time >= dayStart &&
        b.start_time < dayEnd &&
        b.status !== 'cancelled',
      ).length
      if (count >= cap) {
        return { data: null, error: { message: `DAILY_CAP_REACHED: Daily job limit reached (${cap})` } }
      }
    }

    const booking = fake._all('bookings').find(
      (b) => b.id === bookingId && b.tenant_id === tenantId && b.team_member_id === null,
    ) as Record<string, unknown> | undefined
    if (!booking) return { data: [], error: null }

    booking.team_member_id = memberId
    booking.status = 'confirmed'
    if (booking.pay_rate == null) booking.pay_rate = defaultPayRate

    return { data: [{ ...booking }], error: null }
  }
}
