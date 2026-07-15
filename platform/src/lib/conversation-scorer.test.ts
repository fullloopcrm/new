/**
 * scoreConversation() / selfReviewConversation() took a conversation_id and
 * used it directly against `sms_conversations` / `sms_conversation_messages`
 * with no `.eq('tenant_id', …)` filter. Called from
 * POST /api/admin/selena/score (gated only on the ordinary tenant permission
 * `settings.view`, not platform god-mode), any tenant's staff could pass
 * another tenant's conversation_id and:
 *   - read that tenant's full SMS transcript back in the response
 *   - spend an AI review call summarizing it (selfReviewConversation)
 *   - overwrite that tenant's quality_score/quality_issues
 *   - insert a selena_memory row cross-labeled with the victim's client_id
 * Same FK-injection class already fixed on /api/chat, /api/sms, etc. — a
 * foreign id isn't scoped to the caller's tenant just because it's a UUID.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const createSpy = vi.fn(async () => ({
  content: [{ type: 'text', text: 'SCORE: 42\nREVIEW: mediocre\nMISTAKES: none\nIMPROVEMENTS: none' }],
}))
vi.mock('@/lib/anthropic-client', () => ({
  resolveAnthropic: vi.fn(async () => ({ messages: { create: createSpy } })),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { scoreConversation, selfReviewConversation } from './conversation-scorer'

const TENANT_A = '11111111-1111-1111-1111-111111111111'
const TENANT_B = '22222222-2222-2222-2222-222222222222'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  createSpy.mockClear()
  fake._seed('tenants', [
    { id: TENANT_A, name: 'Tenant A', selena_config: {} },
    { id: TENANT_B, name: 'Tenant B', selena_config: {} },
  ])
  fake._seed('sms_conversations', [
    { id: 'convo-A1', tenant_id: TENANT_A, outcome: 'booked', name: 'Alice', client_id: 'client-A1', quality_score: null, quality_issues: null },
    { id: 'convo-B1', tenant_id: TENANT_B, outcome: 'booked', name: 'Bob (private)', client_id: 'client-B1', quality_score: null, quality_issues: null },
  ])
  fake._seed('sms_conversation_messages', [
    { id: 'm1', conversation_id: 'convo-A1', direction: 'inbound', message: 'hi from A', created_at: '2026-01-01T00:00:00Z' },
    { id: 'm2', conversation_id: 'convo-B1', direction: 'inbound', message: "Bob's private address is 123 Secret St", created_at: '2026-01-01T00:00:00Z' },
  ])
  fake._seed('selena_memory', [])
})

describe('scoreConversation — conversation_id cannot cross tenants', () => {
  it("refuses to score another tenant's conversation and leaves it untouched", async () => {
    const result = await scoreConversation(TENANT_A, 'convo-B1')
    expect(result.score).toBe(0)
    expect(result.issues).toEqual(['No data'])

    const victim = fake._store.get('sms_conversations')?.find((r) => r.id === 'convo-B1')
    expect(victim?.quality_score).toBeNull()
  })

  it("scores the caller's own conversation normally", async () => {
    const result = await scoreConversation(TENANT_A, 'convo-A1')
    expect(result.score).toBeGreaterThan(0)

    const own = fake._store.get('sms_conversations')?.find((r) => r.id === 'convo-A1')
    expect(own?.quality_score).toBe(result.score)
  })
})

describe('selfReviewConversation — conversation_id cannot cross tenants', () => {
  it("refuses to AI-review another tenant's conversation, spends no AI call, and leaks nothing back", async () => {
    const result = await selfReviewConversation(TENANT_A, 'convo-B1')
    expect(result.review).toBe('No messages to review')
    expect(result.score).toBe(0)
    expect(createSpy).not.toHaveBeenCalled()

    const victim = fake._store.get('sms_conversations')?.find((r) => r.id === 'convo-B1')
    expect(victim?.quality_score).toBeNull()
    expect(fake._store.get('selena_memory') || []).toHaveLength(0)
  })

  it("AI-reviews the caller's own conversation and records the review under the caller's tenant", async () => {
    const result = await selfReviewConversation(TENANT_A, 'convo-A1')
    expect(result.score).toBe(42)
    expect(createSpy).toHaveBeenCalledTimes(1)

    const memories = fake._store.get('selena_memory') || []
    expect(memories).toHaveLength(1)
    expect(memories[0].tenant_id).toBe(TENANT_A)
    expect(memories[0].client_id).toBe('client-A1')
  })
})
