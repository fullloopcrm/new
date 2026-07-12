import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * W4 — WITNESS for the P2 write-side tenant-tagging gap in POST /api/selena
 * (conversation reset). See deploy-prep/idor-scan-note.md (P2) and
 * deploy-prep/idor-remediation-status.md.
 *
 * THE GAP: when an admin resets a stuck SMS conversation, the outbound recovery
 * message is inserted into sms_conversation_messages WITHOUT tenant_id
 * (src/app/api/selena/route.ts:171). The row therefore falls back to the column
 * DEFAULT ('nycmaid') added by 2026_05_09_tenant_id_core.sql. The inline comment
 * calls this "tenant-scope-ok: row-scoped by conversation_id" — the WRITE is
 * indeed linked to a tenant-owned conversation, but the ROW's own tenant_id is
 * what matters for reads.
 *
 * WHY IT BITES TENANT #2 (not a cross-tenant DISCLOSURE — a self-visibility bug):
 * the GET ?convoId read is now scoped `.eq('tenant_id', tenantId)` (the selena
 * fix, 722ed11d). A recovery message written for a NON-nycmaid tenant lands
 * tagged 'nycmaid', so that tenant's own operator console can no longer see its
 * own recovery message — while a nycmaid operator theoretically could. Benign
 * today (nycmaid is the only tenant, so the default is coincidentally correct),
 * but it MUST be closed before onboarding tenant #2.
 *
 * STATUS: not a live read-IDOR, so no route edit / no flag-before-edit — this is
 * the read-only verification lane. This file documents the gap as a tracked
 * witness:
 *   • WITNESS (it.fails): the recovery-message insert SHOULD carry the caller's
 *     tenant_id but currently does NOT. When the route is fixed (add
 *     `tenant_id: tenantId` to the insert), this test flips to a HARD FAIL —
 *     the signal to convert it into a plain-`it` regression lock.
 *   • POSITIVE (plain it): the write-integrity the inline comment relies on IS
 *     real today — the recovery message links to the freshly-created
 *     conversation, which itself was inserted WITH the caller's tenant_id.
 */

const CALLER_TENANT = 'tenant-B' // a NON-default (non-nycmaid) tenant
const STUCK_CONVO = 'convo-B-stuck'
const NEW_CONVO = 'convo-B-fresh'
const RECOVERY_SNIPPET = 'we had a hiccup on our end'

type Payload = Record<string, unknown>
const inserts: Array<{ table: string; payload: Payload }> = []

// tenant-B owns the stuck conversation (SMS phone → triggers the recovery path).
const convoStore = [
  { id: STUCK_CONVO, tenant_id: CALLER_TENANT, phone: '2125551234', client_id: null, booking_checklist: {} },
]
// tenant-B has live Telnyx creds so the outbound send + message-log path runs.
const tenantStore = [
  { id: CALLER_TENANT, telnyx_api_key: 'key_test', telnyx_phone: '+12120000000' },
]

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ userId: 'op-b', tenantId: CALLER_TENANT, tenant: {}, role: 'owner' })),
  AuthError: class AuthError extends Error {},
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/selena-legacy', () => ({ EMPTY_CHECKLIST: {}, getClientProfile: vi.fn() }))

vi.mock('@/lib/supabase', () => {
  function rowsFor(table: string, eqs: Payload): unknown[] {
    const src = table === 'sms_conversations' ? convoStore : table === 'tenants' ? tenantStore : []
    return src.filter((r) => Object.entries(eqs).every(([k, v]) => (r as Payload)[k] === v))
  }
  function from(table: string) {
    const eqs: Payload = {}
    let insertRow: Payload | null = null
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
      update: () => chain, // conversation-expiry update; terminal `.eq(...)` awaited
      insert: (row: Payload) => {
        insertRow = row
        inserts.push({ table, payload: { ...row } })
        return chain
      },
      single: () => {
        // `.insert(...).select('id').single()` returns the new row's id;
        // plain `.select(...).eq(...).single()` returns a stored row.
        if (insertRow && table === 'sms_conversations') {
          return Promise.resolve({ data: { id: NEW_CONVO }, error: null })
        }
        const rows = rowsFor(table, eqs)
        return Promise.resolve(rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: 'no rows' } })
      },
      // terminal await on a bare `.eq(...)` (the expiry update) or `.insert(...)`
      then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(onF, onR),
    }
    return chain
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function resetReq(conversationId: string): NextRequest {
  return new NextRequest('https://app.fullloop.example/api/selena', {
    method: 'POST',
    body: JSON.stringify({ conversationId }),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  inserts.length = 0
})

describe('POST /api/selena reset — recovery-message tenant tagging', () => {
  it.fails(
    'WITNESS: the recovery-message insert does NOT carry the caller tenant_id (relies on DB default)',
    async () => {
      const res = await POST(resetReq(STUCK_CONVO))
      expect(res.status).toBe(200)

      const msgInsert = inserts.find((i) => i.table === 'sms_conversation_messages')
      expect(msgInsert, 'the outbound recovery message was logged').toBeTruthy()
      expect(String(msgInsert!.payload.message)).toContain(RECOVERY_SNIPPET)

      // DESIRED (currently violated): the row is tagged with the caller's tenant
      // so the now-scoped GET ?convoId read can return it to that tenant.
      expect(msgInsert!.payload).toHaveProperty('tenant_id', CALLER_TENANT)
    },
  )

  it('POSITIVE: the recovery message links to a conversation created WITH the caller tenant_id', async () => {
    const res = await POST(resetReq(STUCK_CONVO))
    expect(res.status).toBe(200)

    // The fresh conversation the recovery message hangs off of IS tenant-tagged.
    const convoInsert = inserts.find((i) => i.table === 'sms_conversations')
    expect(convoInsert).toBeTruthy()
    expect(convoInsert!.payload).toHaveProperty('tenant_id', CALLER_TENANT)

    // And the message points at that fresh, tenant-owned conversation.
    const msgInsert = inserts.find((i) => i.table === 'sms_conversation_messages')
    expect(msgInsert).toBeTruthy()
    expect(msgInsert!.payload).toHaveProperty('conversation_id', NEW_CONVO)
  })
})
