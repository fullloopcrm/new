/**
 * REGRESSION TEST — was a WITNESS test documenting the bug from audit finding
 * #3 (`resend/route.ts` inserted `email.received` into `inbound_emails` with
 * NO uniqueness guard, so a redelivered event duplicated the row). Now that
 * `claimWebhookEvent` is wired in (see
 * deploy-prep/webhook-dedupe-helper-design.md), this asserts the fix: a
 * replayed event is deduped via `processed_webhook_events` and short-circuits
 * BEFORE the `inbound_emails` insert.
 *
 * No route edits beyond the dedupe wiring. Drives the real POST handler twice
 * with an identical event.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Record every insert the handler makes; simulate the real UNIQUE(provider,
// event_id) constraint on processed_webhook_events with an in-memory claimed set.
const insertCalls: Array<{ table: string; payload: unknown }> = []
const claimed = new Set<string>()

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from(table: string) {
      return {
        insert(payload: unknown) {
          insertCalls.push({ table, payload })
          if (table === 'processed_webhook_events') {
            const { provider, event_id } = payload as { provider: string; event_id: string }
            const key = `${provider}:${event_id}`
            if (claimed.has(key)) {
              return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } })
            }
            claimed.add(key)
          }
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

describe('resend email.received idempotency (FIXED: claimWebhookEvent wired in)', () => {
  beforeEach(() => {
    insertCalls.length = 0
    claimed.clear()
    // Bypass signature verification the way local dev does; this test is
    // about idempotency, not sig verify.
    process.env.RESEND_WEBHOOK_VERIFY = 'off'
  })

  it('inserts the inbound email once, then dedupes the replay', async () => {
    const eventId = 'email_replay_001'

    const first = await POST(receivedEvent(eventId))
    const second = await POST(receivedEvent(eventId))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(await second.json()).toMatchObject({ deduped: true })

    const inboundInserts = insertCalls.filter(c => c.table === 'inbound_emails')
    expect(inboundInserts).toHaveLength(1)
    expect((inboundInserts[0].payload as { resend_email_id: string }).resend_email_id).toBe(eventId)
  })

  it('still processes a different email_id normally', async () => {
    const first = await POST(receivedEvent('email_a'))
    const second = await POST(receivedEvent('email_b'))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const inboundInserts = insertCalls.filter(c => c.table === 'inbound_emails')
    expect(inboundInserts).toHaveLength(2)
  })
})
