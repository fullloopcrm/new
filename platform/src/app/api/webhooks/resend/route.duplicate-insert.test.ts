import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Resend retries a webhook delivery that doesn't ack 2xx in time. The
 * email.received inbound-email branch had no dedup at all — a redelivery of
 * the same event inserted a SECOND inbound_emails row for the same message,
 * duplicating the entry in the admin inbox. Fixed by skipping the insert if
 * a row with the same resend_email_id already exists.
 */

const h = vi.hoisted(() => {
  const captured = { insertCount: 0 }
  const existingIds = new Set<string>()

  const supabaseAdmin = {
    from: (table: string) => ({
      insert: (payload: Record<string, unknown>) => {
        if (table === 'inbound_emails') {
          captured.insertCount += 1
          if (payload.resend_email_id) existingIds.add(payload.resend_email_id as string)
        }
        return Promise.resolve({ data: null, error: null })
      },
      select: () => ({
        eq: (_col: string, val: string) => ({
          limit: () =>
            Promise.resolve({
              data: existingIds.has(val) ? [{ id: 'row-1' }] : [],
              error: null,
            }),
        }),
      }),
    }),
  }

  return {
    captured,
    existingIds,
    supabaseAdmin,
    resolveTenantIdForInboundEmail: vi.fn(async () => 'tenant-A'),
  }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/webhook-verify', () => ({
  verifySvix: () => ({ valid: true }),
  isWebhookVerifyDisabled: () => false,
}))
vi.mock('@/lib/inbound-email-tenant', () => ({
  resolveTenantIdForInboundEmail: h.resolveTenantIdForInboundEmail,
}))

import { POST } from './route'

function inboundEvent(emailId: string) {
  return new Request('https://app.fullloop.example/api/webhooks/resend', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'email.received',
      data: {
        email_id: emailId,
        from: 'customer@example.com',
        to: 'inbox@tenant-a.com',
        subject: 'Re: your booking',
        text: 'thanks!',
      },
    }),
  })
}

beforeEach(() => {
  h.captured.insertCount = 0
  h.existingIds.clear()
})

describe('POST /api/webhooks/resend — inbound email duplicate-insert guard', () => {
  it('inserts once for a normal single delivery', async () => {
    const res = await POST(inboundEvent('evt-abc'))
    const json = await res.json()
    expect(json).toEqual({ ok: true })
    expect(h.captured.insertCount).toBe(1)
  })

  it('does not insert a second row when Resend redelivers the same event', async () => {
    await POST(inboundEvent('evt-abc'))
    const res2 = await POST(inboundEvent('evt-abc'))
    const json2 = await res2.json()

    expect(json2).toEqual({ ok: true, duplicate: true })
    expect(h.captured.insertCount).toBe(1)
  })
})
