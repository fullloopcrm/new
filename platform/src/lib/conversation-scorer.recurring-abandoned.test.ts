/**
 * Item 111's flagged follow-up, run to ground: `sms_conversations.outcome`
 * is only ever 'booked' | 'waitlisted' | 'escalated' (never 'recurring_set'
 * or 'abandoned') anywhere in the codebase — same declared-value-never-
 * written shape as the escalation gap item 111 fixed in this file's sibling,
 * src/lib/selena/core.ts.
 *
 * Before this fix:
 *   - `convo.outcome !== 'recurring_set'` was ALWAYS true (the value never
 *     gets written), so the "Mentioned recurring/frequency on a one-time
 *     booking" deduction fired on every conversation that mentioned
 *     recurring language, including ones that ended in an actual recurring
 *     booking.
 *   - `convo.outcome === 'abandoned'` was ALWAYS false, so genuinely
 *     abandoned conversations never took the -5 "Conversation abandoned"
 *     deduction.
 *
 * Fixed: recurring detection now reads the linked booking's real
 * `recurring_type` column; abandoned detection now reads `expired`, the
 * same live fallback item 111 confirmed `src/lib/selena/metrics.ts` already
 * relies on for this exact gap.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { scoreConversation } from './conversation-scorer'

const TENANT = '11111111-1111-1111-1111-111111111111'
const fake = supabaseAdmin as unknown as FakeSupabase

function seedConvo(overrides: Record<string, unknown>) {
  fake._seed('sms_conversations', [
    {
      id: 'convo-1', tenant_id: TENANT, outcome: 'booked', name: 'Alice',
      client_id: 'client-1', quality_score: null, quality_issues: null,
      expired: false, booking_id: null,
      ...overrides,
    },
  ])
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [{ id: TENANT, name: 'Tenant A', selena_config: {} }])
  fake._seed('bookings', [])
  fake._seed('sms_conversation_messages', [])
})

describe('scoreConversation — recurring detection uses the real booking, not a phantom outcome value', () => {
  it('does NOT penalize recurring language when the linked booking is actually recurring', async () => {
    seedConvo({ booking_id: 'booking-1' })
    fake._seed('bookings', [{ id: 'booking-1', tenant_id: TENANT, recurring_type: 'weekly' }])
    fake._seed('sms_conversation_messages', [
      { id: 'm1', conversation_id: 'convo-1', direction: 'outbound', message: 'Sounds good, setting you up for weekly cleaning!', created_at: '2026-01-01T00:00:00Z' },
    ])

    const result = await scoreConversation(TENANT, 'convo-1')
    expect(result.issues).not.toContain('Mentioned recurring/frequency on a one-time booking')
  })

  it('still penalizes recurring language on a genuinely one-time booking', async () => {
    seedConvo({ booking_id: 'booking-2' })
    fake._seed('bookings', [{ id: 'booking-2', tenant_id: TENANT, recurring_type: 'one_time' }])
    fake._seed('sms_conversation_messages', [
      { id: 'm1', conversation_id: 'convo-1', direction: 'outbound', message: 'We also offer weekly service if you want!', created_at: '2026-01-01T00:00:00Z' },
    ])

    const result = await scoreConversation(TENANT, 'convo-1')
    expect(result.issues).toContain('Mentioned recurring/frequency on a one-time booking')
  })

  it('still penalizes recurring language when there is no linked booking at all', async () => {
    seedConvo({ booking_id: null })
    fake._seed('sms_conversation_messages', [
      { id: 'm1', conversation_id: 'convo-1', direction: 'outbound', message: 'We do offer monthly service.', created_at: '2026-01-01T00:00:00Z' },
    ])

    const result = await scoreConversation(TENANT, 'convo-1')
    expect(result.issues).toContain('Mentioned recurring/frequency on a one-time booking')
  })
})

describe('scoreConversation — abandoned detection uses `expired`, not a phantom outcome value', () => {
  it('penalizes an expired conversation as abandoned', async () => {
    seedConvo({ expired: true })
    fake._seed('sms_conversation_messages', [
      { id: 'm1', conversation_id: 'convo-1', direction: 'inbound', message: 'hi', created_at: '2026-01-01T00:00:00Z' },
    ])

    const result = await scoreConversation(TENANT, 'convo-1')
    expect(result.issues).toContain('Conversation abandoned')
  })

  it('does not penalize a live, non-expired conversation as abandoned', async () => {
    seedConvo({ expired: false })
    fake._seed('sms_conversation_messages', [
      { id: 'm1', conversation_id: 'convo-1', direction: 'inbound', message: 'hi', created_at: '2026-01-01T00:00:00Z' },
    ])

    const result = await scoreConversation(TENANT, 'convo-1')
    expect(result.issues).not.toContain('Conversation abandoned')
  })
})
