import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * W4 — REGRESSION LOCK for GET /api/sms?conversation_id cross-tenant isolation.
 *
 * Sibling of the selena convoId IDOR (fixed in 722ed11d). Unlike selena, this
 * handler was NOT vulnerable when W4 wrote this test: it read the messages by
 * conversation_id first, but then read sms_conversations scoped to
 * `.eq('id', convoId).eq('tenant_id', tenantId).single()` and returned 404 when
 * that ownership read found nothing — so a cross-tenant convoId never disclosed.
 *
 * UPDATE 2026-08-01 (catch-all tier route sweep, independent read of this same
 * route): W4 correctly flagged the weakness as STRUCTURAL, not behavioral --
 * the guard sat AFTER the message fetch and only blocked the `return`, so a
 * future refactor that moved the return, or read messages inside a
 * Promise.all with the check, could silently reopen the exact selena leak.
 * That ordering has now been fixed in the route itself: the ownership check
 * runs BEFORE the messages query, not just before the `return`. This test
 * still pins the same secure OUTCOME (no route behavior changed from the
 * caller's perspective) but the structural risk W4 named is now closed at
 * the code level too, not just outcome-pinned.
 *
 *   • NEGATIVE: tenant-A requesting tenant-B's convoId gets 404, no PII.
 *   • POSITIVE CONTROL: the owning tenant still reads its own transcript.
 */

const CALLER_TENANT = 'tenant-A'
const VICTIM_TENANT = 'tenant-B'
const VICTIM_CONVO = 'convo-B-victim'
const VICTIM_PII = 'Jane Victim · 42 Secret Lane · jane.victim@example.com'

type Eqs = Record<string, unknown>
const selectCalls: Array<{ table: string; eqs: Eqs; single: boolean }> = []

// tenant-B owns VICTIM_CONVO; its messages carry PII.
const convoStore = [{ id: VICTIM_CONVO, tenant_id: VICTIM_TENANT }]
const messagesStore = [
  { conversation_id: VICTIM_CONVO, tenant_id: VICTIM_TENANT, direction: 'inbound', message: VICTIM_PII, created_at: '2026-07-01T10:00:00Z' },
  { conversation_id: VICTIM_CONVO, tenant_id: VICTIM_TENANT, direction: 'outbound', message: 'Thanks Jane, you are booked.', created_at: '2026-07-01T10:01:00Z' },
]

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ userId: 'op-a', tenantId: CALLER_TENANT, tenant: {}, role: 'owner' })),
  AuthError: class AuthError extends Error {},
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn() }))

vi.mock('@/lib/supabase', () => {
  function rowsFor(table: string, eqs: Eqs): unknown[] {
    const src = table === 'sms_conversation_messages' ? messagesStore
      : table === 'sms_conversations' ? convoStore
      : []
    return src.filter((r) => Object.entries(eqs).every(([k, v]) => (r as Eqs)[k] === v))
  }
  function from(table: string) {
    const eqs: Eqs = {}
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
      is: (col: string, val: unknown) => { eqs[col] = val; return chain },
      gte: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => {
        selectCalls.push({ table, eqs: { ...eqs }, single: true })
        const rows = rowsFor(table, eqs)
        return Promise.resolve(rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: 'no rows' } })
      },
      then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) => {
        selectCalls.push({ table, eqs: { ...eqs }, single: false })
        return Promise.resolve({ data: rowsFor(table, eqs), error: null }).then(onF, onR)
      },
    }
    return chain
  }
  return { supabaseAdmin: { from } }
})

import { GET } from './route'
import { getTenantForRequest } from '@/lib/tenant-query'

function reqWithConvo(convoId: string): NextRequest {
  return new NextRequest(`https://app.fullloop.example/api/sms?conversation_id=${encodeURIComponent(convoId)}`)
}

beforeEach(() => {
  selectCalls.length = 0
})

describe('GET /api/sms?conversation_id — cross-tenant SMS message isolation', () => {
  it('NEGATIVE (regression lock): tenant-A requesting tenant-B\'s convoId gets 404, no disclosure', async () => {
    const res = await GET(reqWithConvo(VICTIM_CONVO))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(JSON.stringify(body)).not.toContain('Jane Victim')
    expect(body.messages).toBeUndefined()

    // Structural guarantee: an ownership read scoped to the caller's tenant ran.
    const ownerCheck = selectCalls.find((c) => c.table === 'sms_conversations' && c.single)
    expect(ownerCheck).toBeTruthy()
    expect(ownerCheck!.eqs).toHaveProperty('id', VICTIM_CONVO)
    expect(ownerCheck!.eqs).toHaveProperty('tenant_id', CALLER_TENANT)

    // The message fetch never ran at all once ownership failed -- the guard
    // now sits BEFORE the fetch, not just before the `return`. Fixed
    // 2026-08-01; previously the messages query ran unconditionally.
    const messagesCall = selectCalls.find((c) => c.table === 'sms_conversation_messages')
    expect(messagesCall).toBeUndefined()
  })

  it('POSITIVE CONTROL: the owning tenant still reads its own transcript in full', async () => {
    vi.mocked(getTenantForRequest).mockResolvedValueOnce({ userId: 'op-b', tenantId: VICTIM_TENANT, tenant: {}, role: 'owner' } as never)

    const res = await GET(reqWithConvo(VICTIM_CONVO))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.messages).toHaveLength(2)
    expect(JSON.stringify(body.messages)).toContain('Jane Victim')
  })
})
