import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { createReferrerToken } from '@/lib/referrer-portal-auth'

const SECRET = 'referrer-stripe-onboard-test-secret'
const TENANT_ID = 'tenant_1'
const REFERRER_ID = 'ref_1'

const idempotencyStore = new Map<string, { id: string }>()
let realAccountCount = 0
const accountsCreate = vi.fn(async (_params: unknown, options?: { idempotencyKey?: string }) => {
  const key = options?.idempotencyKey
  if (key && idempotencyStore.has(key)) return idempotencyStore.get(key)!
  realAccountCount++
  const account = { id: `acct_${realAccountCount}` }
  if (key) idempotencyStore.set(key, account)
  return account
})
const accountLinksCreate = vi.fn(async () => ({ url: 'https://connect.stripe.com/onboard' }))

vi.mock('stripe', () => {
  class MockStripe {
    accounts = { create: accountsCreate, retrieve: vi.fn(async () => ({})) }
    accountLinks = { create: accountLinksCreate }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

let referrerRow: Record<string, unknown> | null
let referrerUpdate: Record<string, unknown> | null

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'referrers') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => (referrerRow ? { data: referrerRow, error: null } : { data: null, error: { message: 'not found' } }),
              }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: () => ({
              eq: async () => {
                referrerUpdate = patch
                if (referrerRow) Object.assign(referrerRow, patch)
                return { data: null, error: null }
              },
            }),
          }),
        }
      }
      if (table === 'tenants') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: TENANT_ID, slug: 'acme', domain: null, stripe_api_key: null }, error: null }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

import { POST, GET } from './route'

beforeAll(() => {
  process.env.TEAM_PORTAL_SECRET = SECRET
})

beforeEach(() => {
  accountsCreate.mockClear()
  accountLinksCreate.mockClear()
  idempotencyStore.clear()
  realAccountCount = 0
  referrerUpdate = null
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  referrerRow = {
    id: REFERRER_ID,
    name: 'Reyna Referrer',
    email: 'reyna@example.com',
    referral_code: 'REYN123',
    stripe_connect_account_id: null,
  }
})

function authedReq(token: string) {
  return new Request('http://x', { method: 'POST', headers: { authorization: `Bearer ${token}` } })
}

describe('POST /api/referrers/[id]/stripe-onboard', () => {
  it('rejects with no auth token', async () => {
    const res = await POST(new Request('http://x', { method: 'POST' }), { params: Promise.resolve({ id: REFERRER_ID }) })
    expect(res.status).toBe(401)
  })

  it('rejects when the token belongs to a different referrer', async () => {
    const token = createReferrerToken('someone-else', TENANT_ID)
    const res = await POST(authedReq(token), { params: Promise.resolve({ id: REFERRER_ID }) })
    expect(res.status).toBe(403)
  })

  it('creates a Connect account and returns an onboarding URL on first call', async () => {
    const token = createReferrerToken(REFERRER_ID, TENANT_ID)
    const res = await POST(authedReq(token), { params: Promise.resolve({ id: REFERRER_ID }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.url).toBe('https://connect.stripe.com/onboard')
    expect(json.account_id).toBe('acct_1')
    expect(accountsCreate).toHaveBeenCalledTimes(1)
    expect(referrerUpdate).toEqual({ stripe_connect_account_id: 'acct_1' })
  })

  it('reuses the existing Connect account instead of minting a second one', async () => {
    referrerRow!.stripe_connect_account_id = 'acct_existing'
    const token = createReferrerToken(REFERRER_ID, TENANT_ID)
    const res = await POST(authedReq(token), { params: Promise.resolve({ id: REFERRER_ID }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.account_id).toBe('acct_existing')
    expect(accountsCreate).not.toHaveBeenCalled()
  })

  it('passes a stable per-referrer idempotencyKey to stripe.accounts.create', async () => {
    const token = createReferrerToken(REFERRER_ID, TENANT_ID)
    await POST(authedReq(token), { params: Promise.resolve({ id: REFERRER_ID }) })
    const [, opts] = accountsCreate.mock.calls[0]
    expect(opts).toMatchObject({ idempotencyKey: `connect-account-ref-${TENANT_ID}-${REFERRER_ID}` })
  })

  it('404s when the referrer row is not found for this tenant', async () => {
    referrerRow = null
    const token = createReferrerToken(REFERRER_ID, TENANT_ID)
    const res = await POST(authedReq(token), { params: Promise.resolve({ id: REFERRER_ID }) })
    expect(res.status).toBe(404)
  })
})

describe('GET /api/referrers/[id]/stripe-onboard — refresh handler', () => {
  it('redirects to /referral when unauthenticated', async () => {
    const res = await GET(new Request('http://x/api/referrers/x/stripe-onboard'), { params: Promise.resolve({ id: REFERRER_ID }) })
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/referral')
  })

  it('regenerates a link for an already-connected referrer', async () => {
    referrerRow!.stripe_connect_account_id = 'acct_existing'
    const token = createReferrerToken(REFERRER_ID, TENANT_ID)
    const req = new Request('http://x/api/referrers/x/stripe-onboard', { headers: { authorization: `Bearer ${token}` } })
    const res = await GET(req, { params: Promise.resolve({ id: REFERRER_ID }) })
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://connect.stripe.com/onboard')
  })
})
