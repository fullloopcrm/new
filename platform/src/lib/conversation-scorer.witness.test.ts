import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * scoreConversation / selfReviewConversation — cross-tenant `conversation_id`
 * FK injection, reached via POST /api/admin/selena/score.
 *
 * `conversation_id` is caller-supplied by any authenticated admin (only
 * `settings.view` permission required — not tenant-bound to the specific
 * conversation) and was read/written with NO tenant_id check at all:
 * `.eq('id', conversationId).single()`, no `.eq('tenant_id', tenantId)`.
 * That let an admin of tenant A pull tenant B's conversation transcript into
 * an AI self-review (whose review text is returned directly in the API
 * response — read exfil), stamp `quality_score`/`quality_issues` onto B's own
 * row (cross-tenant write), and insert into A's own `selena_memory` with
 * `client_id` = B's client (cross-tenant FK pollution) — same dangling-FK/
 * exfil class as P1/P9/P21 in deploy-prep/cross-tenant-leak-register.md, just
 * on the AI-conversation-scoring surface instead of an HTTP body FK.
 *
 * FIX: both functions now verify the conversation belongs to `tenantId`
 * before reading its transcript or writing to it; a miss short-circuits with
 * the same "not found" shape already used for a missing conversation.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/anthropic-client', () => ({
  resolveAnthropic: vi.fn(async () => ({
    messages: {
      create: vi.fn(async () => ({
        content: [{ type: 'text', text: 'SCORE: 80\nREVIEW: Fine.\nMISTAKES: None\nIMPROVEMENTS: None' }],
      })),
    },
  })),
}))

import { scoreConversation, selfReviewConversation } from './conversation-scorer'

function seed() {
  return {
    tenants: [
      { id: TENANT_A, name: 'Tenant A', selena_config: {} },
      { id: TENANT_B, name: 'Tenant B', selena_config: {} },
    ],
    sms_conversations: [
      { id: 'convo-a', tenant_id: TENANT_A, outcome: 'booked', name: 'Alice', client_id: 'cl-a', booking_checklist: {} },
      { id: 'convo-b', tenant_id: TENANT_B, outcome: 'booked', name: 'Bob (victim)', client_id: 'cl-b', booking_checklist: {} },
    ],
    sms_conversation_messages: [
      { id: 'm1', conversation_id: 'convo-a', direction: 'inbound', message: 'hi', created_at: '2026-01-01T00:00:00Z' },
      { id: 'm2', conversation_id: 'convo-a', direction: 'outbound', message: 'hello!', created_at: '2026-01-01T00:00:01Z' },
      { id: 'm3', conversation_id: 'convo-b', direction: 'inbound', message: 'secret client info', created_at: '2026-01-01T00:00:00Z' },
      { id: 'm4', conversation_id: 'convo-b', direction: 'outbound', message: 'reply', created_at: '2026-01-01T00:00:01Z' },
    ],
    selena_memory: [] as Array<{ tenant_id: string; client_id: string | null }>,
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('scoreConversation — tenant-ownership guard', () => {
  it('rejects a foreign-tenant conversation_id: no data, victim row untouched', async () => {
    const result = await scoreConversation(TENANT_A, 'convo-b')
    expect(result).toEqual({ score: 0, issues: ['No data'], strengths: [] })
    const victim = h.seed.sms_conversations.find((c) => c.id === 'convo-b')!
    expect(victim.quality_score).toBeUndefined()
  })

  it('CONTROL: own-tenant conversation_id scores normally', async () => {
    const result = await scoreConversation(TENANT_A, 'convo-a')
    expect(result.score).toBeGreaterThan(0)
    const own = h.seed.sms_conversations.find((c) => c.id === 'convo-a')!
    expect(own.quality_score).toBe(result.score)
  })
})

describe('selfReviewConversation — tenant-ownership guard', () => {
  it('rejects a foreign-tenant conversation_id: no memory row written, victim untouched', async () => {
    const result = await selfReviewConversation(TENANT_A, 'convo-b')
    expect(result).toEqual({ review: 'Conversation not found', score: 0, improvements: [] })
    expect(h.seed.selena_memory.length).toBe(0)
    const victim = h.seed.sms_conversations.find((c) => c.id === 'convo-b')!
    expect(victim.quality_score).toBeUndefined()
  })

  it('CONTROL: own-tenant conversation_id reviews normally and stamps its own client_id', async () => {
    const result = await selfReviewConversation(TENANT_A, 'convo-a')
    expect(result.score).toBe(80)
    expect(h.seed.selena_memory.length).toBe(1)
    expect(h.seed.selena_memory[0]).toMatchObject({ tenant_id: TENANT_A, client_id: 'cl-a' })
  })
})
