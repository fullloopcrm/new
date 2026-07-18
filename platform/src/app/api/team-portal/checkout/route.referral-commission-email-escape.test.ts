import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'

/**
 * /api/team-portal/checkout's NYC Maid referral-commission-earned email
 * builds its own inline HTML (bypassing the escaped `referralCommissionEmail`
 * template in nycmaid/email-templates.ts, which doesn't even reference the
 * client's name) and interpolated `clientName` -- booking.clients.name,
 * self-submitted verbatim on the public booking form (client/book/route.ts,
 * `name: body.name as string`) -- raw into that HTML. The referrer is a
 * DIFFERENT party from the client, so this is the same cross-party
 * unescaped-HTML-injection shape already fixed this session for nycmaid's
 * clientConfirmationEmail (`cleanerFirst`). Only the cross-party `clientName`
 * is escaped here -- the referrer's own name interpolated into their own
 * email stays unescaped, matching this codebase's established self-only
 * convention (self-XSS against your own inbox is not a privilege-boundary
 * crossing).
 */

const h = vi.hoisted(() => ({
  booking: null as Record<string, unknown> | null,
  referrer: null as Record<string, unknown> | null,
  sendEmailSpy: vi.fn(async (_to: string, _subject: string, _html: string) => ({ success: true })),
}))

vi.mock('../auth/token', () => ({
  verifyToken: () => ({ id: 'tm-1', tid: NYCMAID_TENANT_ID, role: 'worker' }),
}))

vi.mock('@/lib/payment-processor', () => ({ processPayment: vi.fn(() => Promise.resolve(null)) }))
vi.mock('@/lib/push', () => ({ sendPushToClient: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/referrer-ledger', () => ({ bumpReferrerTotal: vi.fn(() => Promise.resolve(true)) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: h.sendEmailSpy }))

vi.mock('@/lib/supabase', () => {
  const admin = {
    from: (table: string) => {
      if (table === 'bookings') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: h.booking, error: null }),
              }),
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  select: () => ({
                    maybeSingle: async () => ({ data: { ...h.booking, ...payload }, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'referrers') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: h.referrer, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'referral_commissions') {
        return { insert: () => Promise.resolve({ data: null, error: null }) }
      }
      if (table === 'notifications') {
        return { insert: () => Promise.resolve({ data: null, error: null }) }
      }
      throw new Error(`unexpected table in this test: ${table}`)
    },
  }
  return { supabaseAdmin: admin, supabase: admin }
})

import { POST } from './route'

const postReq = (body: unknown) =>
  new Request('http://x', {
    method: 'POST',
    headers: { authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  h.booking = {
    id: 'bk-1',
    check_in_time: null,
    check_out_time: null,
    hourly_rate: 69,
    pay_rate: 25,
    team_size: 1,
    max_hours: null,
    price: 10000,
    service_type_id: null,
    team_member_id: 'tm-1',
    referrer_id: 'ref-1',
    client_id: 'client-1',
    clients: { name: '<script>alert(1)</script>', address: '123 Main St' },
    team_members: { pay_rate: 25 },
  }
  h.referrer = {
    id: 'ref-1',
    commission_rate: 0.1,
    total_earned: 0,
    email: 'referrer@example.com',
    name: 'Referrer Name',
  }
  h.sendEmailSpy.mockClear()
})

describe('POST /api/team-portal/checkout — referral-commission email escapes clientName', () => {
  it('escapes the client name (cross-party field) before it reaches the referrer email HTML', async () => {
    const res = await POST(postReq({ booking_id: 'bk-1' }))
    expect(res.status).toBe(200)

    expect(h.sendEmailSpy).toHaveBeenCalledTimes(1)
    const html = h.sendEmailSpy.mock.calls[0][2] as string
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('leaves the referrer’s own name (self-only field) unescaped, matching this codebase’s convention', async () => {
    h.referrer!.name = "O'Brien"
    const res = await POST(postReq({ booking_id: 'bk-1' }))
    expect(res.status).toBe(200)

    const html = h.sendEmailSpy.mock.calls[0][2] as string
    expect(html).toContain("Hi O'Brien,")
  })
})
