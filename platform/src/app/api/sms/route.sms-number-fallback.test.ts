import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/sms — sms_number carry-forward fix.
 *
 * BUG (fixed here): the Telnyx-send gate/call read tenant.telnyx_api_key/
 * telnyx_phone directly, bypassing resolveTenantSmsCredentials()'s
 * telnyx_phone||sms_number precedence — a tenant with only the legacy
 * sms_number column populated silently never got `sent: true` on a new
 * client-message conversation.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ tenantId: A })),
  AuthError: class AuthError extends Error { status = 401 },
}))
type SendSmsArgs = { to: string; body: string; telnyxApiKey: string; telnyxPhone: string }
const spies = vi.hoisted(() => ({ sendSMS: vi.fn(async (_args: SendSmsArgs) => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: spies.sendSMS }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn(async () => ({ data: null, error: null })) }))

import { POST } from './route'

function seed() {
  return {
    sms_conversations: [] as Record<string, unknown>[],
    sms_conversation_messages: [] as Record<string, unknown>[],
    clients: [
      { id: 'cl-a', tenant_id: A, phone: '2125551111' },
    ],
    tenants: [
      { id: A, name: 'Acme', telnyx_api_key: 'acme-key', telnyx_phone: null, sms_number: '+15551110001' },
      { id: B, name: 'Other', telnyx_api_key: 'other-key', telnyx_phone: '+15552220002', sms_number: null },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  spies.sendSMS.mockClear()
})

function post(body: Record<string, unknown>) {
  return POST(new NextRequest('http://t/api/sms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

describe('sms POST — sms_number fallback', () => {
  it('telnyx_phone is null but sms_number is set — new-conversation SMS still sends via the legacy-column fallback', async () => {
    const res = await post({ client_id: 'cl-a', message: 'hi there' })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.sent).toBe(true)
    expect(spies.sendSMS).toHaveBeenCalledTimes(1)
    expect(spies.sendSMS.mock.calls[0][0].telnyxPhone).toBe('+15551110001')
  })

  it("wrong-tenant probe: tenant B's telnyx_phone never leaks into tenant A's sms_number-fallback send", async () => {
    await post({ client_id: 'cl-a', message: 'hi there' })
    const call = spies.sendSMS.mock.calls[0][0]
    expect(call.telnyxPhone).not.toBe('+15552220002')
    expect(call.telnyxApiKey).not.toBe('other-key')
  })
})
