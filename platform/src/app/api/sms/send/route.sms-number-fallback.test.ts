import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * sms/send POST — sms_number carry-forward fix.
 *
 * BUG (fixed here): the manual-SMS gate/send read tenant.telnyx_api_key/
 * telnyx_phone directly, bypassing resolveTenantSmsCredentials()'s
 * telnyx_phone||sms_number precedence — a tenant with only the legacy
 * sms_number column populated got "Tenant has no Telnyx configured" even
 * though sendSMS would have worked fine with that number.
 */

const A = 'tid-a'
const B = 'tid-b'

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
      tenant: { id: A },
      role: roleHolder.role,
    })),
  }
})

type SendSmsArgs = { to: string; body: string; telnyxApiKey: string; telnyxPhone: string }
const spies = vi.hoisted(() => ({ sendSMS: vi.fn(async (_args: SendSmsArgs) => ({ success: true })) }))
vi.mock('@/lib/sms', () => ({ sendSMS: spies.sendSMS }))

import { POST } from './route'

function seed() {
  return {
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
  roleHolder.role = 'owner'
  spies.sendSMS.mockClear()
})

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t', { method: 'POST', body: JSON.stringify(body) })
}

describe('sms/send POST — sms_number fallback', () => {
  it('telnyx_phone is null but sms_number is set — manual SMS still sends via the legacy-column fallback', async () => {
    const res = await POST(req({ to: '+15559990001', message: 'hi' }))
    expect(res.status).toBe(200)
    expect(spies.sendSMS).toHaveBeenCalledTimes(1)
    expect(spies.sendSMS.mock.calls[0][0].telnyxPhone).toBe('+15551110001')
  })

  it("wrong-tenant probe: tenant B's telnyx_phone never leaks into tenant A's sms_number-fallback send", async () => {
    await POST(req({ to: '+15559990001', message: 'hi' }))
    const call = spies.sendSMS.mock.calls[0][0]
    expect(call.telnyxPhone).not.toBe('+15552220002')
    expect(call.telnyxApiKey).not.toBe('other-key')
  })
})
