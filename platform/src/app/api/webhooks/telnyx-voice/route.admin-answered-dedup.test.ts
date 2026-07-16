import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Telnyx may redeliver a webhook event that didn't ack 2xx in time. The
 * admin-leg call.answered branch is slow — a live Telnyx bridge call plus
 * starting recording/transcription — the same shape that already caused a
 * redelivered call.initiated to double-ring (fixed in 5043252c). Before this
 * fix, a redelivered call.answered would re-bridge, start a SECOND recording,
 * and log a duplicate "Admin picked up" transcript entry, since nothing
 * claimed the event before acting. Fixed by atomically flipping
 * comhub_active_calls.status from 'ringing' to 'bridged' and only proceeding
 * (bridge/record/log) when that flip actually happened.
 */

process.env.TELNYX_WEBHOOK_VERIFY = 'off'
// TELNYX_API_KEY is read into a module-level const at import time — set it
// here (before `import { POST }` below) so telnyxAction() actually calls
// fetch instead of short-circuiting, regardless of the ambient shell env.
process.env.TELNYX_API_KEY = 'test-key'

vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 })))

const h = vi.hoisted(() => {
  const row: Record<string, unknown> = {
    tenant_id: 'tenant-A',
    customer_call_id: 'customer-1',
    thread_id: 'thread-1',
    contact_id: 'contact-1',
    admin_phone: '+15551112222',
    status: 'ringing',
  }
  const messages: Record<string, unknown>[] = []
  let bridgeCalls = 0
  let recordingCalls = 0

  const supabaseAdmin = {
    from: (table: string) => {
      if (table === 'comhub_active_calls') {
        return {
          update: (patch: Record<string, unknown>) => ({
            eq: (col1: string, val1: unknown) => ({
              eq: (col2: string, val2: unknown) => ({
                select: () => ({
                  single: () => {
                    const matches =
                      row[col1] === val1 && row[col2] === val2
                    if (!matches) return Promise.resolve({ data: null, error: { code: 'PGRST116' } })
                    Object.assign(row, patch)
                    return Promise.resolve({ data: { ...row }, error: null })
                  },
                }),
              }),
            }),
          }),
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
      return {
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      }
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
  }

  return {
    row,
    messages,
    supabaseAdmin,
    getBridgeCalls: () => bridgeCalls,
    bumpBridgeCalls: () => bridgeCalls++,
    getRecordingCalls: () => recordingCalls,
    bumpRecordingCalls: () => recordingCalls++,
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

function adminAnsweredEvent(callControlId: string) {
  return new NextRequest('https://app.fullloop.example/api/webhooks/telnyx-voice', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      data: {
        event_type: 'call.answered',
        payload: {
          call_control_id: callControlId,
          custom_headers: [
            { name: 'X-Comhub-Leg', value: 'admin' },
            { name: 'X-Comhub-Customer-Call', value: 'customer-1' },
            { name: 'X-Comhub-Ring-Index', value: '0' },
          ],
        },
      },
    }),
  })
}

beforeEach(() => {
  h.row.status = 'ringing'
  h.messages.length = 0
  ;(global.fetch as ReturnType<typeof vi.fn>).mockClear()
})

describe('POST /api/webhooks/telnyx-voice — admin-leg call.answered duplicate guard', () => {
  it('bridges, records, and logs on the first delivery', async () => {
    const res = await POST(adminAnsweredEvent('admin-leg-1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
    expect(h.row.status).toBe('bridged')
    expect(h.messages.length).toBe(1)
    expect((h.messages[0] as { body: string }).body).toContain('picked up')
  })

  it('does not re-bridge/re-record/re-log when Telnyx redelivers the same call.answered event', async () => {
    await POST(adminAnsweredEvent('admin-leg-1'))
    const messageCountAfterFirst = h.messages.length
    const fetchCallsAfterFirst = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length

    const res2 = await POST(adminAnsweredEvent('admin-leg-1'))
    const json2 = await res2.json()

    expect(json2).toEqual({ ok: true, duplicate: true })
    expect(h.messages.length).toBe(messageCountAfterFirst) // no duplicate "picked up" log
    // No further Telnyx API calls (bridge + record_start) on the duplicate delivery.
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchCallsAfterFirst)
  })
})
