/**
 * Functional coverage for runPostActivationTasks() (PR #65) — the FL-team
 * Telegram ping, the day-1 health snapshot, and the AI content-suggestion
 * draft that fire once a tenant goes live.
 *
 * Exercises the REAL runPostActivationTasks() / computeAccountHealth() /
 * draftInitialSiteContent() / alertOwner() logic against a synthetic tenant.
 * Fakes only the true I/O boundaries (Supabase client, network fetch,
 * Anthropic SDK) — same pattern as telegram.test.ts and
 * cron/anthropic-health/route.test.ts. No real tenant data, no real network
 * calls, no prod DB access.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

const SYNTHETIC_TENANT_ID = 'test-tenant-0000-0000-000000000001'

const updates: Array<{ table: string; values: Record<string, unknown> }> = []
const inserts: Array<{ table: string; values: Record<string, unknown> }> = []

// Synthetic tenant: stale login (45 days, > AT_RISK_DAYS=30) so
// computeAccountHealth deterministically produces a NON-default 'at_risk'
// result — proves real branching logic ran, not just a default fallthrough.
const syntheticTenant = {
  name: 'Synthetic QA Tenant',
  slug: 'synthetic-qa-tenant',
  industry: 'cleaning',
  last_active_at: new Date(Date.now() - 45 * 86400000).toISOString(),
  billing_status: 'active',
  status: 'active',
  tagline: null,
  selena_config: {}, // no business_description -> draftInitialSiteContent must proceed, not early-return
}

// Generic chainable + thenable query builder: real Supabase query builders let
// .eq()/.in()/.gte()/.limit() be called in any order and the whole chain is
// awaitable at any point (or terminated with .single()). Resolves final data
// per-table so every call shape used across post-activation's dependency
// tree (tenants/service_types/platform_feedback/tenant_owner_messages)
// resolves correctly regardless of chain order.
function finalRowsFor(table: string): { data: unknown; count: number } {
  if (table === 'tenants') return { data: syntheticTenant, count: 1 }
  if (table === 'service_types') return { data: [{ name: 'Standard Cleaning' }, { name: 'Deep Clean' }], count: 2 }
  if (table === 'platform_feedback') return { data: null, count: 1 } // 1 bug/complaint in last 30d
  if (table === 'tenant_owner_messages') return { data: null, count: 2 } // 2 support messages in last 30d
  return { data: null, count: 0 }
}

function makeQueryBuilder(table: string): Record<string, unknown> {
  const resolved = finalRowsFor(table)
  const builder: Record<string, unknown> = {
    eq: (_col: string, _val: unknown) => builder,
    in: (_col: string, _vals: unknown[]) => builder,
    gte: (_col: string, _val: unknown) => builder,
    limit: (_n: number) => builder,
    single: async () => ({ data: resolved.data, error: null }),
    then: (resolve: (v: { data: unknown; count: number; error: null }) => void) =>
      resolve({ data: resolved.data, count: resolved.count, error: null }),
  }
  return builder
}

vi.mock('./supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: (_cols?: string, _opts?: unknown) => makeQueryBuilder(table),
      update: (values: Record<string, unknown>) => ({
        eq: async (_col: string, _val: unknown) => {
          updates.push({ table, values })
          return { data: null, error: null }
        },
      }),
      insert: async (values: Record<string, unknown>) => {
        inserts.push({ table, values })
        return { data: null, error: null }
      },
    }),
  },
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: vi.fn(async () => ({
        content: [{
          type: 'text',
          text: 'TAGLINE: Spotless homes, zero hassle\nDESCRIPTION: Synthetic QA Tenant provides reliable, detail-oriented cleaning for busy households. Book in minutes, pay online, and come home to a spotless space every time.',
        }],
      })),
    }
  },
}))

const originalFetch = global.fetch

beforeEach(() => {
  vi.resetModules()
  updates.length = 0
  inserts.length = 0
  process.env.JEFE_OWNER_CHAT_ID = 'test-chat-id-verify'
  process.env.JEFE_BOT_TOKEN = 'test-bot-token-verify'
  global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
    return new Response(JSON.stringify({ ok: true, result: { message_id: 999 } }), { status: 200 })
  }) as typeof fetch
})

afterAll(() => {
  global.fetch = originalFetch
})

describe('PR #65 post-activation chain — functional verify (synthetic tenant, no prod writes)', () => {
  it('fires the FL-team Telegram ping with real tenant label content', async () => {
    const { runPostActivationTasks } = await import('./post-activation')
    await runPostActivationTasks(SYNTHETIC_TENANT_ID)

    expect(global.fetch).toHaveBeenCalled()
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find((c) =>
      String(c[0]).includes('api.telegram.org'),
    )
    expect(call).toBeTruthy()
    const url = String(call![0])
    const body = JSON.parse((call![1] as RequestInit).body as string)
    expect(url).toContain('test-bot-token-verify')
    expect(body.chat_id).toBe('test-chat-id-verify')
    expect(body.text).toContain('Synthetic QA Tenant (synthetic-qa-tenant)')
    expect(body.text).toContain('Industry: cleaning')
  })

  it('computes and persists a real day-1 health snapshot (not a stub)', async () => {
    const { runPostActivationTasks } = await import('./post-activation')
    await runPostActivationTasks(SYNTHETIC_TENANT_ID)

    const healthUpdate = updates.find((u) => u.table === 'tenants' && 'activation_health_snapshot' in u.values)
    expect(healthUpdate).toBeTruthy()
    const snapshot = healthUpdate!.values.activation_health_snapshot as Record<string, unknown>
    // Real computed values from the 45-day-stale synthetic tenant, not a placeholder.
    expect(snapshot.level).toBe('at_risk')
    expect(snapshot.daysSinceActive).toBe(45)
    expect(snapshot.billingStatus).toBe('active')
    expect(Array.isArray(snapshot.reasons)).toBe(true)
    expect((snapshot.reasons as string[])[0]).toMatch(/no login in 45 days/)
  })

  it('drafts real AI content-suggestion output into tenant_notes', async () => {
    const { runPostActivationTasks } = await import('./post-activation')
    await runPostActivationTasks(SYNTHETIC_TENANT_ID)
    // draftInitialSiteContent fires fire-and-forget; flush microtasks.
    await new Promise((r) => setTimeout(r, 0))

    const noteInsert = inserts.find((i) => i.table === 'tenant_notes')
    expect(noteInsert).toBeTruthy()
    expect(noteInsert!.values.author).toBe('selena-ai')
    expect(noteInsert!.values.tenant_id).toBe(SYNTHETIC_TENANT_ID)
    expect(noteInsert!.values.body as string).toContain('TAGLINE: Spotless homes, zero hassle')
    expect(noteInsert!.values.body as string).toContain('Synthetic QA Tenant provides reliable')
  })
})
