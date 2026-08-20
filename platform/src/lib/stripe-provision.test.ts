/**
 * provisionStripeWebhookSecret() — automates the one manual step left in
 * "drop the Stripe key in and it works": register a webhook endpoint on the
 * tenant's own Stripe account and capture its secret. Manually done for
 * FloridaMade 2026-08-06; this makes it a one-click, idempotent action.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'

const KEY = 'd'.repeat(64)
const ORIGINAL_KEY = process.env.SECRET_ENCRYPTION_KEY

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))
const stripeCtl = vi.hoisted(() => ({
  endpoints: [] as Array<{ id: string; url: string; status: string }>,
  createdSecret: 'whsec_freshly_captured',
  deleted: [] as string[],
  created: [] as { url: string; enabled_events: string[] }[],
}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h) }))

vi.mock('stripe', () => ({
  default: class {
    webhookEndpoints = {
      list: vi.fn(async () => ({ data: stripeCtl.endpoints })),
      del: vi.fn(async (id: string) => { stripeCtl.deleted.push(id) }),
      create: vi.fn(async (params: { url: string; enabled_events: string[] }) => {
        stripeCtl.created.push(params)
        return { id: 'we_new', url: params.url, secret: stripeCtl.createdSecret }
      }),
    }
  },
}))

import { provisionStripeWebhookSecret } from './stripe-provision'

const TENANT_ID = 'tenant-provision-1'

beforeEach(() => {
  h.seq = 0
  h.store = { tenants: [] }
  stripeCtl.endpoints = []
  stripeCtl.deleted = []
  stripeCtl.created = []
  process.env.SECRET_ENCRYPTION_KEY = KEY
})

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.SECRET_ENCRYPTION_KEY
  else process.env.SECRET_ENCRYPTION_KEY = ORIGINAL_KEY
})

describe('provisionStripeWebhookSecret', () => {
  it('no-ops when the tenant has no stripe_api_key', async () => {
    h.store.tenants = [{ id: TENANT_ID, domain: 'example.com', stripe_api_key: null, stripe_webhook_secret: null }]
    const res = await provisionStripeWebhookSecret(TENANT_ID)
    expect(res).toEqual({ ok: false, status: 'skipped_no_key', detail: 'no stripe_api_key set on this tenant' })
    expect(stripeCtl.created).toHaveLength(0)
  })

  it('creates a new endpoint at the tenant\'s own domain and stores the captured secret', async () => {
    h.store.tenants = [{ id: TENANT_ID, domain: 'thefloridamaid.com', stripe_api_key: 'sk_live_plain', stripe_webhook_secret: null }]

    const res = await provisionStripeWebhookSecret(TENANT_ID, 'https://homeservicecrm.ai')

    expect(res.ok).toBe(true)
    expect(res.status).toBe('created')
    expect(res.url).toBe('https://thefloridamaid.com/api/webhooks/stripe')
    expect(stripeCtl.created).toEqual([
      { url: 'https://thefloridamaid.com/api/webhooks/stripe', enabled_events: expect.arrayContaining(['checkout.session.completed', 'account.updated']) },
    ])

    const tenant = h.store.tenants.find(t => t.id === TENANT_ID)
    // decryptSecret() passes plaintext through, but the SAVED value must be
    // an encrypted v1: envelope, not the raw secret sitting in the DB.
    expect(tenant?.stripe_webhook_secret).not.toBe('whsec_freshly_captured')
    expect(String(tenant?.stripe_webhook_secret)).toMatch(/^v1:/)
  })

  it('is a no-op when an enabled endpoint already exists AND a secret is already stored', async () => {
    stripeCtl.endpoints = [{ id: 'we_existing', url: 'https://thefloridamaid.com/api/webhooks/stripe', status: 'enabled' }]
    h.store.tenants = [{ id: TENANT_ID, domain: 'thefloridamaid.com', stripe_api_key: 'sk_live_plain', stripe_webhook_secret: 'v1:already:set:here' }]

    const res = await provisionStripeWebhookSecret(TENANT_ID, 'https://homeservicecrm.ai')

    expect(res.status).toBe('already_configured')
    expect(stripeCtl.created).toHaveLength(0)
    expect(stripeCtl.deleted).toHaveLength(0)
  })

  it('deletes and recreates when an enabled endpoint exists but no secret is stored (the FloridaMade pre-fix state)', async () => {
    stripeCtl.endpoints = [{ id: 'we_orphaned', url: 'https://thefloridamaid.com/api/webhooks/stripe', status: 'enabled' }]
    h.store.tenants = [{ id: TENANT_ID, domain: 'thefloridamaid.com', stripe_api_key: 'sk_live_plain', stripe_webhook_secret: null }]

    const res = await provisionStripeWebhookSecret(TENANT_ID, 'https://homeservicecrm.ai')

    expect(res.status).toBe('recreated')
    expect(stripeCtl.deleted).toEqual(['we_orphaned'])
    expect(stripeCtl.created).toHaveLength(1)
    const tenant = h.store.tenants.find(t => t.id === TENANT_ID)
    expect(String(tenant?.stripe_webhook_secret)).toMatch(/^v1:/)
  })

  it('falls back to the platform URL when the tenant has no domain set', async () => {
    h.store.tenants = [{ id: TENANT_ID, domain: null, stripe_api_key: 'sk_live_plain', stripe_webhook_secret: null }]

    const res = await provisionStripeWebhookSecret(TENANT_ID, 'https://homeservicecrm.ai')

    expect(res.url).toBe('https://homeservicecrm.ai/api/webhooks/stripe')
  })

  it('reports an error, does not throw, when the tenant does not exist', async () => {
    const res = await provisionStripeWebhookSecret('nonexistent-tenant')
    expect(res.ok).toBe(false)
    expect(res.status).toBe('error')
  })
})
