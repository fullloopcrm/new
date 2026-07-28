import { describe, it, expect, vi } from 'vitest'

/**
 * RLS Stage 3 — sms_conversations call site migrated from supabaseAdmin to
 * tenantClient(tid) (docs/tenant-isolation-rls-plan.md). This route had no
 * test before; added while migrating rather than leaving it uncovered.
 * client_sms_messages and sms_conversation_messages stay on supabaseAdmin
 * (sms_conversation_messages migration is blocked -- see the plan doc's
 * NULL-tenant-row safety note).
 */

const A = 'tid-a'
const B = 'tid-b'

const conversations = [
  { id: 'convo-a', client_id: 'cli-a', tenant_id: A },
]

function tenantScopedChain() {
  const filters: Array<(r: (typeof conversations)[number]) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => {
      filters.push((r) => (r as Record<string, unknown>)[col] === val)
      return c
    },
    order: () => c,
    limit: () => c,
    then: (resolve: (v: { data: unknown; error: null }) => void) => {
      const rows = conversations.filter((r) => filters.every((f) => f(r)))
      return Promise.resolve(resolve({ data: rows, error: null }))
    },
  }
  return c
}

vi.mock('@/lib/tenant-supabase', () => ({
  tenantClient: async (tid: string) => ({
    from: (table: string) => (table === 'sms_conversations' ? tenantScopedChain() : { select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }) }),
  }),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (_table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => Promise.resolve({ data: [], error: null }),
      }
      return chain
    },
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A }, error: null })),
}))

import { GET } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe('clients/[id]/transcript -- tenant isolation (sms_conversations via tenantClient)', () => {
  it("returns the caller's own tenant's conversation-derived transcript (empty client_sms_messages, falls back to sms_conversations)", async () => {
    const res = await GET(new Request('http://t/api/clients/cli-a/transcript'), params('cli-a'))
    expect(res.status).toBe(200)
  })

  it('a foreign-tenant client id resolves to zero conversations (tenantClient JWT is scoped to the caller tenant, not the target client)', async () => {
    const res = await GET(new Request('http://t/api/clients/cli-b/transcript'), params('cli-b'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })
})
