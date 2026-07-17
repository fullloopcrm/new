import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Item (61): item (59) fixed the auto-created checkout path
 * (POST /api/team-portal/checkout) telling the referrer they'd earned a
 * commission, and its own fix comment explicitly flagged this admin-created
 * path (POST /api/referral-commissions) as having the identical gap —
 * `notify()` there is `recipientType: 'admin'`, so `if (ref.email)` gates
 * the call but the referrer's own address is never actually used as the
 * recipient. Every admin-created commission (the path used when a booking's
 * referral wasn't auto-caught at checkout) told the tenant admin and left
 * the referrer themselves silent. Proves a non-nycmaid tenant with
 * resend_api_key configured now emails the referrer directly, and that a
 * tenant with no resend_api_key configured is a silent no-op, not a crash.
 */

let currentTenantId: string
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => ({ tenantId: currentTenantId }) }))
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
vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue({ success: true }) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postCommissionAccrual: vi.fn().mockResolvedValue({ posted: true }),
  postCommissionPayment: vi.fn().mockResolvedValue({ posted: true }),
}))

const { sendEmailMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(async (..._args: unknown[]) => ({ success: true })),
}))
vi.mock('@/lib/email', () => ({ sendEmail: sendEmailMock }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-ref-admin'
const BOOKING_ID = 'bk-ref-admin'
const REFERRER_ID = 'referrer-admin-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(body: Record<string, unknown>): Request {
  return new Request('http://x/api/referral-commissions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  currentTenantId = TENANT_ID
  fake._store.clear()
  sendEmailMock.mockClear()
  fake._seed('bookings', [
    {
      id: BOOKING_ID,
      tenant_id: TENANT_ID,
      price: 20000,
      referrer_id: REFERRER_ID,
      clients: { name: 'A Client', email: 'client@example.com' },
    },
  ])
  fake._seed('referrers', [
    { id: REFERRER_ID, tenant_id: TENANT_ID, commission_rate: 0.1, total_earned: 0, email: 'ref@example.com', name: 'Ref Partner' },
  ])
})

describe('POST /api/referral-commissions — referrer commission email (non-nycmaid tenant)', () => {
  it('emails the referrer directly when the tenant has resend configured', async () => {
    fake._seed('tenants', [{ id: TENANT_ID, name: 'Acme Plumbing', resend_api_key: 're_test_key', email_from: 'jobs@acme.example' }])

    const res = await POST(req({ booking_id: BOOKING_ID }))
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

    const res = await POST(req({ booking_id: BOOKING_ID }))
    expect(res.status).toBe(200)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
