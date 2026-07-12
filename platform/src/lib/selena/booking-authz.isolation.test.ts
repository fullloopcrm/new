import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * W4 INDEPENDENT verification lane for the booking IDOR fix (017043fa).
 *
 * This is a second, independently-authored regression suite that locks the same
 * fix from angles the fix's own tests (booking-authz.test.ts) don't assert:
 *
 *   1. READ-scoping capture — booking-authz.test.ts proves the cross-tenant
 *      fetch MISSES (resolver returns null for tenant A). Here we additionally
 *      capture the eq() filters the handler passed to the `bookings` SELECT and
 *      assert `tenant_id === caller`. That proves the scope is applied at the
 *      QUERY (a tenant-scoped read), not via a post-fetch filter — the exact
 *      thing the pre-fix code got wrong (it fetched by id alone).
 *
 *   2. Global-owner escalation via the ACTUAL OWNER_PHONES env vector — the
 *      LEADER's named concern "global-owner no longer authorizes other tenants".
 *      The sibling test checks a null owner_phone row; here we set tenant B's
 *      owner_phone to a DIFFERENT populated number AND stub OWNER_PHONES to the
 *      caller, proving neither the per-tenant row nor the legacy env grants the
 *      owner of one tenant authority over another — while nycmaid's legacy
 *      access is preserved.
 *
 * Mock strategy is deliberately independent of the sibling file: a builder that
 * records both the SELECT eq-filters and any awaited UPDATE, so a rejected
 * request can be asserted to have (a) scoped its read and (b) written nothing.
 */

type Eqs = Record<string, unknown>
type Resolved = { data: unknown; error: unknown }

let selectResolver: (table: string, eqs: Eqs) => Resolved
let selectCalls: Array<{ table: string; eqs: Eqs }>
let updateCalls: Array<{ table: string; eqs: Eqs }>

function builder(table: string) {
  const eqs: Eqs = {}
  let isUpdate = false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    select: () => chain,
    update: () => { isUpdate = true; return chain },
    insert: () => chain,
    eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
    ilike: (col: string, val: unknown) => { eqs[col] = val; return chain },
    order: () => chain,
    limit: () => chain,
    single: async () => { selectCalls.push({ table, eqs: { ...eqs } }); return selectResolver(table, eqs) },
    maybeSingle: async () => { selectCalls.push({ table, eqs: { ...eqs } }); return selectResolver(table, eqs) },
    then: (onF: (v: Resolved) => unknown, onR?: (e: unknown) => unknown) => {
      if (isUpdate) updateCalls.push({ table, eqs: { ...eqs } })
      return Promise.resolve({ data: null, error: null }).then(onF, onR)
    },
  }
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => builder(table) }),
}))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))

import { handleTool, EMPTY_CHECKLIST, type YinezResult as CoreResult } from '@/lib/selena/core'
import { isOwnerOfTenant } from '@/lib/selena/agent'
import { runTool } from '@/lib/selena/tools'

const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const TENANT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const NYCMAID = '00000000-0000-0000-0000-000000000001'
const OWNER_PHONE = '212-555-1111'

const coreResult = (): CoreResult => ({ text: '', checklist: EMPTY_CHECKLIST })

beforeEach(() => {
  selectCalls = []
  updateCalls = []
  selectResolver = () => ({ data: null, error: null })
})
afterEach(() => vi.unstubAllEnvs())

const bookingsSelect = () => selectCalls.filter((c) => c.table === 'bookings')

// ── READ is tenant-scoped, not post-filtered ────────────────────────────────

describe('W4: booking mutation fetch is scoped to the caller tenant at the query', () => {
  it('reschedule: a tenant-B booking_id is rejected AND the bookings read carried tenant_id=A', async () => {
    selectResolver = (table, eqs) => {
      if (table === 'sms_conversations') return { data: { client_id: 'client-A', tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') {
        // Only tenant B owns the row; a read scoped to A must return nothing.
        if (eqs.tenant_id === TENANT_B) return { data: { id: 'bk-B', tenant_id: TENANT_B, client_id: 'client-B', recurring_type: 'weekly', start_time: '2099-01-01T10:00:00' }, error: null }
        return { data: null, error: null }
      }
      return { data: null, error: null }
    }

    const out = await handleTool('reschedule_booking', { booking_id: 'bk-B', new_date: '2099-02-01', new_time: '2:00 PM' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('Booking not found')
    expect(updateCalls).toHaveLength(0)
    // The read itself must have been scoped to the caller's tenant.
    expect(bookingsSelect().length).toBeGreaterThan(0)
    for (const c of bookingsSelect()) {
      expect(c.eqs.tenant_id).toBe(TENANT_A)
      expect(c.eqs.tenant_id).not.toBe(TENANT_B)
    }
  })

  it('cancel: a tenant-B booking_id is rejected AND the bookings read carried tenant_id=A', async () => {
    selectResolver = (table, eqs) => {
      if (table === 'sms_conversations') return { data: { client_id: 'client-A', tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') {
        if (eqs.tenant_id === TENANT_B) return { data: { id: 'bk-B', tenant_id: TENANT_B, client_id: 'client-B', recurring_type: 'weekly', start_time: '2099-01-01T10:00:00', clients: { name: 'Victim' } }, error: null }
        return { data: null, error: null }
      }
      return { data: null, error: null }
    }

    const out = await handleTool('cancel_booking', { booking_id: 'bk-B', reason: 'x' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('Booking not found')
    expect(updateCalls).toHaveLength(0)
    expect(bookingsSelect().length).toBeGreaterThan(0)
    for (const c of bookingsSelect()) expect(c.eqs.tenant_id).toBe(TENANT_A)
  })
})

// ── Global-owner escalation via the OWNER_PHONES env vector (F-3) ────────────

describe('W4: global OWNER_PHONES env does not authorize the owner across tenants', () => {
  it('owner of tenant A is NOT owner of tenant B even with OWNER_PHONES set to their phone', async () => {
    vi.stubEnv('OWNER_PHONES', OWNER_PHONE)
    // Tenant B has a real, DIFFERENT owner_phone on its own row.
    selectResolver = (table) => (table === 'tenants' ? { data: { owner_phone: '212-555-2222' }, error: null } : { data: null, error: null })
    expect(await isOwnerOfTenant(OWNER_PHONE, TENANT_B)).toBe(false)
  })

  it('the SAME phone remains owner of nycmaid via legacy env (Jeff’s access preserved)', async () => {
    vi.stubEnv('OWNER_PHONES', OWNER_PHONE)
    selectResolver = (table) => (table === 'tenants' ? { data: { owner_phone: null }, error: null } : { data: null, error: null })
    expect(await isOwnerOfTenant(OWNER_PHONE, NYCMAID)).toBe(true)
  })

  it('runTool owner gate on tenant B rejects the A-owner even with OWNER_PHONES set', async () => {
    vi.stubEnv('OWNER_PHONES', OWNER_PHONE)
    selectResolver = (table) => (table === 'tenants' ? { data: { owner_phone: '212-555-2222' }, error: null } : { data: null, error: null })
    const out = await runTool('__nonexistent_owner_tool__', {}, 'convo-B', OWNER_PHONE, { text: '', toolsCalled: [] }, TENANT_B)
    expect(JSON.parse(out).error).toBe('owner_only_tool')
  })
})
