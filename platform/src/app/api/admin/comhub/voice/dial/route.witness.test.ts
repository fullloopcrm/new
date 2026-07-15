import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/comhub/voice/dial POST — cross-tenant contact_id FK-injection guard.
 *
 * BUG (fixed here): `contact_id` is caller-supplied. The old branching only
 * validated it against `tenant_id` when `phone` was ALSO absent from the body
 * (`else if (contactId && !customerPhone)`). Supplying BOTH `contact_id` (a
 * foreign tenant's real contact id) AND `phone` (any string) skipped that
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
 * `tenant_id` before use, independent of whether `phone` is also present —
 * a miss 404s before comhub_get_or_create_thread or any Telnyx/DB write.
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
vi.mock('@/lib/comhub-voice-config', () => ({
  resolveTenantVoiceConfig: vi.fn(async () => ({
    apiKey: 'test-telnyx-key',
    voiceConnectionId: 'conn-1',
    fromNumber: '+18885551234',
  })),
}))

import { POST } from './route'

function seed() {
  return {
    comhub_contacts: [
      { id: 'contact-a', tenant_id: TENANT_A, phone: '+15551110000' },
      { id: 'contact-b', tenant_id: TENANT_B, phone: '+15552220000', name: 'Foreign Customer', email: 'foreign@b.test' },
    ],
    comhub_threads: [],
    comhub_messages: [],
  }
}

let h: Harness
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  rpcCalls.length = 0
  fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ data: { call_control_id: 'ccid-new' } }),
  }))
  vi.stubGlobal('fetch', fetchMock)
})

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/admin/comhub/voice/dial', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('admin/comhub/voice/dial POST — cross-tenant contact_id guard', () => {
  it('BLOCKED: foreign-tenant contact_id + a caller-supplied phone (previously skipped validation) 404s, no thread/message created', async () => {
    const res = await POST(req({ contact_id: 'contact-b', phone: '+15559999999', admin_phone: '+15550001111' }))
    expect(res.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(rpcCalls.find((c) => c.fn === 'comhub_get_or_create_thread')).toBeUndefined()
    expect(h.capture.inserts.find((i) => i.table === 'comhub_messages')).toBeUndefined()
  })

  it('BLOCKED: foreign-tenant contact_id with no phone also 404s', async () => {
    const res = await POST(req({ contact_id: 'contact-b', admin_phone: '+15550001111' }))
    expect(res.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('CONTROL: caller-tenant contact_id + phone succeeds and never leaks a foreign contact into the thread', async () => {
    const res = await POST(req({ contact_id: 'contact-a', phone: '+15551110000', admin_phone: '+15550001111' }))
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const threadRpc = rpcCalls.find((c) => c.fn === 'comhub_get_or_create_thread')
    expect(threadRpc?.args.p_contact_id).toBe('contact-a')
    const ins = h.capture.inserts.find((i) => i.table === 'comhub_messages')
    expect(ins?.rows.every((r) => r.contact_id === 'contact-a' && r.tenant_id === TENANT_A)).toBe(true)
  })

  it('CONTROL: phone-only (no contact_id) still creates/resolves a contact via the tenant-scoped RPC', async () => {
    const res = await POST(req({ phone: '+15553330000', admin_phone: '+15550001111' }))
    expect(res.status).toBe(200)
    const contactRpc = rpcCalls.find((c) => c.fn === 'comhub_get_or_create_contact_by_phone')
    expect(contactRpc?.args.p_tenant_id).toBe(TENANT_A)
  })
})
