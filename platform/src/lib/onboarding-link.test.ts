import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const sendEmailMock = vi.fn().mockResolvedValue(undefined)
vi.mock('./email', () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
  tenantSender: (t: { name?: string | null }) => `${t?.name || 'Full Loop CRM'} <no-reply@fullloopcrm.com>`,
}))

const h = vi.hoisted(() => ({ tenant: null as Record<string, unknown> | null }))
vi.mock('./supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: h.tenant, error: null }),
        }),
      }),
      update: () => ({
        eq: async () => ({ data: null, error: null }),
      }),
    }),
  },
}))

const alertOwnerMock = vi.fn()
vi.mock('./telegram', () => ({
  alertOwner: (...args: unknown[]) => {
    alertOwnerMock(...args)
    return Promise.resolve(null)
  },
}))

import { createAndSendOnboardingLink, onboardingLinkUrl } from './onboarding-link'

describe('onboarding-link', () => {
  beforeEach(() => {
    process.env.ONBOARDING_TOKEN_SECRET = 'test-secret'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.test.example'
    sendEmailMock.mockClear()
    alertOwnerMock.mockClear()
  })
  afterEach(() => {
    delete process.env.ONBOARDING_TOKEN_SECRET
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  it('builds a link containing a verifiable token for the tenant', () => {
    const url = onboardingLinkUrl('tenant-A', 1)
    expect(url.startsWith('https://app.test.example/onboard/')).toBe(true)
  })

  it('emails owner_email when present, with the working link embedded, and alerts the owner on Telegram', async () => {
    h.tenant = { name: 'Acme', slug: 'acme', owner_email: 'owner@acme.example', email: 'hello@acme.example', onboarding_link_version: 1 }
    const { sent, url } = await createAndSendOnboardingLink('tenant-A')
    expect(sent).toBe(true)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const call = sendEmailMock.mock.calls[0][0]
    expect(call.to).toBe('owner@acme.example')
    expect(call.html).toContain(url)
    expect(alertOwnerMock).toHaveBeenCalledTimes(1)
    expect(alertOwnerMock.mock.calls[0][0]).toBe('Onboarding link sent')
    expect(alertOwnerMock.mock.calls[0][1]).toContain('Acme')
    expect(alertOwnerMock.mock.calls[0][1]).toContain('owner@acme.example')
  })

  it('does NOT alert the owner when there is no recipient to send to', async () => {
    h.tenant = { name: 'Acme', slug: 'acme', owner_email: null, email: null, onboarding_link_version: 1 }
    await createAndSendOnboardingLink('tenant-A')
    expect(alertOwnerMock).not.toHaveBeenCalled()
  })

  it('falls back to the business email when owner_email is not set', async () => {
    h.tenant = { name: 'Acme', slug: 'acme', owner_email: null, email: 'hello@acme.example', onboarding_link_version: 1 }
    const { sent } = await createAndSendOnboardingLink('tenant-A')
    expect(sent).toBe(true)
    expect(sendEmailMock.mock.calls[0][0].to).toBe('hello@acme.example')
  })

  it('never blocks on a missing recipient — returns sent:false instead of throwing', async () => {
    h.tenant = { name: 'Acme', slug: 'acme', owner_email: null, email: null, onboarding_link_version: 1 }
    const result = await createAndSendOnboardingLink('tenant-A')
    expect(result.sent).toBe(false)
    expect(result.url).toContain('/onboard/')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('never throws even if the send itself fails — link creation must not block tenant creation', async () => {
    h.tenant = { name: 'Acme', slug: 'acme', owner_email: 'owner@acme.example', onboarding_link_version: 1 }
    sendEmailMock.mockRejectedValueOnce(new Error('Resend down'))
    const result = await createAndSendOnboardingLink('tenant-A')
    expect(result.sent).toBe(false)
    expect(result.url).toContain('/onboard/')
  })

  it('encodes the tenant\'s CURRENT onboarding_link_version, not a hardcoded 1', async () => {
    h.tenant = { name: 'Acme', owner_email: 'owner@acme.example', onboarding_link_version: 3 }
    const { url } = await createAndSendOnboardingLink('tenant-A')
    const token = url.split('/onboard/')[1]
    const { verifyOnboardingToken } = await import('./onboarding-token')
    expect(verifyOnboardingToken(token)?.linkVersion).toBe(3)
  })
})
