import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * finance/payroll-prep GET — paid_out_cents status vocabulary.
 *
 * BUG (fixed here): this route's own inline filter only counted a payout
 * toward paid_out_cents/balance_owed_cents if status was 'paid'/'succeeded'/
 * 'completed' -- but no payout writer in the codebase ever used those values.
 * Stripe auto-payouts write status='transferred' (see post-labor.ts's
 * PAID_PAYOUT_STATUSES); manual Zelle/Venmo/CashApp payouts (before the
 * sibling cleaner-payout fix) wrote the payment method into status instead of
 * a real state. Net effect: every contractor showed $0 paid_out and a full
 * balance_owed forever, regardless of how much they'd actually been paid.
 * Now shares PAID_PAYOUT_STATUSES with post-labor.ts so "counted as paid
 * here" and "posted to the ledger" agree.
 */

const CTX_TENANT = 'tid-a'

const h_holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => h_holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

function seed() {
  return {
    team_members: [{ id: 'tm-1', tenant_id: CTX_TENANT, name: 'Alex', active: true }],
    bookings: [],
    team_member_payouts: [
      // Stripe auto-payout — real-world value is 'transferred', not 'paid'.
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-1', amount_cents: 5000, status: 'transferred', created_at: '2026-07-10T00:00:00Z' },
      // Manual payout, post-fix value.
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-1', amount_cents: 3000, status: 'paid', created_at: '2026-07-11T00:00:00Z' },
      // Not yet paid out — must not count.
      { id: 'p3', tenant_id: CTX_TENANT, team_member_id: 'tm-1', amount_cents: 9999, status: 'pending', created_at: '2026-07-12T00:00:00Z' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  h_holder.from = h.from
})

function req(qs: string): Request {
  return new Request(`http://t/api/finance/payroll-prep?${qs}`)
}

describe('finance/payroll-prep GET — paid_out_cents status vocabulary', () => {
  it('counts transferred (Stripe) and paid (manual) payouts toward paid_out_cents', async () => {
    const { GET } = await import('./route')
    const res = await GET(req('from=2026-07-01&to=2026-07-31'))
    const body = await res.json()
    const row = body.rows.find((r: { team_member_id: string }) => r.team_member_id === 'tm-1')
    expect(row.paid_out_cents).toBe(8000) // 5000 (transferred) + 3000 (paid), pending excluded
    expect(body.totals.total_paid_out_cents).toBe(8000)
  })

  it('mutation control: an unrecognized status is correctly excluded', async () => {
    h.seed.team_member_payouts.push({
      id: 'p4', tenant_id: CTX_TENANT, team_member_id: 'tm-1', amount_cents: 12345, status: 'zelle', created_at: '2026-07-13T00:00:00Z',
    })
    const { GET } = await import('./route')
    const res = await GET(req('from=2026-07-01&to=2026-07-31'))
    const body = await res.json()
    const row = body.rows.find((r: { team_member_id: string }) => r.team_member_id === 'tm-1')
    expect(row.paid_out_cents).toBe(8000)
  })
})
