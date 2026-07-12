/**
 * WITNESS TEST — documents CURRENT (buggy) behavior, not desired behavior.
 *
 * Proves audit finding #3: `resend/route.ts` handles `email.received` by
 * inserting into `inbound_emails` with NO uniqueness guard on
 * `resend_email_id`. A redelivered event therefore inserts a DUPLICATE inbound
 * email. This test asserts the duplicate DOES happen today — it is EXPECTED to
 * start FAILING once the `claimWebhookEvent` dedupe helper is wired in (see
 * deploy-prep/webhook-dedupe-helper-design.md). That flip is the signal the
 * fix landed.
 *
 * No route edits. Drives the real POST handler twice with an identical event.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Record every insert the handler makes so we can prove the replay re-inserts.
const insertCalls: Array<{ table: string; payload: unknown }> = []

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from(table: string) {
      return {
        insert(payload: unknown) {
          insertCalls.push({ table, payload })
          return Promise.resolve({ data: null, error: null })
        },
      }
    },
  },
}))

// Import AFTER the mock is registered (vi.mock is hoisted, but keep it explicit).
import { POST } from './resend/route'

function receivedEvent(emailId: string): Request {
  return new Request('http://localhost/api/webhooks/resend', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'email.received',
      data: {
        email_id: emailId,
        from: 'sender@example.com',
        to: 'inbox@tenant.com',
        subject: 'hello',
        text: 'body',
      },
    }),
  })
}

describe('resend email.received idempotency (WITNESS: currently non-idempotent)', () => {
  beforeEach(() => {
    insertCalls.length = 0
    // Bypass signature verification the way local dev does; this witness is
    // about idempotency, not sig verify.
    process.env.RESEND_WEBHOOK_VERIFY = 'off'
  })

  it('re-inserts the SAME inbound email on a replay (duplicate row)', async () => {
    const eventId = 'email_replay_001'

    const first = await POST(receivedEvent(eventId))
    const second = await POST(receivedEvent(eventId))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const inboundInserts = insertCalls.filter(c => c.table === 'inbound_emails')
    // The bug: two identical deliveries → two inserts of the same email id.
    expect(inboundInserts).toHaveLength(2)
    expect((inboundInserts[0].payload as { resend_email_id: string }).resend_email_id).toBe(eventId)
    expect((inboundInserts[1].payload as { resend_email_id: string }).resend_email_id).toBe(eventId)
  })
})
