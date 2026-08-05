import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Global Payouts money-movement helpers. The one rule that matters most here:
 * ensureFinancialAccountFunded must never claim to have topped up more than
 * the platform's ACTUAL available balance — pulling pending/unsettled funds
 * isn't something Stripe allows, and this function is the single place that
 * decides how much to pull.
 */

const insertMock = vi.fn()
const updateMock = vi.fn()
vi.mock('../supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        insertMock(row)
        return { select: () => ({ single: async () => ({ data: { id: 'payout_1' }, error: null }) }) }
      },
      update: (row: Record<string, unknown>) => { updateMock(row); return { eq: () => ({ eq: async () => ({ data: null, error: null }) }) } },
    }),
  },
}))

const { sendSMSMock, sendTenantTelegramMock } = vi.hoisted(() => ({
  sendSMSMock: vi.fn(async (..._args: unknown[]) => ({ ok: true })),
  sendTenantTelegramMock: vi.fn(async (..._args: unknown[]) => {}),
}))
vi.mock('../sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('../notify', () => ({ sendTenantTelegram: sendTenantTelegramMock }))

// executeGroups routes cleanerAlreadyPaid through the real cleaner-payout.ts,
// which needs a `single`/`maybeSingle` shape from supabaseAdmin — always say
// "not paid yet" so these tests reach the payout path.
vi.mock('./cleaner-payout', async () => {
  const actual = await vi.importActual<typeof import('./cleaner-payout')>('./cleaner-payout')
  return { ...actual, cleanerAlreadyPaid: vi.fn(async () => false), releaseCleanerPayout: vi.fn(async () => {}) }
})

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const payoutsCreate = vi.fn(async () => ({ id: 'po_topup_1' }))
const balanceRetrieve = vi.fn(async () => ({ available: [{ currency: 'usd', amount: 5000 }] }))
const mockStripe = { payouts: { create: payoutsCreate }, balance: { retrieve: balanceRetrieve } } as unknown as import('stripe').default

beforeEach(() => {
  fetchMock.mockReset()
  payoutsCreate.mockClear()
  balanceRetrieve.mockClear()
  insertMock.mockClear()
  updateMock.mockClear()
  sendSMSMock.mockClear()
  sendTenantTelegramMock.mockClear()
})

describe('claimGlobalPayout', () => {
  it('inserts a pending row tagged rail=global_payouts', async () => {
    const { claimGlobalPayout } = await import('./global-payouts')
    const result = await claimGlobalPayout({ tenantId: 't1', bookingId: 'b1', teamMemberId: 'tm1', amountCents: 1000, tipCents: 200 })
    expect(result.claimed).toBe(true)
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ rail: 'global_payouts', tenant_id: 't1', booking_id: 'b1', amount_cents: 1000, tip_cents: 200, status: 'pending' }))
  })
})

describe('ensureFinancialAccountFunded', () => {
  it('no-ops when the financial account already has enough available', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'fa_1', type: 'storage', balance: { available: { usd: { value: 10000 } } } }] }),
    })
    const { ensureFinancialAccountFunded } = await import('./global-payouts')
    const result = await ensureFinancialAccountFunded(mockStripe, 'sk_test_x', 'fa_1', 5000, 'idem-1')
    expect(result.toppedUpCents).toBe(0)
    expect(payoutsCreate).not.toHaveBeenCalled()
  })

  it('tops up only as much as the platform balance actually has available — never more', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'fa_1', type: 'storage', balance: { available: { usd: { value: 0 } } } }] }),
    })
    // platform balance mock returns 5000 available (see mockStripe above); need 20000
    const { ensureFinancialAccountFunded } = await import('./global-payouts')
    const result = await ensureFinancialAccountFunded(mockStripe, 'sk_test_x', 'fa_1', 20000, 'idem-2')
    expect(result.toppedUpCents).toBe(5000)
    expect(payoutsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5000, payout_method: 'fa_1' }),
      expect.objectContaining({ idempotencyKey: 'idem-2' }),
    )
  })

  it('returns 0 and never calls payouts.create when platform available balance is 0 — the exact bug from this session', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'fa_1', type: 'storage', balance: { available: { usd: { value: 0 } } } }] }),
    })
    balanceRetrieve.mockResolvedValueOnce({ available: [{ currency: 'usd', amount: 0 }] })
    const { ensureFinancialAccountFunded } = await import('./global-payouts')
    const result = await ensureFinancialAccountFunded(mockStripe, 'sk_test_x', 'fa_1', 100, 'idem-3')
    expect(result.toppedUpCents).toBe(0)
    expect(result.stripeTopUpId).toBeNull()
    expect(payoutsCreate).not.toHaveBeenCalled()
  })
})

describe('createOutboundPayment', () => {
  it('posts the v2 outbound_payments shape and returns id + status', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'op_1', status: 'processing' }),
    })
    const { createOutboundPayment } = await import('./global-payouts')
    const result = await createOutboundPayment('sk_test_x', {
      financialAccountId: 'fa_1',
      recipientId: 'acct_recipient_1',
      amountCents: 1200,
      description: 'test payout',
      idempotencyKey: 'gp-payout:b1',
    })
    expect(result).toEqual({ id: 'op_1', status: 'processing' })
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.to.recipient).toBe('acct_recipient_1')
    expect(body.amount).toEqual({ value: 1200, currency: 'usd' })
    expect(init.headers['Idempotency-Key']).toBe('gp-payout:b1')
  })

  it('throws with the Stripe error body when the API call fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { code: 'insufficient_funds', message: 'no funds' } }),
    })
    const { createOutboundPayment } = await import('./global-payouts')
    await expect(createOutboundPayment('sk_test_x', {
      financialAccountId: 'fa_1',
      recipientId: 'acct_recipient_1',
      amountCents: 1200,
      description: 'test payout',
      idempotencyKey: 'gp-payout:b1',
    })).rejects.toThrow(/insufficient_funds/)
  })
})

describe('createRecipientOnboardingLink', () => {
  it('uses the account_onboarding link type for a brand-new recipient', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://accounts.stripe.com/r/new', expires_at: '2026-08-05T00:00:00Z' }) })
    const { createRecipientOnboardingLink } = await import('./global-payouts')
    const result = await createRecipientOnboardingLink('sk_test_x', { accountId: 'acct_new', returnUrl: 'https://x/return', refreshUrl: 'https://x/refresh' })

    expect(result.url).toBe('https://accounts.stripe.com/r/new')
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body).use_case.type).toBe('account_onboarding')
  })

  it('falls back to account_update when Stripe rejects onboarding for an already-onboarded recipient — the exact case hit live 08-04', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: { message: 'You cannot create an "ONBOARDING" account link for acct_x as this account has already been onboarded.' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://accounts.stripe.com/r/update', expires_at: '2026-08-05T00:00:00Z' }) })
    const { createRecipientOnboardingLink } = await import('./global-payouts')
    const result = await createRecipientOnboardingLink('sk_test_x', { accountId: 'acct_x', returnUrl: 'https://x/return', refreshUrl: 'https://x/refresh' })

    expect(result.url).toBe('https://accounts.stripe.com/r/update')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(secondCallBody.use_case.type).toBe('account_update')
  })

  it('re-throws any OTHER error without silently falling back', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: { message: 'some unrelated failure' } }) })
    const { createRecipientOnboardingLink } = await import('./global-payouts')
    await expect(createRecipientOnboardingLink('sk_test_x', { accountId: 'acct_x', returnUrl: 'https://x/return', refreshUrl: 'https://x/refresh' }))
      .rejects.toThrow(/unrelated failure/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('executeGroups', () => {
  const group = {
    teamMemberId: 'tm1', name: 'Cleaner One', recipientId: 'acct_recipient_1', phone: '+15551234',
    smsConsent: true, preferredLanguage: 'en' as const,
    items: [{ bookingId: 'b1', role: 'lead' as const, teamMemberId: 'tm1', amountCents: 5000, tipCents: 500, clientName: 'Alice' }],
    totalCents: 5500,
  }
  const notifyConfig = { telnyxApiKey: 'telnyx_x', telnyxPhone: '+1999', smsFromNumber: null, telegramBotToken: 'tg_x', telegramChatId: 'chat_1' }

  it('notifies BOTH the cleaner (SMS) and the admin (Telegram) after a successful payout — separate channels, separate audiences', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'op_1', status: 'processing' }) })
    const { executeGroups } = await import('./global-payouts')

    const result = await executeGroups('tenant_1', mockStripe, 'sk_test_x', 'fa_1', [group], notifyConfig)

    expect(result.paid).toHaveLength(1)
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    expect(sendSMSMock.mock.calls[0][0]).toMatchObject({ to: '+15551234' })
    expect(sendTenantTelegramMock).toHaveBeenCalledTimes(1)
    const [tenantIdArg, tenantCfgArg, textArg] = sendTenantTelegramMock.mock.calls[0]
    expect(tenantIdArg).toBe('tenant_1')
    expect(tenantCfgArg).toEqual({ telegram_bot_token: 'tg_x', telegram_chat_id: 'chat_1' })
    expect(textArg).toContain('Cleaner One')
    expect(textArg).toContain('$55.00')
  })

  it('sends neither notification when the actual transfer fails — proves nobody gets told "paid" before money moved', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: { code: 'insufficient_funds', message: 'no funds' } }) })
    const { executeGroups } = await import('./global-payouts')

    const result = await executeGroups('tenant_1', mockStripe, 'sk_test_x', 'fa_1', [group], notifyConfig)

    expect(result.paid).toHaveLength(0)
    expect(result.skipped).toHaveLength(1)
    expect(sendSMSMock).not.toHaveBeenCalled()
    expect(sendTenantTelegramMock).not.toHaveBeenCalled()
  })
})
