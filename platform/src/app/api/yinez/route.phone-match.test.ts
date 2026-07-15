/**
 * The new-conversation "returning client" lookup matched via
 * `ilike('phone', '%'+last10digits+'%')` with no minimum-length guard. A
 * short or malformed phone (e.g. "5") from this fully-unauthenticated public
 * web-chat widget matched an ARBITRARY unrelated client, linking THEIR
 * client_id (and leaking their name) onto a brand-new anonymous conversation
 * — downstream Selena tool handlers write to `clients` keyed off that
 * client_id, so this was a corruption vector, not just a read. Fixed to
 * require a full, exact 10-digit match.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signTenantHeader } from '@/lib/tenant-header-sig'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})
vi.mock('@/lib/selena/core', () => ({ EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async (_channel: string, _message: string, conversationId: string) =>
    ({ text: 'hello from yinez', bookingCreated: false, conversationId })),
}))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/conversation-scorer', () => ({
  scoreConversation: vi.fn(async () => {}),
  selfReviewConversation: vi.fn(async () => {}),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const SECRET = 'yinez-phone-match-test-secret'
const TENANT = 'tenant-1'
const UNRELATED_CLIENT = 'unrelated-client'
const fake = supabaseAdmin as unknown as FakeSupabase

function post(body: Record<string, unknown>) {
  const sig = signTenantHeader(TENANT)
  return new NextRequest('https://app.fullloop.example/api/yinez', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tenant-id': TENANT, 'x-tenant-sig': sig },
    body: JSON.stringify({ message: 'hi', ...body }),
  })
}

beforeAll(() => {
  process.env.TENANT_HEADER_SIG_SECRET = SECRET
})

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [
    { id: UNRELATED_CLIENT, tenant_id: TENANT, name: 'Unrelated Client', phone: '5551234567' },
  ])
})

describe('POST /api/yinez — new-conversation phone link must be exact', () => {
  it('a short malformed phone does NOT link the new conversation to an unrelated client', async () => {
    const res = await POST(post({ phone: '5' }))
    expect(res.status).toBe(200)
    const convo = fake._all('sms_conversations')[0]
    expect(convo.client_id).toBeUndefined()
  })

  it('a full exact phone match DOES link the new conversation to that client', async () => {
    const res = await POST(post({ phone: '5551234567' }))
    expect(res.status).toBe(200)
    const convo = fake._all('sms_conversations')[0]
    expect(convo.client_id).toBe(UNRELATED_CLIENT)
  })
})
