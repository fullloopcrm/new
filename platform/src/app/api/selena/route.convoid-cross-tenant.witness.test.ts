import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * W4 (b) — AUTH/OWNERSHIP WITNESS: Selena operator console leaks another
 * tenant's SMS conversation messages via an unscoped `convoId`.
 *
 * GAP (src/app/api/selena/route.ts, GET, the `if (convoId)` branch):
 *
 *     const { data: messages } = await supabaseAdmin
 *       .from('sms_conversation_messages')
 *       .select('direction, message, created_at')
 *       .eq('conversation_id', convoId)          // ← convoId comes straight
 *       .order('created_at', { ascending: true }) //    from the query string
 *
 * The caller is authenticated (`getTenantForRequest()` resolves tenantId) and
 * the sibling conversation-LIST query one block below IS tenant-scoped
 * (`.eq('tenant_id', tenantId)`), but this per-conversation MESSAGES read is
 * filtered ONLY by the caller-supplied conversation_id — with no
 * `.eq('tenant_id', tenantId)` and no check that the conversation belongs to the
 * caller's tenant. Migration 010 added `tenant_id` to sms_conversation_messages,
 * so the column to scope on EXISTS; the handler just doesn't use it.
 *
 * Effect: an operator authenticated as tenant-A who passes tenant-B's
 * conversation id reads tenant-B's entire SMS booking transcript — customer
 * name, phone, address, email. A classic IDOR / cross-tenant PII disclosure.
 *
 * This is NOT covered by the existing selena isolation suites
 * (booking-authz / booking-read-authz / owner-fk-authz) — those key the Selena
 * TOOL layer on the conversation's own client_id; none exercise this operator
 * GET console read.
 *
 * Two tests, per the leader's "witness/regression" ask:
 *   • WITNESS (green today): proves the leak happens and the read carries NO
 *     tenant filter — a regression guard so this can't silently get worse.
 *   • SECURITY SPEC (it.fails today): asserts the secure outcome (no disclosure).
 *     It PASSES while the route is vulnerable and FLIPS RED the moment the route
 *     is fixed — the signal to delete the marker. READ-ONLY lane: I do not touch
 *     the route.
 */

const CALLER_TENANT = 'tenant-A'
const VICTIM_TENANT = 'tenant-B'
const VICTIM_CONVO = 'convo-B-victim'
const VICTIM_PII = 'Jane Victim · 42 Secret Lane · jane.victim@example.com'

type Eqs = Record<string, unknown>
const selectCalls: Array<{ table: string; eqs: Eqs }> = []

// Store: tenant-B owns VICTIM_CONVO and its messages contain PII.
const messagesStore = [
  { conversation_id: VICTIM_CONVO, tenant_id: VICTIM_TENANT, direction: 'inbound', message: VICTIM_PII, created_at: '2026-07-01T10:00:00Z' },
  { conversation_id: VICTIM_CONVO, tenant_id: VICTIM_TENANT, direction: 'outbound', message: 'Thanks Jane, you are booked.', created_at: '2026-07-01T10:01:00Z' },
]

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ userId: 'op-a', tenantId: CALLER_TENANT, tenant: {}, role: 'owner' })),
  AuthError: class AuthError extends Error {},
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn() }))
vi.mock('@/lib/selena-legacy', () => ({ EMPTY_CHECKLIST: {}, getClientProfile: vi.fn() }))

vi.mock('@/lib/supabase', () => {
  function from(table: string) {
    const eqs: Eqs = {}
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
      gte: () => chain,
      order: () => chain,
      limit: () => chain,
      then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) => {
        selectCalls.push({ table, eqs: { ...eqs } })
        let data: unknown = []
        if (table === 'sms_conversation_messages') {
          // Mirror the DB: filter by WHATEVER columns the handler chose to scope on.
          data = messagesStore.filter((m) => Object.entries(eqs).every(([k, v]) => (m as Eqs)[k] === v))
        }
        return Promise.resolve({ data, error: null }).then(onF, onR)
      },
    }
    return chain
  }
  return { supabaseAdmin: { from } }
})

import { GET } from './route'

function reqWithConvo(convoId: string): NextRequest {
  return new NextRequest(`https://app.fullloop.example/api/selena?convoId=${encodeURIComponent(convoId)}`)
}

beforeEach(() => {
  selectCalls.length = 0
})

describe('GET /api/selena?convoId — cross-tenant SMS message disclosure', () => {
  it('WITNESS (green today): operator of tenant-A reads tenant-B messages; the read carries NO tenant filter', async () => {
    const res = await GET(reqWithConvo(VICTIM_CONVO))
    expect(res.status).toBe(200)
    const body = await res.json()

    // The leak is real: tenant-A receives tenant-B's PII-bearing transcript.
    const returned = JSON.stringify(body.messages)
    expect(returned).toContain('Jane Victim')
    expect(body.messages).toHaveLength(2)

    // Structural root cause: the messages read scoped by conversation_id ONLY.
    const msgRead = selectCalls.find((c) => c.table === 'sms_conversation_messages')!
    expect(msgRead).toBeTruthy()
    expect(msgRead.eqs).toHaveProperty('conversation_id', VICTIM_CONVO)
    expect(msgRead.eqs).not.toHaveProperty('tenant_id') // ← the gap, pinned
  })

  // Flips from pass → FAIL the moment the route scopes this read to the caller's
  // tenant (or verifies convo ownership). When this starts failing, the gap is
  // closed — remove `.fails` and keep it as a permanent regression lock.
  it.fails('SECURITY SPEC: a convoId owned by another tenant must NOT disclose that tenant\'s messages', async () => {
    const res = await GET(reqWithConvo(VICTIM_CONVO))
    const body = await res.json()
    const returned = JSON.stringify(body.messages ?? [])

    // Secure behavior: cross-tenant convoId yields nothing (name never appears).
    expect(returned).not.toContain('Jane Victim')
    expect(body.messages ?? []).toHaveLength(0)
  })
})
