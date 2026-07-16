import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Telnyx retries a webhook delivery that doesn't ack 2xx in time. The
 * call.initiated (inbound) branch is slow — multiple sequential DB/RPC round
 * trips, a live Telnyx "answer" API call, then dialing admin targets — the
 * exact shape likely to cause that timeout. A redelivered event previously
 * re-ran the whole branch: a duplicate "Incoming call" transcript message,
 * and worse, a second real ring to the admin's phone for the same inbound
 * call. comhub_active_calls.customer_call_id already has a UNIQUE constraint
 * in the DB (migrations/2026_05_19_comhub.sql) — the insert's error was
 * simply never checked, so the constraint existed but did nothing. Fixed by
 * checking the insert result and short-circuiting on a 23505 conflict
 * before touching the transcript, answering, or ringing anyone.
 */

process.env.TELNYX_WEBHOOK_VERIFY = 'off'

// telnyxAction() calls the real Telnyx API when TELNYX_API_KEY is set (which
// it may be, from the real shell env this test runs in) — stub fetch so this
// test never makes a live network call regardless of that env var.
vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })))

const h = vi.hoisted(() => {
  const activeCalls = new Map<string, Record<string, unknown>>()
  const messages: Record<string, unknown>[] = []
  let insertAttempts = 0

  const supabaseAdmin = {
    from: (table: string) => {
      if (table === 'tenants') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [{ id: 'tenant-A', name: 'Acme' }], error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'comhub_active_calls') {
        return {
          insert: (payload: Record<string, unknown>) => {
            insertAttempts++
            const id = payload.customer_call_id as string
            if (activeCalls.has(id)) {
              return Promise.resolve({
                data: null,
                error: { message: 'duplicate key value violates unique constraint', code: '23505' },
              })
            }
            activeCalls.set(id, payload)
            return Promise.resolve({ data: [payload], error: null })
          },
          update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        }
      }
      if (table === 'comhub_messages') {
        return {
          insert: (payload: Record<string, unknown>) => {
            messages.push(payload)
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: `msg-${messages.length}` }, error: null }),
              }),
            }
          },
        }
      }
      if (table === 'comhub_threads') {
        return { update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) }
      }
      if (table === 'comhub_admin_presence' || table === 'comhub_admin_voice_settings') {
        // No online softphones, no configured cell fallback -> ringTargets
        // is empty -> the branch goes to startVoicemail instead of dialing.
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }
      }
      return {
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      }
    },
    rpc: (fn: string) => {
      if (fn === 'comhub_get_or_create_contact_by_phone') {
        return Promise.resolve({ data: 'contact-1', error: null })
      }
      if (fn === 'comhub_get_or_create_thread') {
        return Promise.resolve({ data: 'thread-1', error: null })
      }
      return Promise.resolve({ data: null, error: null })
    },
  }

  return {
    activeCalls,
    messages,
    supabaseAdmin,
    getInsertAttempts: () => insertAttempts,
    resetInsertAttempts: () => { insertAttempts = 0 },
  }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/webhook-verify', () => ({
  verifyTelnyx: () => ({ valid: true }),
  isWebhookVerifyDisabled: () => true,
}))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/postgrest-safe', () => ({ sanitizePostgrestValue: (v: unknown) => v }))

import { POST } from './route'
import { NextRequest } from 'next/server'

function inboundCallEvent(callControlId: string) {
  return new NextRequest('https://app.fullloop.example/api/webhooks/telnyx-voice', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      data: {
        event_type: 'call.initiated',
        payload: {
          call_control_id: callControlId,
          call_session_id: callControlId,
          from: '+15559998888',
          to: '+15551234567',
          direction: 'incoming',
        },
      },
    }),
  })
}

beforeEach(() => {
  h.activeCalls.clear()
  h.messages.length = 0
  h.resetInsertAttempts()
})

describe('POST /api/webhooks/telnyx-voice — duplicate call.initiated guard', () => {
  it('claims and processes a normal single delivery', async () => {
    const res = await POST(inboundCallEvent('call-1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
    expect(h.activeCalls.has('call-1')).toBe(true)
    expect(h.messages.length).toBeGreaterThan(0) // "Incoming call" + voicemail-start transcript entries
  })

  it('does not re-process (no duplicate ring/transcript) when Telnyx redelivers the same call.initiated event', async () => {
    await POST(inboundCallEvent('call-1'))
    const messageCountAfterFirst = h.messages.length

    const res2 = await POST(inboundCallEvent('call-1'))
    const json2 = await res2.json()

    expect(json2).toEqual({ ok: true, duplicate: true })
    expect(h.getInsertAttempts()).toBe(2) // both tried to claim, only the first succeeded
    expect(h.messages.length).toBe(messageCountAfterFirst) // no duplicate transcript entry
  })
})
