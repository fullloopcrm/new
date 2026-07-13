import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/webhooks/stripe-platform creates a REAL paying tenant on
 * checkout.session.completed — this is the platform's own revenue webhook,
 * separate from the tenant Connect webhook at /api/webhooks/stripe. It had
 * signature-verification code but ZERO test coverage proving it actually
 * fails closed. This locks in:
 *   - no secret configured => 500, no tenant created (never falls through to
 *     "trust the payload" when misconfigured)
 *   - missing stripe-signature header => 400, no tenant created
 *   - a signature that fails Stripe's own verification => 400, no tenant
 *     created (forged/tampered payloads never reach createTenantFromLead)
 *   - a genuinely valid event creates the tenant and auto-activates it
 *   - a REPLAYED valid event (Stripe redelivery) is a no-op — no second
 *     tenant, no second activateTenant call — via createTenantFromLead's own
 *     alreadyConverted check
 */

const constructEvent = vi.fn()
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ webhooks: { constructEvent } }),
}))

const createTenantFromLead = vi.fn()
vi.mock('@/lib/create-tenant-from-lead', () => ({ createTenantFromLead: (...args: unknown[]) => createTenantFromLead(...args) }))

const activateTenant = vi.fn()
vi.mock('@/lib/activate-tenant', () => ({ activateTenant: (...args: unknown[]) => activateTenant(...args) }))

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
  createTenantFromLead.mockReset()
  activateTenant.mockReset()
  process.env.STRIPE_PLATFORM_WEBHOOK_SECRET = 'whsec_platform_test'
})

describe('stripe-platform webhook — fails closed on missing/invalid signature', () => {
  it('no webhook secret configured => 500, never touches createTenantFromLead', async () => {
    delete process.env.STRIPE_PLATFORM_WEBHOOK_SECRET
    const res = await POST(req())

    expect(res.status).toBe(500)
    expect(constructEvent).not.toHaveBeenCalled()
    expect(createTenantFromLead).not.toHaveBeenCalled()
  })

  it('missing stripe-signature header => 400, never touches createTenantFromLead', async () => {
    const res = await POST(req({ sig: null }))

    expect(res.status).toBe(400)
    expect(constructEvent).not.toHaveBeenCalled()
    expect(createTenantFromLead).not.toHaveBeenCalled()
  })

  it('signature fails Stripe verification => 400, never touches createTenantFromLead', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload')
    })

    const res = await POST(req({ sig: 'sig_forged' }))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid signature')
    expect(createTenantFromLead).not.toHaveBeenCalled()
  })

  it('a genuinely valid event creates the tenant and auto-activates it', async () => {
    constructEvent.mockReturnValue(validEvent)
    createTenantFromLead.mockResolvedValue({ ok: true, tenant: { id: 'tenant_new' }, alreadyConverted: false })

    const res = await POST(req({ sig: 'sig_valid' }))

    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
    expect(createTenantFromLead).toHaveBeenCalledWith('lead_1', { status: 'new', stripeSubscriptionId: 'sub_1' })
    expect(activateTenant).toHaveBeenCalledWith('tenant_new')
  })

  it('a replayed valid event (Stripe redelivery) does not re-create or re-activate the tenant', async () => {
    constructEvent.mockReturnValue(validEvent)
    createTenantFromLead.mockResolvedValue({ ok: true, tenant: { id: 'tenant_new' }, alreadyConverted: true })

    const res = await POST(req({ sig: 'sig_valid' }))

    expect(res.status).toBe(200)
    expect(createTenantFromLead).toHaveBeenCalledTimes(1)
    // alreadyConverted === true => the route's `!result.alreadyConverted` guard
    // must skip re-activation.
    expect(activateTenant).not.toHaveBeenCalled()
  })
})
