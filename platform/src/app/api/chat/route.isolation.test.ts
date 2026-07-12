import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/chat (resolver-level, converted to tenantDb).
 *
 * This is a RESOLVER probe: tenant identity comes ONLY from the middleware-signed
 * `x-tenant-id` header (verified via HMAC). A body-supplied tenantId is accepted
 * only if it matches the signed header. The probes assert:
 *   1. missing/invalid signature → 400 (no tenant context, no work)
 *   2. body.tenantId ≠ signed header → 400 "Tenant mismatch" (no impersonation)
 *   3. valid header → the new conversation is stamped with the SIGNED tenant,
 *      proving tenantDb scopes the write to the resolved tenant, not a forged one.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

// Signature is valid iff the caller presented the sentinel 'goodsig'.
vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: (_id: string, sig: string | null | undefined) => sig === 'goodsig',
}))
vi.mock('@/lib/selena-legacy', () => ({
  EMPTY_CHECKLIST: {},
  getNextStep: () => null,
  getQuickReplies: () => [],
  askSelena: vi.fn(async () => ({ text: 'hello from selena', checklist: {}, bookingCreated: false })),
}))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({ text: 'yinez', bookingCreated: false })) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn(async () => ({ data: null, error: null })) }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({ sms_conversations: [], sms_conversation_messages: [] })
  holder.from = h.from
})

function chat(headers: Record<string, string>, body: Record<string, unknown>) {
  return POST(new NextRequest('http://t/api/chat', { method: 'POST', headers, body: JSON.stringify(body) }))
}

describe('chat POST — resolver tenant isolation', () => {
  it('positive control: a validly-signed header stamps the conversation with the signed tenant', async () => {
    const res = await chat({ 'x-tenant-id': A, 'x-tenant-sig': 'goodsig' }, { message: 'hi' })
    expect(res.status).toBe(200)
    expect((await res.json()).reply).toBe('hello from selena')
    const ins = h.capture.inserts.find((i) => i.table === 'sms_conversations')
    expect(ins).toBeDefined()
    expect(ins!.rows.every((r) => r.tenant_id === A)).toBe(true)
  })

  it('missing signature → 400, no conversation created', async () => {
    const res = await chat({ 'x-tenant-id': A }, { message: 'hi' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Tenant context required')
    expect(h.capture.inserts.find((i) => i.table === 'sms_conversations')).toBeUndefined()
  })

  it('wrong-tenant probe: body.tenantId targeting another tenant → 400 "Tenant mismatch"', async () => {
    const res = await chat({ 'x-tenant-id': A, 'x-tenant-sig': 'goodsig' }, { message: 'hi', tenantId: B })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Tenant mismatch')
    expect(h.capture.inserts.find((i) => i.table === 'sms_conversations')).toBeUndefined()
  })
})
