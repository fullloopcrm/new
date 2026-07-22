import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { createReferrerToken } from '@/lib/referrer-portal-auth'

const SECRET = 'referrer-stripe-status-test-secret'
const TENANT_ID = 'tenant_1'
const REFERRER_ID = 'ref_1'

let accountState: { charges_enabled: boolean; payouts_enabled: boolean; details_submitted: boolean; capabilities?: { transfers?: string } }
const accountsRetrieve = vi.fn(async () => accountState)

vi.mock('stripe', () => {
  class MockStripe {
    accounts = { retrieve: accountsRetrieve }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

const notifySpy = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => notifySpy(...args) }))
const smsAdminsSpy = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: (...args: unknown[]) => smsAdminsSpy(...args) }))

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
              single: async () => ({ data: { id: TENANT_ID, name: 'Acme', stripe_api_key: null }, error: null }),
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
  accountsRetrieve.mockClear()
  notifySpy.mockClear()
  smsAdminsSpy.mockClear()
  referrerUpdate = null
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  referrerRow = {
    id: REFERRER_ID,
    name: 'Reyna Referrer',
    stripe_connect_account_id: 'acct_1',
    stripe_ready_at: null,
  }
  accountState = { charges_enabled: false, payouts_enabled: false, details_submitted: false }
})

function req(token: string, method: 'GET' | 'POST' = 'POST') {
  return new Request('http://x', { method, headers: { authorization: `Bearer ${token}` } })
}

describe('POST /api/referrers/[id]/stripe-status', () => {
  it('rejects with no auth', async () => {
    const res = await POST(new Request('http://x', { method: 'POST' }), { params: Promise.resolve({ id: REFERRER_ID }) })
    expect(res.status).toBe(401)
  })

  it('rejects a token for a different referrer', async () => {
    const token = createReferrerToken('someone-else', TENANT_ID)
    const res = await POST(req(token), { params: Promise.resolve({ id: REFERRER_ID }) })
    expect(res.status).toBe(403)
  })

  it('returns ready:false when the referrer never started onboarding', async () => {
    referrerRow!.stripe_connect_account_id = null
    const token = createReferrerToken(REFERRER_ID, TENANT_ID)
    const res = await POST(req(token), { params: Promise.resolve({ id: REFERRER_ID }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toEqual({ ready: false })
    expect(accountsRetrieve).not.toHaveBeenCalled()
  })

  it('returns ready:false while Stripe onboarding is incomplete', async () => {
    const token = createReferrerToken(REFERRER_ID, TENANT_ID)
    const res = await POST(req(token), { params: Promise.resolve({ id: REFERRER_ID }) })
    const json = await res.json()
    expect(json.ready).toBe(false)
    expect(referrerUpdate).toBeNull()
    expect(notifySpy).not.toHaveBeenCalled()
  })

  it('on first transition to ready: sets stripe_ready_at, notifies admins, sends SMS', async () => {
    accountState = { charges_enabled: true, payouts_enabled: true, details_submitted: true }
    const token = createReferrerToken(REFERRER_ID, TENANT_ID)
    const res = await POST(req(token), { params: Promise.resolve({ id: REFERRER_ID }) })
    const json = await res.json()

    expect(json.ready).toBe(true)
    expect(referrerUpdate).toHaveProperty('stripe_ready_at')
    expect(notifySpy).toHaveBeenCalledTimes(1)
    expect(smsAdminsSpy).toHaveBeenCalledTimes(1)
  })

  it('does not re-notify on a subsequent already-ready check', async () => {
    referrerRow!.stripe_ready_at = '2026-01-01T00:00:00.000Z'
    accountState = { charges_enabled: true, payouts_enabled: true, details_submitted: true }
    const token = createReferrerToken(REFERRER_ID, TENANT_ID)
    await POST(req(token), { params: Promise.resolve({ id: REFERRER_ID }) })
    expect(notifySpy).not.toHaveBeenCalled()
    expect(smsAdminsSpy).not.toHaveBeenCalled()
  })
})

describe('GET /api/referrers/[id]/stripe-status', () => {
  it('does the read-only check without notifying, even when newly ready', async () => {
    accountState = { charges_enabled: true, payouts_enabled: true, details_submitted: true }
    const token = createReferrerToken(REFERRER_ID, TENANT_ID)
    const res = await GET(req(token, 'GET'), { params: Promise.resolve({ id: REFERRER_ID }) })
    const json = await res.json()

    expect(json.ready).toBe(true)
    expect(referrerUpdate).toBeNull()
    expect(notifySpy).not.toHaveBeenCalled()
  })
})
