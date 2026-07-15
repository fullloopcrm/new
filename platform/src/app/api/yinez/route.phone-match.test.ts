import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/yinez's new-conversation "returning client" phone lookup used
 * `.ilike('phone', '%<last-10-digits>%')` with NO length floor -- a short/
 * garbage phone (e.g. a single digit) matched an ARBITRARY unrelated client
 * in the tenant, and the route then set `insertData.client_id` to that
 * wrong client + copied their real `name` into the new conversation's
 * booking_checklist. Downstream Selena tool handlers WRITE to `clients`
 * keyed off this conversation's client_id, so a garbage phone from an
 * anonymous visitor could silently misattribute (and later corrupt) an
 * unrelated client's record. Same bug class fixed on the sibling
 * chat/route.ts in this same round; yinez's own inline lookup was never
 * covered on this branch.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: (_id: string, sig: string | null | undefined) => sig === 'goodsig',
}))
vi.mock('@/lib/selena/agent', async () => {
  const actual = await vi.importActual<typeof import('@/lib/selena/agent')>('@/lib/selena/agent')
  return { askSelena: vi.fn(async () => ({ text: 'hi from yinez', bookingCreated: false })), normalizePhoneDigits: actual.normalizePhoneDigits }
})
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/conversation-scorer', () => ({
  scoreConversation: vi.fn(async () => {}),
  selfReviewConversation: vi.fn(async () => {}),
}))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn(async () => ({ data: null, error: null })) }))

import { POST } from './route'

const UNRELATED_CLIENT = { id: 'unrelated-client-1', name: 'Unrelated Real Client', phone: '2125551234', tenant_id: A }

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({ sms_conversations: [], clients: [{ ...UNRELATED_CLIENT }] })
  holder.from = h.from
})

function yinez(phone: string) {
  return POST(
    new NextRequest('http://t/api/yinez', {
      method: 'POST',
      headers: { 'x-tenant-id': A, 'x-tenant-sig': 'goodsig' },
      body: JSON.stringify({ message: 'hi', phone }),
    }),
  )
}

describe('POST /api/yinez — new conversation phone-link match', () => {
  it('does NOT attach an unrelated client via a malformed 1-digit phone', async () => {
    const res = await yinez('1')
    expect(res.status).toBe(200)
    const ins = h.capture.inserts.find((i) => i.table === 'sms_conversations')
    expect(ins!.rows[0].client_id).toBeUndefined()
  })

  it('CONTROL: still links the correct client on an exact 10-digit match', async () => {
    const res = await yinez('2125551234')
    expect(res.status).toBe(200)
    const ins = h.capture.inserts.find((i) => i.table === 'sms_conversations')
    expect(ins!.rows[0].client_id).toBe(UNRELATED_CLIENT.id)
  })
})
