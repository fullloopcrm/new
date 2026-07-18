import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — POST /api/admin/message-applicants/send had a recipient-count
 * cap (BROADCAST_CAP) but no length cap on the caller-supplied `message`,
 * which is the literal SMS body billed per-character per applicant by
 * Telnyx. Same class as the sibling send-apology-batch/sms-send message
 * caps landed this round.
 *
 * FIXED: rejects (400) a message over 1600 chars before any SMS send.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

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
      tenant: { id: A, telnyx_api_key: 'key', telnyx_phone: '+15551234567' },
      role: 'owner',
    })),
  }
})

const spies = vi.hoisted(() => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/sms', () => ({ sendSMS: spies.sendSMS }))

import { POST } from './route'

function seed() {
  return {
    cleaner_applications: [
      { id: 'app-a1', tenant_id: A, name: 'Jeff Tucker', phone: '+15559990001', status: 'new' },
    ],
    notifications: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  spies.sendSMS.mockClear()
})

function req(body: Record<string, unknown>) {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

describe('admin/message-applicants/send POST — message length cap', () => {
  it('LOCK: a message over 1600 chars is rejected before any SMS send', async () => {
    const res = await POST(req({ applicant_ids: ['app-a1'], message: 'm'.repeat(1601), confirmed: true }))
    expect(res.status).toBe(400)
    expect(spies.sendSMS).not.toHaveBeenCalled()
  })

  it('CONTROL: a message at exactly 1600 chars is accepted', async () => {
    const res = await POST(req({ applicant_ids: ['app-a1'], message: 'm'.repeat(1600), confirmed: true }))
    expect(res.status).toBe(200)
    expect(spies.sendSMS).toHaveBeenCalledTimes(1)
  })
})
