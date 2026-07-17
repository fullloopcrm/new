import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * W4 — REGRESSION LOCK for a write-side tenant-tagging gap in POST
 * /api/admin/selena (conversation reset — recovery message insert).
 *
 * Identical gap to selena/route.ts's already-fixed reset insert (see
 * ../../selena/route.reset-insert-tenant-tag.witness.test.ts): an insert into
 * sms_conversation_messages that omits tenant_id falls back to the column's
 * DEFAULT ('nycmaid', migrations/2026_05_09_tenant_id_core.sql), mis-tagging
 * this tenant's own recovery message and hiding it from this tenant's own
 * tenant-scoped GET ?convoId read (self-visibility bug). Tracked as P2
 * "write-side siblings" in deploy-prep/idor-remediation-status.md.
 *
 * FIX: the recovery-message insert now carries `tenant_id: tenantId`.
 */

const h = vi.hoisted(() => {
  const TENANT = 'tenant-msg-tag'
  const STUCK_CONVO = 'convo-stuck-1'
  const NEW_CONVO = 'convo-fresh-1'
  const captured = { messageInserts: [] as Record<string, unknown>[] }
  const convoStore = [
    { id: STUCK_CONVO, tenant_id: TENANT, phone: '2125551234', client_id: null, booking_checklist: {} },
  ]
  const tenantStore = [{ id: TENANT, telnyx_api_key: 'key_test', telnyx_phone: '+12120000000' }]

  function rowsFor(table: string, eqs: Record<string, unknown>): unknown[] {
    const src = table === 'sms_conversations' ? convoStore : table === 'tenants' ? tenantStore : []
    return src.filter((r) => Object.entries(eqs).every(([k, v]) => (r as Record<string, unknown>)[k] === v))
  }

  function makeBuilder(table: string) {
    const eqs: Record<string, unknown> = {}
    let insertRow: Record<string, unknown> | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      eq: (col: string, val: unknown) => { eqs[col] = val; return builder },
      update: () => builder,
      insert: (row: Record<string, unknown>) => {
        insertRow = row
        if (table === 'sms_conversation_messages') h.captured.messageInserts.push(row)
        return builder
      },
      single: () => {
        if (insertRow && table === 'sms_conversations') return Promise.resolve({ data: { id: NEW_CONVO }, error: null })
        const rows = rowsFor(table, eqs)
        return Promise.resolve(rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: 'no rows' } })
      },
      then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(resolve),
    }
    return builder
  }

  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }
  return { captured, supabaseAdmin, TENANT, STUCK_CONVO, NEW_CONVO }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.TENANT }, error: null }),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/selena-legacy', () => ({ EMPTY_CHECKLIST: {}, getClientProfile: vi.fn() }))

import { POST } from './route'

function resetReq(conversationId: string): NextRequest {
  return new NextRequest('https://app.fullloop.example/api/admin/selena', {
    method: 'POST',
    body: JSON.stringify({ conversationId }),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  h.captured.messageInserts = []
})

describe('POST /api/admin/selena reset — recovery-message tenant tagging', () => {
  it('stamps tenant_id on the recovery-message insert', async () => {
    const res = await POST(resetReq(h.STUCK_CONVO))
    expect(res.status).toBe(200)

    expect(h.captured.messageInserts).toHaveLength(1)
    expect(h.captured.messageInserts[0].tenant_id).toBe(h.TENANT)
    expect(h.captured.messageInserts[0].conversation_id).toBe(h.NEW_CONVO)
  })
})
