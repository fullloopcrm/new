import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Regression: scoreConversation()/selfReviewConversation() are called from
 * POST /api/admin/selena/score with a caller-supplied conversation_id, gated
 * only by the caller's own tenant permission (settings.view) — not by
 * ownership of that specific conversation. The underlying sms_conversations
 * lookups filtered by `id` alone, never `tenant_id`, so tenant A could read
 * (and, via the quality_score/quality_issues update, mutate) tenant B's SMS
 * transcript by guessing/enumerating a conversation UUID. Fix: both lookups
 * now require `.eq('tenant_id', tenantId)` and short-circuit before touching
 * messages if the conversation isn't owned by the caller's tenant.
 */

interface FakeConvoRow {
  id: string
  tenant_id: string
  outcome: string
  booking_checklist: Record<string, unknown>
  name: string
  created_at: string
  completed_at: string | null
  updated_at: string
  client_id: string | null
}

const CONVO_A: FakeConvoRow = {
  id: 'convo-tenant-a',
  tenant_id: 'tenant-a',
  outcome: 'booked',
  booking_checklist: {},
  name: 'Jane Doe',
  created_at: '2026-01-01T00:00:00Z',
  completed_at: '2026-01-01T01:00:00Z',
  updated_at: '2026-01-01T01:00:00Z',
  client_id: 'client-a',
}

const MESSAGES_A = [
  { direction: 'inbound', message: 'My name is Jane Doe, address 123 Secret St, SSN-looking-number 555-12-3456', created_at: '2026-01-01T00:00:00Z' },
  { direction: 'outbound', message: 'Great question! Let me help.', created_at: '2026-01-01T00:01:00Z' },
]

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from(table: string) {
      if (table === 'tenants') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { name: 'Attacker Co', selena_config: {} } }),
            }),
          }),
        }
      }
      if (table === 'sms_conversations') {
        return {
          select: () => {
            const filters: Record<string, unknown> = {}
            const chain = {
              eq: (col: string, val: unknown) => {
                filters[col] = val
                return chain
              },
              single: async () => {
                // Mirrors real PostgREST semantics: a query with no tenant_id
                // filter applied (the pre-fix bug) still finds the row by id
                // alone, regardless of which tenant is asking.
                const match =
                  filters.id === CONVO_A.id &&
                  (filters.tenant_id === undefined || filters.tenant_id === CONVO_A.tenant_id)
                return { data: match ? CONVO_A : null }
              },
            }
            return chain
          },
          update: () => ({ eq: () => ({ then: (resolve: (v: unknown) => void) => resolve(undefined) }) }),
          insert: async () => ({ data: null, error: null }),
        }
      }
      if (table === 'sms_conversation_messages') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: MESSAGES_A }),
            }),
          }),
        }
      }
      if (table === 'selena_memory') {
        return { insert: async () => ({ data: null, error: null }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))

vi.mock('@/lib/anthropic-client', () => ({
  resolveAnthropic: vi.fn(async () => ({
    messages: {
      create: vi.fn(async () => ({
        content: [{ type: 'text', text: 'SCORE: 80\nREVIEW: fine\nMISTAKES: None\nIMPROVEMENTS: none' }],
      })),
    },
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('conversation-scorer tenant isolation', () => {
  it('scoreConversation refuses to read/score a conversation owned by a different tenant', async () => {
    const { scoreConversation } = await import('./conversation-scorer')

    // Attacker's own tenant is "tenant-b", supplying tenant-a's conversation id.
    const result = await scoreConversation('tenant-b', CONVO_A.id)

    expect(result).toEqual({ score: 0, issues: ['No data'], strengths: [] })
  })

  it('scoreConversation scores a conversation the caller actually owns', async () => {
    const { scoreConversation } = await import('./conversation-scorer')

    const result = await scoreConversation('tenant-a', CONVO_A.id)

    expect(result.score).toBeGreaterThan(0)
  })

  it('selfReviewConversation refuses to leak a foreign tenant transcript to the AI review / selena_memory', async () => {
    const { selfReviewConversation } = await import('./conversation-scorer')

    const result = await selfReviewConversation('tenant-b', CONVO_A.id)

    expect(result).toEqual({ review: 'No messages to review', score: 0, improvements: [] })
  })

  it('selfReviewConversation reviews a conversation the caller actually owns', async () => {
    const { selfReviewConversation } = await import('./conversation-scorer')

    const result = await selfReviewConversation('tenant-a', CONVO_A.id)

    expect(result.score).toBe(80)
  })
})
