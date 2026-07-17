import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * POST /api/reviews/request — the admin-triggered "ask this client for a
 * review" tool — sent its SMS with no sms_consent check, unlike the cron
 * review-request paths (post-job-followup) and every other real client-SMS
 * call site in the codebase (campaigns send, cron/outreach, cron/retention,
 * send-apology-batch, payment-processor). A client who texted STOP could
 * still get manually re-texted by an admin clicking "Request Review". Proves
 * the fix: the SMS is skipped when sms_consent === false, but the email side
 * (a separate consent question, untouched here) still fires.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const TENANT_ID = 'tenant-1'
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({
    tenant: {
      tenantId: TENANT_ID,
      tenant: { id: TENANT_ID, name: 'Acme', telnyx_api_key: 'test-key', telnyx_phone: '+15559990000', resend_api_key: null, google_place_id: null },
    },
    error: null,
  }),
}))

const sentSmsTo: string[] = []
vi.mock('@/lib/sms', () => ({
  sendSMS: async ({ to }: { to: string }) => {
    sentSmsTo.push(to)
    return { id: 'sms-1' }
  },
}))

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async () => ({ id: 'email-1' })),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function req(client_id: string) {
  return new Request('http://x/api/reviews/request', { method: 'POST', body: JSON.stringify({ client_id }) })
}

beforeEach(() => {
  fake._store.clear()
  sentSmsTo.length = 0
  vi.mocked(sendEmail).mockClear()
  fake._seed('clients', [
    { id: 'client-optout', tenant_id: TENANT_ID, name: 'Opted Out', phone: '+15550000001', email: 'optout@x.com', sms_consent: false },
    { id: 'client-optin', tenant_id: TENANT_ID, name: 'Opted In', phone: '+15550000002', email: 'optin@x.com', sms_consent: true },
  ])
})

describe('POST /api/reviews/request — sms_consent gates the SMS, not the email', () => {
  it('skips the SMS for a client with sms_consent === false, but still emails them', async () => {
    const res = await POST(req('client-optout'))
    expect(res.status).toBe(200)
    expect(sentSmsTo).not.toContain('+15550000001')
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it('sends the SMS for a client who has not opted out', async () => {
    const res = await POST(req('client-optin'))
    expect(res.status).toBe(200)
    expect(sentSmsTo).toContain('+15550000002')
  })
})
