import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/yinez.
 *
 * Prior to this fix, this route trusted a raw `x-tenant-id` header with no
 * signature check — an attacker could set any tenant's id and pull back that
 * tenant's client name by phone number (see deploy-prep/none-write-routes-triage.md
 * row 19). Now it mirrors chat/route.ts's `verifyTenantHeaderSig` guard:
 *   1. missing/invalid signature → 400, no conversation created
 *   2. valid header → the conversation (and the cross-tenant client lookup)
 *      are scoped to the SIGNED tenant, not an attacker-forged one.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

// Signature is valid iff the caller presented the sentinel 'goodsig'.
vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: (_id: string, sig: string | null | undefined) => sig === 'goodsig',
}))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({ text: 'hi from yinez', bookingCreated: false })) }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/conversation-scorer', () => ({
  scoreConversation: vi.fn(async () => {}),
  selfReviewConversation: vi.fn(async () => {}),
}))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn(async () => ({ data: null, error: null })) }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    sms_conversations: [],
    clients: [
      { id: 'client-a', tenant_id: A, name: 'Alice A', phone: '5551234567' },
      { id: 'client-b', tenant_id: B, name: 'Bob B', phone: '5551234567' },
    ],
  })
  holder.from = h.from
})

function yinez(headers: Record<string, string>, body: Record<string, unknown>) {
  return POST(new NextRequest('http://t/api/yinez', { method: 'POST', headers, body: JSON.stringify(body) }))
}

describe('yinez POST — resolver tenant isolation', () => {
  it('missing signature → 400, no conversation created, no client lookup', async () => {
    const res = await yinez({ 'x-tenant-id': A }, { message: 'hi', phone: '5551234567' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Tenant context required')
    expect(h.capture.inserts.find((i) => i.table === 'sms_conversations')).toBeUndefined()
  })

  it('forged/invalid signature → 400, no conversation created', async () => {
    const res = await yinez({ 'x-tenant-id': A, 'x-tenant-sig': 'forged' }, { message: 'hi', phone: '5551234567' })
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'sms_conversations')).toBeUndefined()
  })

  it('wrong-tenant probe: attacker-chosen x-tenant-id without a valid sig for it never links tenant B\'s client', async () => {
    // Attacker sets x-tenant-id to B's id but can't produce B's real signature.
    const res = await yinez({ 'x-tenant-id': B, 'x-tenant-sig': 'goodsig-for-a-not-b' }, { message: 'hi', phone: '5551234567' })
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'sms_conversations')).toBeUndefined()
  })

  it('positive control: a validly-signed header scopes the client lookup + conversation to the signed tenant only', async () => {
    const res = await yinez({ 'x-tenant-id': A, 'x-tenant-sig': 'goodsig' }, { message: 'hi', phone: '5551234567' })
    expect(res.status).toBe(200)
    const ins = h.capture.inserts.find((i) => i.table === 'sms_conversations')
    expect(ins).toBeDefined()
    expect(ins!.rows.every((r) => r.tenant_id === A)).toBe(true)
    // Client linked (if any) must be tenant A's, never tenant B's, even though
    // both share the same phone number.
    const linkedClientId = ins!.rows[0].client_id
    expect(linkedClientId).toBe('client-a')
  })
})
