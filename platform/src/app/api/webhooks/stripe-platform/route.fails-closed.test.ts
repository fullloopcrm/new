import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/webhooks/stripe-platform — the platform's own revenue webhook,
 * separate from the tenant Connect webhook at /api/webhooks/stripe. On
 * checkout.session.completed it does NOT create a tenant -- current design
 * (route.ts's own docstring) defers tenant creation until an admin confirms
 * the separate $25k bank wire landed; this handler only records the
 * subscription id on the partner_requests lead row so that wire-received
 * step can find it. This locks in:
 *   - no secret configured => 500, never reaches signature verification
 *   - missing stripe-signature header => 400, never reaches verification
 *   - a signature that fails Stripe's own verification => 400 (forged/
 *     tampered payloads never reach the DB write)
 *   - a genuinely valid event records stripe_subscription_id on the lead
 *   - a DB write failure fails closed with 500 (so Stripe retries instead of
 *     silently losing the subscription id)
 *
 * REGRESSION NOTE (2026-08-06): this file previously asserted the OLD
 * behavior (createTenantFromLead + activateTenant called synchronously from
 * this webhook) -- stale since the route was redesigned to defer tenant
 * creation to the bank-wire step (commit 0231f475e). Rewritten to match the
 * route's actual, current, intentional behavior.
 */

const constructEvent = vi.fn()
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ webhooks: { constructEvent } }),
}))

const update = vi.fn()
const eq = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      update: (values: unknown) => {
        update(table, values)
        return { eq }
      },
    }),
  },
}))

import { POST } from './route'

function req(opts: { body?: string; sig?: string | null } = {}): Request {
  return {
    text: async () => opts.body ?? '{}',
    headers: { get: (name: string) => (name === 'stripe-signature' ? (opts.sig === undefined ? 'sig_test' : opts.sig) : null) },
  } as unknown as Request
}

const validEvent = {
  type: 'checkout.session.completed',
  data: { object: { metadata: { kind: 'platform_proposal', lead_id: 'lead_1' }, subscription: 'sub_1' } },
}

beforeEach(() => {
  constructEvent.mockReset()
  update.mockReset()
  eq.mockReset()
  eq.mockResolvedValue({ error: null })
  process.env.STRIPE_PLATFORM_WEBHOOK_SECRET = 'whsec_platform_test'
})

describe('stripe-platform webhook — fails closed on missing/invalid signature', () => {
  it('no webhook secret configured => 500, never reaches signature verification', async () => {
    delete process.env.STRIPE_PLATFORM_WEBHOOK_SECRET
    const res = await POST(req())

    expect(res.status).toBe(500)
    expect(constructEvent).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('missing stripe-signature header => 400, never reaches signature verification', async () => {
    const res = await POST(req({ sig: null }))

    expect(res.status).toBe(400)
    expect(constructEvent).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('signature fails Stripe verification => 400, never reaches the DB write', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload')
    })

    const res = await POST(req({ sig: 'sig_forged' }))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid signature')
    expect(update).not.toHaveBeenCalled()
  })

  it('a genuinely valid event records stripe_subscription_id on the partner_requests lead', async () => {
    constructEvent.mockReturnValue(validEvent)

    const res = await POST(req({ sig: 'sig_valid' }))

    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
    expect(update).toHaveBeenCalledTimes(1)
    const [table, values] = update.mock.calls[0]
    expect(table).toBe('partner_requests')
    expect(values).toMatchObject({ stripe_subscription_id: 'sub_1' })
    expect(eq).toHaveBeenCalledWith('id', 'lead_1')
  })

  it('a replayed valid event (Stripe redelivery) just writes the same subscription id again -- harmless, no error', async () => {
    constructEvent.mockReturnValue(validEvent)

    await POST(req({ sig: 'sig_valid' }))
    const res = await POST(req({ sig: 'sig_valid' }))

    expect(res.status).toBe(200)
    expect(update).toHaveBeenCalledTimes(2)
  })

  it('a DB write failure fails closed with 500 so Stripe retries', async () => {
    constructEvent.mockReturnValue(validEvent)
    eq.mockResolvedValue({ error: { message: 'connection refused' } })

    const res = await POST(req({ sig: 'sig_valid' }))

    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('connection refused')
  })
})
