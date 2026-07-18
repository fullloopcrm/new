import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Stripe webhook — Full Loop self-serve signup's prospect→tenant_id
 * backfill — masked-DB-error fix (log, not throw).
 *
 * BUG (fixed here): after the tenant is created and provisioned, the
 * `prospects.tenant_id` backfill write discarded its result entirely (no
 * destructure at all). A genuine DB failure here was invisible.
 *
 * FIX: check the write's `error` and log it loudly — but deliberately do
 * NOT throw. Unlike the claim/fetch/tenant-insert fixes (which gate the
 * entire flow and have no valid fallback), by this point the tenant is
 * already fully created and provisioned, and the CAS guard means there's no
 * retry path that would ever revisit this write — it's purely a reporting/
 * back-link concern (admin dashboard's prospect→tenant display). Throwing
 * here would abort the higher-stakes owner-invite send just below over a
 * lower-stakes linkage write. This test proves the log fires AND the invite
 * flow still completes (welcome email still sent) despite this write
 * failing.
 */

let event: { type: string; data: { object: Record<string, unknown> } }

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: () => event }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

const sendEmailMock = vi.fn(async (args: unknown) => {})
vi.mock('@/lib/email', () => ({
  sendEmail: (args: unknown) => sendEmailMock(args),
}))

vi.mock('@/lib/provision-tenant', () => ({
  provisionTenant: async () => {},
}))

vi.mock('@/lib/entity-provision', () => ({
  ensureDefaultEntity: async () => true,
}))

const prospectRow = {
  id: 'prospect_1',
  business_name: 'Acme Cleaning',
  trade: 'cleaning',
  owner_phone: '+15555550100',
  owner_email: 'owner@example.com',
  owner_name: 'Owner Name',
  tenant_id: null,
  paid_tier: 'pro',
  primary_city: 'Testville',
  primary_state: 'NY',
  primary_zip: '10001',
}

let prospectsFromCalls = 0

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'prospects') {
        prospectsFromCalls++
        if (prospectsFromCalls === 1) {
          return {
            update: () => ({
              eq: () => ({
                in: () => ({
                  select: () => ({
                    maybeSingle: async () => ({ data: { id: prospectRow.id }, error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        if (prospectsFromCalls === 2) {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: prospectRow, error: null }),
              }),
            }),
          }
        }
        // The tenant_id backfill — fails, but must not abort the flow.
        return {
          update: () => ({
            eq: async () => ({ data: null, error: { message: 'connection reset' } }),
          }),
        }
      }
      if (table === 'tenants') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'tenant_1' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'tenant_invites') {
        return { insert: async () => ({ data: null, error: null }) }
      }
      const noop: Record<string, unknown> = {
        select: () => noop, insert: () => noop, update: () => noop, eq: () => noop, in: () => noop,
        limit: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
      }
      return noop
    },
  },
}))

import { POST } from './route'

function req(body: string): Request {
  return {
    text: async () => body,
    headers: { get: () => 'sig_test' },
  } as unknown as Request
}

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'
  prospectsFromCalls = 0
  sendEmailMock.mockClear()
})

describe('Stripe webhook — Full Loop signup prospect tenant_id backfill masked DB error', () => {
  it('logs a genuine DB failure on the backfill loudly but still completes the owner invite + welcome email', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          client_reference_id: null,
          metadata: { full_loop_signup: 'true', prospect_id: prospectRow.id, admins: '1', team_members: '0' },
        },
      },
    }

    const res = await POST(req('{}'))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.signup_paid).toBe(true)

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('tenant_id backfill failed'),
      expect.objectContaining({ message: 'connection reset' }),
    )

    // The higher-stakes invite/welcome-email flow still completes despite
    // the lower-stakes backfill write failing.
    expect(sendEmailMock).toHaveBeenCalledTimes(1)

    consoleErrorSpy.mockRestore()
  })
})
