import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/clients/[id]/transcript — manual outbound SMS from the client
 * detail page compose box.
 *
 * Covers: respects isCommEnabled() gate (blocked when tenant has manual SMS
 * off), the sent message appears in the transcript (client_sms_messages
 * insert), and the route is permission-gated on clients.edit (not open to
 * every role — 'staff' has clients.view only, per rbac.ts).
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string }))
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: {
        id: A,
        name: 'Acme',
        telnyx_api_key: 'tenant-key',
        telnyx_phone: '+15550001111',
        sms_number: null,
      },
      role: roleHolder.role,
    })),
  }
})

const commHolder = vi.hoisted(() => ({ enabled: true as boolean }))
vi.mock('@/lib/comms-prefs', () => ({
  isCommEnabled: vi.fn(async () => commHolder.enabled),
}))

type SendSmsArgs = { to: string; body: string; telnyxApiKey: string; telnyxPhone: string }
const spies = vi.hoisted(() => ({ sendSMS: vi.fn(async (_args: SendSmsArgs) => ({ success: true })) }))
vi.mock('@/lib/sms', () => ({ sendSMS: spies.sendSMS }))

import { POST } from './route'

function seed() {
  return {
    clients: [{ id: 'c-1', tenant_id: A, phone: '+15559990001' }],
    client_sms_messages: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
  commHolder.enabled = true
  spies.sendSMS.mockClear()
})

function post(id: string, body: Record<string, unknown>) {
  return POST(new Request('http://t', { method: 'POST', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id }),
  })
}

describe('POST /api/clients/[id]/transcript — manual SMS send', () => {
  it('sends the SMS and logs it into client_sms_messages so it appears in the transcript', async () => {
    const res = await post('c-1', { message: 'Hey, running 10 min late!' })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(spies.sendSMS).toHaveBeenCalledTimes(1)
    expect(spies.sendSMS.mock.calls[0][0]).toMatchObject({
      to: '+15559990001',
      body: 'Hey, running 10 min late!',
      telnyxApiKey: 'tenant-key',
      telnyxPhone: '+15550001111',
    })
    expect(body.message.direction).toBe('outbound')
    expect(body.message.message).toBe('Hey, running 10 min late!')

    const saved = (h.seed.client_sms_messages as Record<string, unknown>[]) || []
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({
      tenant_id: A,
      client_id: 'c-1',
      direction: 'outbound',
      message: 'Hey, running 10 min late!',
    })
  })

  it('GATE: blocked when tenant has manual SMS turned off — nothing sent, nothing logged', async () => {
    commHolder.enabled = false
    const res = await post('c-1', { message: 'Hello' })
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toMatch(/turned off/i)
    expect(spies.sendSMS).not.toHaveBeenCalled()
    expect((h.seed.client_sms_messages as Record<string, unknown>[]) || []).toHaveLength(0)
  })

  it("PERMISSION PROBE: 'staff' role (no clients.edit) is forbidden and nothing is sent", async () => {
    roleHolder.role = 'staff'
    const res = await post('c-1', { message: 'Hello' })
    expect(res.status).toBe(403)
    expect(spies.sendSMS).not.toHaveBeenCalled()
  })

  it('rejects an empty message', async () => {
    const res = await post('c-1', { message: '   ' })
    expect(res.status).toBe(400)
    expect(spies.sendSMS).not.toHaveBeenCalled()
  })
})
