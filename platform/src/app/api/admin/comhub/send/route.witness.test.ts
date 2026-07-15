import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/comhub/send POST — cross-tenant contact_id FK-injection guard (sms/email branch).
 *
 * BUG (fixed here): `contact_id` is caller-supplied. The old branching only
 * validated it against `tenant_id` when BOTH `phone` and `email` were absent
 * from the body (`if (contactId && (!phone && !email))`). Supplying a foreign
 * tenant's real contact_id ALONGSIDE a caller-chosen `phone` skipped that
 * lookup entirely, so the foreign contact_id flowed unvalidated into
 * `comhub_get_or_create_thread` and the `comhub_messages` insert — both
 * stamped with the CALLER's tenant_id but pointing at ANOTHER tenant's
 * `comhub_contacts` row. `GET /api/admin/comhub/threads` joins
 * `comhub_contacts` by that FK with no additional tenant filter, so the
 * foreign contact's name/phone/email would then render directly in the
 * attacker-tenant's own thread list — a live cross-tenant PII read, same
 * class as P22/P25.
 *
 * FIX: a caller-supplied contact_id is now ALWAYS checked against
 * `tenant_id` before use, independent of whether phone/email are also
 * present — a miss 404s before comhub_get_or_create_thread or any send/DB
 * write. Same unconditional-validation fix applied to `thread_id`.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
const rpcCalls = vi.hoisted(() => [] as Array<{ fn: string; args: Record<string, unknown> }>)
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args })
      if (fn === 'comhub_get_or_create_thread') return { data: `thread-for-${args.p_contact_id}`, error: null }
      if (fn === 'comhub_get_or_create_contact_by_phone') return { data: 'new-contact', error: null }
      return { data: null, error: { message: 'unexpected rpc' } }
    },
  },
}))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT_A) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ data: { id: 'sms-1' } })) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ id: 'email-1' })) }))
vi.mock('@/lib/messaging/shell', () => ({ emailShell: vi.fn(() => '<html></html>') }))

import { sendSMS } from '@/lib/sms'
import { POST } from './route'

function seed() {
  return {
    tenants: [
      { id: TENANT_A, name: 'Tenant A', telnyx_api_key: 'key-a', telnyx_phone: '+18885550000', resend_api_key: 'resend-a' },
    ],
    comhub_contacts: [
      { id: 'contact-a', tenant_id: TENANT_A, phone: '+15551110000', email: 'a@tenant-a.test' },
      { id: 'contact-b', tenant_id: TENANT_B, phone: '+15552220000', email: 'b@tenant-b.test', name: 'Foreign Customer' },
    ],
    comhub_threads: [],
    comhub_messages: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  rpcCalls.length = 0
  vi.mocked(sendSMS).mockClear()
})

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/admin/comhub/send', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('admin/comhub/send POST — cross-tenant contact_id guard', () => {
  it('BLOCKED: foreign-tenant contact_id + a caller-supplied phone (previously skipped validation) 404s, no SMS sent, no message/thread created', async () => {
    const res = await POST(req({ contact_id: 'contact-b', phone: '+15559999999', channel: 'sms', body: 'hi' }))
    expect(res.status).toBe(404)
    expect(sendSMS).not.toHaveBeenCalled()
    expect(rpcCalls.find((c) => c.fn === 'comhub_get_or_create_thread')).toBeUndefined()
    expect(h.capture.inserts.find((i) => i.table === 'comhub_messages')).toBeUndefined()
  })

  it('BLOCKED: foreign-tenant contact_id with no phone/email also 404s', async () => {
    const res = await POST(req({ contact_id: 'contact-b', channel: 'sms', body: 'hi' }))
    expect(res.status).toBe(404)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('CONTROL: caller-tenant contact_id + phone succeeds and never leaks a foreign contact into the thread', async () => {
    const res = await POST(req({ contact_id: 'contact-a', phone: '+15551110000', channel: 'sms', body: 'hi' }))
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
    const threadRpc = rpcCalls.find((c) => c.fn === 'comhub_get_or_create_thread')
    expect(threadRpc?.args.p_contact_id).toBe('contact-a')
    const ins = h.capture.inserts.find((i) => i.table === 'comhub_messages')
    expect(ins?.rows.every((r) => r.contact_id === 'contact-a' && r.tenant_id === TENANT_A)).toBe(true)
  })

  it('CONTROL: phone-only (no contact_id) still creates/resolves a contact via the tenant-scoped RPC', async () => {
    const res = await POST(req({ phone: '+15553330000', channel: 'sms', body: 'hi' }))
    expect(res.status).toBe(200)
    const contactRpc = rpcCalls.find((c) => c.fn === 'comhub_get_or_create_contact_by_phone')
    expect(contactRpc?.args.p_tenant_id).toBe(TENANT_A)
  })
})
