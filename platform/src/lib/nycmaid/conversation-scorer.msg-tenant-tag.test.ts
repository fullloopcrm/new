import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 — REGRESSION LOCK for a write-side tenant-tagging gap in
 * nycmaid/conversation-scorer.ts's selfReviewConversation.
 *
 * yinez_memory.tenant_id has a column DEFAULT of 'nycmaid' (the rollout
 * safety net added by migrations/2026_05_09_tenant_id_core.sql, same as
 * sms_conversation_messages). This function is called unconditionally from
 * the shared, multi-tenant /api/yinez route (src/app/api/yinez/route.ts)
 * whenever a booking is created — NOT just for nycmaid. It already loaded
 * the conversation's own tenant_id (for resolveAnthropic) but never carried
 * it onto the yinez_memory insert, mis-tagging every OTHER tenant's
 * self-review as nycmaid's and hiding it from that tenant's own
 * tenant-scoped yinez_memory reads (selena/agent.ts, selena/tools.ts
 * recall). Same P2 "write-side siblings" class already fixed on the
 * sms_conversation_messages inserts across chat/yinez/admin-chat/selena/sms/
 * webhooks (deploy-prep/idor-remediation-status.md).
 *
 * FIX: the insert now carries `tenant_id: convo.tenant_id` (falling back to
 * the nycmaid sentinel only for legacy null rows).
 */

const OTHER_TENANT = 'tenant-msg-tag'
const CONVO_ID = 'convo-1'
const CLIENT_ID = 'client-1'

const h = vi.hoisted(() => {
  const captured = { memoryInserts: [] as Record<string, unknown>[] }

  function makeBuilder(table: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: (cols: string) => {
        builder._cols = cols
        return builder
      },
      eq: () => builder,
      order: () => builder,
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      insert: (row: Record<string, unknown>) => {
        if (table === 'yinez_memory') captured.memoryInserts.push(row)
        return { then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }) }
      },
      single: () => {
        if (table === 'sms_conversations') {
          if (builder._cols?.includes('client_id') && !builder._cols.includes('tenant_id')) {
            return Promise.resolve({ data: { client_id: CLIENT_ID }, error: null })
          }
          return Promise.resolve({
            data: { outcome: 'booked', name: 'Test Client', tenant_id: OTHER_TENANT },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      },
      then: (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null }),
    }
    return builder
  }

  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }
  return { captured, supabaseAdmin }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/anthropic-client', () => ({
  resolveAnthropic: vi.fn(async () => ({
    messages: {
      create: vi.fn(async () => ({
        content: [{ type: 'text', text: 'SCORE: 80\nREVIEW: Solid conversation.\nMISTAKES: None\nIMPROVEMENTS: None' }],
      })),
    },
  })),
}))

import { selfReviewConversation } from './conversation-scorer'

beforeEach(() => {
  h.captured.memoryInserts = []
})

describe('selfReviewConversation — yinez_memory insert carries tenant_id', () => {
  it('stamps tenant_id from the conversation row, not the column DEFAULT', async () => {
    // Fake messages so the function doesn't early-return "No messages to review".
    const originalFrom = h.supabaseAdmin.from
    h.supabaseAdmin.from = (table: string) => {
      if (table === 'sms_conversation_messages') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({
                data: [
                  { direction: 'inbound', message: 'Hi, need a cleaning' },
                  { direction: 'outbound', message: 'Sure, when works?' },
                ],
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof originalFrom>
      }
      return originalFrom(table)
    }

    const result = await selfReviewConversation(CONVO_ID)
    expect(result.score).toBe(80)

    expect(h.captured.memoryInserts).toHaveLength(1)
    expect(h.captured.memoryInserts[0].tenant_id).toBe(OTHER_TENANT)
    expect(h.captured.memoryInserts[0].client_id).toBe(CLIENT_ID)
  })
})
