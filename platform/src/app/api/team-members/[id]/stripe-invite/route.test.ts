import { describe, it, expect, beforeEach, vi } from 'vitest'

const TENANT_ID = 'tenant_1'
const TEAM_MEMBER_ID = 'tm_1'

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
const accountLinksCreate = vi.fn(async () => ({ url: 'https://connect.stripe.com/onboard/invite' }))

vi.mock('stripe', () => {
  class MockStripe {
    accounts = { create: accountsCreate, retrieve: vi.fn(async () => ({})) }
    accountLinks = { create: accountLinksCreate }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: TENANT_ID, tenant: { id: TENANT_ID }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return { AuthError, getTenantForRequest: vi.fn(async () => ({ tenantId: TENANT_ID })) }
})

let memberRow: Record<string, unknown> = {
  id: TEAM_MEMBER_ID,
  name: 'Jane Cleaner',
  email: 'jane@example.com',
  phone: '5551234567',
  stripe_account_id: null,
}

function teamMembersBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    update: () => chain,
    single: async () => ({ data: memberRow, error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => (table === 'team_members' ? teamMembersBuilder() : { select: () => ({}), eq: () => ({}) }) },
}))

type NotifyArgs = {
  tenantId: string
  channel: string
  recipientType: string
  recipientId: string
  message: string
  title: string
  type: string
}
const { notifyMock } = vi.hoisted(() => ({
  notifyMock: vi.fn(async (_args: NotifyArgs): Promise<{ success: boolean; error?: string }> => ({ success: true })),
}))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))

import { POST } from './route'

beforeEach(() => {
  accountsCreate.mockClear()
  accountLinksCreate.mockClear()
  notifyMock.mockClear()
  idempotencyStore.clear()
  realAccountCount = 0
  memberRow = {
    id: TEAM_MEMBER_ID,
    name: 'Jane Cleaner',
    email: 'jane@example.com',
    phone: '5551234567',
    stripe_account_id: null,
  }
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
})

describe('POST /api/team-members/[id]/stripe-invite', () => {
  it('creates a Connect account, generates an onboarding link, and sends it via notify()', async () => {
    const req = {} as unknown as Parameters<typeof POST>[0]
    const params = Promise.resolve({ id: TEAM_MEMBER_ID })

    const res = await POST(req, { params })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.url).toBe('https://connect.stripe.com/onboard/invite')

    expect(accountsCreate).toHaveBeenCalledTimes(1)
    const [, createOpts] = accountsCreate.mock.calls[0]
    expect(createOpts).toEqual({ idempotencyKey: `connect-account-${TENANT_ID}-${TEAM_MEMBER_ID}` })

    expect(notifyMock).toHaveBeenCalledTimes(1)
    const [notifyArgs] = notifyMock.mock.calls[0]
    expect(notifyArgs).toMatchObject({
      tenantId: TENANT_ID,
      channel: 'sms',
      recipientType: 'team_member',
      recipientId: TEAM_MEMBER_ID,
    })
    expect(notifyArgs.message).toContain('https://connect.stripe.com/onboard/invite')
  })

  it('reuses an existing Stripe account instead of minting a second one', async () => {
    memberRow = { ...memberRow, stripe_account_id: 'acct_existing' }
    const req = {} as unknown as Parameters<typeof POST>[0]
    const params = Promise.resolve({ id: TEAM_MEMBER_ID })

    const res = await POST(req, { params })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.account_id).toBe('acct_existing')
    expect(accountsCreate).not.toHaveBeenCalled()
  })

  it('404s when the team member does not exist', async () => {
    memberRow = null as unknown as Record<string, unknown>
    const req = {} as unknown as Parameters<typeof POST>[0]
    const params = Promise.resolve({ id: 'missing' })

    const res = await POST(req, { params })
    expect(res.status).toBe(404)
  })

  it('returns 400 when the team member has no phone or email', async () => {
    memberRow = { id: TEAM_MEMBER_ID, name: 'No Contact', email: null, phone: null, stripe_account_id: null }
    const req = {} as unknown as Parameters<typeof POST>[0]
    const params = Promise.resolve({ id: TEAM_MEMBER_ID })

    const res = await POST(req, { params })
    expect(res.status).toBe(400)
    expect(accountsCreate).not.toHaveBeenCalled()
  })

  it('surfaces a 502 when notify() cannot deliver the invite', async () => {
    notifyMock.mockResolvedValueOnce({ success: false, error: 'SMS not configured — no Telnyx API key' })
    const req = {} as unknown as Parameters<typeof POST>[0]
    const params = Promise.resolve({ id: TEAM_MEMBER_ID })

    const res = await POST(req, { params })
    const json = await res.json()
    expect(res.status).toBe(502)
    expect(json.error).toContain('Telnyx')
    expect(json.url).toBe('https://connect.stripe.com/onboard/invite')
  })
})
