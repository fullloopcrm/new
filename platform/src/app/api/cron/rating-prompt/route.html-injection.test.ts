/**
 * GET /api/cron/rating-prompt's bulk-cap alert (fired when more than CAP
 * bookings are eligible for a rating prompt in one run) sends tenant.name
 * raw into an ad-hoc HTML email via emailAdmins(). emailAdmins() reaches the
 * PLATFORM's own admin inbox (admin_users has no tenant_id filter — see
 * lib/nycmaid/admin-contacts.ts), so a malicious tenant name is a real
 * tenant-owner -> platform-admin HTML injection, not merely self-XSS.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

process.env.CRON_SECRET = 'test-secret'

const { TENANT_ID, PAYLOAD } = vi.hoisted(() => ({
  TENANT_ID: 'tenant-A',
  PAYLOAD: `<img src=x onerror=alert(1)>`,
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    tenants: [{ id: TENANT_ID, name: PAYLOAD, status: 'active' }],
  })
  return { supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/nycmaid/client-contacts', () => ({
  sendClientSMS: vi.fn(async () => ({ success: true })),
}))

vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({ ratingQ1: () => 'How was your service today?' }),
}))

const adminEmails: Array<{ subject: string; html: string }> = []
vi.mock('@/lib/nycmaid/admin-contacts', () => ({
  emailAdmins: vi.fn(async (subject: string, html: string) => { adminEmails.push({ subject, html }); return {} }),
  smsAdmins: vi.fn(async () => ({})),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })

function seedElevenEligibleBookings() {
  const checkedOutAt = new Date(Date.now() - 40 * 60 * 1000).toISOString()
  const rows = Array.from({ length: 11 }, (_, i) => ({
    id: `booking-${i}`,
    tenant_id: TENANT_ID,
    client_id: `client-${i}`,
    cleaner_id: `cleaner-${i}`,
    start_time: '2026-08-01T09:00:00Z',
    status: 'completed',
    check_out_time: checkedOutAt,
    rating_prompt_sent_at: null,
  }))
  fake._seed('bookings', rows)
}

describe('GET /api/cron/rating-prompt — HTML injection via tenant.name in the bulk-cap admin alert', () => {
  beforeEach(() => {
    adminEmails.length = 0
  })

  it('escapes tenant.name before emailing the platform admin', async () => {
    seedElevenEligibleBookings()
    const res = await GET(req())
    expect(res.status).toBe(200)

    expect(adminEmails).toHaveLength(1)
    expect(adminEmails[0].html).not.toContain(PAYLOAD)
    expect(adminEmails[0].html).not.toContain('<img')
    expect(adminEmails[0].html).toContain('&lt;img')
  })
})
