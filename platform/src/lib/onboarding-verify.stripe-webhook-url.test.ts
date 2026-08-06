/**
 * verifyStripeWebhook() used to check a single hardcoded platform URL
 * (`${appUrl}/api/webhooks/stripe`), which false-negatived EVERY tenant with
 * a Stripe key — including nycmaid, which is processing real payments right
 * now. Its webhook is registered at www.thenycmaid.com, never at the
 * platform's own domain (2026-08-06). Now accepts any of the tenant's
 * legitimate candidate URLs (platform domain + their own apex/www).
 */
import { describe, it, expect, vi } from 'vitest'

const stripeCtl = vi.hoisted(() => ({ endpoints: [] as Array<{ url: string; status: string }> }))

vi.mock('stripe', () => ({
  default: class {
    webhookEndpoints = {
      list: vi.fn(async () => ({ data: stripeCtl.endpoints })),
    }
  },
}))

import { verifyStripeWebhook, candidateStripeWebhookUrls } from './onboarding-verify'

describe('candidateStripeWebhookUrls', () => {
  it('includes the platform URL plus the tenant\'s own apex and www domain', () => {
    const urls = candidateStripeWebhookUrls('https://homeservicesbusinesscrm.com', 'thefloridamaid.com')
    expect(urls).toEqual([
      'https://homeservicesbusinesscrm.com/api/webhooks/stripe',
      'https://thefloridamaid.com/api/webhooks/stripe',
      'https://www.thefloridamaid.com/api/webhooks/stripe',
    ])
  })

  it('normalizes a domain already carrying www or a scheme', () => {
    const urls = candidateStripeWebhookUrls('https://homeservicesbusinesscrm.com', 'https://www.thenycmaid.com/')
    expect(urls).toContain('https://thenycmaid.com/api/webhooks/stripe')
    expect(urls).toContain('https://www.thenycmaid.com/api/webhooks/stripe')
  })

  it('is just the platform URL when the tenant has no domain set', () => {
    const urls = candidateStripeWebhookUrls('https://homeservicesbusinesscrm.com', null)
    expect(urls).toEqual(['https://homeservicesbusinesscrm.com/api/webhooks/stripe'])
  })
})

describe('verifyStripeWebhook', () => {
  it('passes when the enabled endpoint is on the tenant\'s own branded domain, not the platform domain (nycmaid\'s real shape)', async () => {
    stripeCtl.endpoints = [{ url: 'https://www.thenycmaid.com/api/webhooks/stripe', status: 'enabled' }]
    const res = await verifyStripeWebhook('sk_test_x', candidateStripeWebhookUrls('https://homeservicesbusinesscrm.com', 'thenycmaid.com'))
    expect(res.ok).toBe(true)
    expect(res.detail).toContain('www.thenycmaid.com')
  })

  it('passes when the enabled endpoint is on the apex domain without www (FloridaMade\'s real shape)', async () => {
    stripeCtl.endpoints = [{ url: 'https://thefloridamaid.com/api/webhooks/stripe', status: 'enabled' }]
    const res = await verifyStripeWebhook('sk_test_x', candidateStripeWebhookUrls('https://homeservicesbusinesscrm.com', 'thefloridamaid.com'))
    expect(res.ok).toBe(true)
  })

  it('fails when no endpoint matches any candidate URL', async () => {
    stripeCtl.endpoints = [{ url: 'https://someone-elses-domain.com/api/webhooks/stripe', status: 'enabled' }]
    const res = await verifyStripeWebhook('sk_test_x', candidateStripeWebhookUrls('https://homeservicesbusinesscrm.com', 'thefloridamaid.com'))
    expect(res.ok).toBe(false)
  })

  it('fails when the matching-URL endpoint is disabled', async () => {
    stripeCtl.endpoints = [{ url: 'https://thefloridamaid.com/api/webhooks/stripe', status: 'disabled' }]
    const res = await verifyStripeWebhook('sk_test_x', candidateStripeWebhookUrls('https://homeservicesbusinesscrm.com', 'thefloridamaid.com'))
    expect(res.ok).toBe(false)
  })

  it('fails fast with no Stripe key', async () => {
    const res = await verifyStripeWebhook('', ['https://x.com/api/webhooks/stripe'])
    expect(res.ok).toBe(false)
    expect(res.detail).toBe('No Stripe secret key')
  })
})
