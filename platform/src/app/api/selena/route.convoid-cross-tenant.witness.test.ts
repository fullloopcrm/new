import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * W4 — AUTH/OWNERSHIP REGRESSION LOCK: Selena operator console must NOT leak
 * another tenant's SMS conversation messages via an unscoped `convoId`.
 *
 * HISTORY: The GET `if (convoId)` branch in src/app/api/selena/route.ts once
 * read sms_conversation_messages filtered ONLY by the caller-supplied
 * conversation_id — no `.eq('tenant_id', tenantId)`, no ownership check. An
 * operator authenticated as tenant-A who passed tenant-B's conversation id read
 * tenant-B's entire SMS booking transcript (customer name, phone, address,
 * email): a classic IDOR / cross-tenant PII disclosure. Witnessed in eec486b7.
 *
 * FIX: the branch now scopes the read to `.eq('tenant_id', tenantId)`, matching
 * the sibling conversation-LIST query one block below. Migration 010 added
 * tenant_id to sms_conversation_messages; 2026_05_09_tenant_id_core backfills it
 * NOT NULL, so the scope is reliable on real data.
 *
 * This file is now a permanent regression lock — both tests are plain `it` and
 * pass ONLY while the route stays tenant-scoped:
 *   • NEGATIVE: a convoId owned by another tenant discloses nothing (was RED
 *     before the fix — the leaked transcript came back; GREEN after).
 *   • POSITIVE CONTROL: the owning tenant still reads its own convo in full, so
 *     the scope fixes the leak without breaking the legitimate operator path.
 *
 * Not covered by the existing selena isolation suites (booking-authz /
 * booking-read-authz / owner-fk-authz) — those key the Selena TOOL layer on the
 * conversation's own client_id; none exercise this operator GET console read.
 */

const CALLER_TENANT = 'tenant-A'
const VICTIM_TENANT = 'tenant-B'
const VICTIM_CONVO = 'convo-B-victim'
const VICTIM_PII = 'Jane Victim · 42 Secret Lane · jane.victim@example.com'

type Eqs = Record<string, unknown>
const selectCalls: Array<{ table: string; eqs: Eqs }> = []

// Store: tenant-B owns VICTIM_CONVO and its messages contain PII.
const conversationsStore = [{ id: VICTIM_CONVO, tenant_id: VICTIM_TENANT }]
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
      maybeSingle: async () => {
        selectCalls.push({ table, eqs: { ...eqs } })
        if (table === 'sms_conversations') {
          const found = conversationsStore.find((c) => Object.entries(eqs).every(([k, v]) => (c as Eqs)[k] === v))
          return { data: found ?? null, error: null }
        }
        return { data: null, error: null }
      },
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
import { getTenantForRequest } from '@/lib/tenant-query'

function reqWithConvo(convoId: string): NextRequest {
  return new NextRequest(`https://app.fullloop.example/api/selena?convoId=${encodeURIComponent(convoId)}`)
}

beforeEach(() => {
  selectCalls.length = 0
})

describe('GET /api/selena?convoId — cross-tenant SMS message disclosure', () => {
  it('NEGATIVE (regression lock): a convoId owned by another tenant discloses nothing', async () => {
    // Caller is tenant-A (default mock); VICTIM_CONVO belongs to tenant-B.
    const res = await GET(reqWithConvo(VICTIM_CONVO))
    expect(res.status).toBe(200)
    const body = await res.json()
    const returned = JSON.stringify(body.messages ?? [])

    // Secure behavior: cross-tenant convoId yields nothing (PII never appears).
    expect(returned).not.toContain('Jane Victim')
    expect(body.messages ?? []).toHaveLength(0)

    // Structural guarantee: ownership is verified via the tenantDb-scoped
    // sms_conversations lookup BEFORE any message read is attempted — the
    // foreign convoId never resolves, so the messages query never runs.
    const convoRead = selectCalls.find((c) => c.table === 'sms_conversations')!
    expect(convoRead).toBeTruthy()
    expect(convoRead.eqs).toHaveProperty('id', VICTIM_CONVO)
    expect(convoRead.eqs).toHaveProperty('tenant_id', CALLER_TENANT) // ← the fix, pinned
    expect(selectCalls.find((c) => c.table === 'sms_conversation_messages')).toBeUndefined()
  })

  it('POSITIVE CONTROL: the owning tenant still reads its own convo in full', async () => {
    // This one request is authenticated as tenant-B, the convo's owner.
    vi.mocked(getTenantForRequest).mockResolvedValueOnce({ userId: 'op-b', tenantId: VICTIM_TENANT, tenant: {}, role: 'owner' } as never)

    const res = await GET(reqWithConvo(VICTIM_CONVO))
    expect(res.status).toBe(200)
    const body = await res.json()

    // The legitimate operator path is unbroken: full transcript returned.
    expect(body.messages).toHaveLength(2)
    expect(JSON.stringify(body.messages)).toContain('Jane Victim')

    const convoRead = selectCalls.find((c) => c.table === 'sms_conversations')!
    expect(convoRead.eqs).toHaveProperty('tenant_id', VICTIM_TENANT)
    const msgRead = selectCalls.find((c) => c.table === 'sms_conversation_messages')!
    expect(msgRead.eqs).toHaveProperty('conversation_id', VICTIM_CONVO)
  })
})
