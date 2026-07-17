import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Item (59): a completed booking with a referrer auto-created its
 * referral_commissions row at checkout (this route) and told the ADMIN via
 * an internal notification — but never told the referrer themselves. Only
 * the hardcoded isNycMaid(tenantId) branch ever emailed the referrer
 * ("NYC Maid parity"); every other tenant running the referral program got
 * silence on the one channel meant to keep referral partners engaged. The
 * admin-created path (POST /api/referral-commissions) has the identical
 * gap — it only notifies admin via notify(), never the referrer. Proves a
 * non-nycmaid tenant with resend_api_key configured now emails the referrer
 * directly, and that a tenant with no resend_api_key configured is a
 * silent no-op (not an error) rather than a crash.
 */

vi.mock('../auth/token', () => ({
  verifyToken: (_token: string) => ({ id: 'tm-ref', tid: 'tenant-ref' }),
}))
vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  const rpc = async (fn: string, params: Record<string, unknown>) => {
    if (fn !== 'bump_referrer_total_earned') throw new Error(`unexpected rpc: ${fn}`)
    const ref = fake._all('referrers').find(
      (r) => r.id === params.p_referrer_id && r.tenant_id === params.p_tenant_id,
    )
    if (ref) ref.total_earned = (Number(ref.total_earned) || 0) + Number(params.p_amount_cents)
    return { data: null, error: null }
  }
  return { supabaseAdmin: { ...fake, rpc } }
})

const { sendEmailMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(async (..._args: unknown[]) => ({ success: true })),
}))
vi.mock('@/lib/email', () => ({ sendEmail: sendEmailMock }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-ref'
const MEMBER_ID = 'tm-ref'
const CLIENT_ID = 'client-ref'
const REFERRER_ID = 'referrer-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(body: Record<string, unknown>): Request {
  return new Request('http://x/api/team-portal/checkout', {
    method: 'POST',
    headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function seedBooking(id: string) {
  fake._seed('bookings', [
    {
      id,
      tenant_id: TENANT_ID,
      team_member_id: MEMBER_ID,
      check_in_time: new Date(Date.now() - 30 * 60_000).toISOString(),
      check_out_time: null,
      hourly_rate: 100,
      pay_rate: 25,
      team_size: 1,
      max_hours: null,
      price: 10000,
      service_type_id: null,
      referrer_id: REFERRER_ID,
      client_id: CLIENT_ID,
      payment_status: 'paid',
      clients: { name: 'A Client', address: '123 Main St' },
      team_members: { pay_rate: 25 },
    },
  ])
}

beforeEach(() => {
  fake._store.clear()
  sendEmailMock.mockClear()
  fake._seed('referrers', [
    { id: REFERRER_ID, tenant_id: TENANT_ID, commission_rate: 0.1, total_earned: 0, email: 'ref@example.com', name: 'Ref Partner' },
  ])
})

describe('POST /api/team-portal/checkout — referrer commission email (non-nycmaid tenant)', () => {
  it('emails the referrer directly when the tenant has resend configured', async () => {
    fake._seed('tenants', [{ id: TENANT_ID, name: 'Acme Plumbing', resend_api_key: 're_test_key', email_from: 'jobs@acme.example' }])
    seedBooking('bk-ref-1')

    const res = await POST(req({ booking_id: 'bk-ref-1' }))
    expect(res.status).toBe(200)

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const arg = sendEmailMock.mock.calls[0]?.[0] as { to: string; subject: string; html: string; resendApiKey: string }
    expect(arg.to).toBe('ref@example.com')
    expect(arg.subject).toBe('You earned a referral commission')
    expect(arg.html).toContain('Ref Partner')
    expect(arg.html).toContain('Acme Plumbing')
    expect(arg.resendApiKey).toBe('re_test_key')
  })

  it('does not email (and does not throw) when the tenant has no resend_api_key configured', async () => {
    fake._seed('tenants', [{ id: TENANT_ID, name: 'Acme Plumbing', resend_api_key: null, email_from: null }])
    seedBooking('bk-ref-2')

    const res = await POST(req({ booking_id: 'bk-ref-2' }))
    expect(res.status).toBe(200)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
