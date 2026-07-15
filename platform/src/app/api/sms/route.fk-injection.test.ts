/**
 * POST /api/sms — cross-tenant FK injection on conversation_id. The route
 * inserted an outbound message straight into `sms_conversation_messages`
 * keyed by a caller-supplied conversation_id with zero check that the
 * conversation belongs to the caller's tenant. A caller could inject a
 * message into another tenant's SMS thread by guessing/reusing that
 * tenant's conversation id.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))

import { POST } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

const postReq = (body: unknown) => new NextRequest('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store = {
    sms_conversations: [
      { id: 'convo-A1', tenant_id: TENANT_A, client_id: 'client-A1' },
      { id: 'convo-B1', tenant_id: TENANT_B, client_id: 'client-B1' },
    ],
    sms_conversation_messages: [],
    clients: [
      { id: 'client-A1', tenant_id: TENANT_A, phone: '5551110000' },
      { id: 'client-B1', tenant_id: TENANT_B, phone: '5552220000' },
    ],
    tenants: [{ id: TENANT_A }],
  }
})

describe('POST /api/sms — cross-tenant conversation_id FK injection', () => {
  it('rejects a conversation_id belonging to another tenant, inserts nothing', async () => {
    const res = await POST(postReq({ conversation_id: 'convo-B1', client_id: 'client-A1', message: 'hi' }))

    expect(res.status).toBe(404)
    expect(h.store.sms_conversation_messages.length).toBe(0)
  })

  it('accepts a conversation_id genuinely owned by the caller tenant', async () => {
    const res = await POST(postReq({ conversation_id: 'convo-A1', client_id: 'client-A1', message: 'hi' }))

    expect(res.status).toBe(201)
    expect(h.store.sms_conversation_messages.length).toBe(1)
    expect(h.store.sms_conversation_messages[0].conversation_id).toBe('convo-A1')
  })
})
