import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Regression: the `clients`/`team_members` lookups keyed off a comhub
 * contact's linked `client_id`/`team_member_id` queried by `id` alone, with
 * no `tenant_id` filter. The contact row itself is tenant-scoped and today's
 * only write paths keep `client_id`/`team_member_id` tenant-consistent, but
 * this endpoint returned another tenant's full client (name/email/phone/
 * address/notes/financials) or team member record verbatim if that
 * invariant were ever violated by a future write path — the same
 * belt-and-suspenders class of bug fixed elsewhere in this session (FK
 * injection, channel ownership). Fix re-scopes both lookups by tenant_id.
 */

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: vi.fn(async () => null),
}))

vi.mock('@/lib/tenant', () => ({
  getCurrentTenantId: vi.fn(async () => 'tenant-1'),
}))

const eqLog: Record<string, Array<[string, unknown]>> = {}
const selectLog: Record<string, string> = {}

function chain(data: unknown, table: string) {
  eqLog[table] = eqLog[table] || []
  const obj: Record<string, unknown> = {
    select: (cols: string) => {
      selectLog[table] = cols
      return obj
    },
    eq: (col: string, val: unknown) => {
      eqLog[table].push([col, val])
      return obj
    },
    ilike: () => obj,
    order: () => obj,
    limit: () => obj,
    single: async () => ({ data, error: null }),
    then: (resolve: (v: unknown) => void) =>
      resolve({
        data: Array.isArray(data) ? data : data ? [data] : [],
        count: Array.isArray(data) ? data.length : 0,
        error: null,
      }),
  }
  return obj
}

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'comhub_contacts') {
      return chain({ id: 'contact-1', name: 'Jo', phone: null, email: null, client_id: 'client-1', team_member_id: 'tm-1' }, table)
    }
    if (table === 'clients') {
      return chain({ id: 'client-1', name: 'Real Client' }, table)
    }
    if (table === 'bookings') {
      return chain([], table)
    }
    if (table === 'team_members') {
      return chain({ id: 'tm-1', name: 'Real Cleaner' }, table)
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { GET } from './route'

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/admin/comhub/contacts/contact-1/context')
}

describe('GET contacts/[id]/context', () => {
  beforeEach(() => {
    for (const k of Object.keys(eqLog)) delete eqLog[k]
  })

  it('scopes the client lookup to the caller tenant, not just the id', async () => {
    await GET(makeRequest(), { params: Promise.resolve({ id: 'contact-1' }) })
    expect(eqLog['clients']).toContainEqual(['tenant_id', 'tenant-1'])
    expect(eqLog['clients']).toContainEqual(['id', 'client-1'])
  })

  it('scopes the team member lookup to the caller tenant, not just the id', async () => {
    await GET(makeRequest(), { params: Promise.resolve({ id: 'contact-1' }) })
    expect(eqLog['team_members']).toContainEqual(['tenant_id', 'tenant-1'])
    expect(eqLog['team_members']).toContainEqual(['id', 'tm-1'])
  })

  it('selects team_members.status, not the stale/unmaintained active column', async () => {
    // team_members.active is a real column (added by a one-time NYC Maid
    // legacy-data import migration) but nothing in the app writes it, so it
    // silently drifts from reality -- confirmed live, ~12% of rows disagree
    // with `status`, including terminated members still showing active=true.
    // `status` is the field the termination flow actually keeps current.
    await GET(makeRequest(), { params: Promise.resolve({ id: 'contact-1' }) })
    expect(selectLog['team_members']).toContain('status')
    expect(selectLog['team_members']).not.toMatch(/(^|,\s*)active(\s*,|$)/)
  })

  it('selects clients.status, not the stale/unmaintained active column', async () => {
    // Same root cause as team_members.active, worse magnitude: clients.active
    // exists but drifts even harder from `status` -- confirmed live, 426 of
    // 439 status='inactive' clients still show active=true (only 13 agree).
    // The comhub "Inactive" badge trusted `active`, so it silently failed to
    // flag inactive clients for the vast majority of them.
    await GET(makeRequest(), { params: Promise.resolve({ id: 'contact-1' }) })
    expect(selectLog['clients']).toContain('status')
    expect(selectLog['clients']).not.toMatch(/(^|,\s*)active(\s*,|$)/)
  })
})
