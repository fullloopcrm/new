/**
 * Per-tenant Connect webhook signature verification (leader, 2026-07-22
 * 16:05): each tenant runs its own Stripe account as its own Connect
 * platform, so account.updated deliveries for that tenant's connected
 * accounts (team members/sales partners/referrers) are signed with THAT
 * tenant's own tenants.stripe_connect_webhook_secret, never the shared
 * platform STRIPE_WEBHOOK_SECRET used for checkout/refund/etc.
 *
 * The delivery URL is always this same platform-registered endpoint
 * regardless of which tenant's Stripe account sent it, so the tenant can't
 * be resolved from the request — only from the account object's own
 * metadata.tenant_id (set at account-creation time), read from the
 * signature-verified event body.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))
const stripeCtl = vi.hoisted(() => ({
  current: null as unknown,
  globalSecretWorks: false,
  calls: [] as string[],
}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))

vi.mock('stripe', () => ({
  default: class {
    webhooks = {
      constructEvent: (_body: string, _sig: string, secret: string) => {
        stripeCtl.calls.push(secret)
        if (secret === 'whsec_platform_global' && stripeCtl.globalSecretWorks) return stripeCtl.current
        if (secret === 'whsec_tenant_connect_real') return stripeCtl.current
        throw new Error('No signatures found matching the expected signature for payload')
      },
    }
    accounts = { create: vi.fn(), retrieve: vi.fn() }
  },
}))

import { POST as stripeWebhook } from './route'

function post(body: unknown) {
  return stripeWebhook(
    new Request('http://acme.example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=sig' },
      body: JSON.stringify(body),
    }),
  )
}

const TENANT_ID = 'tenant-connect-1'

function accountUpdatedEvent(overrides?: Record<string, unknown>) {
  return {
    type: 'account.updated',
    data: {
      object: {
        id: 'acct_tm_1',
        charges_enabled: true,
        metadata: { team_member_id: 'tm_1', tenant_id: TENANT_ID },
        ...overrides,
      },
    },
  }
}

beforeEach(() => {
  h.seq = 0
  h.store = { team_members: [{ id: 'tm_1', tenant_id: TENANT_ID, stripe_account_id: null }], tenants: [] }
  stripeCtl.current = null
  stripeCtl.globalSecretWorks = false
  stripeCtl.calls = []
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_platform_global'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('webhooks/stripe — per-tenant Connect webhook secret fallback', () => {
  it('falls back to the tenant\'s own stripe_connect_webhook_secret when the global secret fails, and processes the verified event', async () => {
    h.store.tenants = [{ id: TENANT_ID, stripe_connect_webhook_secret: 'whsec_tenant_connect_real' }]
    stripeCtl.current = accountUpdatedEvent()

    const res = await post(accountUpdatedEvent())
    expect(res.status).toBe(200)

    // Tried the global secret first (unchanged priority), then the tenant's own.
    expect(stripeCtl.calls).toEqual(['whsec_platform_global', 'whsec_tenant_connect_real'])

    // The verified event was actually processed — team_members.stripe_account_id set.
    const tm = h.store.team_members.find((r) => r.id === 'tm_1')
    expect(tm?.stripe_account_id).toBe('acct_tm_1')
  })

  it('rejects with 400 when the tenant has no stripe_connect_webhook_secret configured — never accepts an unverified event', async () => {
    h.store.tenants = [{ id: TENANT_ID, stripe_connect_webhook_secret: null }]
    stripeCtl.current = accountUpdatedEvent()

    const res = await post(accountUpdatedEvent())
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid signature' })

    const tm = h.store.team_members.find((r) => r.id === 'tm_1')
    expect(tm?.stripe_account_id).toBe(null)
  })

  it('rejects with 400 when no tenant matches the tenant_id in the (unverified) payload', async () => {
    h.store.tenants = []
    stripeCtl.current = accountUpdatedEvent()

    const res = await post(accountUpdatedEvent())
    expect(res.status).toBe(400)
  })

  it('rejects with 400 when the tenant IS found but its real secret still does not verify (forged/stale)', async () => {
    h.store.tenants = [{ id: TENANT_ID, stripe_connect_webhook_secret: 'whsec_tenant_connect_STALE' }]
    stripeCtl.current = accountUpdatedEvent()

    const res = await post(accountUpdatedEvent())
    expect(res.status).toBe(400)
    expect(stripeCtl.calls).toEqual(['whsec_platform_global', 'whsec_tenant_connect_STALE'])
  })

  it('does not attempt the Connect fallback at all for a non-account.updated event that fails the global secret', async () => {
    h.store.tenants = [{ id: TENANT_ID, stripe_connect_webhook_secret: 'whsec_tenant_connect_real' }]
    stripeCtl.current = { type: 'checkout.session.completed', data: { object: {} } }

    const res = await post({ type: 'checkout.session.completed', data: { object: {} } })
    expect(res.status).toBe(400)
    // Only the one global-secret attempt — no tenant_id to peek from this event shape.
    expect(stripeCtl.calls).toEqual(['whsec_platform_global'])
  })

  it('still succeeds on the first (global secret) attempt when it verifies — unchanged priority/behavior', async () => {
    stripeCtl.globalSecretWorks = true
    stripeCtl.current = accountUpdatedEvent()

    const res = await post(accountUpdatedEvent())
    expect(res.status).toBe(200)
    expect(stripeCtl.calls).toEqual(['whsec_platform_global'])
  })
})
