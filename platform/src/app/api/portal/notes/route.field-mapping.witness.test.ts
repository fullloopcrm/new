import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * portal/notes GET+PUT — wrong-column bug (fixed here).
 *
 * The client-portal "Notes for your team member" feature (src/app/portal/page.tsx,
 * labeled "Door codes, parking info, special instructions...") read and wrote
 * clients.notes. Two real consequences of that:
 *
 *   1. Functional: nothing that renders a job to a team member ever selects
 *      clients.notes (team/page.tsx and team-portal/jobs/route.ts both read
 *      clients.special_instructions). Whatever a client typed here silently
 *      never reached the cleaner.
 *   2. Confidentiality/integrity: clients.notes is the admin dashboard's plain,
 *      unlabeled "Notes" field (src/app/dashboard/clients/[id]/page.tsx), edited
 *      as a private operator-side field with no indication it's client-visible.
 *      GET pre-filled the client's own portal textarea with that column's live
 *      contents, and PUT let the client silently overwrite it.
 *
 * FIX: both handlers now target clients.special_instructions, the column
 * actually surfaced to the cleaner, and leave clients.notes untouched.
 */

const TENANT = 'tid-a'
const CLIENT = 'client-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('../auth/token', () => ({
  verifyPortalToken: vi.fn(() => ({ id: CLIENT, tid: TENANT })),
}))

import { GET, PUT } from './route'

function seed() {
  return {
    clients: [
      { id: CLIENT, tenant_id: TENANT, notes: 'OPERATOR-PRIVATE: flaky payer, confirm card before scheduling', special_instructions: 'Gate code 4821' },
    ],
  }
}

function getReq(): NextRequest {
  return new NextRequest('http://x/api/portal/notes', { headers: { authorization: 'Bearer test-token' } })
}

function putReq(notes: string): NextRequest {
  return new NextRequest('http://x/api/portal/notes', {
    method: 'PUT',
    headers: { authorization: 'Bearer test-token' },
    body: JSON.stringify({ notes }),
  })
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('portal/notes — reads/writes special_instructions, not the operator-private notes field', () => {
  it('GET returns special_instructions content, matching what the cleaner actually sees', async () => {
    const res = await GET(getReq())
    const body = await res.json()
    expect(body.notes).toBe('Gate code 4821')
  })

  it("GET never leaks the admin's operator-only clients.notes field to the client", async () => {
    const res = await GET(getReq())
    const body = await res.json()
    expect(body.notes).not.toContain('OPERATOR-PRIVATE')
  })

  it('PUT writes to special_instructions', async () => {
    await PUT(putReq('New gate code 9999'))
    const row = (h.seed.clients as Array<{ id: string; special_instructions?: string }>).find((r) => r.id === CLIENT)
    expect(row?.special_instructions).toBe('New gate code 9999')
  })

  it("PUT never mutates the admin's operator-only notes field", async () => {
    await PUT(putReq('New gate code 9999'))
    const row = (h.seed.clients as Array<{ id: string; notes?: string }>).find((r) => r.id === CLIENT)
    expect(row?.notes).toBe('OPERATOR-PRIVATE: flaky payer, confirm card before scheduling')
  })
})
