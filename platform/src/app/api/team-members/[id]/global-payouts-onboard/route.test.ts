import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Global Payouts onboarding endpoint — proves the three things that matter:
 * a team member with no recipient yet gets a NEW account created and saved,
 * one with an existing recipient reuses it (no duplicate Stripe account),
 * and the link is texted to them automatically (the actual ask, 08-04).
 */

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'tenant_1' }, error: null }),
}))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))

const { sendSMSMock, createRecipientAccountMock, createRecipientOnboardingLinkMock, updateMock } = vi.hoisted(() => ({
  sendSMSMock: vi.fn(async (..._args: unknown[]) => ({ ok: true })),
  createRecipientAccountMock: vi.fn(async (..._args: unknown[]) => ({ id: 'acct_new_recipient' })),
  createRecipientOnboardingLinkMock: vi.fn(async (..._args: unknown[]) => ({ url: 'https://accounts.stripe.com/r/x', expiresAt: '2026-08-05T00:00:00Z' })),
  updateMock: vi.fn(),
}))

vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('@/lib/finance/global-payouts', () => ({
  createRecipientAccount: createRecipientAccountMock,
  createRecipientOnboardingLink: createRecipientOnboardingLinkMock,
}))

let teamMemberRow: Record<string, unknown> = {
  id: 'tm_1', name: 'New Cleaner', email: 'new@example.com', phone: '+15550009999',
  sms_consent: true, preferred_language: 'en', global_payouts_recipient_id: null,
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'team_members') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: teamMemberRow, error: null }) }) }) }),
          update: (row: Record<string, unknown>) => { updateMock(row); return { eq: () => ({ eq: async () => ({ data: null, error: null }) }) } },
        }
      }
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { stripe_api_key: 'sk_x', telnyx_api_key: 'telnyx_x', telnyx_phone: '+15559990000', sms_from_number: null }, error: null }) }) }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))

import { POST } from './route'

function makeParams() {
  return { params: Promise.resolve({ id: 'tm_1' }) }
}

beforeEach(() => {
  sendSMSMock.mockClear()
  createRecipientAccountMock.mockClear()
  createRecipientOnboardingLinkMock.mockClear()
  updateMock.mockClear()
})

describe('POST /api/team-members/[id]/global-payouts-onboard', () => {
  it('creates a new recipient account, saves it, and texts the link when none exists yet', async () => {
    teamMemberRow = { id: 'tm_1', name: 'New Cleaner', email: 'new@example.com', phone: '+15550009999', sms_consent: true, preferred_language: 'en', global_payouts_recipient_id: null }

    const res = await POST({} as never, makeParams())
    const body = await res.json()

    expect(createRecipientAccountMock).toHaveBeenCalledTimes(1)
    expect(updateMock).toHaveBeenCalledWith({ global_payouts_recipient_id: 'acct_new_recipient' })
    expect(body.recipientId).toBe('acct_new_recipient')
    expect(body.url).toBe('https://accounts.stripe.com/r/x')
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    expect(sendSMSMock.mock.calls[0][0]).toMatchObject({ to: '+15550009999' })
    expect(body.smsSent).toBe(true)
  })

  it('reuses an existing recipient instead of creating a duplicate Stripe account', async () => {
    teamMemberRow = { id: 'tm_1', name: 'Existing Cleaner', email: 'e@example.com', phone: '+15550009999', sms_consent: true, preferred_language: 'en', global_payouts_recipient_id: 'acct_already_exists' }

    const res = await POST({} as never, makeParams())
    const body = await res.json()

    expect(createRecipientAccountMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
    expect(body.recipientId).toBe('acct_already_exists')
  })

  it('does not text a cleaner who opted out of SMS', async () => {
    teamMemberRow = { id: 'tm_1', name: 'Opted Out', email: null, phone: '+15550009999', sms_consent: false, preferred_language: 'en', global_payouts_recipient_id: 'acct_x' }

    const res = await POST({} as never, makeParams())
    const body = await res.json()

    expect(sendSMSMock).not.toHaveBeenCalled()
    expect(body.smsSent).toBe(false)
  })
})
