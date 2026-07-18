/**
 * STRIPE-PLATFORM WEBHOOK — welcome-email / owner-PIN delivery (fresh-ground
 * finding, W3 CI/reconcile lane broadened per LEADER 11:24, item 261).
 *
 * `createTenantFromLead` generates a plaintext owner PIN exactly once at tenant
 * creation and returns it as `result.ownerPin` — `pin_hash` is a one-way HMAC
 * (see hashAdminPin), so a PIN not captured at this moment is gone forever.
 * The manual/comp conversion path (`/api/admin/requests/convert`) returns
 * `ownerPin` straight to the admin UI so a human can relay it. This webhook —
 * the ONLY tenant-creation door with no admin in the loop — discarded
 * `result.ownerPin` entirely: a customer completing a paid Stripe checkout got
 * a tenant created and auto-activated in the background with zero way to ever
 * learn their login PIN, and zero welcome email even pointing them at their
 * new login page.
 *
 * Fixed by emailing the owner (`result.tenant.email`, sourced from the lead)
 * their login URL + one-time PIN via the existing `sendEmail` primitive
 * (falls back to the platform default Resend key), gated so replay
 * deliveries (`alreadyConverted`) and a PIN-issuance failure (`ownerPin`
 * null) never re-send or send an email with no PIN in it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

let constructEventImpl: (body: string) => unknown = () => { throw new Error('no event configured') }

vi.mock('stripe', () => {
  class FakeStripe {
    webhooks = { constructEvent: (body: string) => constructEventImpl(body) }
  }
  return { default: FakeStripe }
})

vi.mock('@/lib/create-tenant-from-lead', () => ({ createTenantFromLead: vi.fn() }))
vi.mock('@/lib/activate-tenant', () => ({ activateTenant: vi.fn() }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }))

process.env.STRIPE_SECRET_KEY = 'sk_test_x'
process.env.STRIPE_PLATFORM_WEBHOOK_SECRET = 'whsec_platform_test_x'

import { POST } from './route'
import { createTenantFromLead } from '@/lib/create-tenant-from-lead'
import { activateTenant } from '@/lib/activate-tenant'
import { sendEmail } from '@/lib/email'

const mockCreateTenantFromLead = vi.mocked(createTenantFromLead)
const mockActivateTenant = vi.mocked(activateTenant)
const mockSendEmail = vi.mocked(sendEmail)

function postCheckoutCompleted(session: Record<string, unknown>) {
  constructEventImpl = () => ({ type: 'checkout.session.completed', data: { object: session } })
  return POST(new Request('https://x.test/api/webhooks/stripe-platform', {
    method: 'POST',
    body: JSON.stringify({}), // constructEvent is stubbed — body content irrelevant
    headers: { 'stripe-signature': 'sig' },
  }))
}

const SESSION = {
  metadata: { kind: 'platform_proposal', lead_id: 'lead-1' },
  subscription: 'sub_test_1',
}

const FAKE_ACTIVATION = { ok: true } as unknown as Awaited<ReturnType<typeof activateTenant>>
const FAKE_EMAIL_RESULT = undefined as unknown as Awaited<ReturnType<typeof sendEmail>>

beforeEach(() => {
  mockCreateTenantFromLead.mockReset()
  mockActivateTenant.mockReset().mockResolvedValue(FAKE_ACTIVATION)
  mockSendEmail.mockReset().mockResolvedValue(FAKE_EMAIL_RESULT)
})

describe('POST /api/webhooks/stripe-platform — welcome-email PIN delivery', () => {
  it('emails the owner PIN + login link on a fresh tenant creation', async () => {
    mockCreateTenantFromLead.mockResolvedValue({
      ok: true,
      tenant: { id: 't-1', slug: 'acme-co', name: 'Acme Co', status: 'new', email: 'owner@acme.test' },
      alreadyConverted: false,
      ownerPin: '482913',
    })

    const res = await postCheckoutCompleted(SESSION)
    expect(res.status).toBe(200)

    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    const call = mockSendEmail.mock.calls[0][0]
    expect(call.to).toBe('owner@acme.test')
    expect(call.html).toContain('482913')
    expect(call.html).toContain('https://acme-co.fullloopcrm.com')
  })

  it('does not re-send on an already-converted (idempotent replay) delivery', async () => {
    mockCreateTenantFromLead.mockResolvedValue({
      ok: true,
      tenant: { id: 't-1', slug: 'acme-co', name: 'Acme Co', status: 'active', email: 'owner@acme.test' },
      alreadyConverted: true,
    })

    const res = await postCheckoutCompleted(SESSION)
    expect(res.status).toBe(200)
    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(mockActivateTenant).not.toHaveBeenCalled()
  })

  it('does not send an emailless PIN when owner PIN issuance failed', async () => {
    mockCreateTenantFromLead.mockResolvedValue({
      ok: true,
      tenant: { id: 't-1', slug: 'acme-co', name: 'Acme Co', status: 'new', email: 'owner@acme.test' },
      alreadyConverted: false,
      ownerPin: null,
    })

    const res = await postCheckoutCompleted(SESSION)
    expect(res.status).toBe(200)
    expect(mockSendEmail).not.toHaveBeenCalled()
    // Activation must still proceed — a missing PIN must not block going live.
    expect(mockActivateTenant).toHaveBeenCalledWith('t-1')
  })

  it('does not crash the webhook when the tenant has no email on file', async () => {
    mockCreateTenantFromLead.mockResolvedValue({
      ok: true,
      tenant: { id: 't-1', slug: 'acme-co', name: 'Acme Co', status: 'new', email: null },
      alreadyConverted: false,
      ownerPin: '482913',
    })

    const res = await postCheckoutCompleted(SESSION)
    expect(res.status).toBe(200)
    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(mockActivateTenant).toHaveBeenCalledWith('t-1')
  })

  it('a failed send does not fail the webhook (best-effort)', async () => {
    mockSendEmail.mockRejectedValue(new Error('resend down'))
    mockCreateTenantFromLead.mockResolvedValue({
      ok: true,
      tenant: { id: 't-1', slug: 'acme-co', name: 'Acme Co', status: 'new', email: 'owner@acme.test' },
      alreadyConverted: false,
      ownerPin: '482913',
    })

    const res = await postCheckoutCompleted(SESSION)
    expect(res.status).toBe(200)
    expect(mockActivateTenant).toHaveBeenCalledWith('t-1')
  })
})
