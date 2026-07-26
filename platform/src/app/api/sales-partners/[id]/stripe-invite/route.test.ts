import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/sales-partners/[id]/stripe-invite — admin-triggered "Send Connect
 * invite". Creates/reuses the Connect account (tenant's own Stripe key, same
 * as the self-service stripe-onboard route), generates the hosted onboarding
 * link, and pushes it to the partner via SMS + email.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const accountsCreate = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => ({ id: 'acct_new' })))
const accountLinksCreate = vi.hoisted(() => vi.fn(async () => ({ url: 'https://connect.stripe.com/setup/abc' })))
const sendSmsSpy = vi.hoisted(() => vi.fn(async () => ({})))
const sendEmailSpy = vi.hoisted(() => vi.fn(async () => ({})))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: 'tenant-A',
      tenant: { id: 'tenant-A' },
      role: 'owner',
    })),
  }
})
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    accounts: { create: accountsCreate },
    accountLinks: { create: accountLinksCreate },
  }),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSmsSpy }))
vi.mock('@/lib/email', () => ({ sendEmail: sendEmailSpy, tenantSender: () => 'Test Tenant <no-reply@fullloopcrm.com>' }))

import { POST, sendSalesPartnerStripeInvite } from './route'

const postReq = () => new Request('http://x', { method: 'POST' })
const paramsFor = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  accountsCreate.mockClear()
  accountLinksCreate.mockClear()
  sendSmsSpy.mockClear()
  sendEmailSpy.mockClear()
  h.store = {
    tenants: [
      { id: 'tenant-A', name: 'Acme Cleaning', slug: 'acme', domain: null, stripe_api_key: null, telnyx_api_key: 'tk', telnyx_phone: '+15550001111', resend_api_key: null, email_from: null },
    ],
    sales_partners: [
      { id: 'sp-1', tenant_id: 'tenant-A', name: 'Jane Doe', email: 'jane@example.com', phone: '+15551234567', active: true, stripe_connect_account_id: null },
      { id: 'sp-2', tenant_id: 'tenant-A', name: 'Not Approved', email: 'no@example.com', phone: null, active: false, stripe_connect_account_id: null },
      { id: 'sp-3', tenant_id: 'tenant-A', name: 'Already Started', email: 'started@example.com', phone: null, active: true, stripe_connect_account_id: 'acct_existing' },
    ],
  }
})

describe('POST /api/sales-partners/[id]/stripe-invite', () => {
  it('creates a Connect account, sends the link via SMS and email, and persists the account id', async () => {
    const res = await POST(postReq(), paramsFor('sp-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.url).toBe('https://connect.stripe.com/setup/abc')
    expect(body.sentSms).toBe(true)
    expect(body.sentEmail).toBe(true)
    expect(accountsCreate).toHaveBeenCalledTimes(1)
    expect(accountsCreate.mock.calls[0][1]).toEqual({ idempotencyKey: 'connect-account-sp-tenant-A-sp-1' })
    expect(sendSmsSpy).toHaveBeenCalledTimes(1)
    expect(sendEmailSpy).toHaveBeenCalledTimes(1)

    const partner = h.store.sales_partners.find((p) => p.id === 'sp-1')
    expect(partner?.stripe_connect_account_id).toBe('acct_new')
  })

  it('reuses an existing Connect account instead of creating a new one', async () => {
    const res = await POST(postReq(), paramsFor('sp-3'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(accountsCreate).not.toHaveBeenCalled()
    expect(accountLinksCreate).toHaveBeenCalledWith(expect.objectContaining({ account: 'acct_existing' }))
    expect(body.sentSms).toBe(false) // sp-3 has no phone
  })

  it('rejects an invite for a partner who has not been approved yet', async () => {
    const res = await POST(postReq(), paramsFor('sp-2'))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/not been approved/i)
    expect(accountsCreate).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown partner id', async () => {
    const res = await POST(postReq(), paramsFor('does-not-exist'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/not found/i)
  })

  it('sendSalesPartnerStripeInvite is callable directly (used by the approval auto-send hook)', async () => {
    const result = await sendSalesPartnerStripeInvite('sp-1', 'tenant-A')
    expect(result.ok).toBe(true)
  })
})
