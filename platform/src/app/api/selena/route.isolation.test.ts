import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/selena (reset a stuck conversation).
 *
 * The reset loads the target conversation through tenantDb (`.eq('tenant_id',
 * ctx)`) before expiring it. Resetting ANOTHER tenant's conversation id must 404
 * before any write — otherwise an owner could expire a foreign tenant's live
 * Selena conversation. Seeds a web conversation (phone `web-*`) so the SMS
 * recovery branch is skipped and the probe stays on the tenant-scope gate.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ tenantId: A })),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn(async () => ({ data: null, error: null })) }))
vi.mock('@/lib/selena-legacy', () => ({ EMPTY_CHECKLIST: {}, getClientProfile: vi.fn(async () => '{}') }))

import { POST } from './route'

function seed() {
  return {
    sms_conversations: [
      { id: 'cv-a', tenant_id: A, phone: 'web-1', client_id: null, booking_checklist: {}, expired: false, outcome: null, summary: null },
      { id: 'cv-b', tenant_id: B, phone: 'web-2', client_id: null, booking_checklist: {}, expired: false, outcome: null, summary: null },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function post(body: unknown) {
  return POST(new NextRequest('http://t/api/selena', { method: 'POST', body: JSON.stringify(body) }))
}

describe('selena POST reset — tenant isolation', () => {
  it('positive control: tenant A resets its OWN conversation', async () => {
    const res = await post({ conversationId: 'cv-a' })
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(h.seed.sms_conversations.find((c) => c.id === 'cv-a')!.expired).toBe(true)
  })

  it("wrong-tenant probe: resetting tenant B's conversation 404s — B stays live", async () => {
    const res = await post({ conversationId: 'cv-b' })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Conversation not found')
    expect(h.seed.sms_conversations.find((c) => c.id === 'cv-b')!.expired).toBe(false)
    expect(h.capture.updates).toHaveLength(0)
  })
})
