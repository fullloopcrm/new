import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * client/notes GET+PUT — wrong-column bug (fixed here), sibling of the
 * already-fixed portal/notes bug (different route: the per-tenant client
 * dashboards — wash-and-fold-hoboken/nyc, the-florida-maid, generic
 * site/book/dashboard — vs portal/notes' modern /portal app).
 *
 * The client-dashboard "notes for the cleaner" textarea (placeholder "Door
 * codes, pet info, special instructions...") read and wrote clients.notes.
 * Two real consequences of that:
 *
 *   1. Functional: nothing that renders a job to a team member ever selects
 *      clients.notes (team-portal/jobs/route.ts reads clients.special_instructions).
 *      Whatever a client typed here silently never reached the cleaner.
 *   2. Confidentiality/integrity: clients.notes is the admin dashboard's plain,
 *      unlabeled operator-only "Notes" field. GET pre-filled the client's own
 *      textarea with that column's live contents, and PUT let the client
 *      silently overwrite it.
 *
 * FIX: both handlers now target clients.special_instructions, the column
 * actually surfaced to the cleaner, and leave clients.notes untouched.
 */

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const getTenantFromHeadersMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: getTenantFromHeadersMock }))

const protectClientAPIMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/client-auth', () => ({ protectClientAPI: protectClientAPIMock }))

import { NextResponse } from 'next/server'
import { GET, PUT } from './route'

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'
const CLIENT_A = 'client-a'

function seed() {
  return {
    clients: [
      {
        id: CLIENT_A,
        tenant_id: TENANT_A,
        notes: 'OPERATOR-PRIVATE: flaky payer, confirm card before scheduling',
        special_instructions: 'Gate code 4821',
      },
    ],
  }
}

function getReq(clientId: string): Request {
  return new Request(`http://x/api/client/notes?client_id=${clientId}`)
}

function putReq(clientId: string, notes: string): Request {
  return new Request('http://x/api/client/notes', {
    method: 'PUT',
    body: JSON.stringify({ client_id: clientId, notes }),
  })
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  getTenantFromHeadersMock.mockReset().mockResolvedValue({ id: TENANT_A })
  protectClientAPIMock.mockReset().mockResolvedValue({ clientId: CLIENT_A })
})

describe('client/notes — reads/writes special_instructions, not the operator-private notes field', () => {
  it('GET returns special_instructions content, matching what the cleaner actually sees', async () => {
    const res = await GET(getReq(CLIENT_A))
    const body = await res.json()
    expect(body.notes).toBe('Gate code 4821')
  })

  it("GET never leaks the admin's operator-only clients.notes field to the client", async () => {
    const res = await GET(getReq(CLIENT_A))
    const body = await res.json()
    expect(body.notes).not.toContain('OPERATOR-PRIVATE')
  })

  it('PUT writes to special_instructions', async () => {
    await PUT(putReq(CLIENT_A, 'New gate code 9999'))
    const row = (h.seed.clients as Array<{ id: string; special_instructions?: string }>).find((r) => r.id === CLIENT_A)
    expect(row?.special_instructions).toBe('New gate code 9999')
  })

  it("PUT never mutates the admin's operator-only notes field", async () => {
    await PUT(putReq(CLIENT_A, 'New gate code 9999'))
    const row = (h.seed.clients as Array<{ id: string; notes?: string }>).find((r) => r.id === CLIENT_A)
    expect(row?.notes).toBe('OPERATOR-PRIVATE: flaky payer, confirm card before scheduling')
  })
})

describe('client/notes — wrong-tenant probe', () => {
  it('a client session bound to tenant A cannot read or write notes scoped under tenant B (tenant.id mismatch on the query)', async () => {
    getTenantFromHeadersMock.mockResolvedValue({ id: TENANT_B })
    protectClientAPIMock.mockResolvedValue(NextResponse.json({ error: 'Session not valid for this tenant' }, { status: 401 }))

    const res = await GET(getReq(CLIENT_A))
    expect(res.status).toBe(401)
  })

  it("PUT under a mismatched tenant is rejected before any write reaches the client row", async () => {
    getTenantFromHeadersMock.mockResolvedValue({ id: TENANT_B })
    protectClientAPIMock.mockResolvedValue(NextResponse.json({ error: 'Session not valid for this tenant' }, { status: 401 }))

    const res = await PUT(putReq(CLIENT_A, 'forged note'))
    expect(res.status).toBe(401)
    const row = (h.seed.clients as Array<{ id: string; special_instructions?: string }>).find((r) => r.id === CLIENT_A)
    expect(row?.special_instructions).toBe('Gate code 4821')
  })
})
