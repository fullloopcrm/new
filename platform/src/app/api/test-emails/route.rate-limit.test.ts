import { describe, it, expect, vi } from 'vitest'

/**
 * POST /api/test-emails fans out to 10 real sendEmail() calls against the
 * tenant's resend_api_key with no rate limit — a compromised/looping
 * settings.edit session could run up unbounded Resend spend. Same fix
 * convention as admin-chat / admin/selena/score: rateLimitDb before the
 * paid-send fan-out.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              id: TENANT,
              name: 'Test Co',
              email: 'owner@example.com',
              phone: null,
              primary_color: null,
              logo_url: null,
              resend_api_key: null,
              email_from: null,
            },
            error: null,
          }),
        }),
      }),
    }),
  },
}))

let sendEmailCallCount = 0
vi.mock('@/lib/email', () => ({
  sendEmail: async () => {
    sendEmailCallCount++
    return { success: true }
  },
}))

vi.mock('@/lib/email-templates', () => ({
  bookingConfirmationEmail: () => '<p>x</p>',
  bookingReceivedEmail: () => '<p>x</p>',
  bookingReminderEmail: () => '<p>x</p>',
  dailySummaryEmail: () => '<p>x</p>',
  dailyOpsRecapEmail: () => '<p>x</p>',
  followUpEmail: () => '<p>x</p>',
  notificationDigestEmail: () => '<p>x</p>',
  paymentReceiptEmail: () => '<p>x</p>',
  reviewRequestEmail: () => '<p>x</p>',
  adminNewClientEmail: () => ({ subject: 'New client', html: '<p>x</p>' }),
}))

let rateLimitAllowed = true
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: rateLimitAllowed, remaining: rateLimitAllowed ? 4 : 0 }),
}))

import { POST } from './route'

describe('POST /api/test-emails — rate limit', () => {
  it('429s when the rate limiter denies, without sending any email', async () => {
    rateLimitAllowed = false
    sendEmailCallCount = 0
    const res = await POST()
    expect(res.status).toBe(429)
    expect(sendEmailCallCount).toBe(0)
  })

  it('sends all 10 templates when under the limit', async () => {
    rateLimitAllowed = true
    sendEmailCallCount = 0
    const res = await POST()
    expect(res.status).toBe(200)
    expect(sendEmailCallCount).toBe(10)
  })
})
