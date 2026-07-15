import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/selena?convoId= — cross-tenant SMS transcript leak.
 *
 * The convoId branch queried sms_conversation_messages by conversation_id
 * ALONE, with no check that the conversation belonged to the requesting
 * tenant — any tenant admin could read another tenant's full SMS transcript
 * (names/phones/addresses/emails) by guessing/enumerating a convoId. The
 * sibling src/app/api/admin/selena/route.ts already tenant-verifies before
 * returning messages; this route never got the same treatment.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getTenantForRequest: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  getTenantForRequest: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: (...a: unknown[]) => h.getTenantForRequest(...a),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/selena-legacy', () => ({
  EMPTY_CHECKLIST: {},
  getClientProfile: vi.fn(async () => null),
}))

import { GET } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'
const CONVO_A = 'convo-a'
const CONVO_B = 'convo-b'

function req(convoId: string): Request {
  return new Request(`http://localhost/api/selena?convoId=${convoId}`)
}

beforeEach(() => {
  h.store = {}
  h.seq = 0
  h.tenantId = TENANT_A
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId, tenant: {}, role: 'admin' }))
  h.store['sms_conversations'] = [
    { id: CONVO_A, tenant_id: TENANT_A, phone: '+15550001' },
    { id: CONVO_B, tenant_id: TENANT_B, phone: '+15550002' },
  ]
  h.store['sms_conversation_messages'] = [
    { id: 'msg-a', conversation_id: CONVO_A, direction: 'inbound', message: 'A secret message', created_at: '2026-07-01' },
    { id: 'msg-b', conversation_id: CONVO_B, direction: 'inbound', message: 'B secret message — SSN 555-00-1234', created_at: '2026-07-02' },
  ]
})

describe('GET /api/selena?convoId= — tenant isolation', () => {
  it('returns messages for a convo owned by the caller tenant', async () => {
    const res = await GET(req(CONVO_A) as never)
    const body = await res.json()
    expect(body.messages).toHaveLength(1)
    expect(body.messages[0].message).toBe('A secret message')
  })

  it('LEAK CONTROL: does NOT return another tenant\'s SMS transcript for a guessed/enumerated convoId', async () => {
    // Tenant A's admin session, but requesting Tenant B's convo id.
    h.tenantId = TENANT_A
    const res = await GET(req(CONVO_B) as never)
    const body = await res.json()
    expect(body.messages).toEqual([])
  })

  it('returns empty for a convoId that does not exist at all', async () => {
    const res = await GET(req('nonexistent-convo') as never)
    const body = await res.json()
    expect(body.messages).toEqual([])
  })
})
